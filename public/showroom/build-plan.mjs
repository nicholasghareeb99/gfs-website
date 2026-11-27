// Our build vs prefab: what 15 years do to a big-box fence and to a GFS fence, as numbers the 3D
// drawing and the tests both use. The big-box fence is drawn from typical store panels and typical
// do-it-yourself installs; how fast any one fence moves varies yard to yard, so these are a typical
// case drawn at true size.
import { lift as frostLift, WINTERS } from './frost-plan.mjs';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const YEARS = 15;
// a store-bought 6 × 8 dog-ear panel: 17 pickets ½ × 5½ in on three 2×3 rails, hung on 4×4 posts
export const PANEL = { pickets: 17, picketWIn: 5.5, picketTIn: .5, picketLIn: 72, gapIn: .125, railTIn: 1.5, railHIn: 2.5, railsIn: [8, 36, 64], botIn: 2, earIn: 1 };
export const SETS = {
  dirt: { id: 'dirt', name: 'In dirt, ~2 ft', depthIn: 24, postBotIn: 24, holeIn: 10, decayFrom: 6 },
  concrete: { id: 'concrete', name: 'In concrete, ~2½ ft', depthIn: 30, postBotIn: 28, holeIn: 10, decayFrom: 8 }
};
export const VINYL_SET = { id: 'vconcrete', name: 'Vinyl post in concrete', depthIn: 30, postBotIn: 24, holeIn: 10 };
export const SLOPE_IN = 8;            // the sloped yard drops 8 in over the 8 ft section (1 in 12)
export const SAG_IN = 1.5;            // a store panel's 2×3 rails, after 15 years
export const WET = [1, .6];           // the two posts sit in clay that heaves a little differently

// Time of year: each year ends with a winter (Nov–Apr in its last 40%).
export function season(y) {
  const w = Math.floor(y), s = y - w;
  return s < .6 || y <= 0 ? { done: w, m: null } : { done: w, m: (s - .6) / .4 * 5 };
}
// How a post set `set` deep has been lifted by frost at year y (true inches), Toledo clay, typical winters.
export function heave(set, y, wet = 1, frost = 36) {
  if (!set || y <= 0) return 0;
  const post = { depthIn: set.depthIn }, { done, m } = season(y), reach = WINTERS[0].reach;
  const L = m == null ? (done ? frostLift(post, 5, done, frost, 'clay', reach).lift : 0) : frostLift(post, m, done + 1, frost, 'clay', reach).lift;
  return L * wet;
}
export const sag = y => SAG_IN * clamp((y - 2) / 12, 0, 1) ** 1.3;
export const decay = (set, y) => set?.decayFrom ? clamp((y - set.decayFrom) / 8, 0, 1) : 0;
export const weather = y => clamp(y / 4, 0, 1);        // bare pressure-treated pine goes silver-gray in a few years
export const yellow = y => clamp(y / 10, 0, 1);        // cheaper vinyl, in full sun
