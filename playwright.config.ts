import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests drive the built page in a real browser, which is the only
 * place the parts that are not domain logic actually meet: the state container,
 * the storage, the pointer and keyboard handling, and the printing.
 *
 * The port is taken from the environment because this machine runs several dev
 * servers at once; `npm run e2e` picks a free one.
 */
const port = Number(process.env.E2E_PORT ?? 4300);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list']],
  timeout: 30_000,
  expect: { timeout: 7_000 },

  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    /* Set MORAVIEW_CHROME to reuse a Chrome already on the machine instead of
       running `npx playwright install chromium`. */
    ...(process.env.MORAVIEW_CHROME ? { launchOptions: { executablePath: process.env.MORAVIEW_CHROME } } : {}),
    ...devices['Desktop Chrome']
  },

  projects: [
    { name: 'desktop', grepInvert: /@phone/, use: { viewport: { width: 1280, height: 1000 } } },
    /* Only the layout tests run here: everything else is the same code, checked
       on the desktop layout with less scrolling. */
    { name: 'phone', grep: /@phone/, use: { ...devices['Pixel 7'], viewport: { width: 400, height: 800 } } }
  ],

  webServer: {
    command: `npm run dev -- --port ${port} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000
  }
});
