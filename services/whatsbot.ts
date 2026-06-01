import axios from 'axios';
import { WhatsBotConfigPayload, WhatsBotStatus } from '../types';
import { getWhatsBotApiBaseUrl, getApiRootUrl } from '../utils/apiConfig';
import { getClient } from './cloud';
import { getImpersonationStoreId } from './impersonation';

export interface WhatsBotRequestOptions {
    storeId?: string | null;
    scheduledAt?: string | null;
    ai_enabled?: boolean;
    ai_context?: string;
    ai_name?: string;
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
    imageUrl: string | null = null,
    closedImageUrl: string | null = null,
    options?: WhatsBotRequestOptions
): Promise<WhatsBotStatus> => {
    const payload = { 
        customMessage, 
        customClosedMessage, 
        imageUrl, 
        closedImageUrl,
        ai_enabled: options?.ai_enabled,
        ai_context: options?.ai_context,
        ai_name: options?.ai_name
    };
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

export const getWhatsBotCampaigns = async (options?: WhatsBotRequestOptions): Promise<any[]> => {
    const headers = await getAuthHeaders(options);
    const { data } = await axios.get<any[]>(`${getWhatsBotApiBaseUrl()}/campaigns`, { headers });
    return data;
};

export const createWhatsBotCampaign = async (
    name: string,
    message: string,
    recipients: string[],
    imageUrl: string | null = null,
    linkUrl: string | null = null,
    options?: WhatsBotRequestOptions
): Promise<any> => {
    const headers = await getAuthHeaders(options);
    const { data } = await axios.post<any>(`${getWhatsBotApiBaseUrl()}/campaigns`, { name, message, recipients, imageUrl, linkUrl }, { headers });
    return data;
};

export const stopWhatsBotCampaign = async (
    campaignId: string,
    options?: WhatsBotRequestOptions
): Promise<any> => {
    const headers = await getAuthHeaders(options);
    const { data } = await axios.post<any>(`${getWhatsBotApiBaseUrl()}/campaigns/${campaignId}/stop`, {}, { headers });
    return data;
};

export const getWhatsBotAvailableContacts = async (options?: WhatsBotRequestOptions): Promise<any[]> => {
    const headers = await getAuthHeaders(options);
    const { data } = await axios.get<any[]>(`${getWhatsBotApiBaseUrl()}/contacts`, { headers });
    return data;
};
export const deleteWhatsBotCampaign = async (
    campaignId: string,
    options?: WhatsBotRequestOptions
): Promise<any> => {
    const headers = await getAuthHeaders(options);
    const { data } = await axios.delete<any>(`${getWhatsBotApiBaseUrl()}/campaigns/${campaignId}`, { headers });
    return data;
};
export const getWhatsBotTriggers = async (options?: WhatsBotRequestOptions): Promise<any[]> => {
    const client = getClient();
    if (!client) throw new Error('Cliente Supabase nao disponivel.');

    const storeId = options?.storeId || getImpersonationStoreId();
    if (!storeId) return [];

    const { data, error } = await client
        .from('whatsbot_triggers')
        .select('*')
        .eq('store_id', storeId)
        .order('keyword', { ascending: true });

    if (error) {
        console.warn('Erro ao ler gatilhos do Supabase:', error);
        return [];
    }
    return data || [];
};

export const createWhatsBotTrigger = async (
    keyword: string,
    response: string,
    options?: WhatsBotRequestOptions
): Promise<any> => {
    const client = getClient();
    if (!client) throw new Error('Cliente Supabase nao disponivel.');

    const storeId = options?.storeId || getImpersonationStoreId();
    if (!storeId) throw new Error('Store ID nao identificado.');

    const { data, error } = await client
        .from('whatsbot_triggers')
        .upsert({ 
            store_id: storeId, 
            keyword: keyword.trim(), 
            response: response.trim(), 
            updated_at: new Date().toISOString() 
        }, { onConflict: 'store_id,keyword' })
        .select()
        .single();

    if (error) throw error;
    return data;
};

export const deleteWhatsBotTrigger = async (
    triggerId: string,
    options?: WhatsBotRequestOptions
): Promise<any> => {
    const client = getClient();
    if (!client) throw new Error('Cliente Supabase nao disponivel.');

    const { error } = await client
        .from('whatsbot_triggers')
        .delete()
        .eq('id', triggerId);

    if (error) throw error;
    return { success: true };
};

export const clearWhatsBotCache = async (
    contactPhone?: string,
    options?: WhatsBotRequestOptions
): Promise<{ success: boolean }> => {
    const headers = await getAuthHeaders(options);
    const { data } = await axios.post<{ success: boolean }>(
        `${getWhatsBotApiBaseUrl()}/clear-cache`, 
        { contactPhone }, 
        { headers }
    );
    return data;
};

export const getWhatsBotKnowledge = async (options?: WhatsBotRequestOptions): Promise<any[]> => {
    const storeId = options?.storeId || getImpersonationStoreId();
    if (!storeId) throw new Error('Store ID nao identificado.');
    const headers = await getAuthHeaders(options);
    const { data } = await axios.get<any[]>(`${getApiRootUrl()}/api/ze-assistant/knowledge/${storeId}`, { headers });
    return data;
};

export const addWhatsBotKnowledge = async (
    question: string,
    answer: string,
    options?: WhatsBotRequestOptions
): Promise<any> => {
    const storeId = options?.storeId || getImpersonationStoreId();
    if (!storeId) throw new Error('Store ID nao identificado.');
    const headers = await getAuthHeaders(options);
    const { data } = await axios.post<any>(
        `${getApiRootUrl()}/api/ze-assistant/knowledge/${storeId}`, 
        { question, answer }, 
        { headers }
    );
    return data;
};

export const deleteWhatsBotKnowledge = async (
    id: string,
    options?: WhatsBotRequestOptions
): Promise<{ success: boolean }> => {
    const headers = await getAuthHeaders(options);
    const { data } = await axios.delete<{ success: boolean }>(
        `${getApiRootUrl()}/api/ze-assistant/knowledge/${id}`, 
        { headers }
    );
    return data;
};

export const syncWhatsBotKnowledge = async (options?: WhatsBotRequestOptions): Promise<any> => {
    const storeId = options?.storeId || getImpersonationStoreId();
    if (!storeId) throw new Error('Store ID nao identificado.');
    const headers = await getAuthHeaders(options);
    const { data } = await axios.post<any>(
        `${getApiRootUrl()}/api/ze-assistant/knowledge/${storeId}/sync`, 
        {}, 
        { headers }
    );
    return data;
};

export const testWhatsBotAIMessage = async (
    messageText: string,
    customerPhone: string = '553598393707',
    customerName: string = 'Cliente de Teste',
    options?: WhatsBotRequestOptions
): Promise<any> => {
    const storeId = options?.storeId || getImpersonationStoreId();
    if (!storeId) throw new Error('Store ID nao identificado.');
    const headers = await getAuthHeaders(options);
    const { data } = await axios.post<any>(
        `${getApiRootUrl()}/api/ze-assistant/process-message`, 
        {
            storeId,
            conversationId: `${customerPhone}@c.us`,
            customerPhone,
            customerName,
            messageText,
            isTest: true,
            aiName: options?.ai_name,
            aiContext: options?.ai_context
        }, 
        { headers }
    );
    return data;
};


