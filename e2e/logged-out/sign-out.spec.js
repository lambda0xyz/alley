import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SERVICE_ROLE_KEY, SUPABASE_URL } from '../local-supabase'
import { loginWithPin } from '../login'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Deliberately NOT in the logged-in project: signOut() defaults to *global*
// scope and revokes the user's tokens server-side, which would invalidate the
// shared table1 storageState that every logged-in test reuses. So this signs in
// a throwaway artist of its own — the revocation blast radius is just this user.
test('signing out returns to the login page', async ({ page }) => {
  const identifier = `signout${Date.now()}`
  const pin = '517293'
  const userId = await createArtist(identifier, pin)

  try {
    await loginWithPin(page, identifier, pin)

    await page.getByRole('button', { name: 'Sign out' }).click()

    // The cleared session makes ProtectedRoute bounce us back to the login UI.
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByLabel('Your artist name')).toBeVisible()
  } finally {
    await admin.auth.admin.deleteUser(userId)
  }
})

async function createArtist(identifier, pin) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `${identifier}@alley.local`,
    password: pin,
    email_confirm: true,
    user_metadata: { display_name: identifier },
  })
  if (error) throw error
  return data.user.id
}
