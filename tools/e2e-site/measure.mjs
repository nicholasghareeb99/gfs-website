import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { mockSite } from './mocks.mjs';
import { BASE, startServer } from './server.mjs';

const targets = [
  { path: '/', lcpLimit: 3500, clsLimit: 0.1, jsLimit: 110 * 1024 },
  { path: '/quote/ballpark/', lcpLimit: 4000, clsLimit: 0.1, jsLimit: 175 * 1024 },
];

async function measure(browser, path) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 2, serviceWorkers: 'block', reducedMotion: 'reduce',
  });
  try {
    await mockSite(context);
    await context.addInitScript(() => {
      window.siteMetrics = { lcp: 0, cls: 0 };
      let start = 0, previous = 0, windowScore = 0;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.siteMetrics.lcp = entry.startTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          if (entry.startTime - previous >= 1000 || entry.startTime - start >= 5000) {
            start = entry.startTime;
            windowScore = 0;
          }
          previous = entry.startTime;
          windowScore += entry.value;
          window.siteMetrics.cls = Math.max(window.siteMetrics.cls, windowScore);
        }
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: 1_600_000 / 8,
      uploadThroughput: 750_000 / 8, connectionType: 'cellular4g',
    });
    await page.goto(BASE + path, { waitUntil: 'load' });
    await page.waitForFunction(() => window.siteMetrics.lcp > 0 && Boolean(window.GFS_DB));
    // Capture shifts and late scripts after the page's scheduled first-paint work.
    await page.waitForTimeout(2000);
    return await page.evaluate(() => {
      const scripts = performance.getEntriesByType('resource').filter(entry =>
        new URL(entry.name).origin === location.origin && /\.(?:m?js)(?:\?|$)/.test(entry.name));
      return {
        lcpMs: Math.round(window.siteMetrics.lcp),
        cls: Math.round(window.siteMetrics.cls * 10000) / 10000,
        scriptTransferBytes: scripts.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
        scriptDecodedBytes: scripts.reduce((sum, entry) => sum + entry.decodedBodySize, 0),
        scriptRequests: scripts.length,
      };
    });
  } finally {
    await context.close();
  }
}

const server = await startServer();
let browser;
try {
  browser = await chromium.launch();
  const output = [];
  for (const { path, lcpLimit, clsLimit, jsLimit } of targets) {
    const runs = [];
    for (let pass = 0; pass < 3; pass++) runs.push(await measure(browser, path));
    const median = key => runs.map(run => run[key]).sort((a, b) => a - b)[1];
    const row = {
      path, lcpMs: median('lcpMs'), cls: median('cls'), scriptTransferBytes: median('scriptTransferBytes'),
      scriptDecodedBytes: median('scriptDecodedBytes'), scriptRequests: median('scriptRequests'),
    };
    const pass = row.lcpMs <= lcpLimit && row.cls <= clsLimit && row.scriptTransferBytes <= jsLimit;
    output.push({ ...row, pass, budget: { lcpLimit, clsLimit, jsLimit }, runs });
  }
  console.table(output.map(({ runs, budget, ...row }) => row));
  const path = new URL('./results/', import.meta.url);
  await mkdir(path, { recursive: true });
  await writeFile(new URL('performance.json', path), JSON.stringify(output, null, 2) + '\n');
  if (output.some(row => !row.pass)) process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
