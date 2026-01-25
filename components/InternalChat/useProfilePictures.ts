/**
 * Hook para buscar e cachear fotos de perfil de contatos
 */
import { useState, useCallback } from 'react';

import { getApiBaseUrl } from '../../utils/apiConfig';

interface ProfilePictureCache {
    [jid: string]: string | null;
}

export const useProfilePictures = () => {
    const [cache, setCache] = useState<ProfilePictureCache>({});
    const [loading, setLoading] = useState<Set<string>>(new Set());

    const fetchProfilePicture = useCallback(async (jid: string): Promise<string | null> => {
        // Se já está em cache, retornar
        if (cache[jid] !== undefined) {
            return cache[jid];
        }

        // Se já está carregando, não fazer nova requisição
        if (loading.has(jid)) {
            return null;
        }

        setLoading(prev => new Set(prev).add(jid));

        try {
            const response = await fetch(`${getApiBaseUrl()}/profile-picture/${jid}`);
            const data = await response.json();

            const profilePicUrl = data.profilePicUrl || null;

            // Salvar no cache
            setCache(prev => ({ ...prev, [jid]: profilePicUrl }));

            return profilePicUrl;
        } catch (error) {
            console.error('Erro ao buscar foto de perfil:', error);
            setCache(prev => ({ ...prev, [jid]: null }));
            return null;
        } finally {
            setLoading(prev => {
                const newSet = new Set(prev);
                newSet.delete(jid);
                return newSet;
            });
        }
    }, [cache, loading]);

    return { fetchProfilePicture, cache };
};
