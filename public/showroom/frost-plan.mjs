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
// The frost line a building code gives is how deep the ground freezes in the hardest winters, with
// some margin. Most winters freeze the ground about half that deep (frost-tube records around the
// lower Great Lakes run 15 to 20 in in ordinary winters against a 36 to 42 in code depth).
// How far the ground lifts: water grows about 9% as it freezes, which by itself comes to about half an
// inch of lift for each foot of wet soil that freezes. That is the least; seams of ice (ice lenses)
// add to it, sometimes a lot (North Dakota Geological Survey, "Frost Heave", 2011). The same source
// notes that a lifted post, unlike a lifted road, mostly stays lifted, and it adds up over winters.
// So the lift here is half an inch per frozen foot, a third of it left behind each spring. It is a
// picture of how the thing works, not a measurement of any one yard, and it is drawn 4 times bigger
// to be seen.
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
export const LIFT_PER_FT = .5, KEEP = .35, DRAWN = 4, ANCHOR_IN = 4;
export const WINTERS = [{ id: 'typical', name: 'Typical winter', reach: .5 }, { id: 'hard', name: 'Hard winter', reach: 1 }];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
// frozen layer at month m (0 = Nov … 5 = Apr, fractions between), inches below grade
export function frozenAt(m, frost) {
  const i = clamp(Math.floor(m), 0, 5), j = Math.min(5, i + 1), t = clamp(m - i, 0, 1), a = FROZEN[i], b = FROZEN[j];
  return { thawed: lerp(a[0], b[0], t) * frost, depth: lerp(a[1], b[1], t) * frost };
}
// How much of the ground's lift a footing takes, 0–1. Frozen soil grips the part of the footing it
// surrounds and pulls it up; unfrozen soil below holds on to the rest. The footing gives way by the
// share of its length the frozen grip has over the unfrozen hold: nothing while less than half of it
// is frozen, all of it once it is frozen to the bottom. A post that runs well past the frost line is
// held (the rule every building code uses for footings).
export const anchored = (post, frost) => post.depthIn >= frost + ANCHOR_IN;
export function grip(frozenIn, post, frost) {
  if (anchored(post, frost)) return 0;
  const f = clamp(frozenIn, 0, post.depthIn);
  return clamp((2 * f - post.depthIn) / post.depthIn, 0, 1);
}
// the ground's own lift once it has frozen this deep (inches)
export const groundLift = (frozenIn, soil) => LIFT_PER_FT * frozenIn / 12 * (soil === 'sand' ? .2 : 1);
// how far a post has been lifted (true inches) at month m of winter number `winter` (1 = first), in
// winters that freeze the ground `reach` of the way to the frost line
export function lift(post, m, winter, frost, soil, reach = 1) {
  const deep = frost * reach, at = d => groundLift(d, soil) * grip(d, post, frost), peak = at(deep), keep = KEEP * peak;
  const base = keep * (winter - 1);
  if (m <= 3) { const cur = at(frozenAt(m, deep).depth); return { lift: base + cur, base, gap: cur, peak }; }
  // spring: the footing settles back toward what the slumped soil under it lets it
  const t = clamp((m - 3) / 2, 0, 1), cur = lerp(peak, keep, t < .5 ? t * 2 * .6 : .6 + (t - .5) * 2 * .4), fill = keep * t;
  return { lift: base + cur, base: base + fill, gap: Math.max(0, cur - fill), peak };
}
