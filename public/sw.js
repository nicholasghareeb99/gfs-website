/* GFS WEBSITE — SERVICE WORKER CLEANUP
   The Executive app was briefly deployed on this origin and registered
   a service worker with an app-shell cache. This worker replaces it on
   the browser's next update check: it wipes every cache, takes control
   immediately, unregisters itself, and reloads controlled tabs so
   visitors land on the live network version of the website. */
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
    } catch (err) {}
    try { await self.registration.unregister(); } catch (err) {}
    try {
      const clientsList = await self.clients.matchAll({ type: 'window' });
      clientsList.forEach((c) => { try { c.navigate(c.url); } catch (err) {} });
    } catch (err) {}
  })());
});
/* no fetch handler: while momentarily active, everything passes straight
   through to the network. */
