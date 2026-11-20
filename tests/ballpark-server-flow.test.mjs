// The page side of the server price: what the ballpark page does when the
// public catalogue has styles but no prices and the price function is
// switched on. Pieces of ballpark.js are cut out and run in node:vm with a
// stub fetch, a timer queue and a bare-bones page (see ballpark-slices.mjs).
import test from 'node:test';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { SRC, PRICING_CODE, SERVER_PRICE_CODE, slice, run, fakeTimers } from './ballpark-slices.mjs';
import { handle, resetCaches, parsePricing, priceProject } from '../netlify/functions/ballpark-price.mjs';
import { fakeGoogle, priceFunctionEnv, read } from './helpers.mjs';
import { formatRange } from '../public/assets/js/ballpark-pricing-rules.mjs';

const RECEIPT = 'web_flowflowflowflow01';
const NAMES = ['Full Cedar Privacy 6ft', 'Galv Chain Link 4ft', 'Galv Chain Link 6ft', 'Kingston - White 6ft', 'Ranch Rail'];
const ANSWER = { low: 5700, high: 6300, comparisons: [
  { style: 'Galv Chain Link 4ft', low: 5700, high: 6300 }, { style: 'Full Cedar Privacy 6ft', low: 9000, high: 9900 }, { style: 'Not In Catalogue', low: 9100, high: 9999 },
] };
const json = (body, status = 200, headers = {}) => ({ ok: status >= 200 && status < 300, status, headers: { get: name => headers[name] ?? null }, json: async () => body });

