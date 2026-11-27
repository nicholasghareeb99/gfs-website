// Fence Lab math: checked against hand calculations from ASCE 7-16 and the USDA Wood Handbook.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.matchMedia ||= () => ({ matches: false });
const { windLoad, shrink, lifeEstimate, digNumbers } = await import('../public/showroom/lab.mjs');
const solid = { eps: () => 1, bay: 8 }, chain = { eps: () => .15, bay: 10 };
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('wind: 6 ft solid privacy, 90 mph, suburban yard', () => {
  const r = windLoad({ V: 90, h: 6, exposure: 'B', style: solid });
  near(r.q, 0.00256 * 0.57 * 0.85 * 8100, 1e-9);           // 10.05 psf
  near(r.p, r.q * 0.85 * 1.3, 1e-9);
  near(r.perPost, 533, 1);                                   // lb on one 8 ft section
  near(r.moment, r.perPost * 0.55 * 6, 1e-9);
});
test('wind: open fabric gets the ASCE 7 reduction 1 - (1 - e)^1.5', () => {
  const r = windLoad({ V: 90, h: 6, exposure: 'B', style: chain });
  near(r.red, 1 - Math.pow(0.85, 1.5), 1e-12);
  assert.ok(r.perFt < windLoad({ V: 90, h: 6, exposure: 'B', style: solid }).perFt / 4);
});
test('wind: open field (Exposure C) pushes 0.85/0.57 times harder', () => {
  const b = windLoad({ V: 70, h: 6, exposure: 'B', style: solid }), c = windLoad({ V: 70, h: 6, exposure: 'C', style: solid });
  near(c.p / b.p, 0.85 / 0.57, 1e-9);
});
test('wood: a 5.5 in treated pine picket drying from soaked to 12% opens about a quarter inch', () => {
  near(shrink({ T: 7.4, R: 4.8 }, 5.5, 30, 12), 0.244, 0.001);
  near(shrink({ T: 7.4, R: 4.8 }, 5.5, 45, 12), 0.244, 0.001); // water above fiber saturation does not count
  assert.ok(shrink({ T: 5.0, R: 2.4 }, 5.5, 18, 12) < 0.06);
});
test('lifespan never leaves the published range', () => {
  const m = { id: 'wrc', wood: true, range: [15, 30] };
  for (const on of [new Set(), new Set(['seal', 'steel', 'clear']), new Set(['sprink', 'damp', 'trim'])]) {
    const { years } = lifeEstimate(m, on); assert.ok(years >= 15 && years <= 30, String(years));
  }
});
test('vinyl: a 5 in post at .150 wall is about 10% stiffer than at .135', async () => {
  const { tube } = await import('../public/showroom/lab.mjs');
  const a = tube(5, .150), b = tube(5, .135);
  near(a.A, 25 - 4.7 * 4.7, 1e-9);
  near(a.I / b.I, 1.101, 0.001);
});

test('no-dig: dirt and concrete from a dug 150 ft fence (10 in × 36 in holes, posts every 8 ft)', () => {
  const n = digNumbers(150);
  assert.equal(n.posts, 20);                                   // ceil(150/8) + 1
  near(n.hole, Math.PI * (5 / 12) ** 2 * 3, 1e-9);             // 1.636 cu ft a hole
  near(n.dirtFt3, 32.72, 0.01);                               // in the ground
  near(n.looseYd3, 32.72 * 1.3 / 27, 0.01);                   // 1.58 cu yd once dug
  near(n.lb, 32.72 * 110, 2);                                 // about 3,600 lb
  assert.equal(n.bags, 47);                                   // (1.636 − 0.227) × 20 / 0.6 → 46.97 → 47 bags (the 4×4 stands 32 in down)
  assert.equal(n.concLb, 47 * 80);
});

