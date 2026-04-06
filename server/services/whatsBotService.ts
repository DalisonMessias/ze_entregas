import makeWASocket, {
    Browsers,
    DisconnectReason,
    fetchLatestBaileysVersion,
    WAMessage,
    WASocket
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { supabaseAdmin } from './supabaseClient.js';
import {
    clearWhatsBotSessionData,
    updateWhatsBotSession,
    useWhatsBotDatabaseAuth,
    WhatsBotConnectionStatus
} from './useWhatsBotDatabaseAuth.js';
import { ZeAssistantAIService } from './zeAssistantAIService.js';

// Cache de Memória para evitar loops de Fallback (Silenciamento Instantâneo)
// Chave: "storeId:contactPhone:date"
const aiFallbackCache = new Set<string>();

// Instância global do serviço de IA
const aiService = new ZeAssistantAIService();

interface WhatsBotSettingsRow {
    store_id: string;
    enabled: boolean;
    custom_message: string | null;
    custom_closed_message: string | null;
    image_url: string | null;
    closed_image_url: string | null;
    timezone: string | null;
    ai_enabled: boolean;
    ai_context: string;
    ai_name: string;
}

interface StoreProfileRow {
    id: string;
    city_slug: string | null;
    store_slug: string | null;
    store_name: string | null;
    is_open: boolean | null;
}

interface WhatsBotSessionRow {
    store_id: string;
    connection_status: WhatsBotConnectionStatus | null;
    connected_phone?: string | null;
    last_connected_at?: string | null;
    last_disconnect_reason?: string | null;
    last_known_public_url?: string | null;
}

const updateSessionRow = async (storeId: string, data: Partial<WhatsBotSessionRow>) => {
    await supabaseAdmin.from('whatsbot_sessions').upsert({
        store_id: storeId,
        ...data,
        updated_at: new Date().toISOString()
    });
};

interface ReservedDailySend {
    allowed: boolean;
    history_id: string | null;
    current_status: string | null;
}

export interface WhatsBotStatusPayload {
    enabled: boolean;
    connectionStatus: WhatsBotConnectionStatus;
    qrCode?: string;
    connectedPhone?: string | null;
    customMessage: string;
    customClosedMessage: string;
    imageUrl?: string | null;
    closedImageUrl?: string | null;
    catalogUrl: string;
    ai_enabled: boolean;
    ai_context: string;
    ai_name: string;
    lastError?: string | null;
}

const DEFAULT_TIMEZONE = 'America/Sao_Paulo';
const DEFAULT_REPLY_PREFIX = 'Olá! Aqui está o link da nossa loja:';

const normalizePhone = (value?: string | null) => {
    if (!value) return '';
    return value.split('@')[0].split(':')[0].replace(/\D/g, '');
};

const normalizeDirectJid = (value?: string | null) => {
    const phone = normalizePhone(value);
    return phone ? `${phone}@s.whatsapp.net` : '';
};

const resolvePublicAppUrl = () => {
    // Busca em diversas variáveis de ambiente comuns no projeto
    const candidates = [
        process.env.PUBLIC_APP_URL,
        process.env.FRONTEND_URL,
        process.env.APP_BASE_URL,
        process.env.VITE_PUBLIC_APP_URL,
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '',
        'http://localhost:3000' // Fallback padrão
    ];

    const match = candidates.find((candidate) => !!candidate && candidate !== 'PUBLIC_APP_URL');
    return match ? match.replace(/\/+$/, '') : 'http://localhost:3000';
};

export const getLocalDateString = (timezone = DEFAULT_TIMEZONE, date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);

    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    return `${year}-${month}-${day}`;
};

const getSettings = async (storeId: string): Promise<WhatsBotSettingsRow> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('whatsbot_settings')
            .select('store_id, enabled, custom_message, custom_closed_message, image_url, closed_image_url, timezone, ai_enabled, ai_context, ai_name')
            .eq('store_id', storeId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return { 
                store_id: storeId, enabled: false, custom_message: null, custom_closed_message: null, 
                image_url: null, closed_image_url: null, timezone: DEFAULT_TIMEZONE, 
                ai_enabled: false, ai_context: '', ai_name: 'Assistente' 
            };
            throw error;
        }

        return {
            store_id: storeId,
            enabled: !!data?.enabled,
            custom_message: data?.custom_message || null,
            custom_closed_message: data?.custom_closed_message || null,
            image_url: data?.image_url || null,
            closed_image_url: data?.closed_image_url || null,
            timezone: data?.timezone || DEFAULT_TIMEZONE,
            ai_enabled: !!data?.ai_enabled,
            ai_context: data?.ai_context || '',
            ai_name: data?.ai_name || 'Assistente'
        };
    } catch (err: any) {
        // Se a coluna ai_name ainda não existir no banco, retornamos um fallback para não quebrar o dashboard
        if (err.code === '42703' || err.message?.includes('ai_name')) {
            console.warn(`[WhatsBot ${storeId}] Aviso: Coluna ai_name não encontrada. Usando padrão.`);
            const { data } = await supabaseAdmin
                .from('whatsbot_settings')
                .select('store_id, enabled, custom_message, custom_closed_message, image_url, closed_image_url, timezone, ai_enabled, ai_context')
                .eq('store_id', storeId)
                .single();
                
            return {
                store_id: storeId,
                enabled: !!data?.enabled,
                custom_message: data?.custom_message || null,
                custom_closed_message: data?.custom_closed_message || null,
                image_url: data?.image_url || null,
                closed_image_url: data?.closed_image_url || null,
                timezone: data?.timezone || DEFAULT_TIMEZONE,
                ai_enabled: !!data?.ai_enabled,
                ai_context: data?.ai_context || '',
                ai_name: 'Assistente' // Fallback
            };
        }
        throw err;
    }
};

