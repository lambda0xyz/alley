import { expect, test } from '@playwright/test'

// Unauthenticated. Covers the admin login UI and the guard that sends an anon
// visitor on an /admin route to /admin/login (not the artist /login).
test.describe('admin login page', () => {
  test('renders the admin sign-in form', async ({ page }) => {
    await page.goto('/admin/login')

    await expect(page.getByRole('heading', { name: 'alley' })).toBeVisible()
    await expect(page.getByPlaceholder('Email')).toBeVisible()
    await expect(page.getByPlaceholder('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await expect(
      page.getByRole('link', { name: /Artist Login/i }),
    ).toBeVisible()
  })

  test('an unauthenticated visit to /admin redirects to /admin/login', async ({
    page,
  }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login$/)
  })
})
