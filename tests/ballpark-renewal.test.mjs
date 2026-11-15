// Returning customers: a pricing session issued by the function for a lead that is
// over a day old (see "Returning customers" in docs/BALLPARK-SERVER-PRICE.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { handle, resetCaches, mintSession, checkSession } from '../netlify/functions/ballpark-price.mjs';
import { fakeGoogle, priceFunctionEnv } from './helpers.mjs';

const PRICING = ['Galv Chain Link 4ft : 15 : 150 : 300', 'Ranch Rail : 12.5 : 100 : 200'].join('\n');
const A = 'web_renewrenewrenew01', B = 'web_renewrenewrenew02', BOOKING = 'web_renewrenewrenew03';
const HOUR = 3600e3, DAY = 24 * HOUR;
const MADE = 1_800_000_000_000;                 // when every lead below was written (database time)
const at = (ms) => Math.floor((MADE + ms) / 1000);
const ENV = priceFunctionEnv();
const part = (style, feet) => ({ style, feet, height: 4, singleGates: 0, doubleGates: 0 });
const project = { parts: [part('Galv Chain Link 4ft', 100)], removal: { on: false } };
const google = (o = {}) => fakeGoogle({ pricing: PRICING, receipts: [A, B], leadDoc: () => ({ createTime: new Date(MADE).toISOString(), fields: {} }), ...o });
const post = (g, body, now, env = ENV) => handle(new Request('https://example.test/x', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), { fetcher: g.fetcher, env, now });
const renew = (g, receipt, now, env) => post(g, { renew: true, receipt }, now, env);
const price = (g, receipt, session, now) => post(g, { receipt, ...(session ? { session } : {}), ...project }, now);
const sessionOf = async res => (await res.json()).session;
const fresh = () => { resetCaches(); return google(); };

test('renewal: a lead over a day old gets a session, and the unchanged project is priced with it', async () => {
  const g = fresh();
  const first = await (await price(g, A, null, at(5000))).json();
  assert.ok(first.low > 0, 'the first day');
  assert.equal((await price(g, A, null, at(25 * HOUR))).status, 403, 'a day later the receipt alone is refused');
  const res = await renew(g, A, at(25 * HOUR));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(Object.keys(body).sort(), ['expiresIn', 'session']);
  assert.equal(body.expiresIn, 86400);
  const again = await price(g, A, body.session, at(25 * HOUR + 1000));
  assert.equal(again.status, 200);
  const range = await again.json();
  assert.deepEqual({ low: range.low, high: range.high }, { low: first.low, high: first.high }, 'the same range as the first day');
  assert.equal(g.commits.flatMap(c => c.writes.map(w => w.update.name)).filter(n => !n.includes('/ballparkPriceUse/')).length, 0, 'nothing but counters is written');
});

