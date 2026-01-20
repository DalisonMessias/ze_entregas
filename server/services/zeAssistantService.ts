import { supabaseAdmin } from './supabaseClient.js';
import { zeAssistantRulesService } from './zeAssistantRulesService.js';
import { zeAssistantAIService } from './zeAssistantAIService.js';
import type {
    ProcessMessagePayload,
    ProcessMessageResponse,
    ZeAssistantConfig,
    ZeAssistantConversation,
    ConversationContext
} from '../../types/zeAssistant.js';

/**
 * Serviço Híbrido Principal do Zé Assistente
 * Orquestra entre Regras Fixas e IA
 */
export class ZeAssistantService {

    /**
     * Processa mensagem recebida via WhatsApp
     */
    async processMessage(payload: ProcessMessagePayload): Promise<ProcessMessageResponse> {
        const startTime = Date.now();
        const supabase = supabaseAdmin;
        if (!supabase) {
            return {
                success: false,
                responseText: 'Erro interno: Supabase não inicializado',
                responseType: 'HUMAN',
                shouldHandoff: true,
                handoffReason: 'Supabase client error'
            };
        }

        try {
            // 1. Verificar se assistente está ativo para esta loja
            const config = await this.getConfig(payload.storeId);
            if (!config || !config.is_enabled) {
                return {
                    success: false,
                    responseText: '',
                    responseType: 'HUMAN',
                    shouldHandoff: true,
                    handoffReason: 'Assistente desativado'
                };
            }

            // 2. Buscar ou criar conversa
            const conversation = await this.getOrCreateConversation(
                payload.conversationId,
                payload.storeId,
                payload.customerPhone,
                payload.customerName
            );

            // Se conversa foi transferida para humano, não processar
            if (conversation.handoff_to_human) {
                return {
                    success: false,
                    responseText: '',
                    responseType: 'HUMAN',
                    shouldHandoff: true,
                    handoffReason: 'Conversa com atendente humano'
                };
            }

            // 3. Buscar contexto da conversa
            const context: ConversationContext = conversation.context_data as ConversationContext || {
                confusionCount: conversation.confusion_count || 0,
                variables: {}
            };

            // 4. Tentar processar com REGRAS FIXAS primeiro (se ativado)
            let response: ProcessMessageResponse | null = null;

            if (config.rules_enabled) {
                response = await this.processWithRules(
                    payload.messageText,
                    payload.storeId,
                    context
                );
            }

            // 5. Se regras não encontraram match, usar IA (se ativado)
            if (!response && config.ai_enabled) {
                const storeContext = await this.getStoreContext(payload.storeId);

                // Buscar API Key do Gemini
                // 1. Tentar de shop_settings (geralmente salva via AdminAIConfig)
                // 2. Tentar de api_keys (tabela global/segura)
                // Se não encontrar, passa string vazia e o serviço trata
                const geminiKey = await this.getGeminiApiKey(payload.storeId) || '';

                response = await zeAssistantAIService.processMessage(
                    payload.messageText,
                    storeContext,
                    context,
                    geminiKey
                );
                response.responseType = 'AI';
            }

            // 6. Se nem regra nem IA funcionaram, usar fallback
            if (!response || !response.success) {
                context.confusionCount++;

                // Verificar se deve transferir para humano
                if (config.auto_handoff_on_confusion &&
                    context.confusionCount >= config.max_confusion_attempts) {
                    await this.handoffToHuman(conversation.id, 'Múltiplas confusões');

                    return {
                        success: true,
                        responseText: config.fallback_message,
                        responseType: 'HUMAN',
                        shouldHandoff: true,
                        handoffReason: 'Limite de confusões atingido'
                    };
                }

                response = {
                    success: true,
                    responseText: 'Desculpe, não entendi. Pode reformular?',
                    responseType: 'HYBRID',
                    shouldHandoff: false
                };
            }

            // 7. Resetar contador de confusão se resposta foi bem-sucedida
            if (response.success && !response.shouldHandoff) {
                context.confusionCount = 0;
            }

            // 8. Registrar mensagem processada
            await this.logMessage(
                conversation.id,
                payload.messageId,
                payload.messageText,
                response.responseText,
                response.responseType,
                response.confidenceScore,
                Date.now() - startTime
            );

            // 9. Atualizar contexto da conversa
            await this.updateConversationContext(conversation.id, context);

            // 10. Adicionar delay configurado (simular digitação humana)
            if (config.response_delay_ms > 0) {
                await this.delay(config.response_delay_ms);
            }

            return response;

        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
            return {
                success: false,
                responseText: 'Desculpe, ocorreu um erro. Vou transferir você para um atendente.',
                responseType: 'HYBRID',
                shouldHandoff: true,
                handoffReason: 'Erro no processamento'
            };
        }
    }

