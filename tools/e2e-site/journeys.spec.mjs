import { test, expect } from '@playwright/test';
import { formatRange } from '../../public/assets/js/ballpark-pricing-rules.mjs';
import { catalogue, mockSite } from './mocks.mjs';
import { localURL } from './server.mjs';
import { press } from './actions.mjs';

const ballpark = '/quote/ballpark/';

async function openPage(page, path, options) {
  await page.goto(path, { waitUntil: 'domcontentloaded', ...options });
  const consent = page.getByRole('button', { name: 'Only necessary' });
  if (await consent.isVisible()) await press(consent);
}
const customer = {
  name: 'Sam Test', firstName: 'Sam', lastName: 'Test', phone: '(419) 555-0142',
  email: 'owner@example.test', address: '1 Sample St, Toledo, OH',
};

async function fillContact(form, combined = false) {
  for (const name of [...(combined ? ['name'] : ['firstName', 'lastName']), 'phone', 'email', 'address']) {
    await form.locator('[name="' + name + '"]').fill(customer[name]);
  }
  await press(form.locator('label').filter({ hasText: 'Call me' }));
}

async function pickBallpark(page, style, height, feet) {
  await press(page.locator('#bp-style-browse'));
  const quick = page.locator('.bp-style-quick');
  if (!(await quick.evaluate(element => element.open))) await press(quick.locator('summary'));
  const select = page.locator('#bp-fence-select');
  await select.selectOption({ label: style });
  await expect(page.locator('#bp-style-dialog')).not.toBeVisible();
  const control = page.locator('#bp-height');
  if (await control.inputValue() !== String(height)) {
    await press(page.locator('#bp-style-variants').getByRole('button', { name: height + ' ft', exact: true }));
  }
  await expect(control).toHaveValue(String(height));
  await page.locator('#bp-linear-feet').fill(String(feet));
}

async function addBothGates(page) {
  for (const kind of ['single', 'double']) {
    const stepper = page.locator('.bp-step-3-grid > div > [data-stepper="' + kind + '"]');
    if (await stepper.locator('output').textContent() === '0') await press(stepper.locator('[data-step="1"]'));
    await expect(stepper.locator('output')).toHaveText('1');
  }
}

async function submitBallpark(page) {
  const form = page.locator('#bp-form');
  await fillContact(form, true);
  await press(form.locator('button[type=submit]'));
}

async function verifyRange(page, world) {
  const current = () => world.prices.filter(row =>
    row.input.parts && row.input.receipt === world.deliveries.at(-1)?.result.id).at(-1);
  await expect.poll(() => current()?.status, { timeout: 30_000 }).toBe(200);
  const { input, output } = current();
  const saved = decodeURIComponent(world.documents.get(input.receipt).fields.meta.stringValue.match(/price_range_shown=([^ |]+)/)?.[1] || '');
  const exact = formatRange(output.low, output.high);
  expect(saved).toBe(exact);
  await expect(page.locator('#bp-price-range')).toHaveText(exact);
  expect(output.low).toBeGreaterThan(0);
  return { input, output, exact };
}

// Every published synthetic fixture, and each exposed height for generic styles.
const byStyle = [...catalogue.map(([name, height]) => [name, height]),
  ...['Ranch Rail', 'Spaced Picket', 'Wood Privacy'].flatMap(name => [4, 5, 6, 8]
    .filter(height => !catalogue.some(row => row[0] === name && row[1] === height)).map(height => [name, height])),
];
for (let start = 0; start < byStyle.length; start += 6) {
  const rows = byStyle.slice(start, start + 6);
  test('Ballpark renders and saves fixture ranges ' + (start + 1) + ' to ' + (start + rows.length), async ({ context }) => {
    test.setTimeout(180_000);
    const world = await mockSite(context);
    for (const [index, [style, height]] of rows.entries()) {
      await test.step(style + ' at ' + height + ' ft', async () => {
        const page = await context.newPage();
        try {
          await openPage(page, ballpark);
          await pickBallpark(page, style, height, 151);
          await addBothGates(page);
          await submitBallpark(page);
          await expect.poll(() => world.deliveries.length).toBe(index + 1);
          const { input } = await verifyRange(page, world);
          expect(input.parts).toEqual([{ style, feet: 151, height, singleGates: 1, doubleGates: 1 }]);
        } finally {
          await page.close();
        }
      });
    }
    expect(world.documents.size).toBe(rows.length);
    expect(world.mails).toHaveLength(0);
    expect(world.unexpected).toEqual([]);
  });
}

