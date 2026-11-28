// Wind in 3D: the chosen style, built from the Executive App's own model, three sections long,
// with the wind blowing across it (+x) and the air drawn as smoke lines through the middle of the
// first section, like smoke in a wind tunnel.
//
// The lines are the average flow from wind-plan.mjs (open-yard wind profile, air through an open
// fence by screen loss, the swirl behind a fence under about 30% open, Perera's slow wake, and the
// rest going over the top). The same amount of air flows between neighbouring lines, so they crowd
// where it's fast. Dashes move along them at the local speed, slowed way down.
// Red arrows on the face show the push from ASCE 7; their length goes with lb per sq ft.
import { THREE, IN, createStage, fence, reveal, solids, overlaps } from './lab3d.mjs';
import { flowField, streamlines } from './wind-plan.mjs';
import { STYLE_ND } from './dig-plan.mjs';

// the app models drawn for each style in the Wind tool
const MODELS = {
  privacy: { name: () => STYLE_ND, noDig: true },
  shadowbox: { name: h => `Shadowbox ${h}ft (PT)` },
  lattice: { name: () => 'Lattice Top' },
  picket: { name: () => "3'/4' wood spaced picket" },
  split: { name: h => (h === 3 ? "3' cedar split rail" : '4’ cedar split rail'), extra: { wire: 'none' } },
  alu: { name: () => 'Aluminum 3-Rail 4ft' },
  chain: { name: h => `Galv Chain Link ${h}ft` }
};
export const windModel = (id, h) => { const m = MODELS[id]; return m && { name: m.name(h), noDig: m.noDig, extra: m.extra }; };

const BAYS = 3, Z0 = -1.5;
// fittings that wrap or plug into a post or rail by design (bands, caps, rails into punched or mortised posts)
const FITTING = /^(tensionband|braceband|loopcap|cap|railend|tensionbar|fabrictie|staple|fastener)$/;
const POSTISH = /^(post|termpost|linepost)$/;

