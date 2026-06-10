import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Returned when an await rejects outright (network down, client misconfigured)
// rather than resolving with a Supabase { error } field. Keeps the { message }
// shape every caller expects.
const CONNECTION_ERROR = {
  message: "Couldn't reach the server — check your connection and try again.",
}

export function useArtistItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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
    fetchItems()
  }, [fetchItems])

  // Records a sale row and optimistically adjusts the displayed stock.
  // A positive quantity_sold is a sale (stock down); a negative one is a
  // correction (stock back up). The DB trigger does remaining - quantity_sold,
  // so the optimistic math here mirrors it.
  async function recordSale(itemId, quantitySold, notes = null) {
    const applyDelta = delta => setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, quantity_remaining: item.quantity_remaining + delta }
        : item
    ))

    applyDelta(-quantitySold) // optimistic

    let result
    try {
      result = await supabase
        .from('sales')
        .insert({ item_id: itemId, quantity_sold: quantitySold, notes })
    } catch {
      applyDelta(quantitySold) // roll back
      return { error: CONNECTION_ERROR }
    }

    if (result.error) {
      applyDelta(quantitySold) // roll back
      return { error: result.error }
    }

    return { error: null }
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
  async function editItem(itemId, fields) {
    const item = items.find(i => i.id === itemId)
    if (!item) return { error: { message: 'Item not found' } }

    const soldCount = item.quantity_total - item.quantity_remaining
    const newTotal = fields.quantity_total
    const newRemaining = item.quantity_remaining + (newTotal - item.quantity_total)

    if (newRemaining < 0) {
      return { error: { message: `Total can't be below the ${soldCount} already sold` } }
    }

    const updates = {
      name: fields.name,
      price: soldCount === 0 ? fields.price : item.price,
      quantity_total: newTotal,
      quantity_remaining: newRemaining,
    }

    const rollback = () => setItems(prev => prev.map(i => (i.id === itemId ? item : i)))
    setItems(prev => prev.map(i => (i.id === itemId ? { ...i, ...updates } : i)))

    let result
    try {
      result = await supabase.from('items').update(updates).eq('id', itemId)
    } catch {
      rollback()
      return { error: CONNECTION_ERROR }
    }

    if (result.error) {
      rollback()
      return { error: result.error }
    }

    return { error: null }
  }

  // Removes an item entirely. Only safe when nothing has sold: the sales FK is
  // ON DELETE RESTRICT, so the DB rejects deleting an item with any sales rows.
  // We surface that as a friendly message rather than the raw constraint error.
  async function deleteItem(itemId) {
    const prev = items
    setItems(prevItems => prevItems.filter(i => i.id !== itemId))

    let result
    try {
      result = await supabase.from('items').delete().eq('id', itemId)
    } catch {
      setItems(prev) // restore on failure
      return { error: CONNECTION_ERROR }
    }

    if (result.error) {
      setItems(prev) // restore on failure
      const blockedBySales = result.error.code === '23503'
      return {
        error: blockedBySales
          ? { message: "Can't delete an item that has sales — use a correction instead" }
          : result.error,
      }
    }

    return { error: null }
  }

  async function addItem(fields) {
    let result
    try {
      const { data: { user } } = await supabase.auth.getUser()
      // Session can expire between page load and submit; without this guard
      // user.id would throw and surface as a silent rejection.
      if (!user) {
        return { error: { message: 'Your session has expired — please sign in again.' } }
      }

      result = await supabase
        .from('items')
        .insert({
          ...fields,
          artist_id: user.id,
          quantity_remaining: fields.quantity_total
        })
        .select()
        .single()
    } catch {
      return { error: CONNECTION_ERROR }
    }

    if (result.error) return { error: result.error }
    setItems(prev => [...prev, result.data])
    return { error: null }
  }

  return { items, loading, error, sellItem, correctItem, editItem, deleteItem, addItem, refetch: fetchItems }
}
