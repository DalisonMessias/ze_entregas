import { GoogleGenAI } from '@google/genai';
import type { ProcessMessageResponse, ConversationContext } from '../../types/zeAssistant.js';

/**
 * Serviço de IA do Zé Assistente
 * Processa mensagens usando inteligência artificial do Google Gemini
 */
export class ZeAssistantAIService {
    private modelName: string = 'gemini-1.5-flash';

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
        apiKey: string
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

            // Montar prompt do usuário
            const userPrompt = this.buildUserPrompt(messageText, conversationContext);

            // Chamar API do Gemini
            const response = await this.callAIAPI(apiKey, systemPrompt, userPrompt);

            const processingTime = Date.now() - startTime;

            return {
                success: true,
                responseText: response.text,
                responseType: 'AI',
                shouldHandoff: response.shouldHandoff || false,
                handoffReason: response.handoffReason,
                confidenceScore: response.confidence,
                metadata: {
                    model: this.modelName,
                    processingTimeMs: processingTime,
                    tokens: response.tokens
                }
            };

        } catch (error) {
            console.error('Erro ao processar com Gemini:', error);
            return {
                success: false,
                responseText: 'Desculpe, tive um problema ao processar sua mensagem.',
                responseType: 'AI',
                shouldHandoff: true,
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

        let prompt = `Você é o Zé, o assistente virtual super inteligente e gente boa da loja "${storeContext.storeName}". 
Sua missão é ser prestativo, engraçado e eficiente.

STATUS ATUAL DA LOJA: ${isClosed ? '🔴 FECHADA' : '🟢 ABERTA'}

${isClosed ? `⚠️ IMPORTANTE: A loja está FECHADA agora. 
Sua instrução prioritária de fechamento é: "${closedInstruction}"
Mesmo fechada, você DEVE continuar sendo prestativo. Você pode e deve responder perguntas sobre os produtos, preços, ingredientes e o que mais o cliente quiser saber sobre a loja, mas sempre lembrando (de forma engraçada ou sutil) que no momento não é possível processar o pedido para agora.` : ''}

SEU PAPEL:
- Atender clientes via WhatsApp de forma muuuuuito simpática, engajadora e profissional.
- Você conhece o catálogo como a palma da sua mão.
- Responder perguntas sobre produtos, preços, horários e entrega.
- Se a loja estiver aberta, ajude a fechar o pedido.
- Use linguagem natural, brasileira, informal e cheia de personalidade.
- Respostas CURTAS e diretas ao ponto (máximo 2-3 linhas).
- Use emojis que combinem com a vibe da conversa 🍺🍕🍔.

INFORMAÇÕES DA LOJA:
Nome: ${storeContext.storeName}
Endereço: ${storeContext.address || 'Não informado'}
Horário Original: ${storeContext.openingHours || 'Não informado'}
Telefone: ${storeContext.phone || 'Não informado'}

CATÁLOGO DE PRODUTOS:
${this.formatProducts(storeContext.products)}

REGRAS DE OURO:
- NUNCA invente preços ou produtos. Se não tem no catálogo, não existe (por enquanto!).
- Se não souber algo, use o seu charme: "Rapaz, essa aí você me pegou! Vou chamar um humano pra te salvar."
- Se o cliente quiser pedir enquanto a loja está fechada, diga que ele pode deixar o pedido anotado ou voltar assim que abrirmos.
- Seja o assistente que você gostaria de ter: rápido, inteligente e engraçado.`;

        return prompt;
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
        if (!products || products.length === 0) {
            return 'Nenhum produto cadastrado';
        }

        // REMOVIDO: Limite de 50 produtos. Agora envia todos.
        return products
            .map(p => `- ${p.name}: R$ ${p.price.toFixed(2)}${p.description ? ` (${p.description})` : ''}`)
            .join('\n');
    }

    /**
     * Chama API do Google Gemini
     */
    private async callAIAPI(apiKey: string, systemPrompt: string, userPrompt: string): Promise<{
        text: string;
        confidence: number;
        shouldHandoff: boolean;
        handoffReason?: string;
        tokens?: number;
    }> {
        // @ts-ignore
        const ai = new GoogleGenAI({ apiKey });

        try {
            // @ts-ignore
            const result = await ai.models.generateContent({
                model: this.modelName,
                contents: [
                    { role: 'user', parts: [{ text: userPrompt }] }
                ],
                config: {
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                    temperature: 0.7,
                    maxOutputTokens: 150,
                }
            });

            // Tratamento de resposta da nova SDK
            let messageContent = '';

            // Tenta acessar .text (getter) ou .text() dependendo da versão
            // @ts-ignore
            if (result && result.text) {
                // @ts-ignore
                try { messageContent = typeof result.text === 'function' ? result.text() : result.text; } catch (e) { messageContent = result.text || ''; }
            } else if (result?.candidates?.[0]?.content?.parts?.[0]?.text) {
                messageContent = result.candidates[0].content.parts[0].text;
            } else {
                // Fallback genérico com cast any para evitar erro de 'Property response does not exist'
                const anyResult = result as any;
                if (anyResult.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
                    messageContent = anyResult.response.candidates[0].content.parts[0].text;
                } else if (anyResult.response?.text) {
                    try { messageContent = typeof anyResult.response.text === 'function' ? anyResult.response.text() : anyResult.response.text; } catch (e) { }
                }
            }

            let tokenCount = 0;
            if (result?.usageMetadata?.totalTokenCount) {
                tokenCount = result.usageMetadata.totalTokenCount;
            } else {
                const anyResult = result as any;
                if (anyResult.response?.usageMetadata?.totalTokenCount) {
                    tokenCount = anyResult.response.usageMetadata.totalTokenCount;
                }
            }

            // Detectar se IA sugere handoff
            const shouldHandoff = messageContent.toLowerCase().includes('[transferir]') ||
                messageContent.toLowerCase().includes('[humano]');

            return {
                text: messageContent.replace(/\[(transferir|humano)\]/gi, '').trim(),
                confidence: 0.9,
                shouldHandoff,
                handoffReason: shouldHandoff ? 'IA sugeriu transferência' : undefined,
                tokens: tokenCount
            };
        } catch (e: any) {
            console.error('Erro na chamada do Gemini:', e);
            throw e;
        }
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
