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
    credentials: InfinitePayCredentials
): Promise<InfinitePayChargeResult> => {
    if (!credentials.apiKey) {
        throw new Error('InfinitePay: API Key não configurada');
    }

    try {
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
                metadata: metadata
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
