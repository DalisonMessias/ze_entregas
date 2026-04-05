import axios from 'axios';
import { WhatsBotConfigPayload, WhatsBotStatus } from '../types';
import { getWhatsBotApiBaseUrl } from '../utils/apiConfig';
import { getClient } from './cloud';

const getAuthHeaders = async () => {
    const client = getClient();
    if (!client) {
        throw new Error('Cliente Supabase não disponível.');
    }

    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Sessão expirada. Faça login novamente.');
    }

    return {
        Authorization: `Bearer ${session.access_token}`
    };
};

export const getWhatsBotStatus = async (): Promise<WhatsBotStatus> => {
    const headers = await getAuthHeaders();
    const { data } = await axios.get<WhatsBotStatus>(`${getWhatsBotApiBaseUrl()}/status`, { headers });
    return data;
};

export const updateWhatsBotConfig = async (payload: WhatsBotConfigPayload): Promise<WhatsBotStatus> => {
    const headers = await getAuthHeaders();
    const { data } = await axios.put<WhatsBotStatus>(`${getWhatsBotApiBaseUrl()}/config`, payload, { headers });
    return data;
};

export const startWhatsBot = async (): Promise<WhatsBotStatus> => {
    const headers = await getAuthHeaders();
    const { data } = await axios.post<WhatsBotStatus>(`${getWhatsBotApiBaseUrl()}/start`, {}, { headers });
    return data;
};

export const stopWhatsBot = async (): Promise<WhatsBotStatus> => {
    const headers = await getAuthHeaders();
    const { data } = await axios.post<WhatsBotStatus>(`${getWhatsBotApiBaseUrl()}/stop`, {}, { headers });
    return data;
};
