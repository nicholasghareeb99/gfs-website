// Gate sag in 3D: one wood gate between its two posts, seen from the rail side with the yard cut open
// at the posts, plus a close look at the latch from the picket side. The gate is the Executive App's
// own model for the no-dig dog-ear privacy style; the posts are either GFS's 3 in steel driven 4 ft
// in a wood box, or 4×4s in concrete. Everything moves at true size; the numbers are in gate-plan.mjs.
//
// Two things in the app's gate are changed here so no two parts pass through each other: the stiles
// and the brace stop at the middle rail (a carpenter cuts them to fit between rails), and the 3 in
// gate post's box is drawn 6 in wide so the 2⅞ in pipe fits inside it (the app's box is 5½ in, with
// 2½ in between its sides).
import { THREE, IN, createStage, fence, reveal, pipe, squarePost, concreteCut, footingTop, collar, facePatch, clamp, solids, overlaps, creased } from './lab3d.mjs';
import { surfaceMaterial } from './vendor/exec/real-surfaces.mjs';
import { sag, POSTS, TUBE, PINE, STEEL, WET, LATCH, tubeArea } from './gate-plan.mjs';
import { season, weather, decay, heave } from './build-plan.mjs';
import { STYLE_ND } from './dig-plan.mjs';

const BRACE_APP = { none: 'none', wrong: 'hh', right: 'auto', steel: 'none' };
const PIPE_UP_IN = 66.75, PIPE_DOWN_IN = 48;      // the app's gate pipe above grade; driven 4 ft
const BOX_IN = 6, SIDE_T = 1.5, SIDE_D = 3.5, FACE_T = .75, FACE_OFF = 2.125;
const WOOD_POST = { topIn: 72 };                  // an 8 ft 4×4, 2 ft of it in the ground
// Gate hardware. GFS hangs wood gates on Nationwide ornamental butterfly hinges and closes them on a
// Nationwide standard post latch; both are drawn from the maker's own drawing and tape-measure photos.
//  • Butterfly hinge: about 5¼ in wide open and 7 in tall at its outer corners. Each leaf has two
//    kite-shaped cut-outs and three lag screws, and the barrel is 5 in tall. Two hinges on a gate.
//  • Post latch: a receiver, 5.47 in tall, lagged to the side of the latch post that looks at the gate,
//    so it sits in the gap. In it a flat arm, 10.63 in long, turns on one bolt. The arm's hooked end
//    stands out past the fence on the side the gate swings to, and its long tail comes out the other
//    side so the gate opens from both. A 0.71 in striker rod, 6.4 in long, is lagged flat to the gate
//    and reaches across the gap into the hook; a spring holds the hook down on the rod.
//  • Beside the latch, an arched pull handle with spear ends, from a GFS gate photo
//    (assets/img/work/pt-shadowbox-gate-detail.jpg).
// The hardware goes on the side the gate swings to. The Lab shows a gate that swings to the picket side.
const BFLY = { leafW: 2.3, innerH: 5.5, outerH: 7.1, barrelH: 5, barrelR: .28, t: .09,
  holes: [[1.65, 2.76], [1.42, 0], [1.8, -2.73]] };   // the three lag holes, from the barrel's centre line
