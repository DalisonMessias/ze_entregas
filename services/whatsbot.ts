import axios from 'axios';
import { WhatsBotConfigPayload, WhatsBotStatus } from '../types';
import { getWhatsBotApiBaseUrl } from '../utils/apiConfig';
import { getClient } from './cloud';
import { getImpersonationState } from './impersonation';

const getImpersonationHeaders = (): Record<string, string> => {
    if (typeof window === 'undefined') return {};

    const state = getImpersonationState();
    if (!state?.isActive || !state.storeId) {
        return {};
    }

    return {
        'x-impersonation-store-id': state.storeId
    };
};

const getAuthHeaders = async () => {
    const client = getClient();
    if (!client) {
        throw new Error('Cliente Supabase nao disponivel.');
    }

    const { data: { session } } = await client.auth.getSession();
    if (!session?.access_token) {
        throw new Error('Sessao expirada. Faca login novamente.');
    }

    return {
        Authorization: `Bearer ${session.access_token}`,
        ...getImpersonationHeaders()
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
