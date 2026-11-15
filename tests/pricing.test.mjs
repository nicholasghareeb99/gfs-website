// The server-side price function (netlify/functions/ballpark-price.mjs).
// Its rules are pinned here: every style at its own rate, no height
// multipliers, ranges only, and never a total, a per-foot rate or anything
// a rate follows from directly. tests/ballpark-server-parity.test.mjs
// checks the same math against the browser's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getSectionSize, handle, parsePricing, priceProject, readRequest, resetCaches } from '../netlify/functions/ballpark-price.mjs';
import { fakeGoogle, priceFunctionEnv } from './helpers.mjs';

const PRICING = [
  'Full Cedar Privacy 6ft : 40 : 300 : 600',
  'Full Cedar Privacy 4ft : 31 : 250 : 500',
  'Galv Chain Link 4ft : 15 : 150 : 300',
  'Galv Chain Link 6ft : 19 : 160 : 320',
  'Kingston - White 6ft : 52 : 400 : 800',
  'Ranch Rail : 12.5 : 100 : 200',
].join('\n');
const RATES = [40, 31, 15, 19, 52, 12.5, 300, 600, 250, 500, 150, 300, 160, 320, 400, 800, 100, 200, 5, 3, 6];
const RECEIPT = 'web_abcdefghijklmnop1234';
const ENV = priceFunctionEnv();
const part = (style, feet, o = {}) => ({ style, feet, height: 6, singleGates: 0, doubleGates: 0, ...o });
const project = {
  receipt: RECEIPT,
  parts: [part('Full Cedar Privacy 6ft', 140, { singleGates: 2 }), part('Galv Chain Link 4ft', 80, { height: 4, doubleGates: 1 })],
  removal: { on: true, material: 'wood', feet: 220 },
};
const google = (o = {}) => fakeGoogle({ pricing: PRICING, receipts: [RECEIPT], ...o });
const ask = (body, g = google(), { env = ENV, headers = {}, raw, now } = {}) => {
  resetCaches();
  return handle(new Request('https://example.test/.netlify/functions/ballpark-price', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: raw ?? JSON.stringify(body),
  }), { fetcher: g.fetcher, env, now });
};

test('the price list parses into one entry per style, with the page defaults for gates', () => {
  const styles = parsePricing(PRICING + '\nBad : 10 : x : y');
  assert.equal(Object.keys(styles).length, 7);
  assert.equal(styles['kingston-white-6ft'].name, 'Kingston - White 6ft');
  assert.deepEqual([styles['bad'].singleGate, styles['bad'].doubleGate], [150, 300]);
});

test('a two-style project adds up to the right range: own rate per style, gates, removal', async () => {
  const response = await ask(project);
  assert.equal(response.status, 200);
  const answer = await response.json();
  // Cedar: 140 ft rounds up to 144 ft of 8 ft sections x 40 = 5,760, plus two walk gates 600.
  // Chain link: 80 ft x 15 = 1,200 (10 ft sections, no waste), plus one drive gate 300. Removal: 220 ft x 5 = 1,100.
  // Total 8,960; the band is 95% to 105% rounded to $100.
  assert.deepEqual([answer.low, answer.high], [8500, 9400]);
});

test('the answer is {low, high, comparisons} and nothing a rate follows from', async () => {
  const answer = await (await ask({ ...project, compare: true })).json();
  assert.deepEqual(Object.keys(answer).sort(), ['comparisons', 'low', 'high'].sort());
  assert.ok(!('total' in answer) && !('parts' in answer) && !('billableFeet' in answer));
  for (const row of answer.comparisons) {
    assert.deepEqual(Object.keys(row).sort(), ['high', 'low', 'style']);
    assert.ok(!('total' in row));
  }
  const text = JSON.stringify(answer);
  assert.doesNotMatch(text, /perFoot|singleGate|doubleGate|"rate"|total|billable|waste|sectionSize/);
});

