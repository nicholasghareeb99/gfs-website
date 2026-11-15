// The 3D viewer add-on (below-grade view, steel gate frames). These modules are reviewed
// copies of gfence-app's pending/executive-ipad-pencil/source/studio/ files and are pinned by hash:
// change them there first, review, then copy and update the pins here in the same change.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { ROOT } from './helpers.mjs';

const PINS = {
  'studio/in-viewer.mjs': '3137d7f69e7269ca8e4dfbe9b6187dbf5451fec2ece0e3acb6679260a562253d',
  'studio/site-kit.mjs': '5271151f2990931aea1442095678fdd2cb5dd0670216f88a273ef53ba02f205e',
  'studio/hardware-kit.mjs': '3dca55da7705a8110917448889b5891cade27ebd2e1768cfada852f4cc7a0e5d',
  'studio/realism.mjs': '371c304f0f519f05eff9a50e1a726da4e0b5f16b1da2e1829571df15aaa9303b',
};
const IMPORT = '(function _gfsModelStudio(){try{import("./studio/in-viewer.mjs").then(m=>m.boot(window)).catch(()=>{})}catch(_){}})();';
const ANCHOR = 'window.__cam=()=>cam;window.__rend=()=>renderer;';
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const count = (text, part) => text.split(part).length - 1;

test('the add-on modules are exactly the reviewed copies', () => {
  for (const [rel, want] of Object.entries(PINS)) assert.equal(sha(path.join(ROOT, 'public', rel)), want, rel);
  assert.deepEqual(fs.readdirSync(path.join(ROOT, 'public/studio')).sort(), Object.keys(PINS).map(p => path.basename(p)).sort(), 'nothing else lives in public/studio');
});

test('the viewer loads the add-on once, guarded, right after it publishes its hooks', () => {
  const html = fs.readFileSync(path.join(ROOT, 'public/fence3d.html'), 'utf8');
  assert.equal(count(html, 'studio/in-viewer.mjs'), 1);
  assert.equal(count(html, ANCHOR + IMPORT), 1);
});

test('the add-on only reaches for files this site serves', () => {
  for (const rel of Object.keys(PINS)) {
    const src = fs.readFileSync(path.join(ROOT, 'public', rel), 'utf8').split('\n').filter(line => !/^\s*\/\//.test(line)).join('\n');   // comments quote the loader line
    for (const m of src.matchAll(/(?:from\s+|import\(\s*)['"](\.[^'"]+)['"]/g)) assert.ok(fs.existsSync(path.join(ROOT, 'public', path.dirname(rel), m[1])), `${rel} imports ${m[1]}`);
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'public/gfs/vendor/three.module.js')), 'fallback THREE module');
  assert.ok(fs.readFileSync(path.join(ROOT, 'public/fence3d.html'), 'utf8').includes('window.THREE=THREE'), 'viewer publishes THREE');
});

test('a clean build keeps the add-on: dist has the same viewer and modules', () => {
  // Build a copy so the test never touches the working tree's dist/.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gfs-site-'));
  try {
    fs.cpSync(path.join(ROOT, 'public'), path.join(tmp, 'public'), { recursive: true });
    fs.cpSync(path.join(ROOT, 'scripts'), path.join(tmp, 'scripts'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(tmp, 'package.json'));
    assert.equal(fs.existsSync(path.join(tmp, 'dist')), false);
    execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: tmp, stdio: 'pipe' });
    for (const [rel, want] of Object.entries(PINS)) assert.equal(sha(path.join(tmp, 'dist', rel)), want, 'dist/' + rel);
    assert.equal(sha(path.join(tmp, 'dist/fence3d.html')), sha(path.join(ROOT, 'public/fence3d.html')));
    assert.equal(count(fs.readFileSync(path.join(tmp, 'dist/fence3d.html'), 'utf8'), ANCHOR + IMPORT), 1);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('the viewer keeps the noindex directive the live site serves', () => {
  // ghareebfence.com/fence3d.html carries this; the source must not drop it on the next build.
  const html = fs.readFileSync(path.join(ROOT, 'public/fence3d.html'), 'utf8');
  const head = html.slice(0, html.indexOf('</head>') > 0 ? html.indexOf('</head>') : 2000);
  assert.equal(count(html, '<meta name="robots" content="noindex">'), 1);
  assert.ok(head.includes('<meta name="robots" content="noindex">'), 'in the head');
});
