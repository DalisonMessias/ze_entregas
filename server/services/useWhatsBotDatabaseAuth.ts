import {
    AuthenticationState,
    BufferJSON,
    initAuthCreds,
    proto,
    SignalKeyStore,
    SignalKeyStoreWithTransaction
} from '@whiskeysockets/baileys';
import { supabaseAdmin } from './supabaseClient.js';

export type WhatsBotConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'WAITING_QR';

export interface WhatsBotSessionUpdates {
    session_data?: any | null;
    connection_status?: WhatsBotConnectionStatus;
    connected_phone?: string | null;
    last_connected_at?: string | Date | null;
    last_disconnect_reason?: string | null;
    updated_at?: string | Date;
}

export const updateWhatsBotSession = async (storeId: string, updates: WhatsBotSessionUpdates) => {
    const payload = {
        store_id: storeId,
        ...updates,
        updated_at: updates.updated_at || new Date().toISOString()
    };

    const { error } = await supabaseAdmin
        .from('whatsbot_sessions')
        .upsert(payload, { onConflict: 'store_id' });

    if (error) {
        console.error(`[WhatsBot ${storeId}] Erro ao atualizar sessão:`, error.message);
    }
};

export const clearWhatsBotSessionData = async (storeId: string) => {
    // Limpa as credenciais principais
    const { error: sessionErr } = await supabaseAdmin
        .from('whatsbot_sessions')
        .upsert({
            store_id: storeId,
            session_data: null,
            connected_phone: null,
            connection_status: 'DISCONNECTED',
            last_disconnect_reason: 'logged_out',
            updated_at: new Date().toISOString()
        }, { onConflict: 'store_id' });

    if (sessionErr) {
        console.error(`[WhatsBot ${storeId}] Erro ao limpar sessão salva:`, sessionErr.message);
    }

    // Limpa todas as chaves de sinal individuais
    const { error: keysErr } = await supabaseAdmin
        .from('whatsbot_auth_keys')
        .delete()
        .eq('store_id', storeId);

    if (keysErr) {
        console.error(`[WhatsBot ${storeId}] Erro ao limpar chaves de autenticação:`, keysErr.message);
    }
};

export const useWhatsBotDatabaseAuth = async (
    storeId: string
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
    let creds = initAuthCreds();

    // Carrega as credenciais principais da sessão
    const { data: sessionData, error: fetchError } = await supabaseAdmin
        .from('whatsbot_sessions')
        .select('session_data')
        .eq('store_id', storeId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`[WhatsBot ${storeId}] Erro ao carregar sessão do banco:`, fetchError.message);
    }

    if (sessionData?.session_data) {
        try {
            const parsed = JSON.parse(JSON.stringify(sessionData.session_data), BufferJSON.reviver);
            creds = parsed.creds ?? parsed;
        } catch (e) {
            console.warn(`[WhatsBot ${storeId}] Falha ao fazer parse das credenciais, iniciando do zero.`);
            creds = initAuthCreds();
        }
    }

    const saveCreds = async () => {
        const value = JSON.parse(JSON.stringify({ creds }, BufferJSON.replacer));
        await updateWhatsBotSession(storeId, { session_data: value });
    };

    const keys: SignalKeyStore = {
        get: async (type, ids) => {
            const result: Record<string, any> = {};
            if (!ids.length) return result;

            const { data, error } = await supabaseAdmin
                .from('whatsbot_auth_keys')
                .select('key_id, key_data')
                .eq('store_id', storeId)
                .eq('key_type', type)
                .in('key_id', ids);

            if (error) {
                console.error(`[WhatsBot ${storeId}] Erro ao buscar chaves (${type}):`, error.message);
                return result;
            }

            for (const row of data ?? []) {
                try {
                    result[row.key_id] = JSON.parse(JSON.stringify(row.key_data), BufferJSON.reviver);
                } catch {
                    // ignora chave corrompida
                }
            }

            return result;
        },
        set: async (data) => {
            for (const [type, keyMap] of Object.entries(data)) {
                for (const [keyId, value] of Object.entries(keyMap as Record<string, any>)) {
                    if (value === null || value === undefined) {
                        // Remove a chave se o valor for nulo
                        await supabaseAdmin
                            .from('whatsbot_auth_keys')
                            .delete()
                            .eq('store_id', storeId)
                            .eq('key_type', type)
                            .eq('key_id', keyId);
                    } else {
                        const keyData = JSON.parse(JSON.stringify(value, BufferJSON.replacer));
                        await supabaseAdmin
                            .from('whatsbot_auth_keys')
                            .upsert({
                                store_id: storeId,
                                key_type: type,
                                key_id: keyId,
                                key_data: keyData,
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'store_id,key_type,key_id' });
                    }
                }
            }
        }
    };

    return {
        state: {
            creds,
            keys
        },
        saveCreds
    };
};