const upsertSettings = async (
    storeId: string,
    updates: Partial<WhatsBotSettingsRow>
) => {
    try {
        // 1. Primeiro buscamos as configurações atuais para preservar o que não deve ser alterado
        const { data: current, error: fetchError } = await supabaseAdmin
            .from('whatsbot_settings')
            .select('ai_enabled, ai_context, ai_name')
            .eq('store_id', storeId)
            .single();

        // Se houver erro de "not found", tratamos como objeto vazio
        const existing = (!fetchError && current) ? current : { ai_enabled: false, ai_context: '', ai_name: 'Assistente' };

        const payload: any = {
            store_id: storeId,
            timezone: DEFAULT_TIMEZONE,
            // Preservamos a IA se ela não estiver nos updates
            ai_enabled: updates.ai_enabled !== undefined ? updates.ai_enabled : existing.ai_enabled,
            ai_context: updates.ai_context !== undefined ? updates.ai_context : existing.ai_context,
            ai_name: updates.ai_name !== undefined ? updates.ai_name : existing.ai_name,
            ...updates,
            updated_at: new Date().toISOString()
        };

        console.log(`[WhatsBot ${storeId}] 💾 Atualizando configurações (IA Ativa: ${payload.ai_enabled})`);

        const { error } = await supabaseAdmin
            .from('whatsbot_settings')
            .upsert(payload, { onConflict: 'store_id' });

        if (error) {
            // Se o erro for de coluna inexistente (ai_name), tentamos sem ela
            if (error.code === 'PGRST204' || error.message?.includes('ai_name')) {
                console.warn(`[WhatsBot ${storeId}] Aviso: Tentando upsert sem ai_name por incompatibilidade de schema.`);
                delete payload.ai_name;
                const { error: retryError } = await supabaseAdmin
                    .from('whatsbot_settings')
                    .upsert(payload, { onConflict: 'store_id' });
                if (retryError) throw retryError;
            } else {
                throw error;
            }
        }
    } catch (error: any) {
        console.error(`[WhatsBot ${storeId}] ❌ Erro ao fazer upsertSettings:`, error.message || error);
        throw error;
    }
};

const getStoreProfile = async (storeId: string): Promise<StoreProfileRow> => {
    const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, city_slug, store_slug, store_name, is_open')
        .eq('id', storeId)
        .single();

    if (error || !data) {
        throw error || new Error('Perfil da loja não encontrado.');
    }

    return data;
};

const getSessionRow = async (storeId: string): Promise<WhatsBotSessionRow | null> => {
    const { data, error } = await supabaseAdmin
        .from('whatsbot_sessions')
        .select('store_id, connection_status, connected_phone, last_disconnect_reason, last_known_public_url')
        .eq('store_id', storeId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    return data || null;
};

const markSendHistorySent = async (historyId: string | null) => {
    if (!historyId) return;

    await supabaseAdmin
        .from('whatsbot_send_history')
        .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_error: null
        })
        .eq('id', historyId);
};

const markSendHistoryFailed = async (historyId: string | null, errorMessage: string) => {
    if (!historyId) return;

    await supabaseAdmin
        .from('whatsbot_send_history')
        .update({
            status: 'failed',
            last_error: errorMessage,
            updated_at: new Date().toISOString()
        })
        .eq('id', historyId);
};

const reserveDailySend = async (params: {
    storeId: string;
    contactPhone: string;
    contactJid: string;
    sendDateLocal: string;
    messageSource: 'custom' | 'catalog_default';
    messageBody: string;
    inboundMessageId?: string | null;
    isClosedMessage?: boolean;
}) => {
    const { data, error } = await supabaseAdmin.rpc('reserve_whatsbot_daily_send', {
        p_store_id: params.storeId,
        p_contact_phone: params.contactPhone,
        p_contact_jid: params.contactJid,
        p_send_date_local: params.sendDateLocal,
        p_message_source: params.messageSource,
        p_message_body: params.messageBody,
        p_inbound_message_id: params.inboundMessageId || null,
        p_is_closed_message: !!params.isClosedMessage
    });

    if (error) {
        throw error;
    }

    const row = Array.isArray(data) ? (data[0] as ReservedDailySend | undefined) : (data as ReservedDailySend | null);
    return row || { allowed: false, history_id: null, current_status: null };
};

const buildCatalogUrl = (store: StoreProfileRow, lastKnownUrl?: string | null) => {
    const baseUrl = lastKnownUrl || resolvePublicAppUrl();
    if (!baseUrl || !store.city_slug || !store.store_slug) {
        return '';
    }

    const cleanBase = baseUrl.replace(/\/+$/, '');
    return `${cleanBase}/${store.city_slug}/${store.store_slug}/produtos`;
};

export const buildWhatsBotReplyMessage = (params: {
    customMessage?: string | null;
    customClosedMessage?: string | null;
    catalogUrl: string;
    storeName?: string | null;
    isOpen?: boolean | null;
}) => {
    const message = (params.isOpen === false && params.customClosedMessage?.trim()) 
        ? params.customClosedMessage.trim() 
        : (params.customMessage?.trim() || '');

    if (message) {
        return message
            .replace(/\{\{\s*catalog_url\s*\}\}/gi, params.catalogUrl)
            .replace(/\{\s*catalogUrl\s*\}/g, params.catalogUrl);
    }

    if (!params.catalogUrl) {
        throw new Error('Não foi possível montar o link público do catálogo da loja.');
    }

    const storeLabel = params.storeName?.trim() ? ` da ${params.storeName.trim()}` : '';
    return `${DEFAULT_REPLY_PREFIX}${storeLabel} ${params.catalogUrl}`;
};

