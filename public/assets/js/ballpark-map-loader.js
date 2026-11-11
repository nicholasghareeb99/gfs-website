/* Map libraries are requested only after the visitor opens the drawing tool. */
(function () {
  'use strict';
  const pending = new Map();
  function resource(url, kind, integrity) {
    if (pending.has(url)) return pending.get(url);
    const promise = new Promise((resolve, reject) => {
      const node = document.createElement(kind === 'css' ? 'link' : 'script');
      if (kind === 'css') { node.rel = 'stylesheet'; node.href = url; }
      else { node.src = url; node.async = true; }
      if (integrity) { node.integrity = integrity; node.crossOrigin = ''; }
      let timer;
      const finish = error => {
        clearTimeout(timer); node.onload = node.onerror = null;
        if (error) { node.remove(); reject(error); } else resolve();
      };
      node.onload = () => finish();
      node.onerror = () => finish(new Error('Map resource unavailable'));
      timer = setTimeout(() => finish(new Error('Map resource timed out')), 8000);
      document.head.appendChild(node);
    });
    pending.set(url, promise);
    promise.catch(() => pending.delete(url));
    return promise;
  }
  let googleRequest, leafletRequest;
  function loadGoogle() {
    if (window.GFS_GOOGLE_MAPS_AUTH_FAILED || window.GFS_GOOGLE_MAPS_LOAD_FAILED) return Promise.resolve(false);
    if (googleRequest) return googleRequest;
    if (!window.GFS_GOOGLE_MAPS_KEY) return Promise.resolve(false);
    if (window.google?.maps?.Map && window.google.maps.geometry?.spherical && window.google.maps.places) return Promise.resolve(true);
    googleRequest = new Promise(resolve => {
      let settled = false, timer;
      const script = document.createElement('script');
      const finish = ready => {
        if (settled) return;
        settled = true; clearTimeout(timer);
        script.onerror = null;
        resolve(ready);
      };
      window.GFSBallparkGoogleReady = () => finish(!!(window.google?.maps?.Map && window.google.maps.geometry?.spherical && window.google.maps.places));
      const previousAuthFailure = window.gm_authFailure;
      window.gm_authFailure = () => {
        const firstFailure = !window.GFS_GOOGLE_MAPS_AUTH_FAILED;
        window.GFS_GOOGLE_MAPS_AUTH_FAILED = true;
        finish(false);
        if (firstFailure && typeof window.dispatchEvent === 'function') window.dispatchEvent(new Event('gfs-gmaps-auth-failed'));
        if (typeof previousAuthFailure === 'function') previousAuthFailure();
      };
      script.async = true;
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(window.GFS_GOOGLE_MAPS_KEY) + '&libraries=places,geometry&v=weekly&loading=async&callback=GFSBallparkGoogleReady';
      script.onerror = () => { window.GFS_GOOGLE_MAPS_LOAD_FAILED = true; finish(false); };
      timer = setTimeout(() => finish(false), 8000);
      document.head.appendChild(script);
    });
    return googleRequest;
  }
  function loadLeaflet() {
    if (leafletRequest) return leafletRequest;
    leafletRequest = Promise.all([
      resource('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'css', 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY='),
      resource('https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.css', 'css'),
      (async () => {
        if (!window.L) await resource('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'js', 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=');
        if (!window.L?.Edit?.Poly) await resource('https://unpkg.com/leaflet-draw@1.0.4/dist/leaflet.draw.js', 'js');
        if (!window.L?.Edit?.Poly) throw new Error('Map drawing library unavailable');
      })()
    ]).catch(error => { leafletRequest = null; throw error; });
    return leafletRequest;
  }
  window.GFSBallparkMapLoader = { loadGoogle, loadLeaflet };
})();
