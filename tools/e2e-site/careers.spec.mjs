import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {test, expect} from '@playwright/test';
import {BASE} from './server.mjs';
import {intakeRecord} from '../../netlify/functions/submission-created.mjs';

for (const [role, label, unit] of [['installer', 'Fence installer', 'hourly'], ['crew', 'Subcontractor crew', 'foot'],
  ['sales', 'Salesperson', 'commission'], ['other', 'General / other', 'hourly']]) {
  test('Careers application for ' + label, async ({page, context, browserName}, info) => {
    const posts = [];
    const redirects = [];
    await context.route('**/*', async route => {
      const request = route.request();
      const url = new URL(request.url());
      if (url.origin !== BASE) {
        redirects.push(url.origin);
        return route.abort();
      }
      if (request.method() === 'POST') {
        if (url.pathname !== '/_netlify-forms.html' || url.search) return route.abort();
        const fields = Object.fromEntries(new URLSearchParams(request.postData()));
        assert.equal(Object.hasOwn(fields, 'application'), false);
        posts.push(intakeRecord({...fields, ip: '192.0.2.44', user_agent: 'Synthetic Agent', referrer: null}));
        if (role === 'installer' && posts.length === 1) return route.fulfill({status: 503});
        // Playwright's WebKit interception cannot fulfill a 3xx response.
        if (role === 'installer' && browserName === 'chromium') return route.fulfill({status: 303, headers: {location: '/careers/'}});
        return route.fulfill({status: 200, body: 'Fixture receipt'});
      }
      return route.continue();
    });
    const control = name => page.locator('[name="' + name + '"]');
    const fill = (name, value) => control(name).fill(value);
    const choose = (name, value) => page.locator('[name="' + name + '"][value="' + value + '"]').check();
    const go = () => page.getByRole('button', {name: 'Next', exact: false}).click();
    const back = () => page.getByRole('button', {name: 'Back', exact: true}).click();
    const shotDir = process.env.GFS_CAREERS_SHOTS;
    await page.goto('/careers/');
    await expect(page.getByRole('heading', {name: 'What kind of work?'})).toBeVisible();
    await expect(page.locator('progress')).toHaveAttribute('value', '1');
    await expect(page.getByRole('button', {name: 'Back', exact: true})).toBeDisabled();
    const next = page.getByRole('button', {name: 'Next', exact: true});
    await expect(next.locator('[aria-hidden="true"]')).toHaveText('→');
    await go();
    await expect(page.getByRole('alert')).toContainText('Choose');
    await choose('roles', role);
    if (shotDir && role === 'installer' && ['iphone', 'desktop'].includes(info.project.name)) {
      await mkdir(shotDir, {recursive: true});
      await page.locator('h1').click();
      await page.screenshot({path: join(shotDir, info.project.name + '.png'), scale: 'css'});
    }
    await go();
    await fill('name', 'Test Applicant');
    await fill('phone', '(419) 555-0182');
    await fill('email', 'applicant@example.test');
    await page.reload();
    await expect(control('name')).toHaveValue('Test Applicant');
    await back();
    await expect(page.getByRole('checkbox', {name: new RegExp(label)})).toBeChecked();
    await go();
    await go();
    await fill('street', '1 Main St');
    await fill('city', 'Toledo');
    await control('state').selectOption('OH');
    await fill('zip', '43612');
    await go();
    await choose('reachWay', 'Text');
    await choose('reachTime', 'Afternoon');
    await go();
    await choose('transportation', 'yes');
    await choose('license', 'yes');
    await go();
    await fill('fenceYears', '3');
    await choose('fenceTypes', 'Wood');
    await go();
    await choose('skills', 'Carpentry');
    await fill('tools', 'Hand tools');
    await go();
    if (role === 'installer') {
      await page.getByRole('button', {name: 'Add a job'}).click();
      await fill('employment-0-company', 'Test Employer');
      await fill('employment-0-role', 'Installer');
      const start = control('employment-0-start');
      await expect(start).toHaveAttribute('placeholder', 'YYYY-MM');
      await go();
      await expect(page.getByRole('alert')).toContainText('YYYY-MM');
      await expect(start).toBeFocused();
      await fill('employment-0-start', '2020-01');
      await fill('employment-0-duties', 'Layout');
      await choose('employment-0-mayContact', 'no');
    }
    await go();
    if (role === 'crew') {
      await fill('crewSize', '3');
      await fill('business', 'Test Crew');
      await choose('liability', 'yes');
      await choose('workersComp', 'yes');
      await go();
    }
    if (role === 'sales') {
      await fill('salesYears', '4');
      await choose('onSiteQuote', 'yes');
      await go();
    }
    await control('pay-' + role + '-unit').selectOption(unit);
    const amount = control('pay-' + role + '-amount');
    await go();
    await expect(amount).toBeFocused();
    await expect(amount).toHaveAttribute('aria-invalid', 'true');
    await fill('pay-' + role + '-amount', '32');
    await fill('hours', '40');
    await go();
    await choose('days', 'Saturday');
    await fill('startDate', '2026-12-07');
    await choose('travel', 'yes');
    await go();
    await choose('authorized', 'yes');
    await choose('adult', 'yes');
    await go();
    await fill('heardFrom', 'Friend');
    await choose('consent', 'yes');
    await go();
    await expect(page.getByRole('heading', {name: 'Check your answers'})).toBeVisible();
    assert.equal(posts.length, 0);
    await page.getByText('Contact and roles', {exact: true}).click();
    await page.getByRole('button', {name: 'Edit contact details'}).click();
    await expect(control('phone')).toHaveValue('(419) 555-0182');
    await page.getByRole('button', {name: 'Back to review'}).click();
    await page.getByRole('button', {name: 'Send application'}).click();
    if (role === 'installer') {
      await expect(page.getByRole('alert')).toContainText('answers are still here');
      await page.reload();
      await page.getByRole('button', {name: 'Send application'}).click();
    }
    await expect(page.getByRole('heading', {name: 'We got your application.'})).toBeVisible();
    const receipt = page.locator('.receipt span');
    await expect(receipt).toHaveText(posts[0].id);
    assert.equal(posts.length, role === 'installer' ? 2 : 1);
    assert.equal(posts.at(-1).id, posts[0].id);
    const details = JSON.parse(posts[0].record.meta);
    assert.deepEqual(details.roles, [role]);
    assert.equal(details.pay[role].unit, unit);
    assert.equal(Object.hasOwn(details, 'crewSize'), role === 'crew');
    assert.equal(Object.hasOwn(details, 'salesYears'), role === 'sales');
    assert.deepEqual(redirects, []);
    await page.reload();
    await expect(receipt).toHaveText(posts[0].id);
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('gfs-careers-draft-v1')));
    assert.deepEqual(saved, {submitted: posts[0].id});
  });
}

