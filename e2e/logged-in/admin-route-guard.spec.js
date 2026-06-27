import { expect, test } from '@playwright/test'

// Runs with the artist storageState. ProtectedRoute(adminOnly) lets a session
// through only if its profile is_admin — a logged-in artist hitting the
// admin-only route is bounced to their own dashboard.
test('a logged-in artist visiting /admin is redirected to /artist', async ({
  page,
}) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/artist$/)
})
