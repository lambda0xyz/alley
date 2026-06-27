import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { SERVICE_ROLE_KEY, SUPABASE_URL, TEST_ARTIST } from '../local-supabase'

// Service role bypasses RLS — used only to set up and verify DB state, never
// shipped to the browser.
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// This is the test the real database earns us: clicking "Sell 1" must insert a
// sale AND fire the handle_sale_insert trigger that decrements stock — server
// logic a mocked client can't exercise. The test owns a dedicated item so it's
// isolated and rerunnable, and it asserts the DB directly rather than trusting
// the optimistic UI.
test('selling an item decrements stock server-side via the DB trigger', async ({
  page,
}) => {
  const name = `E2E Sell ${Date.now()}`
  const artistId = await artistIdFor(`${TEST_ARTIST.identifier}@alley.local`)
  const itemId = await createItem(artistId, name, 7)

  try {
    await page.goto('/artist')

    const card = page.locator('.item-list > div', { hasText: name })
    await expect(card.getByText('7 left')).toBeVisible()

    await card.getByRole('button', { name: 'Sell 1' }).click()

    // Optimistic UI drops it immediately.
    await expect(card.getByText('6 left')).toBeVisible()

    // The real proof: the server trigger decremented quantity_remaining. Poll
    // the DB so we also wait out the async write before moving on.
    await expect.poll(() => stockOf(itemId), { timeout: 10_000 }).toBe(6)

    // And exactly one sale row was recorded against the item.
    const { count } = await admin
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('item_id', itemId)
    expect(count).toBe(1)

    // Reloading re-fetches from Supabase, so the UI reflects persisted state.
    await page.reload()
    await expect(
      page.locator('.item-list > div', { hasText: name }).getByText('6 left'),
    ).toBeVisible()
  } finally {
    // Clean up: sales first (items FK is ON DELETE RESTRICT), then the item.
    await admin.from('sales').delete().eq('item_id', itemId)
    await admin.from('items').delete().eq('id', itemId)
  }
})

async function artistIdFor(email) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  const user = data.users.find((u) => u.email === email)
  if (!user) throw new Error(`test artist ${email} not found — run setup first`)
  return user.id
}

async function createItem(artistId, name, qty) {
  const { data, error } = await admin
    .from('items')
    .insert({
      artist_id: artistId,
      name,
      price: 8,
      quantity_total: qty,
      quantity_remaining: qty,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function stockOf(itemId) {
  const { data } = await admin
    .from('items')
    .select('quantity_remaining')
    .eq('id', itemId)
    .single()
  return data?.quantity_remaining
}
