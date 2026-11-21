import { expect } from '@playwright/test';

export async function press(control, position) {
  const page = control.page();
  if (page.context().browser().browserType().name() !== 'webkit') {
    return control.click({ position });
  }
  await expect(control).toBeVisible();
  await expect(control).toBeEnabled();
  let point;
  let previous;
  await expect.poll(async () => {
    point = await control.evaluate((element, offset) => {
      const rect = element.getBoundingClientRect();
      const x = rect.left + (offset?.x ?? rect.width / 2);
      const y = rect.top + (offset?.y ?? rect.height / 2);
      if (element.contains(document.elementFromPoint(x, y))) return { x, y };
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      return null;
    }, position);
    // Take a second sample after a smooth scroll can move the control.
    const stable = point && previous && Math.abs(point.x - previous.x) < 1 && Math.abs(point.y - previous.y) < 1;
    previous = point;
    return Boolean(stable);
  }, { intervals: [65, 100, 200, 400], message: 'the touch point must hit the intended control and stay still' }).toBe(true);
  await page.touchscreen.tap(point.x, point.y);
}
