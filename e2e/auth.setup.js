import { mkdirSync } from 'node:fs'
import { test as setup } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SERVICE_ROLE_KEY, SUPABASE_URL, TEST_ARTIST } from './local-supabase'
import { loginWithPin } from './login'

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

  // 2b. Ensure the public bucket the photo-upload path writes to exists. It's
  // declared in config.toml (so a fresh `supabase start` has it); this covers an
  // already-running stack that predates that declaration.
  await ensureBucket(admin)

  // 3. Log in through the real UI so supabase-js writes its own session into
  // localStorage, then persist that state for the logged-in tests.
  await loginWithPin(page, TEST_ARTIST.identifier, TEST_ARTIST.pin)

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

async function ensureBucket(admin) {
  const { error } = await admin.storage.createBucket('item-images', {
    public: true,
  })
  // Ignore "already exists"; surface anything genuinely wrong.
  if (error && !/exist/i.test(error.message)) throw error
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
