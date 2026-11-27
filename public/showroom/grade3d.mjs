// Grade Lab in 3D: the same 32 ft run as the drawing, built from the Executive App's own fence models
// on a yard you shape with your finger. The yard is cut open along the posts (as in the other Lab
// tools) and seen from the rail side, so the pickets stand over the lawn and the gap under them is
// measured where it really is. All the rules and sums live in gradelab.mjs; this only draws them.
//
// Wood is the no-dig dog-ear privacy style (pickets 2½ in off the ground at the posts, a kickboard
// when asked for); vinyl is the Kingston (its bottom rail 2 in off the ground). Every post is GFS's
// steel, 8 ft long and driven 4 ft: raising a post slides its box (or vinyl post) up the pipe, so the
// steel shows underneath; lowering it never sets it more than 2 in into the ground.
import { THREE, IN, createStage, fence, reveal, pipe, solids, overlaps, mats, settleRails, settleCaps, trimRailJoints, settleOn } from './lab3d.mjs';
import { surfaceMaterial } from './vendor/exec/real-surfaces.mjs';
import { STYLE_ND } from './dig-plan.mjs';

const VINYL = 'Kingston - White 6ft';
const KICK_IN = 5.5;
const PIPE_DOWN_IN = 48, PIPE_UP_IN = 48;

