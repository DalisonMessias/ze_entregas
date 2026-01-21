import { cacheManager, CacheKeys } from './cacheManager';
import { getClient } from '../services/cloud';

/**
 * Utilitários para buscar dados com cache automático
 * Reduz chamadas ao banco de dados e melhora performance
 */

interface FetchOptions {
    forceRefresh?: boolean;
    ttl?: number;
    retries?: number;
}

/**
 * Busca dados do perfil do usuário com cache
 */
export async function fetchUserProfile(options: FetchOptions = {}) {
    const { forceRefresh = false, ttl = 5 * 60 * 1000, retries = 3 } = options;

    try {
        const supabase = getClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        const cacheKey = CacheKeys.userProfile(user.id);

        // Verificar cache se não forçar refresh
        if (!forceRefresh) {
            const cached = cacheManager.get(cacheKey);
            if (cached) return cached;
        }

        // Buscar do banco com retry
        let lastError: any;
        for (let i = 0; i < retries; i++) {
            try {
                const { data: profile, error } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                // Armazenar no cache
                const profileData = {
                    ...profile,
                    id: user.id,
                    email: user.email
                };
                cacheManager.set(cacheKey, profileData, ttl);

                return profileData;
            } catch (err) {
                lastError = err;
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
            }
        }

        // Fallback para cache em caso de falha
        const cached = cacheManager.get(cacheKey);
        if (cached) {
            console.warn('Usando cache após falha na busca');
            return cached;
        }

        throw lastError;
    } catch (err) {
        console.error('Erro ao buscar perfil do usuário:', err);
        return null;
    }
}

/**
 * Busca cidade do usuário com cache
 */
export async function fetchUserCity(options: FetchOptions = {}): Promise<string | null> {
    const { forceRefresh = false, ttl = 10 * 60 * 1000, retries = 3 } = options;

    try {
        const supabase = getClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return null;

        const cacheKey = CacheKeys.userCity(user.id);

        // Verificar cache
        if (!forceRefresh) {
            const cached = cacheManager.get<string>(cacheKey);
            if (cached) return cached;
        }

        // Buscar do banco com retry
        let lastError: any;
        for (let i = 0; i < retries; i++) {
            try {
                const { data, error } = await supabase
                    .from('user_profiles')
                    .select('city')
                    .eq('id', user.id)
                    .single();

                if (error) throw error;

                const city = data?.city || null;

                // Armazenar no cache
                if (city) {
                    cacheManager.set(cacheKey, city, ttl);
                }

                return city;
            } catch (err) {
                lastError = err;
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
            }
        }

        // Fallback para cache
        const cached = cacheManager.get<string>(cacheKey);
        if (cached) {
            console.warn('Usando cache de cidade após falha');
            return cached;
        }

        throw lastError;
    } catch (err) {
        console.error('Erro ao buscar cidade:', err);
        return null;
    }
}

/**
 * Busca qualquer dado com cache automático
 */
export async function fetchWithCache<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    options: FetchOptions = {}
): Promise<T | null> {
    const { forceRefresh = false, ttl = 5 * 60 * 1000, retries = 3 } = options;

    try {
        // Verificar cache
        if (!forceRefresh) {
            const cached = cacheManager.get<T>(cacheKey);
            if (cached) return cached;
        }

        // Buscar com retry
        let lastError: any;
        for (let i = 0; i < retries; i++) {
            try {
                const data = await fetchFn();

                // Armazenar no cache
                if (data) {
                    cacheManager.set(cacheKey, data, ttl);
                }

                return data;
            } catch (err) {
                lastError = err;
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
            }
        }

        // Fallback para cache
        const cached = cacheManager.get<T>(cacheKey);
        if (cached) {
            console.warn('Usando cache após falha na busca');
            return cached;
        }

        throw lastError;
    } catch (err) {
        console.error('Erro ao buscar dados:', err);
        return null;
    }
}

/**
 * Invalida cache do usuário (útil após logout ou updates)
 */
export async function invalidateUserCache() {
    const supabase = getClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
        cacheManager.delete(CacheKeys.userProfile(user.id));
        cacheManager.delete(CacheKeys.userCity(user.id));
        cacheManager.delete(CacheKeys.userPermissions(user.id));
    }
}

/**
 * Invalida todo o cache
 */
export function clearAllCache() {
    cacheManager.clear();
}
