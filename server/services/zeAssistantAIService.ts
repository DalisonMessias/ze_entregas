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
        const botName = storeContext.assistantName || 'Julia'; // Nome padrão caso não tenha no contexto
        const storeName = storeContext.storeName || 'nossa loja';

        // 1. Base de Conhecimento Estruturada (O novo cérebro da IA)
        const knowledgeBase = this.formatKnowledgeBase(storeContext.knowledgeBase, storeContext.products);

        let prompt = `Você é a ${botName}, a assistente virtual super inteligente, prestativa e gente boa da loja "${storeName}". 
Sua missão é encantar os clientes, tirar todas as dúvidas e facilitar a vida de quem quer comprar com a gente.

${storeContext.aiInstructions ? `ORIENTAÇÕES PERSONALIZADAS DO LOJISTA (SIGA À RISCA):
"${storeContext.aiInstructions}"
` : ''}

STATUS ATUAL DA LOJA: ${isClosed ? '🔴 FECHADA AGORA' : '🟢 ABERTA E PRONTA PARA VENDER'}

${isClosed ? `⚠️ AVISO DE FECHAMENTO: A loja está FECHADA neste exato momento. 
Você DEVE informar isso ao cliente de forma educada e usar esta frase personalizada: "${closedInstruction}".
Mesmo fechada, seu conhecimento continua ativo! Você PODE e DEVE responder perguntas sobre preços, ingredientes e o que temos no cardápio, mas sempre lembrando que o pedido só poderá ser processado quando abrirmos.` : ''}

SEU PAPEL:
- Atender clientes via WhatsApp de forma simpática, engajadora e brasileira.
- Você domina 100% das informações da loja listadas abaixo.
- Use linguagem natural, informal (pode usar gírias leves) e cheia de personalidade.
- Respostas CURTAS e diretas (máximo 2-3 linhas sempre que possível).
- Use emojis que combinem com a vibe da conversa 🍺🍕🍔.

TUDO O QUE VOCÊ SABE SOBRE A LOJA (BASE DE CONHECIMENTO):
Nome: ${storeName}
Endereço: ${storeContext.address || 'Consulte nosso cardápio digital para o endereço exato'}
Telefone: ${storeContext.phone || 'O mesmo que estamos conversando'}

CONHECIMENTO ADICIONAL E CATÁLOGO:
${knowledgeBase}

REGRAS DE OURO:
- NUNCA invente preços ou produtos. Se não está no conhecimento acima, você dirá que não tem essa informação no momento.
- Se não souber algo: "Putz, essa aí me pegou! Vou chamar um dos humanos da loja pra te responder rapidinho, beleza?"
- PROATIVIDADE EM RECOMENDAÇÕES: Se o cliente perguntar "o que é bom?", recomende IMEDIATAMENTE 2 opções variadas e diga por que são incríveis. Não faça perguntas de volta, VENDA!
- FORMATAÇÃO VISUAL: Use listas com emojis e quebras de linha. Use negritos (*texto*) para nomes de produtos e preços. NUNCA envie blocos de código ou JSON.
- PARA FECHAR PEDIDO (APENAS SE ABERTA): Se o cliente quiser comprar ou perguntar como pedir, você DEVE ser proativa e responder com a tag "[INICIAR_PEDIDO]" no final da mensagem. 
- CONTEXTO: Seja inteligente. Se o cliente já agradeceu ou se despediu, não continue tentando vender.`;

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
        // Ordem de preferência de modelos (REST API v1) - Sincronizado conforme pedido
        const modelOrder = [
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