test('no-dig vs dug: the 3D install day runs in order, and no-dig is built before the dug concrete has cured', async () => {
  const { DUG, ND, DUR } = await import('../public/showroom/dig-plan.mjs');
  const flat = o => Object.values(o).flatMap(v => Array.isArray(v[0]) ? v : [v]);
  for (const w of [...flat(DUG), ...flat(ND)]) assert.ok(w[0] < w[1] && w[0] >= 0 && w[1] <= 1, `window ${w}`);
  const steps = o => ['dig', 'drive', 'exit', 'lower', 'pour', 'box', 'cure', 'rails', 'pickets', 'clean'].filter(k => o[k]).flatMap(k => Array.isArray(o[k][0]) ? o[k] : [o[k]]);
  for (const o of [DUG, ND]) { const s = steps(o).sort((a, b) => a[0] - b[0]); for (let i = 1; i < s.length; i++) assert.ok(s[i][0] >= s[i - 1][1] - 1e-9 || s[i - 1] === o.lower?.[0], `steps overlap: ${s[i - 1]} / ${s[i]}`); }
  assert.ok(ND.pickets[1] < DUG.cure[1], 'the no-dig fence is done while the dug posts still wait on concrete');
  assert.ok(DUG.rails[0] >= DUG.cure[1], 'no rails on dug posts until the concrete has had its 48 hours');
  assert.ok(DUR >= 15000 && DUR <= 40000);
});
test('Fence Lab 3D uses the Executive App engine byte for byte (vendor/exec/SOURCE.json)', async () => {
  const fs = await import('node:fs'), crypto = await import('node:crypto');
  const dir = new URL('../public/showroom/vendor/exec/', import.meta.url), src = JSON.parse(fs.readFileSync(new URL('SOURCE.json', dir)));
  assert.match(src.commit, /^[0-9a-f]{40}$/);
  assert.ok(src.files['fence-engine.mjs'] && src.files['real-surfaces.mjs']);
  for (const [name, sha] of Object.entries(src.files)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(name, dir))).digest('hex'), sha, name + ' was edited; run scripts/showroom/sync-exec-engine.mjs instead');
  const engine = fs.readFileSync(new URL('fence-engine.mjs', dir), 'utf8');
  assert.ok(engine.includes('sp.noDig&&sp.wood&&sp.woodSupport!=="driven-box"'), 'the King Plus no-dig box build is in the engine');
});
test('frost: driven steel past the frost line never lifts; footings at or above it do, and creep up each winter', async () => {
  const F = await import('../public/showroom/frost-plan.mjs');
  const [shallow, frostline, steel] = F.POSTS, typical = F.WINTERS[0].reach, hard = F.WINTERS[1].reach;
  for (const pl of F.PLACES) for (const soil of ['clay', 'sand']) for (const reach of [typical, hard]) for (let m = 0; m <= 5; m += .25) for (const w of [1, 5, 10])
    assert.equal(F.lift(steel, m, w, pl.frost, soil, reach).lift, 0, `steel moved: ${pl.id} ${soil} m${m} w${w}`);
  // Toledo, clay, a typical winter: the 24 in footing lifts, the 36 in one holds
  assert.ok(F.lift(shallow, 3, 1, 36, 'clay', typical).lift > 1);
  assert.ok(F.lift(frostline, 3, 1, 36, 'clay', typical).lift < .05);
  // a hard winter reaches the frost line, so a footing that stops right at it can lift too
  assert.ok(F.lift(frostline, 3, 1, 36, 'clay', hard).lift > 1);
  // Michigan's 42 in frost line: 36 in of concrete is above it, so it lifts even in a typical winter
  assert.ok(F.lift(frostline, 3, 1, 42, 'clay', typical).lift > .25);
  // sand heaves about a fifth as much
  near(F.lift(shallow, 3, 1, 36, 'sand', hard).lift, F.lift(shallow, 3, 1, 36, 'clay', hard).lift * .2, 1e-9);
  // each spring leaves some behind, and the next winter starts from there
  const one = F.lift(shallow, 5, 1, 36, 'clay', hard).lift, two = F.lift(shallow, 0, 2, 36, 'clay', hard).lift;
  assert.ok(one > 0); near(one, two, 1e-9); near(F.lift(shallow, 5, 10, 36, 'clay', hard).lift, one * 10, 1e-9);
  // no jumps from month to month, and the gap under a footing is never negative
  for (let m = 0; m < 5; m += .01) { const a = F.lift(frostline, m, 3, 36, 'clay', hard), b = F.lift(frostline, m + .01, 3, 36, 'clay', hard); assert.ok(Math.abs(a.lift - b.lift) < .1 && a.gap >= 0); }
});

