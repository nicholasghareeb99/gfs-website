// The estimator must work whether the public catalogue document carries
// prices (today) or only style names (once per-style prices stop being
// published). ballpark.js is one browser script, so this test does not run
// the page: it slices the catalogue-building code out of the source text by
// marker comments and evaluates it in node:vm with small stand-ins. The
// same slice is taken from the version on origin/main (git) so "nothing
// changes while pricing is still present" is checked against the old code.
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, read } from './helpers.mjs';

const FILE = 'public/assets/js/ballpark.js';
const SRC = read(FILE);

function oldSource() {
  for (const ref of ['origin/main', 'main']) {
    try { return execFileSync('git', ['show', `${ref}:${FILE}`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26, stdio: ['ignore', 'pipe', 'ignore'] }); } catch (_) {}
  }
  // A checkout without a main ref (a shallow or single-branch clone, CI on the PR branch) used to skip the
  // comparison. The page as it was on main when this branch was cut is kept beside the tests instead, so the
  // check always runs; when a main ref exists it is still preferred.
  return fs.readFileSync(path.join(ROOT, 'tests/fixtures/ballpark.main-482cac1.js'), 'utf8');
}

function slice(src, startPattern, endMarker) {
  const a = src.search(startPattern), b = src.indexOf(endMarker, a);
  assert.ok(a >= 0 && b > a, `markers not found: ${startPattern}`);
  return src.slice(a, b);
}

// Photo audit rules: the real self-contained script at the top of the file.
function auditedPhotosCode(src) {
  const a = src.indexOf('(function(root){'), b = src.indexOf("})(typeof window==='object'?window:globalThis);", a);
  return src.slice(a, b) + "})(typeof window==='object'?window:globalThis);";
}

function harness(src, doc, { readError = null } = {}) {
  const catalogueCode = slice(src, /\/\/ -------- FIRESTORE /, '  // Choose a readable comparison set')
    + slice(src, /  \/\/ Classify a style into a material family\./, '  // ---- DRAFT PERSISTENCE');
  const calls = { updateAll: 0, renderFenceOptions: 0, selected: [] };
  const window = {
    GFS_STYLE_IMAGE_UPGRADES: {},
    GFS_DB: { collection: () => ({ doc: id => ({ get: async () => {
      calls.docId = (calls.docId || []).concat(id);
      if (readError) throw new Error(readError);
      return { exists: doc !== null, data: () => doc };
    } }) }) },
  };
  const sandbox = { window, console: { log: (...a) => process.env.DBG && console.error(...a), warn() {} }, calls, Object, JSON, Array, Set, Math, Number, String, RegExp, Error, URL, Promise };
  vm.createContext(sandbox);
  vm.runInContext(auditedPhotosCode(src), sandbox);
  vm.runInContext(`
    const FENCE_PRICING = { 'built-in-wood': { name: 'Built-in Wood', perFoot: undefined } };
    const PRICING_FACTORS = { remWood: 4, remChain: 3, remOther: 5 };
    const state = { fenceId: '' };
    let pendingDraftStyle = '', styleCatalogSettled = false, pricesLive = false, pricesByRequest = false;
    function selectFenceStyle(id) { calls.selected.push(id); }
    function renderFenceOptions() { calls.renderFenceOptions++; }
    function updateAll() { calls.updateAll++; }
    function checkServerPrice() { calls.pings = (calls.pings || 0) + 1; }
    function updateDraftStyleNotice() {} function applyRequestedStyle() {} function offerStudioStyle() {}
    ${catalogueCode}
    globalThis.api = {
      sync: syncPricingFromFirestore, FENCE_PRICING, PRICING_FACTORS,
      flags: () => ({ pricesLive, pricesByRequest, styleCatalogSettled }),
      cleanStyleNames: typeof cleanStyleNames === 'function' ? cleanStyleNames : null,
    };
  `, sandbox);
  return { api: sandbox.api, calls, window };
}

