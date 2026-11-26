// GFS Showroom — app shell: data, modes, dock, offline, live catalog.
import { $, $$, toast, vt, modal, esc, asset, pageImg } from './ui.mjs';

const VERSION = 'showroom-1.0 (2026-11-25)';
const PUBLIC_CATALOG = 'https://firestore.googleapis.com/v1/projects/ghareeb-fencing/databases/(default)/documents/settings/public?mask.fieldPaths=styleNames&mask.fieldPaths=styleSpecs&mask.fieldPaths=publishedAt';
const modes = {};
const loaders = {
  brochure: () => import('./brochure.mjs'),
  styles: () => import('./styles.mjs'),
  ar: () => import('./ar.mjs'),
  permits: () => import('./permits.mjs')
};
const app = { data: null, mode: null, live: { names: null, specs: null, from: 'built-in' }, version: VERSION };
window.GFSShowroom = app;

const bar = $('#splashBar');
const setBar = p => { if (bar) bar.style.width = Math.round(p * 100) + '%'; };

async function loadData() {
  setBar(.15);
  const res = await fetch('data.json', { cache: 'no-cache' }).catch(() => null) || await caches.match('data.json');
  if (!res || !res.ok) throw Error('Showroom data could not load.');
  const data = await res.json();
  data.photoById = Object.fromEntries(data.photos.map(p => [p.id, p]));
  data.styleById = Object.fromEntries(data.styles.map(s => [s.id, s]));
  data.familyById = Object.fromEntries(data.families.map(f => [f.id, f]));
  data.page = n => data.pages[n - 1];
  app.data = data; setBar(.45);
}

// Same published visual catalog the website and Executive App use (names and
// 3D specs only — the public document never carries prices).
async function loadLiveCatalog() {
  try {
    const cached = JSON.parse(localStorage.getItem('gfs-showroom-catalog') || 'null');
    if (cached?.names?.length) app.live = { ...cached, from: 'saved copy' };
  } catch {}
  try {
    const { decodePublicCatalog } = await import('/assets/js/studio-public-catalog.mjs');
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), 8000);
    const res = await fetch(PUBLIC_CATALOG, { signal: ctl.signal }); clearTimeout(timer);
    if (!res.ok) throw Error('HTTP ' + res.status);
    const doc = decodePublicCatalog(await res.json());
    const names = doc.styleNames || doc.names || [], specs = doc.styleSpecs || doc.specs || null;
    if (names.length) {
      app.live = { names, specs, from: 'live', at: new Date().toISOString() };
      try { localStorage.setItem('gfs-showroom-catalog', JSON.stringify({ names, specs, at: app.live.at })); } catch {}
      dispatchEvent(new CustomEvent('showroom:catalog'));
    }
  } catch (e) { console.info('[Showroom] live catalog not loaded:', e.message); }
}

function moveGlow(btn) {
  const glow = $('.dock .glow'), dock = $('.dock');
  const r = btn.getBoundingClientRect(), d = dock.getBoundingClientRect();
  glow.style.transform = `translate(${r.left - d.left - 6}px,${r.top - d.top - 6}px)`;
}

app.go = async function go(mode, opts = {}) {
  if (!loaders[mode]) mode = 'brochure';
  if (!modes[mode]) {
    const mod = await loaders[mode]();
    modes[mode] = mod; await mod.init(app, $('#v-' + mode));
  }
  const prev = app.mode;
  const swap = () => {
    for (const v of $$('.view')) v.classList.toggle('on', v.id === 'v-' + mode);
    document.body.classList.remove('chrome-hidden');
    app.mode = mode;
    for (const b of $$('.dock button')) b.setAttribute('aria-current', b.dataset.mode === mode ? 'page' : 'false');
    moveGlow($(`.dock button[data-mode="${mode}"]`));
    if (prev && prev !== mode) modes[prev]?.hide?.();
    modes[mode].show?.(opts);
  };
  if (prev && prev !== mode) await vt(swap); else swap();
  const hash = '#' + mode + (opts.page ? '-' + opts.page : '');
  if (location.hash !== hash) history.replaceState(null, '', hash);
  try { localStorage.setItem('gfs-showroom-mode', mode); } catch {}
};

