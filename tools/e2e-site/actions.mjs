import { expect } from '@playwright/test';

export async function press(control, position) {
  const page = control.page();
  if (page.context().browser().browserType().name() !== 'webkit') {
    return control.click({ position });
  }
  await expect(control).toBeVisible();
  await expect(control).toBeEnabled();
  let point;
  await expect.poll(async () => {
    point = await control.evaluate(async (element, offset) => {
      const hitPoint = () => {
        const rect = element.getBoundingClientRect();
        const x = rect.left + (offset?.x ?? rect.width / 2);
        const y = rect.top + (offset?.y ?? rect.height / 2);
        return element.contains(document.elementFromPoint(x, y)) ? { x, y } : null;
      };
      const first = hitPoint();
      if (!first) {
        element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
        return null;
      }
      // A smooth scroll may move a control between hit-testing and the actual tap.
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const next = hitPoint();
      return next && Math.abs(next.x - first.x) < 1 && Math.abs(next.y - first.y) < 1 ? next : null;
    }, position);
    return Boolean(point);
  }, { message: 'the touch point must hit the intended control' }).toBe(true);
  await page.touchscreen.tap(point.x, point.y);
}