test('the public menu and footer link to Careers', async ({page, context}) => {
  await context.route('**/*', route => new URL(route.request().url()).origin === BASE ? route.continue() : route.abort());
  await page.goto('/');
  await expect(page.locator('.nav-links a[href="/careers/"]')).toHaveCount(1);
  await expect(page.locator('#mobileDrawer a[href="/careers/"]')).toHaveCount(1);
  await expect(page.locator('footer a[href="/careers/"]').last()).toHaveAttribute('href', '/careers/');
});

test('Next stays above a keyboard that shrinks the visual viewport', async ({page}, info) => {
  test.skip(info.project.name !== 'iphone', 'phone layout');
  await page.addInitScript(() => {
    const viewport = Object.assign(new EventTarget(), {height: innerHeight, offsetTop: 0, scale: 1});
    Object.defineProperty(window, 'visualViewport', {value: viewport});
  });
  await page.goto('/careers/');
  await page.getByRole('checkbox', {name: /Fence installer/}).check();
  const next = page.getByRole('button', {name: 'Next', exact: true});
  await next.click();
  await page.getByRole('textbox', {name: 'Email address'}).focus();
  const bottom = await page.evaluate(() => {
    Object.assign(visualViewport, {height: 350, offsetTop: 64});
    visualViewport.dispatchEvent(new Event('resize'));
    return visualViewport.height + visualViewport.offsetTop;
  });
  await expect.poll(async () => {
    const rect = await next.boundingBox();
    return rect.y + rect.height;
  }).toBeLessThanOrEqual(bottom);
  await next.click();
  await expect(page.getByRole('textbox', {name: 'Full name'})).toBeFocused();
});
