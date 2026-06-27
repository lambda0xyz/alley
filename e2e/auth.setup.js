import { mkdirSync } from 'node:fs'
import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SERVICE_ROLE_KEY, SUPABASE_URL, TEST_ARTIST } from './local-supabase'

// Signed-in browser state is saved here for the "logged-in" project to reuse,
// so those tests skip the login UI entirely.
const authFile = 'e2e/.auth/artist.json'

// Tiny, deterministic inventory for the test artist.
const SEED_ITEMS = [
  {
    name: 'Sticker Pack',
    price: 5,
    quantity_total: 20,
    quantity_remaining: 20,
  },
  {
    name: 'Art Print A4',
    price: 15,
    quantity_total: 10,
    quantity_remaining: 10,
  },
]

setup('seed test artist and capture signed-in state', async ({ page }) => {
  const email = `${TEST_ARTIST.identifier}@alley.local`
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Ensure the artist auth user exists with our known PIN. createUser fires
  // the handle_new_user trigger, which creates the matching profiles row.
  const userId = await ensureUser(admin, email)

  // 2. Ensure the artist has inventory (insert once; reruns keep existing rows).
  await ensureItems(admin, userId)

  // 3. Log in through the real UI so supabase-js writes its own session into
  // localStorage, then persist that state for the logged-in tests.
  await page.goto('/login')
  await page.getByLabel('Your artist name').fill(TEST_ARTIST.identifier)
  await page.getByRole('button', { name: 'Continue' }).click()
  await enterPin(page, TEST_ARTIST.pin)
  await page.waitForURL('**/artist')

  mkdirSync('e2e/.auth', { recursive: true })
  await page.context().storageState({ path: authFile })
})

async function ensureUser(admin, email) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: TEST_ARTIST.pin,
    email_confirm: true,
    user_metadata: { display_name: TEST_ARTIST.displayName },
  })
  if (!error) return data.user.id

  // Created on a previous run — find it and reset the PIN to be safe.
  const existing = await findUserByEmail(admin, email)
  if (!existing) throw error
  await admin.auth.admin.updateUserById(existing.id, {
    password: TEST_ARTIST.pin,
  })
  return existing.id
}

async function findUserByEmail(admin, email) {
  // listUsers is paginated; the local test DB is tiny so one page is plenty.
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  return data.users.find((u) => u.email === email) ?? null
}

async function ensureItems(admin, artistId) {
  const { count } = await admin
    .from('items')
    .select('id', { count: 'exact', head: true })
    .eq('artist_id', artistId)
  if (count && count > 0) return
  const rows = SEED_ITEMS.map((item) => ({ ...item, artist_id: artistId }))
  const { error } = await admin.from('items').insert(rows)
  if (error) throw error
}

async function enterPin(page, pin) {
  // The pad auto-submits on the 6th digit, but submitLogin needs the (dummy)
  // Turnstile token first; if it isn't ready it shows a "verifying" guard and
  // clears the PIN. Retry until we land on /artist.
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