test('gate sag: the numbers behind the Gate sag tool', async () => {
  const G = await import('../public/showroom/gate-plan.mjs');
  const run = (w, brace, post, y) => G.sag(G.gateGeom(w, brace), { brace, post, y });
  // Eurocode 5 slip modulus for a .131 in nail in southern pine (ρm 570 kg/m³): about 1,190 N/mm
  near(G.kSer(.131) / 5.7101, 570 ** 1.5 * 3.3274 ** .8 / 30, 1e-9);
  // a 3 in Schedule 40 gate post (2⅞ in OD, .203 wall) is about 2½ times stiffer than a 4×4
  const ratio = G.POSTS.steel.EI / G.POSTS.wood.EI; assert.ok(ratio > 2.3 && ratio < 2.7, ratio);
  // NDS: four toe-nailed .131 nails, 1½ in into wood that dried after it was built, permanent load: about 37 lb
  assert.ok(Math.abs(G.braceHoldLb() - 36.5) < .5, G.braceHoldLb());
  for (const w of [3, 4, 5, 6]) for (const brace of ['none', 'wrong', 'right', 'steel']) for (const post of ['wood', 'steel']) {
    const z = run(w, brace, post, 0);
    // everything is the change since the gate was hung
    for (const k of ['drop', 'frame', 'lean', 'offset', 'liftH', 'liftL']) assert.ok(Math.abs(z[k]) < 1e-9, `${w} ${brace} ${post} day one ${k}=${z[k]}`);
    let prev = -1;
    for (let y = 0; y <= 15; y += .25) { const r = run(w, brace, post, y); assert.ok(r.drop >= prev - 1e-9, 'sag never undoes itself'); prev = r.drop; assert.ok(r.clear > 0, 'never drags'); }
    // the wrong-way brace asks more of its nails than the NDS gives them, for every width here
    assert.ok(z.braceLb > G.braceHoldLb());
  }
  // a welded frame on a driven steel post doesn't move
  for (const w of [3, 6]) assert.ok(run(w, 'steel', 'steel', 15).offset < 1e-3);
  // a right-way wood brace still settles by the opened-up pockets (about 5/16 in), then holds
  const right = run(6, 'right', 'steel', 15); assert.ok(Math.abs(right.drop - G.pocketGrowIn(G.gateGeom(6), 15)) < .02, right.drop);
  // on the same post at 15 years: steel frame < right-way brace < no brace < wrong-way brace (it let go)
  const d = b => run(6, b, 'steel', 15).drop;
  assert.ok(d('steel') < d('right') && d('right') < d('none') && d('none') < d('wrong'), [d('steel'), d('right'), d('none'), d('wrong')].join());
  // wider gates pull harder on the top hinge: about width squared
  const pull = w => run(w, 'right', 'steel', 0).pullLb; assert.ok(pull(6) / pull(4) > 1.8 && pull(6) / pull(4) < 2.4);
  // 4×4s in concrete: the latch post heaves more than the hinge post, so the latch ends up further off than the gate dropped
  const wd = run(4, 'right', 'wood', 15); assert.ok(wd.liftL > wd.liftH && wd.offset > wd.drop);
  // the gate as measured off the 3D model (77 lb for a 4 ft gate with a brace)
  assert.ok(Math.abs(G.gateGeom(4, 'right').weightLb - 77) < 2);
});

test('vinyl bend: the beam numbers behind Vinyl walls', async () => {
  const P = await import('../public/showroom/vinyl-plan.mjs');
  const K = P.KINGSTON;
  // the push is split between the rails so it centres at 0.55 of the 6 ft height
  for (const lb of [26, 221, 533]) {
    const L = P.railLoads(lb, K.hIn, K.botY, K.topY);
    near(L[0].lb + L[1].lb, lb, 1e-9); near((L[0].lb * L[0].y + L[1].lb * L[1].y) / lb, .55 * K.hIn, 1e-9);
  }
  // vinyl alone matches the textbook cantilever: a load P at height a bends the top P·a²(3L − a)/(6EI)
  const loads = P.railLoads(533, K.hIn, K.botY, K.topY), EI = P.PVC.E * P.tube(P.BOX_IN, .135).I;
  const exact = loads.reduce((s, { y, lb }) => s + lb * y * y * (3 * K.postTop - y) / (6 * EI), 0);
  const r = P.bends(533);
  assert.ok(Math.abs(r.big.top / exact - 1) < .001, `${r.big.top} vs ${exact}`);
  // what the Lab shows at 90 mph: big-box about 9.3 in, GFS about 1.8 in; the steel carries about 4/5 at the ground
  near(r.big.top, 9.3, .05); near(r.gfs.top, 1.85, .05);
  assert.ok(r.gfs.steelShare > .78 && r.gfs.steelShare < .84, r.gfs.steelShare);
  // the slider stops at 90 mph, where the big-box vinyl is still under its yield stress and the steel well under 35 ksi
  assert.ok(r.big.vinylPsi < P.PVC.yieldPsi, r.big.vinylPsi); assert.ok(r.gfs.steelPsi < 35000, r.gfs.steelPsi);
  // the GFS post bends less at every height
  for (let y = 6; y <= K.postTop; y += 6) assert.ok(r.gfs.at(y) < r.big.at(y), `at ${y} in`);
});

