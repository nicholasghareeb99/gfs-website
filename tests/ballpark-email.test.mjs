import assert from 'node:assert/strict';
import test from 'node:test';
import { handle, sendWithEmailJS } from '../netlify/functions/ballpark-email.mjs';
import { deliverIntake, firestoreFields, intakeRecord } from '../netlify/functions/submission-created.mjs';
import { declaredForms, fakeGoogle, loadLeads, priceFunctionEnv } from './helpers.mjs';

const URL = 'https://ghareebfence.com/.netlify/functions/ballpark-email';
const NOW = 1795000000;
const TIME = new Date(NOW * 1000);
const ENV = priceFunctionEnv({
  GFS_ESTIMATE_EMAIL_ENABLED: 'true',
  GFS_ESTIMATE_EMAILJS_SERVICE_ID: 'test-service',
  GFS_ESTIMATE_EMAILJS_TEMPLATE_ID: 'test-template',
  GFS_ESTIMATE_EMAILJS_PUBLIC_KEY: 'test-public-key',
  GFS_ESTIMATE_EMAILJS_PRIVATE_KEY: 'test-private-key',
});
const PARTS = [
  { style: 'Aluminum Pool Fence 4ft', feet: 101, height: 4, singleGates: 1, doubleGates: 0 },
  { style: 'Cedar Privacy', feet: 50, height: 6, singleGates: 0, doubleGates: 1 },
];
const PRICING_PROJECT = JSON.stringify({
  parts: PARTS, removal: { on: true, material: 'wood', feet: 151 },
});
const CUSTOMER = {
  name: 'Pat Example', phone: '4195550100', email: 'Pat@example.test',
  contactMethod: 'Email', fenceStyle: PARTS[0].style, linearFeet: 151, height: 4,
  singleGates: 1, doubleGates: 1, priceRange: '$6,600 – $7,300',
  pricingProject: PRICING_PROJECT, timeline: 'Within 1 month', siteNotes: ['Yard slopes'],
  source: 'ballpark-email-estimate', parentReceipt: 'web_original000000000001', estimateEmailOptIn: true,
};
const DOCUMENT = id => 'web_estimate0000000000' + id;

async function postedFollowUp(overrides = {}) {
  const { leads, sent } = loadLeads({ pathname: '/quote/ballpark/' });
  const receipt = await leads.submit({ ...CUSTOMER, ...overrides });
  assert.equal(receipt.ok, true);
  const declared = declaredForms()['gfs-ballpark'];
  return { receipt: receipt.id, data: Object.fromEntries(Object.entries(sent[0].fields).filter(([key]) => declared.includes(key))) };
}

function asSavedDocument(data) {
  return { createTime: TIME.toISOString(), fields: firestoreFields(intakeRecord(data, TIME).record) };
}

function world(documents, { providerAccepted = true, leadDelay = 0, commitStatus = 200 } = {}) {
  const sent = [];
  const published = {
    styleNames: { arrayValue: { values: [{ stringValue: PARTS[0].style }] } },
    pricing: { stringValue: PARTS[1].style + ' : 40 : 300 : 600' },
  };
  const google = fakeGoogle({
    receipts: Object.keys(documents), leadDoc: id => documents[id], leadDelay, commitStatus,
  });
  const fetcher = (url, options) => url.endsWith('/settings/public')
    ? new Response(JSON.stringify({ fields: published })) : google.fetcher(url, options);
  const ask = (receipt, { ip = '192.0.2.8', env = ENV, optIn = true, origin = 'https://ghareebfence.com', ...extra } = {}) =>
    handle(new Request(URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
      body: JSON.stringify({ receipt, optIn, ...extra }),
    }), {
      ip, env, now: NOW, fetcher,
      sender: async ({ params }) => { sent.push(params); return providerAccepted; },
    });
  return { ask, sent, counts: google.counts };
}

test('explicit opt-in keeps the office intake and sends the same estimate, options and PDF', async () => {
  const { receipt, data } = await postedFollowUp();
  const docs = {};
  assert.equal(data.estimate_email_opt_in, 'yes');
  assert.match(data.summary, /\$6,600 – \$7,300/);
  const synced = await deliverIntake(data, { project: 'test-project', now: TIME, fetcher: async (url, options) => {
    assert.match(url, /websiteLeads\?documentId=/);
    docs[receipt] = { createTime: TIME.toISOString(), ...JSON.parse(options.body) };
    return new Response(null, { status: 201 });
  } });
  assert.deepEqual(synced, { id: receipt, duplicate: false });

  const w = world(docs);
  assert.equal((await w.ask(receipt)).status, 202);
  const [mail] = w.sent;
  assert.equal(mail.to_email, 'pat@example.test');
  assert.equal(mail.reply_to, 'nick@ghareebfence.com');
  assert.match(mail.subject, /ballpark estimate/);
  for (const text of [
    '$6,600 – $7,300', 'Total fence length: 151 ft', 'Aluminum Pool Fence 4ft: 101 ft long, 4 ft tall',
    'Cedar Privacy: 50 ft long, 6 ft tall', 'Walk gates (4 ft): 1', 'Drive gates (10 ft): 1',
    'Existing fence removal: Wood, 151 ft', 'Yard notes: Yard slopes', 'Within 1 month',
    '(419) 214-2107', 'nick@ghareebfence.com', '5242 Tractor Rd Suite C, Toledo, OH 43612',
    'Mon–Sat 8 AM–6 PM, closed Sunday', 'one-time email because you asked',
  ]) assert.ok(mail.message.includes(text), text);
  assert.doesNotMatch(mail.message, /unsubscribe/i);
  const pdf = Buffer.from(mail.estimate_pdf, 'base64').toString('latin1');
  assert.match(pdf, /^%PDF-/);
  assert.match(pdf, /\$6,600.{1,6}\$7,300/);
  assert.match(pdf, /Aluminum Pool Fence 4ft/);
  assert.ok(mail.estimate_pdf.length < 50000);
});

