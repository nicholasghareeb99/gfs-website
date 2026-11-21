import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// 1. Copy the editable source into dist (start clean so removed files don't linger).
fs.rmSync('dist', { recursive: true, force: true });
fs.mkdirSync('dist', { recursive: true });
fs.cpSync('public', 'dist', { recursive: true });

// 2. Merge each run of back-to-back local stylesheets into one file.
//    Order is kept exactly, so the cascade is unchanged. public/ is never touched.
const LINK = /<link rel="stylesheet" href="((?:\.{1,2}\/|\/)(?:\.\.\/)*assets\/css\/[^"?#]+\.css)(?:\?[^"]*)?">/;
const RUN = new RegExp(`(?:${LINK.source}\\s*){2,}`, 'g');
const cssDir = path.join('dist', 'assets', 'b');
fs.mkdirSync(cssDir, { recursive: true });
const made = new Map();
const bundleParts = new Map();

function tidy(css) {
  // Safe size trim only: drop comments and blank lines, keep everything else as written.
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]+/gm, '').replace(/\n{2,}/g, '\n').trim();
}

function bundle(files) {
  const key = files.join('|');
  if (made.has(key)) return made.get(key);
  const body = files.map(f => {
    const src = path.join('dist', f);
    if (!fs.existsSync(src)) throw new Error(`Missing stylesheet ${f}`);
    return `/* ${path.basename(f)} */\n${tidy(fs.readFileSync(src, 'utf8'))}`;
  }).join('\n');
  const hash = crypto.createHash('sha256').update(body).digest('hex').slice(0, 12);
  const name = `/assets/b/${hash}.css`;
  fs.writeFileSync(path.join(cssDir, `${hash}.css`), body);
  made.set(key, name);
  bundleParts.set(name, files);
  return name;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

let pages = 0;
for (const file of walk('dist')) {
  const html = fs.readFileSync(file, 'utf8');
  const next = html.replace(RUN, run => {
    const dir = '/' + path.relative('dist', path.dirname(file)).split(path.sep).filter(Boolean).join('/');
    const files = [...run.matchAll(new RegExp(LINK.source, 'g'))].map(m => path.posix.resolve(dir, m[1]));
    return `<link rel="stylesheet" href="${bundle(files)}">`;
  });
  if (next !== html) { fs.writeFileSync(file, next); pages++; }
}
// 3. In <head>, local stylesheets are often split by preloads or JSON-LD. Those
//    tags carry no CSS, so neighbouring stylesheets can be fetched as one file in
//    the same order. A <style> block does carry CSS, so the head is cut at every
//    <style> block and each stretch between them is merged on its own: nothing
//    moves across a <style> block and the cascade cannot change. Skipped when
//    any stylesheet in the head is not a plain local link.
let headPages = 0;
const ANY_SHEET = /<link\b[^>]*rel=["']?stylesheet/gi;
const HEAD_LINK = /<link rel="stylesheet" href="((?:\.{1,2}\/|\/)(?:\.\.\/)*assets\/(?:css|b)\/[^"?#]+\.css)(?:\?[^"]*)?">/;
for (const file of walk('dist')) {
  const html = fs.readFileSync(file, 'utf8');
  const end = html.search(/<\/head>/i);
  if (end < 0) continue;
  const head = html.slice(0, end);
  const all = head.match(new RegExp(HEAD_LINK.source, 'g')) || [];
  if (all.length < 2) continue;
  if ((head.match(ANY_SHEET) || []).length !== all.length) continue;
  const dir = '/' + path.relative('dist', path.dirname(file)).split(path.sep).filter(Boolean).join('/');
  let changed = false;
  const nextHead = head.split(/(<style\b[\s\S]*?<\/style>)/i).map((part) => {
    if (/^<style\b/i.test(part)) return part;
    const links = [...part.matchAll(new RegExp(HEAD_LINK.source, 'g'))];
    if (links.length < 2) return part;
    const files = [];
    for (const m of links) {
      if (m[1].startsWith('/assets/b/')) files.push(...bundleParts.get(m[1]));
      else files.push(path.posix.resolve(dir, m[1]));
    }
    let first = true;
    changed = true;
    return part.replace(new RegExp(HEAD_LINK.source, 'g'), () => {
      if (!first) return '';
      first = false;
      return `<link rel="stylesheet" href="${bundle(files)}">`;
    });
  }).join('');
  if (!changed) continue;
  fs.writeFileSync(file, nextHead + html.slice(end));
  headPages++;
}
// 4. Drop bundles that step 3 replaced everywhere.
const used = new Set();
for (const file of walk('dist')) for (const m of fs.readFileSync(file, 'utf8').matchAll(/\/assets\/b\/([0-9a-f]{12})\.css/g)) used.add(m[1]);
let dropped = 0;
for (const f of fs.readdirSync(cssDir)) if (!used.has(f.replace(/\.css$/, ''))) { fs.rmSync(path.join(cssDir, f)); dropped++; }
console.log(`Copied public to dist; merged stylesheets on ${pages} pages; one head stylesheet on ${headPages} pages; ${made.size - dropped} bundles kept`);
