import { EventEmitter } from 'events';
import { supabaseAdmin } from './supabaseClient.js';

type MessageType = 'chat' | 'image' | 'audio' | 'video' | 'document';

export interface InternalMessage {
    id: string;
    store_id: string;
    conversation_id: string;
    sender_id: string;
    sender_name: string;
    content: string;
    type: MessageType;
    timestamp: Date;
    fromMe: boolean;
    status: 'sent' | 'delivered' | 'read';
}

/**
 * Serviço de Chat Interno (Nativo do Sistema)
 * Substitui a dependência do WhatsApp (Baileys)
 */
class InternalChatService extends EventEmitter {
    private instances: Map<string, boolean> = new Map(); // Apenas para controle de atividade por loja

    constructor() {
        super();
    }

    /**
     * Envia uma mensagem interna e persiste no banco (reutilizando tabelas de WhatsApp)
     */
    async sendMessage(params: {
        storeId: string;
        conversationId: string;
        content: string;
        senderId: string;
        senderName: string;
        fromMe: boolean;
        type?: MessageType;
    }) {
        const { storeId, conversationId, content, senderId, senderName, fromMe, type = 'chat' } = params;

        // Impedir que a loja fale com ela mesma
        if (senderId === conversationId || storeId === conversationId) {
            console.warn(`[InternalChat] Bloqueada tentativa de auto-chat: ${storeId}`);
            return { success: false, error: 'Você não pode enviar mensagens para si mesmo.' };
        }

        try {
            const messageId = `internal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = new Date();

            // 1. Persistir Mensagem (Tabela whatsapp_messages)
            const { error: msgError } = await supabaseAdmin.from('whatsapp_messages').insert({
                store_id: storeId,
                conversation_id: conversationId,
                message_id: messageId,
                content: content,
                sender_name: senderName,
                from_me: fromMe,
                message_timestamp: timestamp,
                status: 'sent',
                message_type: type
            });

            if (msgError) throw msgError;

            // 2. Identificar Tipo de Cliente
            let customerType: 'ze' | 'store' | 'visitor' = 'visitor';

            // Verificar se é Cliente Zé (tem conta)
            const { data: userProfile } = await supabaseAdmin
                .from('user_profiles')
                .select('id')
                .eq('id', conversationId)
                .single();

            if (userProfile) {
                customerType = 'ze';
            } else {
                // Verificar se é Cliente Loja (está na lista de contatos da loja)
                const { data: contact } = await supabaseAdmin
                    .from('whatsapp_contacts')
                    .select('id')
                    .eq('store_id', storeId)
                    .eq('phone_number', conversationId.split('@')[0])
                    .single();

                if (contact) {
                    customerType = 'store';
                }
            }

            // 3. Atualizar Conversa (Tabela whatsapp_conversations)
            const { error: convError } = await supabaseAdmin.from('whatsapp_conversations').upsert({
                store_id: storeId,
                conversation_id: conversationId,
                last_message_content: content.substring(0, 500),
                last_message_timestamp: timestamp,
                updated_at: timestamp,
                customer_type: customerType
            }, { onConflict: 'store_id,conversation_id' });

            if (convError) throw convError;

            // 3. Emitir evento para o WebSocket broadcast
            const msgPayload = {
                key: {
                    remoteJid: conversationId,
                    fromMe: fromMe,
                    id: messageId
                },
                message: {
                    conversation: type === 'chat' ? content : undefined,
                    [type + 'Message']: type !== 'chat' ? { caption: content } : undefined
                },
                messageTimestamp: Math.floor(timestamp.getTime() / 1000),
                pushName: senderName,
                status: 'sent'
            };

            this.emit('messages.upsert', { storeId, msg: msgPayload });

            return { success: true, messageId };
        } catch (error: any) {
            console.error('[InternalChat] Erro ao enviar mensagem:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                storeId,
                conversationId
            });
            return { success: false, error };
        }
    }

    /**
     * Mock do status para manter compatibilidade com o frontend administrativo
     */
    getStatus(storeId: string) {
        return { status: 'CONNECTED', qrCode: undefined, isInternal: true };
    }
}

export const internalChatService = new InternalChatService();
export default internalChatService;