test('wind flow: the average flow behind the Wind tool\'s picture', async () => {
  const W = await import('../public/showroom/wind-plan.mjs');
  // Idelchik's perforated-plate loss at 50% open is about 4.0 dynamic heads; actuator-disc momentum lets 1/(1 + ζ/4) through
  const b = W.bleed(.5); near(b.zeta, (1 + .707 * Math.sqrt(.5) - .5) ** 2 / .25, 1e-12); near(b.through, 1 / (1 + b.zeta / 4), 1e-12);
  assert.equal(W.bleed(1).through, 0);
  for (const eps of [1, .91, .74, .24, .19]) for (const exposure of ['B', 'C']) {
    const F = W.flowField({ eps, hFt: 6, exposure });
    // no air is made or lost: the same flow passes every station
    const q0 = F.psi(-4, 4.99);
    for (const x of [-2, 0, .5, 3, 8, 15, 25]) assert.ok(Math.abs(F.psi(x, 4.99) / q0 - 1) < .005, `eps ${eps} ${exposure} at x=${x}: ${F.psi(x, 4.99)} vs ${q0}`);
    // under 30% open the air near the ground behind the fence runs back toward it; above that it doesn't
    const back = F.vel(3, .1)[0];
    if (1 - eps < W.CRITICAL_OPEN - .05) assert.ok(back < 0, `eps ${eps}: u = ${back}`); else if (1 - eps > W.CRITICAL_OPEN) assert.ok(back > 0, `eps ${eps}: u = ${back}`);
    // far downstream the wind comes back
    assert.ok(F.vel(25, .5)[0] > .6 * F.U0(.5), `eps ${eps} recovers`);
    // smoke lines start upwind, and the open ones reach past the fence
    const L = W.streamlines(F);
    assert.equal(L.filter(l => l.kind === 'open').length, 14);
    for (const l of L.filter(l => l.kind === 'open')) assert.ok(l.pts.at(-1)[0] > 13.9, 'open line reaches the end');
    if (eps === 1) assert.ok(L.some(l => l.kind === 'swirl'), 'a solid fence shows the swirl');
  }
  // Perera's far wake: 10 fence heights behind a 50% open fence the slowest air is about 25% down
  const F = W.flowField({ eps: .5, hFt: 6 });
  let worst = 1; for (let z = .05; z < 2; z += .01) worst = Math.min(worst, F.vel(10, z)[0] / F.U0(z));
  assert.ok(worst > .65 && worst < .85, worst);
});

test('wood movement: what the 3D boards are scaled by', async () => {
  globalThis.matchMedia ??= () => ({ matches: false, addEventListener() {} });
  const L = await import('../public/showroom/lab.mjs');
  // treated pine from soaked (30%+) to 12%: 7.4% × 18/30 = 4.44% of the width, about ¼ in on a 5½ in board
  const pine = { T: 7.4, R: 4.8 };
  near(L.shrink(pine, 5.5, 40, 12) / 5.5, .074 * 18 / 30, 1e-12);
  // board-on-board laps about 1½ in or more, so even that shrink leaves over an inch covered
  assert.ok(1.5 - L.shrink(pine, 5.5, 40, 12) > 1.2);
  // built dry and wetted, a board swells (negative shrink)
  assert.ok(L.shrink(pine, 5.5, 8, 30) < 0);
});
