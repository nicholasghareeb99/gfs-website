// Our build vs prefab in 3D: one 8 ft section each way, side by side (stacked on phones), seen from
// the rail side with the yard cut open at the posts, aged up to 25 years.
//
//  Prefab (wood): a store 6 × 8 dog-ear panel (½ in pickets on 2×3 rails) hung on 4×4 posts set
//    about 2 ft in dirt or 2½ ft in concrete. Frost lifts the posts (each a little differently, so the
//    panel racks), the rails sag, decay starts at the soil line, and on a slope the level panel leaves
//    a triangle of gap.
//  GFS (wood): the Executive App's no-dig model (King Plus box on a steel pipe driven 4 ft), following
//    the ground.
//  Vinyl: the same panel model both ways (the app's Kingston), set in concrete vs sleeved over driven
//    steel, with the GFS post cut away to show the steel inside.
// Movement here is a typical case at true size; the numbers are in build-plan.mjs.
import { THREE, IN, createStage, fence, reveal, settleRails, settleCaps, squarePost, pipe, concreteCut, footingTop, collar, facePatch, clamp, solids, overlaps } from './lab3d.mjs';
import { surfaceMaterial } from './vendor/exec/real-surfaces.mjs';
import { PANEL, SETS, VINYL_SET, SLOPE_IN, WET, LOOSE, FALL_AT, heave, sag, decay, lean, fallen, snapped, weather, yellow, season } from './build-plan.mjs';
import { STYLE, STYLE_ND } from './dig-plan.mjs';

const XP = -20, XG = 20, HALF = 4, VINYL = 'Kingston - White 6ft';
const FRAME = { cy: 1.6, w: 12.6, h: 12 };

