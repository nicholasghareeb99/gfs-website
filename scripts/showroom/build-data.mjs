// Builds public/showroom/data.json for the GFS Showroom app.
// Run: node scripts/showroom/build-data.mjs
// Sources (all already on the website, nothing private):
//   public/brochure/read/index.html     → 92 brochure pages: title, section, text
//   public/fences/<material>/index.html → tagged project photo archive
//   public/assets/data/site-photo-library.json
//   scripts/showroom/hotspots.json      → photo regions on each page (+ matched source photo)
//   public/gfs/studio-catalog.mjs       → 3D style names (live list comes from settings/public)
//   scripts/showroom/content.mjs        → style tiles and local fence rules
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { FAMILIES, STYLES, RULES, DIG_RULES } from './content.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = path.join(ROOT, 'public');
const unescape = s => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const strip = s => unescape(s.replace(/<[^>]+>/g, ''));
const exists = p => p && existsSync(path.join(PUB, p));

// ── Brochure pages ───────────────────────────────────────────────
const read = readFileSync(path.join(PUB, 'brochure/read/index.html'), 'utf8');
const sections = [...read.matchAll(/<h2 class="gfs-read__section" id="s(\d+)">(.*?)<\/h2>/g)].map(m => ({ at: m.index, start: +m[1], name: strip(m[2]) }));
const hotspots = JSON.parse(readFileSync(path.join(ROOT, 'scripts/showroom/hotspots.json'), 'utf8'));
const pages = [...read.matchAll(/<figure class="gfs-read__page" id="p(\d+)">([\s\S]*?)<\/figure>/g)].map(m => {
  const n = +m[1], body = m[2];
  const title = strip((body.match(/<\/strong> · (.*?)<details/) || [])[1] || `Page ${n}`);
  const text = [...body.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(x => strip(x[1]))
    .join(' ')
    // the page images letter-space their eyebrow lines: "W O O D" → "WOOD"
    .replace(/\b(?:[A-Z&] ){2,}[A-Z&]\b/g, s => s.replace(/ /g, ''))
    .replace(/GHAREEB FENCING SOLUTIONS|Built Sturdy\. Built Straight\. Built to Last\.|CALL OR TEXT · \(419\) 214-2107|FREE ON-SITE ESTIMATE SCANTHECODE|Page \d+/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const section = sections.filter(s => s.at < m.index).at(-1)?.name || '';
  const spots = (hotspots[n] || []).map(h => ({ r: h.r, src: exists(h.src) ? h.src : null }));
  return { n, title, section, text, spots };
});
if (pages.length !== 92) throw Error(`Expected 92 brochure pages, found ${pages.length}`);
for (const p of pages) for (const f of [`assets/brochure/pages/p${String(p.n).padStart(2, '0')}.webp`, `assets/brochure/hires/p${String(p.n).padStart(2, '0')}.webp`]) if (!exists(f)) throw Error('Missing ' + f);

// ── Photos ───────────────────────────────────────────────────────
const photos = [], seen = new Set();
const add = p => { if (!exists(p.th) || seen.has(p.th)) return; if (!exists(p.full)) p.full = p.th; seen.add(p.th); photos.push(p); };
for (const material of readdirSync(path.join(PUB, 'fences'))) {
  const file = path.join(PUB, 'fences', material, 'index.html');
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/<figure class="fence-photo-card"[^>]*data-photo-tag="([^"]*)"[^>]*data-archive-id="([^"]*)"[\s\S]*?<\/figure>/g)) {
    const b = m[0];
    add({ id: m[2], m: material, tag: unescape(m[1]), alt: unescape((b.match(/alt="([^"]*)"/) || [])[1] || ''),
      th: ((b.match(/data-photo-thumbnail="([^"]*)"/) || [])[1] || '').replace(/^\//, ''),
      full: ((b.match(/data-photo-original="([^"]*)"/) || [])[1] || '').replace(/^\//, '') });
  }
}
const CATEGORY = { '01': 'cedar', '02': 'wood', '03': 'wood', '04': 'wood', '05': 'split-rail', '06': 'chainlink', '07': 'chainlink', '08': 'vinyl', '09': 'vinyl', '10': 'aluminum' };
JSON.parse(readFileSync(path.join(PUB, 'assets/data/site-photo-library.json'), 'utf8')).forEach((p, i) => {
  const src = p.src.replace(/^\//, '');
  add({ id: 'lib' + i, m: CATEGORY[(p.category || '').slice(0, 2)] || 'library', tag: p.categoryLabel || null, alt: p.alt || '', th: (p.thumbnail || p.src).replace(/^\//, ''), full: src });
});
// Hotspot matches point at thumbnails; make sure each one is a known photo.
for (const p of pages) for (const s of p.spots) if (s.src) { const hit = photos.find(x => x.th === s.src.replace(/^\//, '') || x.full === s.src.replace(/^\//, '')); s.photo = hit ? hit.id : null; delete s.src; } else { delete s.src; s.photo = null; }

// ── Styles ───────────────────────────────────────────────────────
const { catalogNames } = await import(pathToFileURL(path.join(PUB, 'gfs/studio-catalog.mjs')).href);
const familyOfPhoto = m => (m === 'cedar' ? 'wood' : m);
const styles = STYLES.map(s => {
  const ids = photos.filter(p => s.photoTags.some(([m, tag]) => (m === 'library' || p.m === m) && p.tag === tag) && (s.photoTags.some(([m]) => m !== 'library') ? true : familyOfPhoto(p.m) === s.family)).map(p => p.id);
  // Photos the brochure itself uses on this style's pages come first.
  const fromPages = pages.filter(p => s.pages.includes(p.n)).flatMap(p => p.spots.map(x => x.photo)).filter(Boolean);
  const photoIds = [...new Set([...fromPages, ...ids])];
  const missing = s.models.filter(m => !catalogNames.includes(m));
  if (missing.length) throw Error(`${s.id}: unknown 3D model names ${missing.join(', ')}`);
  return { ...s, photos: photoIds, photoTags: undefined };
});
for (const s of styles) if (!FAMILIES.some(f => f.id === s.family)) throw Error('Unknown family ' + s.family);

const data = {
  built: new Date().toISOString().slice(0, 10),
  families: FAMILIES, styles, pages, photos, models: catalogNames, rules: RULES, dig: DIG_RULES,
  rulesChecked: 'Nov 19, 2026'
};
writeFileSync(path.join(PUB, 'showroom/data.json'), JSON.stringify(data));
console.log(`showroom data: ${pages.length} pages, ${photos.length} photos, ${styles.length} styles (${styles.filter(s => s.photos.length).length} with photos), ${catalogNames.length} 3D models, ${RULES.length} towns`);
for (const s of styles) console.log(' ', s.id.padEnd(22), String(s.photos.length).padStart(3), 'photos', s.models.length, 'models');
