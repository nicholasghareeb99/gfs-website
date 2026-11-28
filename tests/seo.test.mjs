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
    wood: [/8-ft galvanized steel posts 4 ft into the ground/, /compression brace or a welded steel frame/],
    cedar: [/Western Red Cedar/, /Northern White Cedar/],
    vinyl: [/Sections are 8 ft wide/, /reinforced with aluminum/],
    chainlink: [/up to 6 ft tall/, /top rail is standard/],
    'split-rail': [/Northern White Cedar/, /welded wire/],
    aluminum: [/flat-top and spear-top/],
  };
  for (const [k, res] of Object.entries(must)) {
    const intro = read(`fences/${k}/index.html`).match(new RegExp(`data-editable="fence\\.v2\\.${k}\\.intro\\.nov(?:18|27)"[^>]*>(.*?)</p>`, 's'))[1];
    for (const re of res) assert.match(intro, re, k);
    assert.doesNotMatch(intro, /locust|wrought iron|composite|lifetime/i, k);
  }
});

test('no personal email address anywhere in the public site', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(new URL(e.name + '/', d)) : /\.(html|js|txt|json|xml)$/.test(e.name) ? [new URL(e.name, d)] : []);
  for (const f of walk(new URL('../public/', import.meta.url))) {
    assert.ok(!/@gmail\.com/i.test(fs.readFileSync(f, 'utf8').replace(/you@gmail\.com|name@gmail\.com/gi, '')), f.pathname);
  }
});

test('share titles match page titles; header financing button goes to the financing page', () => {
  for (const p of ['index.html', 'fences/wood/index.html', 'process/index.html', 'guides/fence-care/index.html']) {
    const h = read(p);
    assert.equal(h.match(/property="og:title" content="([^"]*)"/)[1], h.match(/<title>(.*?)<\/title>/)[1].trim(), p);
    assert.match(h, /<a href="\/financing\/" class="btn btn-financing btn-sm" id="nav-fin">/, p);
  }
});

test('business schema carries map location and profile links', () => {
  const biz = ld(home).find((n) => n['@id'] === 'https://ghareebfence.com/#business');
  assert.ok(biz.geo && biz.geo.latitude > 41 && biz.geo.longitude < -83);
  assert.ok(biz.sameAs.length >= 4);
});

test('every city page links to five nearby city pages that exist', () => {
  const towns = fs.readdirSync(new URL('../public/service-areas/', import.meta.url)).filter((d) => d !== 'index.html');
  for (const t of towns) {
    const h = read(`service-areas/${t}/index.html`);
    const block = h.slice(h.indexOf('<!-- NEARBY AREAS -->'), h.indexOf('<footer class="footer">'));
    const links = [...block.matchAll(/href="\/service-areas\/([a-z-]+)\/"/g)].map((m) => m[1]);
    assert.equal(links.length, 5, t);
    for (const l of links) { assert.ok(towns.includes(l), l); assert.notEqual(l, t); }
  }
});

test('the public contact card has explicit opening days and a tappable text link', () => {
  const contact = read('contact/index.html');
  for (const page of [contact, read('brochure/read/index.html')]) {
    assert.match(page, /href="sms:\+14192142107"[^>]*>[^<]*Text/i);
  }
  assert.match(contact, /data-editable="contact\.aside\.hours">Mon–Sat · 8am – 6pm · Closed Sunday</);
});

test('the published site edits use the current business email', () => {
  const edits = JSON.parse(read('site-edits.json'));
  const vinylPicket = JSON.parse(edits['gfs_edit_content_fences-vinyl-picket']);
  assert.equal(vinylPicket['120'], 'nick@ghareebfence.com');
});

test('the fallback visit windows end at 6 pm in the markup and script', () => {
  assert.match(read('quote/book/index.html'), /Evening \(5 &ndash; 6 pm\)/);
  assert.match(read('assets/js/availability.js'), /Evening \(5 - 6 pm\)/);
});

for (const [city, permit] of [
  ['rossford-oh', 'https://www.rossfordohio.com/departments/zoning/permits.php'],
  ['grosse-ile-township-mi', 'https://www.grosseile.com/government/community_development/building_and_permits.php'],
  ['woodhaven-mi', 'https://cms5.revize.com/revize/woodhavenmi/FENCE%20PERMIT%20APP.pdf'],
]) {
  test(city + ' links to the current municipality permit resource', () => {
    const cityPage = read('service-areas/' + city + '/index.html');
    assert.ok(cityPage.includes('href="' + permit + '"'), city);
  });
}