export function createBuildScene(host, { specs } = {}) {
  const st = createStage(host, { views: [{ id: 'pre', label: 'Big-box prefab', tone: 'bad' }, { id: 'gfs', label: 'GFS King Plus', tone: 'good' }] });
  const R = st.root;
  const tag = (o, what, unit) => { o.traverse(c => { if (c.isMesh) { c.userData.what = what; c.userData.unit = unit; } }); return o; };
  const conc = surfaceMaterial(THREE, 'concrete', 0xaaa8a2), slump = surfaceMaterial(THREE, 'soil', 0x5a4636), fillSoil = surfaceMaterial(THREE, 'soil', 0x5f4a37);
  const gapMat = new THREE.MeshBasicMaterial({ color: 0x120c07 }), rotMat = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 1, transparent: true, opacity: 0, depthWrite: false });
  const splinter = new THREE.MeshStandardMaterial({ color: 0x4a3524, roughness: 1 });   // rotted wood at the break
  const gray = surfaceMaterial(THREE, 'wood', 0x9b968c), cream = surfaceMaterial(THREE, 'vinyl', 0xeadfb8);
  let state = { y: 0, mat: 'wood', set: 'concrete', slope: false };
  let built = null;
  const HOLES = [st.hole(XP - HALF, .4), st.hole(XP + HALF, .4)], baseWood = new Map();   // the store posts' holes, moved as the yard changes

  // ── one build of both yards for the material and slope chosen ──
  function make() {
    if (built) { R.remove(built.group); built.group.traverse(o => { if (o.geometry) o.geometry.dispose(); }); built.libs.forEach(l => l.dispose?.()); built.holes.forEach(h => h.set(0)); baseWood.clear(); }
    const g = new THREE.Group(), libs = [], holes = [], parts = {};
    const slope = state.slope ? SLOPE_IN * IN / (2 * HALF) : 0;
    st.setGrade(x => { const c = x < 0 ? XP : XG; return Math.abs(x - c) < 30 ? -(x - c) * slope : 0; });
    const gy = x => st.grade(x);
    const vinyl = state.mat === 'vinyl', set = vinyl ? VINYL_SET : SETS[state.set];
    // GFS: the app's model, following the ground
    const gName = vinyl ? VINYL : STYLE_ND;
    const gfsB = fence(gName, XG - HALF, XG + HALF, { noDig: !vinyl, z: vinyl ? 0 : -2.5 * IN, specs, grade: gy });
    libs.push(gfsB.lib); g.add(gfsB.group);
    if (slope) { settleRails(gfsB); if (vinyl) settleCaps(gfsB); }
    const gParts = gfsB.parts;
    const gPipes = gParts.filter(p => p.kind === 'post' && p.geo === 'CylinderGeometry'); reveal(gPipes, () => 0);
    const gPosts = vinyl ? gParts.filter(p => p.kind === 'post') : [];
    const pipeAt = (vinyl ? gPosts : gPipes).map(p => ({ x: p.cx, z: (p.box.min.z + p.box.max.z) / 2 })).sort((a, b) => a.x - b.x);
    // steel driven 4 ft under every GFS post. Under the wood box it is an 8 ft pipe standing 4 ft up inside
    // the box; under vinyl only the part in the ground is drawn (the vinyl post sleeves over the rest on
    // its steel adapters, which aren't modelled here).
    const steel = pipeAt.map((p, k) => { const pp = tag(pipe(2.375, .154, vinyl ? 48 : 96), 'driven pipe', 'gpipe' + k); pp.position.set(p.x, gy(p.x) - 4, p.z); g.add(pp); return pp; });
    // ── the store fence ──
    const preParts = [], posts = [];
    const x0 = XP - HALF, x1 = XP + HALF;
    let wood = null;
    if (!vinyl) {
      const ref = fence(STYLE, -60, -52, { noDig: false, specs }); libs.push(ref.lib); ref.group.traverse(o => o.geometry?.dispose());
      wood = ref.parts.find(p => p.kind === 'post').mesh.material;
    }
    // vinyl store fence: the same Kingston panel, level (stepped), on posts sunk in concrete
    let preF = null;
    // a store vinyl section goes up level: built at the uphill grade, the downhill post simply longer
    const high = Math.max(gy(x0), gy(x1));
    if (vinyl) { preF = fence(VINYL, x0, x1, { specs, grade: () => high }); libs.push(preF.lib); g.add(preF.group); }
    const panelBot = Math.max(gy(x0), gy(x1)) + PANEL.botIn * IN, panelTop = panelBot + PANEL.picketLIn * IN;
    [x0, x1].forEach((x, k) => {
      const grp = new THREE.Group(); grp.position.set(x, gy(x), 0); g.add(grp);
      const lifted = new THREE.Group(); grp.add(lifted);
      const o = { x, grp, lifted, k };
      if (!vinyl) {
        // in two pieces, so it can break where it rots: the part in the ground, and the part above it
        lifted.add(tag(squarePost(wood, 3.5, 3.5, .75, -set.postBotIn), 'store post', 'pre' + k));
        o.up = tag(squarePost(wood, 3.5, 3.5, (panelTop - gy(x)) / IN, .75), 'store post', 'pre' + k);
        // the break: splinters standing on the stub and hanging from the piece that came away
        const spikes = dir => { const sg = new THREE.Group(); for (let i = 0; i < 7; i++) { const hh = (.6 + ((i * 37 + k * 11) % 10) / 10 * 2.1) * IN, c = new THREE.Mesh(new THREE.ConeGeometry(.42 * IN, hh, 4).translate(0, hh / 2, 0), splinter); c.position.set((((i * 53) % 7) / 6 - .5) * 2.6 * IN, 0, (((i * 29) % 5) / 4 - .5) * 2.6 * IN); c.rotation.set(dir < 0 ? Math.PI : 0, i, 0); c.userData.noCheck = true; c.castShadow = true; sg.add(c); } sg.position.y = .75 * IN; sg.visible = false; return sg; };
        o.splitDown = spikes(1); lifted.add(o.splitDown); o.splitUp = spikes(-1); o.up.add(o.splitUp);
      }
      else {
        // the app's vinyl post stands above grade (it rides up with the panel); here it is carried down into its concrete
        const vp = preF.parts.filter(p => p.kind === 'post').sort((a, b) => a.cx - b.cx)[k];
        const w = (vp.box.max.x - vp.box.min.x) / IN, d = (vp.box.max.z - vp.box.min.z) / IN;
        lifted.add(tag(squarePost(vp.mesh.material, w, d, (high - gy(x)) / IN, -set.postBotIn), 'store post', 'pre' + k));
        o.vp = vp; o.w = w;
      }
      const r = set.holeIn / 2, D = set.depthIn, pw = (vinyl ? o.w : 3.5) / 2;
      if (set.id !== 'dirt') {
        lifted.add(tag((() => { const c = concreteCut([[-r, 0], [r, 0], [r, D], [-r, D]], pw, D - set.postBotIn, conc); c.position.y = -D * IN; return c; })(), 'concrete', 'pre' + k));
        lifted.add(tag(footingTop(set.holeIn, pw * 2, pw * 2, conc), 'concrete', 'pre' + k));
        o.wall = tag(collar(r, conc), 'concrete', 'pre' + k); grp.add(o.wall);
      } else {
        // the hole the post went in, filled back with the dirt that came out
        const back = facePatch(set.holeIn * IN, fillSoil); back.userData.noCheck = true; back.position.y = -D * IN; back.scale.y = D * IN; back.position.z = .002; grp.add(back);
      }
      o.gap = facePatch(set.holeIn * IN, gapMat); o.fill = facePatch(set.holeIn * IN, slump); o.gap.userData.noCheck = o.fill.userData.noCheck = true; grp.add(o.gap, o.fill);
      const h = HOLES[k]; h.move(x, r * IN); h.set(-gy(x) + D * IN); holes.push(h);
      // decay at the soil line: a darkening band on a wood post
      if (!vinyl) { const band = new THREE.Mesh(new THREE.BoxGeometry(3.62 * IN, 7 * IN, 3.62 * IN), rotMat); band.userData.noCheck = true; band.position.y = (set.id === 'dirt' ? 0 : 0); lifted.add(band); o.band = band; }
      posts.push(o);
    });
    // the store panel: pickets and rails, hung on the face of the posts, level
    let panel = null;
    if (!vinyl) {
      const pk = new THREE.Shape(), w = PANEL.picketWIn * IN, L = PANEL.picketLIn * IN, e = PANEL.earIn * IN;
      pk.moveTo(-w / 2, 0); pk.lineTo(w / 2, 0); pk.lineTo(w / 2, L - e); pk.lineTo(w / 2 - e, L); pk.lineTo(-w / 2 + e, L); pk.lineTo(-w / 2, L - e); pk.closePath();
      const pkGeo = new THREE.ExtrudeGeometry(pk, { depth: PANEL.picketTIn * IN, bevelEnabled: false }); pkGeo.translate(0, 0, -(3.25 + PANEL.picketTIn) * IN);
      const pickets = new THREE.InstancedMesh(pkGeo, wood, PANEL.pickets); pickets.castShadow = pickets.receiveShadow = true; pickets.userData.what = 'store picket'; pickets.frustumCulled = false;
      const span = PANEL.pickets * PANEL.picketWIn + (PANEL.pickets - 1) * PANEL.gapIn, xs = Array.from({ length: PANEL.pickets }, (_, i) => XP + (-span / 2 + PANEL.picketWIn / 2 + i * (PANEL.picketWIn + PANEL.gapIn)) * IN);
      // rails: 2×3s on edge across the post faces, in 2 in strips so they can sag
      const rails = PANEL.railsIn.map((ry, i) => { const geo = new THREE.BoxGeometry(2 * HALF, PANEL.railHIn * IN, PANEL.railTIn * IN, 48, 1, 1); geo.translate(XP, 0, -2.5 * IN); geo.userData.base = geo.attributes.position.array.slice(); const m = new THREE.Mesh(geo, wood); m.castShadow = m.receiveShadow = true; m.userData.what = 'store rail'; m.userData.ry = ry * IN; g.add(m); return m; });
      // everything above the ground hangs off one hinge along the soil line, so the fence can lean and go down
      const fall = new THREE.Group(), hang = new THREE.Group(); fall.add(hang); g.add(fall);
      for (const r of rails) hang.add(r);
      hang.add(pickets); for (const o of posts) hang.add(o.up);
      panel = { pickets, xs, rails, fall, hang };
    }
    R.add(g);
    built = { group: g, libs, holes, posts, panel, gfs: gfsB, steel, preF, set, vinyl, panelBot, panelTop, gy, x0, x1, gPosts };
    set3(state.y);
  }

  // ── labels ──
  const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const L = {
    panel: st.pin('pre', V3(XP, 4.2, -.3), 'Store panel: ½ in pickets on 2×3 rails'),
    set: st.pin('pre', V3(XP - HALF + .6, -1.2, .1), ''),
    lift: st.pin('pre', V3(XP + HALF, 6.6), ''),
    rot: st.pin('pre', V3(XP - HALF, .5, .2), 'Decay starts at the soil line'),
    down: st.pin('pre', V3(XP - HALF, .7, .2), 'Post broke at the soil line'),
    sag: st.pin('pre', V3(XP, 6.6, -.3), 'Sagging between posts'),
    gap: st.pin('pre', V3(XP - HALF / 2, .3, -.3), 'Gap under the panel'),
    steel: st.pin('gfs', V3(XG - HALF + .55, -2.1, .1), 'Steel driven 4 ft'),
    box: st.pin('gfs', V3(XG + HALF, 4.6, .2), 'Wood box on the steel'),
    top: st.pin('gfs', V3(XG, 6.2, 0), 'Flat 2×4 across the top'),
    grade: st.pin('gfs', V3(XG + HALF / 2, .5, -.3), 'Follows the ground', 'good')
  };
  const status = {};
  for (const v of st.views) { const el = document.createElement('p'); el.className = 'l3d-status'; v.tag.append(el); status[v.id] = el; v.inset.bottom = 54; }
  st.frameView('pre', { cx: XP, ...FRAME }); st.frameView('gfs', { cx: XG, ...FRAME });

  // ── the picture at year y ──
  function set3(y) {
    const b = built; if (!b) return;
    state.y = y;
    const { m } = season(y), vinyl = b.vinyl;
    // winter in the ground and on the lawn
    const fz = m == null ? { depth: 0, thawed: 0 } : (() => { const f = [[0, 0], [0, .35], [0, .75], [0, 1], [.45, .8], [0, 0]], i = Math.min(4, Math.floor(m)), t = m - i, a = f[i], c = f[i + 1]; return { thawed: (a[0] + (c[0] - a[0]) * t) * 24, depth: (a[1] + (c[1] - a[1]) * t) * 24 }; })();
    st.ground.frost(fz.depth * IN, 1, fz.thawed * IN);
    st.ground.snow(m == null ? 0 : [0, .45, .9, .85, .25, 0][Math.round(m)]);
    // the store posts ride up with the frost, each a little differently, and the panel racks with them
    const lifts = b.posts.map((o, k) => heave(b.set, y, WET[k]) * IN);
    b.posts.forEach((o, k) => {
      const Lk = lifts[k], prevWinters = season(y).done, base = Math.min(Lk, heave(b.set, prevWinters, WET[k]) * IN), gapH = Math.max(0, Lk - base);
      o.lifted.position.y = Lk; o.wall?.userData.set(Lk);
      const bot = -b.set.depthIn * IN; o.fill.userData.set(bot, Lk - gapH); o.gap.userData.set(bot + Lk - gapH, gapH);
      if (o.band) { rotMat.opacity = decay(b.set, y) * .85; o.band.visible = rotMat.opacity > .02; }
    });
    const sg = sag(y) * IN, tilt = vinyl ? 0 : lean(b.set, y), down = !vinyl && fallen(b.set, y);
    if (b.panel) {
      const { pickets, xs, rails, fall, hang } = b.panel, M = new THREE.Matrix4(), at = x => { const t = (x - b.x0) / (b.x1 - b.x0); return lifts[0] + (lifts[1] - lifts[0]) * t - sg * Math.sin(Math.PI * clamp(t, 0, 1)); };
      // the hinge: along the soil line from post to post, at the back of the pickets so the fence lies on them
      const p0 = new THREE.Vector3(b.x0, b.gy(b.x0) + lifts[0] + .75 * IN, -(3.25 + PANEL.picketTIn) * IN), p1 = new THREE.Vector3(b.x1, b.gy(b.x1) + lifts[1] + .75 * IN, p0.z);
      fall.position.copy(p0); fall.quaternion.setFromAxisAngle(p1.clone().sub(p0).normalize(), -tilt * Math.PI / 180); hang.position.copy(p0).negate();
      b.posts.forEach((o, k) => { o.up.position.set(o.x, b.gy(o.x) + lifts[k], 0); o.splitDown.visible = o.splitUp.visible = snapped(b.set, y); });
      const Q = new THREE.Quaternion(), S1 = new THREE.Vector3(1, 1, 1), E = new THREE.Euler(), top = PANEL.picketLIn * IN;
      // world → the leaning panel's own space, for pickets that have dropped off and lie still on the lawn
      const toPanel = new THREE.Matrix4().compose(p0, fall.quaternion, S1).multiply(new THREE.Matrix4().makeTranslation(-p0.x, -p0.y, -p0.z)).invert();
      xs.forEach((x, i) => {
        const loose = LOOSE.find(l => l[0] === i), yb = b.panelBot + at(x);
        if (loose && loose[2] && y >= loose[2] && !down) {
          M.compose(new THREE.Vector3(x + (i % 2 ? .25 : -.2), b.gy(x) + .3, -1.4 - (i % 3) * .4), Q.setFromEuler(E.set(-Math.PI / 2 + .04, 0, (i % 2 ? .22 : -.3))), S1).premultiply(toPanel);
        } else if (loose && y >= loose[1]) {
          // one nail left at the top: it hangs crooked and a little low
          const a = (i % 2 ? 1 : -1) * Math.min(.07, (y - loose[1]) * .035);
          // loose, so it hangs proud of its neighbours, not through them
          M.makeTranslation(x, yb + top - .5 * IN, -(PANEL.picketTIn + .06) * IN).multiply(new THREE.Matrix4().makeRotationZ(a)).multiply(new THREE.Matrix4().makeTranslation(0, -top, 0));
        } else M.makeTranslation(x, yb, 0);
        pickets.setMatrixAt(i, M);
      });
      pickets.instanceMatrix.needsUpdate = true;
      for (const r of rails) { const p = r.geometry.attributes.position, base = r.geometry.userData.base; for (let i = 0; i < p.count; i++) p.setY(i, base[i * 3 + 1] + b.panelBot + r.userData.ry + at(base[i * 3])); p.needsUpdate = true; r.geometry.computeBoundingBox(); r.geometry.computeBoundingSphere(); }
    }
    if (b.preF) {
      // vinyl store panel: rides on its posts, racks between them
      b.preF.group.position.y = 0;
      const shear = new THREE.Matrix4().set(1, 0, 0, 0, (lifts[1] - lifts[0]) / (b.x1 - b.x0), 1, 0, lifts[0] - (lifts[1] - lifts[0]) / (b.x1 - b.x0) * b.x0, 0, 0, 1, 0, 0, 0, 0, 1);
      b.preF.group.matrixAutoUpdate = false; b.preF.group.matrix.copy(shear); b.preF.group.matrixWorldNeedsUpdate = true;
      const k = yellow(y); for (const mtl of new Set(b.preF.parts.map(p => p.mesh.material))) { if (!baseWood.has(mtl)) baseWood.set(mtl, mtl.color.clone()); mtl.color.copy(baseWood.get(mtl)).lerp(cream.color, k * .55); }
    }
    // weathering: bare treated pine goes silver-gray on both fences
    const wk = weather(y) * .7;
    if (!vinyl) for (const mtl of new Set([...b.gfs.parts.map(p => p.mesh.material), b.panel.pickets.material])) { if (!mtl.map && !mtl.userData.gfsFamily) continue; if (!baseWood.has(mtl)) baseWood.set(mtl, mtl.color.clone()); mtl.color.copy(baseWood.get(mtl)).lerp(gray.color, wk); }
    // labels
    const inch = v => Math.round(v / IN * 10) / 10;
    L.panel.show(!vinyl && y < 1.5); L.down.show(down); if (down) L.down.move(V3(b.x0 + .3, b.gy(b.x0) + .7, .2)); L.set.set(b.vinyl ? 'Vinyl post in ~2½ ft of concrete' : b.set.id === 'dirt' ? 'Post ~2 ft in dirt' : 'Post ~2½ ft in concrete'); L.set.show(y < 1.5);
    L.lift.set(`Pushed up ${inch(lifts[1])} in by frost`); L.lift.show(lifts[1] > .4 * IN && tilt < 3); L.lift.move(V3(b.x1, b.panelTop + lifts[1] + .3));
    L.rot.show(!vinyl && decay(b.set, y) > .25 && !snapped(b.set, y)); L.sag.set(`Sagged ${inch(sg)} in`); L.sag.show(!vinyl && sg > .5 * IN && tilt < 3); L.sag.move(V3(XP, b.panelTop + (lifts[0] + lifts[1]) / 2 - sg + .3, -.3));
    L.gap.show(state.slope); L.grade.show(state.slope);
    L.steel.show(y < 1.5 || !state.slope); L.box.show(!vinyl && y < 1.5); L.top.show(!vinyl && y < 1.5); L.top.move(V3(XG, b.gy(XG) + 68.5 * IN + .15, 0));
    L.box.set(vinyl ? 'Vinyl post sleeved over the steel' : 'Wood box on the steel'); if (vinyl) L.box.show(y < 1.5);
    const yrs = Math.floor(y), win = m != null && m < 5;
    const off = vinyl ? 0 : LOOSE.filter(l => l[2] && y >= l[2]).length;
    // short enough to read in a narrow view: the worst thing first, then at most one more
    const uneven = Math.abs(lifts[0] - lifts[1]) > .3 * IN;
    const woes = [tilt > 1.5 ? `leaning ${Math.round(tilt)}°, posts rotting at the soil line` : '', off ? `${off} picket${off > 1 ? 's' : ''} off` : '',
      !vinyl && tilt <= 1.5 && decay(b.set, y) > .25 ? 'decay at the soil line' : '', lifts[1] > .4 * IN && tilt <= 1.5 ? (uneven ? 'frost has lifted the posts unevenly' : 'posts pushed up by frost') : '',
      !vinyl && sg > .5 * IN && tilt <= 1.5 ? 'panel sagging' : '', vinyl && yellow(y) > .4 ? 'vinyl yellowing' : '', state.slope ? 'gap under the panel' : ''].filter(Boolean).slice(0, 2);
    status.pre.textContent = y < .5 ? 'Looks fine the day it goes in.' : down ? `Down at ${FALL_AT[b.set.id]} years. The posts rotted through at the soil line.` : !vinyl && snapped(b.set, y) ? 'The posts snap at the soil line.' : woes.length ? (woes.join(' · ').replace(/^./, c => c.toUpperCase()) + '.') : 'Starting to move.';
    status.gfs.textContent = y < .5 ? (state.slope ? 'Built to follow the ground, post to post.' : 'Straight on day one.') : vinyl ? 'Still straight, square and white.' : y >= 16 ? 'Still standing straight on steel. The wood is gray; a picket or two may need replacing.' : weather(y) > .5 ? 'Still straight and tight. The wood has weathered to gray.' : 'Still straight and tight.';
    st.dirty();
    return yrs;
  }
  // the parts lists under the yards: tapping one shows its label
  const FOCUS = { steel: 'steel', box: 'box', wall: 'box', plus: 'top', grade: 'grade', post: 'set', footing: 'set', staples: 'panel', slope: 'gap', sag: 'sag', heave: 'lift', rot: 'rot' };
  let focusKey = null;
  const showFocus = () => { for (const [k, pin] of Object.entries(L)) pin.el.classList.toggle('focus', !!focusKey && FOCUS[focusKey] === k); if (focusKey && L[FOCUS[focusKey]]) L[FOCUS[focusKey]].show(true); };
  make();
  return {
    focus(k) { focusKey = k; set3(state.y); showFocus(); st.dirty(); },
    set(o) { const remake = ['mat', 'set', 'slope'].some(k => o[k] != null && o[k] !== state[k]); Object.assign(state, o); if (remake) make(); else set3(state.y); showFocus(); },
    get state() { return { ...state }; }, stage: st,
    check() {
      return overlaps(solids(R), { allow: (a, b) => a.kind === 'fastener' || (a.unit && a.unit === b.unit)
        // vinyl is built by nesting: boards slide into the rail channels, rails and channels into routed posts, caps over posts
        || (built.vinyl && ((a.kind === 'picket' && /^(rail|reveal)$/.test(b.kind)) || (a.kind === 'rail' && b.kind === 'reveal') || (a.kind === 'post' && /^(rail|reveal|cap)$/.test(b.kind))))
        // the store vinyl post: the app's post above the ground, ours carried down from it into the concrete
        || (a.kind === 'post' && b.unit && b.unit.startsWith('pre')) });
    },
    dispose() { st.dispose(); built?.libs.forEach(l => l.dispose?.()); for (const mtl of [conc, slump, fillSoil, gapMat, rotMat, splinter, gray, cream]) mtl.dispose(); built?.posts; }
  };
}
