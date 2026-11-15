// The page side of the server price: what the ballpark page does when the
// public catalogue has styles but no prices and the price function is
// switched on. Pieces of ballpark.js are cut out and run in node:vm with a
// stub fetch, a timer queue and a bare-bones page (see ballpark-slices.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { SRC, PRICING_CODE, SERVER_PRICE_CODE, slice, run, fakeTimers } from './ballpark-slices.mjs';

const RECEIPT = 'web_flowflowflowflow01';
const NAMES = ['Full Cedar Privacy 6ft', 'Galv Chain Link 4ft', 'Galv Chain Link 6ft', 'Kingston - White 6ft', 'Ranch Rail'];
const ANSWER = { low: 5700, high: 6300, comparisons: [
  { style: 'Galv Chain Link 4ft', low: 5700, high: 6300 }, { style: 'Full Cedar Privacy 6ft', low: 9000, high: 9900 }, { style: 'Not In Catalogue', low: 9100, high: 9999 },
] };
const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

function page({ mode = 'by-request', reply, ping = () => json({ ok: true }), storage } = {}) {
  const listeners = {}, timers = fakeTimers(), nodes = {}, fetches = [], draws = { compare: [], actions: [], finance: [] };
  const node = () => Object.defineProperty({ textContent: '', hidden: false, style: {}, children: [], dataset: {},
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    replaceChildren() { this.textContent = ''; }, appendChild(c) { this.children.push(c); }, removeAttribute() {}, addEventListener(t, fn) { (this.handlers = this.handlers || {})[t] = fn; }, querySelector: () => null },
    'innerHTML', { set(v) { this.textContent = v; }, get() { return this.textContent; } });
  const abortable = signal => new Promise((_, reject) => { if (signal) signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))); });
  const globals = {
    ...timers,
    ...(storage ? { sessionStorage: storage } : {}),
    el: id => nodes[id] || (nodes[id] = node()),
    window: { addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); } },
    document: { createElement: node, visibilityState: 'visible', addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); } },
    fetch: (url, options) => {
      const call = { url, body: JSON.parse(options.body), signal: options.signal, aborted: false };
      options.signal && options.signal.addEventListener('abort', () => { call.aborted = true; });
      fetches.push(call);
      if (call.body.ping) return Promise.resolve().then(ping);
      const answer = reply(call, fetches.filter(f => !f.body.ping).length);
      return answer instanceof Promise ? Promise.race([answer, abortable(options.signal)]) : Promise.resolve(answer);
    },
    AbortController,
    track() {}, markComplete() {}, markActive() {},
    saveDraft() {}, renderFinance(p) { draws.finance.push(p); }, renderComparePanel(u) { draws.compare.push(u); }, renderPostUnlockActions(u, h) { draws.actions.push([u, h]); },
  };
  const code = `
    const FENCE_PRICING = {};
    const state = { linearFeet: 0, fenceId: '', height: '6', singleGates: 0, doubleGates: 0, removeOldFence: false, existingFenceMaterial: '', sections: [], priceUnlocked: false };
    let pricesLive = false, pricesSlow = false, pricesByRequest = false, styleCatalogSettled = true, pendingDraftStyle = '', acceptedBallparkReceipt = '', pricingReceipt = '';
    ${slice('  function pricesUnavailable()', '  let acceptedBallparkReceipt')}
    function buildStyleEntry(name, perFoot, singleGate, doubleGate) { return { name, perFoot, singleGate, doubleGate, detail: '' }; }
    function categoryForName() { return ''; }
    function esc(x) { return x; }
    ${slice('  function formatPrice', '  // -------- DOM HELPERS')}
    ${PRICING_CODE}
    ${SERVER_PRICE_CODE}
    ${slice('  function heightNeedsReview() {', '  function updateDraftStyleNotice')}
    ${slice('  function submissionPrice(errorEl) {', '  function bindStep4')}
    ${slice('  function updateAllCore() {', '  // ---- COMPARE MATERIALS PANEL')}
    function updateAll() { normalizeSections(); updateAllCore(); }
    function currentMapIssue() { return ''; }
    globalThis.api = {
      state, FENCE_PRICING, updateAll, calculatePrice, comparisonRows, submissionPrice, checkServerPrice, serverPriceExpected,
      setCatalogue(names) { names.forEach(n => { FENCE_PRICING[slugify(n)] = buildStyleEntry(n, null, null, null); }); },
      set(flags) { ({ pricesLive = pricesLive, pricesByRequest = pricesByRequest } = flags); },
      receipt(v) { acceptedBallparkReceipt = v; pricingReceipt = v; },
      pricingReceipt: () => pricingReceipt, retryNow: () => serverPriceRetryNow(), recheck: () => serverPriceRecheck(), bindRecovery: () => bindServerPriceRecovery(),
    };
  `;
  const context = run(globals, code), api = context.api;
  api.setCatalogue(NAMES);
  if (mode === 'by-request') api.set({ pricesByRequest: true });
  if (mode === 'public') api.set({ pricesLive: true, pricesByRequest: false });
  const text = id => nodes[id] ? nodes[id].textContent : undefined;
  const choose = (o = {}) => Object.assign(api.state, { fenceId: 'galv-chain-link-4ft', linearFeet: 120, height: '4', ...o });
  const unlock = () => { api.state.priceUnlocked = true; api.receipt(RECEIPT); api.updateAll(); };
  const priceCalls = () => fetches.filter(f => !f.body.ping);
  const fire = type => (listeners[type] || []).forEach(fn => fn());
  return { api, timers, fetches, priceCalls, text, nodes, draws, choose, unlock, fire, listeners };
}
const settle = async (p, ms = 500) => { await p.timers.advance(ms); };
const card = p => [p.text('bp-price-range'), p.text('bp-price-hint')];

