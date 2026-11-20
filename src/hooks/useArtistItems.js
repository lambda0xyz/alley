import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Returned when an await rejects outright (network down, client misconfigured)
// rather than resolving with a Supabase { error } field. Keeps the { message }
// shape every caller expects.
const CONNECTION_ERROR = {
  message: "Couldn't reach the server — check your connection and try again.",
}

// Shared optimistic-write scaffold for the mutating actions. `apply` performs
// the optimistic state change and returns its own rollback; `run` is the async
// Supabase call. On a thrown rejection (network down) or a returned { error },
// we roll back and surface the error; optional `mapError` rewrites a returned
// error (e.g. a constraint code) into a friendlier message. Optional
// `onSuccess` receives the confirmed server result. Always resolves to the
// app-wide { error } shape.
async function optimisticWrite({ apply, run, mapError, onSuccess }) {
  const rollback = apply()

  let result
  try {
    result = await run()
  } catch {
    rollback()
    return { error: CONNECTION_ERROR }
  }

  if (result.error) {
    rollback()
    return { error: mapError ? mapError(result.error) : result.error }
  }

  onSuccess?.(result)
  return { error: null }
}

// Columns for the "last transaction" banner. Embeds the item name so a
// confirmed insert and the on-mount fetch produce the same shape.
const LAST_SALE_COLUMNS =
  'id, item_id, quantity_sold, sold_at, notes, items(name)'

// Keep whichever sale the server stamped later — two quick taps can confirm
// out of order on flaky WiFi, and the banner must not regress to the older one.
function newerSale(prev, next) {
  if (!prev) return next
  return new Date(next.sold_at) >= new Date(prev.sold_at) ? next : prev
}

export function useArtistItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Most recent sale/correction as CONFIRMED by the server (never optimistic):
  // set from the insert's returned row, or fetched on mount so it survives a
  // reload. Lets the artist see at a glance that a tap actually went through.
  const [lastSale, setLastSale] = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) setError(error.message)
      else setItems(data)
    } catch {
      setError(CONNECTION_ERROR.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Fetch-on-mount: fetchItems owns its own loading/error state. The synchronous
    // setLoading(true) is intentional, not a cascading-render bug.
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    // Best-effort: the banner is a nicety, so a failure here stays silent
    // rather than blocking the dashboard. RLS scopes sales to own items.
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase
          .from('sales')
          .select(LAST_SALE_COLUMNS)
          .order('sold_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        if (!cancelled && data) setLastSale((prev) => newerSale(prev, data))
      } catch {
        // ignore — banner just stays empty until the next confirmed sale
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Records a sale row and optimistically adjusts the displayed stock.
  // A positive quantity_sold is a sale (stock down); a negative one is a
  // correction (stock back up). The DB trigger does remaining - quantity_sold,
  // so the optimistic math here mirrors it.
  function recordSale(itemId, quantitySold, notes = null) {
    const applyDelta = (delta) =>
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, quantity_remaining: item.quantity_remaining + delta }
            : item,
        ),
      )

    return optimisticWrite({
      apply: () => {
        applyDelta(-quantitySold)
        return () => applyDelta(quantitySold)
      },
      run: () =>
        supabase
          .from('sales')
          .insert({ item_id: itemId, quantity_sold: quantitySold, notes })
          .select(LAST_SALE_COLUMNS)
          .single(),
      onSuccess: ({ data }) => {
        if (data) setLastSale((prev) => newerSale(prev, data))
      },
    })
  }

  function sellItem(itemId, quantity = 1) {
    return recordSale(itemId, quantity)
  }

  // A correction reverses an over-counted sale by inserting a negative row.
  // The note explains why; it falls back to 'correction' when left blank.
  function correctItem(itemId, quantity, note) {
    const trimmed = note?.trim()
    return recordSale(itemId, -quantity, trimmed || 'correction')
  }

  // Edits an item's mutable fields. Name is always free to change. The
  // starting total can move, but remaining shifts by the same delta so the
  // sold count (and thus revenue) is preserved — and it can't drop below what
  // has already sold. Price is locked once anything has sold, because sales
  // don't snapshot price: editing it would retroactively rewrite past revenue.
  function editItem(itemId, fields) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return { error: { message: 'Item not found' } }

    const soldCount = item.quantity_total - item.quantity_remaining
    const newTotal = fields.quantity_total
    const newRemaining =
      item.quantity_remaining + (newTotal - item.quantity_total)

    if (newRemaining < 0) {
      return {
        error: {
          message: `Total can't be below the ${soldCount} already sold`,
        },
      }
    }

    const updates = {
      name: fields.name,
      price: soldCount === 0 ? fields.price : item.price,
      quantity_total: newTotal,
      quantity_remaining: newRemaining,
    }

    // Only touch image_url when the edit supplied a new one (a fresh upload).
    // Leaving it out preserves the existing photo.
    if (fields.image_url !== undefined) {
      updates.image_url = fields.image_url
    }

    return optimisticWrite({
      apply: () => {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, ...updates } : i)),
        )
        return () =>
          setItems((prev) => prev.map((i) => (i.id === itemId ? item : i)))
      },
      run: () => supabase.from('items').update(updates).eq('id', itemId),
    })
  }

  // Removes an item entirely. Only safe when nothing has sold: the sales FK is
  // ON DELETE RESTRICT, so the DB rejects deleting an item with any sales rows.
  // We surface that as a friendly message rather than the raw constraint error.
  function deleteItem(itemId) {
    return optimisticWrite({
      apply: () => {
        const prev = items
        setItems((prevItems) => prevItems.filter((i) => i.id !== itemId))
        return () => setItems(prev) // restore on failure
      },
      run: () => supabase.from('items').delete().eq('id', itemId),
      mapError: (error) =>
        error.code === '23503'
          ? {
              message:
                "Can't delete an item that has sales — use a correction instead",
            }
          : error,
    })
  }

  async function addItem(fields) {
    let result
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      // Session can expire between page load and submit; without this guard
      // user.id would throw and surface as a silent rejection.
      if (!user) {
        return {
          error: {
            message: 'Your session has expired — please sign in again.',
          },
        }
      }

      result = await supabase
        .from('items')
        .insert({
          ...fields,
          artist_id: user.id,
          quantity_remaining: fields.quantity_total,
        })
        .select()
        .single()
    } catch {
      return { error: CONNECTION_ERROR }
    }

    if (result.error) return { error: result.error }
    setItems((prev) => [...prev, result.data])
    return { error: null }
  }

  return {
    items,
    loading,
    error,
    lastSale,
    sellItem,
    correctItem,
    editItem,
    deleteItem,
    addItem,
    refetch: fetchItems,
  }
}
