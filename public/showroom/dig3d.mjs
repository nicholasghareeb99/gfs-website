// No-dig vs dug, in 3D: the same 8 ft section of 6 ft dog-ear privacy built two ways, side by side
// (stacked on a phone), at the same moment of the install day.
//
//  Dug:    a 10 in auger hole 36 in deep at each post, the clay thrown on the lawn, the 4×4 set
//          32 in down and the hole filled with concrete (80 lb bags, 0.6 cu ft each), a 48 hour
//          wait for the concrete (GFS's own checklist), then rails and pickets.
//  No-dig: an 8 ft galvanized Schedule 40 pipe (2⅜ in outside, 0.154 in wall) driven 4 ft, the
//          King Plus box built around it, then rails and pickets. Nothing comes out of the ground.
//
// The fence parts above ground are the Executive App's own models. The whole picture is worked out
// from one number, p (0 = start of the day, 1 = done), so playing and scrubbing show the same thing.
import { THREE, IN, createStage, fence, reveal, squarePost, pipe, footingCut, footingTop, cavity, pile, pileSize, clods, bagStack, auger, driver, dashLine, ticks, seg, ease, clamp, solids, overlaps } from './lab3d.mjs';
import { surfaceMaterial } from './vendor/exec/real-surfaces.mjs';
import { DIG, digNumbers } from './ui.mjs';

import { STYLE, STYLE_ND, DUR, DUG, ND } from './dig-plan.mjs';
export { STYLE, STYLE_ND, DUR, DUG, ND };
const XD = -20, XN = 20, BAY = 8;              // the two fences, far enough apart that neither view sees the other
const R_HOLE = DIG.holeIn / 2 * IN, D_HOLE = DIG.depthIn * IN;
const FROST_IN = 36;                         // Toledo frost depth
// what each view shows: from the 4 ft mark below grade to the top of the pickets, a little past both posts
const FRAME = { cy: 1.05, w: 12.4, h: 11 };
const fmt = (v, d = 0) => Number(v).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });


