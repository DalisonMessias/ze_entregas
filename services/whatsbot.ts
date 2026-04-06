import axios from 'axios';
import { WhatsBotConfigPayload, WhatsBotStatus } from '../types';
import { getWhatsBotApiBaseUrl } from '../utils/apiConfig';
import { getClient } from './cloud';
import { getImpersonationStoreId } from './impersonation';

export interface WhatsBotRequestOptions {
    storeId?: string | null;
}

const getImpersonationHeaders = (options?: WhatsBotRequestOptions): Record<string, string> => {
    if (typeof window === 'undefined') return {};

    const storeId = options?.storeId || getImpersonationStoreId();
    if (!storeId) {
        return {};
    }

    return {
        'x-impersonation-store-id': storeId
    };
};

const getAuthHeaders = async (options?: WhatsBotRequestOptions) => {
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
        ...getImpersonationHeaders(options)
    };
};

export const getWhatsBotStatus = async (options?: WhatsBotRequestOptions): Promise<WhatsBotStatus> => {
    const headers = await getAuthHeaders(options);
    const { data } = await axios.get<WhatsBotStatus>(`${getWhatsBotApiBaseUrl()}/status`, { headers });
    return data;
};

export const updateWhatsBotConfig = async (
    customMessage: string,
    customClosedMessage: string,
    options?: WhatsBotRequestOptions
): Promise<WhatsBotStatus> => {
    const payload: WhatsBotConfigPayload = { customMessage, customClosedMessage };
    const headers = await getAuthHeaders(options);
    const { data } = await axios.put<WhatsBotStatus>(`${getWhatsBotApiBaseUrl()}/config`, payload, { headers });
    return data;
};

export const startWhatsBot = async (options?: WhatsBotRequestOptions): Promise<WhatsBotStatus> => {
    const headers = await getAuthHeaders(options);
    const { data } = await axios.post<WhatsBotStatus>(`${getWhatsBotApiBaseUrl()}/start`, {}, { headers });
    return data;
};

export const stopWhatsBot = async (options?: WhatsBotRequestOptions): Promise<WhatsBotStatus> => {
    const headers = await getAuthHeaders(options);
    const { data } = await axios.post<WhatsBotStatus>(`${getWhatsBotApiBaseUrl()}/stop`, {}, { headers });
    return data;
};

export const logoutWhatsBot = async (options?: WhatsBotRequestOptions): Promise<WhatsBotStatus> => {
    const headers = await getAuthHeaders(options);
    const { data } = await axios.post<WhatsBotStatus>(`${getWhatsBotApiBaseUrl()}/logout`, {}, { headers });
    return data;
};