class WhatsBotInstance {
    private readonly storeId: string;
    private sock: WASocket | undefined;
    private connectionStatus: WhatsBotConnectionStatus = 'DISCONNECTED';
    private qrCode: string | undefined;
    private connectedPhone: string | null = null;
    private lastError: string | null = null;
    private enabled = false;
    private isConnecting = false;
    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private campaignTimer: NodeJS.Timeout | null = null;
    private isProcessingCampaign = false;
    private stopRequested = false;

    constructor(storeId: string) {
        this.storeId = storeId;
    }

    public getRuntimeStatus() {
        return {
            connectionStatus: this.connectionStatus,
            qrCode: this.qrCode,
            connectedPhone: this.connectedPhone,
            lastError: this.lastError
        };
    }

    public async logout() {
        this.enabled = false;
        this.stopRequested = true;

        if (this.sock) {
            try {
                console.log(`[WhatsBot ${this.storeId}] Solicitando logout do WhatsApp...`);
                await this.sock.logout('Usuário desconectou via painel.');
                (this.sock as any)?.end?.(undefined);
            } catch (err: any) {
                console.error(`[WhatsBot ${this.storeId}] Erro ao deslogar do WhatsApp:`, err.message);
                (this.sock as any)?.end?.(undefined);
            }
        }

        this.stopCampaignWorker();

        console.log(`[WhatsBot ${this.storeId}] Limpando dados de sessão do banco de dados...`);
        this.sock = undefined;
        this.connectionStatus = 'DISCONNECTED';
        this.qrCode = undefined;
        this.connectedPhone = null;

        await clearWhatsBotSessionData(this.storeId);
        console.log(`[WhatsBot ${this.storeId}] Logout concluído e banco de dados limpo.`);
    }

    public async getStatus(currentPublicUrl?: string | null): Promise<WhatsBotStatusPayload> {
        const [settings, store, session] = await Promise.all([
            getSettings(this.storeId),
            getStoreProfile(this.storeId),
            getSessionRow(this.storeId)
        ]);

        if (currentPublicUrl && currentPublicUrl !== 'PUBLIC_APP_URL' && currentPublicUrl !== session?.last_known_public_url) {
            await updateSessionRow(this.storeId, { last_known_public_url: currentPublicUrl });
            if (session) session.last_known_public_url = currentPublicUrl;
        }

        const runtime = this.getRuntimeStatus();
        const enabled = !!settings.enabled;
        const catalogUrl = buildCatalogUrl(store, session?.last_known_public_url);

        return {
            enabled,
            connectionStatus: enabled
                ? (runtime?.connectionStatus || session?.connection_status || 'DISCONNECTED')
                : 'DISCONNECTED',
            qrCode: enabled ? runtime.qrCode : undefined,
            connectedPhone: runtime.connectedPhone ?? session?.connected_phone ?? null,
            customMessage: settings.custom_message || '',
            customClosedMessage: settings.custom_closed_message || '',
            imageUrl: settings.image_url,
            closedImageUrl: settings.closed_image_url,
            catalogUrl,
            ai_enabled: !!settings.ai_enabled,
            ai_context: settings.ai_context || '',
            ai_name: settings.ai_name || 'Assistente',
            lastError: runtime.lastError ?? session?.last_disconnect_reason ?? null
        };
    }

    public async start() {
        this.enabled = true;
        this.stopRequested = false;

        if (
            this.connectionStatus === 'CONNECTED' ||
            this.connectionStatus === 'CONNECTING' ||
            this.connectionStatus === 'WAITING_QR'
        ) {
            return;
        }

        await this.connect();
    }

    public async stop() {
        this.enabled = false;
        this.stopRequested = true;
        this.clearReconnectTimer();
        this.qrCode = undefined;
        this.connectionStatus = 'DISCONNECTED';

        if (this.sock) {
            try {
                (this.sock as any)?.ws?.close();
            } catch { }
            try {
                (this.sock as any)?.end?.(undefined);
            } catch { }
        }

        this.stopCampaignWorker();
        this.sock = undefined;

        await updateWhatsBotSession(this.storeId, {
            connection_status: 'DISCONNECTED',
            connected_phone: this.connectedPhone,
            last_disconnect_reason: 'bot_stopped'
        });
    }

    public async deleteCampaign(campaignId: string) {
        // Remove destinatários primeiro (devido a FK)
        await supabaseAdmin
            .from('whatsbot_campaign_recipients')
            .delete()
            .eq('campaign_id', campaignId);

        // Remove a campanha
        const { error } = await supabaseAdmin
            .from('whatsbot_campaigns')
            .delete()
            .eq('id', campaignId)
            .eq('store_id', this.storeId);

        if (error) throw error;
    }

    private clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    private scheduleReconnect() {
        if (!this.enabled || this.stopRequested) {
            return;
        }

        this.clearReconnectTimer();
        const delay = Math.min(30000, 2000 * Math.max(1, 2 ** this.reconnectAttempts));
        this.reconnectAttempts += 1;

        this.reconnectTimer = setTimeout(() => {
            void this.connect();
        }, delay);
    }

