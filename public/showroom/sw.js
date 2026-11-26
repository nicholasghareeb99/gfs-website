/* GFS Showroom service worker. Scope: /showroom/ only (the website itself has no worker).
   Shell: network first so updates arrive, cache as fallback for no-signal yards.
   Brochure pages, photos and fonts: cache first (they are versioned by file name).
   "Save for offline" in the app fills gfs-showroom-media-v1 ahead of time. */
const SHELL = 'gfs-showroom-shell-v5', MEDIA = 'gfs-showroom-media-v1';
const CORE = ['./', 'index.html', 'app.css?v=3', 'app.js?v=3', 'ui.mjs', 'photos.mjs', 'brochure.mjs', 'styles.mjs', 'ar.mjs', 'permits.mjs', 'blueprint.mjs', 'visit.mjs', 'reviews.mjs', 'siteplan.mjs', 'lab.mjs', 'gradelab.mjs', 'data.json', 'logo-white.png', 'icon-192.png', 'manifest.webmanifest',
  '/assets/fonts/archivo-latin-wght-normal.woff2', '/assets/fonts/source-sans-3-latin-wght-normal.woff2', '/assets/fonts/ibm-plex-mono-latin-500-normal.woff2', '/assets/fonts/ibm-plex-mono-latin-400-normal.woff2'];
self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil((async () => { for (const k of await caches.keys()) if (k.startsWith('gfs-showroom-') && ![SHELL, MEDIA, 'gfs-showroom-blueprints-v1'].includes(k)) await caches.delete(k); await self.clients.claim(); })()); });
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
  e.respondWith(fetch(req).then(res => { if (res.ok && (url.pathname.startsWith('/showroom/') || url.pathname.startsWith('/gfs/') || url.pathname.startsWith('/x3d/'))) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); } return res; })
    .catch(() => caches.match(req, { ignoreSearch: url.pathname.startsWith('/showroom/') }).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
});
