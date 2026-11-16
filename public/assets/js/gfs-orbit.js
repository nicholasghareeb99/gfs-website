/* ══════════════════════════════════════════════════════════════════════════
   GFS ORBIT — camera control with no CDN dependency
   assets/js/gfs-orbit.js
   ══════════════════════════════════════════════════════════════════════════

   THE BUG THIS REPLACES

       Three.js OrbitControls failed to load from CDN      fence-3d.js:54

   OrbitControls is NOT part of the three.js core bundle. `three.min.js`
   r128 does not define `THREE.OrbitControls`; it ships separately under
   examples/js/controls/, and that path is not reliably hosted on cdnjs for
   r128. So the request was never going to succeed, and the 3D view has been
   dead on arrival every load.

   Your own fence3d.html already solved this by not using OrbitControls at
   all — it loads three.min.js r128 and drives the camera directly with
   pointer events. This module is that approach, extracted and testable, so
   the marketing site can drop the CDN request entirely.

   Zero dependencies. THREE is passed in, not imported, so it works against
   r128 (UMD) and r160 (module) alike — the same choice GFSPhotoreal makes.

   USAGE
       const orbit = GFSOrbit.attach(canvas, camera, {
         target: { x: 0, y: 0, z: 0 },
         radius: 120, minRadius: 8, maxRadius: 900
       });
       // in your render loop:
       orbit.update();
   ══════════════════════════════════════════════════════════════════════════ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GFSOrbit = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HALF_PI = Math.PI / 2;

  /* Keep the camera above the ground and out of the poles. Looking up from
     underneath a fence is never what somebody meant to do, and phi at exactly
     0 or PI makes the up-vector degenerate. */
  var PHI_MIN = 0.08;
  var PHI_MAX = HALF_PI - 0.02;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  /**
   * createState(opts) — the pure part. No DOM, no THREE, so the maths can be
   * tested directly rather than through a canvas.
   */
  function createState(opts) {
    opts = opts || {};
    return {
      theta: opts.theta != null ? opts.theta : -Math.PI / 4,
      phi: clamp(opts.phi != null ? opts.phi : 0.62, PHI_MIN, PHI_MAX),
      radius: opts.radius || 120,
      minRadius: opts.minRadius || 8,
      maxRadius: opts.maxRadius || 900,
      target: {
        x: (opts.target && opts.target.x) || 0,
        y: (opts.target && opts.target.y) || 0,
        z: (opts.target && opts.target.z) || 0
      },
      vTheta: 0, vPhi: 0,
      damping: opts.damping != null ? opts.damping : 0.88,
      rotateSpeed: opts.rotateSpeed || 0.0038,
      pitchSpeed: opts.pitchSpeed || 0.0032
    };
  }

  function rotate(s, dx, dy) {
    s.theta += dx * s.rotateSpeed;
    s.phi = clamp(s.phi - dy * s.pitchSpeed, PHI_MIN, PHI_MAX);
    s.vTheta = dx * s.rotateSpeed;
    s.vPhi = -dy * s.pitchSpeed;
    return s;
  }

  function zoom(s, factor) {
    s.radius = clamp(s.radius * factor, s.minRadius, s.maxRadius);
    return s;
  }

  /** Momentum. Returns true while still moving, so callers can skip renders. */
  function coast(s) {
    if (Math.abs(s.vTheta) < 1e-5 && Math.abs(s.vPhi) < 1e-5) {
      s.vTheta = s.vPhi = 0;
      return false;
    }
    s.theta += s.vTheta;
    s.phi = clamp(s.phi + s.vPhi, PHI_MIN, PHI_MAX);
    s.vTheta *= s.damping;
    s.vPhi *= s.damping;
    return true;
  }

  /** Spherical -> cartesian, relative to the target. */
  function position(s) {
    var r = s.radius, sp = Math.sin(s.phi);
    return {
      x: s.target.x + r * sp * Math.cos(s.theta),
      y: s.target.y + r * Math.cos(s.phi),
      z: s.target.z + r * sp * Math.sin(s.theta)
    };
  }

  /** Frame a bounding box: pick a radius that fits it in view. */
  function frame(s, box, fovDeg, aspect) {
    var w = Math.abs(box.x2 - box.x1), d = Math.abs(box.z2 - box.z1);
    var span = Math.max(w, d, 1);
    var fov = (fovDeg || 55) * Math.PI / 180;
    /* Horizontal FOV is the binding constraint on a wide viewport. */
    var vFit = (span / 2) / Math.tan(fov / 2);
    var hFit = (span / 2) / Math.tan(fov / 2) / Math.max(aspect || 1.6, 0.35);
    s.radius = clamp(Math.max(vFit, hFit) * 1.35, s.minRadius, s.maxRadius);
    s.target.x = (box.x1 + box.x2) / 2;
    s.target.z = (box.z1 + box.z2) / 2;
    return s;
  }

  /** Attach pointer handling to a canvas and drive a THREE camera. */
  function attach(canvas, camera, opts) {
    var s = createState(opts);
    var down = {}, pinch = null, lastTap = 0;
    var home = { radius: s.radius, theta: s.theta, phi: s.phi };

    function apply() {
      if (!camera) return;
      var p = position(s);
      camera.position.set(p.x, p.y, p.z);
      if (camera.lookAt) camera.lookAt(s.target.x, s.target.y, s.target.z);
    }

    function ids() { return Object.keys(down); }

    canvas.addEventListener('pointerdown', function (e) {
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      down[e.pointerId] = { x: e.clientX, y: e.clientY };
      s.vTheta = s.vPhi = 0;
      var now = Date.now();
      if (now - lastTap < 320 && ids().length === 1) {
        s.radius = home.radius; s.theta = home.theta; s.phi = home.phi; apply();
      }
      lastTap = now;
    });

    canvas.addEventListener('pointermove', function (e) {
      var prev = down[e.pointerId];
      if (!prev) return;
      var k = ids();
      if (k.length === 1) {
        rotate(s, e.clientX - prev.x, e.clientY - prev.y);
        down[e.pointerId] = { x: e.clientX, y: e.clientY };
        apply();
      } else if (k.length === 2) {
        down[e.pointerId] = { x: e.clientX, y: e.clientY };
        var a = down[k[0]], b = down[k[1]];
        var dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch && dist > 0) { zoom(s, pinch / dist); apply(); }
        pinch = dist;
      }
    });

    function release(e) {
      delete down[e.pointerId];
      if (ids().length < 2) pinch = null;
    }
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('pointerleave', release);

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      zoom(s, e.deltaY > 0 ? 1.1 : 0.9);
      apply();
    }, { passive: false });

    apply();

    return {
      state: s,
      apply: apply,
      update: function () { if (coast(s)) apply(); },
      frame: function (box, fovDeg, aspect) {
        frame(s, box, fovDeg, aspect);
        home = { radius: s.radius, theta: s.theta, phi: s.phi };
        apply();
      },
      dispose: function () { down = {}; pinch = null; }
    };
  }

  return {
    attach: attach,
    createState: createState,
    rotate: rotate,
    zoom: zoom,
    coast: coast,
    position: position,
    frame: frame,
    PHI_MIN: PHI_MIN,
    PHI_MAX: PHI_MAX
  };
});