    private async connect() {
        if (!this.enabled || this.stopRequested || this.isConnecting) {
            return;
        }

        this.isConnecting = true;
        this.connectionStatus = 'CONNECTING';
        this.qrCode = undefined;
        this.lastError = null;

        await updateWhatsBotSession(this.storeId, {
            connection_status: 'CONNECTING',
            last_disconnect_reason: null
        });

        try {
            const { state, saveCreds } = await useWhatsBotDatabaseAuth(this.storeId);
            const { version } = await fetchLatestBaileysVersion();

            if (this.sock) {
                try {
                    (this.sock as any)?.end?.(undefined);
                } catch { }
            }

            const sock = makeWASocket({
                version,
                printQRInTerminal: false,
                browser: Browsers.macOS('Desktop'),
                auth: state,
                logger: pino({ level: 'error' }),
                syncFullHistory: false,
                connectTimeoutMs: 60000,
                defaultQueryTimeoutMs: 60000
            });

            this.sock = sock;
            sock.ev.on('creds.update', saveCreds);
            this.setupEventHandlers(sock);
        } catch (error: any) {
            this.lastError = error?.message || 'Erro ao iniciar conexão do WhatsBot.';
            this.connectionStatus = 'DISCONNECTED';

            await updateWhatsBotSession(this.storeId, {
                connection_status: 'DISCONNECTED',
                last_disconnect_reason: this.lastError
            });

            this.scheduleReconnect();
        } finally {
            this.isConnecting = false;
        }
    }

    private async upsertContacts(contacts: { id: string; name?: string | null; notify?: string | null }[]) {
        if (!contacts.length) return;

        const contactData = contacts
            .map((c) => {
                const phone = normalizePhone(c.id);
                // Ignora grupos e números inválidos
                if (!phone || c.id.includes('@g.us') || c.id.includes('@broadcast')) return null;

                return {
                    store_id: this.storeId,
                    phone: phone,
                    push_name: c.notify || null,
                    name: c.name || null,
                    updated_at: new Date().toISOString()
                };
            })
            .filter((c): c is NonNullable<typeof c> => c !== null);

        if (!contactData.length) return;

        // Chunk para evitar limites do Postgres/Supabase em sincronizações de massa
        const chunkSize = 100;
        for (let i = 0; i < contactData.length; i += chunkSize) {
            const chunk = contactData.slice(i, i + chunkSize);
            const { error } = await supabaseAdmin
                .from('whatsbot_contacts')
                .upsert(chunk, { onConflict: 'store_id,phone' });

            if (error) {
                console.error(`[WhatsBot ${this.storeId}] Erro ao sincronizar contatos:`, error.message);
            } else {
                console.log(`[WhatsBot ${this.storeId}] 👥 Sincronizados ${chunk.length} contatos com sucesso.`);
            }
        }
    }

    private setupEventHandlers(sock: WASocket) {
        sock.ev.on('contacts.upsert', async (contacts) => {
            if (sock !== this.sock) return;
            console.log(`[WhatsBot ${this.storeId}] 📥 Recebidos ${contacts?.length || 0} novos contatos (upsert).`);
            await this.upsertContacts(contacts);
        });

        sock.ev.on('messaging-history.set', async ({ contacts, chats }) => {
            if (sock !== this.sock) return;
            
            // Processa contatos do histórico
            if (contacts?.length) {
                console.log(`[WhatsBot ${this.storeId}] 📥 Recebidos ${contacts.length} contatos do histórico.`);
                await this.upsertContacts(contacts);
            }

            // Processa conversas (chats) do histórico para capturar JIDs que não estão na lista de contatos
            if (chats?.length) {
                console.log(`[WhatsBot ${this.storeId}] 📥 Processando ${chats.length} conversas do histórico para extrair contatos.`);
                const chatContacts = chats
                    .filter(c => !c.id.includes('@g.us') && !c.id.includes('@broadcast'))
                    .map(c => ({ id: c.id, name: c.name || null }));
                
                if (chatContacts.length > 0) {
                    await this.upsertContacts(chatContacts);
                }
            }
        });

        sock.ev.on('connection.update', async (update) => {
            if (sock !== this.sock) return;

            const { connection, lastDisconnect, qr } = update;

            if (qr && this.enabled) {
                this.connectionStatus = 'WAITING_QR';
                this.qrCode = qr;
                this.lastError = null;

                await updateWhatsBotSession(this.storeId, {
                    connection_status: 'WAITING_QR',
                    last_disconnect_reason: null
                });
            }

            if (connection === 'open') {
                this.reconnectAttempts = 0;
                this.connectionStatus = 'CONNECTED';
                this.qrCode = undefined;
                this.connectedPhone = normalizePhone(sock.user?.id || '');
                this.lastError = null;

                await updateWhatsBotSession(this.storeId, {
                    connection_status: 'CONNECTED',
                    connected_phone: this.connectedPhone,
                    last_connected_at: new Date().toISOString(),
                    last_disconnect_reason: null
                });
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                const reason =
                    statusCode === DisconnectReason.loggedOut
                        ? 'logged_out'
                        : (lastDisconnect?.error as any)?.message || 'connection_closed';

                this.connectionStatus = 'DISCONNECTED';
                this.qrCode = undefined;
                this.lastError = reason;
                this.sock = undefined;

                await updateWhatsBotSession(this.storeId, {
                    connection_status: 'DISCONNECTED',
                    connected_phone: this.connectedPhone,
                    last_disconnect_reason: reason
                });

                if (statusCode === DisconnectReason.loggedOut) {
                    await clearWhatsBotSessionData(this.storeId);
                }

                if (this.enabled && !this.stopRequested) {
                    this.scheduleReconnect();
                }
            }
        });

        sock.ev.on('messages.upsert', async (payload) => {
            if (!this.enabled || sock !== this.sock) return;

            for (const message of payload.messages) {
                try {
                    // Se a mensagem não tiver conteúdo (comum em erros de descriptografia), ignora silenciosamente
                    if (!message.message) continue;
                    
                    // Sincroniza o remetente da mensagem como um contato disponível para campanhas
                    if (!message.key.fromMe && message.key.remoteJid) {
                        const jid = message.key.remoteJid;
                        if (!jid.includes('@g.us') && !jid.includes('@broadcast')) {
                            await this.upsertContacts([{ 
                                id: jid, 
                                name: message.pushName || null 
                            }]);
                        }
                    }

                    await this.handleIncomingMessage(message);
                } catch (error: any) {
                    // Erros de descriptografia (PreKeyError/SessionError) são comuns em sessões corrompidas
                    // e já são logados pela biblioteca Baileys em nível 50. Aqui silenciamos para não poluir.
                    if (error?.name === 'SessionError' || error?.name === 'PreKeyError') {
                        continue;
                    }
                    console.error(`[WhatsBot ${this.storeId}] Erro ao processar mensagem recebida:`, error.message || error);
                }
            }
        });

        // Iniciar worker de campanhas após conexão bem-sucedida
        this.startCampaignWorker();
    }

