// GFS Showroom: data integrity. Every page, photo, hotspot and 3D model the app
// points at must exist, and no prices may ever reach the showroom data.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const d = JSON.parse(readFileSync('public/showroom/data.json', 'utf8'));
const has = p => existsSync('public/' + p.replace(/^\//, ''));
test('92 brochure pages with low and high-res images', () => {
  assert.equal(d.pages.length, 92);
  for (const p of d.pages) for (const k of ['pages', 'hires']) assert.ok(has(`assets/brochure/${k}/p${String(p.n).padStart(2, '0')}.webp`), `${k} p${p.n}`);
});
test('photo hotspots sit on the page and point at real photos', () => {
  const ids = new Set(d.photos.map(p => p.id));
  for (const p of d.pages) for (const s of p.spots) {
    const [x, y, w, h] = s.r; assert.ok(x >= 0 && y >= 0 && x + w <= 1.001 && y + h <= 1.001, `p${p.n}`);
    if (s.photo) assert.ok(ids.has(s.photo));
  }
});
test('every photo file exists', () => { for (const p of d.photos) { assert.ok(has(p.th), p.th); assert.ok(has(p.full), p.full); } });
test('styles use known families, pages and 3D models', () => {
  for (const s of d.styles) {
    assert.ok(d.families.some(f => f.id === s.family), s.id);
    for (const n of s.pages) assert.ok(n >= 1 && n <= 92, s.id);
    for (const m of s.models) assert.ok(d.models.includes(m), `${s.id}: ${m}`);
  }
});
test('no prices in showroom data', () => { assert.doesNotMatch(readFileSync('public/showroom/data.json', 'utf8'), /"(price|rate|perFoot|cost)[A-Za-z]*"\s*:/i); });
