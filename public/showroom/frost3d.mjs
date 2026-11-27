// Frost & posts in 3D: three posts in one yard, cut open, through a winter. The frost works down
// from the top, wet clay grows ice seams, and the frozen soil grips whatever is in it. Arrows on
// the cut show where frozen soil grips each post (up) and where unfrozen soil holds it (down).
// Movement is drawn DRAWN times bigger than life; the numbers are in frost-plan.mjs.
import { THREE, IN, createStage, fence, reveal, squarePost, pipe, concreteCut, footingTop, collar, facePatch, arrows, dashLine, ticks, clamp, solids, overlaps } from './lab3d.mjs';
import { surfaceMaterial } from './vendor/exec/real-surfaces.mjs';
import { POSTS, MONTHS, SNOW, DRAWN, frozenAt, lift } from './frost-plan.mjs';
import { STYLE, STYLE_ND } from './dig-plan.mjs';

const XS = [-4.5, 0, 4.5], FRAME = { cx: 0, cy: 1.45, w: 13.8, h: 12 };

export function createFrostScene(host, { specs } = {}) {
  const st = createStage(host, { views: [{ id: 'main' }] });
  const R = st.root, unit = (o, what, id) => { o.traverse(c => { if (c.isMesh) { c.userData.what = what; c.userData.unit = id; } }); return o; };
  const conc = surfaceMaterial(THREE, 'concrete', 0xaaa8a2), slump = surfaceMaterial(THREE, 'soil', 0x5a4636);
  const gapMat = new THREE.MeshBasicMaterial({ color: 0x120c07 });
  // The wood is the Executive App's: a dug post's 4×4, and the King Plus box from its no-dig model.
  const dugF = fence(STYLE, -40, -32, { noDig: false, specs }), ndF = fence(STYLE_ND, XS[2], XS[2] + 8, { noDig: true, z: -2.5 * IN, specs });
  const wood = dugF.parts.find(p => p.kind === 'post').mesh.material;
  R.add(ndF.group);
  const boxParts = ndF.parts.filter(p => p.kind === 'post' && p.geo !== 'CylinderGeometry' && Math.abs(p.cx - XS[2]) < .5);
  reveal(ndF.parts, p => boxParts.includes(p) ? 1 : 0);   // just the first post's box: no rails, pickets or second post
  const boxTop = Math.max(...boxParts.map(p => p.box.max.y));

  const posts = POSTS.map((P, k) => {
    const x = XS[k], g = new THREE.Group(); g.position.x = x; R.add(g);
    const o = { P, x, g };
    if (P.pipe) {
      const pp = unit(pipe(2.375, .154, 96), 'driven pipe', 'pipe'); pp.position.y = -P.depthIn * IN; g.add(pp);
      o.edge = () => 2.375 / 2 * IN; o.top = boxTop;
      return o;
    }
    const r = P.holeIn / 2, rTop = (P.flareIn || P.holeIn) / 2, fd = P.flareDepthIn || 0, D = P.depthIn;
    // the footing's side in the cut, from its bottom up: straight, then wider where the top of the hole caved in
    const outline = fd ? [[-r, 0], [r, 0], [r, D - fd], [rTop, D], [-rTop, D], [-r, D - fd]] : [[-r, 0], [r, 0], [r, D], [-r, D]];
    const lifted = new THREE.Group(); g.add(lifted);
    const cut = unit(concreteCut(outline, 1.75, D - P.postBotIn, conc), 'concrete', 'cut' + k); cut.position.y = -D * IN; lifted.add(cut);
    lifted.add(unit(squarePost(wood, 3.5, 3.5, 66, -P.postBotIn), 'dug post', 'post' + k));
    lifted.add(unit(footingTop(rTop * 2, 3.5, 3.5, conc), 'concrete', 'top' + k));
    const wall = unit(collar(rTop, conc), 'concrete', 'collar' + k); g.add(wall);
    const gap = facePatch(r * 2 * IN, gapMat), fill = facePatch(r * 2 * IN, slump); gap.userData.noCheck = fill.userData.noCheck = true; g.add(gap, fill);
    // the hole stays open in the cut face (its straight part) and in the lawn (its top)
    const face = st.hole(x, r * IN, rTop * IN); face.set(D * IN);
    Object.assign(o, { lifted, wall, gap, fill, top: 66 * IN, edge: y => { const d = -y / IN; return (d < fd ? rTop + (r - rTop) * (d / fd) : r) * IN; } });
    return o;
  });
  const up = arrows(0xff8a73), down = arrows(0x6fe3a8); R.add(up, down);
  const line = dashLine(-7.2, 7.2, -36 * IN); R.add(line); R.add(ticks(-6.6, 4));

  // ── labels ──
  const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  posts.forEach((o, k) => st.pin('main', V3(o.x, (k === 1 ? 7.65 : o.top + .45)), `<b>${o.P.name}</b><small>${o.P.sub}</small>`, o.P.pipe ? 'good two' : 'two'));   // the middle one sits higher so the three never overlap
  const frostL = st.pin('main', V3(-2.25, -3 - .45), '', 'frost'), frozenL = st.pin('main', V3(-2.25, 0), '', 'frost ice');
  for (let f = 1; f <= 4; f++) st.pin('main', V3(-6.35, -f + .02), f + ' ft', 'tick');
  const status = document.createElement('p'); status.className = 'l3d-status'; st.views[0].tag.append(status); st.views[0].inset.bottom = 54; st.views[0].inset.top = 64;
  st.frameView('main', FRAME);

  let S = {}, soilNow = null;
  function set({ m = 3, winter = 1, frost = 36, soil = 'clay', reach = .67 } = {}) {
    S = { m, winter, frost, soil, reach };
    const fz = frozenAt(m, frost * reach);
    st.ground.frost(fz.depth * IN, soil === 'clay' ? 1 : 0, fz.thawed * IN);
    const mi = clamp(Math.floor(m), 0, 5), t = m - mi; st.ground.snow(SNOW[mi] + (SNOW[Math.min(5, mi + 1)] - SNOW[mi]) * t);
    if (soil !== soilNow) { st.ground.subsoil(soil === 'clay' ? 0x7b6650 : 0xa48d66); soilNow = soil; }
    line.position.y = -frost * IN; frostL.move(V3(-2.25, -frost * IN - .42)); frostL.set(`Frost line · ${frost} in`);
    const frozenNow = fz.depth - fz.thawed > 1;
    frozenL.move(V3(-2.25, -fz.depth * IN - .02)); frozenL.set(`Frozen to ${Math.round(fz.depth)} in`); frozenL.show(frozenNow);
    const ups = [], downs = [];
    posts.forEach(o => {
      const L = lift(o.P, m, winter, frost, soil, reach), dy = L.lift * DRAWN * IN, gap = L.gap * DRAWN * IN;
      o.L = L;
      if (!o.P.pipe) {
        o.lifted.position.y = dy; o.wall.userData.set(dy);
        // under the footing: soil that fell in during earlier thaws, then the open gap
        const bot = -o.P.depthIn * IN;
        o.fill.userData.set(bot, Math.max(0, dy - gap)); o.gap.userData.set(bot + Math.max(0, dy - gap), gap);
      }
      // up arrows where frozen soil grips the post, down arrows where unfrozen soil below the frost holds it
      if (!frozenNow) return;
      const bottom = -o.P.depthIn * IN + (o.P.pipe ? 0 : dy), s = o.P.pipe ? .19 : .27;
      for (let y = Math.min(0, dy) - .2; y > bottom + .1; y -= .4) {
        const d = -y / IN; if (d < fz.thawed) continue;
        const frozen = d < fz.depth, e = (o.P.pipe ? o.edge() : o.edge(y - dy)) + .19;
        (frozen ? ups : downs).push({ x: o.x - e, y, s, down: !frozen }, { x: o.x + e, y, s, down: !frozen });
      }
    });
    up.userData.draw(ups); down.userData.draw(downs);
    const name = MONTHS[Math.round(clamp(m, 0, 5))];
    const moving = posts.filter(o => o.L.gap > .05), up2 = posts.filter(o => o.L.lift > .05);
    const who = moving.length === 2 ? 'both concrete posts' : moving.length ? `the ${moving[0].P.id === 'shallow' ? 'typical' : 'frost line'} post` : '';
    status.textContent = !frozenNow
      ? (up2.length ? `${name}: thawed. Soil fell in under the lifted footings, so they stay up.` : `${name}: the ground isn't frozen.`)
      : who ? `${name}: frozen ${Math.round(fz.depth)} in down, and the frozen ground is lifting ${who}.`
      : `${name}: frozen ${Math.round(fz.depth)} in down. Every post is holding.`;
    st.dirty();
  }
  set({});
  return {
    set, get state() { return S; }, stage: st, posts,
    check() { return overlaps(solids(R), { allow: (a, b) => a.kind === 'fastener' || (a.unit && a.unit === b.unit) || (a.name === 'dug post' && b.name === 'concrete' && a.unit.slice(-1) === b.unit.slice(-1)) }); },
    dispose() { st.dispose(); dugF.group.traverse(o => o.geometry?.dispose()); dugF.lib.dispose?.(); ndF.lib.dispose?.(); for (const m of [conc, slump, gapMat]) m.dispose(); up.material.dispose(); down.material.dispose(); }
  };
}
