import {
    AuthenticationState,
    BufferJSON,
    initAuthCreds,
    SignalKeyStore
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
    const { error } = await supabaseAdmin
        .from('whatsbot_sessions')
        .upsert({
            store_id: storeId,
            session_data: null,
            connected_phone: null,
            connection_status: 'DISCONNECTED',
            last_disconnect_reason: 'logged_out',
            updated_at: new Date().toISOString()
        }, { onConflict: 'store_id' });

    if (error) {
        console.error(`[WhatsBot ${storeId}] Erro ao limpar sessão salva:`, error.message);
    }
};

export const useWhatsBotDatabaseAuth = async (
    storeId: string
): Promise<{ state: AuthenticationState; saveCreds: () => Promise<void> }> => {
    let creds = initAuthCreds();
    const keys: Record<string, any> = {};

    const { data: sessionData, error: fetchError } = await supabaseAdmin
        .from('whatsbot_sessions')
        .select('session_data')
        .eq('store_id', storeId)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
        console.error(`[WhatsBot ${storeId}] Erro ao carregar sessão do banco:`, fetchError.message);
    }

    if (sessionData?.session_data) {
        const parsed = JSON.parse(JSON.stringify(sessionData.session_data), BufferJSON.reviver);
        creds = parsed.creds;
        Object.assign(keys, parsed.keys);
    }

    const saveCreds = async () => {
        const sessionToSave = { creds, keys };
        const value = JSON.parse(JSON.stringify(sessionToSave, BufferJSON.replacer));

        await updateWhatsBotSession(storeId, {
            session_data: value
        });
    };

    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const data: Record<string, any> = {};
                    for (const id of ids) {
                        const key = `${type}-${id}`;
                        if (keys[key]) {
                            data[id] = keys[key];
                        }
                    }
                    return data;
                },
                set: (newKeys) => {
                    Object.assign(keys, newKeys);
                    void saveCreds();
                }
            } as SignalKeyStore
        },
        saveCreds
    };
};
