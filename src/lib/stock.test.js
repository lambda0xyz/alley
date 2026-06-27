import { describe, expect, it } from 'vitest'
import { LOW_STOCK_THRESHOLD, stockStatus } from './stock'

describe('stockStatus', () => {
  it('flags out of stock at zero remaining', () => {
    const s = stockStatus({ quantity_remaining: 0 })
    expect(s.outOfStock).toBe(true)
    expect(s.lowStock).toBe(false)
    expect(s.remainingClass).toBe('text-soldout')
  })

  it('flags low stock at or below the threshold (but not zero)', () => {
    const s = stockStatus({ quantity_remaining: LOW_STOCK_THRESHOLD })
    expect(s.outOfStock).toBe(false)
    expect(s.lowStock).toBe(true)
    expect(s.remainingClass).toBe('text-warning')
  })

  it('treats stock above the threshold as healthy', () => {
    const s = stockStatus({ quantity_remaining: LOW_STOCK_THRESHOLD + 1 })
    expect(s.outOfStock).toBe(false)
    expect(s.lowStock).toBe(false)
    expect(s.remainingClass).toBe('text-muted')
  })
})
