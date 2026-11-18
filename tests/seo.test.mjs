import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../public/${p}`, import.meta.url), 'utf8');
const ld = (html) => [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1].replaceAll('<\\/', '</')));
const home = read('index.html');

test('home title and description name the trade and the city, within length', () => {
  const title = home.match(/<title>(.*?)<\/title>/)[1];
  const desc = home.match(/<meta name="description" content="([^"]*)"/)[1];
  assert.match(title, /Fence Company in Toledo, OH/);
  assert.ok(title.length <= 60 && desc.length <= 160);
  assert.match(desc, /Toledo/);
});

test('home business schema lists services, every service-area page, and a WebSite node', () => {
  const nodes = ld(home);
  const biz = nodes.find((n) => n['@id'] === 'https://ghareebfence.com/#business');
  const towns = fs.readdirSync(new URL('../public/service-areas/', import.meta.url)).filter((d) => d !== 'index.html');
  assert.equal(biz.areaServed.length, towns.length);
  assert.ok(biz.hasOfferCatalog.itemListElement.length >= 6);
  assert.equal(biz.telephone, '+1-419-214-2107');
  assert.ok(!('aggregateRating' in biz));
  assert.ok(nodes.some((n) => n['@type'] === 'WebSite'));
});

test('every question the home page shows is also in its FAQ schema', () => {
  const faq = ld(home).find((n) => n['@type'] === 'FAQPage');
  const shown = [...home.matchAll(/<summary[^>]*>([^<]*\?)<\/summary>/g)].map((m) => m[1]);
  assert.ok(shown.length >= 6);
  assert.deepEqual(faq.mainEntity.map((q) => q.name), shown);
  for (const q of faq.mainEntity) assert.ok(home.includes(q.acceptedAnswer.text.slice(0, 40)));
});

test('financing and FAQ pages carry FAQ schema that states the catch', () => {
  for (const p of ['financing/index.html', 'faq/index.html']) {
    const faq = ld(read(p)).find((n) => n['@type'] === 'FAQPage');
    assert.ok(faq && faq.mainEntity.length >= 4, p);
    const text = JSON.stringify(faq);
    if (/no interest/i.test(text)) assert.match(text, /balance is left after 18 months/);
  }
});

test('all JSON-LD on every page parses', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(new URL(e.name + '/', d)) : e.name === 'index.html' ? [new URL(e.name, d)] : []);
  for (const f of walk(new URL('../public/', import.meta.url))) {
    assert.doesNotThrow(() => ld(fs.readFileSync(f, 'utf8')), f.pathname);
  }
});

test('sitemap lists the three comparison guides; llms.txt states the financing terms', () => {
  const sm = read('sitemap.xml');
  for (const g of ['wood-vs-vinyl', 'no-dig-vs-concrete', 'open-style-fences']) assert.ok(sm.includes(`/guides/${g}/</loc>`), g);
  const llms = read('llms.txt');
  assert.match(llms, /paid in full within 18 months/);
  assert.match(llms, /balance is left after 18 months/);
});

test('style page intros state real build specs, and never products we do not sell', () => {
  const must = {
    wood: [/8-ft galvanized steel posts 4 ft into the ground/, /welded steel frames/],
    cedar: [/Western Red Cedar/, /Northern White Cedar/],
    vinyl: [/Sections are 8 ft wide/, /reinforced with aluminum/],
    chainlink: [/up to 6 ft tall/, /top rail is standard/],
    'split-rail': [/Northern White Cedar/, /welded wire/],
    aluminum: [/flat-top and spear-top/],
  };
  for (const [k, res] of Object.entries(must)) {
    const intro = read(`fences/${k}/index.html`).match(new RegExp(`data-editable="fence\\.v2\\.${k}\\.intro\\.nov18"[^>]*>(.*?)</p>`, 's'))[1];
    for (const re of res) assert.match(intro, re, k);
    assert.doesNotMatch(intro, /locust|wrought iron|composite|lifetime/i, k);
  }
});
