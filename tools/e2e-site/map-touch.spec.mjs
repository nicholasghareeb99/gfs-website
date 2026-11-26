import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mockSite } from './mocks.mjs';
import { press } from './actions.mjs';

// The live site draws on Google Maps, which the test servers cannot reach.
// google-maps-stub.js stands in for just enough of the Maps API to run the
// tool's Google drawing code: taps, the centre Add corner, closing a loop,
// and the Edit lines handles (drag a corner, add a bend, delete, move a line).
const stub = readFileSync(new URL('./google-maps-stub.js', import.meta.url), 'utf8');
const handles = page => page.evaluate(() => window.__gstubMarkers().reduce((count, m) => {
  const kind = /^Corner/.test(m.el.title) ? 'corner' : /bend/.test(m.el.title) ? 'bend' : /whole line/.test(m.el.title) ? 'move' : 'other';
  count[kind] = (count[kind] || 0) + 1; return count;
}, {}));
const feet = async page => Number((await page.locator('#bp-measure-total').textContent()).match(/([\d.]+) ft/)[1]);

test('Google map: tap corners, close a loop, edit with finger-sized handles, add a corner at the sight', async ({ page, context }) => {
  test.skip(test.info().project.name === 'desktop', 'touch layout');
  test.setTimeout(90_000);
  await mockSite(context);
  await context.addInitScript(stub);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/quote/ballpark/', { waitUntil: 'load' });
  const consent = page.getByRole('button', { name: 'Only necessary' });
  if (await consent.isVisible()) await consent.click();
  await page.locator('#bp-open-map').click();
  await expect.poll(() => page.evaluate(() => Boolean(window.__gmap))).toBe(true);
  if (!/bp-map-full/.test(await page.locator('#bp-map-tools').getAttribute('class') || '')) await page.locator('#bp-map-fullscreen').click();
  await expect(page.locator('#bp-map-tools')).toHaveClass(/bp-map-full/);
  await page.evaluate(() => { window.__gmap.setCenter({ lat: 41.6528, lng: -83.5379 }); window.__gmap.setZoom(20); });
  const map = page.locator('#bp-map'), box = await map.boundingBox();
  const tap = (x, y) => page.evaluate(([x, y]) => {
    const rect = document.getElementById('bp-map').getBoundingClientRect();
    document.getElementById('bp-map').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: rect.left + x, clientY: rect.top + y }));
  }, [x, y]);

  await page.locator('#bp-draw-toolbar [data-mode="fence"]').click();
  await expect(page.locator('#bp-sight')).toBeVisible();
  await expect(page.locator('#bp-add-center')).toBeVisible();
  for (const [x, y] of [[.2, .2], [.8, .2], [.8, .6], [.2, .6]]) await tap(box.width * x, box.height * y);
  await tap(box.width * .2 + 6, box.height * .2 + 5); // near the first corner closes the loop
  await expect(page.locator('#bp-draw-toolbar [data-mode="idle"]')).toHaveAttribute('aria-pressed', 'true');
  const loop = await feet(page);
  expect(loop).toBeGreaterThan(0);

  await page.locator('#bp-draw-toolbar [data-mode="edit"]').click();
  expect(await handles(page)).toEqual({ corner: 4, bend: 4, move: 1 });
  await page.evaluate(([w, h]) => window.__gstubDrag(window.__gstubMarkers().find(m => m.el.title.startsWith('Corner 2')), w * .92, h * .1), [box.width, box.height]);
  expect(await feet(page)).toBeGreaterThan(loop);
  await page.locator('#bp-draw-toolbar [data-mode="undo"]').click();
  expect(await feet(page)).toBe(loop);

  await page.evaluate(() => window.__gstubMarkers().find(m => /bend/.test(m.el.title)).el.click());
  expect(await handles(page)).toEqual({ corner: 5, bend: 5, move: 1 });
  await expect(page.locator('#bp-draw-toolbar [data-mode="delete-point"]')).toBeVisible();
  await page.locator('#bp-draw-toolbar [data-mode="delete-point"]').click();
  expect(await handles(page)).toEqual({ corner: 4, bend: 4, move: 1 });
  expect(await feet(page)).toBe(loop);

  const corner = () => page.evaluate(() => window.__gstubMarkers().find(m => m.el.title.startsWith('Corner 1')).getPosition().toJSON());
  const start = await corner();
  await page.evaluate(() => { const m = window.__gstubMarkers().find(m => /whole line/.test(m.el.title)), p = m.map.toPx(m.getPosition()); window.__gstubDrag(m, p.x + 40, p.y + 30); });
  expect(await corner()).not.toEqual(start);
  expect(await feet(page)).toBe(loop);

  await page.locator('#bp-draw-toolbar [data-mode="fence"]').click();
  await page.locator('#bp-add-center').click();
  await page.evaluate(() => window.__gmap.panBy(80, 0));
  await page.locator('#bp-add-center').click();
  expect(await feet(page)).toBeGreaterThan(loop);
  // Use this layout while a line is still open finishes it rather than sitting disabled.
  await expect(page.locator('#bp-drawing-next')).toBeEnabled();
  await page.locator('#bp-drawing-next').click();
  await expect(page.locator('#bp-style-dialog')).toBeVisible();
  expect(Number(await page.locator('#bp-linear-feet').inputValue())).toBeGreaterThan(loop);
  expect(errors).toEqual([]);
});

