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
console.log(`Copied public to dist; merged stylesheets on ${pages} pages into ${made.size} bundles`);