test('Ballpark retains a draft across back and refresh, handles invalid lengths and prices 1 ft', async ({ page, context }) => {
  const world = await mockSite(context);
  await openPage(page, ballpark);
  await pickBallpark(page, 'Cedar Privacy 6 ft Dug', 6, 151);
  await openPage(page, '/fences/cedar/');
  await page.goBack();
  const length = page.locator('#bp-linear-feet');
  await expect(length).toHaveValue('151');
  await page.reload();
  await expect(length).toHaveValue('151');
  await expect(page.locator('#bp-summary-style')).toContainText('Cedar Privacy');
  for (const feet of ['0', '10000']) {
    await length.fill(feet);
    await expect(page.locator('#bp-price-range')).not.toHaveText(/\$0\b|NaN/);
    await expect(length).toHaveValue(feet);
    await expect(page.locator('#bp-length-status')).toBeVisible();
  }
  await expect(page.locator('#bp-length-status')).toContainText('2,000');
  await length.fill('');
  await length.pressSequentially('abc');
  await expect(length).toHaveValue('');
  expect(world.deliveries).toHaveLength(0);
  await length.fill('1');
  await submitBallpark(page);
  const { input } = await verifyRange(page, world);
  expect(input.parts[0].feet).toBe(1);
});

test('Ballpark survives delayed pricing, shows retry after a function error, and saves once', async ({ page, context }, info) => {
  test.setTimeout(90_000);
  const world = await mockSite(context, { catalogueDelay: 400, responseDelay: 800 });
  await openPage(page, ballpark, { waitUntil: 'domcontentloaded' });
  await pickBallpark(page, 'Aluminum Pool Fence 4 ft', 4, 151);
  world.priceStatus = 503;
  await submitBallpark(page);
  await expect(page.locator('#bp-price-range')).toHaveText('Working out your range…');
  await expect.poll(() => world.prices.some(row => row.input.parts && row.status === 503), { timeout: 30_000 }).toBe(true);
  const retry = page.getByRole('button', { name: 'Try again', exact: true });
  await expect(retry).toBeVisible();
  await expect(page.locator('#bp-price-range')).toHaveText('We will send your price');
  if (info.project.name === 'iphone') {
    await page.locator('#bp-price-card').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await page.screenshot({ path: info.outputPath('ballpark-retry.png') });
  }
  world.priceStatus = 200;
  await press(retry);
  await verifyRange(page, world);
  expect(world.deliveries).toHaveLength(1);
});

for (const email of ['on', 'off']) {
  test('Ballpark estimate email with automatic delivery ' + email, async ({ page, context }, info) => {
    const world = await mockSite(context, { email });
    await openPage(page, ballpark);
    await pickBallpark(page, 'Aluminum Pool Fence 5 ft', 5, 151);
    await submitBallpark(page);
    const { exact } = await verifyRange(page, world);
    expect(world.mails).toHaveLength(0);
    const address = page.locator('#bp-email-address');
    await expect(address).toHaveValue(customer.email);
    await address.fill('invalid');
    const send = page.getByRole('button', { name: 'Email me this estimate' });
    await press(send);
    await expect(address).toHaveAttribute('aria-invalid', 'true');
    expect(world.deliveries).toHaveLength(1);
    await address.fill(customer.email);
    await press(send);
    const status = page.locator('#bp-email-status');
    await expect(status).toContainText(email === 'on' ? 'We sent your estimate' : 'Your request reached our office');
    expect(world.deliveries).toHaveLength(2);
    expect(world.deliveries[1].data.price_range_shown).toBe(exact);
    expect(world.mails).toHaveLength(email === 'on' ? 1 : 0);
    if (email === 'on') {
      expect(world.mails[0].message).toContain(exact);
      expect(world.mails[0].message).toContain('Aluminum Pool Fence 5 ft');
      expect(Buffer.from(world.mails[0].estimate_pdf, 'base64').subarray(0, 5).toString()).toBe('%PDF-');
    }
    if (info.project.name === 'iphone') {
      await status.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.screenshot({ path: info.outputPath('estimate-email-' + email + '.png') });
    }
  });
}