    private startCampaignWorker() {
        this.stopCampaignWorker();
        this.campaignTimer = setTimeout(() => this.processCampaigns(), 5000);
    }

    private stopCampaignWorker() {
        if (this.campaignTimer) {
            clearTimeout(this.campaignTimer);
            this.campaignTimer = null;
        }
        this.isProcessingCampaign = false;
    }

    private async processCampaigns() {
        if (!this.enabled || this.isProcessingCampaign || this.connectionStatus !== 'CONNECTED' || !this.sock) {
            return;
        }

        this.isProcessingCampaign = true;

        try {
            // 1. Buscar a campanha ativa mais antiga desta loja
            const { data: campaigns, error: campaignError } = await supabaseAdmin
                .from('whatsbot_campaigns')
                .select('*')
                .in('status', ['pending', 'processing'])
                .eq('store_id', this.storeId)
                .order('created_at', { ascending: true })
                .limit(1);

            if (campaignError || !campaigns?.length) {
                this.isProcessingCampaign = false;
                this.campaignTimer = setTimeout(() => this.processCampaigns(), 10000); // Tentar novamente em 10s
                return;
            }

            const campaign = campaigns[0];

            // Atualizar status para processing se estiver pending
            if (campaign.status === 'pending') {
                await supabaseAdmin
                    .from('whatsbot_campaigns')
                    .update({ status: 'processing', updated_at: new Date().toISOString() })
                    .eq('id', campaign.id);
            }

            // 2. Buscar o próximo destinatário pendente desta campanha
            const { data: recipients, error: recipientError } = await supabaseAdmin
                .from('whatsbot_campaign_recipients')
                .select('*')
                .eq('campaign_id', campaign.id)
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1);

            if (recipientError || !recipients?.length) {
                // Se não houver mais destinatários, finaliza a campanha
                await supabaseAdmin
                    .from('whatsbot_campaigns')
                    .update({ status: 'completed', updated_at: new Date().toISOString() })
                    .eq('id', campaign.id);

                console.log(`[WhatsBot ${this.storeId}] ✅ Campanha "${campaign.name}" concluída.`);
                this.isProcessingCampaign = false;
                this.campaignTimer = setTimeout(() => this.processCampaigns(), 5000);
                return;
            }

            const recipient = recipients[0];
            const jid = normalizeDirectJid(recipient.phone);

            console.log(`[WhatsBot ${this.storeId}] 📢 Disparando campanha "${campaign.name}" para ${recipient.phone}...`);

            const campaignMessageWithLink = campaign.link_url 
                ? `${campaign.message}\n\n${campaign.link_url}`
                : campaign.message;

            try {
                if (campaign.image_url) {
                    await this.sock.sendMessage(jid, { 
                        image: { url: campaign.image_url }, 
                        caption: campaignMessageWithLink 
                    });
                } else {
                    await this.sendText(jid, campaignMessageWithLink, campaign.link_url);
                }

                // Sucesso
                await supabaseAdmin
                    .from('whatsbot_campaign_recipients')
                    .update({ status: 'sent', sent_at: new Date().toISOString() })
                    .eq('id', recipient.id);

                await supabaseAdmin.rpc('increment_whatsbot_campaign_stats', {
                    p_campaign_id: campaign.id,
                    p_success: true
                });

            } catch (err: any) {
                // Falha
                console.error(`[WhatsBot ${this.storeId}] ❌ Erro ao disparar para ${recipient.phone}:`, err.message);
                await supabaseAdmin
                    .from('whatsbot_campaign_recipients')
                    .update({ status: 'failed', error_message: err.message })
                    .eq('id', recipient.id);

                await supabaseAdmin.rpc('increment_whatsbot_campaign_stats', {
                    p_campaign_id: campaign.id,
                    p_success: false
                });
            }

            // 3. Agendar o próximo disparo com delay de segurança (30 a 90 segundos)
            const minDelay = 30000;
            const maxDelay = 90000;
            const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

            console.log(`[WhatsBot ${this.storeId}] ⏳ Próximo disparo em ${Math.round(randomDelay / 1000)}s...`);
            this.isProcessingCampaign = false;
            this.campaignTimer = setTimeout(() => this.processCampaigns(), randomDelay);

        } catch (error) {
            console.error(`[WhatsBot ${this.storeId}] Erro crítico no worker de campanhas:`, error);
            this.isProcessingCampaign = false;
            this.campaignTimer = setTimeout(() => this.processCampaigns(), 30000); // Esperar 30s após erro crítico
        }
    }

    private async handleIncomingMessage(message: WAMessage) {
        const rawJid = message.key.remoteJid;
        if (!rawJid || rawJid === 'status@broadcast' || rawJid.endsWith('@g.us')) {
            return;
        }

        if (message.key.fromMe || !message.message) {
            return;
        }

        const contactPhone = normalizePhone(rawJid);
        const contactJid = normalizeDirectJid(rawJid);
        if (!contactPhone || !contactJid) {
            return;
        }

        console.log(`\x1b[35m[WhatsBot ${this.storeId}] 📩 Mensagem recebida de ${contactPhone}\x1b[0m`);

        // 1. Tenta extrair o texto da mensagem
        const messageText = message.message?.conversation || 
                           message.message?.extendedTextMessage?.text || 
                           message.message?.imageMessage?.caption || 
                           '';

        // 2. Busca Gatilhos de Resposta (Keywords)
        if (messageText.trim()) {
            const { data: triggers } = await supabaseAdmin
                .from('whatsbot_triggers')
                .select('*')
                .eq('store_id', this.storeId);

            if (triggers && triggers.length > 0) {
                const cleanText = messageText.toLowerCase().trim();
                const matchedTrigger = triggers.find(t => 
                    cleanText.includes(t.keyword.toLowerCase().trim())
                );

                if (matchedTrigger) {
                    console.log(`\x1b[32m[WhatsBot ${this.storeId}] 🎯 Gatilho detectado: "${matchedTrigger.keyword}"\x1b[0m`);
                    
                    const [settings, store, session] = await Promise.all([
                        getSettings(this.storeId),
                        getStoreProfile(this.storeId),
                        getSessionRow(this.storeId)
                    ]);
                    
                    const catalogUrl = buildCatalogUrl(store, session?.last_known_public_url);
                    
                    // Processando Variáveis Inteligentes
                    const hour = new Date().getHours();
                    const saudacao = hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
                    const firstName = (message.pushName || 'cliente').split(' ')[0];
                    
                    let finalResponse = matchedTrigger.response
                        .replace(/\{\{\s*saudacao\s*\}\}/gi, saudacao)
                        .replace(/\{\{\s*first_name\s*\}\}/gi, firstName)
                        .replace(/\{\{\s*catalog_url\s*\}\}/gi, catalogUrl)
                        .replace(/\{\s*catalogUrl\s*\}/g, catalogUrl);

                    try {
                        await this.sendText(contactJid, finalResponse, catalogUrl);
                        console.log(`\x1b[32m[WhatsBot ${this.storeId}] ✅ Resposta de gatilho enviada!\x1b[0m`);
                        return;
                    } catch (err: any) {
                        console.error(`[WhatsBot ${this.storeId}] Erro ao enviar gatilho:`, err.message);
                    }
                }
            }
        }

        const [settings, store, session] = await Promise.all([
            getSettings(this.storeId),
            getStoreProfile(this.storeId),
            getSessionRow(this.storeId)
        ]);

        // 3. Resposta via Assistente de IA (se ativo)
        if (settings.enabled && settings.ai_enabled && this.enabled) {
            console.log(`\x1b[36m[WhatsBot ${this.storeId}] 🤖 Processando via Assistente de IA...\x1b[0m`);
            
            try {
                // Busca API Key do Gemini
                const { data: keyRow } = await supabaseAdmin
                    .from('api_keys')
                    .select('key_value')
                    .eq('provider', 'google_gemini')
                    .eq('is_active', true)
                    .maybeSingle();

                const apiKey = keyRow?.key_value || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

                if (apiKey) {
                    // Busca produtos para conhecimento da IA (simplificado para evitar erros de join)
                    const { data: rawProducts } = await supabaseAdmin
                        .from('products')
                        .select('name, price, description')
                        .eq('store_id', this.storeId)
                        .limit(100);

                    const products = rawProducts || [];
                    console.log(`[WhatsBot ${this.storeId}] 📦 Conhecimento de IA: ${products.length} produtos encontrados para a loja ID: ${this.storeId}`);

                    const catalogUrl = buildCatalogUrl(store, session?.last_known_public_url);
                    
                    const aiResult = await aiService.processMessage(
                        messageText,
                        {
                            storeName: store.store_name,
                            isClosed: store.is_open === false,
                            closedInstruction: settings.custom_closed_message,
                            assistantName: settings.ai_name || 'Assistente',
                            aiInstructions: settings.ai_context,
                            products: products || []
                        },
                        {
                            confusionCount: 0,
                            variables: {
                                contactPhone,
                                storeId: this.storeId
                            }
                        },
                        apiKey
                    );

                    if (aiResult.success && aiResult.responseText) {
                        let finalAiText = aiResult.responseText
                            .replace(/\{\{\s*catalog_url\s*\}\}/gi, catalogUrl)
                            .replace(/\{\s*catalogUrl\s*\}/g, catalogUrl);

                        await this.sendText(contactJid, finalAiText, catalogUrl);
                        console.log(`\x1b[32m[WhatsBot ${this.storeId}] ✅ Resposta de IA enviada!\x1b[0m`);
                    } else {
                        // IA retornou success: false (ou resposta vazia) - Enviar Fallback
                        console.warn(`[WhatsBot ${this.storeId}] IA falhou no resultado (Quota/Erro). Enviando fallback.`);
                        const fallbackMsg = "Nosso Assistente está conversando com muitas pessoas, peço que tente novamente mais tarde. 🙏";
                        await this.sendText(contactJid, fallbackMsg);
                    }

                    return; // IMPORTANTE: Se IA está ativa, encerramos aqui para não mandar boas-vindas padrão
                } else {
                    console.warn(`[WhatsBot ${this.storeId}] IA ativa mas API Key não encontrada.`);
                }
            } catch (aiErr: any) {
                console.error(`[WhatsBot ${this.storeId}] Erro no processamento de IA:`, aiErr.message);
                
                // Mensagem de Fallback Amigável Blindada (Cache de Memória + Banco)
                const fallbackMsg = "Nosso Assistente está conversando com muitas pessoas, peço que tente novamente mais tarde. 🙏";
                const sendDateLocal = getLocalDateString(settings.timezone || DEFAULT_TIMEZONE);
                const memoryKey = `${this.storeId}:${contactPhone}:${sendDateLocal}`;
                
                try {
                    // 1. Verificação de MEMÓRIA (Instantânea)
                    if (aiFallbackCache.has(memoryKey)) {
                        console.log(`[WhatsBot ${this.storeId}] 🛡️ BLOQUEIO DE MEMÓRIA: Silêncio total para ${contactPhone}.`);
                        return;
                    }

                    // 2. Verificação de BANCO (Segurança de Persistência)
                    const { data: alreadySent } = await supabaseAdmin
                        .from('whatsbot_send_history')
                        .select('id')
                        .eq('store_id', this.storeId)
                        .eq('contact_phone', contactPhone)
                        .eq('send_date', sendDateLocal)
                        .ilike('message_body', '%conversando com muitas pessoas%')
                        .maybeSingle();

                    if (!alreadySent) {
                        const reservation = await reserveDailySend({
                            storeId: this.storeId,
                            contactPhone,
                            contactJid,
                            sendDateLocal,
                            messageSource: 'custom', 
                            messageBody: fallbackMsg,
                            inboundMessageId: message.key.id || null,
                            isClosedMessage: store.is_open === false
                        });

                        if (reservation.allowed) {
                            await this.sendText(contactJid, fallbackMsg);
                            await markSendHistorySent(reservation.history_id);
                            
                            // 3. Salva na MEMÓRIA para o próximo milissegundo
                            aiFallbackCache.add(memoryKey);
                            console.log(`[WhatsBot ${this.storeId}] 🛡️ PRIMEIRO AVISO: Enviado e salvo na memória para ${contactPhone}.`);
                        }
                    } else {
                        // Se está no banco mas não na memória (ex: servidor resetou), alimentamos a memória
                        aiFallbackCache.add(memoryKey);
                        console.log(`[WhatsBot ${this.storeId}] 🛡️ BLOQUEIO BANCO: Já avisado hoje. Silenciando ${contactPhone}.`);
                    }
                } catch (sendErr) {
                    console.error(`[WhatsBot ${this.storeId}] Erro ao processar blindagem de fallback:`, sendErr);
                }
                
                return; // Bloqueia tudo
            }
        }

        if (!settings.enabled || !this.enabled) {
            console.log(`\x1b[33m[WhatsBot ${this.storeId}] ⏭️ Ignorando: Robô está desligado nas configurações.\x1b[0m`);
            return;
        }

        const catalogUrl = buildCatalogUrl(store, session?.last_known_public_url);
        const replyMessage = buildWhatsBotReplyMessage({
            customMessage: settings.custom_message,
            customClosedMessage: settings.custom_closed_message,
            catalogUrl,
            storeName: store.store_name,
            isOpen: store.is_open
        });

        const messageSource = settings.custom_message?.trim() ? 'custom' as const : 'catalog_default' as const;
        const sendDateLocal = getLocalDateString(settings.timezone || DEFAULT_TIMEZONE);
        const isClosedMessage = store.is_open === false;

        const reservation = await reserveDailySend({
            storeId: this.storeId,
            contactPhone,
            contactJid,
            sendDateLocal,
            messageSource,
            messageBody: replyMessage,
            inboundMessageId: message.key.id || null,
            isClosedMessage
        });

        if (!reservation.allowed) {
            const typeLabel = isClosedMessage ? 'FECHADA' : 'ABERTA';
            console.log(`\x1b[33m[WhatsBot ${this.storeId}] 🛡️ BLOQUEIO ANTI-SPAM (${typeLabel}): ${contactPhone} já recebeu esta mensagem hoje.\x1b[0m`);
            return;
        }

        try {
            console.log(`\x1b[32m[WhatsBot ${this.storeId}] 📤 Enviando resposta automática para ${contactPhone}...\x1b[0m`);
            
            const targetImageUrl = isClosedMessage ? settings.closed_image_url : settings.image_url;

            if (targetImageUrl) {
                await this.sock.sendMessage(contactJid, { 
                    image: { url: targetImageUrl }, 
                    caption: replyMessage 
                });
            } else {
                await this.sendText(contactJid, replyMessage, catalogUrl);
            }

            await markSendHistorySent(reservation.history_id);
            console.log(`\x1b[32m[WhatsBot ${this.storeId}] ✅ Resposta enviada com sucesso!\x1b[0m`);
        } catch (error: any) {
            const messageText = error?.message || 'Falha ao enviar resposta automática.';
            console.error(`\x1b[31m[WhatsBot ${this.storeId}] ❌ Erro ao enviar resposta: ${messageText}\x1b[0m`);
            await markSendHistoryFailed(reservation.history_id, messageText);
            throw error;
        }
    }

    private async sendText(to: string, text: string, linkUrl?: string) {
        if (!this.sock || this.connectionStatus !== 'CONNECTED') {
            throw new Error('WhatsBot não está conectado.');
        }

        // Apenas tenta gerar preview se a URL for pública (não é localhost)
        const isPublicUrl = linkUrl &&
            !linkUrl.includes('localhost') &&
            !linkUrl.includes('127.0.0.1') &&
            linkUrl.startsWith('http');

        await this.sock.sendMessage(to, {
            text,
            ...(isPublicUrl ? {} : { linkPreview: undefined })
        });
    }
}

