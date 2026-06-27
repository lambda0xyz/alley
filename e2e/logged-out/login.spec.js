import { expect, test } from '@playwright/test'

// First smoke test. Deliberately needs no database and no Turnstile success:
// it only exercises routing and the client-side identifier -> PIN transition,
// which is enough to prove the whole stack (Vite build, React mount, Router)
// boots in a real browser.
test.describe('artist login page', () => {
  test('redirects the root path to /login and shows the artist-name step', async ({
    page,
  }) => {
    await page.goto('/')

    // App.jsx redirects "/" -> "/login".
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByRole('heading', { name: 'alley' })).toBeVisible()
    await expect(page.getByLabel('Your artist name')).toBeVisible()
  })

  test('advances to the PIN pad after entering an artist name', async ({
    page,
  }) => {
    await page.goto('/login')

    await page.getByLabel('Your artist name').fill('table1')
    await page.getByRole('button', { name: 'Continue' }).click()

    // The PIN step renders its prompt and number pad — no sign-in attempt yet,
    // so no Supabase or captcha is involved.
    await expect(page.getByText(/PIN for/i)).toBeVisible()
    await expect(
      page.getByRole('button', { name: '1', exact: true }),
    ).toBeVisible()
  })
})