export function createGradeScene(host, { specs, L, SEC, N }) {
  const st = createStage(host, {
    views: [{ id: 'run', label: `The whole ${L} ft run`, aspect: .44, minH: 230, maxH: 470 }, { id: 'close', label: 'Close-up at the biggest gap', aspect: .34, minH: 170, maxH: 300 }],
    soilDepth: 6, width: 240, back: 200, segPerFt: 4, turnWithOneFinger: false, stackAlways: true
  });
  const R = st.root, X0 = -L / 2;                 // run x (0…L) → world x
  const W = x => X0 + x;
  const dirtMat = surfaceMaterial(THREE, 'soil', 0x7d5d40);
  const cutMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const lineMat = mats().line;
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x8cc7ff, transparent: true, opacity: .9, depthWrite: false, toneMapped: false });
  let built = null, key = '', fenceZ = 0;
  // run line: the posts' pipes sit on the cut. The app sets a no-dig pipe 2½ in behind the run line.
  const RUN_Z = { wood: -2.5 * IN, vinyl: 0 };

  function buildFence(S) {
    const k = [S.style, S.kick && S.style === 'wood' ? 1 : 0, ...Array.from({ length: N + 1 }, (_, i) => Math.round(S.base(i) * 768))].join(',');
    if (k === key) return false;
    key = k;
    if (built) { R.remove(built.group); built.group.traverse(o => { if (o.geometry && !o.userData.keep) o.geometry.dispose(); }); built.lib.dispose?.(); }
    const wood = S.style === 'wood';
    const pts = Array.from({ length: N + 1 }, (_, i) => [W(i * SEC), S.base(i)]);
    const F = fence(wood ? STYLE_ND : VINYL, 0, 0, { noDig: wood ? true : undefined, specs, pts, z: RUN_Z[S.style], extra: wood && S.kick ? { kickIn: KICK_IN } : {} });
    // where the fence bends at a post: rails rest on the box tops, their ends are trimmed to meet, pickets sit on the kickboard, vinyl posts clear their rails
    reveal(F.parts.filter(p => p.geo === 'CylinderGeometry' && p.kind === 'post'), () => 0);
    settleRails(F); trimRailJoints(F); if (wood && S.kick) settleOn(F, 'picket', 'kick'); if (!wood) settleCaps(F);
    const g = new THREE.Group(); g.add(F.group); R.add(g);
    // the app's pipes are swapped for 8 ft pipes driven 4 ft into the ground under each post
    reveal(F.parts.filter(p => p.geo === 'CylinderGeometry' && p.kind === 'post'), () => 0);
    const pipes = [];
    for (let i = 0; i <= N; i++) {
      const x = i * SEC, gr = S.groundAt(x);
      // under vinyl only the buried steel and any stub below a raised post show (the adapters aren't drawn)
      const top = wood ? gr + PIPE_UP_IN * IN : Math.min(Math.max(gr, S.base(i)), S.base(i) + 1.5 * IN);   // under vinyl it stops below the bottom rail
      const len = (top - (gr - PIPE_DOWN_IN * IN)) / IN;
      const p = pipe(2.375, .154, len); p.position.set(W(x), gr - PIPE_DOWN_IN * IN, wood ? 0 : 0); p.traverse(o => { if (o.isMesh) { o.userData.what = 'steel post'; o.userData.unit = 'post' + i; } });
      g.add(p); pipes.push(p);
    }
    let front = -Infinity; for (const p of F.parts) if (p.kind === 'picket' || p.kind === 'kick' || (p.kind === 'rail' && !wood)) front = Math.max(front, p.box.max.z);
    fenceZ = front;
    built = { group: g, lib: F.lib, F, wood };
    return true;
  }

  // ── the raked dirt: a low berm along the bottom of the fence, cut open at the front ──
  let berm = null, overlay = null, origLine = null, ring = null;
  function buildBerm(S) {
    if (berm) { R.remove(berm); berm.geometry.dispose(); berm = null; }
    let any = false; for (let j = 0; j < S.NS; j++) if (S.dirt[j] > .002) { any = true; break; }
    if (!any) return;
    // across the fence: full height under the pickets, falling away over a foot behind them
    const zs = [0, -.15, -.45, -.7, -.95, -1.25], prof = [1, 1, .85, .5, .2, 0], pos = [], idx = [];
    const n = S.NS, cols = zs.length;
    for (let j = 0; j < n; j++) { const x = j * S.STEP, gr = S.groundAt(x), d = S.dirt[j]; for (let c = 0; c < cols; c++) pos.push(W(x), gr + d * prof[c] + .002, zs[c]); }
    for (let j = 0; j < n - 1; j++) for (let c = 0; c < cols - 1; c++) { const a = j * cols + c, b = a + cols; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    // the cut face of the berm at z = 0
    const base = pos.length / 3;
    for (let j = 0; j < n; j++) { const x = j * S.STEP, gr = S.groundAt(x); pos.push(W(x), gr, .001, W(x), gr + S.dirt[j], .001); }
    for (let j = 0; j < n - 1; j++) { const a = base + j * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    berm = new THREE.Mesh(geo, dirtMat); berm.receiveShadow = true; berm.castShadow = false; berm.userData.noCheck = true; R.add(berm);
  }
  // ── gaps under the fence (red over 4 in, orange 1–4 in), fence in the dirt, and grading cut and fill ──
  function buildOverlay(S, m) {
    if (overlay) { R.remove(overlay); overlay.geometry.dispose(); overlay = null; }
    if (origLine) { R.remove(origLine); origLine.geometry.dispose(); origLine = null; }
    const pos = [], col = [], quad = (x0, x1, y0a, y0b, y1a, y1b, z, c, a) => { pos.push(x0, y0a, z, x1, y0b, z, x1, y1b, z, x0, y0a, z, x1, y1b, z, x0, y1a, z); for (let k = 0; k < 6; k++) col.push(c[0], c[1], c[2], a); };
    const zf = fenceZ + .01;
    for (let x = .3; x <= L - .3; x += S.STEP) {
      const pi = Math.round(x / SEC); if (Math.abs(x - pi * SEC) < .4) continue;
      const a = x - S.STEP / 2, b = x + S.STEP / 2, gp = S.bottomAt(x) - S.surf(x);
      if (gp > 1 * IN) quad(W(a), W(b), S.surf(a), S.surf(b), S.bottomAt(a), S.bottomAt(b), zf, gp > 4 * IN ? [.94, .36, .36] : [.94, .66, .4], gp > 4 * IN ? .75 : .55);
      else if (gp < -1 * IN) quad(W(a), W(b), S.surf(a) - .02, S.surf(b) - .02, S.surf(a) + .02, S.surf(b) + .02, zf, [1, .67, .24], .95);
    }
    if (S.orig) {
      for (let j = 0; j < S.NS - 1; j++) {
        const x = j * S.STEP, x1 = x + S.STEP, a0 = S.orig[j], a1 = S.orig[j + 1], b0 = S.ground[j], b1 = S.ground[j + 1];
        if (Math.abs(a0 - b0) < .004 && Math.abs(a1 - b1) < .004) continue;
        const fill = (b0 + b1) > (a0 + a1);
        quad(W(x), W(x1), Math.min(a0, b0), Math.min(a1, b1), Math.max(a0, b0), Math.max(a1, b1), .006, fill ? [.24, .81, .56] : [.94, .36, .36], .4);
      }
      // the yard as it was, dashed, on the cut face
      const lp = [], li = [], uv = []; let s = 0;
      for (let j = 0; j < S.NS; j++) { const x = j * S.STEP, y = S.orig[j]; if (j) s += Math.hypot(S.STEP, y - S.orig[j - 1]); lp.push(W(x), y - .012, .012, W(x), y + .012, .012); uv.push(s / .6, 0, s / .6, 1); }
      for (let j = 0; j < S.NS - 1; j++) { const a = j * 2; li.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); lg.setIndex(li);
      origLine = new THREE.Mesh(lg, lineMat); origLine.renderOrder = 3; origLine.userData.noCheck = true; R.add(origLine);
    }
    if (!pos.length) return;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    overlay = new THREE.Mesh(geo, cutMat); overlay.renderOrder = 2; overlay.userData.noCheck = true; R.add(overlay);
  }

  // ── labels ──
  const V3 = (x, y, z = 0) => new THREE.Vector3(x, y, z);
  const gapPin = st.pin('run', V3(0, 0), ''), gapPin2 = st.pin('close', V3(0, 0), ''), kinkPin = st.pin('run', V3(0, 0), '');
  const handles = Array.from({ length: N + 1 }, () => { const p = st.pin('run', V3(0, 0), ''); p.el.classList.add('gl-handle'); return p; });
  const frac = v => { const n = Math.round(Math.abs(v) * 16); if (!n) return '0'; const w = Math.floor(n / 16), r = n % 16; let f = ''; if (r) { let a = r, d = 16; while (a % 2 === 0) { a /= 2; d /= 2; } f = `${a}/${d}`; } return [w || '', f].filter(Boolean).join(' '); };
  st.frameView('run', { cx: 0, cy: 2.3, w: L + 1.5, h: 10.5 });

  function update(S, m, brush) {
    st.setGrade(x => S.groundAt(Math.min(L, Math.max(0, x - X0))));
    buildFence(S);
    buildBerm(S);
    buildOverlay(S, m);
    const top = 74.5;   // picket tops (wood) and post tops (vinyl) at the posts
    // biggest gap
    const gx = m.maxGap > .3 * IN ? m.maxAt : L / 2;
    st.frameView('close', { cx: W(gx), cy: (S.bottomAt(gx) + S.surf(gx)) / 2 + .1, w: 4.2, h: 1.3 });
    const label = m.maxGap > 1 * IN ? `${frac(m.maxGap * 12)} in gap` : '';
    gapPin.set(label); gapPin.move(V3(W(m.maxAt), S.surf(m.maxAt) - .25, fenceZ)); gapPin.show(!!label);
    gapPin2.set(m.maxGap > 1 * IN ? `${frac(m.maxGap * 12)} in gap under the fence` : m.maxGap > .5 * IN ? `${frac(m.maxGap * 12)} in: raked dirt closes it` : 'Less than ½ in under the fence');
    gapPin2.move(V3(W(gx), S.bottomAt(gx) + .35, fenceZ));
    kinkPin.set(`Sharpest bend ${m.kink.toFixed(1)}°`); kinkPin.move(V3(W(m.kinkAt * SEC), S.base(Math.max(0, m.kinkAt)) + top * IN + .5)); kinkPin.show(m.kinkAt > 0 && m.kink > 1.5);
    handles.forEach((h, i) => {
      h.set(`<span class="arr">▲<br>▼</span>${Math.abs(S.offs[i]) > .01 ? `<small>${S.offs[i] > 0 ? '+' : '−'}${frac(Math.abs(S.offs[i]) * 12)} in</small>` : ''}`);
      h.move(V3(W(i * SEC), S.base(i) + 3.4, .3)); h.show(S.mode === 'posts');
    });
    // brush ring on the lawn where the finger is
    if (brush && S.mode !== 'posts') {
      if (!ring) { ring = new THREE.Mesh(new THREE.RingGeometry(.92, 1, 48), ringMat); ring.rotation.x = -Math.PI / 2; ring.userData.noCheck = true; ring.renderOrder = 4; R.add(ring); }
      const r = S.mode === 'dirt' ? 1.2 : 3; ring.scale.set(r, r, 1); ring.position.set(W(brush.x), S.surf(Math.min(L, Math.max(0, brush.x))) + .03, -.6);
      ringMat.color.set(S.mode === 'dirt' ? 0xf0a865 : 0x8cc7ff); ring.visible = true;
    } else if (ring) ring.visible = false;
    st.dirty();
  }
  return {
    update, stage: st,
    // where a finger is, in run feet along the fence and height (or null if it's off the views)
    pick(cx, cy) { const p = st.pick(cx, cy, 0); return p ? { x: p.x - X0, y: p.y, view: p.view } : null; },
    // a post's pipe runs up inside its box (or vinyl post): that's where it's meant to be
    check() { const inPost = (a, b) => a.name === 'steel post' && /^(post|cap)$/.test(b.kind) && Math.abs(a.c.x - b.c.x) < .4;
      // vinyl is built by nesting: boards slide into the rail channels, rails into routed posts, caps over posts
      const nest = (a, b) => (a.kind === 'picket' && /^(rail|reveal)$/.test(b.kind)) || (a.kind === 'rail' && b.kind === 'reveal') || (a.kind === 'post' && /^(rail|reveal|cap)$/.test(b.kind));
      return overlaps(solids(R), { allow: (a, b) => a.kind === 'fastener' || b.kind === 'fastener' || (a.unit && a.unit === b.unit) || inPost(a, b) || inPost(b, a) || (!built.wood && (nest(a, b) || nest(b, a))) }); },
    dispose() { st.dispose(); built?.lib?.dispose?.(); for (const m of [dirtMat, cutMat, ringMat]) m.dispose(); }
  };
}
