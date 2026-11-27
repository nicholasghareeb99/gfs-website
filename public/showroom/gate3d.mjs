// Gate sag in 3D: one wood gate between its two posts, seen from the rail side with the yard cut open
// at the posts, plus a close look at the latch from the picket side. The gate is the Executive App's
// own model for the no-dig dog-ear privacy style; the posts are either GFS's 3 in steel driven 4 ft
// in a wood box, or 4×4s in concrete. Everything moves at true size; the numbers are in gate-plan.mjs.
//
// Two things in the app's gate are changed here so no two parts pass through each other: the stiles
// and the brace stop at the middle rail (a carpenter cuts them to fit between rails), and the 3 in
// gate post's box is drawn 6 in wide so the 2⅞ in pipe fits inside it (the app's box is 5½ in, with
// 2½ in between its sides).
import { THREE, IN, createStage, fence, reveal, pipe, squarePost, concreteCut, footingTop, collar, facePatch, clamp, solids, overlaps } from './lab3d.mjs';
import { surfaceMaterial } from './vendor/exec/real-surfaces.mjs';
import { sag, POSTS, TUBE, PINE, STEEL, WET, tubeArea } from './gate-plan.mjs';
import { season, weather, decay, heave } from './build-plan.mjs';
import { STYLE_ND } from './dig-plan.mjs';

const BRACE_APP = { none: 'none', wrong: 'hh', right: 'auto', steel: 'none' };
const PIPE_UP_IN = 66.75, PIPE_DOWN_IN = 48;      // the app's gate pipe above grade; driven 4 ft
const BOX_IN = 6, SIDE_T = 1.5, SIDE_D = 3.5, FACE_T = .75, FACE_OFF = 2.125;
const WOOD_POST = { topIn: 72 };                  // an 8 ft 4×4, 2 ft of it in the ground
const LATCH_PLAY_IN = .75, AJAR = 4 * Math.PI / 180;
// Gate hardware, drawn from a GFS gate (the shadowbox gate photo on the website's gallery):
//  • 8 in ornamental butterfly hinge: two matching leaves that spread up and out from a thin barrel,
//    8 in tall at the outer corners, each with two long diamond cut-outs and a lag screw at each corner.
//  • Post latch: a spear-shaped plate on the gate with a grip, a round bar that lifts, and a catch on the post.
// Sizes are scaled off that photo against the 5½ in pickets; the maker doesn't publish a drawing.
const BFLY = { leafW: 2.75, innerH: 5, outerH: 8, barrelH: 4.4, barrelR: .19, t: .09 };
function butterflyLeaf() {
  const W = BFLY.leafW * IN, a = BFLY.innerH / 2 * IN, o = BFLY.outerH / 2 * IN, I = IN, sh = new THREE.Shape();
  const half = [[.12 * I, a - .25 * I], [.5 * I, a + .15 * I], [W * .8, o], [W, o - .5 * I], [W - .18 * I, o - 1.5 * I], [W, o - 2.5 * I], [W - .12 * I, 0]];
  sh.moveTo(.12 * I, 0); for (const [x, y] of half) sh.lineTo(x, y);
  for (const [x, y] of half.slice(0, -1).reverse()) sh.lineTo(x, -y);
  sh.closePath();
  for (const sy of [1, -1]) { const h = new THREE.Path(), cx = W * .52, cy = sy * 1.55 * I; h.moveTo(cx, cy + .9 * I); h.lineTo(cx + .33 * I, cy + .15 * I * sy); h.lineTo(cx, cy - .9 * I); h.lineTo(cx - .33 * I, cy + .15 * I * sy); h.closePath(); sh.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: BFLY.t * IN, bevelEnabled: false }); g.translate(0, 0, -BFLY.t * IN / 2); return g;
}
// the latch's plate on the gate; (0, 0) is where the bar crosses it
function latchPlate() {
  const I = IN, sh = new THREE.Shape(), R = [[0, 3.4], [.8, 2.55], [.42, 2.15], [.7, 1.75], [.45, 1.35], [.55, .4], [.5, -2.9], [.85, -3.6], [0, -4.9]];
  sh.moveTo(0, 3.4 * I); for (const [x, y] of R.slice(1)) sh.lineTo(x * I, y * I);
  for (const [x, y] of R.slice(1, -1).reverse()) sh.lineTo(-x * I, y * I);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: .1 * I, bevelEnabled: false }); g.translate(0, 0, -.05 * I); return g;
}

