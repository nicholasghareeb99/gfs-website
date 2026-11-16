/* ============================================================
   GFS — FENCE3D LAZY EMBED  v1
   assets/js/fence3d-embed.js
   Requires: gfs-geo-spec.js (loaded first)

   Costs ZERO bytes of Three.js until the visitor taps. The iframe is
   not in the DOM until then, so this can sit on a style page without
   touching LCP. That matters more than usual here: the exec app
   already has an open main-thread saturation defect, and this site is
   where paid traffic lands.

   If the visitor has already drawn their yard in the ballpark tool,
   the render uses THEIR property. Otherwise it falls back to a
   showcase layout. Either way the drawing UX is never repeated -
   that is the whole streamlining idea.
   ============================================================ */
(function () {
  'use strict';

  var GEOM_KEYS = ['gfs_ballpark_draft', 'gfs_geometry', 'gfsBallparkGeometry'];
  var STYLE_KEY = 'gfs_ballpark_style';

  /* Edge's tracking prevention refuses storage access on the live ballpark
     page - 20 blocked reads in one load - and this viewer runs in an iframe
     on a DIFFERENT origin, which is precisely the third-party context that
     prevention targets. So storage is treated as a nice-to-have, never a
     dependency. */
  function _ls(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  /* Three tiers, most reliable first:
       1. in-memory, when the ballpark tool is on this page - no storage at all
       2. localStorage, when the browser permits it
       3. nothing, and we render the showcase
     Tier 1 exists because tier 2 silently fails for a real share of visitors,
     and a feature that quietly does not work is worse than one that visibly
     does not. */
  function storedGeometry() {
    var live = window.GFSBallpark && (window.GFSBallpark.geometry ||
              (typeof window.GFSBallpark.getGeometry === 'function' &&
               window.GFSBallpark.getGeometry()));
    if (live && (Array.isArray(live) || live.runs || live.paths)) return live;

    for (var i = 0; i < GEOM_KEYS.length; i++) {
      var raw = _ls(GEOM_KEYS[i]);
      if (!raw) continue;
      try {
        var parsed = JSON.parse(raw);
        var g = parsed && (parsed.geometry || parsed.runs || parsed.paths || parsed);
        if (g && (Array.isArray(g) || g.runs || g.paths)) return g;
      } catch (e) { /* try the next key */ }
    }
    return null;
  }

  function storedStyle(fallback) {
    var live = window.GFSBallpark && window.GFSBallpark.style;
    return live || _ls(STYLE_KEY) || fallback;
  }

  /* The viewer defaults to 6 ft. Heights derive from pricing-engine style
     NAMES upstream (_styleHeightFt), so parse the name rather than keeping
     a second source of truth. */
  function storedHeight() {
    var name = storedStyle('') || '';
    var m = String(name).match(/(\d+(?:\.\d+)?)\s*(?:ft|foot|feet|')/i);
    return m ? parseFloat(m[1]) : undefined;
  }

  /* Build the viewer URL. Never throws into the click handler: a bad
     stored geometry must degrade to the showcase render, not a dead
     button. */
  /* ?embed=1 is the viewer's OWN flag (fence3d.html: `const EMBED =
     /[?&]embed=1/.test(location.search)`). It adds body.embed and an
     expand-to-new-tab button. Do not invent a second one.

     The spec goes in the HASH, legacy base64 — that is the only thing
     the shipped viewer decodes. A fragment is also never sent to the
     server, which is the right place for a customer's property outline. */
  function viewerURL(base, styleName) {
    var showcase = base + '?embed=1';
    var geom = storedGeometry();
    if (!geom || !window.GFSGeoSpec) return Promise.resolve(showcase);

    var spec;
    try {
      spec = window.GFSGeoSpec.toFence3dSpec(geom, {
        styleName: storedStyle(styleName),
        heightFt: storedHeight()
      });
    } catch (e) {
      if (window.console) console.warn('[fence3d] stored geometry unusable:', e.message);
      return Promise.resolve(showcase);
    }
    // No mode argument: the default is legacy, which is what the viewer reads.
    return window.GFSGeoSpec.encodeSpecAsync(spec)
      .then(function (packed) { return base + '?embed=1#' + packed; })
      .catch(function () { return showcase; });
  }

  function mount(card) {
    if (card.getAttribute('data-loaded') === '1') return;
    card.setAttribute('data-loaded', '1');

    var base = card.getAttribute('data-viewer');
    var styleName = card.getAttribute('data-style') || '6ft Cedar Privacy';
    var overlay = card.querySelector('.fence3d__overlay');
    var btn = card.querySelector('.fence3d__go');

    if (btn) { btn.disabled = true; btn.textContent = 'Loading…'; }

    viewerURL(base, styleName).then(function (url) {
      var frame = document.createElement('iframe');
      frame.className = 'fence3d__frame';
      frame.src = url;
      frame.title = 'Interactive 3D fence preview';
      frame.setAttribute('loading', 'lazy');
      frame.setAttribute('allow', 'fullscreen');
      // The viewer is ours, but it is a different origin. Keep the
      // sandbox tight and grant only what a WebGL viewer needs.
      frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
      // allow-same-origin is required: fence3d loads three.js and reads its
      // own hash. It is our code on our own subdomain, not third-party.
      frame.width = 1280;
      frame.height = 720;

      frame.addEventListener('load', function () {
        card.setAttribute('data-state', 'ready');
      });

      card.appendChild(frame);
      if (overlay) overlay.hidden = true;

      // If the viewer never loads, put the poster back rather than
      // leaving the visitor looking at a blank rectangle.
      setTimeout(function () {
        if (card.getAttribute('data-state') !== 'ready') {
          card.setAttribute('data-state', 'failed');
          if (overlay) overlay.hidden = false;
          if (btn) { btn.disabled = false; btn.textContent = 'Try again'; }
          card.setAttribute('data-loaded', '0');
          if (frame.parentNode) frame.parentNode.removeChild(frame);
        }
      }, 12000);
    });
  }

  function init() {
    var cards = document.querySelectorAll('.fence3d');
    for (var i = 0; i < cards.length; i++) {
      (function (card) {
        var btn = card.querySelector('.fence3d__go');
        if (btn) btn.addEventListener('click', function () { mount(card); });
        // Keyboard: the poster itself is not focusable, the button is.
      })(cards[i]);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GFSFence3D = { mount: mount, storedGeometry: storedGeometry };
})();
