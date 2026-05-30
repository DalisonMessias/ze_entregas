import { supabaseAdmin } from './supabaseClient.js';
import * as cloud from '../../services/cloud.js';
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
            // 1. Configuração e Contexto
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

    private async getGeminiApiKey(storeId: string) {
        return cloud.getAPIKey('google_gemini', storeId);
    }

    private async getGroqApiKey(storeId: string) {
        const data = await cloud.getApiKeyFullDetails('groq', storeId);
        return data?.is_active ? data.key : null;
    }

    private async getPrimaryAIProvider(storeId?: string) {
        const provider = await cloud.getAPIKey('ai_primary_provider', storeId);
        return provider || 'google_gemini';
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
}

export const zeAssistantService = new ZeAssistantService();
