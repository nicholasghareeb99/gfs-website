/* ══════════════════════════════════════════════════════════════════════════
   GFS — SITE PLAN
   assets/js/gfs-siteplan.js
   ══════════════════════════════════════════════════════════════════════════

   The third thing the customer's drawing produces. Same polyline:

       fence3d.html   what it will look like        (customer)
       gfs-takeoff    what it takes to build        (supplier order)
       this file      where it goes                 (crew, job folder)

   Output is a self-contained SVG string. No dependencies, no canvas, no
   fonts to load — so it renders in the browser, prints to 8.5x11, drops
   into a proposal PDF, and can be generated server-side if that is ever
   useful. Deterministic for a given spec, which is what makes it testable.

   NORTH IS UP. The adapter puts north at -z, and SVG y grows downward, so
   plotting y = z lands north at the top with no extra transform. Written
   down because a plan with the wrong orientation looks completely fine.

   ON NaN
   A single NaN inside a path's `d` attribute makes the browser drop the
   whole path — silently, no console error, just nothing drawn. That is the
   same failure that made the To-Sketch import produce garbage, so every
   number here goes through fixed() and there is a test asserting no path
   contains "NaN".
   ══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GFSSitePlan = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var PAGE = { w: 1100, h: 850 };        // 8.5x11 landscape at 100dpi-ish
  var MARGIN = 64;
  var TITLE_H = 96;

  function fixed(n, dp) {
    var v = Number(n);
    if (!isFinite(v)) throw new RangeError('site plan: non-finite coordinate');
    return v.toFixed(dp == null ? 2 : dp);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function bounds(lines) {
    var b = { x1: Infinity, x2: -Infinity, z1: Infinity, z2: -Infinity };
    lines.forEach(function (L) {
      b.x1 = Math.min(b.x1, L.x1, L.x2); b.x2 = Math.max(b.x2, L.x1, L.x2);
      b.z1 = Math.min(b.z1, L.z1, L.z2); b.z2 = Math.max(b.z2, L.z1, L.z2);
    });
    if (!isFinite(b.x1)) throw new RangeError('site plan: no drawable lines');
    /* A perfectly straight fence has zero depth. Give it some, or the scale
       divides by zero and nothing renders. */
    if (b.x2 - b.x1 < 1) { b.x1 -= 5; b.x2 += 5; }
    if (b.z2 - b.z1 < 1) { b.z1 -= 5; b.z2 += 5; }
    return b;
  }

  /** A round number of feet per grid square, chosen for the drawing size. */
  function niceStep(spanFt) {
    var raw = spanFt / 8;
    var steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
    for (var i = 0; i < steps.length; i++) if (steps[i] >= raw) return steps[i];
    return 1000;
  }

  /**
   * render(spec, opts) -> SVG string
   * spec: the fence3d spec — { lines, gates, style, job, addr }
   * opts.takeoff: output of GFSTakeoff.takeoff(), for the title block
   */
  function render(spec, opts) {
    opts = opts || {};
    spec = spec || {};
    var lines = spec.lines || [];
    if (!lines.length) throw new RangeError('site plan: spec has no lines');
    var gates = spec.gates || [];
    var t = opts.takeoff || null;

    var b = bounds(lines);
    var padFt = Math.max(6, (b.x2 - b.x1 + b.z2 - b.z1) * 0.06);
    b.x1 -= padFt; b.x2 += padFt; b.z1 -= padFt; b.z2 += padFt;

    var drawW = PAGE.w - MARGIN * 2;
    var drawH = PAGE.h - MARGIN * 2 - TITLE_H;
    var scale = Math.min(drawW / (b.x2 - b.x1), drawH / (b.z2 - b.z1));

    /* Centre the plan in the drawing area. */
    var offX = MARGIN + (drawW - (b.x2 - b.x1) * scale) / 2;
    var offY = MARGIN + (drawH - (b.z2 - b.z1) * scale) / 2;
    var px = function (x) { return offX + (x - b.x1) * scale; };
    var py = function (z) { return offY + (z - b.z1) * scale; };

    var out = [];
    out.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + PAGE.w + ' ' + PAGE.h +
             '" width="' + PAGE.w + '" height="' + PAGE.h + '" role="img" ' +
             'aria-label="Fence site plan">');
    out.push('<style>' +
      '.pl-bg{fill:#FBFAF7}.pl-grid{stroke:#D9D4C8;stroke-width:.5}' +
      '.pl-fence{stroke:#0E1720;stroke-width:3.5;fill:none;stroke-linecap:round;stroke-linejoin:round}' +
      '.pl-gate{stroke:#A4552B;stroke-width:3.5;fill:none;stroke-linecap:round}' +
      '.pl-swing{stroke:#A4552B;stroke-width:1;fill:none;stroke-dasharray:4 3;opacity:.75}' +
      '.pl-post{fill:#0E1720}.pl-corner{fill:#A4552B}' +
      '.pl-dim{stroke:#7A7466;stroke-width:.75}' +
      '.pl-t{font-family:Archivo,system-ui,sans-serif;fill:#0E1720}' +
      '.pl-m{font-family:"IBM Plex Mono",ui-monospace,monospace;fill:#4A463C}' +
      '</style>');
    out.push('<rect class="pl-bg" x="0" y="0" width="' + PAGE.w + '" height="' + PAGE.h + '"/>');

    /* ── grid ── */
    var step = niceStep(Math.max(b.x2 - b.x1, b.z2 - b.z1));
    var g = [];
    for (var gx = Math.ceil(b.x1 / step) * step; gx <= b.x2; gx += step) {
      g.push('M' + fixed(px(gx)) + ' ' + fixed(offY) +
             'V' + fixed(offY + (b.z2 - b.z1) * scale));
    }
    for (var gz = Math.ceil(b.z1 / step) * step; gz <= b.z2; gz += step) {
      g.push('M' + fixed(offX) + ' ' + fixed(py(gz)) +
             'H' + fixed(offX + (b.x2 - b.x1) * scale));
    }
    out.push('<path class="pl-grid" d="' + g.join('') + '"/>');

    /* ── gate openings punched out of the fence lines ──
       Drawn as gaps, not as lines on top, because a plan that shows a
       continuous fence through a gate is a plan somebody will build. */
    var segs = [];
    lines.forEach(function (L) {
      var dx = L.x2 - L.x1, dz = L.z2 - L.z1;
      var len = Math.hypot(dx, dz) || 1;
      var cuts = [];
      gates.forEach(function (gt) {
        var t0 = ((gt.x - L.x1) * dx + (gt.z - L.z1) * dz) / (len * len);
        var half = (gt.ft || 4) / 2 / len;
        var cx = L.x1 + t0 * dx, cz = L.z1 + t0 * dz;
        if (Math.hypot(gt.x - cx, gt.z - cz) > 3) return;   // gate is not on this run
        if (t0 < -0.02 || t0 > 1.02) return;
        cuts.push([Math.max(0, t0 - half), Math.min(1, t0 + half)]);
      });
      cuts.sort(function (a, c) { return a[0] - c[0]; });
      var cursor = 0;
      cuts.forEach(function (c) {
        if (c[0] > cursor) segs.push([cursor, c[0], L]);
        cursor = Math.max(cursor, c[1]);
      });
      if (cursor < 1) segs.push([cursor, 1, L]);
    });

    var d = segs.map(function (s) {
      var L = s[2], dx = L.x2 - L.x1, dz = L.z2 - L.z1;
      return 'M' + fixed(px(L.x1 + s[0] * dx)) + ' ' + fixed(py(L.z1 + s[0] * dz)) +
             'L' + fixed(px(L.x1 + s[1] * dx)) + ' ' + fixed(py(L.z1 + s[1] * dz));
    }).join('');
    out.push('<path class="pl-fence" d="' + d + '"/>');

    /* ── gates: the opening plus a swing arc ── */
    gates.forEach(function (gt, i) {
      var ft = gt.ft || 4, rot = gt.rot || 0;
      var ex = gt.x + Math.cos(rot) * ft, ez = gt.z + Math.sin(rot) * ft;
      out.push('<path class="pl-gate" d="M' + fixed(px(gt.x)) + ' ' + fixed(py(gt.z)) +
               'L' + fixed(px(ex)) + ' ' + fixed(py(ez)) + '"/>');
      /* The leaf swings 90 degrees off the run. */
      var sx = gt.x + Math.cos(rot - Math.PI / 2) * ft;
      var sz = gt.z + Math.sin(rot - Math.PI / 2) * ft;
      out.push('<path class="pl-swing" d="M' + fixed(px(ex)) + ' ' + fixed(py(ez)) +
               'A' + fixed(ft * scale) + ' ' + fixed(ft * scale) + ' 0 0 0 ' +
               fixed(px(sx)) + ' ' + fixed(py(sz)) + '"/>');
      /* Gate and run labels both wanted the midpoint of the run, because a
         gate is usually near the middle of a run. They landed on top of each
         other and the plan was unreadable — caught by looking at it, not by
         any assertion. Both now sit perpendicular to the line, on OPPOSITE
         sides, so they cannot collide however the yard is drawn. */
      var mx = (gt.x + ex) / 2, mz = (gt.z + ez) / 2;
      var gl = Math.hypot(ex - gt.x, ez - gt.z) || 1;
      var gnx = -(ez - gt.z) / gl, gnz = (ex - gt.x) / gl;   // unit normal
      var GOFF = 16 / scale;                                  // 16px, in feet
      out.push('<text class="pl-m" x="' + fixed(px(mx + gnx * GOFF)) + '" y="' +
               fixed(py(mz + gnz * GOFF) + 4) +
               '" font-size="11" text-anchor="middle">' +
               esc(ft + "' " + (ft > 6 ? 'DRIVE' : 'WALK')) + '</text>');
    });

    /* ── posts: terminals and corners only. Plotting every line post at
       8 ft on center turns a 700 ft plan into a dotted mess. ── */
    var seen = {};
    function post(x, z, corner) {
      var k = fixed(x, 1) + ',' + fixed(z, 1);
      if (seen[k]) return;
      seen[k] = 1;
      out.push('<circle class="' + (corner ? 'pl-corner' : 'pl-post') + '" cx="' +
               fixed(px(x)) + '" cy="' + fixed(py(z)) + '" r="' + (corner ? 4 : 3) + '"/>');
    }
    lines.forEach(function (L, i) {
      var joinedStart = i > 0 &&
        Math.abs(lines[i - 1].x2 - L.x1) < 0.5 && Math.abs(lines[i - 1].z2 - L.z1) < 0.5;
      post(L.x1, L.z1, joinedStart);
      post(L.x2, L.z2, false);
    });

    /* ── run dimensions ── */
    lines.forEach(function (L) {
      var ft = L.ft > 0 ? L.ft : Math.hypot(L.x2 - L.x1, L.z2 - L.z1);
      if (ft < 6) return;                       // too short to label legibly
      var dxl = L.x2 - L.x1, dzl = L.z2 - L.z1;
      var ll = Math.hypot(dxl, dzl) || 1;
      /* If a gate sits near the middle of this run, slide the dimension to
         the quarter point so the two never crowd each other. */
      var tPos = 0.5;
      for (var gi = 0; gi < gates.length; gi++) {
        var gt2 = gates[gi];
        var tg = ((gt2.x - L.x1) * dxl + (gt2.z - L.z1) * dzl) / (ll * ll);
        var perp = Math.abs((gt2.x - L.x1) * (-dzl / ll) + (gt2.z - L.z1) * (dxl / ll));
        if (perp < 3 && tg > 0.3 && tg < 0.7) { tPos = 0.25; break; }
      }
      var mx = L.x1 + tPos * dxl, mz = L.z1 + tPos * dzl;
      /* Opposite normal to the gate label. */
      var nx2 = (dzl) / ll, nz2 = -(dxl) / ll;
      var DOFF = 14 / scale;
      var lx = px(mx + nx2 * DOFF), ly = py(mz + nz2 * DOFF);
      var ang = Math.atan2(dzl, dxl) * 180 / Math.PI;
      if (ang > 90 || ang < -90) ang += 180;    // keep text upright
      out.push('<text class="pl-m" x="' + fixed(lx) + '" y="' + fixed(ly + 4) +
               '" font-size="12" text-anchor="middle" transform="rotate(' + fixed(ang, 1) +
               ' ' + fixed(lx) + ' ' + fixed(ly) + ')">' +
               esc(Math.round(ft) + "'") + '</text>');
    });

    /* ── north arrow ── */
    var nx = PAGE.w - MARGIN - 26, ny = MARGIN + 34;
    out.push('<path class="pl-fence" style="stroke-width:2" d="M' + fixed(nx) + ' ' +
             fixed(ny + 22) + 'V' + fixed(ny - 14) + '"/>');
    out.push('<path d="M' + fixed(nx) + ' ' + fixed(ny - 20) + 'l6 12h-12z" fill="#0E1720"/>');
    out.push('<text class="pl-t" x="' + fixed(nx) + '" y="' + fixed(ny + 38) +
             '" font-size="13" font-weight="700" text-anchor="middle">N</text>');

    /* ── scale bar ── */
    var barFt = step;
    var bx = MARGIN, by = PAGE.h - TITLE_H - 26;
    out.push('<path class="pl-dim" d="M' + fixed(bx) + ' ' + fixed(by) + 'h' +
             fixed(barFt * scale) + 'M' + fixed(bx) + ' ' + fixed(by - 5) + 'v10M' +
             fixed(bx + barFt * scale) + ' ' + fixed(by - 5) + 'v10"/>');
    out.push('<text class="pl-m" x="' + fixed(bx + barFt * scale / 2) + '" y="' +
             fixed(by - 10) + '" font-size="11" text-anchor="middle">' +
             esc(barFt + " ft") + '</text>');

    /* ── title block ── */
    var ty = PAGE.h - TITLE_H + 8;
    out.push('<path class="pl-dim" d="M' + MARGIN + ' ' + fixed(ty - 14) + 'H' +
             fixed(PAGE.w - MARGIN) + '"/>');
    out.push('<text class="pl-t" x="' + MARGIN + '" y="' + fixed(ty + 10) +
             '" font-size="17" font-weight="700">' +
             esc(opts.company || 'Ghareeb Fencing Solutions') + ' — Site Plan</text>');
    var sub = [spec.job, spec.addr, spec.style].filter(Boolean).join('  ·  ');
    out.push('<text class="pl-m" x="' + MARGIN + '" y="' + fixed(ty + 32) +
             '" font-size="12">' + esc(sub) + '</text>');

    if (t) {
      var facts = [
        t.fenceFt + " ft of fence",
        t.totalPosts + ' posts',
        t.sections + ' sections @ ' + t.postSpacingFt + "' O.C.",
        (t.gates.total ? t.gates.total + ' gate' + (t.gates.total > 1 ? 's' : '') : 'no gates'),
        (t.concreteBags ? t.concreteBags + ' bags concrete' : 'no concrete — driven posts')
      ];
      out.push('<text class="pl-m" x="' + MARGIN + '" y="' + fixed(ty + 52) +
               '" font-size="12">' + esc(facts.join('   ·   ')) + '</text>');
    }
    out.push('<text class="pl-m" x="' + fixed(PAGE.w - MARGIN) + '" y="' + fixed(ty + 10) +
             '" font-size="11" text-anchor="end">' +
             esc(opts.date || new Date().toISOString().slice(0, 10)) + '</text>');
    out.push('<text class="pl-m" x="' + fixed(PAGE.w - MARGIN) + '" y="' + fixed(ty + 32) +
             '" font-size="10" text-anchor="end" opacity=".7">' +
             'Drawn from the customer&#39;s own outline. Verify on site before digging.</text>');

    out.push('</svg>');
    return out.join('\n');
  }

  /** Convenience: a data URL for an <img> or a download link. */
  function dataUrl(svg) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  return { render: render, dataUrl: dataUrl, bounds: bounds, niceStep: niceStep, PAGE: PAGE };
});
