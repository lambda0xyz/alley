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

  async function sellItem(itemId, quantity = 1) {
    // Optimistic update — change the count immediately in UI
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, quantity_remaining: item.quantity_remaining - quantity }
        : item
    ))

    const { error } = await supabase
      .from('sales')
      .insert({ item_id: itemId, quantity_sold: quantity })

    if (error) {
      // Roll back on failure
      setItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, quantity_remaining: item.quantity_remaining + quantity }
          : item
      ))
      return { error }
    }

    return { error: null }
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

  return { items, loading, error, sellItem, addItem, refetch: fetchItems }
}