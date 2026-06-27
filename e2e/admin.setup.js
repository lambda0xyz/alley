import { mkdirSync } from 'node:fs'
import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SERVICE_ROLE_KEY, SUPABASE_URL, TEST_ADMIN } from './local-supabase'

// Signed-in admin state is saved here for the "admin" project to reuse, so those
// tests land straight on /admin without touching the login UI. Mirrors
// auth.setup.js, but for an admin account (email + password, is_admin = true).
const authFile = 'e2e/.auth/admin.json'

setup('seed admin and capture signed-in state', async ({ page }) => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Ensure the admin auth user exists with our known password. createUser
  // fires handle_new_user, which creates the matching profiles row (is_admin
  // defaults to false).
  const userId = await ensureUser(admin, TEST_ADMIN.email)

  // 2. Promote it. The "profiles: update own display_name only" RLS policy
  // blocks a user from flipping their own is_admin, so this must go through the
  // service-role client, which bypasses RLS.
  const { error } = await admin
    .from('profiles')
    .update({ is_admin: true })
    .eq('id', userId)
  if (error) throw error

  // 3. Log in through the real admin UI so supabase-js writes its own session
  // into localStorage, then persist that state for the admin tests.
  await page.goto('/admin/login')
  await page.getByPlaceholder('Email').fill(TEST_ADMIN.email)
  await page.getByPlaceholder('Password').fill(TEST_ADMIN.password)
  // The submit button is disabled until the (dummy) Turnstile token lands;
  // click() auto-waits for it to become enabled before acting.
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/admin')

  mkdirSync('e2e/.auth', { recursive: true })
  await page.context().storageState({ path: authFile })
})

async function ensureUser(admin, email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_ADMIN.password,
    email_confirm: true,
    user_metadata: { display_name: TEST_ADMIN.displayName },
  })
  if (!error) return data.user.id

  // Created on a previous run — find it and reset the password to be safe.
  const existing = await findUserByEmail(admin, email)
  if (!existing) throw error
  await admin.auth.admin.updateUserById(existing.id, {
    password: TEST_ADMIN.password,
  })
  return existing.id
}

async function findUserByEmail(admin, email) {
  // listUsers is paginated; the local test DB is tiny so one page is plenty.
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  return data.users.find((u) => u.email === email) ?? null
}