class WhatsBotServiceManager {
    private readonly instances = new Map<string, WhatsBotInstance>();

    private getOrCreateInstance(storeId: string) {
        let instance = this.instances.get(storeId);
        if (!instance) {
            instance = new WhatsBotInstance(storeId);
            this.instances.set(storeId, instance);
        }

        return instance;
    }

    public async bootstrapEnabledBots() {
        try {
            const { data, error } = await supabaseAdmin
                .from('whatsbot_settings')
                .select('store_id')
                .eq('enabled', true);

            if (error) {
                throw error;
            }

            await Promise.allSettled((data || []).map((row) => this.start(row.store_id)));
        } catch (error) {
            console.error('[WhatsBot] Erro ao reidratar bots ligados no boot:', error);
        }
    }

    public async getStatus(storeId: string, currentPublicUrl?: string | null) {
        const instance = this.getOrCreateInstance(storeId);
        return instance.getStatus(currentPublicUrl);
    }

    public async updateConfig(
        storeId: string, 
        customMessage: string, 
        customClosedMessage: string, 
        imageUrl: string | null = null,
        closedImageUrl: string | null = null,
        currentPublicUrl?: string | null,
        ai_enabled: boolean = false,
        ai_context: string = '',
        ai_name: string = ''
    ) {
        const { error } = await supabaseAdmin.from('whatsbot_settings').upsert({
            store_id: storeId,
            custom_message: customMessage,
            custom_closed_message: customClosedMessage,
            image_url: imageUrl,
            closed_image_url: closedImageUrl,
            ai_enabled: ai_enabled,
            ai_context: ai_context,
            ai_name: ai_name,
            updated_at: new Date().toISOString()
        });

        if (error) throw error;
        return this.getStatus(storeId, currentPublicUrl);
    }

