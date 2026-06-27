import { defineConfig, devices } from '@playwright/test'

// E2E tests live in ./e2e and run against the Vite dev server in *test* mode
// (vite --mode test loads .env.test -> local Supabase + dummy Turnstile). Kept
// fully separate from the Vitest unit suite (src/**) — see vitest.config.js.
//
// Projects:
//   setup       — seeds the test artist and saves a signed-in storageState
//   logged-out  — pages that must run unauthenticated (the login UI)
//   logged-in   — pages behind auth; reuse the storageState from `setup`
//
// Prerequisite: the local stack must be running first — `supabase start`.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // List output to the console; an HTML report is written but never auto-opens
  // (auto-open would block a non-interactive run). View it with:
  //   npx playwright show-report
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testMatch: '**/auth.setup.js',
      use: { ...devices['Pixel 5'] },
    },
    {
      // Alley is phone-first, so every project emulates a mobile device.
      name: 'logged-out',
      testMatch: '**/logged-out/**/*.spec.js',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'logged-in',
      testMatch: '**/logged-in/**/*.spec.js',
      use: { ...devices['Pixel 5'], storageState: 'e2e/.auth/artist.json' },
      dependencies: ['setup'],
    },
  ],
  // Boot `vite --mode test` for the run and reuse it locally if already up.
  webServer: {
    command: 'npm run dev:test',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
