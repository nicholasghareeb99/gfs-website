import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {handle, parsePricing, priceProject, projectAmount, readFactors, resetCaches, supportedStyleHeight} from '../netlify/functions/ballpark-price.mjs';
import {captureQuoteCore} from '../scripts/capture-ballpark-quote-core.mjs';
import {fakeGoogle, priceFunctionEnv} from './helpers.mjs';

const snapshot = JSON.parse(readFileSync(new URL('./fixtures/ballpark-quote-core.json', import.meta.url), 'utf8'));

test('website stays cent-exact with quote-core for the shared ballpark matrix', async () => {
  const reference = process.env.GFS_APP_CHECKOUT ? await captureQuoteCore(process.env.GFS_APP_CHECKOUT) : snapshot;
  const {priceList, sections, settings, cases, centsByStyle} = reference;
  const catalog = parsePricing(priceList.join('\n'));
  const factors = readFactors(settings, sections);
  assert.deepEqual(readFactors({...settings, ...sections}), factors);
  let changes = 0;
  const examples = [];
  for (const [style, expected] of Object.entries(centsByStyle)) {
    for (const [index, [feet, singleGates, doubleGates, material]] of cases.entries()) {
      const request = {
        parts: [{style, feet, singleGates, doubleGates, height: supportedStyleHeight(style) ?? 6}],
        removal: {on: Boolean(material), material, feet},
      };
      const amount = projectAmount(catalog, factors, request);
      const want = expected[index] / 100;
      if (amount === want) continue;
      changes++;
      if (examples.length < 12) examples.push(
        `${style} | ${feet} ft, ${singleGates} walk, ${doubleGates} drive, ${material || 'no'} removal | app $${want}, website ${amount == null ? 'unavailable' : '$' + amount}`,
      );
    }
  }
  if (changes) assert.fail([`${changes} website prices differ from quote-core ${reference.source}`, ...examples].join('\n'));
});

test('server and comparisons read stored material spacing, with explicit style category taking precedence', async () => {
  resetCaches();
  const materialStyle = 'Kingston White 6ft', mapped = 'Test Style 6ft';
  const pricing = [materialStyle + ' : 30 : 100 : 200', mapped + ' : 30 : 100 : 200'].join('\n');
  const receipt = 'web_paritysectiontest2026';
  const google = fakeGoogle({pricing, receipts: [receipt]});
  const env = priceFunctionEnv();
  const fetcher = (url, options) => {
    if (url.endsWith('/settings/materials')) return Response.json({fields: {
      vinyl: {mapValue: {fields: {postSpacing: {integerValue: '7'}}}},
      chainlink: {mapValue: {fields: {postSpacing: {doubleValue: 9.5}}}},
    }});
    if (url.endsWith('/settings/styleMaterialMap')) return Response.json({fields: {[mapped]: {stringValue: 'chainlink'}}});
    return google.fetcher(url, options);
  };
  const input = {receipt, parts: [{style: materialStyle, feet: 36, height: 6, singleGates: 0, doubleGates: 0}], compare: true};
  const request = new Request('https://example.test/price', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(input)});
  const response = await handle(request, {fetcher, env});
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    low: 1200, high: 1300, parts: [{style: materialStyle, feet: 36}],
    comparisons: [{style: mapped, low: 1100, high: 1200}, {style: materialStyle, low: 1200, high: 1300}],
  });
});

test('mixed styles round each fence and gate line before adding full-length removal', () => {
  const catalog = parsePricing('Test Wood 6ft : 14.007 : 71.125 : 127.125\nTest Wire 6ft : 11.115 : 45.125 : 99.125');
  const request = {
    parts: [
      {style: 'Test Wood 6ft', feet: 37.25, height: 6, singleGates: 1, doubleGates: 0},
      {style: 'Test Wire 6ft', feet: 21, height: 6, singleGates: 0, doubleGates: 1},
    ],
    removal: {on: true, material: 'wood', feet: 58.25},
  };
  const factors = readFactors({remWood: 2.37});
  // 560.28 + 71.13 + 233.42 + 99.13 + 138.05.
  assert.equal(projectAmount(catalog, factors, request), 1102.01);
  assert.deepEqual(priceProject(catalog, factors, request), {total: 1102, low: 1000, high: 1200});
});
