import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export async function captureQuoteCore(appDirectory) {
  const app = pathToFileURL(resolve(appDirectory) + '/');
  const {createQuoteCore} = await import(new URL('gfs/quote-core/index.mjs', app));
  const {inputs, materialMap, option, styles, syntheticPricing} = await import(new URL('tests/helpers/price-safety-matrix.mjs', app));
  const pricing = syntheticPricing();
  const core = createQuoteCore({getPricing: () => pricing});
  const cases = Array.from(inputs()).filter(({scenario}) => scenario.name === 'plain' || (scenario.removal && !scenario.adjustments));
  const centsByStyle = Object.fromEntries(styles.map(style => [style, cases.map(input => {
    const {total} = core.priceOption({data: {opt1: option(style, input)}}, 1);
    const cents = Math.round(total * 100);
    assert.ok(Number.isSafeInteger(cents) && cents / 100 === total, style + ' must have a cent-exact option total');
    return cents;
  })]));
  const {pricing: priceList, materials, remWood, remChain, remOther} = pricing.settings;
  return {
    source: execFileSync('git', ['rev-parse', 'HEAD'], {cwd: appDirectory, encoding: 'utf8'}).trim(),
    priceList: priceList.split('\n'),
    settings: {remWood, remChain, remOther},
    sections: {materials, styleMaterialMap: materialMap},
    cases: cases.map(({feet, single, double, scenario}) => [feet, single, double, scenario.removal || '']),
    centsByStyle,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) throw Error('Pass the path to a local gfence-app checkout.');
  const {centsByStyle, ...header} = await captureQuoteCore(process.argv[2]);
  const start = JSON.stringify(header, null, 2).slice(0, -2);
  const rows = Object.entries(centsByStyle).map(([style, cents]) => '    ' + JSON.stringify(style) + ': ' + JSON.stringify(cents));
  process.stdout.write(start + ',\n  "centsByStyle": {\n' + rows.join(',\n') + '\n  }\n}\n');
}
