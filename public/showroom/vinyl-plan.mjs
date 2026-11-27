// Vinyl walls: how far a 5 in vinyl post bends in a gust, worked out with beam formulas.
//
// The wind on one 8 ft section of a 6 ft solid fence (ASCE 7, from the Wind tool) reaches each post
// through its bottom and top rails; the split between them puts the push's centre at 0.55 of the
// height, as ASCE 7 does for walls. Each post is a cantilever held at the ground:
//  • big-box: a 5 in vinyl post with a .135 in wall, standing alone in a concrete footing;
//  • GFS: a Homeland 5 in post with a .150 in wall, sleeved over GFS's 2⅜ in steel post (Schedule 40)
//    driven 4 ft, with 4 ft of steel above the ground. Up to the top of the steel the two bend
//    together (steel adapters tie them); above it the vinyl carries on by itself.
// Rigid PVC: modulus about 2,700 MPa (392,000 psi) in bending, about 50 MPa (7,250 psi) at yield in
// tension (typical rigid PVC data). The footing and the ground are taken as not moving, for both.
export const PVC = { E: 2700 / .0068948, yieldPsi: 50 / .0068948 };
export const STEEL = { E: 29e6, od: 2.375, wall: .154, upIn: 48 };
export const tube = (b, t) => { const i = b - 2 * t; return { A: b * b - i * i, I: (b ** 4 - i ** 4) / 12 }; };
export const pipeI = (od, t) => Math.PI / 64 * (od ** 4 - (od - 2 * t) ** 4);
export const POSTS = {
  big: { id: 'big', name: 'Big-box vinyl', wall: .135, steel: false },
  gfs: { id: 'gfs', name: 'GFS: Homeland over steel', wall: .150, steel: true }
};
export const BOX_IN = 5;

// loads: [{ y (in), lb }]; topIn: height of the post. Returns the bend (in, away from the wind) at
// every half inch, and what the vinyl and steel feel at the ground.
export function bend(post, loads, topIn) {
  const v = tube(BOX_IN, post.wall), EIv = PVC.E * v.I, EIs = post.steel ? STEEL.E * pipeI(STEEL.od, STEEL.wall) : 0;
  const EI = y => EIv + (post.steel && y < STEEL.upIn ? EIs : 0);
  const dy = .5, n = Math.ceil(topIn / dy) + 1;
  const M = y => loads.reduce((s, L) => s + (L.y > y ? L.lb * (L.y - y) : 0), 0);
  // integrate curvature M/EI up from the ground (slope 0, bend 0 at the ground)
  const d = new Float64Array(n); let slope = 0;
  for (let i = 1; i < n; i++) { const y0 = (i - 1) * dy, y1 = i * dy, k0 = M(y0) / EI(y0), k1 = M(y1) / EI(Math.max(y0, y1 - 1e-6)); const s1 = slope + (k0 + k1) / 2 * dy; d[i] = d[i - 1] + (slope + s1) / 2 * dy; slope = s1; }
  const M0 = M(0), share = post.steel ? EIs / (EIs + EIv) : 0;
  // the last half-inch step can pass the top, so read the top off the curve rather than the last step
  const at = y => { const f = Math.max(0, Math.min(n - 1, y / dy)), i = Math.floor(f), t = f - i; return i >= n - 1 ? d[n - 1] : d[i] * (1 - t) + d[i + 1] * t; };
  return {
    at, top: at(topIn), M0, I: v.I, A: v.A,
    vinylPsi: M0 * (1 - share) * (BOX_IN / 2) / v.I,      // bending stress in the vinyl wall at the ground
    steelPsi: post.steel ? M0 * share * (STEEL.od / 2) / pipeI(STEEL.od, STEEL.wall) : 0,
    steelShare: share
  };
}
// the section's push split between the bottom and top rails so its centre sits at 0.55 h
export function railLoads(perPost, hIn, botY, topY) {
  const c = .55 * hIn, top = perPost * (c - botY) / (topY - botY);
  return [{ y: botY, lb: perPost - top }, { y: topY, lb: top }];
}
// The app's Kingston 6 ft section, measured in 3D: rail centres 5½ in and 68½ in up, post top
// (with its cap) 78 in up. The 3D scene measures its own model; this is for the drawing without 3D.
export const KINGSTON = { hIn: 72, botY: 5.5, topY: 68.5, postTop: 78.1 };
export function bends(perPost, g = KINGSTON) {
  const loads = railLoads(perPost, g.hIn, g.botY, g.topY);
  return { big: bend(POSTS.big, loads, g.postTop), gfs: bend(POSTS.gfs, loads, g.postTop) };
}
