import { describe, it, expect } from 'vitest'
import { formatArtistName, formatSaleTime } from './format'

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

describe('formatSaleTime', () => {
  it('produces a non-empty string for a valid ISO timestamp', () => {
    const out = formatSaleTime('2026-06-10T14:32:00Z')
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
  })

  it('distinguishes different timestamps', () => {
    expect(formatSaleTime('2026-06-10T14:32:00Z'))
      .not.toBe(formatSaleTime('2026-06-11T09:00:00Z'))
  })
})
