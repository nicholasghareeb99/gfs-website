// Frost & posts: what a hard winter does to posts set three ways. Kept apart from the 3D drawing so
// the numbers can be tested on their own.
//
// The rule every building code uses: a footing has to reach below the frost line, because frozen
// soil grips whatever is in it (adfreeze) and wet clay grows seams of ice (ice lenses) that lift the
// ground. A footing whose bottom sits in or near the frozen layer rides up with it; at the thaw the
// ground settles but loose soil falls into the gap underneath, so the footing never quite comes back
// down, and the lift adds up winter after winter. A post that reaches well past the frost line is
// held by soil that never freezes.
//
// The frost line is how deep the ground freezes in the hardest winters; a typical winter freezes it
// about two-thirds of the way down. How much a post moves depends on how wet the clay is, how cold
// the winter gets and how deep the frost goes, so the lift here is illustrative (about 1¼ in in a hard winter for a footing fully in
// frozen clay, a third of it left behind each spring), and it is drawn 4 times bigger to be seen.
export const PLACES = [
  { id: 'oh', name: 'Toledo · Lucas County', frost: 36, src: 'City of Toledo and Lucas County design frost depth' },
  { id: 'mi', name: 'Michigan', frost: 42, src: 'Michigan footings 42 in below grade (Mich. Admin. Code R 408.30522)' }
];
export const MONTHS = ['Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
// [thawed from the top, frozen down to], as shares of the frost line, through a hard winter
export const FROZEN = [[0, 0], [0, .35], [0, .75], [0, 1], [.45, .8], [0, 0]];
export const SNOW = [0, .45, .9, .85, .25, 0];
export const POSTS = [
  { id: 'shallow', name: 'Typical', sub: '24 in of concrete', depthIn: 24, holeIn: 10, flareIn: 13, flareDepthIn: 8, postBotIn: 22 },
  { id: 'frost', name: 'To the frost line', sub: '36 in of concrete', depthIn: 36, holeIn: 10, postBotIn: 32 },
  { id: 'steel', name: 'GFS driven steel', sub: '48 in, no concrete', depthIn: 48, pipe: true }
];
export const LIFT_IN = 1.25, KEEP = .35, DRAWN = 4, ANCHOR_IN = 4;
export const WINTERS = [{ id: 'typical', name: 'Typical winter', reach: .67 }, { id: 'hard', name: 'Hard winter', reach: 1 }];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
// frozen layer at month m (0 = Nov … 5 = Apr, fractions between), inches below grade
export function frozenAt(m, frost) {
  const i = clamp(Math.floor(m), 0, 5), j = Math.min(5, i + 1), t = clamp(m - i, 0, 1), a = FROZEN[i], b = FROZEN[j];
  return { thawed: lerp(a[0], b[0], t) * frost, depth: lerp(a[1], b[1], t) * frost };
}
// how hard the frozen layer grips a footing, 0–1: nothing until the frost comes within a foot of its
// bottom, everything once it reaches it; a post anchored past the frost line is held
export const anchored = (post, frost) => post.depthIn >= frost + ANCHOR_IN;
export function grip(frozenIn, post, frost) {
  if (anchored(post, frost)) return 0;
  return clamp((frozenIn - (post.depthIn - 12)) / 12, 0, 1);
}
// how far a post has been lifted (true inches) at month m of winter number `winter` (1 = first), in
// winters that freeze the ground `reach` of the way to the frost line
export function lift(post, m, winter, frost, soil, reach = 1) {
  const deep = frost * reach, heave = soil === 'sand' ? .2 : 1, peak = LIFT_IN * heave * grip(deep, post, frost), keep = KEEP * peak;
  const base = keep * (winter - 1);
  if (m <= 3) { const cur = LIFT_IN * heave * grip(frozenAt(m, deep).depth, post, frost); return { lift: base + cur, base, gap: cur, peak }; }
  // spring: the footing settles back toward what the slumped soil under it lets it
  const t = clamp((m - 3) / 2, 0, 1), cur = lerp(peak, keep, t < .5 ? t * 2 * .6 : .6 + (t - .5) * 2 * .4), fill = keep * t;
  return { lift: base + cur, base: base + fill, gap: Math.max(0, cur - fill), peak };
}