const PRICING = [
  'Full Cedar Privacy 6ft : 40 : 300 : 600',
  'Galv Chain Link 4ft : 15 : 150 : 300',
  'Kingston - White 6ft : 52 : 400 : 800',
  'Black Aluminum 4ft : 30 : 350 : 700',
].join('\n');
const NAMES = ['Full Cedar Privacy 6ft', 'Galv Chain Link 4ft', 'Kingston - White 6ft', 'Black Aluminum 4ft'];
const PHOTOS = {
  'Full Cedar Privacy 6ft': [{ url: 'https://example.com/cedar.jpg?x=1', name: 'cedar' }, { url: 'javascript:alert(1)', name: 'bad' }],
  'Kingston - White 6ft': [{ url: '/img/kingston.jpg', name: 'k' }, { url: 'https://example.com/hidden.jpg', hidden: true }],
};
const SPECS = { 'Full Cedar Privacy 6ft': { boardWidth: 5.5 } };
const withPricing = { pricing: PRICING, styleNames: NAMES, stylePhotos: PHOTOS, styleSpecs: SPECS, remWood: 6, heightFactor5: 1.1 };
const namesOnly = { styleNames: NAMES, stylePhotos: PHOTOS, styleSpecs: SPECS };

const plain = value => JSON.parse(JSON.stringify(value));

test('(a) with pricing present the catalogue is identical to the code on origin/main', async t => {
  const before = oldSource();
  const oldRun = harness(before, withPricing), newRun = harness(SRC, withPricing);
  await oldRun.api.sync(); await newRun.api.sync();
  assert.deepEqual(plain(newRun.api.FENCE_PRICING), plain(oldRun.api.FENCE_PRICING));
  assert.deepEqual(plain(newRun.api.PRICING_FACTORS), plain(oldRun.api.PRICING_FACTORS));
  assert.deepEqual(plain(newRun.window.GFS_BALLPARK_MODEL_OVERRIDES), plain(oldRun.window.GFS_BALLPARK_MODEL_OVERRIDES));
  assert.equal(newRun.api.flags().pricesLive, true);
  assert.equal(newRun.api.flags().pricesByRequest, false);
  const k = newRun.api.FENCE_PRICING['kingston-white-6ft'];
  assert.equal(k.perFoot, 52); assert.equal(k.doubleGate, 800);
  assert.equal(Object.keys(newRun.api.FENCE_PRICING).length, 4);
  assert.equal(newRun.api.PRICING_FACTORS.remWood, 6);
  assert.deepEqual([...newRun.calls.docId], ['public']);
  assert.equal(newRun.calls.pings || 0, 0, 'with public prices the price function is never checked');
});

test('(b) styleNames only: same styles and photos, no prices, by-request flag', async () => {
  const priced = harness(SRC, withPricing), bare = harness(SRC, namesOnly);
  await priced.api.sync(); await bare.api.sync();
  const expected = Object.fromEntries(Object.entries(plain(priced.api.FENCE_PRICING)).map(([id, st]) => [id, { ...st, perFoot: null, singleGate: null, doubleGate: null }]));
  assert.deepEqual(plain(bare.api.FENCE_PRICING), expected);
  for (const style of Object.values(bare.api.FENCE_PRICING)) {
    assert.equal(style.perFoot, null); assert.equal(style.singleGate, null); assert.equal(style.doubleGate, null);
  }
  assert.deepEqual([...Object.keys(bare.api.FENCE_PRICING)], [...Object.keys(priced.api.FENCE_PRICING)]);
  assert.equal(bare.api.FENCE_PRICING['full-cedar-privacy-6ft'].photo, 'https://example.com/cedar.jpg?x=1');
  assert.equal(bare.api.FENCE_PRICING['galv-chain-link-4ft'].category, priced.api.FENCE_PRICING['galv-chain-link-4ft'].category);
  assert.deepEqual(plain(bare.api.flags()), { pricesLive: false, pricesByRequest: true, styleCatalogSettled: true });
  assert.deepEqual(plain(bare.window.GFS_BALLPARK_MODEL_OVERRIDES), SPECS);
  assert.equal(bare.api.PRICING_FACTORS.remWood, 4, 'removal rates are not read without pricing');
  assert.ok(bare.calls.renderFenceOptions >= 1 && bare.calls.updateAll >= 1);
  assert.equal(bare.calls.pings, 1, 'by-request: the page asks once whether the price function is on');
});

