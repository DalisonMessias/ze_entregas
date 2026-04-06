import type { ProcessMessageResponse, ConversationContext } from '../../types/zeAssistant.js';

/**
 * Serviço de IA do Zé Assistente
 * Processa mensagens usando inteligência artificial do Google Gemini
 */
export class ZeAssistantAIService {


    constructor() {
        console.log('🤖 ZeAssistantAIService inicializado');
    }

    /**
     * Processa mensagem com IA
     */
    async processMessage(
        messageText: string,
        storeContext: any,
        conversationContext: ConversationContext,
        apiKey: string,
        history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
    ): Promise<ProcessMessageResponse> {

        // Verificar se IA está configurada
        if (!apiKey) {
            console.warn('IA não configurada - API Key ausente');
            return {
                success: false,
                responseText: 'Desculpe, o assistente de IA não está disponível no momento (configuração pendente).',
                responseType: 'AI',
                shouldHandoff: true,
                handoffReason: 'IA não configurada'
            };
        }

        try {
            const startTime = Date.now();

            // Montar prompt de sistema
            const systemPrompt = this.buildSystemPrompt(storeContext);
            
            // Log de Debug do Conhecimento injetado
            const knowledgeCount = storeContext.knowledgeBase?.length || 0;
            console.log(`[ZeAssistantAI] 🧠 Injetando ${knowledgeCount} itens de conhecimento no prompt.`);
            if (knowledgeCount > 0) {
                const firstItem = storeContext.knowledgeBase[0];
                console.log(`[ZeAssistantAI] 🔍 Amostra de Conhecimento: "${firstItem.title}"`);
            }

            // Montar prompt do usuário
            const userPrompt = this.buildUserPrompt(messageText, conversationContext);

            // Chamar API do Gemini com Histórico
            const response = await this.callAIAPI(apiKey, systemPrompt, userPrompt, history);

            const processingTime = Date.now() - startTime;

            return {
                success: true,
                responseText: response.text,
                responseType: 'AI',
                shouldHandoff: response.shouldHandoff || false,
                handoffReason: response.handoffReason,
                confidenceScore: response.confidence,
                metadata: {
                    model: response.model || 'unknown',
                    processingTimeMs: processingTime,
                    tokens: response.tokens
                }
            };

        } catch (error) {
            console.error('Erro ao processar com Gemini:', error);
            // Detectar se é erro de quota (429) para mensagem específica
            const isQuotaError = error instanceof Error && (
                error.message.includes('429') ||
                error.message.includes('quota') ||
                error.message.includes('Quota exceeded')
            );
            return {
                success: false,
                responseText: isQuotaError
                    ? 'Estou com muitas conversas ao mesmo tempo agora. Por favor, tente novamente em alguns instantes! 🙏'
                    : 'Tive um problema técnico aqui. Por favor, tente novamente em breve!',
                responseType: 'AI',
                shouldHandoff: false,
                handoffReason: 'Erro na IA'
            };
        }
    }

