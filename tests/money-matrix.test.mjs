import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import test from 'node:test';
import { handle, resetCaches } from '../netlify/functions/ballpark-price.mjs';
import { deliverIntake, intakeRecord } from '../netlify/functions/submission-created.mjs';
import { PRICING_CODE, SERVER_PRICE_CODE, run, slice } from './ballpark-slices.mjs';
import { declaredForms, fakeGoogle, loadLeads, priceFunctionEnv } from './helpers.mjs';
import { styles, lengths, factors, pricing } from './money-matrix-fixtures.mjs';

const env = priceFunctionEnv({ GFS_PRICING_LIMIT: 'off' });
const now = new Date('2026-11-19T16:00:00Z');
const customer = { name: 'Audit Customer', phone: '4195550142', email: 'audit@example.test', contactMethod: 'Text' };

function browser() {
  const { api } = run({}, `
    const FENCE_PRICING = {}, state = { sections: [], priceUnlocked: true };
    const range = {textContent:''};
    const el = id => id === 'bp-price-range' ? range : id === 'bp-price-card' ? {} : null;
    let pricesLive = true, styleCatalogSettled = true;
    function buildStyleEntry(name, perFoot, singleGate, doubleGate) { return { name, perFoot, singleGate, doubleGate }; }
    function saveDraft() {} function renderFinance() {} function renderComparePanel() {}
    function renderPostUnlockActions() {} function markComplete() {}
    function pricesUnavailable() { return false; }
    ${PRICING_CODE}
    ${SERVER_PRICE_CODE}
    ${slice('  function heightNeedsReview()', '  function quoteSubmitLabel')}
    ${slice('  function updateAllCore()', '  // ---- COMPARE MATERIALS PANEL')}
    globalThis.api = { state, PRICING_FACTORS, buildStylesFromExecPricing, slugify, serverPriceRequest, calculatePrice, updateAllCore, range };
  `);
  assert.equal(api.buildStylesFromExecPricing(pricing, {}), true);
  Object.assign(api.PRICING_FACTORS, factors);
  return api;
}

const declared = new Set(declaredForms()['gfs-ballpark']);
const asNetlify = fields => Object.fromEntries(Object.entries(fields).filter(([key]) => declared.has(key)));
const exactRange = (low, high) => '$' + low.toLocaleString('en-US') + ' – $' + high.toLocaleString('en-US');

test('fixture matrix crosses all styles, lengths, walk/drive counts and removal settings through pricing and lead delivery', async () => {
  resetCaches();
  const db = new Map();
  const google = fakeGoogle({ pricing, factors });
  const fetcher = async (url, options) => {
    const address = new URL(url);
    if (address.searchParams.has('documentId')) {
      db.set(address.searchParams.get('documentId'), JSON.parse(options.body).fields);
      return new Response(null, { status: 200 });
    }
    if (address.pathname.includes('/websiteLeads/')) {
      const fields = db.get(address.pathname.split('/').at(-1));
      return Response.json({ createTime: now.toISOString(), fields });
    }
    return google.fetcher(url, options);
  };
  const sendPrice = input => handle(new Request('http://localhost/price', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  }), { env, fetcher, now: now.getTime() / 1000 });
  const page = browser();
  const { leads, sent } = loadLeads({ pathname: '/quote/ballpark/' });
  const csv = ['style,height,linear_feet,walk_gates,drive_gates,removal,low_usd,high_usd,result'];
  for (const [style, height, panel, foot, walk, drive] of styles) {
    for (const feet of lengths) {
      for (const singleGates of [0, 1, 2]) for (const doubleGates of [0, 1, 2]) {
        for (const material of ['', 'wood', 'chain', 'vinyl', 'aluminum', 'other']) {
          const removal = material ? { on: true, material, feet } : { on: false };
          const parts = [{ style, height, feet, singleGates, doubleGates }];
          const label = JSON.stringify({ style, feet, singleGates, doubleGates, material });
          const billable = panel ? Math.ceil(feet / panel) * panel : feet;
          const removalPerFoot = { '': 0, wood: 5.5, chain: 3.25, vinyl: 6.75, aluminum: 6.75, other: 6.75 }[material];
          const subtotal = billable * foot + singleGates * walk + doubleGates * drive + feet * removalPerFoot;
          const low = Math.round(subtotal * 95 / 10000) * 100;
          const high = Math.round(subtotal * 105 / 10000) * 100;
          const priced = feet > 0 && low > 0;
          Object.assign(page.state, { fenceId: page.slugify(style), height: String(height), linearFeet: feet, singleGates, doubleGates,
            removeOldFence: Boolean(material), existingFenceMaterial: material });
          const local = page.calculatePrice();
          if (priced) {
            assert.deepEqual([local.low, local.high], [low, high], label);
            page.updateAllCore();
            assert.equal(page.range.textContent, exactRange(low, high), label);
          } else {
            assert.equal(local, null, label);
          }
          if (feet === 0) {
            assert.equal(page.serverPriceRequest(), null, label);
            const zero = await sendPrice({ receipt: 'web_zerolength123456789', parts, removal });
            assert.equal(zero.status, 400, label);
          } else {
            const input = page.serverPriceRequest();
            assert.deepEqual(JSON.parse(JSON.stringify({ parts: input.parts, removal: input.removal })), { parts, removal }, label);
            const source = 'ballpark-quote-tool';
            const siteNotes = singleGates === 2 ? ['Yard slopes'] : [];
            const lead = await leads.submit({ ...customer, ...parts[0], fenceStyle: style, linearFeet: feet,
              source, siteNotes, removeOldFence: removal.on, notes: removal.on ? 'Remove existing material: ' + material : '',
              pricingProject: JSON.stringify({ parts, removal }) });
            assert.ok(lead.ok, label);
            const fields = asNetlify(sent.pop().fields);
            const synced = await deliverIntake(fields, { env, fetcher, now });
            const saved = db.get(synced.id);
            const response = await sendPrice({ ...input, receipt: synced.id, saved: true });
            assert.equal(response.status, 200, label);
            const answer = await response.json();
            if (priced) {
              assert.deepEqual([answer.low, answer.high], [low, high], label);
              assert.deepEqual(answer.parts, [{ style, feet }], label);
              const range = exactRange(low, high);
              assert.ok(saved.notes.stringValue.startsWith('Ballpark planning range: ' + range), label);
              assert.ok(saved.meta.stringValue.includes('price_range_shown=' + encodeURIComponent(range)), label);
              assert.equal(saved.linearFeet.doubleValue, feet, label);
              assert.equal(saved.singleGates.doubleValue, singleGates, label);
              assert.equal(saved.doubleGates.doubleValue, doubleGates, label);
              assert.equal(saved.height.stringValue, String(height), label);
              assert.equal(saved.fenceStyle.stringValue, style, label);
              if (siteNotes.length) assert.match(saved.notes.stringValue, /Site notes: Yard slopes/, label);
              if (removal.on) assert.ok(saved.notes.stringValue.includes('Remove existing material: ' + material), label);

              const email = await leads.submit({ ...customer, contactMethod: 'Email', source: 'ballpark-email-estimate',
                parentReceipt: synced.id, fenceStyle: style, linearFeet: feet, height: String(height), singleGates, doubleGates, priceRange: range });
              assert.ok(email.ok, label);
              const { record } = intakeRecord(asNetlify(sent.pop().fields), now);
              assert.ok(record.notes.startsWith('Ballpark planning range: ' + range), label);
            } else {
              assert.deepEqual(answer, { needsQuote: true }, label);
              assert.doesNotMatch(saved.notes.stringValue, /Ballpark planning range/, label);
            }
            db.delete(synced.id);
          }
          csv.push([style, height, feet, singleGates, doubleGates, material || 'off', priced ? low : '', priced ? high : '', priced ? 'PASS - range' : feet ? 'PASS - office quote' : 'PASS - invalid length'].join(','));
        }
      }
    }
  }
  assert.equal(csv.length - 1, 12096);
  if (process.env.GFS_MATRIX_CSV) writeFileSync(process.env.GFS_MATRIX_CSV, csv.join('\n') + '\n');
});

