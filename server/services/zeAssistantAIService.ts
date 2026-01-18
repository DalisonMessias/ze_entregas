import type { ProcessMessageResponse, ConversationContext } from '../../types/zeAssistant.js';

/**
 * Serviço de IA do Zé Assistente
 * Processa mensagens usando inteligência artificial
 * 
 * NOTA: Esta é uma implementação base. Para produção, integrar com:
 * - OpenAI GPT
 * - Google Gemini
 * - Anthropic Claude
 * ou outra API de IA
 */
export class ZeAssistantAIService {
    private apiKey: string | undefined;
    private model: string = 'gpt-3.5-turbo'; // Ou outro modelo

    constructor() {
        // API Key deve vir das configurações do sistema
        this.apiKey = process.env.OPENAI_API_KEY;
    }

    /**
     * Processa mensagem com IA
     */
    async processMessage(
        messageText: string,
        storeContext: any,
        conversationContext: ConversationContext
    ): Promise<ProcessMessageResponse> {

        // Verificar se IA está configurada
        if (!this.apiKey) {
            console.warn('IA não configurada - API Key ausente');
            return {
                success: false,
                responseText: 'Desculpe, o assistente de IA não está disponível no momento.',
                responseType: 'AI',
                shouldHandoff: true,
                handoffReason: 'IA não configurada'
            };
        }

        try {
            const startTime = Date.now();

            // Montar contexto para IA
            const systemPrompt = this.buildSystemPrompt(storeContext);
            const userPrompt = this.buildUserPrompt(messageText, conversationContext);

            // Chamar API de IA (exemplo com OpenAI)
            const response = await this.callAIAPI(systemPrompt, userPrompt);

            const processingTime = Date.now() - startTime;

            return {
                success: true,
                responseText: response.text,
                responseType: 'AI',
                shouldHandoff: response.shouldHandoff || false,
                handoffReason: response.handoffReason,
                confidenceScore: response.confidence,
                metadata: {
                    model: this.model,
                    processingTimeMs: processingTime,
                    tokens: response.tokens
                }
            };

        } catch (error) {
            console.error('Erro ao processar com IA:', error);
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

        return products
            .slice(0, 50) // Limitar a 50 produtos para não sobrecarregar
            .map(p => `- ${p.name}: R$ ${p.price.toFixed(2)}${p.description ? ` (${p.description})` : ''}`)
            .join('\n');
    }

    /**
     * Chama API de IA (OpenAI, Gemini, etc)
     * IMPLEMENTAÇÃO DE EXEMPLO - ADAPTAR CONFORME API ESCOLHIDA
     */
    private async callAIAPI(systemPrompt: string, userPrompt: string): Promise<{
        text: string;
        confidence: number;
        shouldHandoff: boolean;
        handoffReason?: string;
        tokens?: number;
    }> {

        // IMPLEMENTAÇÃO DE EXEMPLO COM FETCH PARA OPENAI
        // Adaptar conforme a API de IA escolhida

        if (!this.apiKey) {
            throw new Error('API Key não configurada');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
                max_tokens: 150 // Respostas curtas
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const messageContent = data.choices[0]?.message?.content || '';

        // Detectar se IA sugere handoff
        const shouldHandoff = messageContent.toLowerCase().includes('[transferir]') ||
            messageContent.toLowerCase().includes('[humano]');

        return {
            text: messageContent.replace(/\[(transferir|humano)\]/gi, '').trim(),
            confidence: 0.8, // Ajustar conforme necessário
            shouldHandoff,
            handoffReason: shouldHandoff ? 'IA sugeriu transferência' : undefined,
            tokens: data.usage?.total_tokens
        };
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
