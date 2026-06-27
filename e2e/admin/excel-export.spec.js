import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
import { SERVICE_ROLE_KEY, SUPABASE_URL } from '../local-supabase'

// Service role bypasses RLS — used only to set up and tear down the dedicated
// artist this test owns, never shipped to the browser.
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// "Export Excel report" lazy-loads the xlsx library and calls XLSX.writeFile,
// which in the browser triggers a real file download. This drives that button,
// captures the download, reads the workbook back, and asserts the figures the
// export derives from the sales ledger — proving the whole client→DB→spreadsheet
// path, not just that a file appeared. The test owns a fresh artist (with known
// numbers) so the assertions are exact and it stays rerunnable.
test('exporting the Excel report downloads a workbook with the right figures', async ({
  page,
}) => {
  const ts = Date.now()
  const email = `excel-${ts}@alley.local`
  const artistName = `Excel Co ${ts}`
  // 1 item brought 8, sold 3 (so 5 remain) at price 12 → revenue 36.
  const item = { name: 'Excel Widget', price: 12, broughtQty: 8, soldQty: 3 }

  const { userId, itemId } = await seedArtistWithSale(email, artistName, item)

  try {
    await page.goto('/admin')

    // Wait for our seeded artist to land in the dashboard's data before exporting.
    await expect(
      page.locator('.artist-card', { hasText: artistName }),
    ).toBeVisible()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export Excel report' }).click()
    const download = await downloadPromise

    // Filename is alley-report-<ISO date>.xlsx (see exportConventionReport).
    expect(download.suggestedFilename()).toMatch(
      /^alley-report-\d{4}-\d{2}-\d{2}\.xlsx$/,
    )

    // Read the bytes via Node fs and parse — the xlsx ESM entry doesn't expose
    // readFile/writeFile (those need fs wired), but XLSX.read on a buffer works.
    const wb = XLSX.read(readFileSync(await download.path()), {
      type: 'buffer',
    })

    // The combined Summary sheet has one row per artist. Ours should reflect the
    // ledger: 1 item, 8 brought, 3 sold, 5 remaining, 36 revenue.
    const summary = XLSX.utils.sheet_to_json(wb.Sheets.Summary, { header: 1 })
    const summaryRow = summary.find((row) => row[0] === artistName)
    expect(summaryRow, 'artist row in Summary sheet').toBeTruthy()
    // [Artist, Items, Total Brought, Total Sold, Remaining, Revenue]
    expect(summaryRow.slice(1, 6)).toEqual([1, 8, 3, 5, 36])

    // The Full Log sheet lists every sale; ours is one "Sale" line of 3 @ 12 = 36.
    const fullLog = XLSX.utils.sheet_to_json(wb.Sheets['Full Log'], {
      header: 1,
    })
    const saleRow = fullLog.find((row) => row[2] === item.name)
    expect(saleRow, 'sale row in Full Log sheet').toBeTruthy()
    // [Time, Artist, Item, Type, Qty, Unit Price, Line Total, Notes, Sale ID]
    expect(saleRow[1]).toBe(artistName)
    expect(saleRow[3]).toBe('Sale')
    expect(saleRow[4]).toBe(item.soldQty)
    expect(saleRow[5]).toBe(item.price)
    expect(saleRow[6]).toBe(item.soldQty * item.price)

    // Each artist also gets their own sheet, named after the display name.
    expect(wb.SheetNames).toContain(artistName)
  } finally {
    // Sales first (items FK is ON DELETE RESTRICT), then the item, then the auth
    // user (cascades the profile away).
    await admin.from('sales').delete().eq('item_id', itemId)
    await admin.from('items').delete().eq('id', itemId)
    await admin.auth.admin.deleteUser(userId)
  }
})

async function seedArtistWithSale(email, displayName, item) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'excel-test-pw-1',
    email_confirm: true,
    user_metadata: { display_name: displayName },
  })
  if (error) throw error
  const userId = data.user.id

  const { data: created, error: itemError } = await admin
    .from('items')
    .insert({
      artist_id: userId,
      name: item.name,
      price: item.price,
      quantity_total: item.broughtQty,
      quantity_remaining: item.broughtQty,
    })
    .select('id')
    .single()
  if (itemError) throw itemError
  const itemId = created.id

  // The sale trigger decrements quantity_remaining by quantity_sold server-side.
  const { error: saleError } = await admin
    .from('sales')
    .insert({ item_id: itemId, quantity_sold: item.soldQty })
  if (saleError) throw saleError

  return { userId, itemId }
}
