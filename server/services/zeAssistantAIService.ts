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
        return `Você é o Zé, assistente virtual da loja "${storeContext.storeName}".

SEU PAPEL:
- Atender clientes via WhatsApp de forma simpática e profissional
- Responder perguntas sobre produtos, preços, horários e entrega
- Ajudar clientes a fazer pedidos
- Usar linguagem natural, informal mas respeitosa
- Respostas CURTAS e OBJETIVAS (máximo 2-3 linhas por mensagem)
- Usar emojis ocasionalmente para deixar a conversa mais amigável

INFORMAÇÕES DA LOJA:
Nome: ${storeContext.storeName}
Endereço: ${storeContext.address || 'Não informado'}
Horário: ${storeContext.openingHours || 'Não informado'}
Telefone: ${storeContext.phone || 'Não informado'}

PRODUTOS DISPONÍVEIS:
${this.formatProducts(storeContext.products)}

REGRAS:
- NUNCA invente informações que não foram fornecidas
- Se não sabe algo, seja honesto e ofereça transferir para atendente humano
- Para pedidos, colete: itens, endereço, forma de pagamento
- Confirme SEMPRE os dados antes de finalizar pedido
- Mantenha tom amigável mas profissional

LIMITAÇÕES:
- Você NÃO pode processar pagamentos
- Você NÃO pode alterar preços
- Você NÃO pode cancelar pedidos já confirmados
- Em situações complexas, transfira para humano`;
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
