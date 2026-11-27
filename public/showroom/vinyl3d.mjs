// Vinyl walls in 3D: two Kingston vinyl sections built from the Executive App's model, each running
// back into the yard from a post on the cut, with the wind blowing across them from the left. Each
// fence bends by the amount vinyl-plan.mjs works out, at true size (the post and the section with it,
// since the rails carry the push to the posts). Below the cut: the big-box post in its concrete, and
// GFS's steel driven 4 ft. The steel inside the GFS post above the ground isn't drawn; the
// cross-sections beside the picture show it.
import { THREE, IN, createStage, fence, reveal, pipe, squarePost, concreteCut, footingTop, solids, overlaps } from './lab3d.mjs';
import { surfaceMaterial } from './vendor/exec/real-surfaces.mjs';
import { bend, railLoads, POSTS, STEEL } from './vinyl-plan.mjs';
import { VINYL_SET } from './build-plan.mjs';

const STYLE = 'Kingston - White 6ft', N = 81;   // bend table: 0–80 in, every inch
const XS = { big: -14, gfs: 14 };

// make a material bend sideways (+x) by the table in its uniforms, above the ground only
function bendable(mat, u) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.uniforms.uBend = u.uBend; sh.uniforms.uBendK = u.uBendK;
    sh.vertexShader = 'uniform float uBend[' + N + '];\nuniform float uBendK;\n' + sh.vertexShader.replace('#include <project_vertex>', `vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
  mvPosition = instanceMatrix * mvPosition;
#endif
vec4 bw = modelMatrix * mvPosition;
float byIn = bw.y * 12.0;
if (byIn > 0.0) { float f = clamp(byIn, 0.0, ${N - 1}.0); int i = int(floor(f)); float t = f - float(i); bw.x += mix(uBend[i], uBend[min(i + 1, ${N - 1})], t) * uBendK; }
mvPosition = viewMatrix * bw;
gl_Position = projectionMatrix * mvPosition;`);
  };
  const key = mat.customProgramCacheKey?.bind(mat);
  mat.customProgramCacheKey = () => (key ? key() : '') + '-bend';
  mat.needsUpdate = true;
}

