// The price function must give customers the same numbers the browser used
// to. This test cuts the browser's pricing functions out of ballpark.js
// (see ballpark-slices.mjs), runs them in node:vm on many varied projects,
// and compares the browser's range and comparison list with what the server
// function answers for the same project. The request is built by the page's
// own serverPriceRequest(), so that code is covered too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PRICING_CODE, slice, run } from './ballpark-slices.mjs';
import { handle, resetCaches } from '../netlify/functions/ballpark-price.mjs';
import { fakeGoogle, priceFunctionEnv } from './helpers.mjs';

// A list with every kind of line the page has to cope with.
const PRICING = [
  'Full Cedar Privacy 6ft : 40.5 : 300 : 600',
  'Full Cedar Privacy 4ft : 31 : 250 : 500',
  'Cedar Shadowbox 6ft : 44 : 320 : 640',
  'Treated Wood Privacy 6ft : 24 : 200 : 400',
  'Dog Ear Picket 4ft : 18 : 150 : 300',
  'Board on Board Cedar 8ft : 58 : 380 : 760',
  'Galv Chain Link 4ft : 15 : 150 : 300',
  'Galv Chain Link 6ft : 19 : 160 : 320',
  'Black Chain Link 6ft : 19 : 160 : 320',
  'Chainlink 5ft : 17 : 150 : 300',
  'Kingston - White 6ft : 52 : 400 : 800',
  'Kingston - White 4ft : 41 : 300 : 600',
  'Vinyl Picket 4ft : 38 : 260 : 520',
  'Vinyl Privacy 6ft : 49.75 : 350 : 700',
  'Black Aluminum 4ft : 30 : 350 : 700',
  'Black Aluminum 5ft : 34 : 380 : 760',
  'Ornamental Rockport Midrail 4 ft : 27 : 300 : 600',
  'Rockport Midrail : 29 : 310 : 620',
  'Split Rail 3 Rail : 11 : 120 : 240',
  'Ranch Rail : 12.5 : 100 : 200',
  'Hybrid Privacy 6ft : 62 : 420 : 840',
  'Wellington 6\' : 55 : 400 : 800',
  'Estate 4-6ft : 36 : 300 : 600',
  'Odd Style 6ft 3in : 33 : 200 : 400',
  'Gates Missing 6ft : 30 : abc : ',
  'Free Fence 6ft : 0 : 100 : 200',
  'Bad Rate 6ft : abc : 100 : 200',
  'No Gate Fields 6ft : 30',
  ':::',
  'Full Cedar Privacy 6ft!! : 41 : 301 : 601',   // same slug as the first line: later line wins
  '   ',
].join('\n');
const FACTORS = { remWood: 5.5, remChain: 3, remOther: 6.25 };
const RECEIPT = 'web_parityparityparity01';
const ENV = priceFunctionEnv();

function browser() {
  const code = `
    const FENCE_PRICING = {};
    const state = { linearFeet: 0, fenceId: '', height: '6', singleGates: 0, doubleGates: 0, removeOldFence: false, existingFenceMaterial: '', sections: [] };
    let pricesLive = true, styleCatalogSettled = true;
    function buildStyleEntry(name, perFoot, singleGate, doubleGate) { return { name, perFoot, singleGate, doubleGate }; }
    function categoryForName() { return ''; }
    function serverComparisonRows() { return []; }
    function serverPriceNow() { return null; }
    ${PRICING_CODE}
    ${slice('  function serverPriceRequest() {', '  function serverPriceKey')}
    globalThis.api = { state, FENCE_PRICING, PRICING_FACTORS, buildStylesFromExecPricing, calculatePrice, comparisonRows, normalizeSections, serverPriceRequest, slugify };
  `;
  const { api } = run({}, code);
  assert.equal(api.buildStylesFromExecPricing(PRICING, {}), true);
  Object.assign(api.PRICING_FACTORS, FACTORS);
  return api;
}

// Small deterministic random numbers so a failure reproduces.
function random(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

function project(api, rnd) {
  const pick = list => list[Math.floor(rnd() * list.length)];
  const ids = Object.keys(api.FENCE_PRICING);
  const feet = () => pick([1, 7, 8, 9, 24.5, 40, 96, 100, 143, 144, 250, 333.33, 480, 800, 1999, 2000, 2001]);
  const s = api.state;
  s.sections = [];
  s.fenceId = pick(ids);
  s.linearFeet = feet();
  s.height = pick(['4', '5', '6', '8', '7', '3']);
  s.singleGates = Math.floor(rnd() * 5); s.doubleGates = Math.floor(rnd() * 3);
  s.removeOldFence = rnd() < 0.4;
  s.existingFenceMaterial = pick(['wood', 'chain', 'vinyl', 'aluminum', 'other', '', 'steel']);
  const extra = Math.floor(rnd() * 4);
  for (let i = 0; i < extra; i++) {
    s.sections.push({ uid: 's' + i, fenceId: rnd() < 0.05 ? 'nope' : pick(ids), feet: pick([0, 5, 12, 30, 60, 99.5]), height: pick(['4', '6', '8', '7']), singleGates: Math.floor(rnd() * 3), doubleGates: Math.floor(rnd() * 2) });
  }
  api.normalizeSections();
}

async function serverAnswer(request) {
  resetCaches();
  const google = fakeGoogle({ pricing: PRICING, receipts: [RECEIPT], factors: FACTORS });
  const response = await handle(new Request('https://example.test/f', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receipt: RECEIPT, ...request }) }), { fetcher: google.fetcher, env: ENV });
  return { status: response.status, body: await response.json() };
}