// volume of a closed mesh in world space (cubic feet)
function volumeOf(o) {
  const g = o.geometry, p = g.attributes.position, idx = g.index, m = o.matrixWorld, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let v = 0; const n = idx ? idx.count : p.count;
  for (let i = 0; i < n; i += 3) {
    const [i0, i1, i2] = idx ? [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)] : [i, i + 1, i + 2];
    a.fromBufferAttribute(p, i0).applyMatrix4(m); b.fromBufferAttribute(p, i1).applyMatrix4(m); c.fromBufferAttribute(p, i2).applyMatrix4(m);
    v += a.dot(b.cross(c)) / 6;
  }
  return Math.abs(v);
}
// a flat piece in the gate's plane: the convex polygon pts (x, y in feet), depth in z centred on z0
function plate(pts, depth, z0, material) {
  const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); g.translate(0, 0, z0 - depth / 2);
  const m = new THREE.Mesh(g, material); m.castShadow = m.receiveShadow = true; return m;
}
// keep the part of a convex polygon where a·x + b·y <= c
function cut(poly, a, b, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length], fp = a * P[0] + b * P[1] - c, fq = a * Q[0] + b * Q[1] - c;
    if (fp <= 1e-12) out.push(P);
    if ((fp < 0) !== (fq < 0) && Math.abs(fp - fq) > 1e-12) { const t = fp / (fp - fq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
  }
  return out;
}
// a straight band (a brace) of half-width hw along the line through c in direction u, clipped to a box
function band(c, u, hw, box) {
  const n = [-u[1], u[0]], L = 100;
  let poly = [[c[0] - u[0] * L + n[0] * hw, c[1] - u[1] * L + n[1] * hw], [c[0] + u[0] * L + n[0] * hw, c[1] + u[1] * L + n[1] * hw], [c[0] + u[0] * L - n[0] * hw, c[1] + u[1] * L - n[1] * hw], [c[0] - u[0] * L - n[0] * hw, c[1] - u[1] * L - n[1] * hw]];
  poly = cut(poly, -1, 0, -box.x0); poly = cut(poly, 1, 0, box.x1); poly = cut(poly, 0, -1, -box.y0); poly = cut(poly, 0, 1, box.y1);
  return poly;
}

