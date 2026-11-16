/* ══════════════════════════════════════════════════════════════════════════
   GFS — MATERIALS TAKE-OFF
   assets/js/gfs-takeoff.js
   ══════════════════════════════════════════════════════════════════════════

   The customer draws their fence once. That one polyline already produces
   the 3D render and the quote footage. This is the third thing it produces:
   a post, panel and hardware count.

   Two audiences, one calculation:
     · the customer sees "38 posts, 3 gates" as evidence the number is real
     · you get a take-off for the job folder and the supplier order

   INPUT is the fence3d spec — { lines:[{x1,z1,x2,z2,ft}], gates:[{x,z,ft}] },
   feet throughout — so the take-off and the render can never describe
   different fences.

   ON THE NUMBERS BELOW

   Everything marked [SPEC] comes off your brochure CAD sheets and is fact:
   8'-0" O.C. posts, 9'-0" vinyl sections, 10'-0" split rail sections,
   three 2x4 rails plus the King Plus top, 1x6 cedar pickets, 4x6 gate posts.

   Everything marked [DERIVED] is arithmetic I did from those, and the
   assumption is written next to it so you can correct one number rather
   than re-deriving the file. Picket counts in particular depend on the gap
   you actually run — the constant is named, not buried.

   Nothing here is a price. Rates stay server-side.
   ══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GFSTakeoff = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* Post spacing by material family. [SPEC] — all three off the CAD sheets. */
  var SPACING = {
    wood: 8,        // driven steel 2.5" @ 8'-0" O.C.
    cedar: 8,
    vinyl: 9,       // 9'-0" section, 107.5" rail
    aluminum: 6,    // 6' panels, rack to grade
    chainlink: 10,  // [DERIVED] common line-post spacing; terminal posts extra
    splitrail: 10   // 10'-0" sections typical
  };

  /* Picket face width in inches. [SPEC] true 1x6 cedar = 6" face — not the
     nominal 5.5" you get from big-box stock. */
  var PICKET_FACE_IN = 6;

  /* Pickets per foot of run, by pattern. [DERIVED] from PICKET_FACE_IN and
     the pattern geometry on the CAD sheets:
       standard  butted, one face          -> 12/6            = 2.00
       shadowbox alternating, 1" overlap   -> two faces at 10" spacing = 2.40
       bob       ~1" overlap each edge     -> 12/4            = 3.00
     If you run a different gap, change GAP_IN and these follow. */
  var GAP_IN = 4;
  var PICKETS_PER_FT = {
    standard: 12 / PICKET_FACE_IN,
    shadowbox: 2 * (12 / (PICKET_FACE_IN + GAP_IN)),
    bob: 12 / GAP_IN
  };

  /* Rails per section. [SPEC] three 2x4 plus the King Plus top rail — the
     fourth rail is what the "+" means. */
  var RAILS_PER_SECTION = { wood: 4, cedar: 4, splitrail: 3, vinyl: 2, aluminum: 3 };

  function family(styleName) {
    var s = String(styleName || '').toLowerCase();
    if (/chain[\s-]?link/.test(s)) return 'chainlink';          // before "vinyl"
    if (/split[\s-]?rail/.test(s)) return 'splitrail';
    if (/vinyl|pvc/.test(s)) return 'vinyl';
    if (/aluminum|aluminium|ornamental/.test(s)) return 'aluminum';
    if (/cedar/.test(s)) return 'cedar';
    return 'wood';
  }

  function pattern(styleName) {
    var s = String(styleName || '').toLowerCase();
    if (/board[\s-]on[\s-]board/.test(s)) return 'bob';
    if (/shadow[\s-]?box/.test(s)) return 'shadowbox';
    return 'standard';
  }

  function heightFt(styleName) {
    var m = String(styleName || '').match(/(\d+(?:\.\d+)?)\s*(?:ft|foot|feet|')/i);
    return m ? parseFloat(m[1]) : 6;
  }

  /* A corner is a direction change between consecutive segments. Corners get
     their own post, and a post shared by two runs must not be counted twice —
     which is the whole reason this walks segments rather than summing runs. */
  function countCorners(lines, toleranceDeg) {
    var tol = Math.cos((toleranceDeg || 12) * Math.PI / 180);
    var n = 0;
    for (var i = 1; i < lines.length; i++) {
      var a = lines[i - 1], b = lines[i];
      if (Math.abs(a.x2 - b.x1) > 0.5 || Math.abs(a.z2 - b.z1) > 0.5) continue; // not joined
      var ax = a.x2 - a.x1, az = a.z2 - a.z1;
      var bx = b.x2 - b.x1, bz = b.z2 - b.z1;
      var la = Math.hypot(ax, az) || 1, lb = Math.hypot(bx, bz) || 1;
      var dot = (ax * bx + az * bz) / (la * lb);
      if (dot < tol) n++;
    }
    return n;
  }

  function segLength(L) {
    return L.ft > 0 ? L.ft : Math.hypot(L.x2 - L.x1, L.z2 - L.z1);
  }

  /**
   * takeoff(spec, opts) -> counts
   *
   * opts.soil: 'clay' (default) | 'sandy'
   *   Clay gets driven steel and zero concrete. Sandy gets concrete-set 4x6.
   *   That is the real rule, so the bag count only appears where it applies.
   */
  function takeoff(spec, opts) {
    opts = opts || {};
    spec = spec || {};
    var lines = spec.lines || [];
    if (!lines.length) throw new RangeError('takeoff: spec has no lines');

    var style = opts.styleName || spec.style || '';
    var fam = family(style);
    var pat = pattern(style);
    var h = opts.heightFt || spec.h || heightFt(style);
    var spacing = opts.spacingFt || SPACING[fam] || 8;

    var gates = spec.gates || [];
    var gateFt = gates.reduce(function (s, g) { return s + (g.ft || 0); }, 0);

    var grossFt = lines.reduce(function (s, L) { return s + segLength(L); }, 0);
    /* Gate openings are not fence. Billing and building both exclude them. */
    var fenceFt = Math.max(0, grossFt - gateFt);

    /* Posts: each continuous run needs sections+1 posts. Corners add one
       each. Every gate needs two 4x6 posts, and those are NOT line posts. */
    var runs = groupRuns(lines);
    var linePosts = 0, sections = 0;
    runs.forEach(function (runFt) {
      var sec = Math.max(1, Math.ceil(runFt / spacing));
      sections += sec;
      linePosts += sec + 1;
    });
    var corners = countCorners(lines, opts.cornerToleranceDeg);
    var gatePosts = gates.length * 2;

    var out = {
      style: style || null,
      family: fam,
      pattern: pat,
      heightFt: h,
      fenceFt: Math.round(fenceFt),
      grossFt: Math.round(grossFt),
      gateFt: Math.round(gateFt),
      sections: sections,
      postSpacingFt: spacing,
      linePosts: linePosts,
      corners: corners,
      gatePosts: gatePosts,
      totalPosts: linePosts + corners + gatePosts,
      gates: {
        walk: gates.filter(function (g) { return (g.ft || 0) <= 6; }).length,
        drive: gates.filter(function (g) { return (g.ft || 0) > 6; }).length,
        total: gates.length
      },
      soil: opts.soil === 'sandy' ? 'sandy' : 'clay',
      assumptions: []
    };

    /* Foundation follows the soil, which is the actual rule, not a preference. */
    if (out.soil === 'sandy') {
      out.postType = 'Pressure-treated 4x6, concrete set';
      /* [DERIVED] 2 bags per line post, 3 per gate post — typical 60 lb bags
         for a 10" hole. Confirm against what you actually pour. */
      out.concreteBags = (out.linePosts + out.corners) * 2 + out.gatePosts * 3;
      out.assumptions.push('concrete: 2 bags per line post, 3 per gate post (60 lb)');
    } else {
      out.postType = 'Driven galvanized steel 2.5" dia, 8 ft, driven 4 ft';
      out.concreteBags = 0;
      out.drivenPosts = out.linePosts + out.corners;
    }

    /* Rails and pickets only apply to fences that have them. */
    var railsPer = RAILS_PER_SECTION[fam];
    if (railsPer) {
      out.rails = sections * railsPer;
      out.railFt = Math.round(fenceFt * railsPer);
      if (fam === 'wood' || fam === 'cedar') {
        out.assumptions.push('rails: three 2x4 plus the King Plus top rail');
      }
    }

    if (fam === 'wood' || fam === 'cedar') {
      var per = PICKETS_PER_FT[pat] || PICKETS_PER_FT.standard;
      out.pickets = Math.ceil(fenceFt * per);
      out.picketSize = '1x6 true dimension, ' + h + ' ft';
      out.assumptions.push('pickets: ' + per.toFixed(2) + '/ft for ' + pat +
                           ' at a ' + PICKET_FACE_IN + '" face');
    }
    if (fam === 'vinyl') {
      out.panels = sections;
      out.panelSize = '9 ft section';
      out.postStiffeners = out.totalPosts;   // metal in EVERY post
      out.assumptions.push('an aluminum stiffener in every post, not just gates');
    }
    if (fam === 'aluminum') {
      out.panels = sections;
      out.panelSize = '6 ft panel, racks to grade';
    }
    if (fam === 'splitrail') {
      out.railsPerSection = opts.railsPerSection || 3;
      out.rails = sections * out.railsPerSection;
      out.assumptions.push('mortised posts, paddle-end rails, 10 ft sections');
      if (opts.petSecure) {
        out.meshFt = Math.round(fenceFt);
        out.kickboardFt = Math.round(fenceFt);
        out.assumptions.push('pet-secure: 2x4 welded wire on the inside face plus a cedar kickboard');
      }
    }

    /* Hardware. [DERIVED] two hinges per leaf, one latch per gate; a drive
       gate is two leaves. */
    if (gates.length) {
      var leaves = gates.reduce(function (s, g) { return s + ((g.ft || 0) > 6 ? 2 : 1); }, 0);
      out.hardware = { hinges: leaves * 2, latches: gates.length, dropRods: out.gates.drive };
      out.assumptions.push('hardware: 2 hinges per leaf, 1 latch per gate, drop rod on drive gates');
    }

    return out;
  }

  /* Segments that share an endpoint belong to one continuous run. Treating
     every segment as its own run would over-count posts badly on a yard
     drawn with many short clicks. */
  function groupRuns(lines) {
    var runs = [], cur = 0;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      if (i > 0) {
        var p = lines[i - 1];
        var joined = Math.abs(p.x2 - L.x1) < 0.5 && Math.abs(p.z2 - L.z1) < 0.5;
        if (!joined) { runs.push(cur); cur = 0; }
      }
      cur += segLength(L);
    }
    if (cur > 0) runs.push(cur);
    return runs;
  }

  /** Plain-language lines for the customer. No prices, no jargon. */
  function summarize(t) {
    var out = [t.fenceFt + ' ft of ' + (t.style || 'fence')];
    out.push(t.totalPosts + ' posts — ' + t.postType);
    if (t.sections) out.push(t.sections + ' sections at ' + t.postSpacingFt + ' ft on center');
    if (t.pickets) out.push(t.pickets + ' pickets (' + t.picketSize + ')');
    if (t.panels) out.push(t.panels + ' panels (' + t.panelSize + ')');
    if (t.gates.total) {
      out.push(t.gates.total + ' gate' + (t.gates.total > 1 ? 's' : '') +
               ' on 4x6 posts — ' + t.gates.walk + ' walk, ' + t.gates.drive + ' drive');
    }
    if (t.concreteBags) out.push(t.concreteBags + ' bags of concrete (sandy soil)');
    else out.push('No concrete — posts driven below the frost line');
    return out;
  }

  return {
    takeoff: takeoff,
    summarize: summarize,
    family: family,
    pattern: pattern,
    heightFt: heightFt,
    SPACING: SPACING,
    PICKETS_PER_FT: PICKETS_PER_FT,
    RAILS_PER_SECTION: RAILS_PER_SECTION,
    PICKET_FACE_IN: PICKET_FACE_IN,
    GAP_IN: GAP_IN
  };
});