test('renewal: the session carries no secret and ends within 24 hours', async () => {
  const g = fresh();
  const token = await sessionOf(await renew(g, A, at(25 * HOUR)));
  assert.match(token, /^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  assert.deepEqual(Object.keys(payload).sort(), ['e', 'i', 'n', 'r']);
  assert.equal(payload.r, A);
  assert.equal(payload.e - payload.i, 86400);
  const config = JSON.parse(Buffer.from(ENV.GFS_PRICING_SERVICE_ACCOUNT, 'base64').toString());
  assert.ok(!token.includes(config.private_key.slice(40, 60)));
  assert.equal((await price(g, A, token, at(25 * HOUR + 86399e3))).status, 200, 'the last second');
  const late = await price(g, A, token, at(25 * HOUR + 86400e3));
  assert.equal(late.status, 403);
  assert.deepEqual(await late.json(), { error: 'Session expired' });
});

test('renewal: forged, altered, truncated and borrowed sessions are refused', async () => {
  const g = fresh();
  const token = await sessionOf(await renew(g, A, at(25 * HOUR)));
  const [v, payload, mac] = token.split('.');
  const edit = fn => Buffer.from(JSON.stringify(fn(JSON.parse(Buffer.from(payload, 'base64url').toString())))).toString('base64url');
  const flip = m => m.slice(0, -1) + (m.endsWith('A') ? 'B' : 'A');
  const other = priceFunctionEnv();   // another key: what an outsider with a guessed format could make
  const cases = {
    'altered MAC': [v, payload, flip(mac)].join('.'),
    'longer expiry': [v, edit(d => ({ ...d, e: d.e + 86400 })), mac].join('.'),
    'another receipt inside': [v, edit(d => ({ ...d, r: B })), mac].join('.'),
    'no MAC': [v, payload, ''].join('.'),
    'truncated': token.slice(0, -10),
    'other version': ['v2', payload, mac].join('.'),
    'signed with another key': mintSession(JSON.parse(Buffer.from(other.GFS_PRICING_SERVICE_ACCOUNT, 'base64').toString()), A, at(25 * HOUR)),
    'text': 'let-me-in',
  };
  for (const [name, bad] of Object.entries(cases)) {
    const res = await price(g, A, bad, at(25 * HOUR + 1000));
    assert.ok([400, 403].includes(res.status), name + ' -> ' + res.status);
    assert.doesNotMatch(await res.text(), /"low"/, name);
  }
  // A session that lives longer than a day, even if signed, is not honoured.
  const config = JSON.parse(Buffer.from(ENV.GFS_PRICING_SERVICE_ACCOUNT, 'base64').toString());
  assert.equal(checkSession(config, token, A, at(25 * HOUR + 1000)), 'ok');
  assert.equal(checkSession(config, token, B, at(25 * HOUR + 1000)), 'invalid', 'a session for A is not good for B');
  const toB = await price(g, B, token, at(25 * HOUR + 1000));
  assert.equal(toB.status, 403);
  assert.deepEqual(await toB.json(), { error: 'Session not valid' });
});

test('renewal: a session is never accepted for a request that is not a lead, and needs the lead to still exist', async () => {
  const g = fresh();
  const token = await sessionOf(await renew(g, A, at(25 * HOUR)));
  const gone = google({ receipts: [B] });
  assert.equal((await price(gone, A, token, at(26 * HOUR))).status, 409, 'the lead document is checked every time');
});

test('renewal: only a website lead that exists can renew; a booking cannot', async () => {
  const g = google({ receipts: [A, BOOKING], leadDoc: id => id === BOOKING ? { createTime: new Date(MADE).toISOString(), fields: { date: { stringValue: '2027-01-20' }, time: { stringValue: '9am' } } } : { createTime: new Date(MADE).toISOString(), fields: {} } });
  resetCaches();
  assert.equal((await renew(g, BOOKING, at(25 * HOUR))).status, 403, 'shaped like a visit booking');
  const unknown = await renew(google({ receipts: [A] }), B, at(25 * HOUR));   // bookings live in their own collection, so a booking id is simply not found here
  assert.equal(unknown.status, 404);
  assert.equal(g.commits.length, 0, 'refused renewals count nothing');
  for (const bad of [{ renew: true }, { renew: true, receipt: 'nope' }, { renew: true, receipt: A, parts: [] }, { renew: true, receipt: A, session: 'v1.x.y' }, { renew: 1, receipt: A }, { renew: false, receipt: A }]) {
    assert.equal((await post(g, bad, at(25 * HOUR))).status, 400, JSON.stringify(bad));
  }
});

test('renewal: a lead beyond the horizon cannot renew', async () => {
  const g = fresh();
  assert.equal((await renew(g, A, at(179 * DAY))).status, 200);
  const old = await renew(g, A, at(181 * DAY));
  assert.equal(old.status, 403);
  assert.deepEqual(await old.json(), { error: 'Request too old to continue' });
  for (const doc of [{ fields: {} }, { createTime: 'garbage', fields: {} }, { createTime: new Date(MADE + 27 * HOUR).toISOString(), fields: {} }]) {
    resetCaches();
    assert.equal((await renew(google({ leadDoc: () => doc }), A, at(25 * HOUR))).status, 403, 'an unreadable or future time never renews');
  }
});

test('renewal: three per 24 hour block, twenty in all, five attempts a minute', async () => {
  const g = fresh();
  const t = at(25 * HOUR);
  for (let i = 0; i < 3; i++) assert.equal((await renew(g, A, t + i * 60)).status, 200, 'renewal ' + (i + 1));
  const fourth = await renew(g, A, t + 4 * 60);
  assert.equal(fourth.status, 429);
  assert.equal(fourth.headers.get('Retry-After'), null, 'waiting a minute does not help');
  assert.doesNotMatch(await fourth.text(), /session/);
  assert.equal((await renew(g, B, t)).status, 200, 'another receipt is unaffected');
  // The next 24 hour block of the lead's life starts fresh, until the twenty are used.
  let granted = 3;
  for (let day = 2; day <= 8; day++) for (let i = 0; i < 3; i++) if ((await renew(g, A, at(day * DAY + HOUR + i * 60))).status === 200) granted++;
  assert.equal(granted, 20, 'a hard cap of twenty for the receipt');
  assert.equal((await renew(g, A, at(9 * DAY))).status, 429);
  // Attempts per minute: the sixth request inside one minute is told when to come back.
  const m = fresh();
  const replies = [];
  for (let i = 0; i < 6; i++) replies.push(await renew(m, A, t + 5));
  assert.deepEqual(replies.map(r => r.status), [200, 200, 200, 429, 429, 429]);
  assert.deepEqual(replies.map(r => r.headers.get('Retry-After') !== null), [false, false, false, false, false, true]);
});

test('renewal: an outage uses none of the allowance, and a refused or failed slot is handed back', async () => {
  resetCaches();
  let fail = null;
  const g = google({ commitFor: body => fail && fail(body.writes[0].update.name) ? 503 : 200 });
  const t = at(25 * HOUR);
  fail = n => true;                                           // every counter write fails
  assert.equal((await renew(g, A, t)).status, 503);
  fail = n => n.endsWith('/' + A + '_rl');                    // the second slot fails after the first was taken
  assert.equal((await renew(g, A, t + 120)).status, 503);
  assert.equal(g.counts.get(A + '_rd1'), 0, 'the day slot was handed back');
  fail = null;
  for (let i = 0; i < 3; i++) assert.equal((await renew(g, A, t + 180 + i * 60)).status, 200, 'all three renewals are still available');
  assert.equal((await renew(g, A, t + 600)).status, 429);
  assert.equal(g.counts.get(A + '_rl'), 3, 'the lifetime count is the sessions actually issued');
  // The service down before any write: Google itself failing.
  const down = google({ commitStatus: 500 });
  assert.equal((await renew(down, A, t)).status, 503);
  const off = google({ commitStatus: 500 });
  assert.equal((await renew(off, A, t, { ...ENV, GFS_PRICING_LIMIT: 'off' })).status, 200, 'the limit switched off writes nothing');
  assert.equal(off.commits.length, 0);
});

test('renewal: priced ranges stay counted per original receipt, 60 per 24 hour block and 180 in all', async () => {
  const g = fresh();
  let token = await sessionOf(await renew(g, A, at(25 * HOUR)));
  let ok = 0, minuteStart = at(25 * HOUR + 600);
  for (let i = 0; i < 61; i++) if ((await price(g, A, token, minuteStart + i * 61)).status === 200) ok++;
  assert.equal(ok, 60, 'sixty in the block');
  const over = await price(g, A, token, minuteStart + 62 * 61);
  assert.equal(over.status, 429);
  assert.doesNotMatch(await over.text(), /"low"/);
  assert.equal(g.counts.get(A + '_d1'), 62, 'every refused request bumps only the day counter');
  assert.equal(g.counts.get(A), 60, 'a refused request leaves the lifetime count alone');
  // The next block (day 3 of the lead's life) is fresh for a customer who comes back; the first day is not forgotten.
  token = await sessionOf(await renew(g, A, at(2 * DAY + HOUR)));
  let more = 0;
  for (let i = 0; i < 70; i++) if ((await price(g, A, token, at(2 * DAY + 2 * HOUR + i * 61e3))).status === 200) more++;
  assert.equal(more, 60);
  token = await sessionOf(await renew(g, A, at(3 * DAY + HOUR)));
  let last = 0;
  for (let i = 0; i < 70; i++) if ((await price(g, A, token, at(3 * DAY + 2 * HOUR + i * 61e3))).status === 200) last++;
  assert.equal(last, 60);
  token = await sessionOf(await renew(g, A, at(4 * DAY + HOUR)));
  const spent = await price(g, A, token, at(4 * DAY + 2 * HOUR));
  assert.equal(spent.status, 429, 'the hard lifetime cap of 180 is reached');
  assert.equal(g.counts.get(A), 181);
  // Another receipt has its own allowance, and a session for A cannot be used on it.
  assert.equal((await price(g, B, null, at(5000))).status, 200);
});

test('renewal: a fresh receipt prices exactly as before, with or without a session', async () => {
  const g = fresh();
  const a = await (await price(g, A, null, at(5000))).json();
  const token = await sessionOf(await renew(g, A, at(6000)));
  const b = await (await price(g, A, token, at(7000))).json();
  assert.deepEqual(a, b);
  assert.deepEqual(Object.keys(b).sort(), ['high', 'low', 'parts']);
});