test('success: the range and the comparison list come from the function and feed the same card', async () => {
  const p = page({ reply: () => json(ANSWER) });
  p.api.checkServerPrice(); await settle(p, 0);
  assert.equal(p.api.serverPriceExpected(), true);
  p.choose(); p.api.updateAll();
  assert.deepEqual(card(p), ['Your estimate is ready', 'Add your contact details in step 4 to see your price.'], 'before the contact step');
  assert.equal(p.text('bp-contact-title'), 'Unlock your estimate.');
  assert.match(p.text('bp-contact-hint'), /^Share your details to view the range/);
  assert.equal(p.priceCalls().length, 0, 'no price is asked for before the form is accepted');
  p.unlock();
  assert.deepEqual(card(p), ['Working out your range…', 'This only takes a moment.']);
  await settle(p);
  assert.equal(p.priceCalls().length, 1);
  const sent = p.priceCalls()[0];
  assert.equal(sent.url, '/.netlify/functions/ballpark-price');
  assert.deepEqual(JSON.parse(JSON.stringify(sent.body)), { receipt: RECEIPT, parts: [{ style: 'Galv Chain Link 4ft', feet: 120, height: 4, singleGates: 0, doubleGates: 0 }], removal: { on: false }, compare: true });
  assert.equal(p.text('bp-price-range'), '$5,700 – $6,300');
  assert.equal(p.text('bp-price-hint'), 'Planning range. A site review confirms the final scope and price.');
  assert.deepEqual(p.draws.compare.slice(-1), [true]);
  assert.deepEqual(JSON.parse(JSON.stringify(p.api.comparisonRows().map(r => [r.id, r.name, r.low, r.high]))), [['galv-chain-link-4ft', 'Galv Chain Link 4ft', 5700, 6300], ['full-cedar-privacy-6ft', 'Full Cedar Privacy 6ft', 9000, 9900]], 'rows match catalogue styles by name, in the order sent; unknown styles are dropped');
  assert.deepEqual(JSON.parse(JSON.stringify(p.api.calculatePrice())).low, 5700);
  assert.equal(p.api.submissionPrice(null).low, 5700, 'the emailed estimate and the PDF read the same range');
});

