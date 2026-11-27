// Wood movement in 3D: two sections from the Executive App's models, seen close up from the picket
// side. Left: dog-ear privacy, boards side by side. Right: board-on-board, boards overlapped.
// Every picket is made narrower (or wider) across its width by the Wood Handbook shrinkage the tool
// works out, at true size, about its own middle (where it's nailed). On the privacy fence the gaps
// open; on board-on-board the boards still overlap, so nothing shows through.
// If boards built dry swell until they touch, they're drawn touching (in a real fence they'd push
// on each other and cup), and the tool says so.
import { THREE, IN, createStage, fence, solids, overlaps } from './lab3d.mjs';

const MODELS = {
  pt: ['Standard Privacy 6ft (PT)', 'Board on Board 6ft (PT)'],
  wrc: ['Full Cedar Privacy 6ft', 'Full Cedar Board on Board 6ft'],
  nwc: ['Full Cedar Privacy 6ft', 'Full Cedar Board on Board 6ft']
};
const XS = { butt: -14, bob: 14 }, ZR = -1;

export function createWoodScene(host, { specs } = {}) {
  const st = createStage(host, { views: [{ id: 'butt', label: 'Dog-ear privacy: boards side by side', tone: 'bad' }, { id: 'bob', label: 'Board-on-board: boards overlap', tone: 'good' }], soilDepth: 3, width: 80, back: 120, home: { yaw: .18, pitch: .04 } });
  const R = st.root;
  let built = null, res = null;
  const M = new THREE.Matrix4(), T1 = new THREE.Matrix4(), T2 = new THREE.Matrix4(), Sm = new THREE.Matrix4();

  function build(sp) {
    if (built?.sp === sp) return;
    if (built) for (const id of ['butt', 'bob']) { R.remove(built[id].g); built[id].F.lib?.dispose?.(); built[id].g.traverse(o => o.geometry?.dispose?.()); }
    built = { sp };
    ['butt', 'bob'].forEach((id, k) => {
      const x = XS[id];
      // run right to left so the picket side faces the viewer
      const F = fence(MODELS[sp][k], 0, 0, { specs, pts: [[x + 4, 0, ZR], [x - 4, 0, ZR]] });
      const g = new THREE.Group(); g.add(F.group); R.add(g);
      const pk = F.parts.filter(p => p.kind === 'picket').map(p => ({ p, x0: p.box.min.x, x1: p.box.max.x, zc: (p.box.min.z + p.box.max.z) / 2, cx: (p.box.min.x + p.box.max.x) / 2 })).sort((a, b) => a.cx - b.cx);
      // layers by depth: one for privacy, two for board-on-board
      const zs = [...new Set(pk.map(q => Math.round(q.zc / IN * 8)))].sort((a, b) => a - b);
      pk.forEach(q => { q.layer = zs.indexOf(Math.round(q.zc / IN * 8)); q.w = q.x1 - q.x0; });
      // the least room between neighbours in the same layer: how far boards can swell before they touch
      let room = Infinity; for (const L of zs.keys()) { const a = pk.filter(q => q.layer === L); for (let i = 1; i < a.length; i++) room = Math.min(room, a[i].x0 - a[i - 1].x1); }
      const w = pk.reduce((s, q) => s + q.w, 0) / pk.length;
      // overlap of each board on its neighbour in the other layer (board-on-board)
      let lap = Infinity; if (zs.length > 1) for (let i = 1; i < pk.length; i++) if (pk[i].layer !== pk[i - 1].layer) lap = Math.min(lap, pk[i - 1].x1 - pk[i].x0);
      const front = Math.max(...pk.map(q => q.p.box.max.z));
      // the app draws the back layer of board-on-board in its dark rail colour; it's the same boards, so it gets the front boards' wood
      if (zs.length > 1) { const fm = pk.find(q => q.layer === zs.length - 1).p.mesh.material; for (const q of pk) if (q.p.mesh.material !== fm) q.p.mesh.material = fm; }
      built[id] = { F, g, pk, room: Math.max(0, room), w, lap: zs.length > 1 ? lap : 0, layers: zs.length, front };
    });
    for (const id of ['butt', 'bob']) st.frameView(id, { cx: XS[id], cy: 3.1, w: 2.6, h: 1.7, cz: built[id].front });
  }

  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const L = { butt: st.pin('butt', V3(0, 0, 0), ''), bob: st.pin('bob', V3(0, 0, 0), '') };
  const frac = v => { const n = Math.round(Math.abs(v) * 16); if (!n) return '0'; const w = Math.floor(n / 16), r = n % 16; let f = ''; if (r) { let a = r, d = 16; while (a % 2 === 0) { a /= 2; d /= 2; } f = `${a}/${d}`; } return [w || '', f].filter(Boolean).join(' '); };

  // s: shrinkage as a share of the width (negative = swells)
  function set({ sp, s }) {
    build(sp);
    res = {};
    for (const id of ['butt', 'bob']) {
      const B = built[id];
      // swelling stops when boards in the same layer touch
      const grow = Math.max(-s * B.w, 0), pressed = grow > B.room + 1e-9, k = pressed ? 1 + B.room / B.w : 1 - s;
      const touched = new Set();
      for (const q of B.pk) {
        T1.makeTranslation(-q.cx, 0, 0); Sm.makeScale(k, 1, 1); T2.makeTranslation(q.cx, 0, 0);
        M.copy(q.p.base).premultiply(T1).premultiply(Sm).premultiply(T2);
        q.p.mesh.setMatrixAt(q.p.i, M); touched.add(q.p.mesh);
      }
      touched.forEach(m => { m.instanceMatrix.needsUpdate = true; });
      // measured at a joint between full boards near the middle of the view
      const mid = B.pk.filter(q => q.layer === B.layers - 1).reduce((a, q) => Math.abs(q.x1 - XS[id]) < Math.abs(a.x1 - XS[id]) ? q : a);
      const i = B.pk.indexOf(mid), same = B.pk.slice(i + 1).find(q => q.layer === mid.layer), next = B.pk[i + 1];
      const dw = mid.w * (1 - k);   // each full board is this much narrower, ft
      res[id] = { boardIn: mid.w / IN, builtGapIn: (same.x0 - mid.x1) / IN, gapIn: (same.x0 - mid.x1 + dw) / IN, lapIn: B.layers > 1 ? (mid.x1 - next.x0 - dw) / IN : 0, pressed };
      const r = res[id];
      L[id].set(id === 'butt'
        ? (r.pressed ? 'Boards swell tight together' : r.gapIn < 1 / 32 ? 'No gap yet' : `${frac(r.gapIn)} in gap: you can see through`)
        : `Boards still overlap ${frac(r.lapIn)} in: no gap`);
      L[id].move(V3(mid.x1, 3.55, B.front));
    }
    st.dirty();
    return res;
  }

  return {
    set, stage: st, get result() { return res; }, get widths() { return Object.fromEntries(['butt', 'bob'].map(id => [id, built[id].pk.map(q => [+(q.w / IN).toFixed(2), q.layer, +(q.x0 / IN).toFixed(1)])])); },
    check() {
      return overlaps(solids(R), { allow: (a, b) => a.kind === 'fastener' || b.kind === 'fastener' });
    },
    dispose() { st.dispose(); if (built) for (const id of ['butt', 'bob']) built[id].F.lib?.dispose?.(); }
  };
}
