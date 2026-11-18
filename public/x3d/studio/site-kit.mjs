// GFS site kit — what is in the ground, and what the gate is framed with.
//
// Works only through the viewer's public hooks (window.__f3d, the part kinds on each mesh), so the
// same file runs inside the Model Studio (which loads it into the viewer frame) and can be imported
// by fence3d.html itself. It adds, never edits: everything it makes lives in one group it owns and
// every change to the viewer's own objects is recorded and put back by clear().
//
//  - See-through grade: the lawn goes semi-transparent with soil underneath, so the part of each
//    post that is in the ground can be seen.
//  - Dug posts: a concrete-filled hole around every post that is set in the ground, with the post
//    carried down into it. Driven steel (no-dig) posts get the pipe carried down and no concrete.
//    The viewer already draws the buried pipe for "driven-box" wood fences; those are left alone.
//  - Steel-framed wood gates: when a style's gate build is "steel", the gate's frame members are
//    drawn as welded square steel tube instead of lumber.

export const DEFAULTS = {
  xray: false, groundOpacity: 0.42,
  footings: false,                                                       // shown with the see-through ground
  holeDiaIn: 10, gateHoleDiaIn: 12, holeDepthIn: 36, postDepthIn: 32,   // dug, concrete-set posts
  drivenDepthIn: 48,                                                     // 8 ft pipe driven 4 ft
  splitPostDepthIn: 30,                                                  // mortised split-rail posts, tamped
  steelTubeIn: 1.5,
};
const IN = 1 / 12;
const POST_KINDS = new Set(['post', 'gatepost']);
const FRAME_KINDS = new Set(['gframe', 'grail', 'gstile', 'gbrace']);

/** How a post goes in the ground, from the resolved style spec. Pure. */
export function foundationFor(spec) {
  const s = spec || {};
  if (s.mode === 'split') return 'tamped';
  if (s.wood && (s.woodSupport === 'driven-box' || s.noDig)) return 'driven';
  return 'concrete';
}
/** V3-167 A job that records its install method overrides the style's saved default, exactly as the viewer does
 *  (design nd = no-dig; ndSet without nd = dug). Wood picket styles only. Pure. */
export function withDesignFoundation(spec, design) {
  const s = spec || {}, d = design || {};
  if (!s.wood || /^(split|ranch)$/.test(s.mode || '')) return s;
  if (d.nd) return { ...s, noDig: true };
  if (d.ndSet) return { ...s, noDig: false };
  return s;
}
/** True when a style asks for a welded steel gate frame AND is a wood fence whose gate the viewer
 *  builds as a boarded wood gate. Vinyl, aluminum, chain link, split rail and ranch gates never
 *  qualify, whatever their gStyle says. Pure. */
export const steelGate = spec => !!spec && spec.gStyle === 'steel' && !!spec.wood && !['split', 'ranch', 'chain', 'alu'].includes(spec.mode);

/** Distance from (x,z) to the nearest point of a run's line. Runs are in FENCE-LOCAL coordinates, so (x,z) must be too
 *  (convert a world position with fenceGroup.worldToLocal first; the fence can be slid and turned). Pure. */
export function distToRun(run, x, z) {
  const pts = (run && run.pts) || []; let best = Infinity;
  if (pts.length === 1) return Math.hypot(pts[0].x - x, pts[0].z - z);
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz;
    const t = L2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / L2)) : 0;
    best = Math.min(best, Math.hypot(a.x + dx * t - x, a.z + dz * t - z));
  }
  return best;
}
/** The run a gate part belongs to: the part's own run index when the viewer recorded one, otherwise
 *  the run whose line it sits on. Null when nothing is within tolFt, or when two runs are equally
 *  close (a part that cannot be placed is left alone rather than guessed). Pure. */
export function runForPart(runs, part, x, z, tolFt = 2) {
  if (part && part.run != null) { const r = (runs || []).find(r => r.i === part.run); if (r) return r }
  let best = null, bd = Infinity, second = Infinity;
  for (const r of runs || []) { const d = distToRun(r, x, z); if (d < bd) { second = bd; bd = d; best = r } else if (d < second) second = d }
  if (!best || bd > tolFt) return null;
  if (second - bd < 0.05 && runs.length > 1) return null;
  return best;
}
/** Which gate frame members become steel tube, and their new scale. Each candidate is
 *  { part, size:[x,y,z] (unscaled, ft), scale:[x,y,z], x, z (FENCE-LOCAL ft: the same frame as the runs' pts, i.e. world position through the inverse of fenceGroup.matrixWorld) }. Only members of a gate whose OWN
 *  run's style is a steel-framed wood gate are returned; every other gate in the scene is untouched. Pure. */
