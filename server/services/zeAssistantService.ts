import { supabaseAdmin } from './supabaseClient.js';
import * as cloud from '../../services/cloud.js';
import { zeAssistantRulesService } from './zeAssistantRulesService.js';
import { zeAssistantAIService } from './zeAssistantAIService.js';
import { zeAssistantKnowledgeService } from './zeAssistantKnowledgeService.js';
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
     * Busca configuração da loja
     */
    public async getConfig(storeId: string): Promise<ZeAssistantConfig | null> {
        const { data, error } = await supabaseAdmin
            .from('ze_assistant_config')
            .select('*')
            .eq('store_id', storeId)
            .maybeSingle();

        if (!data || error) {
            console.log(`[ZeAssistant] Config não encontrada para loja ${storeId}.`);
            return null;
        }

        return data;
    }

    /**
     * Processa mensagem recebida via WhatsApp/Internal
     */
    async processMessage(payload: ProcessMessagePayload): Promise<ProcessMessageResponse> {
        console.log(`[ZeAssistant] 🚀 Processando mensagem para conversa: ${payload.conversationId}`);
        const startTime = Date.now();

        try {
            // Tratamento especial para mensagens de teste (Simulador do WhatsBot)
            const payloadAny = payload as any;
            if (payloadAny.isTest) {
                console.log(`[ZeAssistant] 🧪 Processando mensagem de TESTE para loja: ${payload.storeId}`);
                
                const storeContext = await this.getStoreContext(payload.storeId);
                // Injetar o Nome e Contexto temporários passados pelo frontend para o teste em tempo real
                storeContext.assistantName = payloadAny.aiName || storeContext.assistantName || 'Aurora';
                storeContext.aiInstructions = payloadAny.aiContext || storeContext.aiInstructions || 'Você é um assistente virtual.';
                
                // Buscar conhecimento no banco (FAQ/Produtos sincronizados) para os testes funcionarem com o RAG real
                const knowledge = await zeAssistantKnowledgeService.listAll(payload.storeId);
                storeContext.knowledgeBase = knowledge;

                const context: ConversationContext = {
                    confusionCount: 0,
                    variables: {
                        contactPhone: payload.customerPhone || '553598393707',
                        storeId: payload.storeId
                    },
                    currentFlow: null
                };

                const apiKeys = {
                    gemini: await this.getGeminiApiKey(payload.storeId) || undefined,
                    groq: await this.getGroqApiKey(payload.storeId) || undefined
                };
                const primaryProvider = await this.getPrimaryAIProvider(payload.storeId);

                const response = await zeAssistantAIService.processMessage(
                    payload.messageText,
                    storeContext,
                    context,
                    apiKeys,
                    primaryProvider as any,
                    [] // Sem histórico de conversas do banco para o simulador ficar isolado
                );

                return response;
            }

            // 1. Configuração e Contexto (Fluxo de Produção Real)
            const config = await this.getConfig(payload.storeId);
            if (!config || !config.is_enabled) {
                return { success: false, responseText: '', responseType: 'HUMAN', shouldHandoff: true };
            }

            const storeContext = await this.getStoreContext(payload.storeId);
            const isOpen = this.checkIfStoreIsOpen(storeContext?.openingHours) && storeContext?.isCurrentlyOpen;

            const conversation = await this.getOrCreateConversation(
                payload.conversationId,
                payload.storeId,
                payload.customerPhone,
                payload.customerName
            );

            if (!conversation.is_assistant_active || (conversation.handoff_to_human && isOpen)) {
                return { success: false, responseText: '', responseType: 'HUMAN', shouldHandoff: true };
            }

            const context: ConversationContext = conversation.context_data as ConversationContext || {
                confusionCount: 0,
                variables: {},
                currentFlow: null
            };

            let response: ProcessMessageResponse | null = null;

            // 2. Lógica de Orquestração
            if (!isOpen) {
                // Loja Fechada: IA assume com instrução de fechamento
                const apiKeys = {
                    gemini: await this.getGeminiApiKey(payload.storeId) || undefined,
                    groq: await this.getGroqApiKey(payload.storeId) || undefined
                };
                const primaryProvider = await this.getPrimaryAIProvider(payload.storeId);
                
                response = await zeAssistantAIService.processMessage(
                    payload.messageText,
                    { ...storeContext, isClosed: true, closedInstruction: config.instruction_closed_store },
                    context,
                    apiKeys,
                    primaryProvider as any
                );
            } else {
                // Loja Aberta: Regras -> IA
                if (config.rules_enabled) {
                    response = await this.processWithRules(payload.messageText, payload.storeId, context);
                }

                if (!response && config.ai_enabled) {
                    const apiKeys = {
                        gemini: await this.getGeminiApiKey(payload.storeId) || undefined,
                        groq: await this.getGroqApiKey(payload.storeId) || undefined
                    };
                    const primaryProvider = await this.getPrimaryAIProvider(payload.storeId);
                    const history = await this.getConversationHistory(conversation.id);

                    response = await zeAssistantAIService.processMessage(
                        payload.messageText,
                        storeContext,
                        context,
                        apiKeys,
                        primaryProvider as any,
                        history
                    );
                }
            }

            // 3. Fallback e Log
            if (!response || !response.success) {
                response = {
                    success: true,
                    responseText: config.fallback_message || 'No momento não consegui processar sua solicitação. Um atendente já vai te ajudar!',
                    responseType: 'RULE',
                    shouldHandoff: true
                };
            }

            await this.logMessage(
                conversation.id,
                payload.messageId,
                payload.messageText,
                response.responseText,
                response.responseType,
                response.confidenceScore,
                Date.now() - startTime
            );

            await this.updateConversationContext(conversation.id, context);

            return response;

        } catch (error) {
            console.error('[ZeAssistant] Erro fatal no processamento:', error);
            return { success: false, responseText: 'Erro técnico.', responseType: 'HUMAN', shouldHandoff: true };
        }
    }

    /**
     * Métodos Privados de Apoio
     */

    private async getStoreContext(storeId: string): Promise<any> {
        const { data: store } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('id', storeId)
            .single();

        const { data: config } = await supabaseAdmin
            .from('ze_assistant_config')
            .select('*')
            .eq('store_id', storeId)
            .maybeSingle();

        const { data: products } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('store_id', storeId)
            .eq('is_active', true)
            .limit(50);

        return {
            storeName: store?.store_name || 'Loja',
            address: store?.store_address_street,
            openingHours: store?.opening_hours,
            isCurrentlyOpen: store?.is_currently_open,
            assistantName: config?.assistant_name,
            aiInstructions: config?.ai_instructions,
            products: products || []
        };
    }

    private checkIfStoreIsOpen(openingHours: string | null): boolean {
        // Lógica simplificada de horário
        return true; 
    }

    private async getOrCreateConversation(id: string, storeId: string, phone: string, name?: string): Promise<any> {
        const { data: existing } = await supabaseAdmin
            .from('ze_assistant_conversations')
            .select('*')
            .eq('conversation_id', id)
            .maybeSingle();

        if (existing) return existing;

        const { data: created } = await supabaseAdmin
            .from('ze_assistant_conversations')
            .insert({
                conversation_id: id,
                store_id: storeId,
                customer_phone: phone,
                customer_name: name,
                is_assistant_active: true
            })
            .select()
            .single();

        return created;
    }

    private async processWithRules(text: string, storeId: string, context: any) {
        const match = await zeAssistantRulesService.findMatchingRule(text, storeId);
        if (!match.rule) return null;

        const responseText = await zeAssistantRulesService.applyTemplate(match.rule, storeId, context);
        return {
            success: true,
            responseText,
            responseType: 'RULE' as const,
            shouldHandoff: false,
            confidenceScore: match.confidence
        };
    }

    private async getGeminiApiKey(storeId: string): Promise<string | null> {
        try {
            const { data: geminiRow } = await supabaseAdmin
                .from('api_keys')
                .select('key_token, key_value')
                .eq('service_name', 'google_gemini')
                .eq('store_id', storeId)
                .eq('is_active', true)
                .maybeSingle();

            let geminiKey = geminiRow?.key_token || geminiRow?.key_value;

            if (!geminiKey) {
                const { data: globalGeminiRow } = await supabaseAdmin
                    .from('api_keys')
                    .select('key_token, key_value')
                    .eq('service_name', 'google_gemini')
                    .is('store_id', null)
                    .eq('is_active', true)
                    .maybeSingle();
                geminiKey = globalGeminiRow?.key_token || globalGeminiRow?.key_value;
            }

            if (!geminiKey) {
                geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
            }

            return geminiKey || null;
        } catch (error) {
            console.error('[ZeAssistant] Erro ao buscar Gemini API Key:', error);
            return null;
        }
    }

    private async getGroqApiKey(storeId: string): Promise<string | null> {
        try {
            const { data: groqRow } = await supabaseAdmin
                .from('api_keys')
                .select('key_token, key_value')
                .eq('service_name', 'groq')
                .eq('store_id', storeId)
                .eq('is_active', true)
                .maybeSingle();

            let groqKey = groqRow?.key_token || groqRow?.key_value;

            if (!groqKey) {
                const { data: globalGroqRow } = await supabaseAdmin
                    .from('api_keys')
                    .select('key_token, key_value')
                    .eq('service_name', 'groq')
                    .is('store_id', null)
                    .eq('is_active', true)
                    .maybeSingle();
                groqKey = globalGroqRow?.key_token || globalGroqRow?.key_value;
            }

            if (!groqKey) {
                groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
            }

            return groqKey || null;
        } catch (error) {
            console.error('[ZeAssistant] Erro ao buscar Groq API Key:', error);
            return null;
        }
    }

    private async getPrimaryAIProvider(storeId?: string): Promise<string> {
        try {
            let primaryProvider = 'google_gemini';

            if (storeId) {
                const { data: providerRow } = await supabaseAdmin
                    .from('api_keys')
                    .select('key_token')
                    .eq('service_name', 'ai_primary_provider')
                    .eq('store_id', storeId)
                    .maybeSingle();
                if (providerRow?.key_token) {
                    primaryProvider = providerRow.key_token;
                }
            }

            if (primaryProvider !== 'google_gemini' && primaryProvider !== 'groq') {
                const { data: globalProviderRow } = await supabaseAdmin
                    .from('api_keys')
                    .select('key_token')
                    .eq('service_name', 'ai_primary_provider')
                    .is('store_id', null)
                    .maybeSingle();
                if (globalProviderRow?.key_token) {
                    primaryProvider = globalProviderRow.key_token;
                }
            }

            return primaryProvider || 'google_gemini';
        } catch (error) {
            console.error('[ZeAssistant] Erro ao buscar Primary AI Provider:', error);
            return 'google_gemini';
        }
    }

    private async getConversationHistory(convId: string) {
        const { data } = await supabaseAdmin
            .from('ze_assistant_messages')
            .select('message_text, response_text')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(10);

        return (data || []).reverse().flatMap(m => [
            { role: 'user' as const, parts: [{ text: m.message_text }] },
            { role: 'model' as const, parts: [{ text: m.response_text }] }
        ]);
    }

    private async logMessage(convId: string, msgId: any, text: string, resp: string, type: string, conf: any, time: number) {
        await supabaseAdmin.from('ze_assistant_messages').insert({
            conversation_id: convId,
            message_id: msgId,
            message_text: text,
            response_text: resp,
            response_type: type,
            confidence_score: conf,
            processing_time_ms: time
        });
    }

    private async updateConversationContext(id: string, context: any) {
        await supabaseAdmin.from('ze_assistant_conversations')
            .update({ context_data: context })
            .eq('id', id);
    }

    /**
     * Transfere a conversa para atendimento humano
     */
    public async handoffToHuman(conversationId: string, reason?: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('ze_assistant_conversations')
            .update({
                handoff_to_human: true,
                handoff_at: new Date().toISOString(),
                handoff_reason: reason || null,
                updated_at: new Date().toISOString()
            })
            .eq('conversation_id', conversationId);

        if (error) {
            console.error(`[ZeAssistant] Erro ao fazer handoff para conversa ${conversationId}:`, error);
            throw error;
        }
        console.log(`[ZeAssistant] Conversa ${conversationId} transferida para humano. Motivo: ${reason || 'Não informado'}`);
    }

    /**
     * Retorna o controle da conversa para o assistente virtual
     */
    public async returnToAssistant(conversationId: string): Promise<void> {
        const { error } = await supabaseAdmin
            .from('ze_assistant_conversations')
            .update({
                handoff_to_human: false,
                handoff_at: null,
                handoff_reason: null,
                updated_at: new Date().toISOString()
            })
            .eq('conversation_id', conversationId);

        if (error) {
            console.error(`[ZeAssistant] Erro ao retornar para assistente a conversa ${conversationId}:`, error);
            throw error;
        }
        console.log(`[ZeAssistant] Conversa ${conversationId} retornou para o assistente.`);
    }
}

export const zeAssistantService = new ZeAssistantService();
