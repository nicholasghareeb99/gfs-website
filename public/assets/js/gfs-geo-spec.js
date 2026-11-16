/* ============================================================
   GFS — GEOMETRY / SPEC ADAPTER  v1
   assets/js/gfs-geo-spec.js   (also usable in Node for tests)

   WHY THIS FILE EXISTS

   Three surfaces already draw the same thing - a polyline of fence
   runs on a parcel - and all three represent it differently:

     website ballpark   Google Maps drawing toolbar -> lead.geometry
     exec SiteMap       Leaflet, emits {lat,lng} OBJECTS not arrays
     fence3d.html       consumes an f3d spec (share link or Firestore)

   Every past bug at these seams was a representation mismatch:
   _smLL had to be written because SiteMap emits objects; the
   NaN-refusing projector had to be written because a bad point
   silently produced a garbage sketch; _f3dSpec(optKey) had to
   default its argument because a no-arg caller killed 3D
   auto-stamping for months without erroring.

   So this module is deliberately ONE place, with ONE normalizer and
   ONE encoder, and it REFUSES bad input loudly instead of producing
   a plausible-looking wrong answer.

   IT DOES NOT BUILD GEOMETRY. fence3d.html v188 already has
   dimensionally-audited builders (kickboard depths, shadowbox gapIn,
   board-on-board two-course stacking, true chain-link pipe sizes,
   seated vinyl caps, style-true gates) proven by a 37-assertion
   harness. Nothing here re-implements any of that. See
   3D_INTEGRATION.md - "don't fork the builders" is the whole point.
   ============================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GFSGeoSpec = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var EARTH_R = 6378137;                 // WGS-84 equatorial radius, metres
  var M_PER_FT = 0.3048;
  var SPEC_VERSION = 188;                // matches fence3d builder generation

  // ---------------------------------------------------------------
  // 1. COORDINATE NORMALIZATION
  // ---------------------------------------------------------------

  /**
   * normalizeLL(pt) -> {lat, lng}  or null
   *
   * Accepts every shape our surfaces actually emit:
   *   {lat, lng}            Leaflet / exec SiteMap
   *   {lat, lon}            some GeoJSON-ish sources
   *   {latitude, longitude} Google Maps LatLngLiteral variants
   *   [lat, lng]            array form
   *   LatLng instance       anything exposing .lat()/.lng() functions
   *
   * Returns null - never a partial or NaN-bearing object - if the
   * point cannot be trusted. Callers must treat null as fatal for
   * that point rather than substituting a default.
   */
  function normalizeLL(pt) {
    if (pt == null) return null;
    var lat, lng;

    if (Array.isArray(pt)) {
      lat = pt[0]; lng = pt[1];
    } else if (typeof pt.lat === 'function' && typeof pt.lng === 'function') {
      lat = pt.lat(); lng = pt.lng();
    } else if (typeof pt === 'object') {
      lat = pt.lat !== undefined ? pt.lat
          : pt.latitude !== undefined ? pt.latitude : undefined;
      lng = pt.lng !== undefined ? pt.lng
          : pt.lon !== undefined ? pt.lon
          : pt.longitude !== undefined ? pt.longitude : undefined;
    } else {
      return null;
    }

    lat = typeof lat === 'string' ? parseFloat(lat) : lat;
    lng = typeof lng === 'string' ? parseFloat(lng) : lng;

    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    if (!isFinite(lat) || !isFinite(lng)) return null;          // NaN refusal
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    if (lat === 0 && lng === 0) return null;                    // null island
    return { lat: lat, lng: lng };
  }

  /** normalizePath(points) -> [{lat,lng}] ; throws on any bad point. */
  function normalizePath(points) {
    if (!Array.isArray(points)) throw new TypeError('path must be an array');
    var out = [];
    for (var i = 0; i < points.length; i++) {
      var p = normalizeLL(points[i]);
      if (!p) throw new RangeError('unusable coordinate at index ' + i +
                                   ': ' + JSON.stringify(points[i]));
      out.push(p);
    }
    return out;
  }

  // ---------------------------------------------------------------
  // 2. PROJECTION  (lat/lng -> local metres, for the 3D scene)
  // ---------------------------------------------------------------

  /**
   * Equirectangular projection about an origin. Over a residential
   * parcel (< ~200 m) the error is far below a picket width, and it
   * keeps the scene axis-aligned with north, which the walk view and
   * the sun slider both depend on.
   *
   * Returns {x, z} in metres: +x east, +z SOUTH (three.js is
   * right-handed Y-up, so south-positive keeps north at -z).
   */
  function makeProjector(origin) {
    var o = normalizeLL(origin);
    if (!o) throw new RangeError('projector origin is not a usable coordinate');
    var cosLat = Math.cos(o.lat * Math.PI / 180);
    return function project(pt) {
      var p = normalizeLL(pt);
      if (!p) throw new RangeError('cannot project unusable coordinate');
      var x = (p.lng - o.lng) * Math.PI / 180 * EARTH_R * cosLat;
      var z = -((p.lat - o.lat) * Math.PI / 180 * EARTH_R);
      if (!isFinite(x) || !isFinite(z)) throw new RangeError('projection produced NaN');
      return { x: x, z: z };
    };
  }

  /** centroid of a set of points, used as the scene origin. */
  function centroid(points) {
    var pts = normalizePath(points);
    if (!pts.length) throw new RangeError('centroid of empty path');
    var la = 0, ln = 0;
    for (var i = 0; i < pts.length; i++) { la += pts[i].lat; ln += pts[i].lng; }
    return { lat: la / pts.length, lng: ln / pts.length };
  }

  /** Great-circle-ish distance in metres between two points. */
  function distanceM(a, b) {
    var p = normalizeLL(a), q = normalizeLL(b);
    if (!p || !q) throw new RangeError('distance needs two usable coordinates');
    var mLat = (p.lat + q.lat) / 2 * Math.PI / 180;
    var dx = (q.lng - p.lng) * Math.PI / 180 * EARTH_R * Math.cos(mLat);
    var dy = (q.lat - p.lat) * Math.PI / 180 * EARTH_R;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * runLengthFt(path) - total length in feet.
   * The 3D view and the ballpark price MUST agree to the foot, or a
   * customer sees one number on the quote and a different fence in
   * the render. Same function feeds both.
   */
  function runLengthFt(path) {
    var pts = normalizePath(path);
    var m = 0;
    for (var i = 1; i < pts.length; i++) m += distanceM(pts[i - 1], pts[i]);
    return m / M_PER_FT;
  }

  // ---------------------------------------------------------------
  // 3. SPEC ENCODING  (must match fence3d share links exactly)
  // ---------------------------------------------------------------
  // Current format : 'z' + base64url( deflate-raw( JSON ) )
  // Legacy format  : base64( JSON )     <- links already in customer
  //                                        hands; decode forever.
  // Firestore-stored specs deliberately stay LEGACY encoded, because
  // the customer portal round-trips those records. encodeSpec()
  // therefore takes an explicit mode rather than guessing.

  function _b64urlEncode(bytes) {
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64url');
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function _b64urlDecode(str) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(str, 'base64url'));
    var s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // Node uses zlib; the browser uses CompressionStream, which is async.
  // Browser callers should use encodeSpecAsync / decodeSpecAsync.
  var _zlib = null;
  if (typeof require === 'function') { try { _zlib = require('zlib'); } catch (e) {} }

  /**
   * encodeSpec(spec, mode)
   *
   * DEFAULT IS LEGACY, and that is load-bearing. The shipped
   * fence3d.html decodes exactly one way:
   *
   *     JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1)))))
   *
   * There is no 'z' branch, no inflate, no pako, no DecompressionStream
   * anywhere in that file. A compressed link is a link that does not
   * open. Pass mode:'z' only once the viewer can read it.
   */
  function encodeSpec(spec, mode) {
    var json = JSON.stringify(spec);
    if (mode !== 'z') {
      return typeof Buffer !== 'undefined'
        ? Buffer.from(json, 'utf8').toString('base64')
        : btoa(unescape(encodeURIComponent(json)));
    }
    if (!_zlib) throw new Error('encodeSpec: use encodeSpecAsync() in the browser');
    return 'z' + _b64urlEncode(_zlib.deflateRawSync(Buffer.from(json, 'utf8')));
  }

  /**
   * decodeSpec(str) - handles BOTH formats. This must never be
   * narrowed: share links sent to customers years ago are legacy
   * base64 and have to keep opening.
   */
  function decodeSpec(str) {
    if (typeof str !== 'string' || !str) throw new TypeError('decodeSpec: empty');
    if (str.charAt(0) === 'z') {
      if (!_zlib) throw new Error('decodeSpec: use decodeSpecAsync() in the browser');
      var raw = _zlib.inflateRawSync(Buffer.from(_b64urlDecode(str.slice(1))));
      return JSON.parse(raw.toString('utf8'));
    }
    var bin = typeof Buffer !== 'undefined'
      ? Buffer.from(str, 'base64').toString('utf8')
      : decodeURIComponent(escape(atob(str)));
    return JSON.parse(bin);
  }

  /** Browser encode via CompressionStream. Falls back to legacy. */
  function encodeSpecAsync(spec, mode) {
    var json = JSON.stringify(spec);
    if (mode !== 'z' || typeof CompressionStream === 'undefined') {
      return Promise.resolve(btoa(unescape(encodeURIComponent(json))));
    }
    var cs = new CompressionStream('deflate-raw');
    var w = cs.writable.getWriter();
    w.write(new TextEncoder().encode(json)); w.close();
    return new Response(cs.readable).arrayBuffer().then(function (buf) {
      return 'z' + _b64urlEncode(new Uint8Array(buf));
    });
  }

  function decodeSpecAsync(str) {
    if (typeof str !== 'string' || !str) return Promise.reject(new TypeError('empty'));
    if (str.charAt(0) !== 'z') {
      try { return Promise.resolve(JSON.parse(decodeURIComponent(escape(atob(str))))); }
      catch (e) { return Promise.reject(e); }
    }
    if (typeof DecompressionStream === 'undefined') {
      return Promise.reject(new Error('DecompressionStream unavailable'));
    }
    var ds = new DecompressionStream('deflate-raw');
    var w = ds.writable.getWriter();
    w.write(_b64urlDecode(str.slice(1))); w.close();
    return new Response(ds.readable).text().then(JSON.parse);
  }

  // ---------------------------------------------------------------
  // 4. BALLPARK GEOMETRY -> f3d SPEC
  // ---------------------------------------------------------------

  /**
   * toFence3dSpec(geometry, opts)
   *
   * Emits the schema fence3d.html ACTUALLY consumes. Read off the
   * shipped viewer, not inferred:
   *
   *   SPEC.lines   REQUIRED, non-empty. Flat SEGMENTS, not polylines:
   *                { x1, z1, x2, z2, ft }   — fence3d.html:1170,1605
   *   SPEC.gates   { x, z, rot, ft }  where x,z is the hinge point,
   *                rot is RADIANS and ft is the leaf width; the viewer
   *                computes the far end as x+cos(rot)*ft — line 2008
   *   SPEC.style   DISPLAY NAME string ("6ft Cedar Privacy"), not a slug
   *   SPEC.h       height in feet, viewer defaults to 6
   *   SPEC.job / .num / .addr   metadata for the HUD — line 1173
   *
   * UNITS ARE FEET. The viewer works in feet throughout
   * (`const IN = 1/12; // inches -> feet`, GROUND_FT = 1700). An earlier
   * draft of this file emitted metres and a `runs` array of polylines.
   * Both were wrong and both would have rendered something plausible
   * at the wrong scale, which is the worst kind of wrong.
   */
  function toFence3dSpec(geometry, opts) {
    opts = opts || {};
    if (!opts.styleName) throw new TypeError('toFence3dSpec: styleName is required');

    var g = geometry;
    if (typeof g === 'string') {
      try { g = JSON.parse(g); }
      catch (e) { throw new SyntaxError('geometry is not valid JSON'); }
    }
    var rawRuns = Array.isArray(g) ? g
                : g && Array.isArray(g.runs) ? g.runs
                : g && Array.isArray(g.paths) ? g.paths
                : g && Array.isArray(g.lines) ? g.lines
                : null;
    if (!rawRuns || !rawRuns.length) throw new RangeError('geometry contains no runs');

    var paths = [], all = [];
    for (var i = 0; i < rawRuns.length; i++) {
      var r = rawRuns[i];
      var pts = normalizePath(Array.isArray(r) ? r : (r && r.path) || []);
      if (pts.length < 2) throw new RangeError('run ' + i + ' has fewer than 2 points');
      paths.push(pts);
      all = all.concat(pts);
    }

    var origin = opts.origin ? normalizeLL(opts.origin) : centroid(all);
    var project = makeProjector(origin);

    // Polylines -> flat segment list, in FEET.
    var lines = [];
    for (var p = 0; p < paths.length; p++) {
      for (var j = 1; j < paths[p].length; j++) {
        var a = project(paths[p][j - 1]), b = project(paths[p][j]);
        var seg = {
          x1: +(a.x / M_PER_FT).toFixed(2), z1: +(a.z / M_PER_FT).toFixed(2),
          x2: +(b.x / M_PER_FT).toFixed(2), z2: +(b.z / M_PER_FT).toFixed(2)
        };
        seg.ft = +Math.hypot(seg.x2 - seg.x1, seg.z2 - seg.z1).toFixed(2);
        if (seg.ft > 0) lines.push(seg);
      }
    }
    if (!lines.length) throw new RangeError('geometry produced no measurable segments');

    // Gates: hinge point + bearing, matching the viewer's own maths.
    var gates = (opts.gates || []).map(function (gt) {
      var at = normalizeLL(gt.at || gt);
      if (!at) throw new RangeError('gate has an unusable coordinate');
      var xz = project(at);
      var ft = gt.widthFt || (gt.walk === false ? 10 : 4);
      var rot = typeof gt.rot === 'number' ? gt.rot
              : _bearingOnLines(lines, xz.x / M_PER_FT, xz.z / M_PER_FT);
      return {
        x: +(xz.x / M_PER_FT).toFixed(2),
        z: +(xz.z / M_PER_FT).toFixed(2),
        rot: +rot.toFixed(4),
        ft: ft
      };
    });

    var spec = { lines: lines, gates: gates, style: opts.styleName };
    if (opts.heightFt) spec.h = opts.heightFt;
    if (opts.job) spec.job = opts.job;
    if (opts.num) spec.num = opts.num;
    if (opts.addr) spec.addr = opts.addr;
    return spec;
  }

  /* A gate inherits the bearing of the fence line it sits on, so the leaf
     swings along the run rather than off at an arbitrary angle. */
  function _bearingOnLines(lines, x, z) {
    var best = null, bestD = Infinity;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      var dx = L.x2 - L.x1, dz = L.z2 - L.z1;
      var len2 = dx * dx + dz * dz || 1;
      var t = Math.max(0, Math.min(1, ((x - L.x1) * dx + (z - L.z1) * dz) / len2));
      var px = L.x1 + t * dx, pz = L.z1 + t * dz;
      var d = Math.hypot(x - px, z - pz);
      if (d < bestD) { bestD = d; best = Math.atan2(dz, dx); }
    }
    return best == null ? 0 : best;
  }

  /** Total fence length in feet, straight off the emitted spec. */
  function specLengthFt(spec) {
    return (spec.lines || []).reduce(function (s, L) {
      return s + (L.ft > 0 ? L.ft : Math.hypot(L.x2 - L.x1, L.z2 - L.z1));
    }, 0);
  }

  return {
    VERSION: SPEC_VERSION,
    normalizeLL: normalizeLL,
    normalizePath: normalizePath,
    makeProjector: makeProjector,
    centroid: centroid,
    distanceM: distanceM,
    runLengthFt: runLengthFt,
    encodeSpec: encodeSpec,
    decodeSpec: decodeSpec,
    encodeSpecAsync: encodeSpecAsync,
    decodeSpecAsync: decodeSpecAsync,
    toFence3dSpec: toFence3dSpec,
    specLengthFt: specLengthFt
  };
});