export function createGateScene(host, { specs } = {}) {
  const st = createStage(host, { views: [{ id: 'gate', label: 'The gate, rail side' }, { id: 'latch', label: 'At the latch', yaw0: Math.PI }], soilDepth: 6 });
  const R = st.root;
  const tag = (o, what, unit) => { o.traverse(c => { if (c.isMesh) { c.userData.what = what; if (unit) c.userData.unit = unit; } }); return o; };
  const conc = surfaceMaterial(THREE, 'concrete', 0xaaa8a2), slump = surfaceMaterial(THREE, 'soil', 0x5a4636);
  const gapMat = new THREE.MeshBasicMaterial({ color: 0x120c07 }), rotMat = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  const gray = surfaceMaterial(THREE, 'wood', 0x9b968c);
  const paint = new THREE.MeshStandardMaterial({ color: 0x1c1e21, roughness: .55, metalness: .35 });
  const HOLES = [st.hole(-3, .4), st.hole(3, .4)];
  let state = { w: 4, brace: 'right', post: 'steel', y: 0 };
  let built = null;
  const baseWood = new Map();

  function make() {
    if (built) { R.remove(built.group); built.group.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); built.lib.dispose?.(); HOLES.forEach(h => h.set(0)); baseWood.clear(); }
    const steelPost = state.post === 'steel', gpIn = steelPost ? BOX_IN : 3.5;
    const half = (state.w * 12 + gpIn) / 2 * IN;
    const F = fence(STYLE_ND, -half, half, { noDig: true, z: 0, specs, gates: [{ at: half, ft: state.w }], extra: { gPostIn: gpIn, gBrace: BRACE_APP[state.brace] } });
    const g = new THREE.Group(); g.add(F.group); R.add(g);
    // the app's own posts are replaced by ours (below), so they are hidden
    const appPosts = F.parts.filter(p => p.part?.kind === 'gatepost' || p.kind === 'gatepost' || p.kind === 'post');
    const woodMat = appPosts.find(p => p.geo === 'BoxGeometry')?.mesh.material || F.parts[0]?.mesh.material;
    const faceRef = appPosts.find(p => p.geo === 'ExtrudeGeometry');
    reveal(appPosts, () => 0);
    F.group.updateMatrixWorld(true);
    // the gate as the app built it: root (at the hinge post) → pivot (the hinge pin) → leaf
    let root = null; F.group.traverse(o => { if (o.userData.gateLeafDirection != null && !root) root = o; });
    const pivot = root.children.find(c => c.isGroup), leaf = pivot.children.find(c => c.isGroup);
    const dir = root.userData.gateLeafDirection;                  // +1: hinges on the left, latch to the right
    const pin = new THREE.Vector3(); pivot.getWorldPosition(pin);
    const hingeX = root.getWorldPosition(new THREE.Vector3()).x, latchX = -hingeX;
    const kindOf = m => m.userData.parts?.[0]?.kind;
    const leafMeshes = []; leaf.traverse(o => { if (o.isMesh) leafMeshes.push(o); });
    // GFS hangs wood gates on 8 in butterfly hinges and closes them on a post latch. The app draws a
    // plain tapered wing and a box latch with a separate pull handle; the Lab's copy swaps in the real
    // shapes, in the same places and on the same pins, so the gate moves exactly as before.
    { const hw = []; root.traverse(o => { if (o.isMesh && /^(ghinge|glatch|ghandle)$/.test(kindOf(o))) hw.push(o); });
      const drop = o => { o.parent.remove(o); const k = leafMeshes.indexOf(o); if (k >= 0) leafMeshes.splice(k, 1); };
      const cyl = o => o.geometry.type === 'CylinderGeometry', hOf = o => o.geometry.parameters.height;
      // hinges
      const hinge = hw.filter(o => kindOf(o) === 'ghinge'), barrels = hinge.filter(o => cyl(o) && hOf(o) > 6 * IN);
      const bGeo = new THREE.CylinderGeometry(BFLY.barrelR * IN, BFLY.barrelR * IN, BFLY.barrelH * IN, 12), leafGeo = butterflyLeaf();
      const near = o => barrels.reduce((a, c) => Math.abs(c.position.y - o.position.y) < Math.abs(a.position.y - o.position.y) ? c : a);
      for (const o of hinge) {
        if (o.geometry.type === 'ExtrudeGeometry') o.geometry = leafGeo;
        else if (barrels.includes(o)) o.geometry = bGeo;
        else if (cyl(o) && hOf(o) > .6 * IN) drop(o);   // the app's knuckle rings
        else if (cyl(o)) {   // a lag screw: out to the corner of its leaf, and a second one near the barrel
          const b = near(o), sx = Math.sign(o.position.x - b.position.x) || 1, sy = Math.sign(o.position.y - b.position.y) || 1;
          const c2 = o.clone(); c2.userData = o.userData; o.parent.add(c2); if (leafMeshes.includes(o)) leafMeshes.push(c2);
          o.position.x = b.position.x + sx * (BFLY.leafW * .8 - .28) * IN; o.position.y = b.position.y + sy * (BFLY.outerH / 2 - .75) * IN;
          c2.position.x = b.position.x + sx * .62 * IN; c2.position.y = b.position.y + sy * (BFLY.innerH / 2 - .55) * IN;
        }
      }
      // latch
      const latch = hw.filter(o => kindOf(o) === 'glatch'), ix = o => o.userData.parts[0].index;
      const plateM = latch.find(o => ix(o) === 0), arm = latch.find(o => ix(o) === 2), tab = latch.find(o => ix(o) === 3);
      const catchPlate = latch.find(o => ix(o) === 4 && o.geometry.type === 'BoxGeometry' && hOf(o) > 2 * IN);
      if (plateM && arm && catchPlate) {
        const out = Math.sign(arm.position.z - plateM.position.z) || 1;
        plateM.geometry = latchPlate();
        arm.geometry = new THREE.CylinderGeometry(.2 * IN, .2 * IN, arm.geometry.parameters.width, 12).rotateZ(Math.PI / 2);
        if (tab) drop(tab);
        // the grip: a band that stands off the plate above the bar
        const grip = new THREE.Mesh(new THREE.BoxGeometry(1.15 * IN, 1.5 * IN, .5 * IN), plateM.material); grip.position.set(plateM.position.x, plateM.position.y + 1.25 * IN, plateM.position.z + out * .3 * IN);
        grip.castShadow = true; grip.userData = { ...plateM.userData, parts: [{ ...plateM.userData.parts[0], index: 6 }] }; plateM.parent.add(grip); leafMeshes.push(grip);
        // the catch on the post: a narrow strap between two square feet
        const cd = catchPlate.geometry.parameters.depth;
        catchPlate.geometry = new THREE.BoxGeometry(.36 * IN, 5.2 * IN, cd);
        for (const sy of [1, -1]) { const f = new THREE.Mesh(new THREE.BoxGeometry(.8 * IN, .8 * IN, cd), catchPlate.material); f.position.copy(catchPlate.position); f.position.y += sy * 2.2 * IN; f.castShadow = true; f.userData = catchPlate.userData; catchPlate.parent.add(f); }
        for (const o of latch.filter(o => ix(o) === 5)) {
          const onGate = Math.abs(o.position.x - plateM.position.x) < Math.abs(o.position.x - catchPlate.position.x), sy = Math.sign(o.position.y - (onGate ? plateM : catchPlate).position.y) || 1;
          o.position.y = onGate ? plateM.position.y + (sy > 0 ? 2.6 : -3.9) * IN : catchPlate.position.y + sy * 2.2 * IN;
        }
      }
      // the latch has its own grip: there is no separate pull handle
      for (const o of hw.filter(o => kindOf(o) === 'ghandle')) drop(o);
    }
    const bb = new THREE.Box3(), boxOf = o => bb.setFromObject(o).clone();
    const rails = leafMeshes.filter(m => kindOf(m) === 'grail').map(m => ({ m, b: boxOf(m) })).sort((a, b) => a.b.min.y - b.b.min.y);
    const stiles = leafMeshes.filter(m => kindOf(m) === 'gstile').map(m => ({ m, b: boxOf(m) }));
    const braceM = leafMeshes.find(m => kindOf(m) === 'gbrace');
    const frameMat = rails[0].m.material, zR = (rails[0].b.min.z + rails[0].b.max.z) / 2, depth = rails[0].b.max.z - rails[0].b.min.z;
    const railH = rails[0].b.max.y - rails[0].b.min.y;
    const leafBox = new THREE.Box3(); for (const m of leafMeshes.filter(m => kindOf(m) === 'gpicket')) leafBox.union(boxOf(m));
    const x0 = Math.min(...rails.map(r => r.b.min.x)), x1 = Math.max(...rails.map(r => r.b.max.x));
    const stileW = stiles.length ? stiles[0].b.max.x - stiles[0].b.min.x : 3.5 * IN;
    // the brace line the app drew (or, with no brace, where one would go): through the frame's centre
    const yb = (rails[0].b.min.y + rails[0].b.max.y) / 2, yt = (rails.at(-1).b.min.y + rails.at(-1).b.max.y) / 2;
    const rw = x1 - x0, dx = Math.max(rw * .5, rw - 2 * railH), dy = Math.max(railH, yt - yb - railH), ang = Math.atan2(dy, dx);
    // the app turns its brace by ang·dir (bottom hinge corner up to top latch corner), or −ang·dir
    const a = ang * (state.brace === 'wrong' ? -1 : 1) * dir, u = [Math.cos(a), Math.sin(a)];
    const cxy = [(x0 + x1) / 2, (yb + yt) / 2];
    if (braceM) braceM.parent.remove(braceM);
    // the app's pull handle sits ¼ in into the bottom of the latch plate; it goes on just below it
    for (const m of leafMeshes.filter(m => kindOf(m) === 'ghandle')) m.position.y -= .3 * IN;
    let tubeLenIn = 0;
    // ── the wood frame, cut to fit: stiles and brace stop at the middle rail ──
    if (state.brace !== 'steel') {
      for (const s of stiles) {
        s.m.parent.remove(s.m);
        for (let i = 0; i + 1 < rails.length; i++) {
          const lo = rails[i].b.max.y, hi = rails[i + 1].b.min.y;
          const piece = plate([[s.b.min.x, lo], [s.b.max.x, lo], [s.b.max.x, hi], [s.b.min.x, hi]], depth, zR, frameMat);
          piece.userData.parts = [{ kind: 'gstile', index: i }]; leaf.attach(piece);
        }
      }
      if (state.brace !== 'none') {
        for (let i = 0; i + 1 < rails.length; i++) {
          const poly = band(cxy, u, 3.22 * IN / 2, { x0: x0 + stileW, x1: x1 - stileW, y0: rails[i].b.max.y, y1: rails[i + 1].b.min.y });
          if (poly.length < 3) continue;
          const piece = plate(poly, depth, zR, frameMat); piece.userData.parts = [{ kind: 'gbrace', index: i }]; leaf.attach(piece);
        }
      }
    } else {
      // ── GFS welded steel frame: 1½ in square tube around the edge and corner to corner ──
      for (const r of rails) r.m.parent.remove(r.m);
      for (const s of stiles) s.m.parent.remove(s.m);
      // the picket nails at the middle rail have nothing to go into now
      for (const m of leafMeshes.filter(m => kindOf(m) === 'fastener')) { const y = boxOf(m).getCenter(new THREE.Vector3()).y; if (Math.abs(y - yb) > railH && Math.abs(y - yt) > railH) m.parent.remove(m); }
      const T = TUBE.sizeIn * IN, tubes = [];
      const H = (y, a, b) => [[a, y - T / 2], [b, y - T / 2], [b, y + T / 2], [a, y + T / 2]];
      tubes.push(H(yb, x0, x1), H(yt, x0, x1));
      tubes.push([[x0, yb + T / 2], [x0 + T, yb + T / 2], [x0 + T, yt - T / 2], [x0, yt - T / 2]], [[x1 - T, yb + T / 2], [x1, yb + T / 2], [x1, yt - T / 2], [x1 - T, yt - T / 2]]);
      const c0 = [dir > 0 ? x0 + T : x1 - T, yb + T / 2], c1 = [dir > 0 ? x1 - T : x0 + T, yt - T / 2];
      const L = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]), ud = [(c1[0] - c0[0]) / L, (c1[1] - c0[1]) / L];
      tubes.push(band([(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2], ud, T / 2, { x0: x0 + T, x1: x1 - T, y0: yb + T / 2, y1: yt - T / 2 }));
      for (const [i, poly] of tubes.entries()) { const m = plate(poly, T, zR, paint); m.userData.parts = [{ kind: 'gframe', index: i }]; m.userData.unit = 'sframe'; leaf.attach(m); }
      tubeLenIn = (2 * rw + 2 * (yt - yb - T) + L) / IN;
    }
    // ── the posts ──
    F.group.updateMatrixWorld(true);
    const rootKids = root.children.filter(c => c.isMesh);
    // the front (picket-side) face of a post sits just behind the hinge leaves the app mounts on it
    let hingeBack = -Infinity; for (const m of rootKids) if ((kindOf(m) === 'ghinge' && m.geometry.type === 'ExtrudeGeometry') || (kindOf(m) === 'glatch' && m.geometry.type === 'BoxGeometry')) hingeBack = Math.max(hingeBack, boxOf(m).max.z);
    const front = hingeBack + .01 * IN;
    const posts = [hingeX, latchX].map((x, k) => {
      const grp = new THREE.Group(); grp.position.set(x, 0, 0); g.add(grp);
      const lifted = new THREE.Group(); grp.add(lifted);
      const o = { x, grp, lifted, k };
      if (steelPost) {
        const zc = front + (FACE_OFF + FACE_T / 2) * IN;
        const pp = tag(pipe(2.875, .203, PIPE_UP_IN + PIPE_DOWN_IN), 'gate post pipe', 'post' + k); pp.position.set(0, -PIPE_DOWN_IN * IN, zc); lifted.add(pp);
        [-1, 1].forEach(s => {
          const h = (s > 0 ? 69 : 67) * IN, b = new THREE.Mesh(new THREE.BoxGeometry(SIDE_T * IN, h, SIDE_D * IN), woodMat);
          b.position.set(s * (BOX_IN / 2 - SIDE_T / 2) * IN, h / 2, zc); b.castShadow = b.receiveShadow = true; lifted.add(tag(b, 'box side', 'post' + k));
          const f = new THREE.Mesh(faceRef.mesh.geometry, faceRef.mesh.material); f.userData.shared = true;
          const fb = faceRef.mesh.geometry.boundingBox || (faceRef.mesh.geometry.computeBoundingBox(), faceRef.mesh.geometry.boundingBox);
          const fw = fb.max.x - fb.min.x, ft = fb.max.z - fb.min.z;
          f.scale.set(BOX_IN * IN / fw, 1, FACE_T * IN / ft);
          f.position.set(-(fb.min.x + fb.max.x) / 2 * f.scale.x, 2.5 * IN - fb.min.y, zc + s * FACE_OFF * IN - (fb.min.z + fb.max.z) / 2 * f.scale.z);
          f.castShadow = f.receiveShadow = true; lifted.add(tag(f, 'box face', 'post' + k));
        });
        o.zc = zc;
      } else {
        const zc = front + 1.75 * IN;
        const p = tag(squarePost(woodMat, 3.5, 3.5, WOOD_POST.topIn, -POSTS.wood.set.postBotIn), '4×4 post', 'post' + k); p.position.z = zc; lifted.add(p);
        const set = POSTS.wood.set, r = set.holeIn / 2, D = set.depthIn;
        const c = concreteCut([[-r, 0], [r, 0], [r, D], [-r, D]], 1.75, D - set.postBotIn, conc); c.position.y = -D * IN; c.position.z = zc + .004; lifted.add(tag(c, 'concrete', 'post' + k));
        const top = footingTop(set.holeIn, 3.5, 3.5, conc); top.position.z = zc; lifted.add(tag(top, 'concrete', 'post' + k));
        o.wall = tag(collar(r, conc), 'concrete', 'post' + k); o.wall.position.z = zc; grp.add(o.wall);
        o.gap = facePatch(set.holeIn * IN, gapMat); o.fill = facePatch(set.holeIn * IN, slump); o.gap.userData.noCheck = o.fill.userData.noCheck = true; o.gap.position.z += zc; o.fill.position.z += zc; grp.add(o.gap, o.fill);
        const band2 = new THREE.Mesh(new THREE.BoxGeometry(3.62 * IN, 7 * IN, 3.62 * IN), rotMat); band2.userData.noCheck = true; band2.position.z = zc; lifted.add(band2); o.band = band2;
        o.zc = zc;
      }
      return o;
    });
    // hardware the app hangs on the posts moves with its post
    for (const m of rootKids) { const c = boxOf(m).getCenter(new THREE.Vector3()); posts[Math.abs(c.x - hingeX) < Math.abs(c.x - latchX) ? 0 : 1].lifted.attach(m); }
    // put the posts' centres on the cut
    const shift = -posts[0].zc; g.position.z = shift;
    if (!steelPost) posts.forEach((o, k) => { HOLES[k].move(o.x, POSTS.wood.set.holeIn / 2 * IN); HOLES[k].set(POSTS.wood.set.depthIn * IN); });
    // the leaf, re-hung on a group we can move as a whole
    const hang = new THREE.Group(); g.add(hang); g.updateMatrixWorld(true); hang.attach(leaf);
    hang.matrixAutoUpdate = false;
    // ── measure the gate for the sums ──
    g.updateMatrixWorld(true);
    let wLb = 0, mx = 0;
    const sideOf = x => (x - pin.x) * dir;     // inches from the hinge pin toward the latch, below
    leaf.traverse(o => {
      if (!o.isMesh) return;
      const k = kindOf(o), steelBit = /^(ghinge|glatch|ghandle|fastener)$/.test(k), tube = k === 'gframe';
      let lb;
      if (tube) lb = 0; else lb = volumeOf(o) * (steelBit ? STEEL.lbPerFt3 : PINE.lbPerFt3);
      const c = boxOf(o).getCenter(new THREE.Vector3());
      wLb += lb; mx += lb * sideOf(c.x);
    });
    if (state.brace === 'steel') { const lb = tubeArea() * tubeLenIn / 1728 * STEEL.lbPerFt3; wLb += lb; mx += lb * sideOf((x0 + x1) / 2); }
    const hingeYs = [...new Set(rootKids.filter(m => kindOf(m) === 'ghinge' && m.geometry.type === 'ExtrudeGeometry').map(m => Math.round(boxOf(m).getCenter(new THREE.Vector3()).y / IN * 4) / 4))];
    const pickets = leafMeshes.filter(m => kindOf(m) === 'gpicket').map(m => { const b = boxOf(m); return (b.max.x - b.min.x) / IN; });
    const line = state.brace === 'steel'
      ? { x0: dir > 0 ? x0 + TUBE.sizeIn * IN : x1 - TUBE.sizeIn * IN, y0: yb, x1: dir > 0 ? x1 - TUBE.sizeIn * IN : x0 + TUBE.sizeIn * IN, y1: yt }
      : (() => { const ys = [rails[0].b.max.y, rails.at(-1).b.min.y], at = y => cxy[0] + (y - cxy[1]) / u[1] * u[0]; return { x0: at(ys[0]), y0: ys[0], x1: at(ys[1]), y1: ys[1] }; })();
    const G = {
      weightLb: wLb, cgXIn: mx / wLb / IN, latchXIn: Math.abs((dir > 0 ? x1 : x0) - pin.x) / IN,
      rails: rails.map(r => (r.b.min.y + r.b.max.y) / 2 / IN), railHIn: railH / IN, pickets, hingeYs,
      brace: { x0: sideOf(line.x0) / IN, y0: line.y0 / IN, x1: sideOf(line.x1) / IN, y1: line.y1 / IN }, braceLenIn: Math.hypot(line.x1 - line.x0, line.y1 - line.y0) / IN,
      bottomIn: leafBox.min.y / IN
    };
    const yPin = Math.min(...hingeYs) * IN;
    // the post latch: its bar turns on a pin on the gate's plate and rests on a ledge on the catch
    const onLeaf = m => { for (let p = m.parent; p; p = p.parent) if (p === leaf) return true; return false; };
    const latchParts = leafMeshes.filter(m => kindOf(m) === 'glatch' && onLeaf(m));
    const barParts = latchParts.filter(m => [2, 3].includes(m.userData.parts[0].index));
    const pinPart = latchParts.find(m => m.userData.parts[0].index === 1);
    const ledge = posts[1].lifted.children.filter(m => kindOf(m) === 'glatch' && m.geometry.type === 'BoxGeometry' && m.geometry.parameters.height < .03).map(m => boxOf(m))[0];
    const pvW = pinPart ? boxOf(pinPart).getCenter(new THREE.Vector3()) : null;
    const latch = pvW && ledge ? {
      parts: barParts.map(m => { m.updateMatrix(); m.matrixAutoUpdate = false; return { m, M0: m.matrix.clone() }; }),
      pvLeaf: leaf.worldToLocal(pvW.clone()), pvHang: hang.worldToLocal(pvW.clone()),
      near: Math.min(Math.abs(ledge.min.x - pvW.x), Math.abs(ledge.max.x - pvW.x)) / IN
    } : null;
    built = { group: g, lib: F.lib, F, posts, leaf, hang, latch, pinZ: pin.z, pin: new THREE.Vector3(pin.x, yPin, 0), dir, G, steelPost, x0, x1, yb, yt, leafBox, hingeX, latchX, latchY: 0 };
    // where the latch is, for the close view
    let lb2 = null; for (const m of leafMeshes) if (kindOf(m) === 'glatch' && m.parent) lb2 = lb2 ? lb2.union(boxOf(m)) : boxOf(m);
    built.latchY = lb2 ? (lb2.min.y + lb2.max.y) / 2 : 47 * IN;
    const deep = steelPost ? 4.3 : 2.85, high = 6.7;   // the view takes in the posts' full depth in the ground
    st.frameView('gate', { cx: 0, cy: (high - deep) / 2, w: state.w + 2.4, h: high + deep });
    built.latchCx = latchX - dir * 4 * IN;
    set3(state.y);
  }

  // ── labels ──
  const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const L = {
    post: st.pin('gate', V3(0, 0), ''),
    brace: st.pin('gate', V3(0, 3.2, .2), ''),
    bend: st.pin('gate', V3(0, 6), ''),
    lift: st.pin('gate', V3(0, 6.4), ''),
    drop: st.pin('gate', V3(0, .2), ''),
    rot: st.pin('gate', V3(0, .5, .2), 'Decay starts at the soil line'),
    latch: st.pin('latch', V3(0, 4), '')
  };
  const status = {};
  for (const v of st.views) { const el = document.createElement('p'); el.className = 'l3d-status'; v.tag.append(el); status[v.id] = el; v.inset.bottom = 54; }
  const frac = v => { const n = Math.round(Math.abs(v) * 16); if (!n) return '0'; const w = Math.floor(n / 16), r = n % 16; let f = ''; if (r) { let a = r, d = 16; while (a % 2 === 0) { a /= 2; d /= 2; } f = `${a}/${d}`; } return [w || '', f].filter(Boolean).join(' '); };

  function set3(y) {
    const b = built; if (!b) return;
    state.y = y;
    const r = sag(b.G, { brace: state.brace, post: state.post, y });
    const { m } = season(y);
    const fz = m == null ? { depth: 0, thawed: 0 } : (() => { const f = [[0, 0], [0, .35], [0, .75], [0, 1], [.45, .8], [0, 0]], i = Math.min(4, Math.floor(m)), t = m - i, a = f[i], c = f[i + 1]; return { thawed: (a[0] + (c[0] - a[0]) * t) * 24, depth: (a[1] + (c[1] - a[1]) * t) * 24 }; })();
    st.ground.frost(fz.depth * IN, 1, fz.thawed * IN);
    st.ground.snow(m == null ? 0 : [0, .45, .9, .85, .25, 0][Math.round(m)]);
    // posts: frost lifts the ones in concrete; the hinge post bends a little toward the gate
    const lifts = [r.liftH * IN, r.liftL * IN];
    b.posts.forEach((o, k) => {
      o.lifted.position.y = lifts[k];
      if (o.wall) {
        o.wall.userData.set(lifts[k]);
        // under a footing frost has lifted: the gap it left, part filled by soil slumping in (as in Frost & posts)
        const set = POSTS.wood.set, bot = -set.depthIn * IN, wet = k ? WET.latch : WET.hinge;
        const base = Math.min(lifts[k], heave(set, season(y).done, wet) * IN), gapH = Math.max(0, lifts[k] - base);
        o.fill.userData.set(bot, lifts[k] - gapH); o.gap.userData.set(bot + lifts[k] - gapH, gapH);
      }
      if (o.band) { rotMat.opacity = decay({ decayFrom: 8 }, y) * .85; o.band.visible = rotMat.opacity > .02; }
    });
    const bend = r.post.u1 / r.post.y1;            // the hinge post, leaning toward the gate (radians)
    b.posts[0].lifted.rotation.z = -bend * b.dir;
    // the leaf: turns with the post about the bottom hinge, and racks
    const P = b.pin, M = new THREE.Matrix4(), T1 = new THREE.Matrix4().makeTranslation(-P.x, -P.y, 0), T2 = new THREE.Matrix4().makeTranslation(P.x + r.post.u2 * IN * b.dir, P.y + lifts[0], 0);
    const Rz = new THREE.Matrix4().makeRotationZ(-r.tilt * b.dir), S = new THREE.Matrix4().set(1, 0, 0, 0, -r.rack * b.dir, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    M.copy(T2).multiply(Rz).multiply(S).multiply(T1);
    // the latch: how far its pin has come down against the catch
    let dLatch = 0, ajar = false;
    if (b.latch) {
      const pv = b.latch.pvHang.clone().applyMatrix4(M);
      dLatch = (b.latch.pvHang.y - pv.y + lifts[1]) / IN;
      // the latch bar rides up the catch and still drops in for a while; past ¾ in it can't, and the gate stays ajar
      ajar = dLatch > LATCH_PLAY_IN;
      const phi = ajar ? 0 : Math.asin(clamp(dLatch / b.latch.near, 0, 1)) * b.dir;
      const Tp = new THREE.Matrix4().makeTranslation(b.latch.pvLeaf.x, b.latch.pvLeaf.y, b.latch.pvLeaf.z), Tm = new THREE.Matrix4().makeTranslation(-b.latch.pvLeaf.x, -b.latch.pvLeaf.y, -b.latch.pvLeaf.z), Rb = new THREE.Matrix4().makeRotationZ(phi);
      for (const q of b.latch.parts) { q.m.matrix.copy(Tp).multiply(Rb).multiply(Tm).multiply(q.M0); q.m.matrixWorldNeedsUpdate = true; }
    }
    if (ajar) {
      const Ry = new THREE.Matrix4().makeRotationY(AJAR * b.dir), Ta = new THREE.Matrix4().makeTranslation(b.pin.x, 0, b.pinZ), Tb = new THREE.Matrix4().makeTranslation(-b.pin.x, 0, -b.pinZ);
      M.premultiply(Tb).premultiply(Ry).premultiply(Ta);
    }
    b.ajar = ajar; b.dLatch = dLatch;
    // the close view follows the catch, and takes in the latch bar wherever it has dropped to
    st.frameView('latch', { cx: b.latchCx, cy: b.latchY + lifts[1] - dLatch * IN / 2 - .05, w: 1.5, h: 1.25 + Math.max(0, dLatch - 4) * IN });
    b.hang.matrix.copy(M); b.hang.matrixWorldNeedsUpdate = true;
    // weathering: bare treated pine goes silver-gray
    const wk = weather(y) * .7;
    const mtls = new Set(); b.group.traverse(o => { if (o.isMesh && o.material && (o.material.map || o.material.userData?.gfsFamily) && o.material !== paint) mtls.add(o.material); });
    for (const mtl of mtls) { if (!baseWood.has(mtl)) baseWood.set(mtl, mtl.color.clone()); mtl.color.copy(baseWood.get(mtl)).lerp(gray.color, wk); }
    // labels
    const lx = b.latchX, hx = b.hingeX, top = 6.3;
    L.post.set(b.steelPost ? 'GFS 3 in steel, driven 4 ft' : '4×4 in ~2½ ft of concrete'); L.post.move(V3(hx, -1.6, .15)); L.post.show(y < 1.5);
    L.brace.set({ none: 'No brace', wrong: 'Brace from the top hinge down', right: 'Brace from the bottom hinge up', steel: 'Welded 1½ in steel frame' }[state.brace]);
    L.brace.move(V3((b.x0 + b.x1) / 2, (b.yb + b.yt) / 2 + .35, .1)); L.brace.show(y < 1.5);
    L.bend.set(`Post leaning ${frac(r.postTopIn)} in at the top hinge`); L.bend.move(V3(hx, top + .1, .1)); L.bend.show(r.postTopIn >= 1 / 16 && y >= 1.5);
    L.lift.set(`Frost lifted this post ${frac(r.liftL)} in`); L.lift.move(V3(lx, top + .3 + lifts[1], .1)); L.lift.show(r.liftL >= 1 / 8);
    L.drop.set(r.drop >= 1 / 16 ? `Latch side down ${frac(r.drop)} in` : 'Latch side hasn’t dropped'); L.drop.move(V3((b.dir > 0 ? b.x1 : b.x0) - b.dir * .2, b.leafBox.min.y - .1, .1)); L.drop.show(y >= 1);
    L.rot.move(V3(hx, .45, .15)); L.rot.show(!b.steelPost && decay({ decayFrom: 8 }, y) > .25);
    const off = r.offset;
    L.latch.set(Math.abs(off) < 1 / 16 ? 'Latch lines up where it was set' : b.ajar ? `Latch bar ${frac(off)} in low: it can’t reach the catch` : `Latch ${frac(off)} in low: the bar rides up the catch`); L.latch.move(V3(lx - b.dir * 4 * IN, b.latchY + .3, -.3));
    const win = m != null && m < 5;
    status.gate.textContent = y < .5 ? 'Hung square and level on day one.' : [
      r.drop >= 1 / 16 ? `latch side down ${frac(r.drop)} in` : 'hasn’t moved',
      r.liftL >= 1 / 8 ? 'posts lifted by frost' : '', r.clear <= 0 ? 'dragging on the ground' : '', win ? 'winter' : ''].filter(Boolean).join(' · ').replace(/^./, c => c.toUpperCase());
    status.latch.textContent = Math.abs(off) < 1 / 16 ? 'Still latches like the day it was hung.' : b.ajar ? 'Won’t latch: the gate hangs open until it’s re-hung.' : off < .25 ? 'Still latches.' : 'Still latches, but it needs adjusting.';
    st.dirty();
    return r;
  }
  make();
  return {
    set(o) { const remake = ['w', 'brace', 'post'].some(k => o[k] != null && o[k] !== state[k]); Object.assign(state, o); if (remake) make(); else set3(state.y); return sag(built.G, state); },
    get state() { return { ...state }; }, get gate() { return built?.G; }, stage: st,
    numbers() { return sag(built.G, state); },
    check() {
      // hardware is built of pieces that sit in each other (a hinge's strap, knuckle and pin; a latch and its screws)
      return overlaps(solids(R), { allow: (a, b) => a.kind === 'fastener' || (a.unit && a.unit === b.unit) || (/^(ghinge|glatch|ghandle)$/.test(a.kind) && a.kind === b.kind) });
    },
    dispose() { st.dispose(); built?.lib?.dispose?.(); for (const mtl of [conc, slump, gapMat, rotMat, gray, paint]) mtl.dispose(); }
  };
}
