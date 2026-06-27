import { expect, test } from '@playwright/test'

// Unauthenticated routing edges: the catch-all NotFound page, and the
// ProtectedRoute guard that sends an anon visitor on an artist route to /login
// (the /admin counterpart lives in admin-login.spec.js).
test.describe('routing', () => {
  test('an unknown path renders the not-found page', async ({ page }) => {
    await page.goto('/no-such-page')

    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Back to login' }),
    ).toBeVisible()
  })

  test('an unauthenticated visit to /artist redirects to /login', async ({
    page,
  }) => {
    await page.goto('/artist')
    await expect(page).toHaveURL(/\/login$/)
  })
})