export function createVinylScene(host, { specs } = {}) {
  const st = createStage(host, { views: [{ id: 'big', label: 'Big-box: .135 in wall, set in concrete', tone: 'bad' }, { id: 'gfs', label: 'GFS: .150 in wall over steel driven 4 ft', tone: 'good' }], soilDepth: 7, width: 80, back: 120, home: { yaw: -.42, pitch: .14 } });
  const R = st.root, conc = surfaceMaterial(THREE, 'concrete', 0xaaa8a2);
  const F = {}, U = {};
  for (const id of ['big', 'gfs']) {
    const x = XS[id];
    const f = fence(STYLE, 0, 0, { specs, pts: [[x, 0, 0], [x, 0, -8]] });
    // the post on the cut keeps its middle on the cut plane; the app's vinyl posts are 5 in square
    const u = { uBend: { value: new Array(N).fill(0) }, uBendK: { value: 1 } };
    const mats = new Set(); f.group.traverse(o => { if (o.isMesh) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => mats.add(m)); } });
    mats.forEach(m => bendable(m, u));
    const g = new THREE.Group(); g.add(f.group); R.add(g);
    f.group.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); bendable(d, u); o.customDepthMaterial = d; } });
    // below the ground
    const near = f.parts.find(p => p.kind === 'post' && Math.abs((p.box.min.z + p.box.max.z) / 2) < .2);
    const zc = near ? (near.box.min.z + near.box.max.z) / 2 : 0;
    if (id === 'gfs') {
      // only the buried 4 ft is drawn: above the ground the steel is inside the vinyl post
      const p = pipe(STEEL.od, STEEL.wall, 48); p.position.set(x, -48 * IN, zc);
      p.traverse(o => { if (o.isMesh) { o.userData.what = 'steel post'; o.userData.unit = 'gfs-post'; } }); g.add(p);
    } else {
      const s = VINYL_SET, r = s.holeIn / 2;
      const stub = squarePost(near?.mesh.material || new THREE.MeshStandardMaterial({ color: 0xf2f2ee }), 5, 5, 0, -s.postBotIn); stub.position.set(x, 0, zc); stub.traverse(o => { if (o.isMesh) { o.userData.what = 'vinyl post'; o.userData.unit = 'big-post'; } }); g.add(stub);
      const c = concreteCut([[-r, 0], [r, 0], [r, s.depthIn], [-r, s.depthIn]], 2.5, s.depthIn - s.postBotIn, conc); c.position.set(x, -s.depthIn * IN, zc + .004); g.add(c);
      const top = footingTop(s.holeIn, 5, 5, conc); top.position.set(x, 0, zc); g.add(top);
    }
    // where the rails meet the posts: the push goes in there
    const rails = f.parts.filter(p => p.kind === 'rail').map(p => p.box);
    const ys = rails.map(b => (b.min.y + b.max.y) / 2 / IN).sort((a, b) => a - b);
    const postTop = Math.max(...f.parts.filter(p => p.kind === 'post' || p.kind === 'cap').map(p => p.box.max.y)) / IN;
    F[id] = { f, g, u, botY: ys[0], topY: ys[ys.length - 1], postTop, zc };
    U[id] = u;
  }
  for (const id of ['big', 'gfs']) st.frameView(id, { cx: XS[id] + .3, cy: 1.7, w: 7.5, h: 11.5 });

  // wind: arrows across the yard, drifting left to right
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x8cc7ff, transparent: true, opacity: .55, depthWrite: false, toneMapped: false });
  const shape = new THREE.Shape(); shape.moveTo(.5, 0); shape.lineTo(0, .22); shape.lineTo(0, .07); shape.lineTo(-.6, .07); shape.lineTo(-.6, -.07); shape.lineTo(0, -.07); shape.lineTo(0, -.22); shape.closePath();
  const ag = new THREE.ShapeGeometry(shape);
  // upwind of each fence only: the wind doesn't pass through a solid section
  const winds = ['big', 'gfs'].flatMap(id => Array.from({ length: 5 }, (_, i) => { const m = new THREE.Mesh(ag, arrowMat); m.userData.noCheck = true; m.renderOrder = 4; m.position.set(XS[id] - 4, 1.1 + i * 1.05, -4); m.userData.phase = i * .37; m.userData.x0 = XS[id]; R.add(m); return m; }));

  const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const L = {
    big: st.pin('big', V3(XS.big, 6.6), ''), gfs: st.pin('gfs', V3(XS.gfs, 6.6), ''),
    bigG: st.pin('big', V3(XS.big, -.4, .3), 'Vinyl post in concrete'), gfsG: st.pin('gfs', V3(XS.gfs, -.4, .3), 'Steel post, driven 4 ft')
  };
  const frac = v => { const n = Math.round(Math.abs(v) * 16); if (!n) return '0'; const w = Math.floor(n / 16), r = n % 16; let f = ''; if (r) { let a = r, d = 16; while (a % 2 === 0) { a /= 2; d /= 2; } f = `${a}/${d}`; } return [w || '', f].filter(Boolean).join(' '); };
  let res = null, V = 0, live = true, t0 = performance.now();
  function set(load) {
    V = load.V;
    res = {};
    for (const id of ['big', 'gfs']) {
      const fz = F[id], loads = railLoads(load.perPost, 72, fz.botY, fz.topY), b = bend(POSTS[id], loads, fz.postTop);
      const arr = fz.u.uBend.value; for (let i = 0; i < N; i++) arr[i] = b.at(i) * IN;
      res[id] = b;
      L[id].set(`Bends ${frac(b.top)} in at the top`); L[id].move(V3(XS[id] + b.top * IN, fz.postTop * IN + .2));
    }
    st.dirty();
    return res;
  }
  // a gust is never steady: the bend swells and eases a little, and the arrows drift
  st.tick(now => {
    if (!live) return false;
    const t = (now - t0) / 1000, k = 1 + .08 * Math.sin(t * 2.1) + .04 * Math.sin(t * 5.3);
    for (const id of ['big', 'gfs']) U[id].uBendK.value = reducedMotion() ? 1 : k;
    const sp = .6 + V / 40;
    winds.forEach(m => { const ph = ((t * sp * .35 + m.userData.phase) % 1); m.position.x = m.userData.x0 - 4.6 + ph * 3.6; m.scale.setScalar(.7 + V / 160); m.visible = V > 0; });
    return true;
  });
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    set, stage: st, get result() { return res; }, get geom() { return Object.fromEntries(['big', 'gfs'].map(id => [id, { botY: F[id].botY, topY: F[id].topY, postTop: F[id].postTop }])); },
    check() { return overlaps(solids(R), { allow: (a, b) => a.kind === 'fastener' || (a.unit && a.unit === b.unit)
      || (a.kind === 'picket' && /^(rail|reveal)$/.test(b.kind)) || (a.kind === 'rail' && b.kind === 'reveal') || (a.kind === 'post' && /^(rail|reveal|cap)$/.test(b.kind))
      || (a.name === 'vinyl post' && b.kind === 'post') || (a.name === 'steel post' && b.kind === 'post') }); },
    dispose() { live = false; st.dispose(); for (const id in F) F[id].f.lib?.dispose?.(); conc.dispose(); arrowMat.dispose(); ag.dispose(); }
  };
}