test('before unlock the wording is today\'s only when the function is switched on', async () => {
  // Not configured: the ping gets 503. Wording stays the by-request wording from the earlier change.
  for (const ping of [() => json({ error: 'not-configured' }, 503), () => Promise.reject(new Error('offline')), () => json({ ok: false }), () => json({}, 200)]) {
    const p = page({ ping, reply: () => json(ANSWER) });
    p.api.checkServerPrice(); await settle(p, 0);
    assert.equal(p.api.serverPriceExpected(), false);
    p.choose(); p.api.updateAll();
    assert.equal(p.text('bp-contact-title'), 'Request your free quote.');
    assert.equal(p.text('bp-contact-hint'), 'Send your plan and our team will get your price to you.');
    assert.equal(p.text('bp-price-range'), 'We will send your price');
    assert.equal(p.text('bp-price-hint'), 'Use step 4 to send your plan and our team will get your price to you.');
    assert.equal(p.api.submissionPrice(null).reason, 'request');
    p.unlock(); await settle(p, 2000);
    assert.equal(p.priceCalls().length, 0, 'no price is asked for when the function is not switched on');
  }
  // Switched on: the normal wording.
  const on = page({ reply: () => json(ANSWER) });
  on.api.checkServerPrice(); await settle(on, 0);
  on.choose(); on.api.updateAll();
  assert.equal(on.text('bp-contact-title'), 'Unlock your estimate.');
});

test('503, network failure, needsQuote or a bad answer fall back to the by-request wording, never an error', async () => {
  for (const reply of [() => json({ error: 'Pricing is unavailable right now.' }, 503), () => Promise.reject(new Error('offline')), () => json({ needsQuote: true }), () => json({ low: 'x', high: 5 }), () => json({ low: 9, high: 3 }), () => json(null), () => json({ error: 'Not allowed' }, 403)]) {
    const p = page({ reply });
    p.api.checkServerPrice(); await settle(p, 0);
    p.choose(); p.unlock();
    assert.equal(p.text('bp-price-range'), 'Working out your range…');
    await settle(p);
    assert.deepEqual(card(p), ['We will send your price', 'Your request is received. We will get your price to you.']);
    assert.equal(p.api.calculatePrice(), null);
    assert.equal(p.api.comparisonRows().length, 0);
    assert.doesNotMatch(card(p).join(' '), /\$|error|undefined|NaN|—|–/);
    assert.equal(p.priceCalls().length, 1, 'a failed project is not retried in a loop');
  }
});

test('a not-found-yet receipt (409) is asked again after a pause, then the range shows', async () => {
  const p = page({ reply: (call, n) => n < 3 ? json({ error: 'Request not found yet' }, 409) : json(ANSWER) });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose(); p.unlock();
  await settle(p, 400); assert.equal(p.priceCalls().length, 1);
  await settle(p, 600); assert.equal(p.priceCalls().length, 2);
  assert.equal(p.text('bp-price-range'), 'Working out your range…');
  await settle(p, 1500); assert.equal(p.priceCalls().length, 3);
  assert.equal(p.text('bp-price-range'), '$5,700 – $6,300');
});

test('a changed project never shows the old range: it is discarded at once and asked again after a pause, latest wins', async () => {
  const late = [];
  const p = page({ reply: (call, n) => { if (n === 1) return json(ANSWER); return new Promise(resolve => late.push(() => resolve(json({ low: 100 * n, high: 200 * n, comparisons: [] })))); } });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose(); p.unlock(); await settle(p);
  assert.equal(p.text('bp-price-range'), '$5,700 – $6,300');
  p.api.state.linearFeet = 130; p.api.updateAll();
  assert.equal(p.api.calculatePrice(), null, 'the old range is gone immediately');
  assert.equal(p.text('bp-price-range'), 'Working out your range…');
  assert.equal(p.api.comparisonRows().length, 0);
  // A burst of changes inside the pause makes one request, for the last project.
  p.api.state.linearFeet = 140; p.api.updateAll(); await p.timers.advance(200);
  p.api.state.linearFeet = 150; p.api.updateAll(); await p.timers.advance(200);
  assert.equal(p.priceCalls().length, 1, 'still waiting');
  await p.timers.advance(250);
  assert.equal(p.priceCalls().length, 2);
  assert.equal(p.priceCalls()[1].body.parts[0].feet, 150);
  // While that is in flight the customer changes it again: the first is aborted and its late answer is ignored.
  p.api.state.linearFeet = 160; p.api.updateAll();
  assert.equal(p.priceCalls()[1].aborted, true);
  await p.timers.advance(450);
  assert.equal(p.priceCalls().length, 3);
  late[0] && late[0]();   // answer for 150 ft arrives after it was replaced
  await p.timers.advance(0);
  assert.equal(p.text('bp-price-range'), 'Working out your range…', 'the stale answer is not shown');
  late[1]();
  await p.timers.advance(0);
  assert.equal(p.text('bp-price-range'), '$300 – $600');
  assert.equal(p.priceCalls()[2].body.parts[0].feet, 160);
  // Going back to a project that cannot be priced clears everything without a call.
  p.api.state.linearFeet = 2500; p.api.updateAll(); await settle(p, 1000);
  assert.equal(p.priceCalls().length, 3);
  assert.equal(p.api.calculatePrice(), null);
});

