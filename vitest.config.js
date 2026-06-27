import react from '@vitejs/plugin-react'
import { configDefaults, defineConfig } from 'vitest/config'

// Separate from vite.config.js on purpose: the Cloudflare plugin is build/deploy
// tooling and has no place in the test run.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
    // Playwright E2E specs live in ./e2e and import @playwright/test, which
    // Vitest can't run — keep them out of the unit suite.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
