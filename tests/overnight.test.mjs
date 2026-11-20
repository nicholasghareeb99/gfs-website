// Checks for the Nov 20 overnight audit work: schema, index control, town rules,
// related guides, image sitemap and the one-stylesheet build step.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROOT, read } from './helpers.mjs';

const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const types = (nodes) => nodes.flatMap((n) => (n['@graph'] || [n]).map((x) => x['@type']));

const SERVICE_PAGES = ['aluminum', 'cedar', 'chainlink', 'split-rail', 'vinyl', 'wood', 'no-dig', 'pet-fencing', 'replacement'];

test('fence pages carry a Service node tied to the business; the pool page does not', () => {
  for (const slug of SERVICE_PAGES) {
    const svc = ld(read(`public/fences/${slug}/index.html`)).find((n) => n['@type'] === 'Service');
    assert.ok(svc, slug);
    assert.equal(svc.provider['@id'], 'https://ghareebfence.com/#business');
    assert.equal(svc.url, `https://ghareebfence.com/fences/${slug}/`);
  }
  assert.ok(!types(ld(read('public/fences/pool-fencing/index.html'))).includes('Service'), 'GFS does not sell pool fence');
});

test('fence pages link to related guides that exist', () => {
  for (const slug of [...SERVICE_PAGES, 'pool-fencing']) {
    const html = read(`public/fences/${slug}/index.html`);
    const block = html.match(/data-gfs-sec="related-guides"[\s\S]*?<\/section>/);
    assert.ok(block, slug);
    for (const [, href] of block[0].matchAll(/href="(\/[^"]+)"/g)) assert.ok(fs.existsSync(`${ROOT}/public${href}index.html`), `${slug} -> ${href}`);
  }
});

test('town pages with checked rules show them and answer the height question in schema', () => {
  for (const town of ['toledo-oh', 'perrysburg-oh', 'oregon-oh', 'springfield-township-oh', 'monroe-mi', 'temperance-mi', 'lambertville-mi', 'maumee-oh']) {
    const html = read(`public/service-areas/${town}/index.html`);
    assert.match(html, /data-gfs-sec="fence-rules"[\s\S]*?confirm with the office/, town);
    const faq = ld(html).flatMap((n) => n['@graph'] || [n]).filter((n) => n['@type'] === 'FAQPage');
    assert.ok(faq.some((f) => f.mainEntity.some((q) => /fence (be|permit) in/.test(q.name))), town);
  }
});

test('index control: /p/ noindex by default, /x3d/ noindex header, /portal/ in sitemap', () => {
  assert.match(read('public/p/index.html'), /<meta name="robots" content="noindex">/);
  assert.match(read('netlify.toml'), /for = "\/x3d\/\*"\s+\[headers\.values\]\s+X-Robots-Tag = "noindex"/);
  assert.match(read('public/sitemap.xml'), /<loc>https:\/\/ghareebfence\.com\/portal\/<\/loc>/);
});

test('image sitemap is listed in robots.txt and every image exists', () => {
  assert.match(read('public/robots.txt'), /Sitemap: https:\/\/ghareebfence\.com\/sitemap-images\.xml/);
  const locs = [...read('public/sitemap-images.xml').matchAll(/<image:loc>https:\/\/ghareebfence\.com(\/[^<]+)<\/image:loc>/g)].map((m) => m[1]);
  assert.ok(locs.length > 50);
  for (const src of locs) assert.ok(fs.existsSync(`${ROOT}/public${src}`), src);
});

test('build fetches one stylesheet in the head of a fence page, in the original order', () => {
  if (!fs.existsSync(`${ROOT}/dist/fences/vinyl/index.html`)) return; // build not run in this checkout
  const built = fs.readFileSync(`${ROOT}/dist/fences/vinyl/index.html`, 'utf8');
  const head = built.slice(0, built.indexOf('</head>'));
  const sheets = [...head.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((m) => m[1]);
  assert.equal(sheets.length, 1);
  const css = fs.readFileSync(`${ROOT}/dist${sheets[0]}`, 'utf8');
  const order = [...css.matchAll(/^\/\* ([\w.-]+\.css) \*\/$/gm)].map((m) => m[1]);
  const source = read('public/fences/vinyl/index.html');
  const want = [...source.slice(0, source.indexOf('</head>')).matchAll(/<link rel="stylesheet" href="[^"]*\/([\w.-]+\.css)/g)].map((m) => m[1]);
  assert.deepEqual(order, want);
});