    /**
     * Monta prompt de sistema com dados da loja
     */
    private buildSystemPrompt(storeContext: any): string {
        const isClosed = storeContext.isClosed === true;
        const closedInstruction = storeContext.closedInstruction || 'No momento estamos fechados, mas posso te ajudar com dúvidas sobre o nosso cardápio!';
        const botName = storeContext.assistantName || 'Assistente';
        const storeName = storeContext.storeName || 'nossa loja';

        // Base de Conhecimento Estruturada
        const knowledgeBase = this.formatKnowledgeBase(storeContext.knowledgeBase, storeContext.products);

        // Formatar horários de funcionamento
        const openingHours = storeContext.openingHours
            ? (typeof storeContext.openingHours === 'string'
                ? storeContext.openingHours
                : JSON.stringify(storeContext.openingHours, null, 2))
            : 'Não informado';

        const prompt = `Você é ${botName}, assistente da loja "${storeName}" no WhatsApp.
Responda de forma simpática, direta e natural — como uma boa atendente real, sem ser formal demais nem exagerada.

${storeContext.aiInstructions ? `INSTRUÇÕES DO LOJISTA (PRIORIDADE MÁXIMA):\n"${storeContext.aiInstructions}"\n` : ''}
STATUS DA LOJA: ${isClosed ? 'FECHADA AGORA' : 'ABERTA'}
${isClosed ? `AVISO: A loja está fechada. Informe isso com simpatia: "${closedInstruction}". Pode tirar dúvidas sobre produtos e preços, mas não pode processar pedidos.` : ''}

INFORMAÇÕES DA LOJA:
- Nome: ${storeName}
- Endereço: ${storeContext.address || 'Não informado'}
- Telefone: ${storeContext.phone || 'Não informado'}
- Horários de Funcionamento: ${openingHours}

LINK DO CATÁLOGO DIGITAL:
${storeContext.catalogUrl || 'Não informado'}
(Se o cliente pedir o link, o catálogo, o site ou quiser ver os produtos com fotos, envie este link.)

CATÁLOGO E CONHECIMENTO DA LOJA:
${knowledgeBase}

REGRAS DE COMPORTAMENTO:
1. TOM: Seja simpática, leve e direta. Fale como uma atendente real — nem robótico, nem informal demais. Respostas curtas (2 a 4 linhas).
2. SEM CUMPRIMENTOS DE ABERTURA: Nunca inicie respostas com "Opa!", "E aí!", "Olá!", "Oi!" ou similares. Vá direto à resposta.
3. EMOJIS: Use com moderação — até 2 emojis por mensagem, apenas quando fizerem sentido. Evite excesso.
4. NUNCA invente preços, produtos ou informações que não estejam no catálogo acima.
5. ATENDIMENTO HUMANO: Se não souber responder, diga: "Essa pergunta precisa de um atendente. Quer que eu chame alguém da nossa equipe?" e adicione a tag [FALAR_COM_HUMANO] no final.
6. FORMATAÇÃO: Use listas simples e negrito (*texto*) para produtos. NUNCA envie JSON ou blocos de código.
7. SEU PAPEL É INFORMATIVO: Não inicie pedidos. Encaminhe para o link da loja quando necessário.
8. HORÁRIOS: Use sempre os horários reais informados acima. Nunca escreva placeholders como [horário].`;

        return prompt;
    }

    /**
     * Formata a Base de Conhecimento Completa para o prompt
     */
    private formatKnowledgeBase(knowledge: any[], legacyProducts: any[]): string {
        let output = '';

        // Prioridade 1: Dados da Nova Base de Conhecimento
        if (knowledge && Array.isArray(knowledge) && knowledge.length > 0) {
            const products = knowledge.filter(k => k.content_type === 'PRODUCT');
            const faqs = knowledge.filter(k => k.content_type === 'FAQ');
            const general = knowledge.filter(k => !['PRODUCT', 'FAQ'].includes(k.content_type));

            if (products.length > 0) {
                output += `🛒 PRODUTOS E PREÇOS:\n${products.map(p => `- *${p.title}*: ${p.content}`).join('\n')}\n\n`;
            }

            if (faqs.length > 0) {
                output += `❓ PERGUNTAS FREQUENTES (FAQ):\n${faqs.map(f => `P: ${f.title}\nR: ${f.content}`).join('\n')}\n\n`;
            }

            if (general.length > 0) {
                output += `ℹ️ INFORMAÇÕES GERAIS:\n${general.map(g => `- ${g.title}: ${g.content}`).join('\n')}\n\n`;
            }
        } 
        
        // Prioridade 2: Fallback para Catalogo Legado (se a knowledge base estiver vazia)
        if (!output && legacyProducts && legacyProducts.length > 0) {
            output += `🛒 CATÁLOGO DE PRODUTOS:\n${this.formatProducts(legacyProducts)}`;
        }

        return output || 'Não temos informações detalhadas carregadas no momento, mas estamos à disposição!';
    }

    /**
     * Monta prompt do usuário com histórico
     */
    private buildUserPrompt(
        messageText: string,
        context: ConversationContext
    ): string {
        let prompt = '';

        // Adicionar contexto de pedido em andamento
        if (context.currentOrder && context.currentOrder.items.length > 0) {
            prompt += `PEDIDO EM ANDAMENTO:\n`;
            prompt += `Itens: ${context.currentOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}\n`;
            if (context.currentOrder.orderType) {
                prompt += `Tipo: ${context.currentOrder.orderType === 'DELIVERY' ? 'Entrega' : 'Retirada'}\n`;
            }
            prompt += '\n';
        }

        // Adicionar última intenção
        if (context.lastIntent) {
            prompt += `Última intenção detectada: ${context.lastIntent}\n\n`;
        }

        prompt += `MENSAGEM DO CLIENTE:\n${messageText}`;

        return prompt;
    }

