import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// These tests exercise the money-and-inventory invariants through the hook's
// public API (call sellItem/editItem/etc, assert state + return value), so
// internal refactors won't break them — only a genuine behaviour change will.
//
// Supabase is mocked with a chainable, awaitable builder. Each test wires up a
// per-operation handler keyed by "<table>.<op>" (e.g. "sales.insert"); the
// builder resolves whatever that handler returns. A handler that throws
// simulates an outright network rejection.
const { handlers, getUserMock, supabaseMock } = vi.hoisted(() => {
  const handlers = {}
  const getUserMock = vi.fn()

  const makeBuilder = (table) => {
    const ctx = { table, op: null }
    const builder = {
      select: vi.fn(() => {
        if (!ctx.op) ctx.op = 'select'
        return builder
      }),
      insert: vi.fn(() => {
        ctx.op = 'insert'
        return builder
      }),
      update: vi.fn(() => {
        ctx.op = 'update'
        return builder
      }),
      delete: vi.fn(() => {
        ctx.op = 'delete'
        return builder
      }),
      order: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      single: vi.fn(() => builder),
      // biome-ignore lint/suspicious/noThenProperty: intentional thenable — mirrors Supabase's awaitable query builder
      then: (resolve, reject) => {
        const key = `${ctx.table}.${ctx.op}`
        const handler = handlers[key]
        if (!handler) {
          return Promise.reject(new Error(`No mock handler for ${key}`)).then(
            resolve,
            reject,
          )
        }
        return Promise.resolve().then(handler).then(resolve, reject)
      },
    }
    return builder
  }

  const supabaseMock = {
    auth: { getUser: getUserMock },
    from: vi.fn(makeBuilder),
  }
  return { handlers, getUserMock, supabaseMock }
})

vi.mock('../lib/supabase', () => ({ supabase: supabaseMock }))

import { useArtistItems } from './useArtistItems'

const item = (over = {}) => ({
  id: '1',
  name: 'Sticker',
  price: 5,
  quantity_total: 10,
  quantity_remaining: 10,
  ...over,
})

// Render the hook with a known initial item list and wait for the mount fetch
// to settle so each test starts from a stable, loaded state.
async function renderLoaded(initialItems) {
  handlers['items.select'] = () => ({ data: initialItems, error: null })
  const view = renderHook(() => useArtistItems())
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

beforeEach(() => {
  for (const k of Object.keys(handlers)) delete handlers[k]
  getUserMock.mockReset()
  getUserMock.mockResolvedValue({ data: { user: { id: 'artist-1' } } })
})

describe('useArtistItems — load', () => {
  it('loads items on mount', async () => {
    const { result } = await renderLoaded([item()])
    expect(result.current.items).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it('surfaces a fetch error in error state', async () => {
    handlers['items.select'] = () => ({
      data: null,
      error: { message: 'boom' },
    })
    const { result } = renderHook(() => useArtistItems())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('boom')
  })
})

describe('useArtistItems — sales', () => {
  it('decrements stock on a successful sale', async () => {
    const { result } = await renderLoaded([item({ quantity_remaining: 10 })])
    handlers['sales.insert'] = () => ({ error: null })

    await act(async () => {
      await result.current.sellItem('1', 3)
    })

    expect(result.current.items[0].quantity_remaining).toBe(7)
  })

  it('rolls back stock when a sale fails', async () => {
    const { result } = await renderLoaded([item({ quantity_remaining: 10 })])
    handlers['sales.insert'] = () => ({ error: { message: 'nope' } })

    let res
    await act(async () => {
      res = await result.current.sellItem('1', 3)
    })

    expect(res.error.message).toBe('nope')
    expect(result.current.items[0].quantity_remaining).toBe(10)
  })

  it('rolls back when the insert rejects (network down)', async () => {
    const { result } = await renderLoaded([item({ quantity_remaining: 10 })])
    handlers['sales.insert'] = () => {
      throw new Error('offline')
    }

    let res
    await act(async () => {
      res = await result.current.sellItem('1', 2)
    })

    expect(res.error.message).toMatch(/check your connection/i)
    expect(result.current.items[0].quantity_remaining).toBe(10)
  })

  it('adds stock back on a correction', async () => {
    const { result } = await renderLoaded([item({ quantity_remaining: 5 })])
    handlers['sales.insert'] = () => ({ error: null })

    await act(async () => {
      await result.current.correctItem('1', 2, 'miscount')
    })

    expect(result.current.items[0].quantity_remaining).toBe(7)
  })
})

describe('useArtistItems — edit', () => {
  it('rejects an edit that drops total below already-sold', async () => {
    // sold = 10 - 3 = 7
    const { result } = await renderLoaded([
      item({ quantity_total: 10, quantity_remaining: 3 }),
    ])

    let res
    await act(async () => {
      res = await result.current.editItem('1', {
        name: 'x',
        price: 9,
        quantity_total: 2,
      })
    })

    expect(res.error.message).toMatch(/below the 7/)
    expect(result.current.items[0].quantity_total).toBe(10) // unchanged
  })

  it('locks price once something has sold, but still allows total to grow', async () => {
    // sold = 7, so price must stay at 5
    const { result } = await renderLoaded([
      item({ price: 5, quantity_total: 10, quantity_remaining: 3 }),
    ])
    handlers['items.update'] = () => ({ error: null })

    await act(async () => {
      await result.current.editItem('1', {
        name: 'Sticker',
        price: 99,
        quantity_total: 12,
      })
    })

    expect(result.current.items[0].price).toBe(5)
    expect(result.current.items[0].quantity_total).toBe(12)
  })
})

describe('useArtistItems — delete', () => {
  it('blocks deleting an item with sales using a friendly message and restores it', async () => {
    const { result } = await renderLoaded([item()])
    handlers['items.delete'] = () => ({ error: { code: '23503' } })

    let res
    await act(async () => {
      res = await result.current.deleteItem('1')
    })

    expect(res.error.message).toMatch(/has sales/)
    expect(result.current.items).toHaveLength(1) // restored
  })
})

describe('useArtistItems — add', () => {
  it('returns a session-expired error when there is no user', async () => {
    const { result } = await renderLoaded([])
    getUserMock.mockResolvedValue({ data: { user: null } })

    let res
    await act(async () => {
      res = await result.current.addItem({
        name: 'New',
        price: 5,
        quantity_total: 4,
      })
    })

    expect(res.error.message).toMatch(/session has expired/i)
    expect(result.current.items).toHaveLength(0)
  })

  it('appends the new item on success', async () => {
    const { result } = await renderLoaded([])
    handlers['items.insert'] = () => ({
      data: item({ id: '2', name: 'New' }),
      error: null,
    })

    await act(async () => {
      await result.current.addItem({ name: 'New', price: 5, quantity_total: 4 })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe('2')
  })
})
