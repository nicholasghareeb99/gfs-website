// Gate sag: how far the latch end of a wood gate drops over the years, worked out from the gate's
// own weight with ordinary engineering numbers. Kept apart from the 3D drawing so it can be tested.
//
// What it counts, each from its own source:
//  • the frame racking (turning into a parallelogram) as its nails slip: Eurocode 5 slip modulus for
//    nails (EN 1995-1-1, Table 7.1) and creep for wood kept outdoors (k_def = 2 for service class 3,
//    doubled for nailed wood-to-wood joints, 2.3.2.2). Nails in wood that was wet when it was built
//    and dries afterward hold about 70% as well (the NDS wet-service factor for nails loaded sideways);
//    that loosening is counted as the wood dries;
//  • a brace: in compression it bears wood on wood and barely moves; in tension it hangs on nails
//    pulled lengthwise. The NDS (National Design Specification for Wood Construction) gives smooth
//    nails a quarter of their hold in wood that dries out after it's built, and two-thirds again when
//    toe-nailed; when a gate asks more of them than that, this treats the brace as letting go over the
//    first three years. As treated pine dries, its rails shrink across the grain (USDA Wood Handbook, loblolly pine,
//    the same numbers as the Wood movement tool), so the pockets a wood brace is cut to fit open up
//    a little, and the gate drops that much before the brace bears again;
//  • the hinge post bending under the pull of the top hinge (beam formulas; wood also creeps);
//  • frost lifting posts set in concrete, from the Frost & posts model (Toledo clay, typical winters).
// An installer hangs the gate and sets the latch with the gate's weight already on it, so everything
// is reported as the change since the day it was hung.
// Left out because there is nothing solid to put a number on: people swinging on the gate, slams,
// loose hinge screws, rot, and a footing rocking in soft soil. Each of those only adds to the sag,
// so these numbers are the least a gate will move, not the most.
import { heave } from './build-plan.mjs';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const YEARS = 15;
// Southern pine (loblolly): specific gravity 0.51 (Wood Handbook Table 5-3a), so about 36 lb per
// cu ft at 12% moisture; shrinkage across the grain 7.4% green to oven-dry, fibre saturation 30%.
export const PINE = { lbPerFt3: .51 * 62.4 * 1.12, T: 7.4, fsp: 30, wet: 30, dry: 12, E: 1.4e6, rhoKgM3: 570 };
export const STEEL = { E: 29e6, lbPerFt3: 490 };
export const K_DEF = 2;                     // EN 1995-1-1 Table 3.2, solid timber, service class 3
export const K_DEF_JOINT = 2 * K_DEF;       // 2.3.2.2(3): doubled for joints between wood members
export const LOOSEN = .7;                   // NDS wet-service factor, nails loaded sideways, built wet
// Eurocode 5 slip modulus for a nail in wood without a pilot hole, N/mm → lb/in
export const kSer = dIn => PINE.rhoKgM3 ** 1.5 * (dIn * 25.4) ** .8 / 30 * 5.7101;
// 1¾ in coil nails (.092 in) two to a picket at each rail, set in about a quarter of the picket's width from
// each edge as the app draws them; 3 in framing nails (.131 in) where the frame meets
export const NAILS = { picket: { dIn: .092, perJoint: 2, spread: .54 }, frame: { dIn: .131, perJoint: 2, spreadIn: 2, penIn: 1.5 }, braceEnd: 4 };
// NDS withdrawal design value per nail: 1380·G^2.5·D per inch driven (G = 0.55 for southern pine),
// toe-nailed ×⅔, wet-then-dry ×¼, permanent load ×0.9
export const NDS = { G: .55, toe: 2 / 3, wetDry: .25, permanent: .9 };
export const braceHoldLb = () => { const f = NAILS.frame; return NAILS.braceEnd * 1380 * NDS.G ** 2.5 * f.dIn * f.penIn * NDS.toe * NDS.wetDry * NDS.permanent; };
// posts: a 4×4 (3½ in square) and GFS's 3 in gate post, a 2⅞ in steel pipe (Schedule 40 wall, .203 in)
export const POSTS = {
  wood: { id: 'wood', name: '4×4 wood post in concrete', EI: PINE.E * 3.5 ** 4 / 12, creep: true, set: { depthIn: 30, postBotIn: 24, holeIn: 10 } },
  steel: { id: 'steel', name: 'GFS 3 in steel post, driven 4 ft', EI: STEEL.E * Math.PI / 64 * (2.875 ** 4 - 2.469 ** 4), creep: false, set: null }
};
export const BRACES = [['none', 'No brace'], ['wrong', 'Brace the wrong way'], ['right', 'Brace the right way'], ['steel', 'GFS steel frame']];
// GFS's welded frame is 1½ in square steel tube (brochure p. 23); the wall is taken as 16 gauge (.065 in)
export const TUBE = { sizeIn: 1.5, wallIn: .065 };
export const tubeArea = (b = TUBE.sizeIn, t = TUBE.wallIn) => b * b - (b - 2 * t) ** 2;
// frost: the hinge post and the latch post heave a little differently (wetter clay at one)
export const WET = { hinge: .6, latch: 1 };
// The latch (Nationwide standard post latch, sizes from the maker's drawing): the striker rod on the
// gate is 0.71 in round, and it comes into the receiver on the post over a lip that sits about 0.6 in
// below the middle of the hook. So the rod can be about ¼ in low and still go straight in. Lower than
// that the round rod strikes the lip and has to ride up over it, which it can do until its centre is
// level with the lip, 0.6 in low. Past that it hits the lip square, and the gate won't latch.
// The drawing doesn't dimension the lip; 0.6 in is scaled off it and is good to about 1/16 in.
export const LATCH = { rodIn: .71, lipIn: .6, cleanIn: .6 - .71 / 2, maxIn: .6 };

