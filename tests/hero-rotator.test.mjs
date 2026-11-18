import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const hero = html.slice(html.indexOf('<!-- HERO'), html.indexOf('<!-- BACKYARD INSPIRATION -->'));
const sandbox = { window: {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(new URL('../public/assets/js/hero-rotator.js', import.meta.url), 'utf8'), sandbox);
const Rot = sandbox.GFSHeroRotator;
const parts = hero.split(/<div class="hero-slide(?: is-active)?" role=/);

test('home hero has four slides, four photos, four dots', () => {
  assert.equal((hero.match(/class="hero-slide[ "]/g) || []).length, 4);
  assert.equal((hero.match(/class="hero-bg[ "]/g) || []).length, 4);
  assert.equal((hero.match(/data-hero-go="/g) || []).length, 4);
});

test('exactly one h1 in the hero, and the first photo keeps the LCP hints', () => {
  assert.equal((hero.match(/<h1[ >]/g) || []).length, 1);
  assert.match(hero, /data-lcp loading="eager" fetchpriority="high"/);
  assert.equal((hero.match(/loading="lazy"/g) || []).length, 3);
});

test('financing slide leads with the offer, states the catch, and links to /financing/', () => {
  const slide = parts[2];
  assert.match(slide, /No interest if paid in full within 18 months\./);
  assert.match(slide, /If a balance is left after 18 months/);
  assert.match(slide, /subject to credit approval/);
  assert.match(slide, /href="\/financing\/"[^>]*data-hero-financing-cta/);
  assert.doesNotMatch(hero, /0% (APR|interest)|zero interest|interest-free|same as cash/i);
});

test('hidden slides are not read out or focusable', () => {
  const slides = parts.slice(2);
  assert.equal(slides.length, 3);
  slides.forEach((s) => assert.match(s, /aria-hidden="true"/));
  const css = fs.readFileSync(new URL('../public/assets/css/hero-rotator.css', import.meta.url), 'utf8');
  assert.match(css, /\.hero-slide\{[^}]*visibility:hidden/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test('rotation wraps from the last slide to the first', () => {
  assert.equal(Rot.next(0, 4), 1);
  assert.equal(Rot.next(3, 4), 0);
  assert.ok(Rot.DELAY >= 5000);
});

test('stylesheet and script are loaded by the home page', () => {
  assert.match(html, /hero-rotator\.css/);
  assert.match(html, /hero-rotator\.js/);
});