function settings() {
  const d = app.data, online = navigator.onLine;
  const { close } = modal(`
    <div class="row"><h2>Showroom</h2><button class="iconbtn" data-close aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>
    <p style="margin:0;color:var(--dim)">Save the brochure, photos and 3D files to this iPad or iPhone so the showroom works in yards with no signal.</p>
    <div class="meter"><i id="offMeter"></i></div>
    <div class="row"><span class="mono" id="offText" style="font-size:13px;color:var(--dim)">Not saved yet</span><button class="btn primary sm" id="offGo">Save for offline</button></div>
    <dl class="kv">
      <dt>Connection</dt><dd>${online ? 'Online' : 'Offline'}</dd>
      <dt>Style catalog</dt><dd>${esc(app.live.from)} · ${(app.live.names || d.models).length} models</dd>
      <dt>Brochure</dt><dd>${d.pages.length} pages</dd>
      <dt>Project photos</dt><dd>${d.photos.length}</dd>
      <dt>Fence rules checked</dt><dd>${esc(d.rulesChecked)}</dd>
      <dt>Version</dt><dd>${esc(VERSION)}</dd>
    </dl>
    <button class="btn ghost sm" id="replay">Replay intro</button>`, {
    onOpen: (m) => {
      const meter = m.querySelector('#offMeter'), text = m.querySelector('#offText');
      try { const saved = localStorage.getItem('gfs-showroom-offline'); if (saved) { text.textContent = 'Saved ' + saved; meter.style.width = '100%'; } } catch {}
      m.querySelector('#offGo').onclick = async e => {
        e.target.disabled = true;
        const ok = await saveOffline((done, total) => { meter.style.width = (done / total * 100).toFixed(1) + '%'; text.textContent = `${done} of ${total} files`; });
        text.textContent = ok ? 'Saved for offline use' : 'Some files could not be saved. Try again on Wi-Fi.';
        e.target.disabled = false;
      };
      m.querySelector('#replay').onclick = () => { close(); splash(true); };
    }
  });
}

async function saveOffline(progress) {
  if (!('caches' in window)) { toast('This browser cannot save files offline.'); return false; }
  const d = app.data, urls = new Set();
  for (const p of d.pages) { urls.add(pageImg(p.n)); urls.add(pageImg(p.n, true)); }
  for (const p of d.photos) { urls.add(asset(p.th)); }
  for (const s of d.styles) for (const id of s.photos.slice(0, 12)) { const p = d.photoById[id]; if (p) urls.add(asset(p.full)); }
  for (const u of ['/x3d/fence3d.html', '/gfs/vendor/three.module.js', '/gfs/ar-model.mjs', '/gfs/website-model.mjs', '/gfs/studio-catalog.mjs', '/gfs/model-profiles.mjs', '/gfs/owner-model-corrections.mjs', '/gfs/model-review.mjs', '/gfs/fence-layers.mjs', '/gfs/vendor/usdzexporter.js', '/gfs/vendor/fflate.module.js', '/gfs/vendor/textureutils.js', '/assets/js/studio-public-catalog.mjs', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css']) urls.add(u);
  const cache = await caches.open('gfs-showroom-media-v1'), list = [...urls]; let done = 0, failed = 0;
  const worker = async () => { while (list.length) { const u = list.shift(); try { if (!(await cache.match(u))) { const r = await fetch(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin' }); if (r.ok) await cache.put(u, r); else failed++; } } catch { failed++; } progress(++done, urls.size); } };
  await Promise.all(Array.from({ length: 6 }, worker));
  try { localStorage.setItem('gfs-showroom-offline', new Date().toLocaleDateString()); } catch {}
  return failed === 0;
}

function splash(replay = false) {
  const s = $('#splash');
  if (replay) { const clone = s.cloneNode(true); s.replaceWith(clone); clone.classList.remove('done'); setTimeout(() => clone.classList.add('done'), 2300); clone.onclick = () => clone.classList.add('done'); return; }
  s.onclick = () => s.classList.add('done');
}

function net() { $('#netDot').classList.toggle('off', !navigator.onLine); }

async function boot() {
  splash(); net();
  addEventListener('online', net); addEventListener('offline', net);
  const t0 = performance.now();
  try { await loadData(); } catch (e) { $('#splash .sub').textContent = e.message; return; }
  loadLiveCatalog();
  for (const b of $$('.dock button')) b.onclick = () => app.go(b.dataset.mode);
  $('#btnMenu').onclick = settings;
  $('#btnSearch').onclick = () => app.go('brochure', { overview: true, focus: true });
  addEventListener('resize', () => { const b = $('.dock button[aria-current=page]'); if (b) moveGlow(b); });
  const m = (location.hash.match(/^#(brochure|styles|ar|permits)(?:-(\d+))?/) || []);
  let start = m[1]; try { start ||= localStorage.getItem('gfs-showroom-mode'); } catch {}
  setBar(.7);
  await app.go(start || 'brochure', m[2] ? { page: +m[2] } : {});
  setBar(1);
  const wait = Math.max(0, 1900 - (performance.now() - t0));
  setTimeout(() => $('#splash').classList.add('done'), wait);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { scope: './' }).catch(e => console.info('[Showroom] service worker:', e.message));
}
boot();