    public async start(storeId: string, currentPublicUrl?: string | null) {
        await upsertSettings(storeId, {
            enabled: true,
            timezone: DEFAULT_TIMEZONE
        });

        const instance = this.getOrCreateInstance(storeId);
        await instance.start();

        return this.getStatus(storeId, currentPublicUrl);
    }

    public async stopWhatsBot(storeId: string, currentPublicUrl?: string | null) {
        const instance = this.getOrCreateInstance(storeId);
        await instance.stop();
        return this.getStatus(storeId, currentPublicUrl);
    }

    public async logoutWhatsBot(storeId: string, currentPublicUrl?: string | null) {
        const instance = this.getOrCreateInstance(storeId);
        await instance.logout();
        return this.getStatus(storeId, currentPublicUrl);
    }

    public async stop(storeId: string, currentPublicUrl?: string | null) {
        await upsertSettings(storeId, {
            enabled: false,
            timezone: DEFAULT_TIMEZONE
        });

        const instance = this.instances.get(storeId);
        if (instance) {
            await instance.stop();
            this.instances.delete(storeId);
        } else {
            await updateSessionRow(storeId, {
                connection_status: 'DISCONNECTED',
                last_disconnect_reason: 'bot_stopped'
            });
        }

        // Limpa o histórico anti-spam ao desligar o bot
        // Isso permite que novos envios sejam feitos ao ligar o bot novamente
        const { error: histErr } = await supabaseAdmin
            .from('whatsbot_send_history')
            .delete()
            .eq('store_id', storeId);

        if (histErr) {
            console.warn(`[WhatsBot ${storeId}] Aviso: não foi possível limpar histórico anti-spam:`, histErr.message);
        } else {
            console.log(`\x1b[36m[WhatsBot ${storeId}] 🧹 Histórico anti-spam limpo ao desligar o bot.\x1b[0m`);
        }

        return this.getStatus(storeId, currentPublicUrl);
    }
    public async getCampaigns(storeId: string) {
        const { data, error } = await supabaseAdmin
            .from('whatsbot_campaigns')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    public async createCampaign(
        storeId: string, 
        name: string, 
        message: string, 
        recipients: string[], 
        imageUrl: string | null = null,
        linkUrl: string | null = null
    ) {
        // 1. Criar a campanha
        const { data: campaign, error: campaignError } = await supabaseAdmin
            .from('whatsbot_campaigns')
            .insert({
                store_id: storeId,
                name,
                message,
                image_url: imageUrl,
                link_url: linkUrl,
                status: 'pending',
                total_recipients: recipients.length,
                sent_successfully: 0,
                sent_failed: 0
            })
            .select()
            .single();

        if (campaignError) throw campaignError;

        // 2. Inserir os destinatários
        const recipientData = recipients.map(phone => ({
            campaign_id: campaign.id,
            phone,
            status: 'pending'
        }));

        const { error: recipientError } = await supabaseAdmin
            .from('whatsbot_campaign_recipients')
            .insert(recipientData);

        if (recipientError) throw recipientError;

        return campaign;
    }

    public async stopCampaign(storeId: string, campaignId: string) {
        const { error } = await supabaseAdmin
            .from('whatsbot_campaigns')
            .update({ status: 'stopped', updated_at: new Date().toISOString() })
            .eq('id', campaignId)
            .eq('store_id', storeId);

        if (error) throw error;
        return { success: true };
    }

    public async deleteCampaign(storeId: string, campaignId: string) {
        // Remove destinatários primeiro
        await supabaseAdmin
            .from('whatsbot_campaign_recipients')
            .delete()
            .eq('campaign_id', campaignId);

        // Remove a campanha
        const { error } = await supabaseAdmin
            .from('whatsbot_campaigns')
            .delete()
            .eq('id', campaignId)
            .eq('store_id', storeId);

        if (error) throw error;
        return { success: true };
    }

    public async getAvailableContacts(storeId: string) {
        const { data, error } = await supabaseAdmin.rpc('get_whatsbot_available_contacts', {
            p_store_id: storeId
        });

        if (error) throw error;
        return data;
    }
}

export const whatsBotService = new WhatsBotServiceManager();