test('the saved range survives a settings change and is returned only for the matching project', async () => {
  resetCaches();
  const [style, height] = styles[0];
  const parts = [{ style, height, feet: 150, singleGates: 1, doubleGates: 0 }];
  const removal = { on: false };
  const { leads, sent } = loadLeads({ pathname: '/quote/ballpark/' });
  await leads.submit({ ...customer, source: 'ballpark-quote-tool', fenceStyle: style, height: String(height),
    linearFeet: 150, singleGates: 1, pricingProject: JSON.stringify({ parts, removal }), notes: 'N'.repeat(2500) });
  let savedFields;
  const capture = async (url, options) => {
    if (new URL(url).searchParams.has('documentId')) {
      savedFields = JSON.parse(options.body).fields;
      return new Response(null, { status: 200 });
    }
    return fakeGoogle({ pricing, factors }).fetcher(url, options);
  };
  const { id } = await deliverIntake(asNetlify(sent[0].fields), { env, fetcher: capture, now });
  assert.match(savedFields.notes.stringValue, /^Ballpark planning range: \$4,600 – \$5,000/);
  assert.equal(savedFields.notes.stringValue.length, 2000);
  resetCaches();
  const repriced = fakeGoogle({ pricing: style + ' : 90 : 350 : 700', factors, receipts: [id], leadDoc: () => ({ fields: savedFields }) });
  let settingsUnavailable = false;
  const fetcher = (url, options) => settingsUnavailable && url.endsWith('settings/global')
    ? Promise.resolve(new Response(null, { status: 503 })) : repriced.fetcher(url, options);
  const ask = project => handle(new Request('http://localhost/price', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ receipt: id, saved: true, compare: true, parts, removal, ...project }) }),
    { fetcher, env, now: now.getTime() / 1000 });
  const answer = await (await ask()).json();
  assert.deepEqual([answer.low, answer.high], [4600, 5000]);
  assert.deepEqual(answer.comparisons, [{ style, low: 4600, high: 5000 }]);
  assert.deepEqual(await (await ask({ parts: [{ ...parts[0], singleGates: 2 }] })).json(), { needsQuote: true });
  resetCaches();
  settingsUnavailable = true;
  assert.deepEqual(await (await ask()).json(), answer, 'the published lead range survives a settings outage');
});

test('a lost Executive App response retries the identical receipt and body, and permanent failures surface', async () => {
  const { leads, sent } = loadLeads({ pathname: '/quote/ballpark/' });
  await leads.submit({ ...customer, fenceStyle: styles[0][0], source: 'ballpark-quote-tool', linearFeet: 150, height: '4', priceRange: '$4,600 – $5,000' });
  const attempts = [];
  const data = asNetlify(sent[0].fields);
  const options = { env, now, pause: async () => {}, async fetcher(url, request) {
    attempts.push([url, request.body]);
    if (attempts.length === 1) throw Error('lost response after write');
    return new Response(null, { status: 409 });
  } };
  assert.equal((await deliverIntake(data, options)).duplicate, true);
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0], attempts[1]);
  let failures = 0;
  await assert.rejects(deliverIntake(data, { ...options, fetcher: async () => {
    failures++;
    return new Response(null, { status: 503 });
  } }), /HTTP 503.*remains in Netlify Forms/);
  assert.equal(failures, 3);
});
