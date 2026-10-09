import { defineConfig, devices } from '@playwright/test';
import { loadEnv } from 'vite';

// The journeys call Auth directly with the same public values the build uses (.env.local or CI env).
for (const [key, value] of Object.entries(loadEnv('production', process.cwd(), 'VITE_'))) {
  process.env[key] ??= value;
}

const port = 8788;
// Cloud sandboxes ship a preinstalled Chromium; CI installs the matching one with `playwright install`.
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
      },
    },
  ],
  // Serve the production build through Wrangler so SPA fallback and _headers behave as deployed.
  webServer: {
    command: `pnpm build && pnpm exec wrangler dev --port ${port} --log-level warn`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
