import { expect, test } from '@playwright/test'
import { TEST_ARTIST } from '../local-supabase'

// The wrong-credentials path: a bad PIN gets a friendly "Wrong PIN" message and
// the pad resets. Local Supabase has captcha disabled server-side, so the dummy
// Turnstile token is accepted and the sign-in genuinely reaches Auth and fails.
test('a wrong PIN shows an error and clears the pad', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Your artist name').fill(TEST_ARTIST.identifier)
  await page.getByRole('button', { name: 'Continue' }).click()

  const error = page.getByText('Wrong PIN. Try again.')

  // The pad auto-submits on the 6th digit, but submitLogin needs the Turnstile
  // token first; if it isn't ready it shows a "verifying" guard and clears the
  // PIN. Retry until the real wrong-credentials error comes back.
  for (let attempt = 0; attempt < 5; attempt++) {
    for (const digit of '999999') {
      await page.getByRole('button', { name: digit, exact: true }).click()
    }
    const shown = await error
      .waitFor({ timeout: 3000 })
      .then(() => true)
      .catch(() => false)
    if (shown) break
    await page.waitForTimeout(500)
  }

  await expect(error).toBeVisible()
  // The pad was cleared — no dots remain filled.
  await expect(page.locator('.pin-dot-filled')).toHaveCount(0)
})
