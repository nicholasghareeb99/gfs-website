import { defineConfig, devices } from '@playwright/test';
import { BASE } from './server.mjs';

const mobile = (name, device, width, height) => ({
  name, use: { ...devices[device], viewport: { width, height }, screen: { width, height } },
});

export default defineConfig({
  testDir: '.',
  testMatch: '*.spec.mjs',
  timeout: 60_000,
  expect: { timeout: 12_000 },
  workers: process.env.CI ? 2 : 3,
  outputDir: 'results',
  reporter: [['list']],
  use: {
    baseURL: BASE, serviceWorkers: 'block', reducedMotion: 'reduce',
    actionTimeout: 10_000, screenshot: 'only-on-failure', trace: 'retain-on-failure',
  },
  webServer: { command: 'node server.mjs', url: BASE, timeout: 30_000 },
  projects: [
    mobile('iphone', 'iPhone 13', 390, 844),
    mobile('ipad', 'iPad Pro 11', 834, 1194),
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 960 } } },
  ],
});
