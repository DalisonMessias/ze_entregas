import type { PaymentStatus } from './paymentGateway';

export interface InfinitePayCredentials {
    apiKey: string;
    apiSecret?: string;
}

export interface InfinitePayChargeResult {
    qrCode: string;
    txId: string;
}

const INFINITEPAY_API_URL = 'https://api.infinitepay.io/v2';

/**
 * Criar cobrança PIX via InfinitePay
 */
export const infinitePayCreateCharge = async (
    amount: number,
    metadata: Record<string, any>,
    credentials: InfinitePayCredentials,
    payer?: any, // Adicionando suporte a dados do pagador
    items?: any[] // Adicionando suporte a itens
): Promise<InfinitePayChargeResult> => {
    if (!credentials.apiKey) {
        throw new Error('InfinitePay: API Key não configurada');
    }

    try {
        // Enriquecendo metadata com dados do pedido se disponíveis
        const enrichedMetadata = {
            ...metadata,
            payer_info: payer ? JSON.stringify(payer) : undefined,
            items_info: items ? JSON.stringify(items.map((i: any) => ({ id: i.id, quantity: i.quantity, price: i.price }))) : undefined
        };

        const response = await fetch(`${INFINITEPAY_API_URL}/charges`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${credentials.apiKey}`
            },
            body: JSON.stringify({
                amount: Math.round(amount * 100), // Converter para centavos
                type: 'pix',
                description: metadata.description || 'Recarga Zé Entregas',
                metadata: enrichedMetadata
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.message || `InfinitePay API erro: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();

        return {
            qrCode: data.pix_qr_code || data.qr_code || '',
            txId: data.id || data.charge_id || ''
        };
    } catch (error: any) {
        console.error('Erro InfinitePay createCharge:', error);
        throw new Error(`InfinitePay: ${error.message}`);
    }
};

/**
 * Verificar status de pagamento via InfinitePay
 */
export const infinitePayCheckStatus = async (
    txId: string,
    credentials: InfinitePayCredentials
): Promise<PaymentStatus> => {
    if (!credentials.apiKey) {
        throw new Error('InfinitePay: API Key não configurada');
    }

    try {
        const response = await fetch(`${INFINITEPAY_API_URL}/charges/${txId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${credentials.apiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`InfinitePay API erro: ${response.status}`);
        }

        const data = await response.json();

        // Mapear status do InfinitePay para nosso formato
        let status: 'paid' | 'pending' | 'failed' | 'expired' = 'pending';

        if (data.status === 'paid' || data.status === 'approved') {
            status = 'paid';
        } else if (data.status === 'expired' || data.status === 'cancelled') {
            status = 'expired';
        } else if (data.status === 'failed' || data.status === 'rejected') {
            status = 'failed';
        }

        return {
            txId: data.id,
            status,
            amount: data.amount ? data.amount / 100 : undefined, // Converter de centavos
            paidAt: data.paid_at || data.updated_at
        };
    } catch (error: any) {
        console.error('Erro InfinitePay checkStatus:', error);
        throw new Error(`InfinitePay: ${error.message}`);
    }
};

/**
 * Obter detalhes de cobrança (Get Charge)
 * Útil para debug ou admin
 */
export const infinitePayGetCharge = async (
    chargeId: string,
    credentials: InfinitePayCredentials
): Promise<any> => {
    if (!credentials.apiKey) throw new Error('InfinitePay: API Key não configurada');

    const response = await fetch(`${INFINITEPAY_API_URL}/charges/${chargeId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${credentials.apiKey}`
        }
    });

    if (!response.ok) throw new Error(`Erro ao buscar Charge: ${response.status}`);
    return await response.json();
};

/**
 * Reembolsar cobrança (Refund - Se suportado via API v2/charges ou transactions)
 * A API v2 de Charges geralmente não expõe refund publicamente em docs antigos, 
 * mas vamos tentar o padrão /charges/{id}/refund ou similar se documentado,
 * ou deixar logado que pode não estar disponível.
 * Assumindo endpoint padrão RESTful se existir.
 */
export const infinitePayRefundCharge = async (
    chargeId: string,
    amount: number | null,
    credentials: InfinitePayCredentials
): Promise<any> => {
    if (!credentials.apiKey) throw new Error('InfinitePay: API Key não configurada');

    // Nota: Verificar documentação oficial para refund
    // Tentativa padrão: POST /charges/{id}/refund ou /transactions/{id}/refund
    // Por segurança e falta de doc clara no prompt, vamos apenas logar e lançar "Não implementado" se não tiver certeza,
    // mas o usuário pediu para "ajudar developers a entender doc".
    // Vou assumir que o endpoint existe ou é manual.
    // Se não existir, lançamos erro explicativo.

    // Fallback: Retornar erro "Funcionalidade não disponível via API pública v2 sem doc específica".
    // Mas para manter paridade com MP, deixo a estrutura pronta.

    // throw new Error('Estorno automático InfinitePay não configurado/não suportado nesta versão da API.');

    // Se quiser tentar:
    /*
    const response = await fetch(`${INFINITEPAY_API_URL}/charges/${chargeId}/refund`, { ... });
    */

    // Implementação "Mock" segura para não quebrar:
    throw new Error('Estorno InfinitePay deve ser feito via Painel do Lojista (API Refund não integrada).');
};
