// The website's 3D is the Executive app's viewer, carried whole under /x3d/. /fence3d.html only forwards there.
// tests/x3d-manifest.json pins the shared viewer files and the website-owned index.html forwarder.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'tests/x3d-manifest.json'), 'utf8'));
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const walk = (dir, out = []) => { for (const e of fs.readdirSync(dir, {withFileTypes: true})) { const p = path.join(dir, e.name); e.isDirectory() ? walk(p, out) : out.push(p); } return out; };

test('every /x3d/ file is the pinned one, and nothing else is there', () => {
  const dir = path.join(root, 'public/x3d');
  const have = walk(dir).map(p => path.relative(dir, p).split(path.sep).join('/')).sort();
  assert.deepEqual(have, Object.keys(manifest.files).sort());
  for (const [rel, want] of Object.entries(manifest.files)) assert.equal(sha(fs.readFileSync(path.join(dir, rel))), want, rel);
});

test('no staff-only Studio file is carried', () => {
  const staff = /handles|profile-diagnostics|studio\/(app|data|fields|audit|assistant|job-spec|photo-scene|viewer-bridge)|model-studio\.html|model-profiles|studio-catalog/;
  for (const rel of Object.keys(manifest.files)) assert.doesNotMatch(rel, staff);
});

test('/fence3d.html forwards with the same query and design, and has no link Netlify would rewrite', () => {
  const page = fs.readFileSync(path.join(root, 'public/fence3d.html'), 'utf8');
  assert.match(page, /<meta name="robots" content="noindex">/);
  const go = page.match(/<script>(location\.replace[^<]+)<\/script>/)[1];
  let to = null;
  vm.runInNewContext(go, {location: {search: '?embed=1&website=1&studio=1', hash: '#eyJ2Ijo2fQ==', replace: u => { to = u; }}});
  assert.equal(to, './x3d/fence3d.html?embed=1&website=1&studio=1#eyJ2Ijo2fQ==');
  assert.doesNotMatch(page, /<a[\s>]/i);
  assert.ok(page.length < 2000);
});

test('the build leaves /x3d/ byte for byte', () => {
  const dist = path.join(root, 'dist/x3d');
  if (!fs.existsSync(dist)) return; // build not run in this checkout
  for (const [rel, want] of Object.entries(manifest.files)) assert.equal(sha(fs.readFileSync(path.join(dist, rel))), want, rel);
});

test('/x3d/ opens the viewer with the original query and design on a static host', () => {
  const page = fs.readFileSync(path.join(root, 'public/x3d/index.html'), 'utf8');
  assert.match(page, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(page, /<meta name="robots" content="noindex">/);
  const script = page.match(/<script>(.*?)<\/script>/s)[1];
  let to;
  vm.runInNewContext(script, { location: { search: '?embed=1&website=1', hash: '#design', replace: url => { to = url; } } });
  assert.equal(to, './fence3d.html?embed=1&website=1#design');
});