test('public-price Ballpark saves the visible range and can start a separate project', async ({ page, context }, info) => {
  const world = await mockSite(context, { pricing: 'public' });
  await openPage(page, ballpark);
  await pickBallpark(page, 'Cedar Privacy 6 ft Dug', 6, 151);
  await addBothGates(page);
  await submitBallpark(page);
  const range = '$6,700 – $7,400'; // Fixture uses 152 × $40 plus $300 and $630.
  await expect(page.locator('#bp-price-range')).toHaveText(range);
  expect(world.deliveries[0].data.price_range_shown).toBe(range);
  expect(world.prices).toHaveLength(0);
  const start = page.getByRole('button', { name: 'Start another project' });
  await expect(page.locator('#bp-form')).toBeHidden();
  if (info.project.name === 'desktop') await start.click();
  else await start.tap();
  await expect(page.getByText('You are starting another project.')).toBeVisible();
  await expect(page.locator('#bp-form button[type=submit]')).toBeEnabled();
  expect(world.deliveries).toHaveLength(1);
});

test('draw a corner and a gate on the map and restore it after reload', async ({ page, context, hasTouch }) => {
  test.setTimeout(100_000);
  const world = await mockSite(context);
  await openPage(page, ballpark);
  await press(page.locator('#bp-open-map'));
  await expect(page.locator('#bp-map')).toHaveClass(/leaflet-container/);
  const draw = page.locator('#bp-draw-toolbar [data-mode="fence"]');
  await press(draw);
  const map = page.locator('#bp-map');
  const { width, height } = await map.boundingBox();
  for (const [x, y] of [[.28, .36], [.56, .36], [.56, .58]]) {
    await press(map, { x: Math.round(width * x), y: Math.round(height * y) });
  }
  await press(page.locator('#bp-draw-toolbar [data-mode="finish"]'));
  await press(page.getByText('Add gates', { exact: true }));
  await press(page.locator('#bp-draw-toolbar [data-mode="walk-gate"]'));
  // Finish scrolling before measuring the stroke. A locator click can scroll again before sending the input.
  await map.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const fenceLine = map.locator('.leaflet-overlay-pane path[stroke="#00E5A0"]');
  let gatePoint;
  await expect.poll(async () => {
    const previous = gatePoint;
    gatePoint = await fenceLine.evaluate((line) => {
      const { x, y } = line.getPointAtLength(line.getTotalLength() / 3).matrixTransform(line.getScreenCTM());
      return document.elementFromPoint(x, y) === line ? { x, y } : null;
    });
    return Boolean(gatePoint && previous && Math.hypot(gatePoint.x - previous.x, gatePoint.y - previous.y) < 1);
  }, { message: 'the rendered fence stroke must stay under the gate input point' }).toBe(true);
  if (hasTouch) await page.touchscreen.tap(gatePoint.x, gatePoint.y);
  else await page.mouse.click(gatePoint.x, gatePoint.y);
  const feet = Number(await page.locator('#bp-linear-feet').inputValue());
  expect(feet).toBeGreaterThan(0);
  await expect(page.locator('#bp-single-gates')).toHaveValue('1');
  await page.reload();
  await expect(map).toHaveClass(/leaflet-container/);
  await expect(page.locator('#bp-linear-feet')).toHaveValue(String(feet));
  await expect(page.locator('#bp-single-gates')).toHaveValue('1');
  expect(world.deliveries).toHaveLength(0);
});

