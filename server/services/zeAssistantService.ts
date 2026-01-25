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
            // 1. Buscar Configuração
            const config = await this.getConfig(payload.storeId);
            if (!config) return { success: false, responseText: '', responseType: 'HUMAN', shouldHandoff: true };

            // 2. Verificar se a loja está aberta
            const storeContext = await this.getStoreContext(payload.storeId);
            const isOpen = this.checkIfStoreIsOpen(storeContext?.openingHours);

            // 3. Se estiver aberta, verificar se assistente está ativo
            if (isOpen && !config.is_enabled) {
                return {
                    success: false,
                    responseText: '',
                    responseType: 'HUMAN',
                    shouldHandoff: true,
                    handoffReason: 'Assistente desativado'
                };
            }

            // 4. Buscar ou criar conversa
            const conversation = await this.getOrCreateConversation(
                payload.conversationId,
                payload.storeId,
                payload.customerPhone,
                payload.customerName
            );

            // Se conversa foi transferida para humano e LOJA ESTÁ ABERTA, não processar
            // (Se loja fechada, o bot assume sempre)
            if (conversation.handoff_to_human && isOpen) {
                return {
                    success: false,
                    responseText: '',
                    responseType: 'HUMAN',
                    shouldHandoff: true,
                    handoffReason: 'Conversa com atendente humano'
                };
            }

            // 5. Buscar contexto da conversa
            const context: ConversationContext = conversation.context_data as ConversationContext || {
                confusionCount: conversation.confusion_count || 0,
                variables: {},
                currentFlow: null,
                flowStep: null
            };

            let response: ProcessMessageResponse | null = null;

            // 6. Se LOJA FECHADA, usar IA DIRETAMENTE (Super Bot)
            if (!isOpen) {
                const geminiKey = await this.getGeminiApiKey(payload.storeId);
                if (geminiKey) {
                    response = await zeAssistantAIService.processMessage(
                        payload.messageText,
                        { ...storeContext, isClosed: true, closedInstruction: config.instruction_closed_store },
                        context,
                        geminiKey
                    );
                    response.responseType = 'AI';
                }

                // Fallback se IA falhar ou não houver chave
                if (!response || !response.success) {
                    response = {
                        success: true,
                        responseText: config.instruction_closed_store || 'Olá! No momento estamos fechados, mas deixe sua mensagem que responderemos em breve.',
                        responseType: 'RULE',
                        shouldHandoff: false
                    };
                }
            } else {
                // 7. Fluxo normal para loja aberta...
                // Se estiver em um fluxo guiado, processar o passo do fluxo
                if (context.currentFlow === 'ORDER') {
                    response = await this.processOrderFlow(payload.messageText, payload.storeId, context);
                }

                // Tentar processar com REGRAS FIXAS (se não estiver em fluxo ou se o fluxo não gerou resposta)
                if (!response && config.rules_enabled) {
                    response = await this.processWithRules(
                        payload.messageText,
                        payload.storeId,
                        context
                    );
                }

                // Se regras indicarem início de pedido, iniciar o fluxo
                if (response?.metadata?.isOrderStart) {
                    context.currentFlow = 'ORDER';
                    context.flowStep = 'ADDRESS';
                }

                // Se nada funcionou e IA está ativada, usar IA
                if (!response && config.ai_enabled) {
                    const geminiKey = await this.getGeminiApiKey(payload.storeId) || '';
                    response = await zeAssistantAIService.processMessage(
                        payload.messageText,
                        storeContext,
                        context,
                        geminiKey
                    );
                    response.responseType = 'AI';
                }
            }

            // 8. Se nem regra nem IA funcionaram, usar fallback
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
     * Gerencia o fluxo estruturado de pedidos
     */
    private async processOrderFlow(
        messageText: string,
        storeId: string,
        context: ConversationContext
    ): Promise<ProcessMessageResponse | null> {
        const step = context.flowStep;

        if (step === 'ADDRESS') {
            context.variables.deliveryAddress = messageText;
            context.flowStep = 'ITEMS';
            return {
                success: true,
                responseText: 'Entendido! Agora, o que você gostaria de pedir? (Pode listar os itens e quantidades)',
                responseType: 'RULE',
                shouldHandoff: false
            };
        }

        if (step === 'ITEMS') {
            context.variables.orderItems = messageText;
            context.flowStep = 'PAYMENT';
            return {
                success: true,
                responseText: 'Perfeito. Qual será a forma de pagamento? (Dinheiro, Cartão ou Pix)',
                responseType: 'RULE',
                shouldHandoff: false
            };
        }

        if (step === 'PAYMENT') {
            context.variables.paymentMethod = messageText;
            context.flowStep = 'CONFIRMATION';

            const summary = `*Resumo do Pedido*\n\n` +
                `📍 *Endereço:* ${context.variables.deliveryAddress}\n` +
                `🛒 *Itens:* ${context.variables.orderItems}\n` +
                `💳 *Pagamento:* ${context.variables.paymentMethod}\n\n` +
                `Confirma o pedido? (Responda "Sim" para finalizar)`;

            return {
                success: true,
                responseText: summary,
                responseType: 'RULE',
                shouldHandoff: false
            };
        }

        if (step === 'CONFIRMATION') {
            if (messageText.toLowerCase().includes('sim')) {
                context.currentFlow = null;
                context.flowStep = null;

                return {
                    success: true,
                    responseText: 'Pedido confirmado com sucesso! 🎉 Um atendente irá validar as informações e entrar em contato em breve.',
                    responseType: 'RULE',
                    shouldHandoff: true,
                    handoffReason: 'Pedido finalizado pelo assistente'
                };
            } else if (messageText.toLowerCase().includes('não') || messageText.toLowerCase().includes('nao')) {
                context.currentFlow = null;
                context.flowStep = null;
                return {
                    success: true,
                    responseText: 'Sem problemas. Pedido cancelado. Se precisar de algo mais, é só chamar!',
                    responseType: 'RULE',
                    shouldHandoff: false
                };
            }
        }

        return null;
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

    /**
     * Verifica se a loja está aberta baseada na string de opening_hours
     */
    private checkIfStoreIsOpen(openingHours: string | null | undefined): boolean {
        if (!openingHours) return true; // Se não tem horário, assume aberto

        try {
            const now = new Date();
            const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
            const currentDay = days[now.getDay()];
            const currentTime = now.getHours() * 100 + now.getMinutes();

            // Exemplo esperado: "segunda: 08:00-18:00, terça: 08:00-18:00..."
            const dayConfigs = openingHours.toLowerCase().split(',').map(s => s.trim());
            const todayConfig = dayConfigs.find(c => c.startsWith(currentDay));

            if (!todayConfig) return true;

            const timeRange = todayConfig.split(':')[1]?.trim();
            if (!timeRange || timeRange === 'fechado' || timeRange === '24h') {
                return timeRange !== 'fechado';
            }

            const [start, end] = timeRange.split('-').map(t => {
                const [h, m] = t.trim().split(':').map(Number);
                return h * 100 + m;
            });

            // Lógica simples (não trata horários que passam da meia-noite)
            if (end < start) {
                // Horário atravessa meia-noite (ex: 18:00 - 02:00)
                return currentTime >= start || currentTime <= end;
            }

            return currentTime >= start && currentTime <= end;
        } catch (e) {
            console.error('[ZeAssistant] Erro ao validar horário:', e);
            return true;
        }
    }
}

export const zeAssistantService = new ZeAssistantService();

