// A request whose reply was lost must be retried under the SAME receipt id, so the office does not get the
// same lead twice, even when this browser cannot save anything (storage blocked, or full). The message must
// say where the details are actually kept: in this browser (it was written and read back), or only in this
// open tab. Real public/assets/js/request-flow.js and leads.js; every network call is mocked.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { read } from './helpers.mjs';

const quote = { name: 'Test Customer', phone: '(419) 555-0142', email: '', address: '1 Main St, Toledo, OH', contactMethod: 'Call', source: 'website', fenceType: 'Wood', fenceStyle: 'Cedar Privacy', linearFeet: 150, height: '6', notes: 'Gate on the left side.' };

function storage(mode) {
  const data = new Map();
  const quota = () => { const e = new Error('The quota has been exceeded.'); e.name = 'QuotaExceededError'; throw e; };
  return {
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { if (mode === 'quota') quota(); data.set(key, String(value)); },
    removeItem: key => { data.delete(key); },
    data,
  };
}

// mode: 'ok' | 'quota' (writes fail) | 'blocked' (any use of localStorage/sessionStorage throws)
// replies: what each POST does, in order: 'lost' (rejects: the server may have it), 'ok' (200), or a status.
function page({ mode = 'ok', replies = [], withFlow = true } = {}) {
  const sent = [], local = storage(mode), session = storage(mode);
  const fetch = async (url, options = {}) => {
    sent.push(Object.fromEntries(new URLSearchParams(String(options.body || ''))));
    const r = replies[sent.length - 1] ?? 'ok';
    if (r === 'lost') throw new TypeError('Failed to fetch');
    return new Response('', { status: r === 'ok' ? 200 : r });
  };
  const blocked = () => { const e = new Error('Access is denied for this document.'); e.name = 'SecurityError'; throw e; };
  const window = {
    location: { pathname: '/quote/form/', search: '', href: 'https://ghareebfence.com/quote/form/', hostname: 'ghareebfence.com', origin: 'https://ghareebfence.com' },
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
    navigator: { onLine: true, userAgent: 'node-test' }, crypto: globalThis.crypto, fetch,
  };
  const document = { readyState: 'complete', referrer: '', title: 'Test page', cookie: '', addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null };
  const globals = {
    window, document, console, URL, URLSearchParams, FormData, Blob, File, Response, TextEncoder, AbortSignal, atob, btoa, setTimeout, clearTimeout,
    location: window.location, navigator: window.navigator, crypto: globalThis.crypto, fetch,
    CustomEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } },
  };
  for (const [name, store] of [['localStorage', local], ['sessionStorage', session]]) {
    const get = mode === 'blocked' ? blocked : () => store;
    Object.defineProperty(globals, name, { get, enumerable: true });
    Object.defineProperty(window, name, { get, enumerable: true });
  }
  const context = vm.createContext(globals);
  if (withFlow) vm.runInContext(read('public/assets/js/request-flow.js'), context, { filename: 'request-flow.js' });
  vm.runInContext(read('public/assets/js/leads.js'), context, { filename: 'leads.js' });
  return { leads: window.GFSLeads, sent, local };
}

for (const mode of ['blocked', 'quota']) {
  for (const withFlow of [true, false]) {
    test(`storage ${mode}${withFlow ? ' (with request-flow.js)' : ''}: a lost reply is retried under the same receipt and the message says tab only`, async () => {
      const { leads, sent } = page({ mode, withFlow, replies: ['lost', 'lost', 'ok'] });
      const first = await leads.submit(quote);
      assert.equal(first.ok, false);
      assert.match(first.errors[0], /only in this open tab/);
      assert.doesNotMatch(first.errors[0], /remain on this device|saved in this browser/, 'never claims the details outlive the tab');
      const second = await leads.submit(quote);
      assert.equal(second.ok, false);
      const third = await leads.submit(quote);
      assert.equal(third.ok, true);
      assert.equal(sent.length, 3);
      const ids = new Set(sent.map(s => s.submission_id));
      assert.equal(ids.size, 1, 'one receipt id for the same unchanged request');
      assert.equal(third.id, 'web_' + sent[0].submission_id);
      // Once confirmed, the same details again are a new request, not a reuse of the confirmed receipt in memory.
      const { leads: again, sent: sent2 } = page({ mode, withFlow, replies: ['ok'] });
      await again.submit(quote);
      assert.notEqual(sent2[0].submission_id, sent[0].submission_id);
    });
  }
}

test('storage working: the message says the details are saved in this browser, and the retry reuses the receipt', async () => {
  const { leads, sent, local } = page({ mode: 'ok', replies: ['lost', 'ok'] });
  const first = await leads.submit(quote);
  assert.equal(first.ok, false);
  assert.match(first.errors[0], /saved in this browser/);
  assert.doesNotMatch(first.errors[0], /only in this open tab/);
  assert.ok(String(local.data.get('gfs-intake-pending-v1')).includes(sent[0].submission_id), 'written and read back');
  const second = await leads.submit(quote);
  assert.equal(second.ok, true);
  assert.equal(sent[1].submission_id, sent[0].submission_id);
  assert.ok(!String(local.data.get('gfs-intake-pending-v1') || '').includes(sent[0].submission_id), 'cleared once confirmed');
});

test('a changed request after a lost reply is a different request (a new receipt id)', async () => {
  const { leads, sent } = page({ mode: 'quota', replies: ['lost', 'ok'] });
  await leads.submit(quote);
  await leads.submit({ ...quote, notes: 'Gate on the right side.' });
  assert.notEqual(sent[1].submission_id, sent[0].submission_id);
});

test('a server error reply (not ambiguous) keeps the same receipt for the retry too', async () => {
  const { leads, sent } = page({ mode: 'blocked', replies: [503, 'ok'] });
  const first = await leads.submit(quote);
  assert.equal(first.ok, false);
  assert.match(first.errors[0], /only in this open tab/);
  assert.equal((await leads.submit(quote)).ok, true);
  assert.equal(sent[1].submission_id, sent[0].submission_id);
});

test('the same receipt id is what keeps the office from a second lead: the intake creates web_<submission_id> once', () => {
  const fn = read('netlify/functions/submission-created.mjs');
  assert.match(fn, /documentId='\+encodeURIComponent\(intake\.id\)/);
  assert.match(fn, /response\.status===409\)return\{id:intake\.id,duplicate:true\}/);
});