for (const kind of ['quote', 'contact', 'booking']) {
  test(kind + ' form validates, submits with a local receipt and shows confirmation', async ({ page, context }) => {
    const world = await mockSite(context);
    const path = { quote: '/quote/form/', contact: '/contact/', booking: '/quote/book/' }[kind];
    await openPage(page, path);
    const form = page.locator('form[data-lead-form]');
    const submit = form.locator('button[type=submit]');
    await press(submit);
    expect(world.deliveries).toHaveLength(0);
    await expect(form.locator('.gfs-field-error:visible').first()).toBeVisible();
    await fillContact(form, kind === 'booking');
    const phone = form.locator('input[name=phone]');
    await phone.fill('419-ABC');
    await phone.blur();
    const inline = form.locator('[name=phone] + .gfs-field-error');
    await expect(inline).toContainText('Enter a valid phone number');
    await expect(phone).toHaveAttribute('aria-invalid', 'true');
    await phone.fill(customer.phone);
    await expect(inline).toBeHidden();
    if (kind === 'booking') {
      const date = new Date();
      date.setDate(date.getDate() + 2);
      if (date.getDay() === 0) date.setDate(date.getDate() + 1);
      const ymd = date.toLocaleDateString('sv-SE');
      await form.locator('[name=date]').fill(ymd);
      await form.locator('[name=time]').selectOption({ index: 1 });
    } else {
      await form.locator('[name=projectType]').selectOption({ index: 1 });
    }
    await form.locator('[name=fenceType]').selectOption('Pool Fence');
    await press(submit);
    await expect(form.locator('.form-success')).toHaveClass(/show/);
    expect(world.deliveries).toHaveLength(1);
    expect(world.deliveries[0].data.email).toBe(customer.email);
    expect(world.documents.size).toBe(1);
    if (kind === 'quote') expect(world.deliveries[0].data.fenceType).toBe('Pool Fence');
    expect(world.mails).toHaveLength(0);
  });
}

test('a form failure leaves a retry and a single saved request for the same receipt', async ({ page, context }) => {
  const world = await mockSite(context);
  await openPage(page, '/quote/form/');
  const form = page.locator('form[data-lead-form]');
  await fillContact(form);
  await form.locator('[name=projectType]').selectOption({ index: 1 });
  world.intakeStatus = 503;
  const submit = form.locator('button[type=submit]');
  await press(submit);
  await expect(form.locator('.form-error')).toContainText('Please retry');
  await expect(submit).toBeEnabled();
  expect(world.documents.size).toBe(0);
  world.intakeStatus = 200;
  await press(submit);
  await expect(form.locator('.form-success')).toHaveClass(/show/);
  expect(world.intakeAttempts).toHaveLength(2);
  expect(world.intakeAttempts[0]).toBe(world.intakeAttempts[1]);
  expect(world.documents.size).toBe(1);
});

async function inspectHandoff(page, link) {
  await link.evaluate(element => element.addEventListener('click', event => {
    event.preventDefault();
    document.body.dataset.e2eHandoff = element.href;
  }, { once: true }));
  await press(link);
  return page.locator('body').getAttribute('data-e2e-handoff');
}

test('careers, click-to-call, click-to-text and financing reach the intended handoffs', async ({ page, context }) => {
  const world = await mockSite(context);
  await openPage(page, '/careers/');
  await expect(page.getByRole('heading', { name: 'What kind of work?' })).toBeVisible();
  const officeEmail = page.locator('footer [href^="mailto:"]');
  expect(await inspectHandoff(page, officeEmail)).toBe('mailto:nick@ghareebfence.com');
  const call = page.locator('footer [href^="tel:"]');
  expect((await inspectHandoff(page, call)).replace(/\D/g, '')).toBe('14192142107');
  await openPage(page, '/contact/');
  const sms = page.locator('main [href^="sms:"]').first();
  expect((await inspectHandoff(page, sms)).replace(/\D/g, '')).toBe('14192142107');
  await openPage(page, '/financing/');
  const lender = page.locator('main a[href^="https://hil.slice.fnbo.com/"]').first();
  expect(await inspectHandoff(page, lender)).toMatch(/^https:\/\/hil\.slice\.fnbo\.com\/application\//);
  expect(world.deliveries).toHaveLength(0);
});

test('gallery filters and opens a photo, and public 3D links reach the viewer', async ({ page, context }) => {
  await mockSite(context);
  await openPage(page, '/gallery/');
  await press(page.locator('[data-gfilter="aluminum"]'));
  const photo = page.locator('.gallery-item[data-type="aluminum"] a:visible').first();
  await expect(photo.locator('img')).toBeVisible();
  await expect(page.locator('.gallery-item[data-type="wood"]:visible')).toHaveCount(0);
  const imageURL = await photo.evaluate(link => link.href);
  const image = await page.request.get(localURL(new URL(imageURL)));
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toMatch(/^image\//);
  await press(photo);
  await openPage(page, '/fence-studio/');
  await expect(page.locator('h1').first()).toBeVisible();
  await openPage(page, '/fence3d.html?website=1');
  await expect(page).toHaveURL(/\/x3d\/fence3d\.html\?website=1/);
  await expect(page.locator('canvas').first()).toBeVisible();
});
