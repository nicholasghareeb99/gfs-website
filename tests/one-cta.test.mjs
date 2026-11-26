// One main action in the header and phone bar, the compare page, and ballpark links.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { read } from './helpers.mjs';

function pages(dir = 'public', out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!['x3d', 'admin', 'showroom'].includes(e.name)) pages(p, out); }
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

test('header has one price button and no quote chooser; phone bar is Call Nick + price', () => {
  for (const p of pages()) {
    const h = fs.readFileSync(p, 'utf8');
    assert.ok(!h.includes('data-quote-chooser'), p);
    assert.ok(!h.includes('header-quote-chooser.js'), p);
    if (h.includes('header-measure-button')) assert.match(h, /header-measure-button" id="nav-quote">Get My 60-Second Price →<\/a>/, p);
    if (h.includes('class="mobile-cta"')) {
      assert.match(h, /class="mobile-cta__call"[^>]*>Call Nick<\/a>/, p);
      assert.match(h, /<a href="\/quote\/ballpark\/" class="mobile-cta__price">Get 60-Sec Price →<\/a>/, p);
    }
  }
});

test('no 0% APR and no laser measuring anywhere on the site', () => {
  for (const p of pages()) {
    const h = fs.readFileSync(p, 'utf8');
    assert.ok(!/0\s?% (promotional )?APR/i.test(h), p);
    assert.ok(!/laser/i.test(h), p);
  }
});

test('compare page: listed in sitemap, no per-foot prices, heights match what we sell', () => {
  const h = read('public/fences/compare/index.html');
  assert.match(read('public/sitemap.xml'), /fences\/compare\//);
  assert.ok(!/\$\d+(\.\d+)?\s*(\/|per)\s*(ft|foot|lf)/i.test(h));
  assert.match(h, /data-hv-style="chainlink"[^>]*data-hv-heights="4,5,6"/);
  assert.match(h, /data-hv-style="aluminum"[^>]*data-hv-heights="4,5,6"/);
  assert.match(h, /sandy yards get dug posts/);
  assert.match(h, /href="\/quote\/ballpark\/\?material=vinyl"/);
});

test('ballpark reads material, height and feet from the link and offers 70/140/210/310 ft presets', () => {
  const js = read('public/assets/js/ballpark.js');
  for (const ft of [70, 140, 210, 310]) assert.match(js, new RegExp('feet: ' + ft + ','));
  assert.match(js, /oneParam\(params, 'material'\)/);
  assert.match(js, /oneParam\(params, 'height'\)/);
  assert.match(js, /oneParam\(params, 'feet'\)/);
  assert.match(js, /id="bp-feet-slider"/);
});

test('gallery photos link to the ballpark by material; ballpark shows real review lines', () => {
  const js = read('public/assets/js/project-gallery.js');
  assert.match(js, /\/quote\/ballpark\/\?material=/);
  assert.match(js, /splitrail:'split-rail'/);
  const bp = read('public/quote/ballpark/index.html');
  assert.equal((bp.match(/class="path-quote"/g) || []).length, 3);
  assert.match(bp, /Google review<\/a><\/figcaption>/);
});

test('ballpark motion layer: loaded on the ballpark page only and never rewrites the price text', () => {
  const bp = read('public/quote/ballpark/index.html');
  assert.match(bp, /ballpark-motion\.css/);
  assert.match(bp, /ballpark-motion\.js/);
  const js = read('public/assets/js/ballpark-motion.js');
  assert.ok(!/range\.textContent\s*=/.test(js), 'count-up must use an overlay');
  assert.match(read('public/assets/css/ballpark-motion.css'), /prefers-reduced-motion:reduce/);
});