export function createWindScene(host, { specs } = {}) {
  const st = createStage(host, { views: [{ id: 'main' }], soilDepth: 12, width: 320, back: 160, home: { yaw: -.4, pitch: .1 } });
  const R = st.root;
  let built = null, field = null, fkey = '', smokeFor = '', S = null, live = true, lean = 0, leanTo = 0;

  // ── the fence ──
  function build(style, h, bay) {
    const k = style + '|' + h;
    if (built?.k === k) return;
    if (built) { R.remove(built.g); built.F.lib?.dispose?.(); built.g.traverse(o => o.geometry?.dispose?.()); }
    const M = windModel(style, h), pts = Array.from({ length: BAYS + 1 }, (_, i) => [0, 0, Z0 - i * bay]);
    const F = fence(M.name, 0, 0, { h, specs, pts, noDig: M.noDig, extra: M.extra });
    // the no-dig steel runs up inside each box; under the ground it's hidden (the yard isn't cut here)
    if (M.noDig) reveal(F.parts.filter(p => p.geo === 'CylinderGeometry' && p.kind === 'post'), () => 0);
    clearPosts(F);
    const g = new THREE.Group(); g.add(F.group); R.add(g); g.rotation.z = -lean * Math.PI / 180;
    const box = new THREE.Box3(); for (const p of F.parts) if (p.mesh.visible && !p.hidden) box.union(p.box);
    g.updateMatrixWorld(true); box.union(new THREE.Box3().setFromObject(F.group));
    const posts = F.parts.filter(p => POSTISH.test(p.kind || '')).map(p => p.box);
    built = { k, g, F, top: box.max.y, face: box.min.x, back: box.max.x, posts, bay };
  }
  // the app's lattice-top trim board sits ¼ in into the face of each post: set it just in front
  function clearPosts(F) {
    const posts = F.parts.filter(p => POSTISH.test(p.kind || '')), m = new THREE.Matrix4(), moved = new Set();
    for (const p of F.parts) {
      if (p.kind !== 'picket') continue;
      let push = 0, dir = 0;
      for (const q of posts) {
        if (!p.box.intersectsBox(q.box)) continue;
        const cx = (q.box.min.x + q.box.max.x) / 2, pc = (p.box.min.x + p.box.max.x) / 2, s = Math.sign(pc - cx) || -1;
        const sink = s < 0 ? p.box.max.x - q.box.min.x : q.box.max.x - p.box.min.x;
        if (sink > 0 && sink < 1 * IN) { push = Math.max(push, sink + IN / 32); dir = s; }
      }
      if (!push) continue;
      p.mesh.getMatrixAt(p.i, m); m.elements[12] += dir * push; p.mesh.setMatrixAt(p.i, m); p.base.copy(m);
      p.box.translate(new THREE.Vector3(dir * push, 0, 0)); moved.add(p.mesh);
    }
    moved.forEach(o => { o.instanceMatrix.needsUpdate = true; o.computeBoundingSphere?.(); });
  }

  // ── the push on the face: red arrows, length by lb per sq ft ──
  const red = new THREE.MeshBasicMaterial({ color: 0xef5b5b, toneMapped: false });
  const shaft = new THREE.CylinderGeometry(.045, .045, 1, 10); shaft.rotateZ(-Math.PI / 2); shaft.translate(.5, 0, 0);
  const head = new THREE.ConeGeometry(.16, .42, 16); head.rotateZ(-Math.PI / 2);
  const arrows = [];
  for (let i = 0; i < 3; i++) { const a = new THREE.Group(), s = new THREE.Mesh(shaft, red), c = new THREE.Mesh(head, red); a.add(s, c); a.userData = { s, c }; s.userData.noCheck = c.userData.noCheck = true; R.add(a); arrows.push(a); }
  function placeArrows(p) {
    const h = S.h, len = Math.min(4.2, .35 + p * .16) * Math.max(.7, h / 6);
    arrows.forEach((a, i) => {
      const y = h * [.22, .5, .78][i], z = zS() + .02;
      const x = built.face - .06 - .21;
      a.position.set(x, y, z); a.userData.s.scale.set(len, 1, 1); a.userData.s.position.x = -len - .21; a.userData.c.position.x = 0;
      a.visible = p > .05;
    });
  }

  // ── the air: smoke lines through the middle of the first section, with dashes that move at the
  // local speed (each dash is the same time long, so it stretches where the air is fast) ──
  const airMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const uT = { value: 0 };
  airMat.onBeforeCompile = sh => {
    sh.uniforms.uT = uT;
    sh.vertexShader = 'attribute float aTof;\nvarying float vTof;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTof = aTof;');
    sh.fragmentShader = 'uniform float uT;\nvarying float vTof;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat ph = fract(vTof * 1.6 - uT);\ndiffuseColor.a *= .22 + .78 * smoothstep(0., .08, ph) * (1. - smoothstep(.38, .5, ph));');
  };
  airMat.customProgramCacheKey = () => 'wind-dash';
  const air = new THREE.Group(); R.add(air);
  const C = { calm: new THREE.Color(0x9fd0ff), slow: new THREE.Color(0x6f95c2), fast: new THREE.Color(0xf0a865), back: new THREE.Color(0xc4b5ff) };
  function smoke() {
    air.children.forEach(m => m.geometry.dispose()); air.clear();
    const h = S.h, w = .022 * h, zS = Z0 - built.bay / 2, col = new THREE.Color();
    for (const line of streamlines(field, { x0: -3.2, x1: 9 })) {
      const pts = line.pts.filter((_, k) => k % 2 === 0 || k === line.pts.length - 1), n = pts.length;
      if (n < 3) continue;
      const pos = new Float32Array(n * 6), tof = new Float32Array(n * 2), cols = new Float32Array(n * 6), idx = [];
      for (let k = 0; k < n; k++) {
        const [x, z, t, u, v] = pts[k], a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)];
        let tx = b[0] - a[0], tz = b[1] - a[1]; const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
        const sp = Math.hypot(u, v), u0 = field.U0(z);
        col.copy(line.kind === 'swirl' || u < -.02 ? C.back : sp > u0 * 1.12 && z > .8 && x > -1 && x < 4 ? C.fast : sp < u0 * .45 ? C.slow : C.calm);
        for (let sd = 0; sd < 2; sd++) {
          const o = (sd ? 1 : -1) * w / 2;
          pos.set([x * h - tz * o, Math.max(.01, z * h + tx * o), zS], (k * 2 + sd) * 3); tof[k * 2 + sd] = t; cols.set([col.r, col.g, col.b], (k * 2 + sd) * 3);
        }
        if (k) idx.push(k * 2 - 2, k * 2 - 1, k * 2, k * 2 - 1, k * 2 + 1, k * 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aTof', new THREE.BufferAttribute(tof, 1)); g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, airMat); m.userData.noCheck = true; m.renderOrder = 3; m.frustumCulled = false; air.add(m);
    }
  }
  let speed = 1;

  // ── labels ──
  const zS = () => Z0 - (built?.bay || 8) / 2, V3 = (x, y, z = zS()) => new THREE.Vector3(x, y, z);
  const L = {
    push: st.pin('main', V3(0, 0), ''), post: st.pin('main', V3(0, 0), ''),
    over: st.pin('main', V3(0, 0), 'Faster over the top', 'tick'), swirl: st.pin('main', V3(0, 0), 'Air rolls back', 'tick'),
    slow: st.pin('main', V3(0, 0), 'Slower air behind', 'tick'), down: st.pin('main', V3(0, 0), '')
  };

  // load: { style, h, bay, eps, V, exposure, p (psf), perPost (lb) }
  function set(load) {
    const prev = S; S = load;
    build(load.style, load.h, load.bay);
    // a fence that has gone over no longer stands in the wind's way
    const down = !!load.fail?.down, flat = down && load.fail.mode !== 'bends';
    leanTo = !load.fail ? 0 : down ? (flat ? 82 : 40) : 1.4 * Math.min(1, load.fail.frac) ** 2;
    const fk = `${flat ? 0 : load.eps}|${load.h}|${load.exposure}`;
    if (fk !== fkey || built.k !== smokeFor) { field = flowField({ eps: flat ? 0 : load.eps, hFt: load.h, exposure: load.exposure }); fkey = fk; smokeFor = built.k; smoke(); }
    speed = .55 + 1.25 * load.V / 58;
    placeArrows(load.p);
    const h = load.h;
    L.push.set(`${fmt1(load.p)} lb per sq ft`); L.push.move(V3(built.face - Math.min(4.2, .35 + load.p * .16) * Math.max(.7, h / 6) * .5, h * .02));
    L.post.set(down ? { tips: 'Posts tipped out of the ground', snaps: 'Posts snapped at the ground', bends: 'Steel posts bent over' }[load.fail.mode] : `${Math.round(load.perPost).toLocaleString()} lb on each post`); L.post.show(!down); L.down.set(L.post.el.textContent); L.down.show(down); L.down.move(V3(built.back + .4, .9, Z0 - built.bay));
    L.push.show(!flat); L.post.move(V3((built.face + built.back) / 2, built.top + .15, Z0 - built.bay));
    L.over.move(V3(h * 1.3, h * 1.6)); L.over.show(field.open < .5 && !flat);
    L.swirl.move(V3(h * 1.9, h * .5)); L.swirl.show(field.swirl > .5);
    L.slow.move(V3(h * 1.9, h * .45)); L.slow.show(field.swirl <= .5 && !flat);
    if (!prev || prev.h !== h || prev.bay !== load.bay) st.frameView('main', { cx: h * 1.4, cy: h * 1.05, w: h * 4.6, h: h * 2.5, cz: zS() }, prev ? 500 : 0);
    st.dirty();
  }
  const fmt1 = v => (Math.round(v * 10) / 10).toFixed(1);

  let t0 = 0;
  st.tick(now => {
    if (!live || !S) return live;
    const dt = Math.min(.05, t0 ? (now - t0) / 1000 : .016); t0 = now;
    if (!reducedMotion()) { uT.value = (uT.value + dt * speed * 1.6) % 1000; st.dirty(); }
    // the fence eases toward its lean: a little sway under load, over when the posts give
    if (built && Math.abs(lean - leanTo) > .01) { lean = reducedMotion() ? leanTo : lean + (leanTo - lean) * Math.min(1, dt * (leanTo > lean ? 5 : 3)); built.g.rotation.z = -lean * Math.PI / 180; st.dirty(); }
    return true;
  });
  const rm = matchMedia('(prefers-reduced-motion: reduce)'), reducedMotion = () => rm.matches;
  // Reduce Motion gets still smoke lines (the dashes stop)
  function still() { st.dirty(); }

  return {
    set, still, stage: st, get field() { return field; }, get fence() { return built; },
    check() {
      return overlaps(solids(R), { allow: (a, b) => FITTING.test(a.kind || '') || (a.unit && a.unit === b.unit)
        || (a.kind === 'rail' && POSTISH.test(b.kind || ''))   // rails into punched aluminum posts and mortised split-rail posts
        || (a.kind === 'rail' && b.kind === 'rail' && built.k.startsWith('split'))   // split-rail tenons share the mortise
        || (a.kind === 'picket' && b.kind === 'rail' && built.k.startsWith('alu')) });   // aluminum pickets run through punched rails
    },
    dispose() { live = false; st.dispose(); built?.F.lib?.dispose?.(); red.dispose(); shaft.dispose(); head.dispose(); airMat.dispose(); air.children.forEach(m => m.geometry.dispose()); }
  };
}
