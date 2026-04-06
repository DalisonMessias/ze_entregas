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
            return {
                success: false,
                responseText: `Opa! Tive um problema técnico: ${error instanceof Error ? error.message : 'Erro na IA'}. Vou chamar alguém pra te ajudar!`,
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
        const botName = storeContext.assistantName || 'Zé';

        let prompt = `Você é o ${botName}, o assistente virtual super inteligente e gente boa da loja "${storeContext.storeName}". 
Sua missão é ser prestativo, engraçado e eficiente.

${storeContext.aiInstructions ? `ORIENTAÇÕES PERSONALIZADAS DO LOJISTA (SIGA À RISCA):
"${storeContext.aiInstructions}"
` : ''}

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
Status Atual: ${isClosed ? '🔴 FECHADA (NÃO ACEITA PEDIDOS AGORA)' : '🟢 ABERTA'}
Telefone: ${storeContext.phone || 'Não informado'}

${isClosed ? '⚠️ AVISO: A loja está fechada. Ignore o catálogo abaixo para vendas agora.' : 'CATÁLOGO DE PRODUTOS:\n' + this.formatProducts(storeContext.products)}

REGRAS DE OURO:
- NUNCA invente preços ou produtos. Se não tem no catálogo, não existe (por enquanto!).
- Se não souber algo, use o seu charme: "Rapaz, essa aí você me pegou! Vou chamar um humano pra te salvar."
- Se o cliente quiser pedir enquanto a loja está fechada, diga que ele pode deixar o pedido anotado ou voltar assim que abrirmos.
- PROATIVIDADE EM RECOMENDAÇÕES: Se o cliente pedir uma indicação, sugestão ou perguntar "o que é bom?", NÃO FAÇA PERGUNTAS DE VOLTA. Recomende IMEDIATAMENTE 2 ou 3 opções variadas do cardápio (ex: o mais vendido, uma opção econômica e uma novidade) e venda o peixe! Diga por que são bons.
- FORMATAÇÃO VISUAL: Seus outputs são lidos diretamente no WhatsApp. NUNCA envie blocos de código, JSON ou XML. Use listas com emojis e quebras de linha (ex: "🍔 *Hamburguer* - R$ 20,00"). Use negritos (*texto*) para nomes de produtos e preços.
- PROIBIÇÃO DE JSON: NUNCA responda com chaves {}, colchetes [] ou formatos estruturados. Suas respostas devem ser 100% texto legível para humanos.
- PARA FECHAR PEDIDO: Se o cliente demonstrar intenção de comprar, interesse em um produto específico ou perguntar como pedir, você DEVE ser proativo. Exemplos: "Vou abrir seu carrinho agora para você finalizar?", "Posso iniciar seu pedido com esse item?". Nesses casos, você DEVE obrigatoriamente responder com a tag "[INICIAR_PEDIDO]" no final da mensagem. Isso é crucial para abrir o formulário.
- CONTEXTO: Você tem acesso às últimas mensagens da conversa. Use isso para ser inteligente e não perguntar o que já foi dito.
- HORÁRIOS: Use os horários reais da loja fornecidos acima. NUNCA, em hipótese alguma, responda com "[HORÁRIO ORIGINAL DA LOJA]" ou algo entre colchetes. Se não houver horário, diga o que sabe ou sugira falar com um humano.
- STATUS: O status atual da loja é ${isClosed ? '🔴 FECHADA' : '🟢 ABERTA'}. Respeite isso acima de tudo. Se estiver fechada, você não pode fechar pedidos para agora.
- SEJA UM VENDEDOR: Se o cliente estiver em dúvida, recomende o melhor produto e já pergunte se pode abrir o pedido. Não deixe a conversa morrer.`;

        // Se estiver fechado, damos uma instrução muito mais forte e curta
        if (isClosed) {
            prompt = `Você é o ${botName}, assistente da loja "${storeContext.storeName}". 
⚠️ A LOJA ESTÁ FECHADA AGORA. 
Sua ÚNICA missão é informar que a loja está fechada e não pode processar pedidos agora.
Instrução do lojista: "${closedInstruction || 'Estamos fechados no momento.'}"
Seja educado, mas firme de que não é possível pedir nada agora.
SEMPRE diga que a loja está 🔴 FECHADA.`;
        }

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
        // Ordem de preferência de modelos (REST API v1) - Sincronizado conforme pedido
        const modelOrder = [
            'gemini-2.0-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-1.5-pro-latest'
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
