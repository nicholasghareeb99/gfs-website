/* ══════════════════════════════════════════════════════════════════════════
   GFS WEBSITE — READ THE CATALOGUE FROM THE SOURCE
   assets/js/gfs-catalogue.js
   ══════════════════════════════════════════════════════════════════════════

   One place the website gets style names, rates, photos and 3D blueprints:
   settings/public, the trimmed mirror the exec app publishes from
   settings/global. No hardcoded price list on this side, ever — a rate
   that lives in two files is a rate that will disagree with itself, and
   the one the customer sees will be the wrong one.

   settings/global is NOT read here and cannot be: its rule is
   `allow read: if signedIn()` and website visitors are anonymous. That is
   correct and should stay that way — that document holds materialCosts.

   DEGRADES, NEVER BLOCKS. If the mirror is missing or the network is out,
   getStyles() resolves to an empty catalogue and callers show style names
   from the page instead of a broken quote form. A ballpark tool that will
   not load is worse than one without photos.
   ══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GFSCatalogue = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var CACHE_KEY = 'gfs_catalogue_v1';
  var CACHE_MS = 6 * 60 * 60 * 1000;   // 6 h — prices do not move hourly
  var _mem = null;
  var _inflight = null;

  /* Tracking prevention blocks storage on this site today. The cache is an
     optimisation; losing it costs a network round trip, never correctness. */
  function _readCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var c = JSON.parse(raw);
      if (!c || !c._fetchedMs) return null;
      /* Stale cache is still served — see getStyles(). Age only decides
         whether we go to the network, not whether the data is usable. */
      return c;
    } catch (e) { return null; }
  }

  function _writeCache(doc) {
    try {
      doc._fetchedMs = Date.now();
      localStorage.setItem(CACHE_KEY, JSON.stringify(doc));
    } catch (e) { /* private mode, quota — not fatal */ }
  }

  function _empty() {
    return { styleNames: [], photos: {}, styleSpecs: {}, _empty: true };
  }

  /**
   * load(db) -> Promise<catalogue>
   * db: a Firestore instance. Without one, the cache is used alone.
   */
  function load(db) {
    if (_inflight) return _inflight;

    var cached = _readCache();
    var fresh = cached && (Date.now() - cached._fetchedMs) < CACHE_MS;
    if (fresh) { _mem = cached; return Promise.resolve(cached); }

    if (!db) return Promise.resolve(_mem || cached || _empty());

    _inflight = db.collection('settings').doc('public').get()
      .then(function (snap) {
        _inflight = null;
        if (!snap || !snap.exists) {
          /* The mirror has not been published yet. Say so once, plainly —
             this is the single most likely reason the site shows no photos
             and it is invisible otherwise. */
          if (window.console) {
            console.warn('[catalogue] settings/public does not exist. Run ' +
                         'GFSPublicMirror.publish() in the exec app once.');
          }
          return cached || _empty();
        }
        var doc = snap.data() || {};
        doc.styleNames = doc.styleNames || [];
        doc.photos = doc.photos || {};
        doc.styleSpecs = doc.styleSpecs || {};
        _writeCache(doc);
        _mem = doc;
        return doc;
      })
      .catch(function (e) {
        _inflight = null;
        if (window.console) console.warn('[catalogue] read failed:', e && e.message);
        /* Stale beats nothing. A six-month-old rate still quotes closer
           than no rate at all, and the estimate is a ballpark by name. */
        return cached || _empty();
      });

    return _inflight;
  }

  /** Style names only, sorted. This is all the money-adjacent data there is. */
  function styleNames(cat) {
    var n = cat && cat.styleNames;
    return Array.isArray(n) ? n.slice().sort() : [];
  }

  /**
   * estimate({ style, ft, walkGates, driveGates }) -> Promise<{low, high}>
   *
   * There is deliberately no rate() on this side. Per-foot rates are never
   * sent to a browser: the arithmetic happens in
   * netlify/functions/estimate.js, which reads settings/global with admin
   * credentials and returns a BAND. Nothing here can be divided back into a
   * rate card.
   */
  function estimate(req, endpoint) {
    return fetch(endpoint || '/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        style: req.style,
        ft: req.ft,
        walkGates: req.walkGates || 0,
        driveGates: req.driveGates || 0
      })
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.error || r.status); });
      return r.json();
    });
  }

  /** First published photo URL for a style, or null. */
  function photo(cat, styleName) {
    var a = cat && cat.photos && cat.photos[styleName];
    return (a && a.length) ? a[0] : null;
  }

  /**
   * blueprint(cat, styleName) -> the styleSpecs override, or null.
   * Hand this to fence3d as SPEC.ov[styleName] so the website renders the
   * same fence the app renders. Without it the embed falls back to the
   * viewer's built-in geometry — which is the drift the single-viewer
   * decision exists to prevent.
   */
  function blueprint(cat, styleName) {
    return (cat && cat.styleSpecs && cat.styleSpecs[styleName]) || null;
  }

  /** Height in feet parsed from the style NAME, matching _styleHeightFt. */
  function heightFt(styleName) {
    var m = String(styleName || '').match(/(\d+(?:\.\d+)?)\s*(?:ft|foot|feet|')/i);
    return m ? parseFloat(m[1]) : null;
  }

  return {
    load: load,
    styleNames: styleNames,
    estimate: estimate,
    photo: photo,
    blueprint: blueprint,
    heightFt: heightFt,
    CACHE_KEY: CACHE_KEY,
    CACHE_MS: CACHE_MS
  };
});