test('(c) hostile styleNames never throw and never pollute prototypes', async () => {
  const hostile = [
    1, null, undefined, true, {}, [], { name: 'x' }, ['y'], '   ', '', 'Real Style', ' Real Style ', 'Real Style',
    '__proto__', 'constructor', 'toString', '!!!', 'x'.repeat(10000), 'y'.repeat(201), 'z'.repeat(200),
    ...Array.from({ length: 5000 }, (_, i) => 'Style ' + i),
  ];
  const run = harness(SRC, { styleNames: hostile, stylePhotos: { '__proto__': [{ url: '/a.jpg' }], 'Real Style': 'nope' }, styleSpecs: 5 });
  await run.api.sync();
  const names = Object.values(run.api.FENCE_PRICING).map(s => s.name);
  assert.ok(names.includes('Real Style') && names.includes('z'.repeat(200)));
  assert.equal(names.filter(n => n === 'Real Style').length, 1);
  assert.ok(!names.some(n => n.length > 200 || n.trim() !== n || !n));
  assert.ok(names.length <= 1000);
  assert.ok(Object.values(run.api.FENCE_PRICING).every(s => s.perFoot === null && s.doubleGate === null));
  assert.equal({}.polluted, undefined); assert.equal(Object.prototype.perFoot, undefined);
  assert.equal(run.window.GFS_BALLPARK_MODEL_OVERRIDES, undefined);
  assert.equal(run.api.flags().pricesByRequest, true);
  for (const bad of [null, 'text', 7, { length: 3 }, [[]], undefined]) {
    const r = harness(SRC, { styleNames: bad, stylePhotos: 'x' });
    await r.api.sync();
    assert.equal(r.api.flags().pricesByRequest, false);
    assert.deepEqual([...Object.keys(r.api.FENCE_PRICING)], ['built-in-wood']);
  }
});

test('(d) neither field, missing document or unreadable document: built-ins stay, outage path', async () => {
  for (const [doc, opts] of [[{ stylePhotos: PHOTOS }, {}], [{ pricing: '   ' }, {}], [{ pricing: 'no usable : lines' }, {}], [null, {}], [{}, { readError: 'permission-denied' }]]) {
    const run = harness(SRC, doc, opts);
    await run.api.sync();
    assert.deepEqual([...Object.keys(run.api.FENCE_PRICING)], ['built-in-wood']);
    assert.deepEqual(plain(run.api.flags()), { pricesLive: false, pricesByRequest: false, styleCatalogSettled: true });
  }
});

test('(e) source: only settings/public is read, by-request wording exists and the outage wording stays', () => {
  const offenders = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|mjs|html)$/.test(entry.name)) {
        fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
          if (/doc\(\s*['"]global['"]\s*\)/.test(line) && !full.endsWith(path.join('admin', 'index.html'))) offenders.push(`${path.relative(ROOT, full)}:${i + 1}`);
        });
      }
    }
  })(path.join(ROOT, 'public'));
  assert.deepEqual(offenders, [], 'the public site must not read settings/global');
  assert.ok(!/doc\('global'\)/.test(SRC));
  for (const text of [
    'Request your free quote.',
    'Send your plan and our team will get your price to you.',
    'We will send your price',
    'Use step 4 to send your plan and our team will get your price to you.',
    'Your quote in 4 quick steps',
  ]) assert.ok(SRC.includes(text), text);
  assert.ok(SRC.includes('Our price list is not loading right now.'), 'outage wording kept for a real failure');
  const strings = SRC.match(/(?<=pricesOnRequest\(\) \? ')[^']+/g) || [];
  assert.ok(strings.length >= 4 && strings.every(s => !/—|–|\$/.test(s)), 'by-request strings: plain, no dashes or dollars');
});