test('no field of an answer, divided by the feet, equals a rate on the list', async () => {
  const feetCases = [96, 140, 144, 250, 333, 480];
  for (const feet of feetCases) {
    const answer = await (await ask({ receipt: RECEIPT, parts: [part('Full Cedar Privacy 6ft', feet)], removal: { on: false }, compare: true })).json();
    // Each figure is checked against the feet billed for ITS style (the style's own section size).
    const rows = [{ style: 'Full Cedar Privacy 6ft', low: answer.low, high: answer.high }, ...answer.comparisons];
    for (const row of rows) {
      const size = getSectionSize(row.style);
      for (const divisor of [feet, size ? Math.ceil(feet / size) * size : feet]) {
        for (const value of [row.low, row.high]) assert.ok(!RATES.includes(value / divisor), `${row.style}: ${value} / ${divisor} is a configured rate`);
      }
    }
  }
});

test('the same style costs the same at any chosen height (no height multiplier)', () => {
  const styles = parsePricing(PRICING);
  const factors = { remWood: 5, remChain: 3, remOther: 6 };
  const at = height => priceProject(styles, factors, { parts: [part('Ranch Rail', 96, { height })], removal: { on: false } });
  assert.deepEqual(at(4), at(8));
  assert.equal(at(5).low, 1100); // 96 ft x 12.5 = 1,200; 95% = 1,140 rounds to 1,100
});

test('a height the list cannot price gets no price: unnamed style off the 4/5/6/8 ladder, or a bad height', async () => {
  const off = await (await ask({ receipt: RECEIPT, parts: [part('Ranch Rail', 50, { height: 7 })], removal: { on: false } })).json();
  assert.deepEqual(off, { needsQuote: true });
  assert.equal((await ask({ receipt: RECEIPT, parts: [part('Ranch Rail', 50, { height: 40 })], removal: { on: false } })).status, 400);
});

test('comparisons: same height as the main style, unnamed-height styles always, cheapest first', async () => {
  const answer = await (await ask({ receipt: RECEIPT, parts: [part('Galv Chain Link 6ft', 100)], removal: { on: false }, compare: true })).json();
  const names = answer.comparisons.map(c => c.style);
  assert.deepEqual(names.slice().sort(), ['Full Cedar Privacy 6ft', 'Galv Chain Link 6ft', 'Kingston - White 6ft', 'Ranch Rail']);
  assert.deepEqual(answer.comparisons.map(c => c.low), answer.comparisons.map(c => c.low).sort((a, b) => a - b));
  assert.equal(names[0], 'Ranch Rail');
});

test('removal needs a material; an added style that is not on the list leaves the whole project unpriced', async () => {
  assert.equal((await ask({ ...project, removal: { on: true } })).status, 400);
  const answer = await (await ask({ ...project, parts: [project.parts[0], part('Not On The List', 10)], removal: { on: false } })).json();
  assert.deepEqual(answer, { needsQuote: true });
});

test('a price is only given for a request the office already has, and not an old one', async () => {
  assert.equal((await ask({ ...project, receipt: 'web_zzzzzzzzzzzzzzzz9999' })).status, 409);
  const old = google({ createdAtMs: Date.now() - 3 * 24 * 3600 * 1000 });
  assert.equal((await ask(project, old)).status, 403);
});

test('without the key or the project id it answers 503 not-configured and never throws', async () => {
  for (const env of [{}, { GFS_FIREBASE_PROJECT_ID: 'test-project' }, { GFS_PRICING_SERVICE_ACCOUNT: ENV.GFS_PRICING_SERVICE_ACCOUNT }, { ...ENV, GFS_PRICING_SERVICE_ACCOUNT: 'not a key' }, { ...ENV, GFS_FIREBASE_PROJECT_ID: 'A b' }]) {
    const g = google();
    for (const body of [project, { ping: true }, null]) {
      const response = await ask(body, g, { env });
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), { error: 'not-configured' });
    }
    assert.equal(g.calls.length, 0, 'no network without configuration');
  }
});

