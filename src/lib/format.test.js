import { describe, expect, it } from 'vitest'
import { formatArtistName, formatMoney, formatSaleTime } from './format'

describe('formatArtistName', () => {
  it('strips the internal @alley.local domain', () => {
    expect(formatArtistName('table12@alley.local')).toBe('table12')
  })

  it('leaves a real display name untouched', () => {
    expect(formatArtistName('Vincent')).toBe('Vincent')
  })

  it('returns an empty string for missing names', () => {
    expect(formatArtistName('')).toBe('')
    expect(formatArtistName(null)).toBe('')
    expect(formatArtistName(undefined)).toBe('')
  })
})

describe('formatMoney', () => {
  it('prefixes the currency and fixes two decimals', () => {
    expect(formatMoney(12)).toBe('RON 12.00')
    expect(formatMoney(12.5)).toBe('RON 12.50')
    expect(formatMoney(0)).toBe('RON 0.00')
  })

  it('coerces a string price (Postgres numeric comes back as a string)', () => {
    expect(formatMoney('5.5')).toBe('RON 5.50')
  })

  it('rounds to two decimals', () => {
    expect(formatMoney(1.005)).toBe('RON 1.00') // standard toFixed rounding
    expect(formatMoney(1.999)).toBe('RON 2.00')
  })
})

describe('formatSaleTime', () => {
  it('produces a non-empty string for a valid ISO timestamp', () => {
    const out = formatSaleTime('2026-06-10T14:32:00Z')
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
  })

  it('distinguishes different timestamps', () => {
    expect(formatSaleTime('2026-06-10T14:32:00Z')).not.toBe(
      formatSaleTime('2026-06-11T09:00:00Z'),
    )
  })
})
