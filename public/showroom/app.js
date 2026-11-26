// GFS Showroom — app shell: data, modes, dock, offline, live catalog.
import { $, $$, toast, vt, modal, esc, asset, pageImg } from './ui.mjs';

const VERSION = 'showroom-1.0 (2026-11-25)';
const PUBLIC_CATALOG = 'https://firestore.googleapis.com/v1/projects/ghareeb-fencing/databases/(default)/documents/settings/public?mask.fieldPaths=styleNames&mask.fieldPaths=styleSpecs&mask.fieldPaths=stylePhotos&mask.fieldPaths=styleCodes&mask.fieldPaths=publishedAt';
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
    const raw = await res.json();
    const doc = decodePublicCatalog(raw);
    const names = doc.styleNames || doc.names || [], specs = doc.styleSpecs || doc.specs || null;
    if (names.length) {
      const photos = readPhotos(raw), codes = readCodes(raw);
      app.live = { names, specs, photos, codes, from: 'live', at: new Date().toISOString() };
      try { localStorage.setItem('gfs-showroom-catalog', JSON.stringify({ names, specs, photos, codes, at: app.live.at })); } catch {}
      dispatchEvent(new CustomEvent('showroom:catalog'));
    }
  } catch (e) { console.info('[Showroom] live catalog not loaded:', e.message); }
}

// Style photos come only from the Executive App (settings/public.stylePhotos,
// Firebase Storage stylePhotos/ objects). A style with none shows "No photo available".
const STORAGE = /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/stylePhotos%2F/;
function readPhotos(raw) {
  const out = {}, f = raw?.fields?.stylePhotos?.mapValue?.fields || {};
  for (const [name, v] of Object.entries(f)) {
    const urls = (v?.arrayValue?.values || []).map(x => x?.mapValue?.fields?.url?.stringValue || x?.stringValue).filter(u => typeof u === 'string' && STORAGE.test(u));
    if (urls.length) out[name] = urls.slice(0, 20);
  }
  return out;
}
function readCodes(raw) {
  const out = {}, f = raw?.fields?.styleCodes?.mapValue?.fields || {};
  for (const [name, v] of Object.entries(f)) { const c = v?.stringValue || v?.mapValue?.fields?.code?.stringValue; if (typeof c === 'string' && /^[A-Z0-9-]{3,24}$/.test(c)) out[name] = c; }
  return out;
}
// Executive App photos for a set of style names, first photo of each name first.
app.photosFor = names => {
  const P = app.live.photos || {}, lists = names.map(n => P[n] || []), out = [];
  for (let i = 0; lists.some(l => l[i]); i++) for (const l of lists) if (l[i] && !out.includes(l[i])) out.push(l[i]);
  return out;
};

// Keep cards and page controls clear of the bottom bar, whatever size Safari makes it.
function dockClear() {
  const r = $('.dock').getBoundingClientRect(), side = r.height > r.width;
  document.documentElement.style.setProperty('--dock-clear', side ? 'calc(var(--sab) + 18px)' : Math.ceil(innerHeight - r.top + 10) + 'px');
}
function moveGlow(btn) {
  dockClear();
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
      <dt>Style photos (Exec App)</dt><dd>${Object.values(app.live.photos || {}).reduce((n, l) => n + l.length, 0)}</dd>
      <dt>Fence rules checked</dt><dd>${esc(d.rulesChecked)}</dd>
      <dt>Version</dt><dd>${esc(VERSION)}</dd>
    </dl>
    <div class="row"><span><b>Presentation mode</b><br><small style="color:var(--dim)">Hides this menu so a customer can flip through on their own. To exit, press and hold the logo for 2 seconds.</small></span><button class="btn sm" id="presentGo">Turn on</button></div>
    <p class="src" style="margin:0">The brochure pages and style photos also save to this device on their own when it's online, so most of the showroom works with no signal.</p>
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
      m.querySelector('#presentGo').onclick = () => { close(); present(true); };
    }
  });
}

