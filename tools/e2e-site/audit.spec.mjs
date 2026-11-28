import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BASE, DIST, SITE_HOSTS, localURL } from './server.mjs';
import { mockSite } from './mocks.mjs';
import { press } from './actions.mjs';

// The crawl attaches a compact JSON report and keeps screenshots on failures.
test.use({ trace: 'off' });

const PHONE = '4192142107';
const EMAIL = 'nick@ghareebfence.com';
const STALE_ADDRESS = /(?:3823\s+Bowen|2910\s+N\.?\s+109th)/i;
// Compare only the hash of normalized digits so the private number stays out of this test.
const PRIVATE_PHONE_HASH = '83eb386c7d425392deb845d9efbac612d3f2c3d9a667d1f36c36ff1c59d4ade7';

function hasStaleFacts(text) {
  if (STALE_ADDRESS.test(text)) return true;
  for (const [candidate] of text.matchAll(/(?<!\d)(?:\+?1[\s.()/_·–—-]*)?\(?[2-9]\d{2}[\s.()/_·–—-]*\d{3}[\s.()/_·–—-]*\d{4}(?!\d)/g)) {
    const digits = candidate.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if (createHash('sha256').update(digits).digest('hex') === PRIVATE_PHONE_HASH) return true;
  }
  return false;
}
const adCopy = /built straight, built honest|premier (?:fence|fencing)|top[- ]notch|unmatched quality|transform your (?:yard|outdoor)|dream (?:yard|backyard)|elevate your|your trusted (?:fence|partner)|second to none|don't settle for less/i;

async function inspect(page) {
  return page.evaluate(pattern => {
    const visible = element => {
      const style = getComputedStyle(element);
      const { width, height } = element.getBoundingClientRect();
      return width > 0 && height > 0 && style.visibility === 'visible' && !element.closest('[inert],[aria-hidden=true]');
    };
    const describe = element => (element.getAttribute('aria-label') || element.labels?.[0]?.textContent
      || element.textContent || element.name || element.id).trim().replace(/\s+/g, ' ').slice(0, 130);
    const tapTargets = [];
    const clipped = [];
    const controls = 'button,[role=button],a.btn,a[href^=tel],a[href^=sms],input:not([type=hidden]):not([type=radio]):not([type=checkbox]),select,textarea,summary';
    for (const element of document.querySelectorAll(controls)) {
      if (!visible(element) || element.disabled) continue;
      const { width, height } = element.getBoundingClientRect();
      if (width < 43.5 || height < 43.5) tapTargets.push([describe(element), Math.round(width), Math.round(height)]);
      const style = getComputedStyle(element);
      if (element.clientWidth && element.scrollWidth > element.clientWidth + 3 && /hidden|clip/.test(style.overflowX)
        && element.matches('a,button,summary')) clipped.push(describe(element));
    }
    const formFields = [...document.querySelectorAll('form input,form select,form textarea')]
      .filter(visible).map(element => ({
        name: element.name, type: element.type, label: Boolean(element.labels?.length || element.getAttribute('aria-label')),
        autocomplete: element.getAttribute('autocomplete'),
      }));
    const links = [...document.querySelectorAll('a[href]')].map(element => element.href);
    const imgs = [...document.images].flatMap(element => {
      const candidates = element.getAttribute('srcset')?.split(',').map(candidate => candidate.trim().split(/\s+/)[0]) || [];
      return [element.currentSrc, element.getAttribute('src'), ...candidates].filter(Boolean).map(value => new URL(value, location.href).href);
    });
    const nodes = [...document.querySelectorAll('script[type="application/ld+json"]')].map(script => JSON.parse(script.textContent));
    const founded = [...document.querySelectorAll('main p,main li')]
      .map(element => element.innerText).filter(text => text && /\bfounded\b/i.test(text));
    const copy = [...document.querySelectorAll('main h1,main h2,main h3,main p,footer p')]
      .map(element => element.innerText?.trim()).filter(text => text && new RegExp(pattern, 'i').test(text))
      .map(text => text.slice(0, 230));
    return {
      links, imgs, nodes, founded, copy, tapTargets, clipped, formFields,
      visibleText: document.body.innerText,
      main: document.querySelector('main')?.innerText || '',
      hasFooter: Boolean(document.querySelector('footer.footer')),
      logo: [...document.querySelectorAll('header img.brand-mark, footer img.brand-mark')].map(img => img.getAttribute('src')),
      footerHrefs: [...document.querySelectorAll('footer.footer a')].map(element => element.getAttribute('href')),
      overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      brokenRenderedImages: [...document.images].filter(img => visible(img) && Boolean(img.currentSrc || img.getAttribute('src')) && img.complete && !img.naturalWidth)
        .map(img => img.currentSrc || img.src),
    };
  }, adCopy.source);
}

function* businessNodes(value) {
  if (!value || typeof value !== 'object') return;
  if (value.name === 'Ghareeb Fencing Solutions'
    && [value['@type']].flat().some(type => /LocalBusiness|HomeAndConstructionBusiness|Organization/.test(type))) yield value;
  for (const child of Object.values(value)) yield* businessNodes(child);
}

function facts(audit, raw, path) {
  const errors = [];
  if (hasStaleFacts(raw)) errors.push('former phone or address appears');
  if (/8F5C4C98-DDFA-4D07-8135-8366CF7247FA/i.test(raw)) errors.push('former logo asset appears');
  if (audit.links.some(href => {
    const target = href.split('?')[0];
    return (/^(tel:|sms:)/.test(target) && target.replace(/\D/g, '').replace(/^1/, '') !== PHONE)
      || (target.startsWith('mailto:') && target !== 'mailto:' + EMAIL);
  })) errors.push('contact link uses an unexpected phone number or email');
  if (path === '/' && !audit.nodes.some(node => node.foundingDate === '2022')) errors.push('home schema founding year');
  if (path === '/about/' && !audit.founded.some(line => line.includes('2022'))) errors.push('About founding year');
  if (path === '/contact/' && !/Mon–Sat\s*·\s*8am\s*–\s*6pm\s*·\s*Closed Sunday/.test(audit.main)) errors.push('contact office hours');
  if (audit.hasFooter) {
    const phone = audit.footerHrefs.find(ref => ref?.startsWith('tel:'));
    const email = audit.footerHrefs.find(ref => ref?.startsWith('mailto:'));
    if (!phone?.replace(/\D/g, '').endsWith(PHONE)) errors.push('footer phone');
    if (email !== 'mailto:' + EMAIL) errors.push('footer email');
  }
  if (audit.logo.some(src => !/\/ghareeb-logo-(?:300|396)\.webp$/.test(src || ''))) errors.push('different logo');
  for (const item of audit.nodes.flatMap(node => [...businessNodes(node)])) {
    if (item.telephone && !String(item.telephone).replace(/\D/g, '').endsWith(PHONE)) errors.push('schema phone');
    if (item.email && item.email !== EMAIL) errors.push('schema email');
    const { streetAddress, addressLocality, addressRegion, postalCode } = item.address || {};
    if (item.address && (streetAddress !== '5242 Tractor Rd Suite C' || addressLocality !== 'Toledo'
      || addressRegion !== 'OH' || String(postalCode) !== '43612')) errors.push('schema address');
    if (item.foundingDate && String(item.foundingDate) !== '2022') errors.push('schema founding date');
    if (item.logo && !/\/ghareeb-logo-(?:300|396)\.webp$/.test(typeof item.logo === 'string' ? item.logo : item.logo.url)) errors.push('schema logo');
    if (item.openingHoursSpecification) {
      const entries = [item.openingHoursSpecification].flat();
      const hours = entries.flatMap(entry => [entry.dayOfWeek].flat().map(day => [day.split('/').at(-1), entry.opens, entry.closes]));
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      if (hours.length !== 6 || days.some(day => !hours.some(([name, open, close]) =>
        name === day && open === '08:00' && close === '18:00'))) errors.push('schema office hours');
    }
  }
  return [...new Set(errors)];
}

test('walk the production sitemap and audit links, assets, business facts, layout and form labels', async ({ page, context }, info) => {
  test.setTimeout(300_000);
  const world = await mockSite(context);
  const xml = await readFile(join(DIST, 'sitemap.xml'), 'utf8');
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => new URL(url).pathname);
  expect(new Set(paths).size).toBe(paths.length);
  expect(paths).toContain('/fences/pool-fencing/');
  expect(paths).toContain('/blog/pool-fence-code-lucas-county/');
  const visited = [], references = new Map();
  let messages = [], resourceErrors = [];
  page.on('pageerror', error => messages.push(error.message));
  page.on('console', entry => { if (entry.type() === 'error') messages.push(entry.text()); });
  page.on('response', response => {
    if (response.status() >= 400 && response.url().startsWith(BASE)) resourceErrors.push([response.status(), response.url()]);
  });

  for (const path of paths) {
    messages = [];
    resourceErrors = [];
    const response = await page.goto(path, { waitUntil: 'load', timeout: 20_000 });
    expect(response?.status(), path).toBe(200);
    if (path === '/quote/ballpark/') {
      // Let the estimator consume the mocked capability response before navigating away.
      await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('gfs_bp_server_price') || 'null')?.ok)).toBe(true);
    }
    // Read the served HTML directly because a long WebKit crawl can evict inspector response bodies.
    const raw = await (await fetch(new URL(path, BASE))).text();
    const evidence = await inspect(page);
    for (const [kind, values] of Object.entries({ link: evidence.links, image: evidence.imgs })) {
      for (const value of values) {
        const url = new URL(value);
        if (url.origin !== BASE && !SITE_HOSTS.has(url.hostname)) continue;
        if (!['http:', 'https:'].includes(url.protocol)) continue;
        const key = localURL(url);
        const ref = references.get(key) || { sources: new Set(), kinds: new Set() };
        ref.sources.add(path);
        ref.kinds.add(kind);
        references.set(key, ref);
      }
    }
    const issues = facts(evidence, raw, path);
    const { links, imgs, nodes, main, visibleText, footerHrefs, hasFooter, logo, ...details } = evidence;
    visited.push({ path, status: response.status(), facts: issues, console: [...new Set(messages)], resourceErrors, ...details });
    if (info.project.name === 'iphone' && ['/quote/ballpark/', '/contact/', '/careers/'].includes(path)) {
      const file = path.split('/').filter(Boolean).at(-1) + '-390.png';
      await page.screenshot({ path: info.outputPath(file) });
    }
  }

  const broken = [];
  const targets = [...references.entries()];
  for (let i = 0; i < targets.length; i += 16) {
    await Promise.all(targets.slice(i, i + 16).map(async ([target, ref]) => {
      const result = await fetch(target, { method: 'HEAD' });
      if (!result.ok) broken.push({ target: target.slice(BASE.length), status: result.status, sources: [...ref.sources], kinds: [...ref.kinds] });
    }));
  }

  const llms = await readFile(join(DIST, 'llms.txt'), 'utf8');
  const llmsFacts = ['(419) 214-2107', EMAIL, '5242 Tractor Rd Suite C, Toledo, OH 43612', 'Monday to Saturday, 8 am to 6 pm. Closed Sunday.', 'Pool fences', 'Founded in 2022.'];
  const output = {
    profile: info.project.name, visited, internalTargets: targets.length,
    broken: broken.sort((a, b) => a.target.localeCompare(b.target)), outboundMocks: [...new Set(world.outbound.map(row => row.host))].sort(),
    llmsErrors: llmsFacts.filter(value => !llms.includes(value)).concat(hasStaleFacts(llms) ? ['old facts'] : []),
  };
  await writeFile(info.outputPath('audit.json'), JSON.stringify(output, null, 2) + '\n');
  await info.attach('sitemap-audit', { path: info.outputPath('audit.json'), contentType: 'application/json' });
  expect(world.deliveries).toHaveLength(0);
  expect(world.unexpected).toEqual([]);
  expect(output.llmsErrors).toEqual([]);
  // The JSON also records findings to review with a screenshot.
  expect.soft(visited.flatMap(row => row.facts.map(fact => [row.path, fact])), 'published business facts').toEqual([]);
  expect.soft(output.broken, 'internal links and image URLs').toEqual([]);
  expect.soft(visited.flatMap(row => row.overflow ? [[row.path, row.overflow]] : []), 'sideways scroll').toEqual([]);
  expect.soft(visited.flatMap(row => row.clipped.map(name => [row.path, name])), 'clipped controls').toEqual([]);
  expect.soft(visited.flatMap(row => row.brokenRenderedImages.map(url => [row.path, url])), 'rendered images').toEqual([]);
  if (info.project.name !== 'desktop') {
    expect.soft(visited.flatMap(row => row.tapTargets.map(target => [row.path, target])), '44 px touch controls').toEqual([]);
  }
  expect.soft(visited.flatMap(row => row.console.map(message => [row.path, message])), 'browser errors').toEqual([]);
  expect.soft(visited.flatMap(row => row.formFields.filter(field => !field.label).map(field => [row.path, field.name])), 'form labels').toEqual([]);
  const contact = { name: ['text', 'name'], firstName: ['text', 'given-name'], lastName: ['text', 'family-name'],
    email: ['email', 'email'], phone: ['tel', 'tel'], address: ['text', 'street-address'] };
  expect.soft(visited.flatMap(row => row.formFields.filter(({ name, type, autocomplete }) =>
    contact[name] && (type !== contact[name][0] || autocomplete !== contact[name][1]))
    .map(field => [row.path, field.name])), 'contact field types and autocomplete').toEqual([]);
});

test('the narrowed mobile viewport keeps Submit reachable on each website form', async ({ page, context }, info) => {
  test.skip(info.project.name === 'desktop', 'phone and tablet keyboard space');
  test.setTimeout(90_000);
  await mockSite(context);
  const { width, height } = page.viewportSize();
  for (const path of ['/quote/form/', '/contact/', '/quote/book/', '/quote/ballpark/']) {
    await test.step(path, async () => {
      await page.setViewportSize({ width, height });
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      const consent = page.getByRole('button', { name: 'Only necessary' });
      if (await consent.isVisible()) await press(consent);
      const form = page.locator('form[data-lead-form], #bp-form');
      if (path === '/quote/ballpark/') await press(form.locator('summary'));
      await form.locator('[name=notes]').focus();
      await page.setViewportSize({ width, height: height - 325 });
      const submit = form.locator('button[type=submit]');
      await submit.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await expect(submit).toBeInViewport({ ratio: 1 });
      await expect.poll(() => submit.evaluate(element => {
        const { left, top, width, height } = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(left + width / 2, top + height / 2));
      })).toBe(true);
      if (info.project.name === 'iphone' && path === '/quote/form/') {
        await page.screenshot({ path: info.outputPath('submit-reachable.png') });
      }
    });
  }
});
