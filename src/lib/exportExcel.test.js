import { describe, it, expect } from 'vitest'
import { collectSales, buildLogAoa, buildSummaryAoa } from './exportExcel'

// Minimal item shape: name, price, and the nested append-only sales rows.
function item(name, price, sales) {
  return { id: `item-${name}`, name, price, sales }
}

// An untampered item whose stock counter agrees with the ledger, exactly as the
// sales trigger keeps it. Used to prove the Summary figures are unchanged for
// legitimate data after switching them onto the ledger.
function untamperedItem(name, price, total, soldQtys) {
  const sales = soldQtys.map((quantity_sold, i) => ({
    id: `${name}-s${i}`,
    quantity_sold,
    sold_at: `2026-06-14T0${i}:00:00Z`,
    notes: null,
  }))
  const netSold = soldQtys.reduce((s, q) => s + q, 0)
  return { id: `item-${name}`, name, price, quantity_total: total, quantity_remaining: total - netSold, sales }
}

describe('collectSales', () => {
  it('flattens nested sales and sorts chronologically across items', () => {
    const items = [
      item('Print A', '10.00', [
        { id: 's2', quantity_sold: 1, sold_at: '2026-06-14T12:00:00Z', notes: null },
      ]),
      item('Pin B', '5.00', [
        { id: 's1', quantity_sold: 2, sold_at: '2026-06-14T09:00:00Z', notes: null },
        { id: 's3', quantity_sold: 1, sold_at: '2026-06-14T15:00:00Z', notes: null },
      ]),
    ]

    const rows = collectSales(items, 'vincent')

    expect(rows.map(r => r.saleId)).toEqual(['s1', 's2', 's3'])
    expect(rows.every(r => r.artist === 'vincent')).toBe(true)
    // price is coerced to a number for arithmetic
    expect(rows[0]).toMatchObject({ item: 'Pin B', qty: 2, price: 5 })
  })

  it('handles items with no sales', () => {
    expect(collectSales([item('Unsold', '3.00', [])])).toEqual([])
    expect(collectSales([{ id: 'x', name: 'NoArr', price: '1.00' }])).toEqual([])
  })

  it('normalises missing notes to an empty string', () => {
    const rows = collectSales([
      item('P', '1.00', [{ id: 's', quantity_sold: 1, sold_at: '2026-06-14T10:00:00Z', notes: null }]),
    ])
    expect(rows[0].notes).toBe('')
  })
})

describe('buildLogAoa', () => {
  const sales = [
    { soldAt: '2026-06-14T09:00:00Z', artist: 'vincent', item: 'Pin B', qty: 3, price: 5, notes: '', saleId: 's1' },
    { soldAt: '2026-06-14T10:00:00Z', artist: 'vincent', item: 'Pin B', qty: -1, price: 5, notes: 'refund', saleId: 's2' },
  ]

  it('marks negative quantities as corrections and positives as sales', () => {
    const aoa = buildLogAoa(sales, { includeArtist: true })
    const header = aoa[0]
    const typeIdx = header.indexOf('Type')
    expect(aoa[1][typeIdx]).toBe('Sale')
    expect(aoa[2][typeIdx]).toBe('Correction')
  })

  it('nets qty and revenue including corrections in the TOTAL row', () => {
    const aoa = buildLogAoa(sales, { includeArtist: true })
    const header = aoa[0]
    const qtyIdx = header.indexOf('Qty')
    const totalIdx = header.indexOf('Line Total')

    // last row is TOTAL (preceded by a spacer row)
    const totalRow = aoa[aoa.length - 1]
    expect(totalRow[0]).toBe('TOTAL')
    expect(totalRow[qtyIdx]).toBe(2)        // 3 + (-1)
    expect(totalRow[totalIdx]).toBe(10)     // 15 + (-5)
  })

  it('computes line totals per row (negative for corrections)', () => {
    const aoa = buildLogAoa(sales, { includeArtist: true })
    const totalIdx = aoa[0].indexOf('Line Total')
    expect(aoa[1][totalIdx]).toBe(15)
    expect(aoa[2][totalIdx]).toBe(-5)
  })

  it('omits the Artist column when includeArtist is false', () => {
    const withArtist = buildLogAoa(sales, { includeArtist: true })[0]
    const without = buildLogAoa(sales, { includeArtist: false })[0]
    expect(withArtist).toContain('Artist')
    expect(without).not.toContain('Artist')
    expect(without.length).toBe(withArtist.length - 1)
  })

  it('produces only a header and an empty TOTAL block when there are no sales', () => {
    const aoa = buildLogAoa([], { includeArtist: false })
    const qtyIdx = aoa[0].indexOf('Qty')
    const totalRow = aoa[aoa.length - 1]
    expect(totalRow[0]).toBe('TOTAL')
    expect(totalRow[qtyIdx]).toBe(0)
  })
})

describe('buildSummaryAoa', () => {
  const header = ['Artist', 'Items', 'Total Brought', 'Total Sold', 'Remaining', 'Revenue']
  const soldIdx = header.indexOf('Total Sold')
  const revenueIdx = header.indexOf('Revenue')

  // Legacy formula the Summary used before the fix (the mutable counters).
  const legacySold = i => i.quantity_total - i.quantity_remaining
  const legacyRevenue = a =>
    a.items.reduce((s, i) => s + legacySold(i) * Number(i.price), 0)

  const artists = [
    {
      display_name: 'vincent',
      items: [
        untamperedItem('Print', '10.00', 50, [3, 2, -1]),
        untamperedItem('Pin', '5.00', 100, [10]),
      ],
    },
    {
      display_name: 'mara',
      items: [
        untamperedItem('Sticker', '2.50', 30, []),
        untamperedItem('Charm', '7.00', 12, [5, -2, 1]),
      ],
    },
  ]

  it('matches the legacy counter figures for untampered data (behaviour unchanged)', () => {
    const aoa = buildSummaryAoa(artists)
    expect(aoa[0]).toEqual(header)

    // One data row per artist (after the header), then a spacer + TOTAL.
    artists.forEach((artist, n) => {
      const row = aoa[n + 1]
      const expectedSold = artist.items.reduce((s, i) => s + legacySold(i), 0)
      expect(row[0]).toBe(artist.display_name)
      expect(row[soldIdx]).toBe(expectedSold)
      expect(row[revenueIdx]).toBe(legacyRevenue(artist))
    })

    const totalRow = aoa[aoa.length - 1]
    const grandSold = artists.reduce(
      (s, a) => s + a.items.reduce((x, i) => x + legacySold(i), 0), 0)
    const grandRevenue = artists.reduce((s, a) => s + legacyRevenue(a), 0)
    expect(totalRow[0]).toBe('TOTAL')
    expect(totalRow[soldIdx]).toBe(grandSold)
    expect(totalRow[revenueIdx]).toBe(grandRevenue)
  })

  it('reports the true ledger figure when the stock counter is tampered with', () => {
    // Attacker zeroes their reported sales: quantity_remaining = quantity_total.
    const tampered = [{
      display_name: 'vincent',
      items: [{ ...untamperedItem('Print', '10.00', 50, [4]), quantity_remaining: 50 }],
    }]
    const row = buildSummaryAoa(tampered)[1]
    // Legacy formula would show 0 sold / 0 revenue here; the ledger holds the truth.
    expect(row[soldIdx]).toBe(4)
    expect(row[revenueIdx]).toBe(40)
  })
})