    /**
     * Formata produtos para o prompt
     */
    private formatProducts(products: any[]): string {
        if (!products || !Array.isArray(products) || products.length === 0) {
            return 'Nenhum produto disponível no momento.';
        }

        // Formata produtos com segurança para evitar erros de renderização no prompt
        return products
            .filter(p => p && p.name) // Garante que o produto existe e tem nome
            .map(p => {
                const name = p.name || 'Produto sem nome';
                const price = typeof p.price === 'number' ? p.price.toFixed(2) : (parseFloat(p.price) || 0).toFixed(2);
                const desc = p.description ? ` (${p.description})` : '';
                const cat = p.category?.name || p.category_name || '';
                
                return `- ${cat ? `[${cat}] ` : ''}*${name}* - R$ ${price}${desc}`;
            })
            .join('\n');
    }

    /**
     * Chama API do Google Gemini
     */
    /**
     * Chama API do Google Gemini via REST com Fallback de Modelos
     */
    private async callAIAPI(
        apiKey: string,
        systemPrompt: string,
        userPrompt: string,
        history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
    ): Promise<{
        text: string;
        confidence: number;
        shouldHandoff: boolean;
        handoffReason?: string;
        tokens?: number;
        model?: string;
    }> {
        // Ordem de preferência de modelos com fallback em cascata para evitar erro 429
        const modelOrder = [
            'gemini-3.1-pro',
            'gemini-3.1-flash-image',
            'gemini-3.0-pro',
            'gemini-3.0-flash',
            'gemini-2.5-pro',
            'gemini-2.5-flash'
        ];

        let lastError: any = null;

        for (const model of modelOrder) {
            try {
                console.log(`[ZeAssistantAI] Tentando modelo: ${model}`);

                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                const bodyPayload: any = {
                    contents: [
                        ...history,
                        {
                            role: 'user',
                            parts: [{ text: userPrompt }]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 500
                    }
                };

                if (systemPrompt) {
                    bodyPayload.system_instruction = {
                        parts: [{ text: systemPrompt }]
                    };
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bodyPayload)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    let errorJson;
                    try { errorJson = JSON.parse(errorText); } catch { }
                    const errorMessage = errorJson?.error?.message || errorText || response.statusText;

                    console.warn(`[ZeAssistantAI] Falha no modelo ${model} (HTTP ${response.status}):`, errorMessage);
                    throw new Error(errorMessage);
                }

                const data = await response.json();

                // Extração resiliente de texto conforme cloud.ts
                let aiText = "";
                if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                    aiText = data.candidates[0].content.parts[0].text || "";
                }

                if (!aiText) {
                    throw new Error("Resposta Vazia da IA");
                }

                // Detectar se IA sugere handoff
                const shouldHandoff = aiText.toLowerCase().includes('[transferir]') ||
                    aiText.toLowerCase().includes('[humano]');

                const tokenCount = data?.usageMetadata?.totalTokenCount || 0;

                console.log(`[ZeAssistantAI] Sucesso com modelo ${model}`);

                return {
                    text: aiText.replace(/\[(transferir|humano)\]/gi, '').trim(),
                    confidence: 0.9,
                    shouldHandoff,
                    handoffReason: shouldHandoff ? 'IA sugeriu transferência' : undefined,
                    tokens: tokenCount,
                    model: model
                };

            } catch (e: any) {
                console.warn(`[ZeAssistantAI] Erro ao processar ${model}:`, e.message);
                lastError = e;
                // Continua para o próximo loop
            }
        }

        console.error('[ZeAssistantAI] Todos os modelos falharam.');
        throw lastError || new Error("Falha em todos os modelos de IA");
    }

    /**
     * Extrai intenção da mensagem
     */
    async extractIntent(messageText: string): Promise<string | null> {
        // Análise simples de intenções comuns
        const normalizedText = messageText.toLowerCase();

        if (normalizedText.includes('pedido') || normalizedText.includes('pedir')) {
            return 'FAZER_PEDIDO';
        }
        if (normalizedText.includes('preço') || normalizedText.includes('quanto')) {
            return 'CONSULTAR_PRECO';
        }
        if (normalizedText.includes('horário') || normalizedText.includes('abre')) {
            return 'CONSULTAR_HORARIO';
        }
        if (normalizedText.includes('entrega') || normalizedText.includes('delivery')) {
            return 'CONSULTAR_ENTREGA';
        }
        if (normalizedText.includes('cardápio') || normalizedText.includes('produtos')) {
            return 'VER_CARDAPIO';
        }

        return null;
    }
}

export const zeAssistantAIService = new ZeAssistantAIService();