test('gate openings leave the full 151 ft in the billable run', async () => {
  const api = browser();
  // One 4 ft walk opening and one 10 ft drive opening. The full 151 ft
  // rounds to nineteen 8 ft sections, plus both gate charges.
  Object.assign(api.state, {
    fenceId: 'full-cedar-privacy-6ft', linearFeet: 151, singleGates: 1, doubleGates: 1,
  });
  const total = 152 * 41 + 301 + 601;
  const calculated = api.calculatePrice();
  assert.deepEqual({ ...calculated }, { total, low: 6800, high: 7500 });
  const { status, body } = await serverAnswer(api.serverPriceRequest());
  assert.equal(status, 200);
  assert.deepEqual([body.low, body.high], [6800, 7500]);
  assert.equal(body.parts[0].feet, 151);
});

test('browser and server give the same range and the same comparison list on 400 varied projects', async () => {
  const api = browser(), rnd = random(20261115);
  let priced = 0, unpriced = 0, withSections = 0, withRemoval = 0, withComparisons = 0;
  for (let n = 0; n < 400; n++) {
    project(api, rnd);
    const label = `project ${n}: ${JSON.stringify(api.state)}`;
    const expected = api.calculatePrice();
    const request = api.serverPriceRequest();
    if (!request) { assert.equal(expected, null, 'the page skips the call only when it cannot price: ' + label); unpriced++; continue; }
    const { status, body } = await serverAnswer(request);
    if (!expected) { assert.equal(status, 200, label); assert.deepEqual(body, { needsQuote: true }, label); unpriced++; continue; }
    assert.equal(status, 200, label);
    assert.equal(body.low, expected.low, 'low: ' + label);
    assert.equal(body.high, expected.high, 'high: ' + label);
    const rows = api.comparisonRows().map(r => ({ style: r.name, low: r.low, high: r.high }));
    assert.deepEqual(body.comparisons, rows, 'comparisons: ' + label);
    priced++; withSections += api.state.sections.length ? 1 : 0; withRemoval += api.state.removeOldFence ? 1 : 0; withComparisons += rows.length > 1 ? 1 : 0;
  }
  // The sample must really exercise the rules, not just agree on "no price".
  assert.ok(priced >= 100 && unpriced >= 20 && withSections >= 20 && withRemoval >= 20 && withComparisons >= 50, JSON.stringify({ priced, unpriced, withSections, withRemoval, withComparisons }));
});

test('hand-picked cases that pin each rule', async () => {
  const api = browser(), s = api.state;
  const both = async () => {
    api.normalizeSections();
    const expected = api.calculatePrice(), request = api.serverPriceRequest();
    if (!request) { assert.equal(expected, null); return null; }
    const { body } = await serverAnswer(request);
    if (!expected) assert.deepEqual(body, { needsQuote: true }); else assert.deepEqual([body.low, body.high], [expected.low, expected.high]);
    return expected;
  };
  Object.assign(s, { fenceId: 'full-cedar-privacy-6ft', linearFeet: 143, singleGates: 1, doubleGates: 1 });
  assert.deepEqual(JSON.parse(JSON.stringify(await both())), { total: Math.round(144 * 41 + 301 + 601), low: Math.round((144 * 41 + 902) * 0.95 / 100) * 100, high: Math.round((144 * 41 + 902) * 1.05 / 100) * 100 }, 'later duplicate line wins; section rounding up to 8 ft; gates');
  Object.assign(s, { removeOldFence: true, existingFenceMaterial: 'chain' });
  assert.ok(await both(), 'removal at the chain rate');
  s.existingFenceMaterial = '';
  assert.equal(await both(), null, 'removal without a material has no price');
  Object.assign(s, { removeOldFence: false, linearFeet: 2000 });
  assert.ok(await both(), '2000 ft is the most');
  s.linearFeet = 2001;
  assert.equal(api.serverPriceRequest(), null, 'over 2000 ft the page does not ask');
  assert.equal(api.calculatePrice(), null);
  Object.assign(s, { fenceId: 'ranch-rail', linearFeet: 100, height: '7' });
  assert.equal(await both(), null, 'a height off the ladder on a style with no height in its name');
  s.height = '8';
  assert.ok(await both(), 'ladder heights price');
  Object.assign(s, { fenceId: 'free-fence-6ft', height: '6' });
  assert.equal(await both(), null, 'a zero rate is not a free fence');
  Object.assign(s, { fenceId: 'full-cedar-privacy-6ft', sections: [{ uid: 's1', fenceId: 'galv-chain-link-4ft', feet: 40, height: '4', singleGates: 0, doubleGates: 1 }] });
  assert.ok(await both(), 'a second style');
  s.sections[0].fenceId = 'free-fence-6ft';
  assert.equal(await both(), null, 'one unpriceable part leaves the project unpriced');
});

test('comparisons keep to the main style\'s height and run cheapest first', async () => {
  const api = browser(), s = api.state;
  Object.assign(s, { fenceId: 'galv-chain-link-4ft', linearFeet: 120, height: '4' });
  const rows = api.comparisonRows();
  const { body } = await serverAnswer(api.serverPriceRequest());
  assert.deepEqual(body.comparisons.map(c => c.style), rows.map(r => r.name));
  assert.ok(rows.length > 3);
  const lows = body.comparisons.map(c => c.low);
  assert.deepEqual(lows, lows.slice().sort((a, b) => a - b));
  const names = body.comparisons.map(c => c.style);
  for (const tall of ['Galv Chain Link 6ft', 'Full Cedar Privacy 6ft', 'Chainlink 5ft', 'Black Aluminum 5ft']) assert.ok(!names.includes(tall), tall + ' is not a like-for-like comparison');
  for (const same of ['Black Aluminum 4ft', 'Full Cedar Privacy 4ft', 'Ranch Rail', 'Estate 4-6ft']) assert.ok(names.includes(same), same + ' belongs in the list');
});
