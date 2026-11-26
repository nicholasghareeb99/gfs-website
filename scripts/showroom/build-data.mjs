// Builds public/showroom/data.json for the GFS Showroom app.
// Run: node scripts/showroom/build-data.mjs
// Sources (all already on the website, nothing private):
//   public/brochure/read/index.html     → 92 brochure pages: title, section, text
//   scripts/showroom/hotspots.json      → photo regions on each page
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
  // Photo regions on the page (tap to open). Style photos themselves come live from the Executive App.
  const spots = (hotspots[n] || []).map(h => ({ r: h.r }));
  return { n, title, section, text, spots };
});
if (pages.length !== 92) throw Error(`Expected 92 brochure pages, found ${pages.length}`);
for (const p of pages) for (const f of [`assets/brochure/pages/p${String(p.n).padStart(2, '0')}.webp`, `assets/brochure/hires/p${String(p.n).padStart(2, '0')}.webp`]) if (!exists(f)) throw Error('Missing ' + f);

// ── Styles ───────────────────────────────────────────────────────
const { catalogNames } = await import(pathToFileURL(path.join(PUB, 'gfs/studio-catalog.mjs')).href);
const styles = STYLES.map(s => {
  const missing = s.models.filter(m => !catalogNames.includes(m));
  if (missing.length) throw Error(`${s.id}: unknown 3D model names ${missing.join(', ')}`);
  const { photoTags, ...rest } = s; return rest;
});
for (const s of styles) if (!FAMILIES.some(f => f.id === s.family)) throw Error('Unknown family ' + s.family);

const data = {
  built: new Date().toISOString().slice(0, 10),
  families: FAMILIES, styles, pages, models: catalogNames, rules: RULES, dig: DIG_RULES,
  rulesChecked: 'Nov 19, 2026'
};
writeFileSync(path.join(PUB, 'showroom/data.json'), JSON.stringify(data));
console.log(`showroom data: ${pages.length} pages, ${styles.length} styles, ${catalogNames.length} 3D models, ${RULES.length} towns`);
