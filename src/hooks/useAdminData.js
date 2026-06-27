import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useAdminData() {
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    // Fetch all profiles that are not admins
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_admin', false)
      .order('display_name')

    if (profilesError) {
      setError(profilesError.message)
      setLoading(false)
      return
    }

    // Fetch all items with their sales aggregated
    const { data: items, error: itemsError } = await supabase
      .from('items')
      .select(`
        *,
        sales (
          id,
          quantity_sold,
          sold_at,
          notes
        )
      `)
      .order('created_at', { ascending: true })

    if (itemsError) {
      setError(itemsError.message)
      setLoading(false)
      return
    }

    // Group items under their artist
    const artistMap = profiles.map((profile) => ({
      ...profile,
      items: items.filter((item) => item.artist_id === profile.id),
    }))

    setArtists(artistMap)
    setLoading(false)
  }, [])

  useEffect(() => {
    // Fetch-on-mount plus a realtime subscription; fetchAll owns its loading state.
    fetchAll()

    // Real-time: re-fetch whenever items or sales change
    // Supabase broadcasts row-level changes over WebSocket
    const channel = supabase
      .channel('admin-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        () => fetchAll(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sales' },
        () => fetchAll(),
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchAll])

  return { artists, loading, error, refetch: fetchAll }
}
