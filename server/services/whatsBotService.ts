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

interface WhatsBotSettingsRow {
    store_id: string;
    enabled: boolean;
    custom_message: string | null;
    timezone: string | null;
}

interface StoreProfileRow {
    id: string;
    city_slug: string | null;
    store_slug: string | null;
    store_name: string | null;
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
    catalogUrl: string;
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
    const { data, error } = await supabaseAdmin
        .from('whatsbot_settings')
        .select('store_id, enabled, custom_message, timezone')
        .eq('store_id', storeId)
        .single();

    if (error && error.code !== 'PGRST116') {
        throw error;
    }

    return {
        store_id: storeId,
        enabled: !!data?.enabled,
        custom_message: data?.custom_message || null,
        timezone: data?.timezone || DEFAULT_TIMEZONE
    };
};

const upsertSettings = async (
    storeId: string,
    updates: Partial<Pick<WhatsBotSettingsRow, 'enabled' | 'custom_message' | 'timezone'>>
) => {
    const payload = {
        store_id: storeId,
        timezone: DEFAULT_TIMEZONE,
        ...updates,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabaseAdmin
        .from('whatsbot_settings')
        .upsert(payload, { onConflict: 'store_id' });

    if (error) {
        throw error;
    }
};

const getStoreProfile = async (storeId: string): Promise<StoreProfileRow> => {
    const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('id, city_slug, store_slug, store_name')
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
}) => {
    const { data, error } = await supabaseAdmin.rpc('reserve_whatsbot_daily_send', {
        p_store_id: params.storeId,
        p_contact_phone: params.contactPhone,
        p_contact_jid: params.contactJid,
        p_send_date_local: params.sendDateLocal,
        p_message_source: params.messageSource,
        p_message_body: params.messageBody,
        p_inbound_message_id: params.inboundMessageId || null
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
    catalogUrl: string;
    storeName?: string | null;
}) => {
    const customMessage = params.customMessage?.trim() || '';
    if (customMessage) {
        return customMessage
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
            catalogUrl,
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

        this.sock = undefined;

        await updateWhatsBotSession(this.storeId, {
            connection_status: 'DISCONNECTED',
            connected_phone: this.connectedPhone,
            last_disconnect_reason: 'bot_stopped'
        });
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

    private setupEventHandlers(sock: WASocket) {
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

        const [settings, store, session] = await Promise.all([
            getSettings(this.storeId),
            getStoreProfile(this.storeId),
            getSessionRow(this.storeId)
        ]);

        if (!settings.enabled || !this.enabled) {
            console.log(`\x1b[33m[WhatsBot ${this.storeId}] ⏭️ Ignorando: Robô está desligado nas configurações.\x1b[0m`);
            return;
        }

        const catalogUrl = buildCatalogUrl(store, session?.last_known_public_url);
        const replyMessage = buildWhatsBotReplyMessage({
            customMessage: settings.custom_message,
            catalogUrl,
            storeName: store.store_name
        });

        const messageSource = settings.custom_message?.trim() ? 'custom' as const : 'catalog_default' as const;
        const sendDateLocal = getLocalDateString(settings.timezone || DEFAULT_TIMEZONE);

        const reservation = await reserveDailySend({
            storeId: this.storeId,
            contactPhone,
            contactJid,
            sendDateLocal,
            messageSource,
            messageBody: replyMessage,
            inboundMessageId: message.key.id || null
        });

        if (!reservation.allowed) {
            console.log(`\x1b[33m[WhatsBot ${this.storeId}] 🛡️ BLOQUEIO ANTI-SPAM: ${contactPhone} já recebeu mensagem hoje.\x1b[0m`);
            return;
        }

        try {
            console.log(`\x1b[32m[WhatsBot ${this.storeId}] 📤 Enviando resposta automática para ${contactPhone}...\x1b[0m`);
            await this.sendText(contactJid, replyMessage, catalogUrl);
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

    public async updateConfig(storeId: string, customMessage: string, currentPublicUrl?: string | null) {
        await upsertSettings(storeId, {
            custom_message: customMessage.trim() || null,
            timezone: DEFAULT_TIMEZONE
        });

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

        return this.getStatus(storeId, currentPublicUrl);
    }
}

export const whatsBotService = new WhatsBotServiceManager();
