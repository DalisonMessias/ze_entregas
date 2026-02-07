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
     * Processa mensagem recebida via WhatsApp
     */

    /**
     * Busca configuração da loja ou cria padrão se não existir (Self-Healing)
     */
    public async getConfig(storeId: string): Promise<ZeAssistantConfig | null> {
        const { data, error } = await supabaseAdmin
            .from('ze_assistant_config')
            .select('*')
            .eq('store_id', storeId)
            .single();

        if (error && error.code === 'PGRST116') { // Not found
            console.log(`[ZeAssistant] Config não encontrada para loja ${storeId}. Criando padrão...`);
            const { data: newConfig, error: createError } = await supabaseAdmin
                .from('ze_assistant_config')
                .insert({
                    store_id: storeId,
                    is_enabled: true,
                    ai_enabled: true,
                    greeting_message: 'Olá! Sou o Zé, o assistente virtual da loja. Em que posso ajudar?',
                    fallback_message: 'Desculpe, não entendi. Vou chamar um atendente.',
                    instruction_closed_store: 'Estamos fechados no momento.',
                })
                .select()
                .single();

            if (createError) {
                console.error('[ZeAssistant] Erro ao criar config padrão:', createError);
                return null;
            }
            return newConfig;
        }

        if (error) {
            console.error('[ZeAssistant] Erro ao buscar config:', error);
            return null;
        }

        return data;
    }

    /**
     * Processa mensagem recebida via WhatsApp/Internal
     */
    async processMessage(payload: ProcessMessagePayload): Promise<ProcessMessageResponse> {
        console.log(`[ZeAssistant] 🚀 Iniciando processamento para ${payload.conversationId}`);
        const startTime = Date.now();

        try {
            // 1. Buscar ou Criar Configuração
            const config = await this.getConfig(payload.storeId);
            if (!config) {
                console.error('[ZeAssistant] Falha crítica: Config nula após tentativa de criação.');
                return { success: false, responseText: '', responseType: 'HUMAN', shouldHandoff: true };
            }

            // 2. Verificar Status da Loja
            // NOTA: Se o bot estiver habilitado, ele deve responder mesmo com loja fechada (ex: avisando horário)
            // A lógica de "silêncio" deve ser controlada pela configuração is_enabled global

            if (!config.is_enabled) {
                console.log(`[ZeAssistant] Bot desativado globalmente para loja ${payload.storeId}`);
                return {
                    success: false,
                    responseText: '',
                    responseType: 'HUMAN',
                    shouldHandoff: true,
                    handoffReason: 'Assistente desativado'
                };
            }

            // 3. Verificar Abertura (Manual e Automática)
            const storeContext = await this.getStoreContext(payload.storeId);
            const isManualOpen = storeContext?.isCurrentlyOpen === true;
            const isAutoOpen = this.checkIfStoreIsOpen(storeContext?.openingHours);
            const isOpen = isManualOpen && isAutoOpen;

            console.log(`[ZeAssistant] 🏥 Status Loja (${payload.storeId}): Manual=${isManualOpen}, Auto=${isAutoOpen} -> FINAL=${isOpen}`);

            // ... resto do código

            // 4. Buscar ou criar conversa
            const conversation = await this.getOrCreateConversation(
                payload.conversationId,
                payload.storeId,
                payload.customerPhone,
                payload.customerName
            );

            // 4.1 Verificar se o assistente está explicitamente desativado para esta conversa
            if (conversation && conversation.is_assistant_active === false) {
                console.log(`[ZeAssistant] Assistente desativado para a conversa ${payload.conversationId}`);
                return {
                    success: false,
                    responseText: '',
                    responseType: 'HUMAN',
                    shouldHandoff: true,
                    handoffReason: 'Assistente desativado nesta conversa'
                };
            }

            // 4.2 Verificar se o contato está bloqueado no chat principal
            const { data: mainConv } = await supabaseAdmin
                .from('chat_conversations')
                .select('is_blocked')
                .eq('store_id', payload.storeId)
                .eq('conversation_id', payload.conversationId)
                .maybeSingle();

            if (mainConv?.is_blocked) {
                console.log(`[ZeAssistant] 🚫 Contato bloqueado, enviando mensagem de redirecionamento: ${payload.conversationId}`);

                return {
                    success: true,
                    // Formato JSON para o frontend renderizar botões
                    responseText: `BUTTONS: ${JSON.stringify({
                        message: "🚫 *Atendimento Indisponível*\n\nIdentificamos que seu acesso a este canal está temporariamente suspenso.",
                        buttons: [
                            {
                                text: "Falar com Suporte",
                                url: "/suporte",
                                type: "url"
                            }
                        ]
                    })}`,
                    responseType: 'RULE',
                    shouldHandoff: false,
                    handoffReason: ''
                };
            }

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
                    // Buscar histórico para IA (últimas 10 mensagens)
                    const history = await this.getConversationHistory(conversation.id);

                    // Se o histórico estiver vazio e o contexto tiver dados de pedido, reseta o contexto
                    if (history.length === 0 && (context.currentFlow || context.flowStep)) {
                        console.log(`[ZeAssistant] 🧹 Limpando contexto residual (Closed Store) para ${conversation.id}`);
                        context.currentFlow = null;
                        context.flowStep = null;
                        context.variables = {};
                        context.lastIntent = null;
                    }

                    response = await zeAssistantAIService.processMessage(
                        payload.messageText,
                        { ...storeContext, isClosed: true, closedInstruction: config.instruction_closed_store },
                        context,
                        geminiKey,
                        history
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

                    // Buscar histórico para IA (últimas 10 mensagens)
                    const history = await this.getConversationHistory(conversation.id);

                    // Se o histórico estiver vazio e o contexto tiver dados de pedido, reseta o contexto
                    if (history.length === 0 && (context.currentFlow || context.flowStep)) {
                        console.log(`[ZeAssistant] 🧹 Limpando contexto residual (AI) para ${conversation.id}`);
                        context.currentFlow = null;
                        context.flowStep = null;
                        context.variables = {};
                        context.lastIntent = null;
                    }

                    response = await zeAssistantAIService.processMessage(
                        payload.messageText,
                        { ...storeContext, isClosed: !isOpen },
                        context,
                        geminiKey,
                        history
                    );
                    response.responseType = 'AI';

                    // Detectar gatilho de pedido vindo da IA
                    if (response.success && response.responseText.includes('[INICIAR_PEDIDO]')) {
                        console.log('[ZeAssistant] 🛒 IA solicitou início de pedido!');
                        response.responseText = response.responseText.replace('[INICIAR_PEDIDO]', '').trim();

                        // Iniciar fluxo de pedido
                        context.currentFlow = 'ORDER';
                        context.flowStep = 'ADDRESS';

                        // Opcional: Adicionar mensagem extra instruindo sobre o endereço?
                        // O próprio fluxo ORDER espera o endereço na próxima mensagem, 
                        // mas talvez devêssemos já perguntar? 
                        // A próxima interação do usuário entrará no processOrderFlow.
                        // Mas a resposta ATUAL é apenas o texto da IA.
                        // Vamos adicionar uma pergunta ao final se a IA não tiver feito.
                        const hasAddressRequest = response.responseText.toLowerCase().includes('endereço') ||
                            response.responseText.toLowerCase().includes('onde entrega');

                        if (!hasAddressRequest) {
                            response.responseText += '\n\nPara começarmos, você prefere *Entrega* ou vai *Retirar* aqui na loja?';
                        }
                    }
                }
            }

            // 8. Se nem regra nem IA funcionaram, usar fallback
            if (!response || !response.success) {
                context.confusionCount++;

                const errorMessage = response?.responseText || 'IA indisponível no momento';

                // Verificar se deve transferir para humano
                if (config.auto_handoff_on_confusion &&
                    context.confusionCount >= config.max_confusion_attempts) {
                    await this.handoffToHuman(conversation.id, 'Múltiplas confusões');

                    return {
                        success: true,
                        responseText: `🤖 *Zé Informa:* Notei que estamos com dificuldades. Transferi você para um humano. (Motivo: ${errorMessage.substring(0, 50)})`,
                        responseType: 'HUMAN',
                        shouldHandoff: true,
                        handoffReason: 'Limite de confusões atingido'
                    };
                }

                response = {
                    success: true,
                    responseText: `🤖 *Zé Informa:* No momento estou com uma instabilidade técnica (${errorMessage.substring(0, 100) || 'Sem resposta da IA'}). Pode tentar novamente em alguns segundos ou chamar um humano?`,
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

        // VALIDAÇÃO DE INTENÇÃO: Se o usuário mudar de assunto drasticamente, pausamos o fluxo
        const intent = await zeAssistantAIService.extractIntent(messageText);
        // REMOVIDO 'INFO' da lista de distractors para não travar em frases de retirada/informação do pedido
        const distractors = ['MENU', 'GREETING', 'HUMAN'];
        if (intent && distractors.includes(intent) && step !== 'CONFIRMATION') {
            console.log(`[ZeAssistant] 🔀 Usuário mudou de assunto (Intenção: ${intent}). Pausando fluxo de pedido.`);
            context.currentFlow = null;
            context.flowStep = null;
            return null; // Deixa a IA tratar a nova intenção
        }

        if (step === 'ADDRESS') {
            const lowerText = messageText.toLowerCase();
            const isPickup = lowerText.includes('retirar') ||
                lowerText.includes('buscar') ||
                lowerText.includes('balcão') ||
                lowerText.includes('retira') ||
                lowerText.includes('vou aí') ||
                lowerText.includes('vou ai') ||
                lowerText.includes('pegar');

            if (isPickup) {
                context.variables.deliveryAddress = 'RETIRADA NO LOCAL';
                context.flowStep = 'ITEMS';
                return {
                    success: true,
                    responseText: 'Perfeito! Você vai retirar aqui com a gente. 🏃💨\n\nQual seria o seu pedido? (Pode listar os itens e quantidades, ou se já falou, manda um "OK")',
                    responseType: 'RULE',
                    shouldHandoff: false
                };
            }

            // Se não for retirada, assumimos que é endereço de entrega
            context.variables.deliveryAddress = messageText;
            context.flowStep = 'ITEMS';
            return {
                success: true,
                responseText: 'Entendido! Anotei o endereço de entrega. ✅\n\nQual seria o seu pedido? (Pode listar os itens e quantidades, ou se já falou, manda um "OK")',
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
        const supabase = supabaseAdmin; // Para perfis costuma funcionar
        const anonSb = cloud.getClient(); // Para produtos (fix erro 42501)
        if (!supabase || !anonSb) return null;

        // Buscar dados da loja
        const { data: store } = await supabase
            .from('user_profiles')
            .select('store_name, phone_number, opening_hours, is_currently_open, is_open, store_address_street, store_address_number, store_address_city, store_address_state')
            .eq('id', storeId)
            .single();

        // Buscar config do assistente (novo)
        const { data: assistantConfig } = await supabase
            .from('ze_assistant_config')
            .select('assistant_name, instruction_closed_store')
            .eq('store_id', storeId)
            .single();

        // Buscar produtos ativos (Usando Anon Key para evitar erro de permissão 42501 do service_role)
        const { data: products, error: productsError } = await anonSb
            .from('products')
            .select('id, name, price, description, store_id, is_active')
            .eq('store_id', storeId)
            .limit(100);

        if (productsError) {
            console.error('[ZeAssistant] ERRO AO BUSCAR PRODUTOS:', productsError);
        }

        const count = products?.length || 0;
        console.log(`[ZeAssistant] DEBUG NUCLEAR: ${count} produtos encontrados no TOTAL.`);

        if (count > 0) {
            console.log(`[ZeAssistant] Exemplos Globais: ${products?.slice(0, 5).map(p => `${p.name} (Store: ${p.store_id})`).join(', ')}`);
            const matched = products?.filter(p => p.store_id === storeId);
            console.log(`[ZeAssistant] Produtos desta loja (${storeId}): ${matched?.length || 0}`);
        } else {
            console.warn('[ZeAssistant] NENHUM PRODUTO ENCONTRADO NO BANCO (QUERY ATUAL).');
        }

        const isManualOpen = store?.is_open !== false && store?.is_currently_open !== false;
        const activeProducts = products?.filter(p => p.is_active) || [];

        return {
            storeName: store?.store_name || 'Loja',
            assistantName: assistantConfig?.assistant_name || 'Zé',
            phone: store?.phone_number,
            openingHours: store?.opening_hours,
            isCurrentlyOpen: isManualOpen, // Consolidado: se qualquer um for false, está fechado
            address: `${store?.store_address_street || ''}, ${store?.store_address_number || ''} - ${store?.store_address_city || ''}`,
            products: activeProducts,
            closedInstruction: assistantConfig?.instruction_closed_store
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
     * Busca histórico recente da conversa para enviar à IA
     */
    private async getConversationHistory(conversationId: string, limit: number = 10): Promise<Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>> {
        const supabase = supabaseAdmin;
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('ze_assistant_messages')
            .select('message_text, response_text')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error || !data) return [];

        // Inverter para ordem cronológica (Gemini espera do mais antigo para o mais novo)
        const history = data.reverse().flatMap(msg => [
            { role: 'user' as const, parts: [{ text: msg.message_text }] },
            { role: 'model' as const, parts: [{ text: msg.response_text }] }
        ]);

        return history;
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
    /**
     * Busca API Key do Gemini com estratégia robusta de Fallback
     */
    private async getGeminiApiKey(storeId: string): Promise<string | null> {
        try {
            // Usa o novo serviço centralizado que já lida com isolamento por loja e fallback global
            const key = await cloud.getAPIKey('google_gemini', storeId);

            if (key) {
                console.log(`[ZeAssistant] 🔑 API Key obtida via serviço centralizado (Store: ${storeId})`);
                return key;
            }

            // Fallback Terminal: Variável de Ambiente (apenas se o banco falhar e houver .env)
            const envKey = process.env.GEMINI_API_KEY;
            if (envKey) {
                console.log('[ZeAssistant] 🔑 Usando API Key do ambiente (ENV)');
                return envKey;
            }

            console.warn('[ZeAssistant] ⚠️ Nenhuma API Key do Gemini encontrada!');
            return null;
        } catch (error) {
            console.error('[ZeAssistant] Erro ao recuperar API Key:', error);
            return null;
        }
    }

    /**
     * Verifica se a loja está aberta baseada na string de opening_hours
     */
    private checkIfStoreIsOpen(openingHours: string | null | undefined): boolean {
        if (!openingHours) return true; // Se não tem horário, assume aberto

        try {
            // Ajustar para Fuso Horário Brasil (UTC-3)
            // Agora usa toLocaleString para garantir o horário correto independentemente do servidor
            const now = new Date();
            const brTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));

            const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
            const currentDay = days[brTime.getDay()];
            const currentTime = brTime.getHours() * 100 + brTime.getMinutes();

            console.log(`[ZeAssistant] 🕒 Verificando Horário: Hoje=${currentDay}, Agora=${currentTime}, Config=${openingHours}`);

            const dayConfigs = openingHours.toLowerCase().split(',').map(s => s.trim());
            const todayConfig = dayConfigs.find(c => c.startsWith(currentDay));

            if (!todayConfig) {
                console.log(`[ZeAssistant] 🕒 Sem config para hoje (${currentDay}), assumindo ABERTO.`);
                return true;
            }

            const timeRange = todayConfig.split(':')[1]?.trim();
            if (!timeRange || timeRange === 'fechado' || timeRange === '24h') {
                const isOpenStatus = timeRange !== 'fechado';
                console.log(`[ZeAssistant] 🕒 Status Especial: ${timeRange} -> Aberto=${isOpenStatus}`);
                return isOpenStatus;
            }

            const [start, end] = timeRange.split('-').map(t => {
                const [h, m] = t.trim().split(':').map(Number);
                return h * 100 + m;
            });

            const isInRange = currentTime >= start && currentTime <= end;
            console.log(`[ZeAssistant] 🕒 Faixa Horária: ${start} até ${end} -> Dentro=${isInRange}`);
            return isInRange;
        } catch (error) {
            console.error('[ZeAssistant] Erro ao validar horário:', error);
            return true;
        }
    }
}

export const zeAssistantService = new ZeAssistantService();
