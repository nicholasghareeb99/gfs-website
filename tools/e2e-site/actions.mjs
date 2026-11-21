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
    point = await control.evaluate((element, offset) => {
      const rect = element.getBoundingClientRect();
      const x = rect.left + (offset?.x ?? rect.width / 2);
      const y = rect.top + (offset?.y ?? rect.height / 2);
      if (element.contains(document.elementFromPoint(x, y))) return { x, y };
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      return null;
    }, position);
    return Boolean(point);
  }, { message: 'the touch point must hit the intended control' }).toBe(true);
  await page.touchscreen.tap(point.x, point.y);
}
