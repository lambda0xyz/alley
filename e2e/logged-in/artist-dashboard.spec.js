import { expect, test } from '@playwright/test'
import { TEST_ARTIST } from '../local-supabase'

// Runs with the signed-in storageState from auth.setup.js, so it lands straight
// on the artist dashboard without touching the login UI.
test('artist dashboard shows the seeded inventory', async ({ page }) => {
  await page.goto('/artist')

  // We're authenticated, so ProtectedRoute does NOT bounce us to /login.
  await expect(page).toHaveURL(/\/artist$/)
  await expect(
    page.getByText(new RegExp(TEST_ARTIST.displayName, 'i')),
  ).toBeVisible()

  // A seeded item and its primary sell button render.
  await expect(page.getByText('Sticker Pack')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Sell 1' }).first(),
  ).toBeVisible()
})
