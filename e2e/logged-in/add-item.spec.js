import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { makePng } from '../fixtures/png'
import { SERVICE_ROLE_KEY, SUPABASE_URL } from '../local-supabase'

// Service role bypasses RLS — used only to verify the DB state and clean up,
// never shipped to the browser.
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// The create path nothing else exercises: the seed inserts items via the
// service-role key, so only this drives AddItemForm -> useArtistItems.addItem ->
// an RLS-scoped insert as the artist. We assert the DB row, not just the
// optimistic card, then clean up so the test is isolated and rerunnable.
test('adding an item through the form creates it in the dashboard and the DB', async ({
  page,
}) => {
  const name = `E2E Add ${Date.now()}`
  let itemId

  try {
    await page.goto('/artist')
    await page.getByRole('button', { name: '+ Add item' }).click()

    await page.getByPlaceholder('Item name').fill(name)
    await page.getByPlaceholder('Price').fill('9.50')
    await page.getByPlaceholder('Quantity').fill('12')
    await page.getByRole('button', { name: 'Add item' }).click()

    // The new card shows in the list with its starting stock.
    const card = page.locator('.item-list > div', { hasText: name })
    await expect(card.getByText('12 left')).toBeVisible()

    // It really landed in the DB with the typed values (and no photo).
    const row = await itemByName(name)
    itemId = row.id
    expect(Number(row.price)).toBe(9.5)
    expect(row.quantity_total).toBe(12)
    expect(row.quantity_remaining).toBe(12)
    expect(row.image_url).toBeNull()
  } finally {
    if (itemId) await admin.from('items').delete().eq('id', itemId)
  }
})

// Drives the full photo path: pick a file -> compress in the browser -> upload
// to the public Storage bucket -> store the public URL on the item. Proves the
// bucket + RLS + URL round-trip, which a mocked client can't.
test('adding an item with a photo uploads it and stores the public URL', async ({
  page,
}) => {
  const name = `E2E Photo ${Date.now()}`
  let itemId
  let objectPath

  try {
    await page.goto('/artist')
    await page.getByRole('button', { name: '+ Add item' }).click()

    await page.getByPlaceholder('Item name').fill(name)
    await page.getByPlaceholder('Price').fill('4.00')
    await page.getByPlaceholder('Quantity').fill('3')

    // The picker's <input> is visually hidden; set the file on it directly.
    await page.locator('.add-form input[type="file"]').setInputFiles({
      name: 'photo.png',
      mimeType: 'image/png',
      buffer: makePng(),
    })
    // The local preview confirms the picker captured the file before submit.
    await expect(page.locator('.item-thumb-preview')).toBeVisible()

    await page.getByRole('button', { name: 'Add item' }).click()

    const card = page.locator('.item-list > div', { hasText: name })
    await expect(card.getByText('3 left')).toBeVisible()

    // The compressed JPEG was uploaded and its public URL persisted on the item.
    const row = await itemByName(name)
    itemId = row.id
    expect(row.image_url).toMatch(/\/item-images\/.+\.jpg$/)

    // The object is actually reachable (the bucket is public).
    const res = await page.request.get(row.image_url)
    expect(res.ok()).toBeTruthy()

    objectPath = row.image_url.split('/item-images/')[1]
  } finally {
    if (itemId) await admin.from('items').delete().eq('id', itemId)
    if (objectPath) {
      await admin.storage.from('item-images').remove([objectPath])
    }
  }
})

async function itemByName(name) {
  const { data, error } = await admin
    .from('items')
    .select('*')
    .eq('name', name)
    .single()
  if (error) throw error
  return data
}
