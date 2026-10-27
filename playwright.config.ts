import { defineConfig, devices } from '@playwright/test';

// Mobile first (docs/10 § 1): 390 main, 375 iPhone SE, 360 Android, 430 large; then desktop 1440.
const BASE = process.env.BASE_URL ?? 'http://localhost:4321';

export default defineConfig({
  testDir: './tests',
  outputDir: '../qa/test-results',
  timeout: 60_000,
  use: { baseURL: BASE, locale: 'ru-RU' },
  projects: [
    { name: 'shots', testMatch: /shots\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'e2e', testMatch: /e2e\/.*\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'trace', testMatch: /trace\.spec\.ts/, use: { ...devices['Pixel 7'] } },
  ],
});
