import type { ProcessMessageResponse, ConversationContext } from '../../types/zeAssistant.js';

/**
 * Serviço de IA do Zé Assistente
 * Sistema híbrido com suporte a Google Gemini e Groq (Llama 3)
 */
export class ZeAssistantAIService {

    constructor() {
        console.log('🤖 ZeAssistantAIService inicializado');
    }

    /**
     * Processa mensagem com IA (Suporta Gemini e Groq com Fallback)
     */
    async processMessage(
        messageText: string,
        storeContext: any,
        conversationContext: ConversationContext,
        apiKeys: { gemini?: string; groq?: string },
        primaryProvider: 'google_gemini' | 'groq' = 'google_gemini',
        history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
    ): Promise<ProcessMessageResponse> {

        const groqEnabled = !!apiKeys.groq;
        const geminiEnabled = !!apiKeys.gemini;

        // Verificar se alguma IA está configurada
        if (!geminiEnabled && !groqEnabled) {
            console.warn('Nenhuma IA configurada - API Keys ausentes');
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
            const systemPrompt = this.buildSystemPrompt(storeContext);
            const userPrompt = this.buildUserPrompt(messageText, conversationContext);

            let response: any = null;
            let usedProvider = primaryProvider;

            // Lógica de Orquestração com Fallback
            try {
                if (primaryProvider === 'groq' && groqEnabled) {
                    console.log('[ZeAssistantAI] 🚀 Usando Groq como provedor principal');
                    response = await this.callGroqAPI(apiKeys.groq!, systemPrompt, userPrompt, history);
                } else if (geminiEnabled) {
                    console.log('[ZeAssistantAI] 🚀 Usando Gemini como provedor principal');
                    response = await this.callGeminiAPI(apiKeys.gemini!, systemPrompt, userPrompt, history);
                } else if (groqEnabled) {
                    console.log('[ZeAssistantAI] 🔄 Gemini indisponível, usando Groq como fallback');
                    usedProvider = 'groq';
                    response = await this.callGroqAPI(apiKeys.groq!, systemPrompt, userPrompt, history);
                }
            } catch (error) {
                console.error(`[ZeAssistantAI] ❌ Erro no provedor principal (${primaryProvider}):`, error);
                
                // Tentar o provedor secundário em caso de falha do primeiro
                if (primaryProvider === 'google_gemini' && groqEnabled) {
                    console.log('[ZeAssistantAI] 🔄 Fallback automático para Groq...');
                    usedProvider = 'groq';
                    response = await this.callGroqAPI(apiKeys.groq!, systemPrompt, userPrompt, history);
                } else if (primaryProvider === 'groq' && geminiEnabled) {
                    console.log('[ZeAssistantAI] 🔄 Fallback automático para Gemini...');
                    usedProvider = 'google_gemini';
                    response = await this.callGeminiAPI(apiKeys.gemini!, systemPrompt, userPrompt, history);
                } else {
                    throw error;
                }
            }

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
                    provider: usedProvider,
                    processingTimeMs: processingTime,
                    tokens: response.tokens
                }
            };

        } catch (error) {
            console.error('Erro crítico no processamento de IA:', error);
            return {
                success: false,
                responseText: 'Tive um problema técnico ao processar sua solicitação. Por favor, tente novamente em instantes!',
                responseType: 'AI',
                shouldHandoff: false,
                handoffReason: 'Erro total na IA'
            };
        }
    }

    /**
     * Monta o prompt do sistema (instruções base)
     */
    private buildSystemPrompt(storeContext: any): string {
        const isClosed = storeContext.isClosed === true;
        const botName = storeContext.assistantName || 'Assistente';
        const storeName = storeContext.storeName || 'Loja';
        const knowledgeBase = this.formatKnowledgeBase(storeContext.knowledgeBase, storeContext.products);

        return `Você é ${botName}, assistente da loja "${storeName}" no WhatsApp.
Responda de forma simpática, direta e natural.

${storeContext.aiInstructions ? `INSTRUÇÕES DO LOJISTA:\n"${storeContext.aiInstructions}"\n` : ''}
STATUS DA LOJA: ${isClosed ? 'FECHADA AGORA' : 'ABERTA'}
${isClosed ? `AVISO: A loja está fechada agora. Informe isso gentilmente se necessário.` : ''}

INFORMAÇÕES DA LOJA:
- Endereço: ${storeContext.address || 'Não informado'}
- Horários: ${storeContext.openingHours ? JSON.stringify(storeContext.openingHours) : 'Não informado'}
- Catálogo: ${storeContext.catalogUrl || 'Não informado'}

BASE DE CONHECIMENTO:
${knowledgeBase}

REGRAS:
1. Seja breve (2-4 linhas).
2. Não use saudações formais repetitivas.
3. Se o cliente quiser falar com alguém humano, use a tag [FALAR_COM_HUMANO].
4. Nunca invente informações. Se não souber, peça para aguardar um atendente.`;
    }

    /**
     * Monta o prompt do usuário com contexto
     */
    private buildUserPrompt(messageText: string, context: ConversationContext): string {
        let prompt = '';
        if (context.currentOrder && context.currentOrder.items.length > 0) {
            prompt += `PEDIDO ATUAL: ${context.currentOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}\n\n`;
        }
        prompt += `MENSAGEM: ${messageText}`;
        return prompt;
    }

    /**
     * Formata base de conhecimento
     */
    private formatKnowledgeBase(knowledge: any[], products: any[]): string {
        let output = '';
        if (knowledge && knowledge.length > 0) {
            output += knowledge.map(k => `- ${k.title}: ${k.content}`).join('\n');
        } else if (products && products.length > 0) {
            output += products.map(p => `- ${p.name}: R$ ${p.price}`).join('\n');
        }
        return output || 'Informações indisponíveis.';
    }

    /**
     * Chama API do Gemini (helper para callAIAPI)
     */
    private async callGeminiAPI(apiKey: string, systemPrompt: string, userPrompt: string, history: any[]) {
        return this.callAIAPI(apiKey, systemPrompt, userPrompt, history);
    }

    /**
     * Chama API da Groq
     */
    private async callGroqAPI(apiKey: string, systemPrompt: string, userPrompt: string, history: any[]) {
        const model = "llama-3.1-8b-instant";
        const messages = [
            { role: "system", content: systemPrompt },
            ...history.map(h => ({
                role: h.role === 'model' ? 'assistant' : 'user',
                content: h.parts[0].text
            })),
            { role: "user", content: userPrompt }
        ];

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({ model, messages, temperature: 0.7 })
        });

        if (!response.ok) throw new Error(`Erro Groq: ${response.status}`);
        const data = await response.json();
        const text = data.choices[0]?.message?.content || "";
        
        return {
            text: text.replace(/\[FALAR_COM_HUMANO\]/gi, '').trim(),
            confidence: 0.9,
            shouldHandoff: text.includes('[FALAR_COM_HUMANO]'),
            handoffReason: text.includes('[FALAR_COM_HUMANO]') ? 'IA sugeriu humano' : undefined,
            tokens: data.usage?.total_tokens,
            model
        };
    }

    /**
     * Implementação REST do Gemini com modelos em cascata
     */
    private async callAIAPI(apiKey: string, systemPrompt: string, userPrompt: string, history: any[]) {
        const models = ['gemini-1.5-pro', 'gemini-1.5-flash'];
        let lastError = null;

        for (const model of models) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [...history, { role: 'user', parts: [{ text: userPrompt }] }],
                        system_instruction: { parts: [{ text: systemPrompt }] }
                    })
                });

                if (!response.ok) throw new Error(`Erro Gemini ${model}: ${response.status}`);
                const data = await response.json();
                const aiText = data.candidates[0]?.content?.parts[0]?.text || "";

                return {
                    text: aiText.replace(/\[FALAR_COM_HUMANO\]/gi, '').trim(),
                    confidence: 0.9,
                    shouldHandoff: aiText.includes('[FALAR_COM_HUMANO]'),
                    handoffReason: aiText.includes('[FALAR_COM_HUMANO]') ? 'IA sugeriu humano' : undefined,
                    tokens: data.usageMetadata?.totalTokenCount,
                    model
                };
            } catch (e) {
                lastError = e;
            }
        }
        throw lastError;
    }

    async extractIntent(messageText: string): Promise<string | null> {
        const text = messageText.toLowerCase();
        if (text.includes('pedido') || text.includes('quero comprar')) return 'FAZER_PEDIDO';
        if (text.includes('horário') || text.includes('abre')) return 'CONSULTAR_HORARIO';
        return null;
    }
}

export const zeAssistantAIService = new ZeAssistantAIService();
