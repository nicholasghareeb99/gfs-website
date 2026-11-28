import { test, expect } from '@playwright/test';
import { press } from './actions.mjs';
import { mockSite } from './mocks.mjs';

test('the showroom opens Contents and jumps to a section without loading hidden thumbnails at startup', async ({ page, context }) => {
  await mockSite(context);
  await page.addInitScript(() => localStorage.setItem('gfs-showroom-help-brochure', '1'));
  const pages = new Set();
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/assets/brochure/pages/')) pages.add(path);
  });
  await page.goto('/showroom/#brochure-1', { waitUntil: 'load' });
  const contents = page.getByRole('button', { name: 'Contents', exact: true });
  await expect(contents).toBeVisible();
  const list = page.locator('.toc-body');
  await expect(list.locator('.toc-sec')).toHaveCount(0);
  expect(pages.has('/assets/brochure/pages/p49.webp')).toBe(false);

  await page.locator('#splash').evaluate(element => element.click());
  await press(contents);
  await expect(page.getByRole('dialog', { name: 'Contents' })).toBeVisible();
  const second = list.locator('.toc-top').nth(1);
  const number = await second.getAttribute('data-n');
  expect(Number(number)).toBeGreaterThan(1);
  await press(second);
  await expect(page).toHaveURL(new RegExp(`#brochure-${number}$`));
  await expect(page.getByRole('dialog', { name: 'Contents' })).toBeHidden();
});
