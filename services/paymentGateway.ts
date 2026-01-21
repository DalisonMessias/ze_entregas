import { getClient } from './cloud';
import { infinitePayCreateCharge, infinitePayCheckStatus } from './infinitepay';
import { mercadoPagoCreatePayment, mercadoPagoCheckStatus } from './mercadopago';
import type { PaymentGatewayConfig } from '../types';

export interface PaymentQRCodeResult {
    qrCode: string;
    txId: string;
    gatewayUsed: string;
}

export interface PaymentStatus {
    txId: string;
    status: 'paid' | 'pending' | 'failed' | 'expired';
    amount?: number;
    paidAt?: string;
}

/**
 * Busca configuração de gateway ativo
 * @param preferPrimary Se true, busca o gateway principal. Se falso, busca o fallback.
 */
export const getActiveGateway = async (preferPrimary: boolean = true): Promise<PaymentGatewayConfig | null> => {
    const sb = getClient();
    if (!sb) return null;

    try {
        const query = sb
            .from('payment_gateway_settings')
            .select('*')
            .eq('is_active', true);

        if (preferPrimary) {
            query.eq('is_primary', true);
        } else {
            query.eq('is_primary', false);
        }

        const { data, error } = await query.limit(1).maybeSingle();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Erro ao buscar gateway ativo:', error);
        return null;
    }
};

/**
 * Registra log de transação no banco
 */
export const logTransaction = async (
    gatewayName: string,
    operationType: 'charge' | 'refund' | 'check_status',
    success: boolean,
    requestData: any,
    responseData: any,
    errorMessage?: string
): Promise<void> => {
    const sb = getClient();
    if (!sb) return;

    try {
        await sb.from('payment_gateway_logs').insert({
            gateway_name: gatewayName,
            operation_type: operationType,
            success,
            request_data: requestData,
            response_data: responseData,
            error_message: errorMessage || null
        });
    } catch (error) {
        console.error('Erro ao registrar log de transação:', error);
    }
};

/**
 * Executa uma operação de pagamento com fallback automático
 */
const attemptWithFallback = async <T>(
    operation: (gateway: PaymentGatewayConfig) => Promise<T>,
    operationType: 'charge' | 'refund' | 'check_status'
): Promise<T> => {
    // Tenta com gateway principal
    const primary = await getActiveGateway(true);

    if (primary) {
        try {
            const result = await operation(primary);
            await logTransaction(primary.gateway_name, operationType, true, {}, result);
            return result;
        } catch (error: any) {
            console.warn(`Gateway principal ${primary.gateway_name} falhou:`, error.message);
            await logTransaction(
                primary.gateway_name,
                operationType,
                false,
                {},
                {},
                error.message
            );
        }
    }

    // Fallback para gateway secundário
    const fallback = await getActiveGateway(false);

    if (fallback) {
        try {
            const result = await operation(fallback);
            await logTransaction(fallback.gateway_name, operationType, true, {}, result);
            return result;
        } catch (error: any) {
            console.error(`Gateway fallback ${fallback.gateway_name} também falhou:`, error.message);
            await logTransaction(
                fallback.gateway_name,
                operationType,
                false,
                {},
                {},
                error.message
            );
            throw new Error('Nenhum gateway de pagamento disponível no momento.');
        }
    }

    throw new Error('Nenhum gateway de pagamento ativo encontrado.');
};

/**
 * Gera QR Code PIX para pagamento
 */
export const generatePaymentQRCode = async (
    amount: number,
    metadata: Record<string, any>
): Promise<PaymentQRCodeResult> => {
    return attemptWithFallback(async (gateway) => {
        let qrCode: string;
        let txId: string;

        if (gateway.gateway_name === 'infinitepay') {
            const result = await infinitePayCreateCharge(amount, metadata, gateway.credentials as any);
            qrCode = result.qrCode;
            txId = result.txId;
        } else if (gateway.gateway_name === 'mercadopago') {
            const result = await mercadoPagoCreatePayment(amount, metadata, gateway.credentials as any);
            qrCode = result.qrCode;
            txId = result.txId;
        } else {
            throw new Error(`Gateway ${gateway.gateway_name} não suportado.`);
        }

        return {
            qrCode,
            txId,
            gatewayUsed: gateway.gateway_name
        };
    }, 'charge');
};

/**
 * Verifica status de um pagamento
 */
export const checkPaymentStatus = async (txId: string): Promise<PaymentStatus> => {
    return attemptWithFallback(async (gateway) => {
        if (gateway.gateway_name === 'infinitepay') {
            return await infinitePayCheckStatus(txId, gateway.credentials as any);
        } else if (gateway.gateway_name === 'mercadopago') {
            return await mercadoPagoCheckStatus(txId, gateway.credentials as any);
        } else {
            throw new Error(`Gateway ${gateway.gateway_name} não suportado.`);
        }
    }, 'check_status');
};

/**
 * Estorna um pagamento
 */
export const refundPayment = async (txId: string): Promise<boolean> => {
    return attemptWithFallback(async (gateway) => {
        // Implementar lógica de estorno aqui (futuro)
        throw new Error('Funcionalidade de estorno ainda não implementada.');
    }, 'refund');
};
