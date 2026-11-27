// Lifespan in 3D: the chosen material as the Executive App's own model, three sections long, with a
// label on the spot that wears out first. Nothing is aged or animated here: the years come from the
// published ranges in the tool, and there's no honest way to draw year 23 of a fence.
import { THREE, IN, createStage, fence, reveal, solids, overlaps } from './lab3d.mjs';
import { STYLE, STYLE_ND } from './dig-plan.mjs';

const CEDAR = 'Full Cedar Privacy 6ft', CEDAR_ND = "6' No-dig Cedar dog ear privacy";
// name(steel): the app model; bay: post spacing (ft); pin: [text, where] with where = 'post' (a post at the ground), 'bottom' (mid-section at the ground) or 'mid'
const MODELS = {
  pt: { name: s => s ? STYLE_ND : STYLE, h: 6, bay: 8, wood: true },
  wrc: { name: s => s ? CEDAR_ND : CEDAR, h: 6, bay: 8, wood: true },
  nwc: { name: s => s ? CEDAR_ND : CEDAR, h: 6, bay: 8, wood: true },
  vinyl: { name: () => 'Kingston - White 6ft', h: 6, bay: 8, pin: ['Mower and trimmer knocks land here', 'bottom'] },
  alu: { name: () => 'Aluminum 3-Rail 4ft', h: 4, bay: 6, pin: ['Powder coat: nothing to keep up', 'mid'] },
  cl: { name: () => 'Galv Chain Link 4ft', h: 4, bay: 10, pin: ['Zinc wears first where the fabric meets wet soil', 'bottom'] },
  clb: { name: () => 'BLK Chain Link 4ft', h: 4, bay: 10, pin: ['Trimmer nicks in the coating, along the bottom', 'bottom'] },
  split: { name: () => '4’ cedar split rail', h: 4, bay: 10, extra: { wire: 'none' }, pin: ['Posts go first, at the soil line', 'post'] }
};
const FITTING = /^(tensionband|braceband|loopcap|cap|railend|tensionbar|fabrictie|staple|fastener)$/, POSTISH = /^(post|termpost|linepost)$/;

export function createLifeScene(host, { specs } = {}) {
  const st = createStage(host, { views: [{ id: 'main' }], soilDepth: 14, width: 200, back: 160, home: { yaw: .32, pitch: .1 } });
  const R = st.root, ZR = -1.5;
  let built = null;
  const pin = st.pin('main', new THREE.Vector3(), '');

  function set({ id, steel }) {
    const m = MODELS[id]; if (!m) return;
    const nd = !!(m.wood && steel), k = id + '|' + nd;
    if (built?.k === k) return;
    if (built) { R.remove(built.g); built.F.lib?.dispose?.(); built.g.traverse(o => o.geometry?.dispose?.()); }
    const half = m.bay * 1.5;
    const F = fence(m.name(nd), 0, 0, { h: m.h, specs, noDig: nd ? true : undefined, extra: m.extra, pts: [-half, -half + m.bay, half - m.bay, half].map(x => [x, 0, ZR]) });
    // the no-dig steel is inside each box above the ground, and under the lawn below it
    if (nd) reveal(F.parts.filter(p => p.geo === 'CylinderGeometry' && p.kind === 'post'), () => 0);
    const g = new THREE.Group(); g.add(F.group); R.add(g);
    const posts = F.parts.filter(p => POSTISH.test(p.kind || '') && p.geo !== 'CylinderGeometry').sort((a, b) => a.cx - b.cx);
    const front = Math.max(...F.parts.map(p => p.box.max.z)), top = Math.max(...F.parts.map(p => p.box.max.y));
    built = { k, g, F, id };
    const [text, where] = m.wood ? (nd ? ['Galvanized steel posts: no wood in the ground', 'post'] : ['Wood posts rot first, here at the soil line', 'post']) : m.pin;
    const post = posts[Math.min(2, posts.length - 1)];
    pin.set(text);
    pin.move(where === 'post' ? new THREE.Vector3(post.cx, .25, post.box.max.z) : where === 'bottom' ? new THREE.Vector3(-m.bay / 2, .3, front) : new THREE.Vector3(-m.bay / 2, top * .6, front));
    st.frameView('main', { cx: 0, cy: top * .5, w: half * 2.5 + 3, h: top + 2.6, cz: ZR });
    st.dirty();
  }
  return {
    set, stage: st,
    check() {
      return overlaps(solids(R), { allow: (a, b) => FITTING.test(a.kind || '') || (a.kind === 'rail' && POSTISH.test(b.kind || ''))
        || (a.kind === 'rail' && b.kind === 'rail' && built.id === 'split') || (a.kind === 'picket' && b.kind === 'rail' && built.id === 'alu')
        || (built.id === 'vinyl' && ((a.kind === 'picket' && /^(rail|reveal)$/.test(b.kind)) || (a.kind === 'rail' && b.kind === 'reveal') || (a.kind === 'post' && /^(rail|reveal|cap)$/.test(b.kind)))) });
    },
    dispose() { st.dispose(); built?.F.lib?.dispose?.(); }
  };
}