test('public prices: the function is never called and nothing changes', async () => {
  const p = page({ mode: 'public', reply: () => json(ANSWER) });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose(); p.api.updateAll();
  p.unlock(); await settle(p, 5000);
  assert.equal(p.fetches.length, 0);
  assert.equal(p.api.serverPriceExpected(), false);
  assert.equal(p.text('bp-contact-title'), 'Your request is in.');
  // The by-request flag alone, with live prices, is not the by-request state either.
  const both = page({ mode: 'public', reply: () => json(ANSWER) });
  both.api.set({ pricesByRequest: true, pricesLive: true });
  both.api.checkServerPrice(); await settle(both, 0);
  assert.equal(both.fetches.length, 0);
});

test('the capability check is asked once, only from the by-request branch of the catalogue sync', async () => {
  const p = page({ reply: () => json(ANSWER) });
  p.api.checkServerPrice(); p.api.checkServerPrice(); await settle(p, 0); p.api.checkServerPrice();
  assert.equal(p.fetches.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(p.fetches[0].body)), { ping: true });
  assert.equal(SRC.match(/\bcheckServerPrice\(\)/g).length, 4, 'the definition, the catalogue sync, the ping retry and the recheck on return');
  assert.match(slice('pricesByRequest = built;', 'if (built) {'), /if \(built\) checkServerPrice\(\);/);
});

test('submitting before the range exists: the lead says the range follows, and after the range it carries it', async () => {
  const p = page({ reply: () => json(ANSWER) });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose();
  assert.equal(p.api.submissionPrice(null).reason, 'server');
  p.unlock(); await settle(p);
  assert.equal(p.api.submissionPrice(null).low, 5700);
});

test('a 429 (too many price requests) falls back to the by-request wording like any other failure', async () => {
  const p = page({ reply: () => json({ error: 'Too many price requests for this project.' }, 429) });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose(); p.unlock(); await settle(p);
  assert.deepEqual(card(p), ['We will send your price', 'Your request is received. We will get your price to you.']);
  assert.equal(p.priceCalls().length, 1);
});

test('delayed lead: fast retries, then a few slower ones, then it stops; never an error', async () => {
  const p = page({ reply: () => json({ error: 'Request not found yet' }, 409) });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose(); p.unlock();
  await settle(p, 400);
  for (const [i, pause] of [[1, 600], [2, 1500], [3, 3000], [4, 4000]]) { assert.equal(p.priceCalls().length, i); assert.equal(p.text('bp-price-range'), 'Working out your range…'); await settle(p, pause); }
  assert.equal(p.priceCalls().length, 5, 'first ask plus four retries, spaced 0.6 s, 1.5 s, 3 s, 4 s');
  assert.deepEqual(card(p).map(t => t.replace(/\n.*/, '')), ['We will send your price', 'Your request is received. We will get your price to you.']);
  await settle(p, 120000);
  assert.equal(p.priceCalls().length, 8, 'then three slower asks (5 s, 15 s, 45 s) and no more');
  assert.equal(p.text('bp-price-range'), 'We will send your price');
});

test('a request that never answers ends as the by-request wording, and is aborted', async () => {
  const p = page({ reply: () => new Promise(() => {}) });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose(); p.unlock(); await settle(p, 400);
  assert.equal(p.text('bp-price-range'), 'Working out your range…');
  await settle(p, 12100);
  assert.equal(p.priceCalls()[0].aborted, true);
  assert.equal(p.text('bp-price-range'), 'We will send your price');
});

