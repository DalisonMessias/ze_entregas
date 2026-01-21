import { useState, useEffect } from 'react';
import { getClient } from '../services/cloud';
import { cacheManager, CacheKeys } from '../utils/cacheManager';

interface UserCacheData {
    city: string | null;
    displayName: string | null;
    role: string | null;
}

/**
 * Hook otimizado para buscar dados do usuário com cache
 * Reduz buscas redundantes ao banco de dados
 */
export const useUserCache = () => {
    const [data, setData] = useState<UserCacheData>({
        city: null,
        displayName: null,
        role: null
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const loadData = async (retries = 3) => {
            try {
                const supabase = getClient();
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    if (mounted) {
                        setData({ city: null, displayName: null, role: null });
                        setLoading(false);
                    }
                    return;
                }

                // Verificar cache primeiro
                const cachedCity = cacheManager.get<string>(CacheKeys.userCity(user.id));
                if (cachedCity) {
                    if (mounted) {
                        setData({
                            city: cachedCity,
                            displayName: cachedCity,
                            role: user.user_metadata?.role || null
                        });
                        setLoading(false);
                    }
                    return;
                }

                // Buscar do banco apenas se não está em cache
                const { data: profile, error: profileError } = await supabase
                    .from('user_profiles')
                    .select('city')
                    .eq('id', user.id)
                    .single();

                if (profileError) {
                    throw profileError;
                }

                const city = profile?.city || null;

                // Armazenar no cache
                if (city) {
                    cacheManager.set(CacheKeys.userCity(user.id), city);
                }

                if (mounted) {
                    setData({
                        city,
                        displayName: city,
                        role: user.user_metadata?.role || null
                    });
                    setError(null);
                }
            } catch (err) {
                console.error('Erro ao carregar dados do usuário:', err);

                // Retry com backoff exponencial
                if (retries > 0) {
                    const delay = Math.pow(2, 3 - retries) * 1000;
                    setTimeout(() => loadData(retries - 1), delay);
                    return;
                }

                // Usar cache antigo como fallback
                const supabase = getClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const cachedCity = cacheManager.get<string>(CacheKeys.userCity(user.id));
                    if (cachedCity && mounted) {
                        setData({
                            city: cachedCity,
                            displayName: cachedCity,
                            role: user.user_metadata?.role || null
                        });
                        setError('Usando dados em cache (sem conexão)');
                        setLoading(false);
                        return;
                    }
                }

                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Erro desconhecido');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            mounted = false;
        };
    }, []);

    return {
        city: data.city,
        displayName: data.displayName,
        role: data.role,
        loading,
        error
    };
};
