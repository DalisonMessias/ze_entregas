import { getClient, getUserWithCache } from './cloud.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Definições de Tipos para Mediação
export interface MediationContext {
    orderId: string;
    userRole: 'store' | 'courier' | 'admin' | 'system';
    message: string;
    history?: any[];
}

export interface MediationAction {
    type: 'MESSAGE' | 'COMMAND' | 'DECISION';
    content: string;
    payload?: any;
}

// Inicializa o cliente Gemini (pode ser movido para um config global)
const getGeminiClient = (apiKey: string) => {
    return new GoogleGenerativeAI(apiKey);
};

// Funções Auxiliares (Tools)

/**
 * Gera um código de 4 dígitos para validação
 */
export const generateValidationCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Busca a sessão de mediação ativa para um pedido
 */
export const getMediationSession = async (orderId: string) => {
    const sb = getClient();
    if (!sb) return null;

    const { data, error } = await sb
        .from('mediation_sessions')
        .select('*')
        .eq('order_id', orderId)
        .single();

    if (error && error.code !== 'PGRST116') { // Ignora erro de não encontrado
        console.error('Erro ao buscar sessão de mediação:', error);
    }

    return data;
};

/**
 * Cria ou atualiza uma sessão de mediação
 */
export const updateMediationSession = async (orderId: string, updates: any) => {
    const sb = getClient();
    if (!sb) return null;

    const { data, error } = await sb
        .from('mediation_sessions')
        .upsert({ order_id: orderId, ...updates })
        .select()
        .single();

    if (error) {
        console.error('Erro ao atualizar sessão de mediação:', error);
        return null;
    }
    return data;
};

/**
 * Registra uma ação da IA
 */
export const logMediationAction = async (sessionId: string, actionType: string, description: string, payload: any = {}) => {
    const sb = getClient();
    if (!sb) return;

    await sb.from('mediation_actions').insert({
        session_id: sessionId,
        action_type: actionType,
        description: description,
        payload: payload
    });
};

/**
 * Lógica Principal da Mediação
 */
export const processMediationMessage = async (context: MediationContext, apiKey: string) => {
    if (!apiKey) {
        console.error('API Key do Gemini não fornecida.');
        return { success: false, message: 'Erro de configuração da IA.' };
    }

    // Usando versões específicas que funcionam na API v1
    const modelAgent = [
        'gemini-2.5-flash-lite',
        'gemini-2.0-flash'
    ];

    const genAI = getGeminiClient(apiKey);
    // Seleciona o primeiro modelo da lista (fallback manual se necessário no futuro)
    const model = genAI.getGenerativeModel({ model: modelAgent[0] });




    // 1. Carregar Sessão e Dados do Pedido
    let session = await getMediationSession(context.orderId);

    // Se não existe sessão, cria uma nova
    if (!session) {
        session = await updateMediationSession(context.orderId, { status: 'ACTIVE', current_step: 'MONITORING' });
    }

    if (!session) return { success: false, message: 'Falha ao iniciar sessão de mediação.' };

    // 2. Construir Prompt do Sistema
    const systemPrompt = `
    Você é o Agente de Mediação da Plataforma Zé Entregas.
    Sua função é mediar a interação entre Loja e Entregador para o pedido ${context.orderId}.
    
    Regras:
    - Seja neutro, objetivo e resolutivo.
    - Se o entregador relatar problema na entrega, sugira devolução e gere fluxos apropriados.
    - Valide códigos quando fornecidos.
    - Não alucine regras.
    
    Usuário atual: ${context.userRole}
    Mensagem do usuário: "${context.message}"
    
    Responda em formato JSON com:
    {
        "reply": "Sua resposta para o usuário",
        "action": "NONE" | "GENERATE_RETURN_CODE" | "VALIDATE_CODE" | "ESCALATE",
        "payload": {} 
    }
    `;

    // 3. Chamar Gemini
    try {
        const result = await model.generateContent(systemPrompt);
        const responseText = result.response.text();

        // Tentar parsear JSON (Gemini pode retornar markdown wrapper ```json ... ```)
        const cleanJson = responseText.replace(/```json|```/g, '').trim();
        const aiResponse = JSON.parse(cleanJson);

        // 4. Executar Ações Decididas pela IA
        if (aiResponse.action === 'GENERATE_RETURN_CODE') {
            const returnCode = generateValidationCode();
            // Salvar no pedido via cloud/supabase (simulado aqui, idealmente chama updateOrder)
            const sb = getClient();
            if (sb) await sb.from('orders').update({ return_code: returnCode }).eq('id', context.orderId);

            aiResponse.reply += ` [CÓDIGO DE DEVOLUÇÃO GERADO: ${returnCode}]`;
            await logMediationAction(session.id, 'COMMAND', 'Gerou código de devolução', { code: returnCode });
        }

        // Registrar Log da Mensagem
        await logMediationAction(session.id, 'MESSAGE', aiResponse.reply, {});

        return { success: true, aiResponse };

    } catch (e) {
        console.error('Erro na IA de mediação:', e);
        return { success: false, message: 'Erro ao processar mediação.' };
    }
};