test('mixed styles, gates and removal go to the function as the browser would price them', async () => {
  const p = page({ reply: () => json(ANSWER) });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose({ linearFeet: 200, singleGates: 3, doubleGates: 1, removeOldFence: true, existingFenceMaterial: 'wood', fenceId: 'full-cedar-privacy-6ft', height: '6' });
  p.api.state.sections = [{ uid: 's1', fenceId: 'galv-chain-link-4ft', feet: 60.5, height: '4', singleGates: 1, doubleGates: 1 }];
  p.unlock(); await settle(p);
  assert.deepEqual(JSON.parse(JSON.stringify(p.priceCalls()[0].body)), { receipt: RECEIPT, compare: true, removal: { on: true, material: 'wood', feet: 200 }, parts: [
    { style: 'Full Cedar Privacy 6ft', feet: 139.5, height: 6, singleGates: 2, doubleGates: 0 },
    { style: 'Galv Chain Link 4ft', feet: 60.5, height: 4, singleGates: 1, doubleGates: 1 }] });
});

test('with no price the non-price actions stay, and only the comparison (which needs dollars) is hidden', async () => {
  const p = page({ reply: () => json({}, 503) });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose(); p.unlock(); await settle(p);
  assert.deepEqual(p.draws.actions.slice(-1)[0], [true, false], 'actions shown, marked as having no price');
  assert.equal(p.draws.compare.slice(-1)[0], false);
  // Before the contact step nothing is shown yet.
  const early = page({ reply: () => json(ANSWER) });
  early.api.checkServerPrice(); await settle(early, 0);
  early.choose(); early.api.updateAll();
  assert.deepEqual(early.draws.actions.slice(-1)[0], [false, false]);
  // A plain quote-only page (function not switched on) keeps the actions after the form too.
  const off = page({ ping: () => json({}, 503), reply: () => json(ANSWER) });
  off.api.checkServerPrice(); await settle(off, 0);
  off.choose(); off.unlock();
  assert.deepEqual(off.draws.actions.slice(-1)[0], [true, false]);
  // Public prices keep the old behaviour: no actions without a price.
  const pub = page({ mode: 'public', reply: () => json(ANSWER) });
  pub.api.choose = null; Object.assign(pub.api.state, { fenceId: 'galv-chain-link-4ft', linearFeet: 120 }); pub.unlock();
  assert.ok(pub.draws.actions.every(a => a[0] === false));
});

