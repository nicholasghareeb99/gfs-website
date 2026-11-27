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
  assert.equal(n.bags, 47);                                   // (1.636 − 0.255) × 20 / 0.6 → 46.03 → 47 bags
  assert.equal(n.concLb, 47 * 80);
});
