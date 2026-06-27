import { expect, test } from '@playwright/test'
import { TEST_ARTIST } from '../local-supabase'

// Runs with the admin storageState from admin.setup.js, so it lands straight on
// the admin dashboard. The artist seeded by auth.setup.js gives it data to show.
test('admin dashboard shows aggregate stats and the seeded artist with its items', async ({
  page,
}) => {
  await page.goto('/admin')

  // ProtectedRoute(adminOnly) let us through — our profile has is_admin = true.
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()

  // The three summary stat cards render.
  await expect(page.getByText('Total revenue')).toBeVisible()
  await expect(page.getByText('Items sold')).toBeVisible()
  await expect(page.getByText('Artists')).toBeVisible()

  // The recent-activity panel and the export action are both present.
  await expect(page.getByText('Recent activity')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Export Excel report' }),
  ).toBeVisible()

  // The seeded artist appears as a card; expanding it reveals its seeded items.
  const card = page.locator('.artist-card', {
    hasText: new RegExp(TEST_ARTIST.displayName, 'i'),
  })
  await expect(card).toBeVisible()
  await card.locator('.artist-header').click()
  await expect(card.getByText('Sticker Pack')).toBeVisible()
  await expect(card.getByText('Art Print A4')).toBeVisible()
})

// Guards the regression fixed in ccfaa05 ("redirect admins back from /artist"):
// an admin has no inventory of their own, so ProtectedRoute bounces them off the
// artist dashboard back to /admin.
test('an admin visiting /artist is redirected to /admin', async ({ page }) => {
  await page.goto('/artist')
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible()
})