function page({ mode = 'by-request', reply, ping = () => json({ ok: true }), storage, step4 = null, startAt = Date.now(), clock = null } = {}) {
  const listeners = {}, timers = fakeTimers(), nodes = {}, fetches = [], draws = { compare: [], actions: [], finance: [] };
  // The page's clock moves with the timer queue, so waiting 120 s in a test is 120 s of Date.now() too.
  const PageDate = class extends Date { static now() { return clock ? clock() : startAt + timers.time(); } };
  const node = () => Object.defineProperty({ textContent: '', hidden: false, style: {}, children: [], dataset: {},
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    replaceChildren() { this.textContent = ''; }, appendChild(c) { this.children.push(c); }, removeAttribute() {}, setAttribute() {}, scrollIntoView() {}, querySelectorAll: () => [], addEventListener(t, fn) { (this.handlers = this.handlers || {})[t] = fn; }, querySelector: () => null },
    'innerHTML', { set(v) { this.textContent = v; }, get() { return this.textContent; } });
  const abortable = signal => new Promise((_, reject) => { if (signal) signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))); });
  const globals = {
    ...timers, Date: PageDate,
    ...(storage ? { sessionStorage: storage } : {}),
    el: id => nodes[id] || (nodes[id] = node()),
    window: Object.assign(step4 ? step4.window : {}, { addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); } }),
    ...(step4 ? step4.globals(nodes) : {}),
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
    const state = { linearFeet: 0, fenceId: '', height: '6', singleGates: 0, doubleGates: 0, removeOldFence: false, existingFenceMaterial: '', sections: [], siteNotes: [], address: '', priceUnlocked: false };
    let pricesLive = false, pricesSlow = false, pricesByRequest = false, styleCatalogSettled = true, pendingDraftStyle = '', acceptedBallparkReceipt = '', pricingReceipt = '', pricingReceiptAt = 0;
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
    ${step4 ? `let leadPhoto = '';\n    function photoReadyForSubmission() { return true; }\n    function collectGeometry() { return ''; }\n    function removalScopeNote() { return ''; }\n    function sectionLines() { return []; }\n    function clearDraft() {}\n    ${slice('  function bindStep4() {', '  // -------- LIVE PRICE REVEAL')}` : ''}
    globalThis.api = {
      state, FENCE_PRICING, updateAll, calculatePrice, comparisonRows, submissionPrice, checkServerPrice, serverPriceExpected,
      setCatalogue(names) { names.forEach(n => { FENCE_PRICING[slugify(n)] = buildStyleEntry(n, null, null, null); }); },
      set(flags) { ({ pricesLive = pricesLive, pricesByRequest = pricesByRequest } = flags); },
      receipt(v) { acceptedBallparkReceipt = v; pricingReceipt = v; pricingReceiptAt = 0; },
      acceptedReceipt: () => acceptedBallparkReceipt, ${step4 ? 'bindStep4,' : ''}
      pricingReceipt: () => pricingReceipt, retryNow: () => serverPriceRetryNow(), recheck: () => serverPriceRecheck(), bindRecovery: () => bindServerPriceRecovery(),
    };
  `;
  const context = run(globals, code), api = context.api;
  api.setCatalogue(NAMES);
  api.bindRecovery();
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
  assert.match(note('request'), /^Price by request/);
  assert.doesNotMatch(note('request'), /did not load/);
  assert.match(note('prices'), /did not load on the customer's device/);
  assert.match(note('server'), /Use the range saved with this project/);
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
    function projectChanged() { return false; }
    function displayPrice() { return null; }
    function serverPricePhase() { return 'idle'; }
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
  assert.equal(e.sent[0].priceRange, '$5,700 – $6,300');
  assert.match(e.sent[0].notes, /EMAILED ESTIMATE REQUEST — Style: Style F · Length: 120 ft · Height: 6 ft · Gates: 1 walk/);
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

// ---- recovery from transient failures ------------------------------------------
const store = () => { const data = new Map(); return { data, getItem: k => data.has(k) ? data.get(k) : null, setItem: (k, v) => data.set(k, v) }; };
const hintButton = p => (p.nodes['bp-price-hint'].children || []).find(c => c.textContent === 'Try again');
const KEY = 'gfs_bp_server_price';

test('a failed capability check is not remembered as "off": the same session recovers and a reload asks again', async () => {
  const keep = store();
  let up = false;
  const p = page({ storage: keep, ping: () => up ? json({ ok: true }) : Promise.reject(new Error('offline')), reply: () => json(ANSWER) });
  p.api.checkServerPrice(); await settle(p, 0);
  assert.equal(p.api.serverPriceExpected(), false);
  assert.equal(keep.data.has(KEY), false, 'nothing is stored for a network failure');
  p.choose(); p.unlock();
  assert.equal(p.text('bp-price-range'), 'We will send your price');
  up = true;
  await settle(p, 5000);   // the check is asked again after 5 s
  assert.equal(p.api.serverPriceExpected(), true);
  assert.equal(keep.data.has(KEY), true);
  await settle(p, 500);
  assert.equal(p.text('bp-price-range'), '$5,700 – $6,300', 'the customer who already sent the form gets the range, no new submission');
  // A reload after a failed check (503 without the explicit body, timeout) still asks.
  for (const ping of [() => json({}, 503), () => json({ error: 'boom' }, 500), () => new Promise(() => {})]) {
    const kept = store(), first = page({ storage: kept, ping, reply: () => json(ANSWER) });
    first.api.checkServerPrice(); await settle(first, 6000);
    assert.equal(kept.data.has(KEY), false);
    const again = page({ storage: kept, reply: () => json(ANSWER) });
    again.api.checkServerPrice(); await settle(again, 0);
    assert.equal(again.fetches.length, 1, 'the healthy reload makes its own check');
    assert.equal(again.api.serverPriceExpected(), true);
  }
});

test('the capability check retries at 5 s, 15 s and 45 s and then stops', async () => {
  const p = page({ ping: () => Promise.reject(new Error('offline')), reply: () => json(ANSWER) });
  p.api.checkServerPrice(); await settle(p, 0);
  assert.equal(p.fetches.length, 1);
  await settle(p, 4900); assert.equal(p.fetches.length, 1);
  await settle(p, 200); assert.equal(p.fetches.length, 2);
  await settle(p, 15000); assert.equal(p.fetches.length, 3);
  await settle(p, 45000); assert.equal(p.fetches.length, 4);
  await settle(p, 600000); assert.equal(p.fetches.length, 4, 'bounded');
  p.fire('online'); await settle(p, 0);
  assert.equal(p.fetches.length, 5, 'coming back online asks once more');
});

test('only a definite "not configured" is remembered, and only for two minutes', async () => {
  const keep = store();
  const off = page({ storage: keep, ping: () => json({ error: 'not-configured' }, 503), reply: () => json(ANSWER) });
  off.api.checkServerPrice(); await settle(off, 0);
  assert.equal(off.api.serverPriceExpected(), false);
  assert.equal(JSON.parse(keep.data.get(KEY)).ok, false);
  await settle(off, 600000); assert.equal(off.fetches.length, 1, 'a definite answer is not asked again in this page');
  const soon = page({ storage: keep, reply: () => json(ANSWER) });
  soon.api.checkServerPrice(); await settle(soon, 0);
  assert.equal(soon.fetches.length, 0, 'within two minutes');
  keep.data.set(KEY, JSON.stringify({ ok: false, at: Date.now() - 121000 }));
  const later = page({ storage: keep, reply: () => json(ANSWER) });
  later.api.checkServerPrice(); await settle(later, 0);
  assert.equal(later.fetches.length, 1, 'after two minutes it asks again');
  keep.data.set(KEY, JSON.stringify({ ok: true, at: Date.now() - 1500000 }));
  const yes = page({ storage: keep, reply: () => json(ANSWER) });
  yes.api.checkServerPrice(); await settle(yes, 0);
  assert.equal(yes.fetches.length, 0, 'a yes is kept for half an hour');
});

async function ready(reply) {
  const p = page({ reply });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose(); p.unlock();
  return p;
}

test('one 503 on a healthy service: the unchanged project is asked again at 5 s and the range appears with no field change', async () => {
  const p = await ready((call, n) => n === 1 ? json({ error: 'Pricing is unavailable right now.' }, 503) : json(ANSWER));
  await settle(p, 500);
  assert.equal(p.text('bp-price-range'), 'We will send your price');
  assert.ok(hintButton(p), 'a plain Try again control sits next to the wording');
  assert.equal(p.priceCalls().length, 1);
  await settle(p, 4400); assert.equal(p.priceCalls().length, 1);
  await settle(p, 600); assert.equal(p.priceCalls().length, 2);
  assert.equal(p.text('bp-price-range'), '$5,700 – $6,300');
  assert.equal(p.priceCalls()[0].body.receipt, p.priceCalls()[1].body.receipt);
  assert.deepEqual(p.priceCalls()[0].body.parts, p.priceCalls()[1].body.parts);
  await settle(p, 120000); assert.equal(p.priceCalls().length, 2, 'no more asks once it has a range');
});

test('429 with Retry-After: waits at least that long, then succeeds', async () => {
  const p = await ready((call, n) => n === 1 ? json({ error: 'Too many' }, 429, { 'Retry-After': '20' }) : json(ANSWER));
  await settle(p, 500);
  await settle(p, 19000); assert.equal(p.priceCalls().length, 1, 'longer than the normal 5 s pause');
  await settle(p, 1500); assert.equal(p.priceCalls().length, 2);
  assert.equal(p.text('bp-price-range'), '$5,700 – $6,300');
  // A 503 carrying Retry-After is honoured the same way; a huge one is left to the button.
  const busy = await ready((call, n) => n === 1 ? json({}, 503, { 'Retry-After': '30' }) : json(ANSWER));
  await settle(busy, 500); await settle(busy, 29000); assert.equal(busy.priceCalls().length, 1);
  await settle(busy, 1500); assert.equal(busy.priceCalls().length, 2);
  const long = await ready(() => json({}, 429, { 'Retry-After': '3600' }));
  await settle(long, 600000); assert.equal(long.priceCalls().length, 1);
  assert.ok(hintButton(long), 'the button is still there');
});

test('a lead that first exists after the quick retries is still priced, without any field change', async () => {
  const p = await ready((call, n) => n < 7 ? json({ error: 'Request not found yet' }, 409) : json(ANSWER));
  await settle(p, 400 + 600 + 1500 + 3000 + 4000);
  assert.equal(p.priceCalls().length, 5);
  assert.equal(p.text('bp-price-range'), 'We will send your price');
  await settle(p, 5000); assert.equal(p.priceCalls().length, 6);
  await settle(p, 15000); assert.equal(p.priceCalls().length, 7);
  assert.equal(p.text('bp-price-range'), '$5,700 – $6,300');
});

test('retries stop after the bound; Try again starts a fresh set, for the same project', async () => {
  const p = await ready(() => json({ error: 'down' }, 503));
  await settle(p, 500 + 5000 + 15000 + 45000 + 1000);
  assert.equal(p.priceCalls().length, 4, 'first ask plus retries at 5 s, 15 s, 45 s');
  await settle(p, 600000); assert.equal(p.priceCalls().length, 4);
  const before = JSON.stringify(p.priceCalls()[0].body);
  hintButton(p).handlers.click(); await settle(p, 0);
  assert.equal(p.priceCalls().length, 5, 'the click asks straight away');
  assert.equal(JSON.stringify(p.priceCalls()[4].body), before, 'the unchanged project, same receipt');
  await settle(p, 5000 + 15000 + 45000 + 1000); assert.equal(p.priceCalls().length, 8);
  await settle(p, 600000); assert.equal(p.priceCalls().length, 8, 'bounded again');
  assert.equal(p.text('bp-price-range'), 'We will send your price');
});

test('Try again on a service that has recovered shows the range; the working state shows meanwhile', async () => {
  let up = false;
  const p = await ready(() => up ? json(ANSWER) : json({}, 503));
  await settle(p, 500 + 66000 + 1000);
  up = true;
  hintButton(p).handlers.click();
  assert.equal(p.text('bp-price-range'), 'Working out your range…');
  await settle(p, 0);
  assert.equal(p.text('bp-price-range'), '$5,700 – $6,300');
});

test('coming back online or to the front of the tab asks again after a failure, a few times at most', async () => {
  let up = false;
  const p = await ready(() => up ? json(ANSWER) : json({}, 503));
  await settle(p, 500 + 66000 + 1000);
  assert.equal(p.priceCalls().length, 4);
  p.fire('visibilitychange'); await settle(p, 0);
  assert.equal(p.priceCalls().length, 5, 'tab came back');
  p.fire('online'); await settle(p, 0);
  assert.equal(p.priceCalls().length, 6);
  up = true;
  p.fire('online'); await settle(p, 0);
  assert.equal(p.priceCalls().length, 7);
  assert.equal(p.text('bp-price-range'), '$5,700 – $6,300');
  p.fire('online'); p.fire('visibilitychange'); await settle(p, 0);
  assert.equal(p.priceCalls().length, 7, 'nothing to recheck once there is a range');
  // A hidden tab does nothing; so does a flapping connection past the bound.
  const q = await ready(() => json({}, 503));
  await settle(q, 500 + 66000 + 1000);
  for (let i = 0; i < 10; i++) q.fire('online');
  await settle(q, 0);
  assert.ok(q.priceCalls().length <= 4 + 3, 'at most three extra tries per failure');
});

test('definite answers are not retried: needs a quote, the project allowance used up, a refused request', async () => {
  for (const reply of [() => json({ needsQuote: true }), () => json({ error: 'limit' }, 429), () => json({ error: 'old' }, 403), () => json({ error: 'bad' }, 400), () => json({ low: 9, high: 3 })]) {
    const p = await ready(reply);
    await settle(p, 600000);
    assert.equal(p.priceCalls().length, 1);
    assert.equal(hintButton(p), undefined, 'trying again cannot help, so no button');
    p.fire('online'); p.fire('visibilitychange'); await settle(p, 0);
    assert.equal(p.priceCalls().length, 1);
    assert.equal(p.text('bp-price-range'), 'We will send your price');
  }
});

test('a changed project cancels pending recovery and never shows an old range or answer', async () => {
  const late = [];
  const p = await ready((call, n) => n === 1 ? json({}, 503) : new Promise(resolve => late.push(() => resolve(json({ low: 1000 + call.body.parts[0].feet, high: 2000 + call.body.parts[0].feet, comparisons: [] })))));
  await settle(p, 500);
  p.api.state.linearFeet = 130; p.api.updateAll();
  assert.equal(p.api.calculatePrice(), null);
  await settle(p, 450);
  assert.equal(p.priceCalls().length, 2);
  assert.equal(p.priceCalls()[1].body.parts[0].feet, 130, 'the old project is not asked about again');
  p.api.state.linearFeet = 140; p.api.updateAll();
  late[0] && late[0](); await settle(p, 0);
  assert.equal(p.api.calculatePrice(), null, 'the answer for 130 ft is not shown for 140 ft');
  await settle(p, 450);
  assert.equal(p.priceCalls().length, 3);
  await settle(p, 4000);
  assert.ok(p.priceCalls().slice(1).every(c => c.body.parts[0].feet !== 120), 'the first project\'s recovery timer was cancelled');
  late[1](); await settle(p, 0);
  assert.equal(p.text('bp-price-range'), '$1,140 – $2,140');
});

test('a stale answer arriving after the request was timed out does not double up the retries', async () => {
  const p = await ready((call, n) => n === 1 ? new Promise(() => {}) : json(ANSWER));
  await settle(p, 400 + 12100);
  assert.equal(p.priceCalls().length, 1);
  await settle(p, 5000); assert.equal(p.priceCalls().length, 2, 'one retry, not two');
  assert.equal(p.text('bp-price-range'), '$5,700 – $6,300');
});

test('public prices: no call to the function, whatever happens to the network or the tab', async () => {
  const p = page({ mode: 'public', reply: () => json(ANSWER) });
  p.api.checkServerPrice(); p.choose(); p.unlock();
  p.fire('online'); p.fire('visibilitychange'); await settle(p, 600000);
  p.api.updateAll(); p.fire('online');
  assert.equal(p.fetches.length, 0);
  assert.equal(p.text('bp-price-hint') === undefined || !hintButton(p), true);
});

// ---- a returning customer after 24 hours -----------------------------------------
// The real request-flow.js and the real bindStep4 submit handler, with the real
// price function behind the page's fetch and a Firestore stand-in that knows how
// old each lead document is.
const HOUR = 3600e3;
const RETURN_PRICING = ['Galv Chain Link 4ft : 15 : 150 : 300', 'Full Cedar Privacy 6ft : 40 : 300 : 600'].join('\n');
function returnKit(shared = null) {
  const clock = shared ? shared.clock : { now: 1_800_000_000_000 }, keep = shared ? shared.keep : store(), timers = fakeTimers();
  const FakeDate = class extends Date { static now() { return clock.now; } };
  const dom = tag => { const n = { tag, style: {}, children: [], textContent: '', handlers: {}, setAttribute() {}, scrollIntoView() {}, insertBefore(c) { this.children.push(c); }, appendChild(c) { this.children.push(c); }, replaceChildren() { this.children.length = 0; this.textContent = ''; }, addEventListener(t, fn) { this.handlers[t] = fn; }, querySelector: () => null,
    querySelectorAll(sel) { const out = []; const walk = c => { if (c.tag === 'button') out.push(c); c.children.forEach(walk); }; this.children.forEach(walk); return out; } }; return n; };
  const submitButton = Object.assign(dom('button'), { disabled: false, textContent: 'Unlock my price' });
  const form = Object.assign(dom('form'), { parentElement: dom('div'), elements: [], checkValidity: () => true, fields: { name: 'Pat Smith', phone: '4195550100', email: 'pat@example.com', address: '1 Main St' }, querySelector: () => submitButton });
  const window = {};
  const context = vm.createContext({ window, document: { createElement: dom }, sessionStorage: keep, location: { search: '', pathname: '/quote/ballpark/' }, crypto: globalThis.crypto, TextEncoder, URLSearchParams, Date: FakeDate,
    Uint8Array, JSON, Array, Number, Object, Math, String, RegExp, Set, WeakMap, Error, Promise, setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout });
  vm.runInContext(read('public/assets/js/request-flow.js'), context, { filename: 'request-flow.js' });
  const saved = shared ? shared.saved : new Map();
  const created = shared ? shared.created : new Map(), submitted = [], count = shared ? shared.count : { n: 0 };
  window.GFSLeads = { async submit(payload, options) {
    submitted.push(payload);
    const record = { name: payload.name, phone: payload.phone, email: payload.email, address: payload.address, notes: '', source: payload.source, fenceStyle: payload.fenceStyle, linearFeet: payload.linearFeet, height: payload.height, meta: '' };
    const prepared = await window.GFSRequestFlow.prepare(record, 'ballpark', options);
    if (prepared.decision) return { ok: false, errors: prepared.errors, requiresDecision: prepared.decision };
    if (prepared.reuse) return prepared.reuse;
    const id = 'web_returnflow' + String(++count.n).padStart(8, '0');
    created.set(id, clock.now);
    const input = JSON.parse(payload.pricingProject);
    const price = priceProject(parsePricing(RETURN_PRICING), { remWood: 5, remChain: 3, remOther: 6 }, input);
    saved.set(id, { meta: { stringValue: 'pricing_project=' + encodeURIComponent(payload.pricingProject) + ' | price_range_shown=' + encodeURIComponent(formatRange(price.low, price.high)) } });
    return window.GFSRequestFlow.commit(prepared, { ok: true, id, receipt: 'netlify', sync: 'pending' }, prepared.record);
  } };
  return { clock, keep, timers, form, submitButton, window, created, saved, count, submitted, nodeGlobals: { FormData: class { constructor(f) { this.f = f.fields; } get(k) { return this.f[k] ?? null; } } } };
}

test('Continue this project after 25 hours: the update is priced with its own fresh receipt, the original stays the attribution', async () => {
  resetCaches();
  const kit = returnKit(), env = priceFunctionEnv();
  const google = fakeGoogle({ pricing: RETURN_PRICING, receipts: ['web_returnflow00000001', 'web_returnflow00000002', 'web_returnflow00000003'], createdAtMs: 1,
    leadDoc: id => ({ createTime: new Date(kit.created.get(id)).toISOString(), fields: kit.saved.get(id) }) });
  const askServer = call => handle(new Request('https://example.test/.netlify/functions/ballpark-price', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(call.body) }), { fetcher: google.fetcher, env, now: Math.floor(kit.clock.now / 1000) });
  const p = page({ reply: askServer, step4: { window: kit.window, globals: nodes => { nodes['bp-form'] = kit.form; return kit.nodeGlobals; } } });
  p.api.checkServerPrice(); await settle(p, 0);
  p.choose();
  p.api.bindStep4();
  const submit = async () => { await kit.form.handlers.submit({ preventDefault() {} }); await p.timers.advance(0); };
  const panelButtons = () => kit.form.parentElement.children.flatMap(panel => panel.querySelectorAll('button'));
  const click = label => { const b = panelButtons().find(x => x.textContent === label); assert.ok(b, 'button: ' + label); b.handlers.click(); };

  // 1. The first request: priced with the original lead, which is also the acquisition receipt.
  await submit(); await settle(p, 500);
  const original = p.api.acceptedReceipt();
  assert.equal(original, 'web_returnflow00000001');
  assert.equal(p.api.pricingReceipt(), original);
  assert.match(p.text('bp-price-range'), /^\$[\d,]+ – \$[\d,]+$/, 'the first range is given');
  assert.equal(p.priceCalls().at(-1).body.receipt, original);

  // 2. Twenty-five hours later the customer continues the project and changes a length.
  kit.clock.now += 25 * HOUR;
  kit.window.GFSRequestFlow.showResult(kit.form, { ok: true, reused: true });   // the panel redraws as the browser does when the customer comes back
  assert.ok(panelButtons().some(b => b.textContent === 'Continue this project'), 'the expired project offers Continue');
  const lead = await (await askServer({ body: { ...p.priceCalls()[0].body, receipt: original } })).json();
  assert.equal(lead.error, 'Request too old', 'the old receipt can no longer be priced against');
  click('Continue this project');
  p.api.state.linearFeet = 130; p.api.updateAll();
  await submit();
  assert.equal(kit.created.size, 2, 'one new update document, no extra marketing lead');
  const update = p.api.pricingReceipt();
  assert.equal(update, 'web_returnflow00000002');
  assert.notEqual(update, original, 'pricing uses the document just written');
  assert.equal(p.api.acceptedReceipt(), original, 'attribution still points at the original request');
  await settle(p, 500);
  const asked = p.priceCalls().at(-1);
  assert.equal(asked.body.receipt, update);
  assert.equal(asked.body.parts[0].feet, 130);
  assert.match(p.text('bp-price-range'), /^\$[\d,]+ – \$[\d,]+$/, 'the update is priced (200, not 403)');
  assert.equal(hintButton(p), undefined);

  // 3. Sending the identical project again creates nothing new and keeps both receipts straight.
  kit.window.GFSRequestFlow.showResult(kit.form, { ok: true, reused: true });
  click('Update this project');
  await submit(); await settle(p, 500);
  assert.equal(kit.created.size, 2, 'an unchanged resend is recognised and creates no lead');
  assert.equal(p.api.pricingReceipt(), update);
  assert.equal(p.api.acceptedReceipt(), original);
  assert.match(p.text('bp-price-range'), /^\$/);

  // 4. A day later the same unchanged resend creates no lead, keeps pricing on the update's receipt, and the range
  // already on screen for that unchanged project stays (nothing new is asked, nothing loops).
  kit.clock.now += 25 * HOUR;
  kit.window.GFSRequestFlow.showResult(kit.form, { ok: true, reused: true });
  click('Continue this project');
  const calls = p.priceCalls().length;
  await submit(); await settle(p, 600000);
  assert.equal(kit.created.size, 2, 'still no duplicate lead');
  assert.equal(p.api.pricingReceipt(), update);
  assert.equal(p.api.acceptedReceipt(), original);
  assert.equal(p.priceCalls().length, calls, 'nothing new to ask for an unchanged project');
  assert.match(p.text('bp-price-range'), /^\$[\d,]+ – \$[\d,]+$/);
});

test('the real page code uses the accepted update for pricing and the original for the emailed follow-up', () => {
  const code = slice('  function bindStep4() {', '  // -------- LIVE PRICE REVEAL');
  assert.match(code, /acceptedBallparkReceipt = [^;]*originalReceipt/);
  assert.match(code, /nextPricing = [^;]*result\.id/);
  assert.match(code, /pricingReceipt = nextPricing/);
  // The price call names the pricing receipt; the original request is only used to ask for a session.
  const run = SRC.slice(SRC.indexOf('  function serverPriceRun'), SRC.indexOf('  function serverPriceSync'));
  assert.match(run, /const receipt = serverPrice\.receipt;/);
  assert.match(run, /receipt: session \? session\.receipt : serverPrice\.receipt/);
  assert.match(SRC, /parentReceipt: acceptedBallparkReceipt/);
});

// ---- an unchanged project sent again after 24 hours keeps its instant range ----------
// Two page loads in one browser tab (the request-flow state and the session live in
// sessionStorage), the real request-flow.js, the real submit handler, and the real
// price function behind fetch. Only Firestore and the clock are stand-ins.
const LEAD_IDS = ['web_returnflow00000001', 'web_returnflow00000002', 'web_returnflow00000003', 'web_returnflow00000004'];
function returningWorld({ renewReply = null, mode = 'by-request' } = {}) {
  resetCaches();
  const first = returnKit(), env = priceFunctionEnv(), calls = [];
  const google = fakeGoogle({ pricing: RETURN_PRICING, receipts: LEAD_IDS, createdAtMs: 1, leadDoc: id => ({ createTime: new Date(first.created.get(id)).toISOString(), fields: first.saved.get(id) }) });
  const askServer = call => {
    calls.push(call.body);
    if (call.body.renew && renewReply) { const early = renewReply(); if (early) return early; }
    return handle(new Request('https://example.test/.netlify/functions/ballpark-price', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(call.body) }), { fetcher: google.fetcher, env, now: Math.floor(first.clock.now / 1000) });
  };
  const load = async kit => {
    const p = page({ mode, reply: askServer, storage: kit.keep, clock: () => kit.clock.now, step4: { window: kit.window, globals: nodes => { nodes['bp-form'] = kit.form; return kit.nodeGlobals; } } });
    p.api.checkServerPrice(); await settle(p, 0);
    p.choose(); p.api.bindStep4();
    const submit = async () => { await kit.form.handlers.submit({ preventDefault() {} }); await p.timers.advance(0); };
    const click = label => { const b = kit.form.parentElement.children.flatMap(panel => panel.querySelectorAll('button')).find(x => x.textContent === label); assert.ok(b, 'button: ' + label); b.handlers.click(); };
    return { p, submit, click, kit };
  };
  const renewals = () => calls.filter(c => c.renew);
  const prices = () => calls.filter(c => !c.renew && !c.ping);
  return { first, google, calls, load, renewals, prices };
}
const RANGE = /^\$[\d,]+ – \$[\d,]+$/;

test('returning visitor, unchanged project after 25 hours: one lead in all, one renewal, then the same instant range', async () => {
  const w = returningWorld();
  const day1 = await w.load(w.first);
  await day1.submit(); await settle(day1.p, 500);
  const original = day1.p.api.acceptedReceipt(), range = day1.p.text('bp-price-range');
  assert.match(range, RANGE);
  assert.equal(w.renewals().length, 0, 'no renewal on the first day');

  // A day and an hour later, a fresh page in the same tab: Continue this project, the project unchanged.
  w.first.clock.now += 25 * HOUR;
  const second = returnKit(w.first);
  const day2 = await w.load(second);
  day2.click('Continue this project');
  await day2.submit(); await settle(day2.p, 500);
  assert.equal(w.first.created.size, 1, 'no duplicate marketing lead: the unchanged project writes nothing');
  assert.equal(day2.p.api.acceptedReceipt(), original, 'the acquisition receipt is the original');
  assert.equal(w.renewals().length, 1, 'exactly one renewal');
  assert.deepEqual(w.renewals()[0], { renew: true, receipt: original });
  assert.equal(day2.p.text('bp-price-range'), range, 'the same range as the first day, and not "We will send your price"');
  assert.equal(hintButton(day2.p), undefined);
  const last = w.prices().at(-1);
  assert.equal(last.receipt, original);
  assert.match(last.session, /^v1\./);
  assert.equal(w.prices().length, 3, 'day one, the old receipt (refused as too old), then the session ask');

  // The session is kept for the tab: another visit within its day makes no second renewal.
  w.first.clock.now += 3 * HOUR;
  const third = await w.load(returnKit(w.first));
  third.click('Continue this project');
  await third.submit(); await settle(third.p, 500);
  assert.equal(w.first.created.size, 1);
  assert.equal(w.renewals().length, 1, 'the held session is used');
  assert.equal(third.p.text('bp-price-range'), range);
  assert.equal(w.prices().at(-1).session, last.session);
});

test('returning visitor who changes the project: the update is priced with its own fresh receipt and no renewal is made', async () => {
  const w = returningWorld();
  const day1 = await w.load(w.first);
  await day1.submit(); await settle(day1.p, 500);
  const original = day1.p.api.acceptedReceipt();
  w.first.clock.now += 25 * HOUR;
  const day2 = await w.load(returnKit(w.first));
  day2.click('Continue this project');
  day2.p.api.state.linearFeet = 140; day2.p.api.updateAll();
  await day2.submit(); await settle(day2.p, 500);
  assert.equal(w.first.created.size, 2, 'the update is the one new document');
  assert.equal(day2.p.api.pricingReceipt(), 'web_returnflow00000002');
  assert.equal(day2.p.api.acceptedReceipt(), original);
  assert.equal(w.renewals().length, 0, 'no renewal for a changed project');
  assert.match(day2.p.text('bp-price-range'), RANGE);
  assert.equal(w.prices().at(-1).session, undefined);
});

test('returning visitor: a renewal outage shows the by-request wording, recovers on the usual pause, and takes nothing from the allowance', async () => {
  let down = true;
  const w = returningWorld({ renewReply: () => down ? json({ error: 'Pricing is unavailable right now.' }, 503) : null });
  const day1 = await w.load(w.first);
  await day1.submit(); await settle(day1.p, 500);
  const range = day1.p.text('bp-price-range');
  w.first.clock.now += 25 * HOUR;
  const day2 = await w.load(returnKit(w.first));
  day2.click('Continue this project');
  await day2.submit(); await settle(day2.p, 500);
  assert.equal(day2.p.text('bp-price-range'), 'We will send your price');
  assert.ok(hintButton(day2.p), 'a plain Try again is offered');
  assert.equal(w.renewals().length, 1);
  down = false;
  await settle(day2.p, 5000);   // the usual first pause
  assert.equal(w.renewals().length, 2);
  assert.equal(day2.p.text('bp-price-range'), range);
  assert.equal(w.google.counts.get(LEAD_IDS[0] + '_rl'), 1, 'one session issued, one slot used');
  assert.equal(w.first.created.size, 1);
});

test('returning visitor: a renewal that is refused (limit used) or a lead too old ends as the by-request wording, never an error, and is not repeated', async () => {
  const w = returningWorld({ renewReply: () => json({ error: 'Too many requests for this project. We will send your price.' }, 429) });
  const day1 = await w.load(w.first);
  await day1.submit(); await settle(day1.p, 500);
  w.first.clock.now += 25 * HOUR;
  const day2 = await w.load(returnKit(w.first));
  day2.click('Continue this project');
  await day2.submit(); await settle(day2.p, 600000);
  assert.equal(day2.p.text('bp-price-range'), 'We will send your price');
  assert.equal(hintButton(day2.p), undefined, 'asking again cannot help');
  assert.equal(w.renewals().length, 1, 'not repeated');
});

test('public prices after 25 hours: no call to the function at all, no renewal, whatever the tab does', async () => {
  const w = returningWorld({ mode: 'public' });
  w.first.keep.data.set('gfs_bp_pricing_session', JSON.stringify({ receipt: LEAD_IDS[0], token: 'v1.' + 'a'.repeat(30) + '.' + 'b'.repeat(43), until: w.first.clock.now + 3600e3 }));
  const day = await w.load(w.first);
  day.p.api.state.priceUnlocked = true; day.p.api.receipt(LEAD_IDS[0]); day.p.api.updateAll();
  day.p.fire('online'); day.p.fire('visibilitychange');
  await settle(day.p, 600000);
  assert.equal(w.calls.length, 0);
});

// ---- the capability check after an explicit "not configured" -----------------------
test('capability: an explicit not-configured expires after 120 s; return to the tab, online and Try again may then ask once more, bounded', async () => {
  let serving = false;
  const p = page({ ping: () => serving ? json({ ok: true }) : json({ error: 'not-configured' }, 503), reply: () => json(ANSWER) });
  const pings = () => p.fetches.filter(f => f.body.ping).length;
  p.api.checkServerPrice(); await settle(p, 0);
  assert.equal(pings(), 1);
  assert.equal(p.api.serverPriceExpected(), false);
  p.choose(); p.unlock();
  assert.equal(p.text('bp-price-range'), 'We will send your price');
  serving = true;   // service restored
  // Before 120 s nothing is asked, however often the tab comes back.
  for (let i = 0; i < 5; i++) { await settle(p, 20000); p.fire('visibilitychange'); p.fire('online'); }
  await settle(p, 0);
  assert.equal(pings(), 1, 'no ping inside the two minutes');
  assert.equal(p.priceCalls().length, 0);
  await settle(p, 21000);   // 121 s since the answer
  p.fire('visibilitychange'); await settle(p, 0);
  assert.equal(pings(), 2, 'one ping after expiry');
  await settle(p, 500);
  assert.equal(p.api.serverPriceExpected(), true);
  assert.equal(p.text('bp-price-range'), '$5,700 – $6,300', 'the project is priced');
  assert.equal(p.priceCalls().length, 1);
});

test('capability: flipping the tab again and again after expiry makes one ping, and a still-off service waits another 120 s', async () => {
  const p = page({ ping: () => json({ error: 'not-configured' }, 503), reply: () => json(ANSWER) });
  const pings = () => p.fetches.filter(f => f.body.ping).length;
  p.api.checkServerPrice(); await settle(p, 0);
  await settle(p, 125000);
  for (let i = 0; i < 20; i++) { p.fire('visibilitychange'); p.fire('online'); }
  await settle(p, 0);
  assert.equal(pings(), 2, 'one in flight at a time: twenty flips, one ping');
  for (let i = 0; i < 20; i++) { p.fire('visibilitychange'); await settle(p, 5000); }
  assert.equal(pings(), 2, 'off again: nothing for another 120 s');
  await settle(p, 30000); p.fire('online'); await settle(p, 0);
  assert.equal(pings(), 3);
  // A ping that fails outright (no answer) is spaced too: ten flips in five seconds are one ask.
  const q = page({ ping: () => Promise.reject(new Error('offline')), reply: () => json(ANSWER) });
  q.api.checkServerPrice(); await settle(q, 0);
  await settle(q, 100000);
  const before = q.fetches.length;
  for (let i = 0; i < 10; i++) { q.fire('online'); await settle(q, 500); }
  assert.ok(q.fetches.length - before <= 2, 'ten events in five seconds: one ask, plus at most the 5 s retry the failure already scheduled');
});

test('capability: a stored "off" is believed for 120 s and no longer, in memory and in sessionStorage', async () => {
  const keep = store();
  const p = page({ storage: keep, ping: () => json({ error: 'not-configured' }, 503), reply: () => json(ANSWER) });
  p.api.checkServerPrice(); await settle(p, 0);
  assert.equal(JSON.parse(keep.data.get(KEY)).ok, false);
  await settle(p, 119000); p.api.checkServerPrice(); await settle(p, 0);
  assert.equal(p.fetches.length, 1);
  await settle(p, 2000); p.api.checkServerPrice(); await settle(p, 0);
  assert.equal(p.fetches.length, 2, 'the catalogue-sync check asks again too');
});
