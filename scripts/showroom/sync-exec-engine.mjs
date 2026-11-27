#!/usr/bin/env node
// Copies the Executive App's built 3D fence engine into the Showroom, so the Fence Lab draws the
// same posts, rails and pickets the app does.
//
//   node scripts/showroom/sync-exec-engine.mjs /path/to/gfence-app
//
// The app keeps its engine as a baseline plus patch batches; its own build (buildCandidate in
// pending/executive-ipad-pencil/apply.mjs) applies them. This takes gfs/fence-engine.mjs from that
// build, with every module it imports, and writes them to public/showroom/vendor/exec/ unchanged,
// plus SOURCE.json (the app commit and each file's SHA-256). The website's own /gfs/ engine is the
// app's release pipeline's to update and is not touched.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

const app = path.resolve(process.argv[2] || '');
if (!fs.existsSync(path.join(app, 'pending/executive-ipad-pencil/apply.mjs'))) { console.error('Give the path to a gfence-app checkout.'); process.exit(1); }
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/showroom/vendor/exec');
const { buildCandidate } = await import(pathToFileURL(path.join(app, 'pending/executive-ipad-pencil/apply.mjs')));
process.chdir(app);
const { files } = await buildCandidate({ allowMissing: true });
const want = ['gfs/fence-engine.mjs'], seen = new Set(), wrote = {};
fs.mkdirSync(out, { recursive: true });
while (want.length) {
  const k = want.shift(); if (seen.has(k)) continue; seen.add(k);
  const v = files.get(k); if (!v || !v.length) throw Error('The app build has no ' + k);
  const buf = Buffer.from(v), name = path.basename(k);
  fs.writeFileSync(path.join(out, name), buf);
  wrote[name] = crypto.createHash('sha256').update(buf).digest('hex');
  for (const m of buf.toString('utf8').matchAll(/(?:import|export)\s[^'"]*?from\s*['"](\.\/[^'"]+)['"]/g)) want.push('gfs/' + m[1].slice(2));
}
const commit = execFileSync('git', ['-C', app, 'rev-parse', 'HEAD']).toString().trim();
fs.writeFileSync(path.join(out, 'SOURCE.json'), JSON.stringify({ from: 'nicholasghareeb99/gfence-app', commit, built: 'buildCandidate({allowMissing:true}) → gfs/fence-engine.mjs and its imports', files: wrote }, null, 2) + '\n');
console.log('Copied', Object.keys(wrote).length, 'files from app commit', commit.slice(0, 10));
