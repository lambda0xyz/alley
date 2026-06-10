import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useArtistItems() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setItems(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  // Records a sale row and optimistically adjusts the displayed stock.
  // A positive quantity_sold is a sale (stock down); a negative one is a
  // correction (stock back up). The DB trigger does remaining - quantity_sold,
  // so the optimistic math here mirrors it.
  async function recordSale(itemId, quantitySold, notes = null) {
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, quantity_remaining: item.quantity_remaining - quantitySold }
        : item
    ))

    const { error } = await supabase
      .from('sales')
      .insert({ item_id: itemId, quantity_sold: quantitySold, notes })

    if (error) {
      // Roll back on failure
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, quantity_remaining: item.quantity_remaining + quantitySold }
          : item
      ))
      return { error }
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

  async function addItem(fields) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('items')
      .insert({
        ...fields,
        artist_id: user.id,
        quantity_remaining: fields.quantity_total
      })
      .select()
      .single()

    if (error) return { error }
    setItems(prev => [...prev, data])
    return { error: null }
  }

  return { items, loading, error, sellItem, correctItem, addItem, refetch: fetchItems }
}