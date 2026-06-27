// Logs in through the real artist UI: artist name -> PIN pad. The pad
// auto-submits on the 6th digit, but submitLogin needs the (dummy) Turnstile
// token first; if it isn't ready it shows a "verifying" guard and clears the
// PIN. Retry the whole PIN until we land on /artist. Shared by auth.setup.js and
// the sign-out test.
export async function loginWithPin(page, identifier, pin) {
  await page.goto('/login')
  await page.getByLabel('Your artist name').fill(identifier)
  await page.getByRole('button', { name: 'Continue' }).click()

  for (let attempt = 0; attempt < 5; attempt++) {
    for (const digit of pin) {
      await page.getByRole('button', { name: digit, exact: true }).click()
    }
    const landed = await page
      .waitForURL('**/artist', { timeout: 3000 })
      .then(() => true)
      .catch(() => false)
    if (landed) return
    await page.waitForTimeout(500)
  }
  throw new Error('PIN login never reached /artist (Turnstile token missing?)')
}
