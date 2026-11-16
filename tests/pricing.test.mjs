// The server-side price function (netlify/pending/ballpark-price.mjs).
// It is not live yet; these tests pin its rules so it can be switched on
// later: every style at its own rate, no height multipliers, ranges only,
// and never a per-foot rate in the answer.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { handle, parsePricing, priceProject } from '../netlify/pending/ballpark-price.mjs';

const PRICING = [
  'Full Cedar Privacy 6ft : 40 : 300 : 600',
  'Galv Chain Link 4ft : 15 : 150 : 300',
  'Galv Chain Link 6ft : 19 : 160 : 320',
  'Kingston - White 6ft : 52 : 400 : 800',
].join('\n');
const RECEIPT = 'web_abcdefghijklmnop1234';

// A throwaway key so the function can sign its token request; no real account.
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
process.env.GFS_PRICING_SERVICE_ACCOUNT = Buffer.from(JSON.stringify({
  client_email: 'test@example.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
})).toString('base64');

function fakeGoogle() {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push(url);
    if (url.includes('oauth2')) return new Response(JSON.stringify({ access_token: 'token', expires_in: 3600 }));
    if (options.headers.Authorization !== 'Bearer token') return new Response('', { status: 403 });
    if (url.endsWith('settings/global')) {
      return new Response(JSON.stringify({ fields: {
        pricing: { stringValue: PRICING }, remWood: { integerValue: '5' }, remChain: { integerValue: '3' }, remOther: { integerValue: '6' },
      } }));
    }
    const lead = decodeURIComponent(url.split('websiteLeads/')[1] || '');
    return new Response('{}', { status: lead === RECEIPT ? 200 : 404 });
  };
  return { calls, fetcher };
}
const ask = (body, google = fakeGoogle()) => handle(
  new Request('https://example.test/.netlify/functions/ballpark-price', { method: 'POST', body: JSON.stringify(body) }),
  { fetcher: google.fetcher, project: 'test-project' },
);
const project = {
  receipt: RECEIPT,
  parts: [
    { style: 'Full Cedar Privacy 6ft', feet: 140, singleGates: 2, doubleGates: 0 },
    { style: 'Galv Chain Link 4ft', feet: 80, singleGates: 0, doubleGates: 1 },
  ],
  removal: { on: true, material: 'wood' },
};

test('the price list parses into one entry per style', () => {
  const styles = parsePricing(PRICING);
  assert.equal(styles.size, 4);
  assert.equal(styles.get('kingston - white 6ft').name, 'Kingston - White 6ft');
});

test('a two-style project adds up: own rate per style, gates, removal', async () => {
  const response = await ask(project);
  assert.equal(response.status, 200);
  const answer = await response.json();
  // Cedar: 140 ft rounds up to 144 ft of 8 ft sections x 40 = 5,760, plus two walk gates 600.
  // Chain link: 80 ft x 15 = 1,200, plus one drive gate 300. Removal: 220 ft x 5 = 1,100.
  assert.equal(answer.total, 8960);
  assert.ok(answer.low < answer.total && answer.total < answer.high);
});

test('the answer never carries a per-foot or per-gate rate', async () => {
  const text = await (await ask({ ...project, compare: true })).text();
  assert.doesNotMatch(text, /perFoot|singleGate|doubleGate|"rate"/);
});

test('the same style costs the same at any chosen height (no height multiplier)', () => {
  const styles = parsePricing(PRICING);
  const factors = { remWood: 5, remChain: 3, remOther: 6 };
  const at = height => priceProject(styles, factors, {
    parts: [{ style: 'Full Cedar Privacy 6ft', feet: 96, height, singleGates: 0, doubleGates: 0 }], removal: { on: false },
  }).total;
  assert.equal(at('4'), 3840); // 96 ft x 40
  assert.equal(at('4'), at('8'));
});

test('a price is only given for a request the office already has', async () => {
  assert.equal((await ask({ ...project, receipt: 'web_zzzzzzzzzzzzzzzz9999' })).status, 409);
});

test('bad or oversized input is refused', async () => {
  assert.equal((await ask({ receipt: 'bad', parts: [] })).status, 400);
  assert.equal((await ask({ ...project, parts: [{ style: 'Galv Chain Link 4ft', feet: 2500 }] })).status, 400);
});

test('a style missing from the price list asks for a quote instead of guessing', async () => {
  const answer = await (await ask({ ...project, parts: [{ style: 'Not On The List', feet: 10 }] })).json();
  assert.deepEqual(answer, { needsQuote: true });
});