export function createDigScene(host, { len = 150, specs } = {}) {
  const st = createStage(host, { views: [{ id: 'dug', label: 'Dug &amp; concrete', tone: 'bad' }, { id: 'nodig', label: 'GFS no-dig', tone: 'good' }] });
  const R = st.root, unit = (o, what, id) => { o.traverse(c => { if (c.isMesh) { c.userData.what = what; c.userData.unit = id; } }); return o; };
  const n = { len, ...digNumbers(len) };
  const conc = { wet: surfaceMaterial(THREE, 'concrete', 0x6e6d69), dry: surfaceMaterial(THREE, 'concrete', 0xaaa8a2) };
  conc.mat = surfaceMaterial(THREE, 'concrete', 0xaaa8a2);

  // ── the two fences (Executive App models) ──
  const dugF = fence(STYLE, XD - BAY / 2, XD + BAY / 2, { noDig: false, specs });
  const ndF = fence(STYLE_ND, XN - BAY / 2, XN + BAY / 2, { noDig: true, z: -2.5 * IN, specs });   // pipe centres on the cut
  R.add(dugF.group, ndF.group);
  const byKind = (F, k) => F.parts.filter(p => p.kind === k);
  // The app draws a dug post from grade up; ours is the same 4×4 carried down 32 in, so it can be set.
  const dugPostParts = byKind(dugF, 'post'); reveal(dugPostParts, () => 0);
  const wood = dugPostParts[0].mesh.material;
  const posts = dugPostParts.sort((a, b) => a.cx - b.cx).map((p, k) => {
    const topIn = p.box.max.y * 12, z = (p.box.min.z + p.box.max.z) / 2;
    const m = unit(squarePost(wood, 3.5, 3.5, topIn, -DIG.postDepthIn), 'dug post', 'post' + k); m.position.set(p.cx, 0, z); R.add(m);
    return { x: p.cx, m };
  });
  // The app draws the no-dig pipe from grade to near the top of the box. GFS drives an 8 ft pipe 4 ft
  // (brochure spec sheets, and the app's own site kit), so 4 ft stands above grade inside the box.
  const ndPost = byKind(ndF, 'post');
  const ndPipeParts = ndPost.filter(p => p.geo === 'CylinderGeometry'); reveal(ndPipeParts, () => 0);
  const ndBoxParts = ndPost.filter(p => p.geo !== 'CylinderGeometry');
  const pipes = ndPipeParts.sort((a, b) => a.cx - b.cx).map((p, k) => {
    const g = unit(pipe(DIG.pipeOdIn, DIG.pipeWallIn, DIG.pipeLenIn), 'driven pipe', 'pipe' + k); g.position.set(p.cx, 0, (p.box.min.z + p.box.max.z) / 2); R.add(g);
    const dr = unit(driver(), 'post driver', 'driver' + k); R.add(dr);
    return { x: p.cx, g, dr };
  });

  // ── dug: holes, concrete, dirt ──
  const vLoose = Math.PI * R_HOLE ** 2 * D_HOLE * DIG.swell;
  const pickBack = Math.max(...[...byKind(dugF, 'picket'), ...byKind(dugF, 'rail')].map(p => -p.box.min.z));
  const holes = posts.map((P, k) => {
    const side = k === 0 ? -1 : 1;
    const h = { x: P.x, side, face: st.hole(P.x, R_HOLE),
      cav: unit(cavity(DIG.holeIn), 'hole', 'cav' + k), cut: unit(footingCut(DIG.holeIn, DIG.depthIn, 3.5, DIG.postDepthIn, conc.mat), 'concrete', 'cut' + k),
      top: unit(footingTop(DIG.holeIn, 3.5, 3.5, conc.mat), 'concrete', 'top' + k), fill: unit(footingTop(DIG.holeIn, 3.5, 3.5, conc.mat), 'concrete', 'fill' + k),
      fillLow: unit(footingTop(DIG.holeIn, 0, 0, conc.mat), 'concrete', 'fillLow' + k), pile: unit(pile(k + 3), 'dirt pile', 'pile' + k) };
    h.cav.traverse(o => { o.userData.noCheck = true; });   // the inside surface of the hole, not a solid
    // the pile lands behind the fence beside each hole (toward the middle of the bay), clear of the pickets by 2 in
    const reach = h.pile.userData.reach(vLoose);
    h.px = P.x - side * .95; h.pz = -(pickBack + 2 * IN) - reach.R; h.reach = reach;
    h.pile.position.set(h.px, 0, h.pz);
    for (const o of [h.cav, h.cut, h.top, h.fill, h.fillLow]) o.position.x = P.x;
    R.add(h.cav, h.cut, h.top, h.fill, h.fillLow, h.pile);
    return h;
  });
  const bagsPerHole = (Math.PI * R_HOLE ** 2 * D_HOLE - (3.5 * IN) ** 2 * DIG.postDepthIn * IN) / DIG.bagFt3;
  const nBags = Math.ceil(bagsPerHole * posts.length);
  const bags = unit(bagStack(nBags), 'concrete bags', 'bags'); bags.position.set(XD, 0, -(pickBack + 2 * IN) - 2.05); R.add(bags);
  const bagOrder = [...bags.children].reverse();   // the top of the stack goes first
  const aug = unit(auger(DIG.holeIn), 'auger', 'auger'); R.add(aug);
  const clod = clods(160); clod.userData.noCheck = true; R.add(clod);
  const heap = unit(pile(9), 'all the dirt', 'heap'); R.add(heap);
  const placeHeap = () => { const s = heap.userData.reach(n.looseFt3); heap.userData.full = s; heap.position.set(posts[1].x + 1.2 + s.R, 0, -(s.R + .6)); };
  placeHeap();

  // the frost line and a depth scale on the cut face of each yard
  for (const x of [XD, XN]) { R.add(dashLine(x - 7, x + 7, -FROST_IN * IN)); R.add(ticks(x - 5.4, 4)); }

  // ── labels ──
  const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const L = {
    frostD: st.pin('dug', V3(XD + 4.2, -FROST_IN * IN + .2), 'Frost line · 36 in', 'frost'),
    frostN: st.pin('nodig', V3(XN + 4.2, -FROST_IN * IN + .2), 'Frost line · 36 in', 'frost'),
    hole: st.pin('dug', V3(posts[0].x + .75, -1.5, .1), '10 in × 36 in hole'),
    pile: st.pin('dug', V3(holes[0].px, holes[0].reach.H + .35, holes[0].pz), `${fmt(vLoose, 1)} cu ft of loose dirt per hole`),
    bags: st.pin('dug', V3(XD, 1.25, bags.position.z), `${nBags} bags of concrete, 80 lb each`),
    concrete: st.pin('dug', V3(posts[1].x + .75, -1.7, .1), '4×4 set 32 in down in concrete'),
    heap: st.pin('dug', V3(0, 0, 0), ''),
    pipe: st.pin('nodig', V3(pipes[0].x + .55, -2.2, .1), 'Galvanized steel, driven 4 ft'),
    none: st.pin('nodig', V3(XN, -.55, .05), 'No holes · no concrete · no dirt', 'good'),
  };
  for (let f = 1; f <= 4; f++) { st.pin('dug', V3(XD - 5.15, -f + .02), f + ' ft', 'tick'); st.pin('nodig', V3(XN - 5.15, -f + .02), f + ' ft', 'tick'); }
  const status = {};
  for (const v of st.views) { const el = document.createElement('p'); el.className = 'l3d-status'; v.tag.append(el); status[v.id] = el; v.inset.bottom = 54; }

  // ── reveal schedules for the app's rails, pickets and nails ──
  const schedule = (F, rails, pickets) => {
    const rs = byKind(F, 'rail').sort((a, b) => a.box.min.y - b.box.min.y), pk = byKind(F, 'picket').sort((a, b) => a.cx - b.cx), nails = byKind(F, 'fastener');
    const x0 = pk[0].cx, x1 = pk[pk.length - 1].cx, step = (rails[1] - rails[0]) / rs.length;
    rs.forEach((r, i) => { r.t = [rails[0] + i * step, rails[0] + (i + 1) * step]; });
    pk.forEach(p => { const a = pickets[0] + (p.cx - x0) / (x1 - x0 || 1) * (pickets[1] - pickets[0] - .012); p.t = [a, a + .012]; });
    nails.forEach(f => { let best = pk[0]; for (const p of pk) if (Math.abs(p.cx - f.cx) < Math.abs(best.cx - f.cx)) best = p; f.t = [best.t[1], best.t[1] + .002]; });
    return { rs, pk, nails };
  };
  const dugS = schedule(dugF, DUG.rails, DUG.pickets), ndS = schedule(ndF, ND.rails, ND.pickets);
  ndBoxParts.forEach(b => { const k = Math.abs(b.cx - pipes[0].x) < Math.abs(b.cx - pipes[1].x) ? 0 : 1; b.t = ND.box[k]; });

  // ── auger spoil: each clod is thrown from the rim toward that hole's pile ──
  const rng = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(42);
  const throws = holes.map((h, k) => Array.from({ length: 70 }, (_, i) => {
    const q = i < 56 ? .02 + i / 56 * .72 : .8 + (i - 56) / 14 * .15;       // while cutting, then what falls off the flights
    const dir = Math.atan2(h.pz, h.px - h.x) + (rng() - .5) * 1.1;
    return { k, q, dir, y0: .05 + rng() * .3, u: Math.sqrt(rng()) * .85, phi: rng() * Math.PI * 2, T: .34 + rng() * .2, s: .6 + rng() * 1, spin: (rng() - .5) * 30 };
  }));
  const digAt = (k, p) => { const [a, b] = DUG.dig[k], q = seg(p, a, b); return { q, depth: D_HOLE * seg(q, 0, .75) }; };

  // ── where each camera looks: close on the hole or the pipe while it goes in, then the whole section ──
  const full = (x) => ({ cx: x, cy: FRAME.cy, w: FRAME.w, h: FRAME.h }), close = (x, toward = 0) => ({ cx: x + toward * .45, cy: -.85, w: 6, h: 6.8 });
  const DUG_SHOTS = () => [[0, full(XD)], [.035, close(posts[0].x, 1)], [.16, close(posts[0].x, 1)], [.19, close(posts[1].x, -1)], [.31, close(posts[1].x, -1)], [.345, full(XD)]];
  // while a pipe goes in, frame from the 4 ft mark up to the top of its driver
  const drv = (k, p) => { const top = pipes[k].dr.visible ? pipes[k].dr.position.y + 1.95 : 2.5, hi = Math.max(2.5, top + .3), lo = -4.3; return { cx: pipes[k].x, cy: (hi + lo) / 2, w: 6, h: hi - lo }; };
  const ND_SHOTS = p => [[0, full(XN)], [.035, drv(0, p)], [.12, drv(0, p)], [.14, drv(1, p)], [.22, drv(1, p)], [.255, full(XN)]];
  const follow = (shots, p) => {
    let i = 0; while (i < shots.length - 1 && p > shots[i + 1][0]) i++;
    if (i >= shots.length - 1) return shots[shots.length - 1][1];
    const [p0, a] = shots[i], [p1, b] = shots[i + 1], k = ease(seg(p, p0, p1));
    return { cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k, w: a.w + (b.w - a.w) * k, h: a.h + (b.h - a.h) * k };
  };

  // ── the picture at moment p ──
  let P = 0;
  function set(p) {
    P = p = clamp(p, 0, 1);
    // dug: holes and piles
    holes.forEach((h, k) => {
      const { depth } = digAt(k, p), fill = seg(p, ...DUG.pour[k]), lowered = seg(p, ...DUG.lower[k]);
      h.face.set(depth); h.cav.userData.set(depth);
      h.cut.userData.set(fill, lowered >= 1);
      const fy = -D_HOLE + D_HOLE * fill;
      h.fill.visible = fill > 0 && fill < 1 && fy > -DIG.postDepthIn * IN; h.fill.position.y = fy + .004;
      h.fillLow.visible = fill > 0 && fy <= -DIG.postDepthIn * IN; h.fillLow.position.y = fy + .004;
      h.top.visible = fill >= 1;
      const cleaned = ease(seg(p, ...DUG.clean));
      h.pile.userData.setVolume(vLoose * depth / D_HOLE * (1 - cleaned));
    });
    posts.forEach((P_, k) => { const l = seg(p, ...DUG.lower[k]); P_.m.visible = l > 0; P_.m.position.y = (1 - ease(l)) * 3.2; });
    // bags used as each hole is filled
    const used = holes.reduce((a, h, k) => a + seg(p, ...DUG.pour[k]) * bagsPerHole, 0);
    bagOrder.forEach((b, j) => { b.visible = used <= j + .05; });
    // concrete darkens wet and lightens as it cures
    conc.mat.color.lerpColors(conc.wet.color, conc.dry.color, ease(seg(p, ...DUG.cure)));
    // the auger: down into each hole, up, over to the next, then away
    {
      const d0 = digAt(0, p), d1 = digAt(1, p), lift = q => q < .75 ? 0 : seg(q, .8, 1);
      let x = posts[0].x, tip = -.35, spinning = false;
      if (p < DUG.dig[0][0]) tip = -.35;
      else if (p < DUG.dig[0][1]) { tip = d0.q < .8 ? d0.depth : D_HOLE * (1 - lift(d0.q)) - .35 * lift(d0.q); spinning = d0.q < .97; }
      else if (p < DUG.dig[1][0]) { x = posts[0].x + (posts[1].x - posts[0].x) * ease(seg(p, DUG.dig[0][1], DUG.dig[1][0])); }
      else if (p < DUG.dig[1][1]) { x = posts[1].x; tip = d1.q < .8 ? d1.depth : D_HOLE * (1 - lift(d1.q)) - .35 * lift(d1.q); spinning = d1.q < .97; }
      else { x = posts[1].x; tip = -.35 - ease(seg(p, ...DUG.exit)) * 3; }
      aug.visible = p < DUG.exit[1];
      aug.position.set(x, 4.2 - tip, 0);
      aug.userData.spin.rotation.y = spinning ? -p * DUR / 1000 * Math.PI * 2 * 2.5 : aug.userData.spin.rotation.y;
    }
    // spoil in the air
    {
      const list = [];
      for (const set of throws) for (const c of set) {
        const h = holes[c.k], [a, b] = DUG.dig[c.k], pl = a + (b - a) * c.q, t = (p - pl) * DUR / 1000;
        if (t < 0 || t > c.T) continue;
        const vol = vLoose * digAt(c.k, pl + c.T * 1000 / DUR).depth / D_HOLE, s = h.pile.userData.reach(Math.max(vol, .02));
        const p0 = { x: h.x + Math.cos(c.dir) * (R_HOLE + .04), y: c.y0, z: Math.min(-.02, Math.sin(c.dir) * (R_HOLE + .04)) };
        const land = { x: h.px + Math.cos(c.phi) * c.u * s.R, y: s.H * (1 - c.u) * .92, z: h.pz + Math.sin(c.phi) * c.u * s.R };
        const v = { x: (land.x - p0.x) / c.T, y: (land.y - p0.y + 16.1 * c.T * c.T) / c.T, z: (land.z - p0.z) / c.T };
        list.push({ p0, v, t, T: c.T, s: c.s, spin: c.spin });
      }
      clod.userData.draw(list);
    }
    // the app's rails, pickets and nails go up
    for (const S of [dugS, ndS]) {
      reveal(S.rs, r => seg(p, ...r.t), .6);
      reveal(S.pk, k => seg(p, ...k.t), .9);
      reveal(S.nails, f => seg(p, ...f.t));
    }
    // no-dig: each pipe is stood up and driven; the box goes on after
    pipes.forEach((pp, k) => {
      const q = seg(p, ...ND.drive[k]), drive = DIG.drivenIn * IN * Math.sqrt(seg(q, .14, .94));   // slows as more steel is gripped by clay
      pp.g.visible = q > 0; pp.g.position.y = -drive + (1 - ease(seg(q, 0, .12))) * .6;
      const top = pp.g.position.y + DIG.pipeLenIn * IN, buzz = q > .14 && q < .94 ? Math.sin(p * DUR / 1000 * Math.PI * 2 * 14) * .012 : 0;
      pp.dr.visible = q > .1 && q < 1; pp.dr.position.set(pp.x, top - .85 + buzz + ease(seg(q, .94, 1)) * 1.5, pp.g.position.z);
    });
    reveal(ndBoxParts, b => seg(p, ...b.t), .8);
    // framing: the dug view backs out at the end to show where all of the dirt went
    {
      const k = ease(seg(p, DUG.clean[0], DUG.clean[0] + .03)), hs = heap.userData.full, right = heap.position.x + hs.R + .6, left = XD - 6.2;
      const w = FRAME.w + Math.max(0, right - left - FRAME.w) * k, cx = XD + ((left + right) / 2 - XD) * k;
      const fd = follow(DUG_SHOTS(), p), fn = follow(ND_SHOTS(p), p);
      st.frameView('dug', k > 0 ? { cx, cy: FRAME.cy, w, h: FRAME.h } : fd);
      st.frameView('nodig', fn);
      const cl = ease(seg(p, ...DUG.clean)); heap.userData.setVolume(n.looseFt3 * cl);
      L.heap.move(V3(heap.position.x, hs.H * cl + .45, heap.position.z));
      L.heap.set(`All the dirt from your ${fmt(n.len)} ft fence: <b>${fmt(n.looseYd3, 1)} cu yd</b> from ${n.posts} holes`);
      L.heap.show(cl > .6);
    }
    // labels and words
    const dg = digAt(0, p);
    L.hole.show(dg.q > .2 && p < DUG.lower[0][0]);
    L.pile.show(dg.q > .5 && p < DUG.clean[0]);
    L.bags.show(p > .02 && p < DUG.pour[1][1]);
    L.concrete.show(p > DUG.pour[1][0] && p < DUG.rails[0]);
    L.pipe.show(p > ND.drive[0][0] + .05);
    L.none.show(p >= ND.pickets[1]);
    status.dug.textContent = p <= 0 ? 'A clean yard, before anyone digs.'
      : p < DUG.exit[1] ? 'Augering a 10 in hole 36 in deep at each post. The clay comes out onto the lawn.'
      : p < DUG.pour[1][1] ? 'Setting each 4×4 and filling the hole with concrete.'
      : p < DUG.cure[1] ? 'Waiting about 48 hours for the concrete before the fence goes on.'
      : p < DUG.pickets[1] ? 'Rails and pickets go on once the concrete has set.'
      : 'Done, with the dirt from every hole to spread or haul away.';
    status.nodig.textContent = p <= 0 ? 'The same yard.'
      : p < ND.drive[1][1] ? 'Driving each steel post 4 ft into the clay. Nothing comes out of the ground.'
      : p < ND.box[1][1] ? 'Building the wood box around each steel post.'
      : p < ND.pickets[1] ? 'Rails and pickets go on right away. No concrete to wait on.'
      : 'Done the same day. The lawn is left as it was.';
    st.dirty();
  }
  function setLen(l) { Object.assign(n, { len: l }, digNumbers(l)); placeHeap(); set(P); }
  set(0);
  return {
    set, setLen, get p() { return P; }, stage: st,
    // Every solid that is showing, tested for parts sinking into each other. Nails go into the
    // boards they hold; the parts of one tool or pipe sit inside each other.
    check() {
      return overlaps(solids(R), { allow: (a, b) => a.kind === 'fastener' || (a.unit && a.unit === b.unit) || (a.name === 'post driver' && b.name === 'driven pipe') });
    },
    dispose() { st.dispose(); dugF.lib.dispose?.(); ndF.lib.dispose?.(); for (const m of [conc.wet, conc.dry, conc.mat]) m.dispose(); }
  };
}