test('by-request notes say so; the failed-load note stays for a real failure', () => {
  const note = reason => run({ state: { height: '6' } }, `${slice('  function reviewNote(price) {', '  function quoteSubmitLabel')} globalThis.out = reviewNote({ reason: ${JSON.stringify(reason)} });`).out;
  assert.match(note('request'), /^Price by request: this website does not show price ranges/);
  assert.doesNotMatch(note('request'), /did not load/);
  assert.match(note('prices'), /did not load on the customer's device/);
  assert.match(note('server'), /worked out on the website after this request/);
  assert.match(note('height'), /6 ft height/);
  const p = page({ reply: () => json(ANSWER) });   // by-request, function not asked yet
  p.choose();
  assert.equal(p.api.submissionPrice(null).reason, 'request');
});

// ---- the emailed request ----------------------------------------------------
function emailPage({ price }) {
  const handlers = {}, sent = [], statuses = [];
  const node = id => ({ id, value: '', disabled: false, textContent: id === 'bp-action-email' ? 'Request emailed estimate' : '', style: {}, parentElement: null, setAttribute() {}, removeAttribute() {}, focus() {},
    addEventListener(type, fn) { handlers[id + ':' + type] = fn; } });
  const nodes = {};
  const el = id => id === 'bp-form' ? null : (nodes[id] || (nodes[id] = node(id)));
  const window = { GFSLeads: { submit: async payload => { sent.push(payload); return price.fail ? Promise.reject(new Error('boom')) : { ok: true }; } } };
  const code = `
    const state = { linearFeet: 120, fenceId: 'f', height: '6', singleGates: 1, doubleGates: 0, removeOldFence: false, existingFenceMaterial: '', sections: [], siteNotes: [], priceUnlocked: true };
    const FENCE_PRICING = { f: { name: 'Style F', category: 'wood' } };
    let acceptedBallparkReceipt = '${RECEIPT}', leadPhoto = '';
    function photoReadyForSubmission() { return true; }
    function submissionPrice() { return ${JSON.stringify(price.value)}; }
    function collectGeometry() { return ''; }
    function removalScopeNote() { return ''; }
    function sectionLines() { return []; }
    ${slice('  function formatPrice', '  // -------- DOM HELPERS')}
    ${slice('  function bindEmailEstimate() {', '  function init() {')}
    bindEmailEstimate();
  `;
  run({ el, window, document: { createElement: () => node('x') }, console: { log() {}, warn() {}, error: (...a) => process.env.DBG && console.error(...a) } }, code);
  nodes['bp-email-address'].value = 'a@b.co';
  const show = nodes['bp-email-status'] = Object.assign(node('bp-email-status'), {});
  return { click: () => handlers['bp-action-email:click'](), nodes, sent };
}

test('emailed request with no price: sends a project request with no price lines and cleans up', async () => {
  const e = emailPage({ price: { value: { requiresReview: true, reason: 'request' } } });
  await e.click();
  assert.equal(e.sent.length, 1);
  assert.equal(e.sent[0].priceRange, '');
  assert.match(e.sent[0].notes, /EMAILED PROJECT REQUEST \(no price shown\)/);
  assert.doesNotMatch(e.sent[0].notes, /Range|\$|NaN|undefined/);
  assert.equal(e.nodes['bp-action-email'].textContent, '✓ Request sent');
  assert.match(e.nodes['bp-email-status'].textContent, /^Your request reached our office/);
});

test('emailed estimate with a price keeps its range lines', async () => {
  const e = emailPage({ price: { value: { low: 5700, high: 6300, total: 6000 } } });
  await e.click();
  assert.equal(e.sent[0].priceRange, '$5,700–$6,300');
  assert.match(e.sent[0].notes, /EMAILED ESTIMATE REQUEST — Style: Style F · Length: 120 ft · Height: 6 ft · Gates: 1 walk · Range: \$5,700-\$6,300/);
  assert.equal(e.nodes['bp-action-email'].textContent, '✓ Estimate requested');
});

test('an error while sending leaves the button and the email field usable again', async () => {
  const e = emailPage({ price: { value: { requiresReview: true, reason: 'request' }, fail: true } });
  await e.click();
  assert.equal(e.nodes['bp-action-email'].disabled, false);
  assert.equal(e.nodes['bp-email-address'].disabled, false);
  assert.equal(e.nodes['bp-action-email'].textContent, 'Request emailed estimate');
  assert.match(e.nodes['bp-email-status'].textContent, /Could not send that right now/);
});

test('an answer that priced a different layout than the one asked about is not used', async () => {
  const p = page({ reply: () => json({ ...ANSWER, parts: [{ style: 'Galv Chain Link 4ft', feet: 999 }] }) });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose(); p.unlock(); await settle(p);
  assert.equal(p.text('bp-price-range'), 'We will send your price');
  const ok = page({ reply: () => json({ ...ANSWER, parts: [{ style: 'galv chain link 4ft', feet: 120 }] }) });
  ok.api.checkServerPrice(); await settle(ok, 0);
  ok.choose(); ok.unlock(); await settle(ok);
  assert.equal(ok.text('bp-price-range'), '$5,700 – $6,300');
});

test('the capability answer is kept for the browser session, so a second page load does not ask again', async () => {
  const store = new Map();
  const keep = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, v) };
  const first = page({ reply: () => json(ANSWER), storage: keep });
  first.api.checkServerPrice(); await settle(first, 0);
  assert.equal(first.fetches.length, 1);
  const second = page({ reply: () => json(ANSWER), storage: keep });
  second.api.checkServerPrice(); await settle(second, 0);
  assert.equal(second.fetches.length, 0);
  assert.equal(second.api.serverPriceExpected(), true);
});