test('Leaflet map: the same close-a-loop and Edit lines handles', async ({ page, context }) => {
  test.skip(test.info().project.name === 'desktop', 'touch layout');
  test.setTimeout(90_000);
  await mockSite(context);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/quote/ballpark/', { waitUntil: 'load' });
  const consent = page.getByRole('button', { name: 'Only necessary' });
  if (await consent.isVisible()) await consent.click();
  await page.locator('#bp-open-map').click();
  await expect(page.locator('#bp-map')).toHaveClass(/leaflet-container/);
  if (!/bp-map-full/.test(await page.locator('#bp-map-tools').getAttribute('class') || '')) await page.locator('#bp-map-fullscreen').click();
  const map = page.locator('#bp-map'), box = await map.boundingBox();
  await page.locator('#bp-draw-toolbar [data-mode="fence"]').click();
  for (const [x, y] of [[.25, .25], [.75, .25], [.75, .6], [.25, .6], [.25, .25]]) await press(map, { x: Math.round(box.width * x), y: Math.round(box.height * y) });
  await expect(page.locator('#bp-draw-toolbar [data-mode="idle"]')).toHaveAttribute('aria-pressed', 'true');
  const loop = await feet(page);
  await page.locator('#bp-draw-toolbar [data-mode="edit"]').click();
  const count = () => page.evaluate(() => [...document.querySelectorAll('.bp-edit-handle')].reduce((c, el) => {
    const t = el.getAttribute('title') || ''; const k = /^Corner/.test(t) ? 'corner' : /bend/.test(t) ? 'bend' : 'move'; c[k] = (c[k] || 0) + 1; return c; }, {}));
  expect(await count()).toEqual({ corner: 4, bend: 4, move: 1 });
  const corner2 = page.locator('.bp-edit-handle[title^="Corner 2"]');
  const c = await corner2.boundingBox();
  await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2); await page.mouse.down();
  await page.mouse.move(c.x + 60, c.y - 40, { steps: 6 }); await page.mouse.up();
  expect(await feet(page)).toBeGreaterThan(loop);
  await page.locator('#bp-draw-toolbar [data-mode="undo"]').click();
  expect(await feet(page)).toBe(loop);
  await press(page.locator('.bp-edit-handle[title*="bend"]').first());
  expect(await count()).toEqual({ corner: 5, bend: 5, move: 1 });
  await page.locator('#bp-draw-toolbar [data-mode="delete-point"]').click();
  expect(await count()).toEqual({ corner: 4, bend: 4, move: 1 });
  expect(await feet(page)).toBe(loop);
  expect(errors).toEqual([]);
});