export function planSteelFrames(candidates, runs, specForRun, tubeFt) {
  const out = [];
  for (const c of candidates || []) {
    if (!c.part || !c.part.gate || !FRAME_KINDS.has(c.part.kind)) continue;
    const run = runForPart(runs, c.part, c.x, c.z); if (!run) continue;
    if (!steelGate(specForRun(run))) continue;
    const long = c.size.indexOf(Math.max(...c.size));
    out.push({ ref: c.ref, scale: c.size.map((d, i) => (i !== long && d > 1e-4 ? c.scale[i] * (tubeFt / d) : c.scale[i])) });
  }
  return out;
}
/** Applies a plan to meshes, recording how to put each one back exactly. */
export function applySteelPlan(plan, tubeMat, undo) {
  for (const p of plan) {
    const o = p.ref, keep = { mat: o.material, sx: o.scale.x, sy: o.scale.y, sz: o.scale.z };
    undo.push(() => { o.material = keep.mat; o.scale.set(keep.sx, keep.sy, keep.sz) });
    o.scale.set(p.scale[0], p.scale[1], p.scale[2]); o.material = tubeMat;
  }
  return plan.length;
}

/** Volume of concrete for one hole, in 80 lb bags (0.6 cu ft each), less the post. Pure. */
export function bagsPerHole({ holeDiaIn, holeDepthIn, postWIn = 3.5, postDIn = 3.5, postDepthIn }) {
  const hole = Math.PI * (holeDiaIn / 24) ** 2 * (holeDepthIn / 12);
  const post = (postWIn / 12) * (postDIn / 12) * (Math.min(postDepthIn, holeDepthIn) / 12);
  return Math.max(0, (hole - post) / 0.6);
}

/** Makes a scene-level group ride along with the viewer's fence group (the viewer lets the user slide
 *  and turn the whole fence). Call it right after the group is (re)built from world positions: from then
 *  on, each frame, group.matrix = fenceNow x inverse(fenceAtBuild). One hook per scene, shared. */
export function followFence(w, T, group) {
  const scene = w.__f3d.scene, fg = w.__f3d.fenceGroup; fg.updateWorldMatrix(true, false);
  group.matrixAutoUpdate = false; group.userData.followBase = new T.Matrix4().copy(fg.matrixWorld).invert();
  group.matrix.identity(); group.matrixWorldNeedsUpdate = true;
  const reg = scene.userData.__gfsFollow || (scene.userData.__gfsFollow = new Set()); reg.add(group);
  if (!scene.userData.__gfsFollowHook) {
    const prev = scene.onBeforeRender; scene.userData.__gfsFollowHook = true;
    scene.onBeforeRender = function () {
      try { const f = w.__f3d.fenceGroup; f.updateWorldMatrix(true, false); reg.forEach(g => { if (!g.parent) { reg.delete(g); return } g.matrix.multiplyMatrices(f.matrixWorld, g.userData.followBase); g.matrixWorldNeedsUpdate = true }) } catch (_) { }
      return prev && prev.apply(this, arguments);
    };
  }
}

