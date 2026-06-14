import { describe, it, expect } from 'vitest'
import { collectSales, buildLogAoa } from './exportExcel'

// Minimal item shape: name, price, and the nested append-only sales rows.
function item(name, price, sales) {
  return { id: `item-${name}`, name, price, sales }
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
