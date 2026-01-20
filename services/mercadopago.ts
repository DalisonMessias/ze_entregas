import type { PaymentStatus } from './paymentGateway';

export interface MercadoPagoCredentials {
    accessToken: string;
}

export interface MercadoPagoPaymentResult {
    qrCode: string;
    txId: string;
}

const MERCADOPAGO_API_URL = 'https://api.mercadopago.com';

/**
 * Criar pagamento PIX via Mercado Pago
 */
export const mercadoPagoCreatePayment = async (
    amount: number,
    metadata: Record<string, any>,
    credentials: MercadoPagoCredentials
): Promise<MercadoPagoPaymentResult> => {
    if (!credentials.accessToken) {
        throw new Error('Mercado Pago: Access Token não configurado');
    }

    try {
        const response = await fetch(`${MERCADOPAGO_API_URL}/v1/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${credentials.accessToken}`
            },
            body: JSON.stringify({
                transaction_amount: amount,
                payment_method_id: 'pix',
                description: metadata.description || 'Recarga Zé Entregas',
                payer: {
                    email: metadata.email || 'cliente@zeentregas.com'
                },
                metadata: metadata
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.message || `Mercado Pago API erro: ${response.status} ${response.statusText}`
            );
        }

        const data = await response.json();

        // Mercado Pago retorna QR Code em point_of_interaction
        const qrCode = data.point_of_interaction?.transaction_data?.qr_code || '';

        if (!qrCode) {
            throw new Error('Mercado Pago: QR Code não retornado na resposta');
        }

        return {
            qrCode,
            txId: data.id.toString()
        };
    } catch (error: any) {
        console.error('Erro Mercado Pago createPayment:', error);
        throw new Error(`Mercado Pago: ${error.message}`);
    }
};

/**
 * Verificar status de pagamento via Mercado Pago
 */
export const mercadoPagoCheckStatus = async (
    txId: string,
    credentials: MercadoPagoCredentials
): Promise<PaymentStatus> => {
    if (!credentials.accessToken) {
        throw new Error('Mercado Pago: Access Token não configurado');
    }

    try {
        const response = await fetch(`${MERCADOPAGO_API_URL}/v1/payments/${txId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${credentials.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`Mercado Pago API erro: ${response.status}`);
        }

        const data = await response.json();

        // Mapear status do Mercado Pago para nosso formato
        let status: 'paid' | 'pending' | 'failed' | 'expired' = 'pending';

        if (data.status === 'approved') {
            status = 'paid';
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
            status = 'failed';
        } else if (data.status === 'expired') {
            status = 'expired';
        } else if (data.status === 'pending' || data.status === 'in_process') {
            status = 'pending';
        }

        return {
            txId: data.id.toString(),
            status,
            amount: data.transaction_amount,
            paidAt: data.date_approved || data.date_last_updated
        };
    } catch (error: any) {
        console.error('Erro Mercado Pago checkStatus:', error);
        throw new Error(`Mercado Pago: ${error.message}`);
    }
};