    /**
     * Processa mensagem com regras fixas
     */
    private async processWithRules(
        messageText: string,
        storeId: string,
        context: ConversationContext
    ): Promise<ProcessMessageResponse | null> {

        const { rule, confidence } = await zeAssistantRulesService.findMatchingRule(
            messageText,
            storeId
        );

        if (!rule) {
            return null;
        }

        const responseText = await zeAssistantRulesService.applyTemplate(
            rule,
            storeId,
            context
        );

        // Detectar intenção da regra para atualizar contexto
        const intent = await zeAssistantAIService.extractIntent(messageText);
        if (intent) {
            context.lastIntent = intent;
        }

        return {
            success: true,
            responseText,
            responseType: 'RULE',
            shouldHandoff: false,
            confidenceScore: confidence,
            metadata: {
                ruleId: rule.id,
                ruleName: rule.name
            }
        };
    }

    /**
     * Busca configuração do assistente para a loja
     */
    private async getConfig(storeId: string): Promise<ZeAssistantConfig | null> {
        const supabase = supabaseAdmin;
        if (!supabase) return null;

        const { data } = await supabase
            .from('ze_assistant_config')
            .select('*')
            .eq('store_id', storeId)
            .single();

        return data;
    }

    /**
     * Busca ou cria conversa
     */
    private async getOrCreateConversation(
        conversationId: string,
        storeId: string,
        customerPhone: string,
        customerName?: string
    ): Promise<ZeAssistantConversation> {
        const supabase = supabaseAdmin;
        if (!supabase) throw new Error('Supabase client error');

        // Tentar buscar conversa existente
        const { data: existing } = await supabase
            .from('ze_assistant_conversations')
            .select('*')
            .eq('store_id', storeId)
            .eq('conversation_id', conversationId)
            .single();

        if (existing) {
            // Atualizar last_interaction_at
            await supabase
                .from('ze_assistant_conversations')
                .update({ last_interaction_at: new Date().toISOString() })
                .eq('id', existing.id);

            return existing;
        }

        // Criar nova conversa
        const { data: newConv } = await supabase
            .from('ze_assistant_conversations')
            .insert({
                conversation_id: conversationId,
                store_id: storeId,
                customer_phone: customerPhone,
                customer_name: customerName,
                is_assistant_active: true,
                context_data: {
                    confusionCount: 0,
                    variables: {}
                }
            })
            .select()
            .single();

        return newConv!;
    }

    /**
     * Busca contexto da loja para IA
     */
    private async getStoreContext(storeId: string): Promise<any> {
        const supabase = supabaseAdmin;
        if (!supabase) return null;

        // Buscar dados da loja
        const { data: store } = await supabase
            .from('user_profiles')
            .select('store_name, phone_number, opening_hours, store_address_street, store_address_number, store_address_city, store_address_state')
            .eq('id', storeId)
            .single();

        // Buscar produtos ativos
        const { data: products } = await supabase
            .from('products')
            .select('id, name, price, description')
            .eq('store_id', storeId)
            .eq('is_active', true)
            .limit(100);

        return {
            storeName: store?.store_name || 'Loja',
            phone: store?.phone_number,
            openingHours: store?.opening_hours,
            address: store?.store_address_street
                ? `${store.store_address_street}, ${store.store_address_number} - ${store.store_address_city}/${store.store_address_state}`
                : null,
            products: products || []
        };
    }