const ring = (pts, sc = IN) => { const p = new THREE.Path(); pts.forEach(([x, y], i) => i ? p.lineTo(x * sc, y * sc) : p.moveTo(x * sc, y * sc)); p.closePath(); return p; };
function butterflyLeaf() {
  const r = BFLY.barrelR, W = r + BFLY.leafW, a = BFLY.innerH / 2, o = BFLY.outerH / 2, I = IN, sh = new THREE.Shape();
  // top half of the outline, from the barrel out: the top edge climbs to the outer corner, then the
  // outer edge steps in and draws in a little more at the waist
  const half = [[r + .02, a], [W - .2, o], [W, o - .13], [W, o - 1.3], [W - .18, o - 1.5], [W - .18, 1.05], [W - .3, 0]];
  sh.moveTo((r + .02) * I, 0); for (const [x, y] of half) sh.lineTo(x * I, y * I);
  for (const [x, y] of half.slice(0, -1).reverse()) sh.lineTo(x * I, -y * I);
  sh.closePath();
  for (const sy of [1, -1]) sh.holes.push(ring([[1.47, 1.98 * sy], [1.87, .8 * sy], [1.6, .45 * sy], [1.34, .45 * sy], [1.07, .8 * sy]]));
  for (const [x, y] of BFLY.holes) sh.holes.push(ring([[x, y + .17], [x + .17, y], [x, y - .17], [x - .17, y]]));
  const g = new THREE.ExtrudeGeometry(sh, { depth: BFLY.t * IN, bevelEnabled: false }); g.translate(0, 0, -BFLY.t * IN / 2); return g;
}
// the barrel: three knuckles with a line between them, and the head of the pin on top
function butterflyBarrel() {
  const r = BFLY.barrelR, h = BFLY.barrelH / 2, k = h / 3, P = [[0, -h]];
  P.push([r, -h], [r, -k - .03], [r - .04, -k - .01], [r - .04, -k + .01], [r, -k + .03], [r, k - .03], [r - .04, k - .01], [r - .04, k + .01], [r, k + .03], [r, h], [.13, h], [.13, h + .14], [0, h + .14]);
  return creased(new THREE.LatheGeometry(P.map(([x, y]) => new THREE.Vector2(x * IN, y * IN)), 32), 40);
}
// The post latch, in inches. u runs along the arm from the tip of its hook (0) to the end of its
// tail (10.63); v is up from the bolt the arm turns on; x is out from the post toward the gate.
const PL = { uN: 2.44, uPivot: 5.62, t: .12, rise: .3, lip: LATCH.lipIn, rodR: LATCH.rodIn / 2, rodLen: 6.42, past: .35 };
const circle = (u, v, r) => { const p = new THREE.Path(); p.absarc((u - PL.uN) * IN, v * IN, r * IN, 0, Math.PI * 2, true); return p; };
const slab = (sh, x0, t) => { const g = new THREE.ExtrudeGeometry(sh, { depth: t * IN, bevelEnabled: false, curveSegments: 20 }); g.translate(0, 0, x0 * IN); return creased(g, 40); };
function latchArm() {
  const s = new THREE.Shape(), X = u => (u - PL.uN) * IN, L = (u, v) => s.lineTo(X(u), v * IN), Q = (a, b, u, v) => s.quadraticCurveTo(X(a), b * IN, X(u), v * IN);
  s.moveTo(X(.25), 1.37 * IN); L(10.3, 1.27); Q(10.63, 1.27, 10.63, .95); Q(10.63, .62, 10.3, .62);   // top edge, round end of the tail
  L(6.55, .32); Q(6.15, .32, 6.15, 0); L(6.15, -.6); L(5.76, -.94); L(2.83, -.94); L(2.83, 0);              // under the tail, the body
  s.absarc(0, 0, .39 * IN, 0, Math.PI, false);                                                         // the hook, open underneath
  L(1.99, -.41); L(1.85, -.55); L(1.67, -.62); L(.07, .66); Q(0, .71, 0, .95); L(0, 1.12); Q(0, 1.37, .25, 1.37);   // its jaw, and the ramp the rod rides up
  s.holes.push(circle(.36, 1.01, .19), circle(1.96, 1.01, .19), circle(5.85, 1.01, .19), ring([[3.2 - PL.uN, -.45], [3.6 - PL.uN, -.45], [3.6 - PL.uN, .35], [3.2 - PL.uN, .35]]));
  return slab(s, PL.rise, PL.t);
}
// The receiver's front plate, 4.53 in wide: the arm turns between it and the bracket on the post. Its
// left ear is the lip the rod has to clear on its way in; the hook comes down behind the rod above it.
function latchPlate() {
  const s = new THREE.Shape(), X = u => (u - PL.uN) * IN, L = (u, v) => s.lineTo(X(u), v * IN);
  s.moveTo(X(2.83), .55 * IN); L(6.15, .55); L(6.15, -1.25); L(5.95, -1.45); L(5.6, -1.45); L(5.45, -1); L(2.45, -1); L(2.3, -1.45); L(1.84, -1.45); L(1.64, -1.25); L(1.64, -.72); L(1.79, -PL.lip); L(2.83, -PL.lip);
  s.holes.push(circle(1.96, -1.02, .19), circle(5.85, -1.02, .19), ring([[3.25 - PL.uN, -.25], [3.55 - PL.uN, -.25], [3.55 - PL.uN, .2], [3.25 - PL.uN, .2]]));
  return slab(s, PL.rise + PL.t, .1);
}
// The striker rod, from the maker's drawing: 0.71 in round for 2 in, then pressed flat over the next 1.9 in
// into a tab 0.94 in wide with two square holes. s runs from its round tip back along the gate, v is up,
// n is out from the gate's face (the rod lies on the face, flat side down).
function strikerRod() {
  const R = PL.rodR, round = 2, taper = 1.87, a = round + taper, b = PL.rodLen, tw = .47, tt = .12;
  const cyl = new THREE.CylinderGeometry(R * IN, R * IN, round * IN, 32); cyl.rotateZ(Math.PI / 2); cyl.translate(round / 2 * IN, 0, R * IN);
  // the pressed part: a square the size of the rod at one end, the tab's flat section at the other
  const P = [[round, -R, 0], [round, R, 0], [round, R, 2 * R], [round, -R, 2 * R], [a, -tw, 0], [a, tw, 0], [a, tw, tt], [a, -tw, tt]].map(q => q.map(c => c * IN));
  const F = [[0, 1, 2, 3], [5, 4, 7, 6], [1, 0, 4, 5], [3, 2, 6, 7], [2, 1, 5, 6], [0, 3, 7, 4]], pos = [];
  for (const [i, j, k, l] of F) for (const q of [i, k, j, i, l, k]) pos.push(...P[q]);   // wound to face outward
  const wedge = new THREE.BufferGeometry(); wedge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); wedge.computeVertexNormals();
  const t = new THREE.Shape(); t.moveTo(a * IN, -tw * IN); t.lineTo((b - .12) * IN, -tw * IN); t.lineTo(b * IN, -.3 * IN); t.lineTo(b * IN, .3 * IN); t.lineTo((b - .12) * IN, tw * IN); t.lineTo(a * IN, tw * IN); t.closePath();
  const holes = [4.28, 5.88];
  for (const h of holes) t.holes.push(ring([[h - .15, -.15], [h + .15, -.15], [h + .15, .15], [h - .15, .15]]));
  return { cyl, wedge, tab: new THREE.ExtrudeGeometry(t, { depth: tt * IN, bevelEnabled: false }), holes };
}
// the latch's spring: a coil one foot long up its own y axis, stretched to fit between its two hooks
class Coil extends THREE.Curve { getPoint(t, o = new THREE.Vector3()) { const a = t * Math.PI * 2 * 9; return o.set(Math.cos(a) * .1 * IN, t, Math.sin(a) * .1 * IN); } }
// a hex head (a lag screw or a bolt), lying on a face: its axis is local z
const hexHead = (r, h) => { const g = new THREE.CylinderGeometry(r * IN, r * IN, h * IN, 6); g.rotateX(Math.PI / 2); return g; };
// The pull handle is 10½ in long; its top is 41% of its height above the latch, and it sits 2½ in in from the gate’s edge.
const HANDLE = { inIn: 2.5, h: 10.5 };
const UP = new THREE.Vector3(0, 1, 0), LATCH_VIEW_YAW = .7;   // the close view looks at the latch from a little to the gate's side
// a flat spear-shaped end of the pull handle; sy = 1 points up, −1 down. (0, 0) is its tip.
function spearEnd(sy) {
  const I = IN, sh = new THREE.Shape(), P = [[-.3, 0], [.3, 0], [.56, -.5], [.5, -1.7], [-.5, -1.7], [-.56, -.5]];
  const pts = sy > 0 ? P : P.map(([x, y]) => [-x, -y]);
  sh.moveTo(pts[0][0] * I, pts[0][1] * I); for (const [x, y] of pts.slice(1)) sh.lineTo(x * I, y * I); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: .1 * I, bevelEnabled: false }); g.translate(0, 0, -.05 * I); return g;
}
// the arched grip between the two ends: len long, standing 1.3 in off the gate at its middle, 0.9 in wide
function archGrip(len, out) {
  const I = IN, a = len / 2, hgt = 1.3 * I, t = .28 * I, sh = new THREE.Shape();
  sh.moveTo(-a, 0); sh.quadraticCurveTo(0, 2 * hgt, a, 0); sh.lineTo(a - t * 1.6, 0); sh.quadraticCurveTo(0, 2 * (hgt - t), -a + t * 1.6, 0); sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: .9 * I, bevelEnabled: false, curveSegments: 28 }); g.translate(0, 0, -.45 * I);
  // shape x → up the gate, shape y → out from its face, extrusion → across the gate
  g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, out, 0), new THREE.Vector3(0, 0, out), new THREE.Vector3(1, 0, 0)));
  return creased(g, 30);   // one smooth bend, with crisp edges
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
  const iron = new THREE.MeshStandardMaterial({ color: 0x23262a, roughness: .42, metalness: .6 });   // black powder-coated hardware, with enough sheen to read its shape
  const HOLES = [st.hole(-3, .4), st.hole(3, .4)];
  let state = { w: 4, brace: 'right', post: 'steel', y: 0 };
  let built = null;
  const baseWood = new Map();

  function make() {
    if (built) { R.remove(built.group); built.group.traverse(o => { if (o.geometry && !o.userData.shared) o.geometry.dispose(); }); built.lib.dispose?.(); HOLES.forEach(h => h.set(0)); baseWood.clear(); }
    const steelPost = state.post === 'steel', gpIn = steelPost ? BOX_IN : 3.5;
    const half = (state.w * 12 + gpIn) / 2 * IN;
    const F = fence(STYLE_ND, -half, half, { noDig: true, z: 0, specs, gates: [{ at: half, ft: state.w }], extra: { gPostIn: gpIn, gBrace: BRACE_APP[state.brace], gHinges: 2 } });
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
    // The app draws a plain tapered hinge wing and a box latch; the Lab's copy swaps in the hinges and
    // the post latch GFS fits (see the note at the top). The hinges stay on the app's pins, so the gate
    // turns exactly as before.
    const bb = new THREE.Box3(), boxOf = o => bb.setFromObject(o).clone();
    const pkBox = new THREE.Box3(); for (const m of leafMeshes.filter(m => kindOf(m) === 'gpicket')) pkBox.union(boxOf(m));
    const railBox = new THREE.Box3(); for (const m of leafMeshes.filter(m => kindOf(m) === 'grail')) railBox.union(boxOf(m));
    const out = Math.sign(pin.z - (pkBox.min.z + pkBox.max.z) / 2) || -1;      // which way the hardware faces
    const zFace = out < 0 ? pkBox.min.z : pkBox.max.z;                          // the pickets' face, flush with the posts'
    const edgeX = dir > 0 ? railBox.max.x : railBox.min.x, jambX = latchX - dir * gpIn / 2 * IN;   // the gate's latch edge; the post's side
    let latchKit = null;
    { const hw = []; root.traverse(o => { if (o.isMesh && /^(ghinge|glatch|ghandle)$/.test(kindOf(o))) hw.push(o); });
      const drop = o => { o.parent.remove(o); const k = leafMeshes.indexOf(o); if (k >= 0) leafMeshes.splice(k, 1); };
      const cyl = o => o.geometry.type === 'CylinderGeometry', hOf = o => o.geometry.parameters.height;
      const hinge = hw.filter(o => kindOf(o) === 'ghinge'), mat = iron;
      // a new piece, placed in the yard's own coordinates and then handed to the post (root) or the gate (leaf)
      const put = (geo, kind, index, to, M) => {
        const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.userData.parts = [{ kind, index, gate: true }];
        if (M) m.applyMatrix4(M); R.add(m); to.attach(m); if (to === leaf) leafMeshes.push(m); return m;
      };
      const at = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
      // ── hinges ──
      const barrels = hinge.filter(o => cyl(o) && hOf(o) > 3 * IN), leafGeo = butterflyLeaf(), barrelGeo = butterflyBarrel(), lag = hexHead(.25, .2);
      const zOf = (o, z) => { o.position.z += z - o.getWorldPosition(new THREE.Vector3()).z; };
      barrels.forEach((b, k) => {
        const c = b.getWorldPosition(new THREE.Vector3());
        b.geometry = barrelGeo; b.material = mat; zOf(b, zFace + out * .1 * IN);
        for (const [side, to] of [[-dir, root], [dir, leaf]]) for (const [hx, hy] of BFLY.holes) put(lag, 'ghinge', k, to, at(c.x + side * hx * IN, c.y + hy * IN, zFace + out * (BFLY.t + .1) * IN));
      });
      for (const o of hinge) {
        if (barrels.includes(o)) continue;
        if (o.geometry.type === 'ExtrudeGeometry') { o.geometry = leafGeo; o.material = mat; zOf(o, zFace + out * BFLY.t / 2 * IN); }
        else drop(o);                                   // the app's knuckle rings and its screws
      }
      // ── the post latch ──
      const old = hw.filter(o => kindOf(o) === 'glatch'), pv = old.find(o => o.userData.parts[0].index === 1) || old[0];
      const ly = pv ? pv.getWorldPosition(new THREE.Vector3()).y : 47 * IN;        // the height the app sets its latch at
      for (const o of hw) if (kindOf(o) !== 'ghinge') drop(o);
      const zN = zFace + out * PL.rodR * IN;                                         // the rod lies on the gate's face
      // receiver and arm: u − uN → along the post's side toward the far face, v → up, x → out into the gap
      const Lm = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -out), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-dir, 0, 0)).setPosition(jambX, ly, zN);
      const box = (u0, u1, v0, v1, x0, x1) => { const g = new THREE.BoxGeometry((u1 - u0) * IN, (v1 - v0) * IN, (x1 - x0) * IN); g.translate(((u0 + u1) / 2 - PL.uN) * IN, (v0 + v1) / 2 * IN, (x0 + x1) / 2 * IN); return g; };
      const hexAt = (u, v, x0, r, h) => { const g = hexHead(r, h); g.translate((u - PL.uN) * IN, v * IN, (x0 + h / 2) * IN); return g; };
      for (const sy of [1, -1]) {
        put(box(2.56, 5.28, sy > 0 ? 1.6 : -2.735, sy > 0 ? 2.735 : -1.6, 0, .1), 'glatch', 0, root, Lm);                 // a flange, flat on the post
        put(box(2.56, 5.28, sy * 1.6 - .05, sy * 1.6 + .05, 0, PL.rise), 'glatch', 0, root, Lm);                              // the step up from it
        put(hexAt(4.02, sy * 2.3, .1, .25, .2), 'glatch', 5, root, Lm);                                                      // its lag screw
      }
      put(box(2.56, 5.28, -1.6, 1.6, PL.rise - .1, PL.rise), 'glatch', 0, root, Lm);                                         // the bracket's raised middle, behind the arm
      const arm = put(latchArm(), 'glatch', 2, root, Lm);
      put(latchPlate(), 'glatch', 0, root, Lm);                                                                              // the front plate, over the arm
      put(box(3.3, 3.5, -.2, .15, PL.rise, PL.rise + PL.t + .16), 'glatch', 0, root, Lm);                                    // the stop that comes through the arm and the plate
      const bolt = put(hexAt(PL.uPivot, 0, PL.rise + PL.t + .1, .28, .18), 'glatch', 1, root, Lm);                           // the bolt the arm turns on
      const spring = put(new THREE.TubeGeometry(new Coil(), 150, .028 * IN, 5), 'glatch', 3, root); spring.userData.noCheck = true;
      // striker rod: s → from its tip back along the gate, v → up, n → out from the gate's face
      const Gm = new THREE.Matrix4().makeBasis(new THREE.Vector3(-dir, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, out)).setPosition(jambX + dir * PL.past * IN, ly, zFace);
      const rod = strikerRod(), rodM = put(rod.cyl, 'glatch', 4, leaf, Gm); put(rod.wedge, 'glatch', 4, leaf, Gm); put(rod.tab, 'glatch', 4, leaf, Gm);
      for (const h of rod.holes) { const g = hexHead(.25, .2); g.translate(h * IN, 0, .22 * IN); put(g, 'glatch', 5, leaf, Gm); }
      // ── the pull handle, arched over the rod ──
      const xh = edgeX - dir * HANDLE.inIn * IN, top = ly + HANDLE.h * .41 * IN, bot = top - HANDLE.h * IN, z0 = zFace + out * .05 * IN;
      [[top, 1], [bot, -1]].forEach(([y, sy], k) => put(spearEnd(sy), 'ghandle', k, leaf, at(xh, y, z0)));
      put(archGrip((HANDLE.h - 3.2) * IN, out), 'ghandle', 2, leaf, at(xh, (top + bot) / 2, z0));
      for (const y of [top - .9 * IN, bot + .9 * IN]) put(lag, 'ghandle', 3, leaf, at(xh, y, zFace + out * .2 * IN));
      latchKit = { arm, bolt, spring, rodM, out };
    }
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
    // the front (picket-side) face of a post is flush with the gate's pickets, so a hinge lies flat across both
    const front = zFace;
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
    // the post latch: its arm turns on the bolt, and its hook comes down over the rod on the gate
    const K = latchKit, lifted = posts[1].lifted, ctr = m => boxOf(m).getCenter(new THREE.Vector3());
    const pvW = ctr(K.bolt), rodW = ctr(K.rodM), off = (dx, dv, du) => lifted.worldToLocal(pvW.clone().add(new THREE.Vector3(-dir * dx * IN, dv * IN, -K.out * du * IN)));
    K.arm.updateMatrix(); K.arm.matrixAutoUpdate = false;
    const latch = {
      arm: K.arm, M0: K.arm.matrix.clone(), pv: lifted.worldToLocal(pvW.clone()), pvHang: hang.worldToLocal(rodW.clone()), out: K.out,
      armIn: PL.uPivot - PL.uN,                     // from the bolt to the hook
      stopIn: PL.uN - 1.64 + PL.rodR,               // a rod that misses the slot stops this far out, against the receiver
      // the spring's two hooks: on the top flange, and on the arm beside its tail (from the bolt: toward the gate, up, along the arm)
      spring: K.spring, A: off(-.51, 2.22, -.54), B0: off(-.25, 1.15, .79)
    };
    built = { group: g, lib: F.lib, F, posts, leaf, hang, latch, pinZ: pin.z, pin: new THREE.Vector3(pin.x, yPin, 0), dir, G, steelPost, x0, x1, yb, yt, leafBox, hingeX, latchX, latchY: 0 };
    // where the latch is, for the close view
    let lb2 = null; for (const m of leafMeshes) if (kindOf(m) === 'glatch' && m.parent) lb2 = lb2 ? lb2.union(boxOf(m)) : boxOf(m);
    built.latchY = lb2 ? (lb2.min.y + lb2.max.y) / 2 : 47 * IN;
    const deep = steelPost ? 4.3 : 2.85, high = 6.7;   // the view takes in the posts' full depth in the ground
    st.frameView('gate', { cx: 0, cy: (high - deep) / 2, w: state.w + 2.4, h: high + deep });
    built.latchCx = jambX - dir * 1.5 * IN; built.zFace = zFace + shift; built.out = out;
    built.backIn = Math.abs(posts[1].zc - (out < 0 ? pkBox.max.z : pkBox.min.z)) / IN;   // from the post's centre line to the back of the gate's pickets
    st.views.find(v => v.id === 'latch').yaw0 = (out < 0 ? Math.PI : 0) - dir * out * LATCH_VIEW_YAW;
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
    // the latch: how far the rod on the gate has come down against the latch on the post
    let dLatch = 0, ajar = false, ride = 0;
    if (b.latch) {
      const K = b.latch, rod = K.pvHang.clone().applyMatrix4(M);
      dLatch = (K.pvHang.y - rod.y + lifts[1]) / IN;
      // The rod has ¼ in of room in the receiver's slot. Lower than that it rides up over the slot's lip
      // as the gate is pushed shut, so the latch ends up carrying the gate's corner. Once the rod's
      // centre is below the lip it hits it square: the gate stops there and won't latch.
      // (A rod that sits high just lifts the hook: there is no lip above it.)
      ajar = dLatch > LATCH.maxIn;
      ride = ajar ? 0 : Math.max(0, dLatch - LATCH.cleanIn);
      const Tz = (v, k = 1) => new THREE.Matrix4().makeTranslation(v.x * k, v.y * k, v.z * k);
      if (ride) M.premultiply(Tz(P, -1)).premultiply(new THREE.Matrix4().makeRotationZ(ride / b.G.latchXIn * b.dir)).premultiply(Tz(P));
      const phi = ajar ? 0 : K.out * Math.asin(clamp((dLatch - ride) / K.armIn, -.5, .5));
      const T = Tz(K.pv).multiply(new THREE.Matrix4().makeRotationX(phi)).multiply(Tz(K.pv, -1));
      K.arm.matrix.copy(T).multiply(K.M0); K.arm.matrixWorldNeedsUpdate = true;
      const d = K.B0.clone().applyMatrix4(T).sub(K.A), len = d.length();
      K.spring.position.copy(K.A); K.spring.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len)); K.spring.scale.set(1, len, 1);
    }
    let onFooting = false;
    if (ajar) {
      // The gate stops where the rod meets the receiver. If frost has pushed the latch post's footing up
      // higher than the gate's bottom corner, the corner meets the concrete first, further out.
      let stop = b.latch.stopIn;
      if (!b.steelPost && r.clear < r.liftL) { onFooting = true; stop = Math.max(stop, POSTS.wood.set.holeIn / 2 - b.backIn + .2); }
      const Ry = new THREE.Matrix4().makeRotationY(Math.asin(stop / b.G.latchXIn) * b.dir), Ta = new THREE.Matrix4().makeTranslation(b.pin.x, 0, b.pinZ), Tb = new THREE.Matrix4().makeTranslation(-b.pin.x, 0, -b.pinZ);
      M.premultiply(Tb).premultiply(Ry).premultiply(Ta);
    }
    b.ajar = ajar; b.dLatch = dLatch; b.ride = ride;
    // the close view stays on the latch, a little to the gate's side so the arm and its hook show
    st.frameView('latch', { cx: b.latchCx, cy: b.latchY + lifts[1] - .08, cz: b.zFace + b.out * 1.5 * IN, w: 1.45, h: 1.25 });
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
    const lowBy = `${frac(off)} in ${off < 0 ? 'high' : 'low'}`;
    L.latch.set(Math.abs(off) < 1 / 16 ? 'The rod sits in the latch where it was set' : b.ajar ? `Rod ${lowBy}: it hits the latch and stops` : b.ride ? `Rod ${lowBy}: it has to ride up into the latch` : `Rod ${lowBy}: still drops straight in`); L.latch.move(V3(b.latchCx, b.latchY + lifts[1] + .34, b.zFace + b.out * .25));
    const win = m != null && m < 5;
    status.gate.textContent = y < .5 ? 'Hung square and level on day one.' : [
      r.drop >= 1 / 16 ? `latch side down ${frac(r.drop)} in` : 'hasn’t moved',
      r.liftL >= 1 / 8 ? 'posts lifted by frost' : '', r.clear <= 0 ? 'dragging on the ground' : '', win ? 'winter' : ''].filter(Boolean).join(' · ').replace(/^./, c => c.toUpperCase());
    status.latch.textContent = Math.abs(off) < 1 / 16 ? 'Still latches like the day it was hung.' : b.ajar ? (onFooting ? 'Won’t latch: the gate’s corner hits the footing that frost pushed up.' : 'Won’t latch: the gate stays open until it’s re-hung.') : b.ride ? 'Latches with a push. The latch is holding the gate’s corner up, so it needs adjusting.' : 'Still latches.';
    st.dirty();
    return r;
  }
  make();
  return {
    set(o) { const remake = ['w', 'brace', 'post'].some(k => o[k] != null && o[k] !== state[k]); Object.assign(state, o); if (remake) make(); else set3(state.y); return sag(built.G, state); },
    get state() { return { ...state }; }, get gate() { return built?.G; }, stage: st,
    numbers() { return sag(built.G, state); },
    check() {
      // hardware is built of pieces that sit in each other (a hinge's leaf, barrel and screws; the latch's arm on its
      // receiver, the rod in its hook); the pull handle arches over the rod's flat end
      return overlaps(solids(R), { allow: (a, b) => a.kind === 'fastener' || (a.unit && a.unit === b.unit) || (/^(ghinge|glatch|ghandle)$/.test(a.kind) && a.kind === b.kind) || [a.kind, b.kind].sort().join() === 'ghandle,glatch' });
    },
    dispose() { st.dispose(); built?.lib?.dispose?.(); for (const mtl of [conc, slump, gapMat, rotMat, gray, paint, iron]) mtl.dispose(); }
  };
}