async function saveOffline(progress, { lite = false } = {}) {
  if (!('caches' in window)) { toast('This browser cannot save files offline.'); return false; }
  const d = app.data, urls = new Set();
  for (const p of d.pages) { urls.add(pageImg(p.n)); if (!lite) urls.add(pageImg(p.n, true)); }
  for (const s of d.styles) for (const u of app.photosFor(s.models).slice(0, lite ? 4 : 12)) urls.add(u);
  for (const u of ['/x3d/fence3d.html', '/gfs/vendor/three.module.js', '/gfs/ar-model.mjs', '/gfs/website-model.mjs', '/gfs/studio-catalog.mjs', '/gfs/model-profiles.mjs', '/gfs/owner-model-corrections.mjs', '/gfs/model-review.mjs', '/gfs/fence-layers.mjs', '/gfs/vendor/usdzexporter.js', '/gfs/vendor/fflate.module.js', '/gfs/vendor/textureutils.js', '/assets/js/studio-public-catalog.mjs', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css']) urls.add(u);
  const cache = await caches.open('gfs-showroom-media-v1'), list = [...urls]; let done = 0, failed = 0;
  const worker = async () => { while (list.length) { const u = list.shift(); try { if (!(await cache.match(u))) { const r = await fetch(u, { mode: u.includes('firebasestorage') ? 'no-cors' : u.startsWith('http') ? 'cors' : 'same-origin' }); if (r.ok || r.type === 'opaque') await cache.put(u, r); else failed++; } } catch { failed++; } progress(++done, urls.size); } };
  await Promise.all(Array.from({ length: lite ? 3 : 6 }, worker));
  try { localStorage.setItem(lite ? 'gfs-showroom-offline-auto' : 'gfs-showroom-offline', lite ? String(Date.now()) : new Date().toLocaleDateString()); } catch {}
  return failed === 0;
}

function splash(replay = false) {
  const s = $('#splash');
  if (replay) { const clone = s.cloneNode(true); s.replaceWith(clone); clone.classList.remove('done'); setTimeout(() => clone.classList.add('done'), 2300); clone.onclick = () => clone.classList.add('done'); return; }
  s.onclick = () => s.classList.add('done');
}

// Presentation mode: no menu, so a customer can flip through on their own.
function present(on) {
  document.body.classList.toggle('present', on);
  try { on ? localStorage.setItem('gfs-showroom-present', '1') : localStorage.removeItem('gfs-showroom-present'); } catch {}
  toast(on ? 'Presentation mode on. Hold the logo for 2 seconds to exit.' : 'Presentation mode off');
}
function bindPresentExit() {
  const logo = $('.top .brand'); let t = 0;
  const down = () => { if (!document.body.classList.contains('present')) return; t = setTimeout(() => present(false), 2000); };
  const up = () => clearTimeout(t);
  logo.addEventListener('pointerdown', down); logo.addEventListener('pointerup', up); logo.addEventListener('pointerleave', up); logo.addEventListener('pointercancel', up);
}
// Save the brochure and photos on their own about once a week while online.
function autoOffline() {
  if (autoOffline.ran) return; autoOffline.ran = true;
  if (!navigator.onLine || !('caches' in window)) return;
  try { if (Date.now() - (+localStorage.getItem('gfs-showroom-offline-auto') || 0) < 7 * 864e5) return; } catch { return; }
  navigator.storage?.persist?.().catch(() => {});
  const go = () => saveOffline(() => {}, { lite: true }).catch(() => {});
  ('requestIdleCallback' in window) ? setTimeout(() => requestIdleCallback(go, { timeout: 20000 }), 12000) : setTimeout(go, 15000);
}

function net() { $('#netDot').classList.toggle('off', !navigator.onLine); }

async function boot() {
  splash(); net();
  addEventListener('online', net); addEventListener('offline', net);
  const t0 = performance.now();
  try { await loadData(); } catch (e) { $('#splash .sub').textContent = e.message; return; }
  loadLiveCatalog();
  const { initVisit } = await import('./visit.mjs'); initVisit(app);
  bindPresentExit(); try { if (localStorage.getItem('gfs-showroom-present')) document.body.classList.add('present'); } catch {}
  for (const b of $$('.dock button')) b.onclick = () => app.go(b.dataset.mode);
  $('#btnMenu').onclick = settings;
  $('#btnSearch').onclick = () => app.go('brochure', { overview: true, focus: true });
  addEventListener('resize', () => { const b = $('.dock button[aria-current=page]'); if (b) moveGlow(b); });
  visualViewport?.addEventListener('resize', dockClear);
  const m = (location.hash.match(/^#(brochure|styles|ar|permits)(?:-(\d+))?/) || []);
  let start = m[1]; try { start ||= localStorage.getItem('gfs-showroom-mode'); } catch {}
  setBar(.7);
  await app.go(start || 'brochure', m[2] ? { page: +m[2] } : {});
  setBar(1);
  const wait = Math.max(0, 1900 - (performance.now() - t0));
  setTimeout(() => $('#splash').classList.add('done'), wait);
  addEventListener('showroom:catalog', autoOffline, { once: true }); setTimeout(autoOffline, 30000);
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js', { scope: './' }).catch(e => console.info('[Showroom] service worker:', e.message));
}
boot();
