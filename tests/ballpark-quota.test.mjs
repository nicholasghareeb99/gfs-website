// Server price function: the age check on the lead document, and the two
// separate limits (attempts per minute, priced ranges for the whole project).
import test from 'node:test';
import assert from 'node:assert/strict';
import { handle, resetCaches, leadAgeStatus } from '../netlify/functions/ballpark-price.mjs';
import { deliverIntake, firestoreFields, intakeRecord } from '../netlify/functions/submission-created.mjs';
import { fakeGoogle, priceFunctionEnv } from './helpers.mjs';

const PRICING = ['Galv Chain Link 4ft : 15 : 150 : 300', 'Ranch Rail : 12.5 : 100 : 200'].join('\n');
const RECEIPT = 'web_quotaquotaquota01';
const ENV = priceFunctionEnv();
const NOW = 1_800_000_000, NOW_MS = NOW * 1000;
const part = (style, feet) => ({ style, feet, height: 4, singleGates: 0, doubleGates: 0 });
const project = { receipt: RECEIPT, parts: [part('Galv Chain Link 4ft', 100)], removal: { on: false } };
const unpriceable = { ...project, parts: [part('Not On The List', 100)] };
const google = (o = {}) => fakeGoogle({ pricing: PRICING, receipts: [RECEIPT], createdAtMs: NOW_MS - 1000, ...o });
const send = (g, body = project, now = NOW) => handle(new Request('https://example.test/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { fetcher: g.fetcher, env: ENV, now });
const minute = i => NOW + i * 60;
const isLifetimeCommit = body => !body.writes[0].update.name.includes('_m');

// ---- 4. the age of the lead is read from something trustworthy ----------------
test('lead age: missing, unreadable, zero, negative and future timestamps never authorise a price', async () => {
  const cases = {
    missing: { fields: {} },
    'no fields at all': {},
    'text, not a number': { fields: { createdAtMs: { stringValue: String(NOW_MS - 1000) } } },
    'text that is not a number': { fields: { createdAtMs: { stringValue: 'soon' } } },
    zero: { fields: { createdAtMs: { doubleValue: 0 } } },
    negative: { fields: { createdAtMs: { doubleValue: -5 } } },
    'a null': { fields: { createdAtMs: { nullValue: null } } },
    'six minutes in the future': { fields: { createdAtMs: { doubleValue: NOW_MS + 6 * 60 * 1000 } } },
    'years in the future': { fields: { createdAtMs: { doubleValue: NOW_MS * 2 } } },
  };
  for (const [name, doc] of Object.entries(cases)) {
    resetCaches();
    const g = google({ leadDoc: () => doc });
    const res = await send(g);
    assert.equal(res.status, 403, name);
    assert.deepEqual(await res.json(), { error: 'Request not valid' }, name);
    assert.equal(g.commits.length, 0, name + ': nothing counted');
  }
});

test('lead age: a recent lead is priced, a day-old one is not, a little clock skew is allowed', async () => {
  const at = ms => google({ leadDoc: () => ({ fields: { createdAtMs: { doubleValue: ms } } }) });
  for (const [name, ms, status] of [['just now', NOW_MS - 1000, 200], ['almost a day', NOW_MS - 23.9 * 3600e3, 200], ['over a day', NOW_MS - 24.1 * 3600e3, 403], ['clock skew of four minutes', NOW_MS + 4 * 60e3, 200], ['integerValue', 'int', 200]]) {
    resetCaches();
    const g = ms === 'int' ? google({ leadDoc: () => ({ fields: { createdAtMs: { integerValue: String(NOW_MS - 5000) } } }) }) : at(ms);
    assert.equal((await send(g)).status, status, name);
  }
});

test('lead age: the database createTime wins over a createdAtMs the sender could have chosen', async () => {
  const iso = ms => new Date(ms).toISOString();
  const cases = [
    ['fresh createTime, forged old createdAtMs', { createTime: iso(NOW_MS - 5000), fields: { createdAtMs: { doubleValue: 1 } } }, 200],
    ['old createTime, forged fresh createdAtMs', { createTime: iso(NOW_MS - 30 * 3600e3), fields: { createdAtMs: { doubleValue: NOW_MS - 1000 } } }, 403],
    ['createTime alone is enough', { createTime: iso(NOW_MS - 5000), fields: {} }, 200],
    ['unreadable createTime is refused, not ignored', { createTime: 'garbage', fields: { createdAtMs: { doubleValue: NOW_MS - 1000 } } }, 403],
    ['createTime in the future', { createTime: iso(NOW_MS + 3600e3), fields: { createdAtMs: { doubleValue: NOW_MS - 1000 } } }, 403],
  ];
  for (const [name, doc, status] of cases) { resetCaches(); assert.equal((await send(google({ leadDoc: () => doc }))).status, status, name); }
  assert.equal(leadAgeStatus({ fields: { createdAtMs: { doubleValue: NOW_MS - 5 } } }, NOW_MS), 'ok');
  assert.equal(leadAgeStatus(null, NOW_MS), 'invalid');
});

test('lead age: a lead written by the real intake function (server time) still prices', async () => {
  resetCaches();
  const written = intakeRecord({ gfs_contract: 'gfs-intake-v1', intake_kind: 'ballpark', submission_id: 'quotaquotaquota01', name: 'Pat Smith', phone: '4195550100', meta: '' }, new Date(NOW_MS - 20000));
  assert.equal(written.id, RECEIPT);
  const g = google({ leadDoc: () => ({ fields: firestoreFields(written.record) }) });
  assert.equal((await send(g)).status, 200);
  assert.ok(deliverIntake, 'the intake function is the writer being modelled');
});

// ---- 3. attempts and priced ranges are limited separately ----------------------
test('quota: twenty answers plus forty minute-blocked attempts leave 40 priced ranges still available', async () => {
  resetCaches();
  const g = google();
  const burst = [];
  for (let i = 0; i < 60; i++) burst.push((await send(g, project, NOW + 1)).status);
  assert.equal(burst.filter(s => s === 200).length, 20);
  assert.equal(burst.filter(s => s === 429).length, 40);
  assert.equal(g.counts.get(RECEIPT), 20, 'only the 20 ranges that were given are counted');
  for (let i = 1; i <= 40; i++) assert.equal((await send(g, project, minute(i))).status, 200, 'later minute ' + i);
  assert.equal((await send(g, project, minute(41))).status, 429, 'now the 60 ranges are used');
  assert.equal(g.counts.get(RECEIPT), 61);
});

test('quota: the minute limit says when to come back, and the next minute prices again', async () => {
  resetCaches();
  const g = google();
  const t = 1_800_000_040;
  for (let i = 0; i < 20; i++) assert.equal((await send(g, project, t)).status, 200);
  const blocked = await send(g, project, t + 5);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.headers.get('Retry-After'), '15');
  assert.doesNotMatch(await blocked.text(), /"low"|"high"/);
  assert.equal((await send(g, project, t + 30)).status, 200);
});

test('quota: sixty temporary outages use none of the allowance, and the recovered service prices', async () => {
  resetCaches();
  const g = google();
  let down = true;
  const flaky = { ...g, fetcher: (url, o) => down && url.endsWith('settings/global') ? Promise.resolve(new Response('no', { status: 500 })) : g.fetcher(url, o) };
  for (let i = 0; i < 60; i++) { const r = await send(flaky, project, minute(i)); assert.equal(r.status, 503); assert.doesNotMatch(await r.text(), /"low"/); }
  assert.equal(g.counts.get(RECEIPT), undefined, 'not a single range was counted');
  down = false;
  const ok = await send(flaky, project, minute(61));
  assert.equal(ok.status, 200);
  assert.equal(g.counts.get(RECEIPT), 1);
});

test('quota: a burst of outages in one minute stops that minute only (attempt limit), not the project', async () => {
  resetCaches();
  const g = google();
  let down = true;
  const flaky = { fetcher: (url, o) => down && url.endsWith('settings/global') ? Promise.resolve(new Response('no', { status: 500 })) : g.fetcher(url, o) };
  for (let i = 0; i < 20; i++) assert.equal((await send(flaky, project, NOW + 1)).status, 503);
  down = false;
  assert.equal((await send(flaky, project, NOW + 2)).status, 429, 'same minute: attempts were used up');
  assert.equal((await send(flaky, project, minute(1))).status, 200, 'next minute prices');
  assert.equal(g.counts.get(RECEIPT), 1);
});

test('quota: sixty needs-a-quote answers use none of the allowance', async () => {
  resetCaches();
  const g = google();
  for (let i = 0; i < 60; i++) assert.deepEqual(await (await send(g, unpriceable, minute(i))).json(), { needsQuote: true });
  assert.equal(g.counts.get(RECEIPT), undefined);
  assert.equal((await send(g, project, minute(61))).status, 200);
  assert.equal(g.counts.get(RECEIPT), 1);
});

test('quota: sixty priced ranges, then 429 with no range in it', async () => {
  resetCaches();
  const g = google();
  for (let i = 0; i < 60; i++) assert.equal((await send(g, project, minute(i))).status, 200, 'range ' + (i + 1));
  const over = await send(g, project, minute(61));
  assert.equal(over.status, 429);
  const text = await over.text();
  assert.match(text, /Too many price requests/);
  assert.doesNotMatch(text, /"low"|"high"|"parts"|count|ballparkPriceUse/);
  assert.equal(over.headers.get('Retry-After'), null, 'waiting does not help once the allowance is used');
});

test('quota: simultaneous requests for the last slot cannot both get a range', async () => {
  resetCaches();
  const slow = () => new Promise(resolve => setImmediate(resolve));   // let the requests interleave inside the database stand-in
  const g = google({ onCommit: slow });
  g.counts.set(RECEIPT, 59);
  const results = await Promise.all(Array.from({ length: 6 }, () => send(g)));
  const bodies = await Promise.all(results.map(r => r.text()));
  assert.equal(results.filter(r => r.status === 200).length, 1, 'exactly one request got slot 60');
  assert.equal(results.filter(r => r.status === 429).length, 5);
  assert.equal(bodies.filter(b => b.includes('"low"')).length, 1, 'no range leaked with a refusal');
  // At 58 two ranges go out, the third and later are refused.
  const h = google({ onCommit: slow });
  h.counts.set(RECEIPT, 57);
  const more = await Promise.all(Array.from({ length: 5 }, () => send(h, project, minute(5))));
  assert.equal(more.filter(r => r.status === 200).length, 3);
});

test('quota: if taking the slot fails the customer gets no range, nothing is counted, and the retry is counted once', async () => {
  resetCaches();
  let failLifetime = true;
  const g = google({ commitFor: body => failLifetime && isLifetimeCommit(body) ? 503 : 200 });
  const first = await send(g, project, minute(1));
  assert.equal(first.status, 503);
  assert.doesNotMatch(await first.text(), /"low"|"high"/);
  assert.equal(g.counts.get(RECEIPT), undefined);
  failLifetime = false;
  const retry = await send(g, project, minute(2));
  assert.equal(retry.status, 200);
  assert.equal(g.counts.get(RECEIPT), 1, 'one range given, one slot taken');
  const again = await send(g, project, minute(3));
  assert.equal(g.counts.get(RECEIPT), 2, 'each range handed out is counted, the retry did not get a free one');
  assert.equal(again.status, 200);
});

test('quota: the limit switched off writes no counters at all', async () => {
  resetCaches();
  const g = google();
  const res = await handle(new Request('https://example.test/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) }), { fetcher: g.fetcher, env: { ...ENV, GFS_PRICING_LIMIT: 'off' }, now: NOW });
  assert.equal(res.status, 200);
  assert.equal(g.commits.length, 0);
});