export function createSiteKit(viewer, opts = {}) {
  const cfg = { ...DEFAULTS, ...opts };
  let T = null, group = null, parts = null, soil = null, mats = null, unsub = null, on = false, win = null, sceneHook = null;
  const undo = [];                       // functions that put the viewer's own objects back
  let last = { posts: 0, concrete: 0, driven: 0, tamped: 0, steelGateParts: 0, bags: 0 };

  const W = () => viewer.hooks();
  const restoreAll = () => { while (undo.length) { try { undo.pop()() } catch (_) { } } };

  function materials() {
    if (mats && mats.T === T) return mats;
    mats = {
      T,
      concrete: new T.MeshStandardMaterial({ color: 0x9f9c94, roughness: 1, metalness: 0, envMapIntensity: 0.15, transparent: true, opacity: 0.9 }),
      steel: new T.MeshStandardMaterial({ color: 0xb8c5ce, roughness: 0.42, metalness: 0.85 }),
      tube: new T.MeshStandardMaterial({ color: 0x23262a, roughness: 0.5, metalness: 0.6 }),
      soil: new T.MeshStandardMaterial({ color: 0x6f5438, roughness: 1, metalness: 0, fog: false }),
    };
    return mats;
  }

  function clearGroup() {
    if (!group) return;
    group.traverse(o => { if (o.geometry) o.geometry.dispose() });
    group.clear();
  }

  function applyXray(w) {
    const g = w.__f3d.ground; if (!g) return;
    const seen = new Set();
    g.traverse(o => { const m = o.material; if (m && !seen.has(m)) { seen.add(m); const k = { transparent: m.transparent, opacity: m.opacity, depthWrite: m.depthWrite }; undo.push(() => { Object.assign(m, k); m.needsUpdate = true }); m.transparent = true; m.opacity = cfg.groundOpacity; m.depthWrite = false; m.needsUpdate = true } });
    w.__f3d.scene.children.forEach(o => { if (o.userData && o.userData.ctx === 'grass' && o.visible) { o.visible = false; undo.push(() => { o.visible = true }) } });
    // Soil under the lawn, so the buried parts read against dirt and not against the sky colour.
    soil = new T.Mesh(new T.PlaneGeometry(600, 600), materials().soil);
    soil.rotation.x = -Math.PI / 2; soil.position.y = -Math.max(cfg.holeDepthIn, cfg.drivenDepthIn) * IN - 0.6; soil.userData.noShadow = 1;
    group.add(soil);
  }

  function build() {
    const w = W(); if (!w || !on) return;
    if (w.document !== win) { win = w.document; group = null; parts = null; mats = null; undo.length = 0; sceneHook = null }   // a reloaded viewer is a new document
    restoreAll(); clearGroup();
    if (!group) { group = new T.Group(); group.name = 'gfsSiteKit'; group.userData.noShadow = 1 }
    if (group.parent !== w.__f3d.scene) w.__f3d.scene.add(group);
    // Everything built for the fence lives in `parts`, kept in the fence group's own coordinates and
    // carried with it every frame, so sliding or turning the fence in the viewer takes the buried posts
    // and concrete along. It is not parented into the fence group: the viewer owns and walks that group.
    const fg0 = w.__f3d.fenceGroup;
    parts = new T.Group(); parts.name = 'gfsSiteKitParts'; parts.matrixAutoUpdate = false; group.add(parts);
    fg0.updateWorldMatrix(true, false);
    const toFence = new T.Matrix4().copy(fg0.matrixWorld).invert();
    parts.matrix.copy(fg0.matrixWorld); parts.matrixWorldNeedsUpdate = true;
    if (!sceneHook) {
      const scene = w.__f3d.scene, prev = scene.onBeforeRender;
      sceneHook = { scene, prev };
      scene.onBeforeRender = function () { try { if (on && parts && parts.parent) { const f = w.__f3d.fenceGroup; f.updateWorldMatrix(true, false); parts.matrix.copy(f.matrixWorld); parts.matrixWorldNeedsUpdate = true } } catch (_) { } return prev && prev.apply(this, arguments) };
    }
    const place = mesh => { mesh.updateMatrix(); mesh.matrix.premultiply(toFence); mesh.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale); parts.add(mesh) };
    const M = materials(), fg = w.__f3d.fenceGroup;
    const stat = { posts: 0, concrete: 0, driven: 0, tamped: 0, steelGateParts: 0, bags: 0 };
    const specOf = name => { try { return w.__f3dStyleSpec(name) || {} } catch (_) { return {} } };
    const runs = (() => { try { return w.__f3dRuns() || [] } catch (_) { return [] } })();
    const curName = (() => { const sel = w.document.querySelector('#styleRow select'); return sel ? sel.value : (w.__f3d.spec || {}).style })();
    const curSpec = specOf(curName);
    // Driven-box wood fences: the viewer draws the buried pipe itself. Count them, add nothing.
    const buriedPipes = (() => { let n = 0; fg.traverse(o => { if (o.isMesh && o.userData && Array.isArray(o.userData.parts)) n += o.userData.parts.filter(x => x && x.kind === 'foundation').length }); return n })();
    const hasBuriedPipe = buriedPipes > 0;
    stat.posts += buriedPipes; stat.driven += buriedPipes;

    if (cfg.footings) {
      const m4 = new T.Matrix4(), p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3(), box = new T.Box3(), size = new T.Vector3();
      fg.updateWorldMatrix(true, true);
      const done = [];
      fg.traverse(o => {
        if (!o.isMesh) return;
        const parts = o.userData && o.userData.parts, kind0 = o.userData && o.userData.fencePartKind;
        if (!POST_KINDS.has(kind0) && !(parts && parts.some(x => POST_KINDS.has(x.kind)))) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        o.geometry.boundingBox.getSize(size);
        const round = /Cylinder/.test(o.geometry.type);
        const n = o.isInstancedMesh ? o.count : 1;
        for (let i = 0; i < n; i++) {
          const part = parts && parts[i]; if (parts && part && !POST_KINDS.has(part.kind)) continue;
          if (o.isInstancedMesh) { o.getMatrixAt(i, m4); m4.premultiply(o.matrixWorld) } else m4.copy(o.matrixWorld);
          m4.decompose(p, q, s);
          const wX = size.x * s.x, hY = size.y * s.y, wZ = size.z * s.z;
          if (hY < 1.5 || wX > 1.2 || wZ > 1.2) continue;                 // box boards, trim and caps are not posts
          const bottom = p.y - hY / 2 + (o.geometry.boundingBox.min.y + size.y / 2) * s.y;
          if (done.some(d => Math.hypot(d[0] - p.x, d[1] - p.z) < 0.18)) continue;   // one footing per post, however many pieces it is drawn from
          done.push([p.x, p.z]);
          const run = part && runs.find(r => r.i === part.run), sp = withDesignFoundation(run && run.styleName ? specOf(run.styleName) : curSpec, w.__f3d.spec);
          let how = foundationFor(sp); if (round && sp.wood && sp.mode !== 'split') how = 'driven';   // a round cedar split rail post is tamped in at its own diameter, not a driven pipe (V3-150)
          if (how === 'driven' && hasBuriedPipe) { stat.posts++; stat.driven++; continue }
          const gate = (part && part.kind === 'gatepost') || kind0 === 'gatepost';
          const depth = (how === 'driven' ? cfg.drivenDepthIn : how === 'tamped' ? cfg.splitPostDepthIn : cfg.postDepthIn) * IN;
          // The post, carried down. A wood post on a driven pipe stops at grade: only the pipe goes in.
          const stub = how === 'driven'
            ? new T.Mesh(new T.CylinderGeometry(2.375 * IN / 2, 2.375 * IN / 2, depth, 18), M.steel)
            : new T.Mesh(round ? new T.CylinderGeometry(wX / 2, wX / 2, depth, 18) : new T.BoxGeometry(wX, depth, wZ), o.material);
          stub.position.set(p.x, bottom - depth / 2, p.z); stub.quaternion.copy(q); stub.userData.kit = 'buriedPost';
          place(stub);
          if (how === 'concrete') {
            const dia = (gate ? cfg.gateHoleDiaIn : cfg.holeDiaIn) * IN, hd = cfg.holeDepthIn * IN;
            const c = new T.Mesh(new T.CylinderGeometry(dia / 2, dia / 2 * 0.94, hd, 24), M.concrete);
            c.position.set(p.x, bottom - hd / 2 + 0.01, p.z); c.userData.kit = 'concrete'; c.renderOrder = 2; place(c);
            stat.concrete++; stat.bags += bagsPerHole({ holeDiaIn: gate ? cfg.gateHoleDiaIn : cfg.holeDiaIn, holeDepthIn: cfg.holeDepthIn, postWIn: wX * 12, postDIn: wZ * 12, postDepthIn: cfg.postDepthIn });
          } else stat[how]++;
          stat.posts++;
        }
      });
    }

    // Steel-framed wood gate: same frame layout the viewer built, drawn as welded square tube.
    // Decided gate by gate from that gate's own run and style — never scene-wide.
    {
      const runSpec = r => { try { return Object.assign({}, w._specParse(r.styleName || curName) || {}, w.GFSModelContract.runPatch(w.__f3d.spec, r.styleName || curName, r.ri, r.sourceStyleName)) } catch (_) { return specOf(r.styleName || curName) } };
      const cands = [], size = new T.Vector3(), pos = new T.Vector3();
      fg.updateWorldMatrix(true, true);   // runs are fence-local: candidate x/z are taken through the inverse fence matrix
      fg.traverse(o => {
        if (!o.isMesh || o.isInstancedMesh) return;
        const part = o.userData && o.userData.parts && o.userData.parts[0];
        if (!part || !part.gate || !FRAME_KINDS.has(part.kind)) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        o.geometry.boundingBox.getSize(size); o.getWorldPosition(pos); fg.worldToLocal(pos);
        cands.push({ ref: o, part, size: [size.x, size.y, size.z], scale: [o.scale.x, o.scale.y, o.scale.z], x: pos.x, z: pos.z });
      });
      if (cands.length) stat.steelGateParts = applySteelPlan(planSteelFrames(cands, runs, runSpec, cfg.steelTubeIn * IN), M.tube, undo);
    }

    if (cfg.xray) applyXray(w);
    stat.bags = Math.ceil(stat.bags);
    last = stat;
    try { const r = w.__rend(); if (r.shadowMap) r.shadowMap.needsUpdate = true } catch (_) { }
    viewer.redraw && viewer.redraw();
  }

  const api = {
    async enable() { T = await viewer.three(); on = true; if (!unsub) unsub = viewer.onRebuild(() => setTimeout(build, 60)); build(); return api.state() },
    clear() { on = false; if (unsub) { unsub(); unsub = null } restoreAll(); clearGroup(); if (group && group.parent) group.parent.remove(group); if (sceneHook) { try { sceneHook.scene.onBeforeRender = sceneHook.prev } catch (_) { } sceneHook = null } viewer.redraw && viewer.redraw() },
    set(patch) { Object.assign(cfg, patch || {}); if (on) build(); return api.state() },
    refresh: build,
    state: () => ({ on, config: { ...cfg }, built: { ...last } }),
  };
  return api;
}
