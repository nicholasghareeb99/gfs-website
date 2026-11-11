/* ══════════════════════════════════════════════════════════════════════════
   GFS — "YOUR FENCE" SUMMARY
   assets/js/gfs-fence-summary.js
   Requires: gfs-geo-spec.js, gfs-takeoff.js, gfs-siteplan.js
   ══════════════════════════════════════════════════════════════════════════

   The one surface the customer sees after they finish drawing. Everything
   built so far converges here:

       their outline  ->  site plan   (where it goes)
                      ->  take-off    (what it takes)
                      ->  /api/estimate (what it costs, as a band)
                      ->  fence3d     (what it looks like)

   THE POINT IS THAT THEY DREW ONCE. No second tool, no re-entry, no "now
   tell us your dimensions". The whole reason this is worth building is that
   the input already exists by the time they get here.

   ORDER ON THE PAGE IS DELIBERATE
   Plan and counts render INSTANTLY from geometry already in hand. The price
   band arrives over the network and the 3D view costs megabytes. So the
   customer sees something real in the first frame, and the slow things fill
   in around it rather than gating it. A spinner where the answer should be
   is how people leave.

   NO RATES. The band comes from the server. Nothing in this file can
   compute a price, which is the point — see netlify/functions/estimate.js.
   ══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GFSFenceSummary = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  /**
   * buildModel(geometry, opts) -> { spec, takeoff, planSvg }
   * Pure. No DOM, no network — so the whole data path is testable.
   */
  function buildModel(geometry, opts) {
    opts = opts || {};
    var GS = opts.geoSpec || root.GFSGeoSpec;
    var TK = opts.takeoffLib || root.GFSTakeoff;
    var SP = opts.sitePlanLib || root.GFSSitePlan;
    if (!GS || !TK || !SP) throw new Error('summary: missing a dependency module');
    if (!opts.styleName) throw new TypeError('summary: styleName is required');

    var spec = GS.toFence3dSpec(geometry, {
      styleName: opts.styleName,
      heightFt: opts.heightFt,
      gates: opts.gates || [],
      job: opts.job, addr: opts.addr
    });
    var takeoff = TK.takeoff(spec, {
      soil: opts.soil,
      petSecure: opts.petSecure
    });
    var planSvg = SP.render(spec, { takeoff: takeoff, date: opts.date });
    return { spec: spec, takeoff: takeoff, planSvg: planSvg };
  }

  /** Fact chips. Deliberately the same facts the crew sheet carries. */
  function chips(t) {
    var out = [
      { k: 'Fence', v: t.fenceFt.toLocaleString() + ' ft' },
      { k: 'Posts', v: String(t.totalPosts) },
      { k: 'Sections', v: t.sections + ' @ ' + t.postSpacingFt + "' O.C." }
    ];
    if (t.gates.total) {
      out.push({ k: 'Gates', v: t.gates.total + (t.gates.drive ? ' (1 drive)' : '') });
    }
    if (t.pickets) out.push({ k: 'Pickets', v: t.pickets.toLocaleString() });
    if (t.panels) out.push({ k: 'Panels', v: String(t.panels) });
    /* Foundation spans the full row. Left in the auto-fit flow it lands as
       an orphan on its own line and wraps to two lines in a narrow chip —
       and it is the one fact that separates us from every other bid, so it
       gets the width deliberately rather than by accident. */
    out.push({
      k: 'Foundation',
      v: t.concreteBags
        ? t.concreteBags + ' bags concrete — sandy soil'
        : 'Driven steel, no concrete — below the frost line',
      wide: true
    });
    return out;
  }

  /** The full panel as an HTML string. Price starts as a placeholder. */
  function html(model, opts) {
    opts = opts || {};
    var t = model.takeoff;
    var c = chips(t).map(function (x) {
      return '<div class="fs-chip' + (x.wide ? ' fs-chip--wide' : '') +
             '"><span class="fs-chip__k">' + esc(x.k) +
             '</span><span class="fs-chip__v">' + esc(x.v) + '</span></div>';
    }).join('');

    return [
      '<section class="fs" data-style="' + esc(t.style || '') + '">',
      '  <header class="fs__head">',
      '    <div class="eyebrow">Your fence</div>',
      '    <h2 class="fs__title">' + esc(t.fenceFt.toLocaleString()) +
      ' ft of ' + esc(t.style || 'fence') + '</h2>',
      '    <p class="fs__sub">Measured from the outline you drew. ' +
      'Final numbers come from the on-site estimate.</p>',
      '  </header>',
      '  <div class="fs__plan">' + model.planSvg + '</div>',
      '  <div class="fs__chips">' + c + '</div>',
      '  <div class="fs__price" data-state="pending">',
      '    <div class="fs__price-label">Ballpark range</div>',
      '    <div class="fs__price-val">Working it out…</div>',
      '  </div>',
      '  <div class="fs__cta">',
      '    <button type="button" class="btn2 btn2--cedar fs__3d">See it on your yard</button>',
      '    <a href="/quote/" class="btn2 btn2--ghost">Book a free on-site estimate</a>',
      '  </div>',
      '  <p class="fs__note">Nothing here is a quote. It is your own outline, ' +
      'measured, so you know what you are looking at before anyone visits.</p>',
      '</section>'
    ].join('\n');
  }

  /** Fill in the price band once the server answers. */
  function applyPrice(el, result, err) {
    var box = el.querySelector('.fs__price');
    if (!box) return;
    var val = box.querySelector('.fs__price-val');
    if (err || !result) {
      box.setAttribute('data-state', 'failed');
      /* Never show a number we could not get. A wrong band is worse than
         no band, because the customer remembers the number. */
      val.textContent = 'We will price this at the estimate.';
      return;
    }
    box.setAttribute('data-state', 'ready');
    val.textContent = money(result.low) + ' – ' + money(result.high);
  }

  /**
   * mount(container, geometry, opts) -> { model, el, refresh }
   * Renders immediately, then asks the server for the band.
   */
  function mount(container, geometry, opts) {
    opts = opts || {};
    var model = buildModel(geometry, opts);
    container.innerHTML = html(model, opts);
    var el = container.querySelector('.fs');

    var btn = el.querySelector('.fs__3d');
    if (btn && opts.on3d) btn.addEventListener('click', function () { opts.on3d(model); });

    var fetchFn = opts.fetch || (typeof fetch === 'function' ? fetch : null);
    if (fetchFn) {
      fetchFn(opts.endpoint || '/api/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: model.takeoff.style,
          ft: model.takeoff.fenceFt,
          walkGates: model.takeoff.gates.walk,
          driveGates: model.takeoff.gates.drive
        })
      })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(r.status)); })
        .then(function (j) { applyPrice(el, j, null); })
        .catch(function (e) { applyPrice(el, null, e); });
    } else {
      applyPrice(el, null, new Error('no fetch'));
    }

    return { model: model, el: el, applyPrice: function (r, e) { applyPrice(el, r, e); } };
  }

  return {
    mount: mount,
    buildModel: buildModel,
    html: html,
    chips: chips,
    applyPrice: applyPrice
  };
});