// creep with time: grows with the log of time and reaches k_def at 50 years
export const creep = (y, k = K_DEF) => 1 + k * Math.log(1 + Math.max(0, y)) / Math.log(51);
// share of the drying that has happened y years after building (treated pine dries out in a season)
export const dried = y => 1 - Math.exp(-3 * Math.max(0, y));

// how far the inner faces of the rails have pulled apart, summed over the pockets a brace sits in
export function pocketGrowIn(g, y) {
  const s = PINE.T / 100 * (Math.min(PINE.wet, PINE.fsp) - PINE.dry) / PINE.fsp;
  return (g.rails.length - 1) * g.railHIn * s * dried(y);
}

// g: the gate, measured off the 3D model (inches, x from the hinge pin toward the latch)
//   { weightLb, cgXIn, latchXIn, rails: [y…], railHIn, pickets: [widthIn…], hingeYs: [y…],
//     brace: { x0, y0, x1, y1 } (the brace line, or where it would go), braceLenIn, bottomIn }
// opts: { brace: 'none'|'wrong'|'right'|'steel', post: 'wood'|'steel', y: years }
function raw(g, { brace, post, y }) {
  const P = POSTS[post], W = g.weightLb, M = W * g.cgXIn, Lr = g.latchXIn, c = creep(y), cj = creep(y, K_DEF_JOINT) / (1 - (1 - LOOSEN) * dried(y));
  // nail joints where pickets cross rails, and where the stiles meet the rails
  const kp = w => kSer(NAILS.picket.dIn) * NAILS.picket.perJoint * (NAILS.picket.spread * w / 2) ** 2;
  const joints = g.pickets.reduce((s, w) => s + g.rails.length * kp(w), 0)
    + 2 * 2 * (g.rails.length - 1) * kSer(NAILS.frame.dIn) * NAILS.frame.perJoint * (NAILS.frame.spreadIn / 2) ** 2;
  const b = g.brace, Lx = Math.abs(b.x1 - b.x0), Hb = Math.abs(b.y1 - b.y0), D = Math.hypot(Lx, Hb), sin = Hb / D;
  const tension = M / (Lx * sin);           // what a brace has to carry
  let frame = 0, gap = 0, lets = 0;
  if (brace === 'steel') {
    // welded: the diagonal tube takes it end to end, with no slip and no creep
    frame = M / (STEEL.E * tubeArea() / D * (Lx * sin) ** 2) * Lr;
  } else {
    const ends = 2 * (g.rails.length - 1);   // the brace is cut to fit between rails, in pieces
    let kb = 0;
    if (brace === 'wrong') { lets = tension > braceHoldLb() ? clamp(y / 3, 0, 1) : 0; kb = kSer(NAILS.frame.dIn) * NAILS.braceEnd / ends * (1 - lets); }
    if (brace === 'right') {
      // bearing: end grain of the brace pushing on the face of a rail (across its grain, E/20), in
      // series with the brace's own length
      const A = 1.5 * 3.5 / Math.max(.2, sin), kBear = PINE.E / 20 * A / (g.railHIn / 2);
      kb = 1 / (g.braceLenIn / (PINE.E * 1.5 * 3.5) + ends / kBear);
    }
    const kJ = joints / cj, kB = kb * (Lx * sin) ** 2 / (brace === 'wrong' ? cj : c);
    if (brace === 'right') {
      // the frame racks on its nails until the opened-up pockets close, then the brace takes the rest
      gap = pocketGrowIn(g, y);
      const free = M / kJ * Lr;
      frame = free <= gap ? free : gap + (M - kJ * gap / Lr) / (kJ + kB) * Lr;
    } else frame = M / (kJ + kB) * Lr;
  }
  // the hinge post bends: a pull F toward the gate at the top hinge, a push F at the bottom one
  const y1 = Math.max(...g.hingeYs), y2 = Math.min(...g.hingeYs), F = M / (y1 - y2), EI = P.EI / (P.creep ? c : 1);
  const u1 = F * y1 ** 3 / (3 * EI) - F * y2 * y2 * (3 * y1 - y2) / (6 * EI);
  const u2 = F * y2 * y2 * (3 * y1 - y2) / (6 * EI) - F * y2 ** 3 / (3 * EI);
  return { F, frame, gap, lets, tension, u1, u2, tilt: (u1 - u2) / (y1 - y2), y1, y2 };
}
export function sag(g, o) {
  const P = POSTS[o.post], a = raw(g, o), z = raw(g, { ...o, y: 0 }), Lr = g.latchXIn;
  const frame = a.frame - z.frame, tilt = a.tilt - z.tilt, lean = tilt * Lr, drop = frame + lean;
  const liftH = P.set ? heave(P.set, o.y, WET.hinge) : 0, liftL = P.set ? heave(P.set, o.y, WET.latch) : 0;
  return {
    weightLb: g.weightLb, pullLb: a.F, braceLb: a.tension, braceHoldLb: braceHoldLb(), lets: a.lets, gap: a.gap,
    frame, lean, drop, liftH, liftL,
    postTopIn: a.u1 - z.u1,                       // how much further the top hinge has pulled the post over
    offset: drop + liftL - liftH,                 // how far the latch now sits below where it was set
    clear: g.bottomIn + liftH - drop,             // gap left under the latch corner
    rack: frame / Lr, tilt,                       // radians: the frame's shear, and the whole gate turning
    post: { u1: a.u1 - z.u1, u2: a.u2 - z.u2, y1: a.y1, y2: a.y2 }
  };
}

