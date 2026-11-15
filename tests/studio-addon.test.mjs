// The 3D viewer add-on (below-grade view, steel gate frames). These three modules are reviewed
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
  'studio/in-viewer.mjs': '525f8ed90b3303cb37a54e71639ac610dfc907802baf92a8c266d3ab4565a191',
  'studio/site-kit.mjs': 'e20fddddb0e2bbe183a0b6d593755dbd4fd3c8b670ca6342be1954aff11a2b4f',
  'studio/realism.mjs': '371c304f0f519f05eff9a50e1a726da4e0b5f16b1da2e1829571df15aaa9303b',
};
const IMPORT = '(function _gfsModelStudio(){try{import("./studio/in-viewer.mjs").then(m=>m.boot(window)).catch(()=>{})}catch(_){}})();';
const ANCHOR = 'window.__cam=()=>cam;window.__rend=()=>renderer;';
const sha = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const count = (text, part) => text.split(part).length - 1;

test('the three add-on modules are exactly the reviewed copies', () => {
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