    /**
     * Transfere conversa para atendente humano
     */
    async handoffToHuman(conversationId: string, reason: string): Promise<void> {
        const supabase = supabaseAdmin;
        if (!supabase) return;

        await supabase
            .from('ze_assistant_conversations')
            .update({
                handoff_to_human: true,
                handoff_at: new Date().toISOString(),
                handoff_reason: reason,
                is_assistant_active: false
            })
            .eq('id', conversationId);
    }

    /**
     * Retorna conversa para o assistente
     */
    async returnToAssistant(conversationId: string): Promise<void> {
        const supabase = supabaseAdmin;
        if (!supabase) return;

        await supabase
            .from('ze_assistant_conversations')
            .update({
                handoff_to_human: false,
                is_assistant_active: true,
                confusion_count: 0 // Resetar contador
            })
            .eq('id', conversationId);
    }

    /**
     * Registra mensagem processada
     */
    private async logMessage(
        conversationId: string,
        messageId: string | undefined,
        messageText: string,
        responseText: string,
        responseType: string,
        confidenceScore: number | undefined,
        processingTimeMs: number
    ): Promise<void> {
        const supabase = supabaseAdmin;
        if (!supabase) return;

        await supabase
            .from('ze_assistant_messages')
            .insert({
                conversation_id: conversationId,
                message_id: messageId,
                message_text: messageText,
                response_text: responseText,
                response_type: responseType,
                confidence_score: confidenceScore,
                processing_time_ms: processingTimeMs,
                was_successful: true
            });
    }

    /**
     * Atualiza contexto da conversa
     */
    private async updateConversationContext(
        conversationId: string,
        context: ConversationContext
    ): Promise<void> {
        const supabase = supabaseAdmin;
        if (!supabase) return;

        await supabase
            .from('ze_assistant_conversations')
            .update({
                context_data: context,
                confusion_count: context.confusionCount
            })
            .eq('id', conversationId);
    }

    /**
     * Delay helper
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Cria configuração padrão para uma loja
     */
    async createDefaultConfig(storeId: string): Promise<ZeAssistantConfig | null> {
        const supabase = supabaseAdmin;
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('ze_assistant_config')
            .insert({
                store_id: storeId,
                is_enabled: false, // Desativado por padrão
                ai_enabled: true,
                rules_enabled: true,
                can_create_orders: false,
                can_delivery: false,
                can_pickup: false
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar config:', error);
            return null;
        }

        return data;
    }

    /**
     * Atualiza configuração
     */
    async updateConfig(storeId: string, updates: Partial<ZeAssistantConfig>): Promise<boolean> {
        const supabase = supabaseAdmin;
        if (!supabase) return false;

        const { error } = await supabase
            .from('ze_assistant_config')
            .update(updates)
            .eq('store_id', storeId);

        return !error;
    }

    /**
     * Busca API Key do Gemini para a loja
     */
    private async getGeminiApiKey(storeId: string): Promise<string | null> {
        const supabase = supabaseAdmin;
        if (!supabase) return null;

        try {
            // Tentar buscar de shop_settings (onde AdminAIConfig salva)
            // A tabela shop_settings deve ter o campo google_gemini_api_key
            const { data: settings } = await supabase
                .from('shop_settings')
                .select('google_gemini_api_key')
                .eq('store_id', storeId)
                .single();

            if (settings && settings.google_gemini_api_key) {
                return settings.google_gemini_api_key;
            }

            // Fallback: Tentar tabela api_keys (keys globais ou de sistema)
            // Assumindo que se não está na config da loja, pode estar numa config global
            // ou talvez salva com nome 'google_gemini'
            const { data: apiKey } = await supabase
                .from('api_keys')
                .select('encrypted_key') // O cloud.ts usa esse campo, mas AdminAIConfig salva direto?
                .eq('name', 'google_gemini')
                .eq('user_id', storeId) // Se api_keys for por usuário/loja
                .single();

            if (apiKey?.encrypted_key) {
                return apiKey.encrypted_key;
            }

            return null;
        } catch (error) {
            console.error('Erro ao buscar Gemini API Key:', error);
            return null;
        }
    }
}

export const zeAssistantService = new ZeAssistantService();

