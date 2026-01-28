import { EventEmitter } from 'events';
import { supabaseAdmin } from './supabaseClient.js';
import { zeAssistantService } from './zeAssistantService.js';

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

        // A verificação de auto-chat original foi removida pois bloqueava visitantes (onde senderId == conversationId).
        // if (senderId === conversationId || storeId === conversationId) { ... }

        try {
            const messageId = `internal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const timestamp = new Date();

            console.log('[InternalChat] Tentando inserir mensagem:', { storeId, conversationId, messageId, senderIdFinal: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(senderId) ? senderId : null });

            // 1. Persistir Mensagem (Tabela chat_messages)
            const { error: msgError } = await supabaseAdmin.from('chat_messages').insert({
                store_id: storeId,
                conversation_id: conversationId,
                message_id: messageId,
                content: content,
                message: content, // Redundância para compatibilidade
                sender_name: senderName,
                // WORKAROUND: Se senderId não for UUID (visitante), usa storeId para passar na constraint FK/UUID.
                // A distinção real é feita por 'sender_type' e 'from_me'.
                sender_id: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(senderId) ? senderId : storeId,
                sender_type: fromMe ? 'store' : 'guest',
                from_me: fromMe,
                message_timestamp: timestamp,
                status: 'sent',
                message_type: type,
                type: 'SUPPORT' // Satisfaz coluna 'type' se existir (enum ou texto)
            });

            if (msgError) {
                console.error('[InternalChat] FALHA ao inserir mensagem:', msgError);
                throw msgError;
            }

            console.log('[InternalChat] Mensagem inserida com sucesso:', messageId);

            // 2. Identificar Tipo de Cliente
            let customerType: 'ze' | 'store' | 'visitor' = 'visitor';

            // Verificar se é Cliente Zé (tem conta)
            // Verificar se é Cliente Zé (tem conta) - APENAS SE FOR UUID VÁLIDO
            let userProfile = null;
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId);

            if (isUuid) {
                const { data } = await supabaseAdmin
                    .from('user_profiles')
                    .select('id')
                    .eq('id', conversationId)
                    .single();
                userProfile = data;
            }

            if (userProfile) {
                customerType = 'ze';
            } else {
                // Verificar se é Cliente Loja (está na lista de contatos da loja)
                const { data: contact } = await supabaseAdmin
                    .from('chat_contacts')
                    .select('id')
                    .eq('store_id', storeId)
                    .eq('phone_number', conversationId.split('@')[0])
                    .single();

                if (contact) {
                    customerType = 'store';
                }
            }

            // 3. Atualizar Conversa (Tabela whatsapp_conversations)
            console.log('[InternalChat] Tentando atualizar conversa:', { storeId, conversationId, customerType });

            const { error: convError } = await supabaseAdmin.from('chat_conversations').upsert({
                store_id: storeId,
                conversation_id: conversationId,
                last_message_content: content.substring(0, 500),
                last_message_timestamp: timestamp,
                updated_at: timestamp,
                customer_type: customerType,
                contact_name: !fromMe && senderName !== 'Visitante' ? senderName : undefined
            }, { onConflict: 'store_id,conversation_id' });

            if (convError) {
                console.error('[InternalChat] FALHA ao atualizar conversa:', convError);
                // Não lançar erro aqui para não perder a mensagem, apenas logar
                // throw convError; 
            }

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



            // 4. Acionar Zé Assistente (Se for mensagem de visitante e texto)
            if (!fromMe && type === 'chat') {
                console.log(`[InternalChat] 🤖 Acionando Zé Assistente para conversa ${conversationId} (Loja ${storeId})`);

                // Enviar presença "digitando..."
                this.sendPresence(storeId, conversationId, 'composing');

                // Não await para não bloquear a resposta da API
                zeAssistantService.processMessage({
                    storeId,
                    conversationId,
                    customerPhone: conversationId,
                    customerName: senderName || 'Visitante',
                    messageText: content
                })
                    .then(async response => {
                        console.log(`[InternalChat] ✅ Zé Assistente processou (DEBUG):`, {
                            success: response.success,
                            hasText: !!response.responseText,
                            textPreview: response.responseText ? response.responseText.substring(0, 20) : 'N/A'
                        });

                        // Parar "digitando..."
                        this.sendPresence(storeId, conversationId, 'paused');

                        // Se houver resposta para enviar, envia de volta como mensagem da loja
                        if (response.success && response.responseText) {
                            console.log('[InternalChat] 🚀 Tentando enviar resposta da IA para o chat...');
                            try {
                                await this.sendMessage({
                                    storeId,
                                    conversationId,
                                    content: response.responseText,
                                    senderId: storeId, // Zé fala em nome da loja
                                    senderName: 'Zé',
                                    fromMe: true,
                                    type: 'chat'
                                });
                                console.log('[InternalChat] 🏁 Resposta da IA enviada para sendMessage com sucesso.');
                            } catch (sendErr) {
                                console.error('[InternalChat] ❌ Falha ao invocar this.sendMessage:', sendErr);
                            }
                        } else {
                            console.warn('[InternalChat] ⚠️ Resposta da IA vazia ou sem sucesso, nada enviado.');
                        }
                    })
                    .catch(err => {
                        console.error('[InternalChat] ❌ ERRO CRÍTICO ao processar mensagem com IA:', err);
                    });
            } else {
                console.log(`[InternalChat] ⏭️ Ignorando Zé Assistente: fromMe=${fromMe}, type=${type}`);
            }

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
     * Envia atualização de presença (composing/paused)
     */
    sendPresence(storeId: string, conversationId: string, presence: 'composing' | 'paused' | 'recording') {
        // Emite evento para o WebSocket transmitir
        this.emit('presence.update', {
            storeId,
            presence: {
                id: conversationId,
                presence
            }
        });
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
