import { describe, expect, it } from 'vitest'
import { itemRevenue, itemSold, sumRevenue, sumSold } from './sales'

// An *untampered* item: the stock counter agrees with the ledger exactly as the
// sales trigger maintains it (quantity_remaining = quantity_total - net sold).
// This is the invariant that holds for every item the app itself produces.
function untamperedItem(name, price, total, soldQtys) {
  const sales = soldQtys.map((quantity_sold, i) => ({
    id: `${name}-s${i}`,
    quantity_sold,
    sold_at: `2026-06-14T0${i}:00:00Z`,
    notes: null,
  }))
  const netSold = soldQtys.reduce((s, q) => s + q, 0)
  return {
    id: `item-${name}`,
    name,
    price,
    quantity_total: total,
    quantity_remaining: total - netSold,
    sales,
  }
}

// The legacy formulas the report used before the fix — the mutable counters.
const legacySold = (i) => i.quantity_total - i.quantity_remaining
const legacyRevenue = (i) => legacySold(i) * Number(i.price)

describe('itemSold / itemRevenue', () => {
  it('sums the ledger, netting corrections (negative rows)', () => {
    const item = untamperedItem('Print', '10.00', 50, [3, 2, -1])
    expect(itemSold(item)).toBe(4)
    expect(itemRevenue(item)).toBe(40)
  })

  it('treats an item with no sales as zero', () => {
    expect(itemSold({ price: '5.00', sales: [] })).toBe(0)
    expect(itemSold({ price: '5.00' })).toBe(0) // missing sales array
    expect(itemRevenue({ price: '5.00', sales: [] })).toBe(0)
  })

  it('coerces a string price for revenue', () => {
    const item = untamperedItem('Pin', '5.50', 20, [2])
    expect(itemRevenue(item)).toBe(11)
  })
})

describe('sumSold / sumRevenue', () => {
  it('aggregates across items', () => {
    const items = [
      untamperedItem('A', '10.00', 50, [3]),
      untamperedItem('B', '5.00', 20, [4, -1]),
    ]
    expect(sumSold(items)).toBe(6) // 3 + 3
    expect(sumRevenue(items)).toBe(45) // 30 + 15
  })
})

// The point of the fix: the ledger figures must equal the old counter-based
// figures for any legitimately-produced (untampered) data, so existing reports
// are unchanged — yet stay correct when the counter is tampered with.
describe('parity with the legacy counter formula on untampered data', () => {
  const items = [
    untamperedItem('Print', '10.00', 50, [3, 2, -1]),
    untamperedItem('Pin', '5.00', 100, [10]),
    untamperedItem('Sticker', '2.50', 30, []), // nothing sold
    untamperedItem('Charm', '7.00', 12, [5, -2, 1]), // with corrections
  ]

  it('itemSold equals quantity_total - quantity_remaining', () => {
    for (const item of items) {
      expect(itemSold(item)).toBe(legacySold(item))
    }
  })

  it('itemRevenue equals the legacy revenue', () => {
    for (const item of items) {
      expect(itemRevenue(item)).toBe(legacyRevenue(item))
    }
  })
})

describe('tamper-resistance (the regression the fix prevents)', () => {
  it('keeps the true sold count when an artist resets the remaining counter', () => {
    const item = untamperedItem('Print', '10.00', 50, [4])
    expect(legacySold(item)).toBe(4) // honest counter agrees

    // Attack: PATCH quantity_remaining = quantity_total to zero out reported sales.
    const tampered = { ...item, quantity_remaining: item.quantity_total }

    expect(legacySold(tampered)).toBe(0) // counter now lies
    expect(itemSold(tampered)).toBe(4) // ledger still tells the truth
    expect(itemRevenue(tampered)).toBe(40)
  })

  it('ignores a post-sale price rewrite for the sold count', () => {
    const item = untamperedItem('Print', '10.00', 50, [4])
    const tampered = { ...item, price: '0.01' } // price lock is client-only
    // Revenue follows the (now tampered) price, but the sold count is from the
    // immutable ledger — the figure the organizer audits against Full Log.
    expect(itemSold(tampered)).toBe(4)
  })
})
