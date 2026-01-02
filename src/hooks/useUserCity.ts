import { useEffect, useMemo, useState } from 'react'
import { initSupabase } from '../../services/cloud'

interface UserCityState {
  city: string | null
  displayName: string | null
  loading: boolean
  error: string | null
}

export function useUserCity() {
  const [state, setState] = useState<UserCityState>({ city: null, displayName: null, loading: true, error: null })
  const sb = useMemo(() => initSupabase(), [])

  useEffect(() => {
    let channel: any
    let mounted = true

    const load = async () => {
      if (!sb) {
        if (mounted) setState(s => ({ ...s, loading: false, error: 'Supabase não inicializado' }))
        return
      }
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        if (mounted) setState({ city: null, displayName: null, loading: false, error: null })
        return
      }
      const { data, error } = await sb.from('user_profiles').select('city').eq('id', user.id).single()
      if (mounted) setState({ city: (data?.city as string) || null, displayName: (data?.city as string) || null, loading: false, error: error ? error.message : null })
      channel = sb.channel('user-city-updates').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_profiles', filter: `id=eq.${user.id}` }, payload => {
        const newCity = (payload.new as any)?.city || null
        setState(s => ({ ...s, city: newCity, displayName: newCity }))
      }).subscribe()
    }

    load()

    return () => {
      mounted = false
      if (channel) sb?.removeChannel(channel)
    }
  }, [sb])

  return state
}
