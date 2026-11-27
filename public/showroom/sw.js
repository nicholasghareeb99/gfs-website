/* GFS Showroom service worker. Scope: /showroom/ only (the website itself has no worker).
   Shell: network first so updates arrive, cache as fallback for no-signal yards.
   Brochure pages, photos and fonts: cache first (they are versioned by file name).
   "Save for offline" in the app fills gfs-showroom-media-v1 ahead of time. */
const SHELL = 'gfs-showroom-shell-v23', MEDIA = 'gfs-showroom-media-v1';
const CORE = ['./', 'index.html', 'app.css?v=12', 'app.js?v=11', 'ui.mjs', 'photos.mjs', 'brochure.mjs', 'styles.mjs', 'ar.mjs', 'permits.mjs', 'blueprint.mjs', 'visit.mjs', 'reviews.mjs', 'siteplan.mjs', 'lab.mjs', 'lab3d-ok.mjs', 'frost-plan.mjs', 'build-plan.mjs', 'gate-plan.mjs', 'vinyl-plan.mjs', 'wind-plan.mjs', 'gradelab.mjs', 'help.mjs', 'data.json', 'logo-white.png', 'icon-192.png', 'manifest.webmanifest',
  '/assets/fonts/archivo-latin-wght-normal.woff2', '/assets/fonts/source-sans-3-latin-wght-normal.woff2', '/assets/fonts/ibm-plex-mono-latin-500-normal.woff2', '/assets/fonts/ibm-plex-mono-latin-400-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith('gfs-showroom-') && ![SHELL, MEDIA, 'gfs-showroom-blueprints-v1'].includes(k)) await caches.delete(k); await self.clients.claim(); })()); });
let slowUntil = 0;
// waitUntil after an await can throw in some Safari versions; never let that break a response.
const keep = (e, p) => { p.catch(() => {}); try { e.waitUntil(p.catch(() => {})); } catch {} };
const cacheFirst = /\/assets\/(brochure|img|fonts|data)\/|\/images\/|unpkg\.com\/leaflet|firebasestorage\.googleapis\.com\/v0\/b\/[^/]+\/o\/stylePhotos/;
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/.netlify/') || url.hostname.includes('firestore') || url.hostname.includes('arcgis') || url.hostname.includes('nominatim') || url.hostname.includes('overpass')) return;
  if (cacheFirst.test(req.url)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if ((res.ok && url.origin === location.origin) || res.type === 'opaque' || (res.ok && url.hostname === 'firebasestorage.googleapis.com')) { const copy = res.clone(); caches.open(MEDIA).then(c => c.put(req, copy)); } return res; })));
    return;
  }
  if (url.origin !== location.origin) return;
  // Network first so updates arrive, but a weak signal can't hold the app hostage:
  // after 3.5 s with no answer, use the saved copy and let the download finish in the background.
  const fresh = fetch(req).then(res => { if (res.ok && (url.pathname.startsWith('/showroom/') || url.pathname.startsWith('/gfs/') || url.pathname.startsWith('/x3d/'))) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)).catch(() => {}); } return res; });
  const saved = () => caches.match(req, { ignoreSearch: url.pathname.startsWith('/showroom/') });
  e.respondWith((async () => {
    try {
      if (Date.now() < slowUntil) { const hit = await saved(); if (hit) { keep(e, fresh); return hit; } }
      const first = await Promise.race([fresh, new Promise(r => setTimeout(r, 3500, 'slow'))]);
      if (first !== 'slow') { slowUntil = 0; return first; }
      slowUntil = Date.now() + 30000; // the signal is weak: use saved files for the next 30 s
      const hit = await saved(); if (hit) { keep(e, fresh); return hit; }
      return await fresh;
    } catch { return (await saved()) || (req.mode === 'navigate' ? (await caches.match('index.html')) || Response.error() : Response.error()); }
  })());
});