test('no consent, no price, invalid recipient, and unpublished styles never reach the sender', async () => {
  const { receipt, data } = await postedFollowUp();
  const unrequested = await postedFollowUp({ estimateEmailOptIn: false });
  const records = {
    [receipt]: asSavedDocument(data),
    [unrequested.receipt]: asSavedDocument({
      ...unrequested.data, meta: unrequested.data.meta + ' | estimate_email_opt_in=yes',
    }),
    [DOCUMENT(1)]: asSavedDocument({ ...data, email: 'bad..address@example.test' }),
    [DOCUMENT(2)]: asSavedDocument({ ...data, price_range_shown: '' }),
    [DOCUMENT(3)]: asSavedDocument({ ...data, source: 'ballpark-quote-tool' }),
    [DOCUMENT(4)]: asSavedDocument({ ...data, pricing_project: PRICING_PROJECT.replace(PARTS[0].style, 'Unpublished style') }),
  };
  const w = world(records);
  assert.equal((await w.ask(receipt, { optIn: 'true' })).status, 400);
  assert.equal((await w.ask(receipt, { origin: 'https://another.example.test' })).status, 403);
  assert.equal((await w.ask(receipt, { env: { ...ENV, GFS_ESTIMATE_EMAIL_ENABLED: '' } })).status, 503);
  assert.equal((await w.ask(receipt, { env: { ...ENV, GFS_ESTIMATE_EMAILJS_PRIVATE_KEY: '' } })).status, 503);
  assert.equal((await w.ask(receipt, { ip: '', forwardedIp: '192.0.2.2' })).status, 503);
  for (const record of Object.keys(records).filter(id => id !== receipt)) {
    assert.equal((await w.ask(record)).status, 403, record);
  }
  assert.equal(w.sent.length, 0);
  assert.equal(w.counts.size, 0);
});

test('only one send is attempted for a receipt after intake sync, even if the provider rejects it', async () => {
  const { receipt, data } = await postedFollowUp();
  const w = world({ [receipt]: asSavedDocument(data) }, { leadDelay: 1, providerAccepted: false });
  assert.equal((await w.ask(receipt)).status, 409);
  const statuses = await Promise.all([w.ask(receipt), w.ask(receipt)]);
  assert.deepEqual(statuses.map(response => response.status).sort(), [429, 502]);
  assert.equal(w.sent.length, 1);
});

test('rate limits apply to a recipient across IPs and to an IP across recipients', async () => {
  const { data } = await postedFollowUp();
  const docs = Object.fromEntries(Array.from({ length: 15 }, (_, index) => [
    DOCUMENT(index), asSavedDocument({ ...data, email: index < 4 ? 'PAT@EXAMPLE.TEST' : 'pat' + index + '@example.test' }),
  ]));
  const w = world(docs);
  const email = await Promise.all(Array.from({ length: 4 }, (_, index) => w.ask(DOCUMENT(index), { ip: '192.0.2.' + (index + 20) })));
  assert.deepEqual(email.map(response => response.status).sort(), [202, 202, 202, 429]);
  const ip = await Promise.all(Array.from({ length: 11 }, (_, index) => w.ask(DOCUMENT(index + 4), { ip: '192.0.2.42' })));
  assert.deepEqual(ip.map(response => response.status).sort(), [...Array(10).fill(202), 429]);
  assert.equal(w.sent.length, 13);
  const counters = [...w.counts.keys()].join(' ');
  assert.doesNotMatch(counters, /192\.0\.2|example\.test/);
});

test('a quota write failure holds the send', async () => {
  const { receipt, data } = await postedFollowUp();
  const w = world({ [receipt]: asSavedDocument(data) }, { commitStatus: 503 });
  assert.equal((await w.ask(receipt)).status, 503);
  assert.deepEqual(w.sent, []);
});

test('the EmailJS adapter uses the server credential and a fixed endpoint', async () => {
  const params = { to_email: 'mock@example.test', estimate_pdf: 'mock-pdf' };
  const config = { service: 'service', template: 'template', publicKey: 'public', privateKey: 'private' };
  assert.equal(await sendWithEmailJS({
    config, params, fetcher: async (url, options) => {
      assert.equal(url, 'https://api.emailjs.com/api/v1.0/email/send');
      assert.equal(options.method, 'POST');
      assert.deepEqual(JSON.parse(options.body), {
        service_id: 'service', template_id: 'template', user_id: 'public', accessToken: 'private', template_params: params,
      });
      return new Response('OK');
    },
  }), true);
});
