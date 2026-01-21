import { useEffect, useMemo, useState } from 'react'
import { initSupabase } from '../../services/cloud'
import { cacheManager, CacheKeys } from '../../utils/cacheManager'

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

    const load = async (retries = 3) => {
      if (!sb) {
        if (mounted) setState(s => ({ ...s, loading: false, error: 'Supabase não inicializado' }))
        return
      }

      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        if (mounted) setState({ city: null, displayName: null, loading: false, error: null })
        return
      }

      // Verificar cache primeiro - OTIMIZAÇÃO
      const cachedCity = cacheManager.get<string>(CacheKeys.userCity(user.id))
      if (cachedCity && mounted) {
        setState({ city: cachedCity, displayName: cachedCity, loading: false, error: null })
        return
      }

      try {
        // Buscar no banco apenas se não está em cache
        const { data, error } = await sb.from('user_profiles').select('city').eq('id', user.id).single()

        if (error) throw error

        const city = (data?.city as string) || null

        // Armazenar no cache
        if (city) {
          cacheManager.set(CacheKeys.userCity(user.id), city, 10 * 60 * 1000) // 10 minutos
        }

        if (mounted) {
          setState({ city, displayName: city, loading: false, error: null })
        }

        // Configurar realtime updates
        channel = sb.channel('user-city-updates').on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${user.id}`
        }, payload => {
          const newCity = (payload.new as any)?.city || null
          // Atualizar cache
          if (newCity) {
            cacheManager.set(CacheKeys.userCity(user.id), newCity, 10 * 60 * 1000)
          }
          setState(s => ({ ...s, city: newCity, displayName: newCity }))
        }).subscribe()

      } catch (err: any) {
        console.error('Erro ao carregar cidade do usuário:', err)

        // Retry com backoff exponencial
        if (retries > 0) {
          const delay = Math.pow(2, 3 - retries) * 1000
          setTimeout(() => load(retries - 1), delay)
          return
        }

        // Usar cache antigo como fallback
        const cachedCity = cacheManager.get<string>(CacheKeys.userCity(user.id))
        if (cachedCity && mounted) {
          setState({
            city: cachedCity,
            displayName: cachedCity,
            loading: false,
            error: 'Usando dados em cache (sem conexão)'
          })
          return
        }

        if (mounted) {
          setState({ city: null, displayName: null, loading: false, error: err?.message || 'Erro desconhecido' })
        }
      }
    }

    load()

    return () => {
      mounted = false
      if (channel) sb?.removeChannel(channel)
    }
  }, [sb])

  return state
}
