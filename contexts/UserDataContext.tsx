import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getClient } from '../services/cloud';
import { cacheManager, CacheKeys } from '../utils/cacheManager';

interface UserProfile {
    id: string;
    city: string | null;
    role: string | null;
    email: string | null;
    name: string | null;
}

interface UserDataContextType {
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    clearCache: () => void;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

interface UserDataProviderProps {
    children: ReactNode;
}

export const UserDataProvider: React.FC<UserDataProviderProps> = ({ children }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadUserData = async (retries = 3): Promise<void> => {
        try {
            const supabase = getClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setProfile(null);
                setLoading(false);
                return;
            }

            // Verificar cache primeiro
            const cachedProfile = cacheManager.get<UserProfile>(CacheKeys.userProfile(user.id));
            if (cachedProfile) {
                setProfile(cachedProfile);
                setLoading(false);
                return;
            }

            // Buscar do banco
            const { data: userProfile, error: profileError } = await supabase
                .from('user_profiles')
                .select('city')
                .eq('id', user.id)
                .single();

            if (profileError) {
                throw profileError;
            }

            const profileData: UserProfile = {
                id: user.id,
                city: userProfile?.city || null,
                role: user.user_metadata?.role || null,
                email: user.email || null,
                name: user.user_metadata?.name || null
            };

            // Armazenar no cache
            cacheManager.set(CacheKeys.userProfile(user.id), profileData);

            setProfile(profileData);
            setError(null);
        } catch (err) {
            console.error('Erro ao carregar dados do usuário:', err);

            // Retry com backoff exponencial
            if (retries > 0) {
                const delay = Math.pow(2, 3 - retries) * 1000;
                setTimeout(() => loadUserData(retries - 1), delay);
                return;
            }

            // Usar cache antigo como fallback
            const supabase = getClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const cachedProfile = cacheManager.get<UserProfile>(CacheKeys.userProfile(user.id));
                if (cachedProfile) {
                    setProfile(cachedProfile);
                    setError('Usando dados em cache (sem conexão)');
                    setLoading(false);
                    return;
                }
            }

            setError(err instanceof Error ? err.message : 'Erro desconhecido');
        } finally {
            setLoading(false);
        }
    };

    const refresh = async () => {
        setLoading(true);
        setError(null);

        // Limpar cache antes de atualizar
        const supabase = getClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            cacheManager.delete(CacheKeys.userProfile(user.id));
        }

        await loadUserData();
    };

    const clearCache = () => {
        cacheManager.clear();
        setProfile(null);
    };

    useEffect(() => {
        loadUserData();
    }, []);

    return (
        <UserDataContext.Provider value={{ profile, loading, error, refresh, clearCache }}>
            {children}
        </UserDataContext.Provider>
    );
};

export const useUserData = (): UserDataContextType => {
    const context = useContext(UserDataContext);
    if (!context) {
        throw new Error('useUserData deve ser usado dentro de UserDataProvider');
    }
    return context;
};
