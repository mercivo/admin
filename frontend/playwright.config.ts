import { defineConfig, devices } from '@playwright/test';

const adminBaseUrl = process.env.ADMIN_BASE_URL || process.env.FRONTEND_BASE_URL || 'http://localhost:8088';

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR || 'test-results',
  fullyParallel: false,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: process.env.PLAYWRIGHT_HTML_DIR || 'playwright-report', open: 'never' }],
    ['junit', { outputFile: process.env.PLAYWRIGHT_JUNIT_FILE || 'test-results/results.xml' }],
  ],
  use: {
    baseURL: adminBaseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