// The app's 6 ft no-dig gate measured into the shape sag() takes, without building it in 3D (used
// where 3D isn't available, and by the tests): a leaf 2 in narrower than the opening, rails at 7.8,
// 36 and 66¾ in, 5½ in pickets from 2½ to 74½ in, a hinge at the bottom and top rails, a brace cut between rails.
export function gateGeom(wFt, brace = 'right') {
  const leaf = wFt * 12 - 2, run = leaf - 1.2, n = Math.ceil(run / 5.61 - .05), pickets = Array.from({ length: n }, (_, i) => i < n - 1 ? 5.45 : clamp(run - (n - 1) * 5.61, 1, 5.45));
  const steel = brace === 'steel', rails = [7.8, 36, 66.75];
  const line = steel ? { x0: 2, y0: 7.8, x1: leaf - 1, y1: 66.75 } : brace === 'wrong' ? { x0: leaf - 3, y0: 9.55, x1: 4, y1: 65 } : { x0: 4, y0: 9.55, x1: leaf - 3, y1: 65 };
  const len = Math.hypot(line.x1 - line.x0, line.y1 - line.y0);
  let woodIn3 = pickets.reduce((s, w) => s + w * 72 * .62, 0) + (steel ? 0 : 3 * leaf * 5.25 + 2 * 5.25 * 51.95 + (brace === 'none' ? 0 : 5.25 * (len - 6)));
  const lb = woodIn3 * PINE.lbPerFt3 / 1728 + 4 + (steel ? tubeArea() * (2 * leaf + 2 * 57.45 + len) / 1728 * STEEL.lbPerFt3 : 0);
  return { weightLb: lb, cgXIn: leaf / 2 + .5, latchXIn: leaf + .5, rails, railHIn: 3.5, pickets, hingeYs: [7.75, 66.75], brace: line, braceLenIn: len, bottomIn: 2.5 };
}
