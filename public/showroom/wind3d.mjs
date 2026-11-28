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
import { STYLE, STYLE_ND } from './dig-plan.mjs';

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
// post: 'store' draws solid privacy on ordinary 4×4 posts (the app's dug-post model) instead of GFS's
// boxed steel, so the fence that goes over is not drawn as ours
export const windModel = (id, h, post) => { const m = MODELS[id]; if (!m) return m; const dug = id === 'privacy' && (post === 'store' || post === 'rot'); return { name: dug ? STYLE : m.name(h), noDig: dug ? false : m.noDig, extra: m.extra }; };

const BAYS = 3, Z0 = -1.5;
// fittings that wrap or plug into a post or rail by design (bands, caps, rails into punched or mortised posts)
const FITTING = /^(tensionband|braceband|loopcap|cap|railend|tensionbar|fabrictie|staple|fastener)$/;
const POSTISH = /^(post|termpost|linepost)$/;

export function createWindScene(host, { specs } = {}) {
  const st = createStage(host, { views: [{ id: 'main' }], soilDepth: 12, width: 320, back: 160, home: { yaw: -.4, pitch: .1 } });
  const R = st.root;
  let built = null, field = null, fkey = '', smokeFor = '', S = null, live = true, lean = 0, leanTo = 0;
  const concrete = new THREE.MeshStandardMaterial({ color: 0xa9a7a1, roughness: .95 }), holeMat = new THREE.MeshBasicMaterial({ color: 0x1d140c }), stubMat = new THREE.MeshStandardMaterial({ color: 0x3f2c1d, roughness: 1 });
  // how the fence stands at `lean` degrees: the whole of it turning about the ground line, or (rotted posts)
  // everything but the end posts going down about the break, a couple of inches up
  const Mx = new THREE.Matrix4(), Ma = new THREE.Matrix4();
  function applyLean() {
    const b = built, rad = lean * Math.PI / 180;
    if (b.partial) {
      b.g.rotation.z = 0;
      Mx.makeTranslation(0, 2 * IN, 0).multiply(Ma.makeRotationZ(-rad * b.dir)).multiply(Ma.makeTranslation(0, -2 * IN, 0));
      const touched = new Set(); for (const p of b.falling) { p.mesh.setMatrixAt(p.i, Ma.multiplyMatrices(Mx, p.base)); touched.add(p.mesh); }
      touched.forEach(o => { o.instanceMatrix.needsUpdate = true; }); b.moved = true;
    } else {
      if (b.moved) { const touched = new Set(); for (const p of b.falling) { p.mesh.setMatrixAt(p.i, p.base); touched.add(p.mesh); } touched.forEach(o => { o.instanceMatrix.needsUpdate = true; }); b.moved = false; }
      b.g.rotation.z = -rad;
    }
  }

  // ── the fence ──
  // side: which face of the fence the wind hits, 'picket' or 'rail'. The wind always blows the same way
  // across the picture; the fence is turned end for end to face it.
  function build(style, h, bay, post, side = 'picket') {
    const k = style + '|' + h + '|' + (post === 'store' || post === 'rot' ? post : '') + '|' + side;
    if (built?.k === k) return;
    if (built) { R.remove(built.g, built.holes); built.F.lib?.dispose?.(); built.g.traverse(o => o.geometry?.dispose?.()); built.holes.traverse(o => o.geometry?.dispose?.()); }
    const M = windModel(style, h, post), pts = Array.from({ length: BAYS + 1 }, (_, i) => [0, 0, Z0 - i * bay]);
    const F = fence(M.name, 0, 0, { h, specs, pts, noDig: M.noDig, extra: M.extra });
    // the no-dig steel runs up inside each box; under the ground it's hidden (the yard isn't cut here)
    if (M.noDig) reveal(F.parts.filter(p => p.geo === 'CylinderGeometry' && p.kind === 'post'), () => 0);
    clearPosts(F);
    const g = new THREE.Group(), turn = new THREE.Group(); turn.add(F.group); g.add(turn); R.add(g); g.rotation.z = -lean * Math.PI / 180;
    // which face the model has toward the wind as built, from where its boards sit against its posts
    const mean = re => { const ps = F.parts.filter(p => re.test(p.kind || '') && !p.hidden); return ps.length ? ps.reduce((a, p) => a + (p.box.min.x + p.box.max.x) / 2, 0) / ps.length : 0; };
    const asBuilt = mean(/^picket$/) <= mean(POSTISH) ? 'picket' : 'rail', flip = side !== asBuilt, zc = Z0 - BAYS * bay / 2;
    if (flip) { turn.position.z = zc; turn.rotation.y = Math.PI; F.group.position.z = -zc; }
    g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(F.group);
    const posts = F.parts.filter(p => POSTISH.test(p.kind || '')).map(p => flip ? new THREE.Box3(new THREE.Vector3(-p.box.max.x, p.box.min.y, 2 * zc - p.box.max.z), new THREE.Vector3(-p.box.min.x, p.box.max.y, 2 * zc - p.box.min.z)) : p.box);
    // ordinary posts stand in a 10 in concrete plug 2 ft deep. It is under the lawn until the fence goes
    // over; then it comes out of the ground with its post, and leaves its hole behind.
    const holes = new THREE.Group(); holes.visible = false; R.add(holes);
    if (post === 'store') for (const b of posts) {
      const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
      const plug = new THREE.Mesh(new THREE.CylinderGeometry(5 * IN, 5 * IN, 2, 20).translate(0, -1, 0), concrete); plug.position.set(cx, -.01, cz); plug.castShadow = plug.receiveShadow = true; plug.userData.noCheck = true; g.add(plug);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(5.4 * IN, 20).rotateX(-Math.PI / 2), holeMat); hole.position.set(cx, .02, cz); hole.userData.noCheck = true; holes.add(hole);
    }
    // Rotted posts snap at the soil line and leave their stubs. Which way the wind came from decides the
    // rest. On the rail side the panel is blown away from its posts, so where a post holds (here the two
    // end ones) the rails pull out of it and the run between goes down. On the picket side the boards and
    // rails are pressed onto the posts and can't pull away, so the run goes over together.
    const zs = posts.map(b => (b.min.z + b.max.z) / 2), z0 = Math.min(...zs), z1 = Math.max(...zs), lz = z => flip ? 2 * zc - z : z;
    const stays = p => POSTISH.test(p.kind || '') && [z0, z1].some(z => Math.abs(lz((p.box.min.z + p.box.max.z) / 2) - z) < .2);
    if (post === 'rot') posts.forEach((b, i) => { const z = zs[i];
      const stub = new THREE.Mesh(new THREE.BoxGeometry(3.4 * IN, 2.4 * IN, 3.4 * IN), stubMat); stub.position.set((b.min.x + b.max.x) / 2, 1.2 * IN, z); stub.userData.noCheck = true; stub.userData.end = Math.abs(z - z0) < .2 || Math.abs(z - z1) < .2; stub.castShadow = true; holes.add(stub); });
    built = { k, g, F, top: box.max.y, face: box.min.x, back: box.max.x, posts, bay, holes, falling: F.parts.filter(p => !stays(p)), dir: flip ? -1 : 1, partial: false, moved: false };
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
    const was = built?.k; build(load.style, load.h, load.bay, load.fail?.post, load.side);
    // A fence that has gone over no longer stands in the wind's way. Steel posts don't go over: past
    // their limit they lean (the pipe bends a little and stays in one piece, box and all).
    const down = !!load.fail?.down, flat = down && load.fail.mode !== 'bends';
    leanTo = !load.fail ? 0 : down ? (flat ? 84 : 2 + 4 * Math.min(1, (load.fail.frac - 1) / .35)) : 1.4 * Math.min(1, load.fail.frac) ** 2;
    built.holes.visible = flat; built.partial = flat && load.fail.mode === 'snaps' && load.side === 'rail';
    for (const o of built.holes.children) if (o.userData.end) o.visible = !built.partial;
    if (built.k !== was) lean = leanTo;
    applyLean();   // a different fence starts where it belongs; it doesn't swing there from the last one's lean
    const fk = `${flat ? 0 : load.eps}|${load.h}|${load.exposure}`;
    if (fk !== fkey || built.k !== smokeFor) { field = flowField({ eps: flat ? 0 : load.eps, hFt: load.h, exposure: load.exposure }); fkey = fk; smokeFor = built.k; smoke(); }
    speed = .55 + 1.25 * load.V / 58;
    placeArrows(load.p);
    const h = load.h;
    L.push.set(`${fmt1(load.p)} lb per sq ft`); L.push.move(V3(built.face - Math.min(4.2, .35 + load.p * .16) * Math.max(.7, h / 6) * .5, h * .02));
    L.post.set(down ? { tips: 'Posts and footings tipped out of the ground', snaps: load.side === 'rail' ? 'Rotted posts snapped, rails pulled out' : 'Rotted posts snapped, whole run down', bends: 'Leaning. Steel posts and boxes intact' }[load.fail.mode] : `${Math.round(load.perPost).toLocaleString()} lb on each post`); L.post.show(!down); L.down.set(L.post.el.textContent); L.down.show(down); L.down.move(V3(built.back + .4, .9, Z0 - built.bay));
    L.push.show(!flat); L.post.move(V3((built.face + built.back) / 2, built.top + .15, Z0 - built.bay));
    L.over.move(V3(h * 1.3, h * 1.6)); L.over.show(field.open < .5 && !flat);
    L.swirl.move(V3(h * 1.9, h * .5)); L.swirl.show(field.swirl > .5);
    L.slow.move(V3(h * 1.9, h * .45)); L.slow.show(field.swirl <= .5 && !flat);
    if (!prev || prev.h !== h || prev.bay !== load.bay) st.frameView('main', (host.clientWidth || innerWidth) < 700 ? { cx: h * .95, cy: h * .95, w: h * 3.3, h: h * 2.3, cz: zS() } : { cx: h * 1.4, cy: h * 1.05, w: h * 4.6, h: h * 2.5, cz: zS() }, prev ? 500 : 0);   // closer on a phone, so the fence reads
    st.dirty();
  }
  const fmt1 = v => (Math.round(v * 10) / 10).toFixed(1);

  let t0 = 0;
  st.tick(now => {
    if (!live || !S) return live;
    const dt = Math.min(.05, t0 ? (now - t0) / 1000 : .016); t0 = now;
    if (!reducedMotion()) { uT.value = (uT.value + dt * speed * 1.6) % 1000; st.dirty(); }
    // the fence eases toward its lean: a little sway under load, over when the posts give
    if (built && Math.abs(lean - leanTo) > .01) { lean = reducedMotion() ? leanTo : lean + (leanTo - lean) * Math.min(1, dt * (leanTo > lean ? 5 : 3)); applyLean(); st.dirty(); }
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
    dispose() { live = false; st.dispose(); built?.F.lib?.dispose?.(); concrete.dispose(); holeMat.dispose(); stubMat.dispose(); red.dispose(); shaft.dispose(); head.dispose(); airMat.dispose(); air.children.forEach(m => m.geometry.dispose()); }
  };
}