test('the capability check answers 200 {ok:true} when configured, with no network and no receipt', async () => {
  const g = google();
  const response = await ask({ ping: true }, g);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(g.calls.length, 0);
  assert.equal((await ask({ ping: true, receipt: RECEIPT }, g)).status, 400);
});

test('hardening: POST only, JSON only, 8 kB, same origin, strict fields, receipt checked before any network call', async () => {
  resetCaches();
  const g = google();
  const url = 'https://example.test/.netlify/functions/ballpark-price';
  for (const method of ['GET', 'PUT', 'DELETE']) assert.equal((await handle(new Request(url, { method }), { fetcher: g.fetcher, env: ENV })).status, 405);
  assert.equal((await ask(project, g, { headers: { 'Content-Type': 'text/plain' } })).status, 415);
  assert.equal((await ask(project, g, { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await ask(project, g, { headers: { Origin: 'https://example.test' } })).status, 200);
  assert.equal((await ask(null, g, { raw: JSON.stringify({ ...project, pad: 'x'.repeat(9000) }) })).status, 413);
  assert.equal((await ask(null, g, { raw: '{"receipt":' })).status, 400);
  assert.equal((await ask(null, g, { raw: '[]' })).status, 400);
  const calls = g.calls.length;
  const bad = [
    { ...project, receipt: 'bad' }, { ...project, receipt: 'web_short' }, { ...project, receipt: 5 },
    { ...project, extra: 1 }, { ...project, parts: [] }, { ...project, parts: Array(5).fill(project.parts[0]) },
    { ...project, parts: [{ ...project.parts[0], feet: '140' }] }, { ...project, parts: [{ ...project.parts[0], feet: -1 }] },
    { ...project, parts: [{ ...project.parts[0], feet: 2001 }] }, { ...project, parts: [{ ...project.parts[0], feet: 1500 }, { ...project.parts[1], feet: 600 }], removal: { on: false } },
    { ...project, parts: [{ ...project.parts[0], singleGates: 1.5 }] }, { ...project, parts: [{ ...project.parts[0], singleGates: -1 }] },
    { ...project, parts: [{ ...project.parts[0], style: '' }] }, { ...project, parts: [{ ...project.parts[0], style: 'x'.repeat(201) }] },
    { ...project, parts: [{ ...project.parts[0], sneaky: 1 }] }, { ...project, removal: { on: true, material: 'gold', feet: 220 } },
    { ...project, removal: { on: true, material: 'wood', feet: 900 } }, { ...project, compare: 'yes' },
  ];
  for (const body of bad) assert.equal((await ask(body, g)).status, 400, JSON.stringify(body).slice(0, 80));
  assert.equal(g.calls.length, calls, 'bad input never reaches the network');
  assert.equal(readRequest(JSON.stringify({ receipt: RECEIPT, parts: [part('Ranch Rail', 100)] })).compare, false);
});

test('errors carry no rates, paths or stack traces', async () => {
  const broken = { calls: [], fetcher: async () => new Response('secret rate 52 at projects/x/documents/settings/global', { status: 500 }) };
  const response = await ask(project, broken);
  assert.equal(response.status, 503);
  const text = await response.text();
  assert.deepEqual(JSON.parse(text), { error: 'Pricing is unavailable right now.' });
  assert.doesNotMatch(text, /settings|projects|52|at .*\.mjs/);
});

test('the price list is cached for five minutes and the token until it expires', async () => {
  resetCaches();
  const g = google();
  const send = now => handle(new Request('https://example.test/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) }), { fetcher: g.fetcher, env: ENV, now });
  const count = what => g.calls.filter(u => u.includes(what)).length;
  await send(1000); await send(1100); await send(1290);
  assert.equal(count('settings/global'), 1);
  assert.equal(count('oauth2'), 1);
  await send(1400); // more than five minutes later
  assert.equal(count('settings/global'), 2);
  assert.equal(count('oauth2'), 1, 'token still good for an hour');
  await send(1000 + 3600);
  assert.equal(count('oauth2'), 2);
  assert.equal(count('websiteLeads'), 5, 'the receipt is looked up every time');
});

// ---- abuse bound: a per-receipt counter -------------------------------------
const young = (o = {}) => google({ createdAtMs: 1_799_999_000_000, ...o });
const sendWith = (g, body = project, now = 1_800_000_000, env = ENV) => handle(new Request('https://example.test/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { fetcher: g.fetcher, env, now });

test('a dozen changes by a normal customer are all answered, comparisons count as one request each', async () => {
  resetCaches();
  const g = young();
  for (let i = 0; i < 12; i++) {
    const response = await sendWith(g, { ...project, parts: [part('Galv Chain Link 4ft', 80 + i * 10, { height: 4 })], removal: { on: false }, compare: true });
    assert.equal(response.status, 200);
  }
  assert.equal(g.counts.get(RECEIPT), 12);
});

test('the lifetime cap: 60 priced requests per receipt, then 429 with a plain message', async () => {
  resetCaches();
  const g = young();
  for (let i = 0; i < 60; i++) assert.equal((await sendWith(g, project, 1_800_000_000 + i * 60)).status, 200, 'request ' + (i + 1));
  const over = await sendWith(g, project, 1_800_000_000 + 61 * 60);
  assert.equal(over.status, 429);
  const text = await over.text();
  assert.match(text, /Too many price requests/);
  assert.doesNotMatch(text, /count|cap|60|ballparkPriceUse|settings/);
  // Another receipt is unaffected.
  const other = fakeGoogle({ pricing: PRICING, receipts: [RECEIPT, 'web_otherotherother99'], createdAtMs: 1_799_999_000_000 });
  other.counts.set(RECEIPT, 60);
  assert.equal((await sendWith(other, { ...project, receipt: 'web_otherotherother99' })).status, 200);
});

test('the short-window cap: 20 in one minute, fine again the next minute', async () => {
  resetCaches();
  const g = young();
  const t = 1_800_000_040; // 40 s into a minute
  for (let i = 0; i < 20; i++) assert.equal((await sendWith(g, project, t)).status, 200);
  assert.equal((await sendWith(g, project, t + 5)).status, 429);
  assert.equal((await sendWith(g, project, t + 30)).status, 200, 'the next minute starts a new window');
});

test('the counter writes only its own collection, with no rate in it, and the ping never writes', async () => {
  resetCaches();
  const g = young();
  await sendWith(g, { ping: true });
  assert.equal(g.commits.length, 0);
  await sendWith(g, { ...project, compare: true });
  assert.equal(g.commits.length, 1);
  const text = JSON.stringify(g.commits[0]);
  const names = g.commits[0].writes.map(w => w.update.name);
  assert.ok(names.every(n => n.includes('/documents/ballparkPriceUse/' + RECEIPT)), names.join());
  assert.doesNotMatch(text, /settings|websiteLeads|perFoot|"low"|"high"/);
  // Refused requests (bad input, unknown receipt) are not counted.
  await ask({ ...project, receipt: 'bad' }, g); await ask({ ...project, receipt: 'web_zzzzzzzzzzzzzzzz9999' }, g);
  assert.equal(g.commits.length, 1);
});

test('if the counter cannot be written the answer is 503 (the page falls back), unless the owner turns the limit off', async () => {
  resetCaches();
  const g = young({ commitStatus: 403 });
  const response = await sendWith(g);
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /403|ballparkPriceUse|permission/i);
  resetCaches();
  assert.equal((await sendWith(g, project, 1_800_000_000, { ...ENV, GFS_PRICING_LIMIT: 'off' })).status, 200);
  assert.equal(g.commits.length, 1, 'with the limit off nothing more is written');
});

test('a lead that is not there yet gives 409 and is priced on a later try (the page retries)', async () => {
  resetCaches();
  const g = young({ leadDelay: 2 });
  assert.equal((await sendWith(g)).status, 409);
  assert.equal((await sendWith(g)).status, 409);
  assert.equal((await sendWith(g)).status, 200);
  assert.equal(g.counts.get(RECEIPT), 1, 'only the priced request was counted');
});
