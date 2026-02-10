import { getClient } from './cloud';
import { infinitePayCreateCharge, infinitePayCheckStatus, infinitePayGetCharge, infinitePayRefundCharge } from './infinitepay';
import { mercadoPagoCreatePayment, mercadoPagoCheckStatus, mercadoPagoCreateOrder } from './mercadopago';
import { generatePixPayload } from '../utils/pixPayloadGenerator';
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
 * Busca todos os gateways ativos, priorizando o principal
 */
export const getActiveGateways = async (): Promise<PaymentGatewayConfig[]> => {
    const sb = getClient();
    if (!sb) return [];

    try {
        const { data, error } = await sb
            .from('payment_gateway_settings')
            .select('*')
            .eq('is_active', true)
            .order('is_primary', { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Erro ao buscar gateways ativos:', error);
        return [];
    }
};

/**
 * Registra log de transação no banco
 */
export const logTransaction = async (
    gatewayName: string,
    operationType: 'charge' | 'refund' | 'check_status' | 'capture',
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
const attemptWithGateway = async <T>(
    operation: (gateway: PaymentGatewayConfig) => Promise<T>,
    operationType: 'charge' | 'refund' | 'check_status' | 'capture',
    preferredGateway?: string
): Promise<T> => {
    const gateways = await getActiveGateways();

    if (gateways.length === 0) {
        throw new Error('Nenhum gateway de pagamento ativo encontrado.');
    }

    // Se um gateway preferencial for passado, tentamos apenas ele primeiro
    const targetGateways = preferredGateway
        ? gateways.filter(g => g.gateway_name === preferredGateway)
        : gateways;

    if (preferredGateway && targetGateways.length === 0) {
        throw new Error(`O gateway ${preferredGateway} não está ativo ou disponível.`);
    }

    let lastError: any = null;

    for (const gateway of targetGateways) {
        try {
            const result = await operation(gateway);
            await logTransaction(gateway.gateway_name, operationType, true, {}, result);
            return result;
        } catch (error: any) {
            console.warn(`Gateway ${gateway.gateway_name} falhou:`, error.message);
            await logTransaction(
                gateway.gateway_name,
                operationType,
                false,
                {},
                {},
                error.message
            );
            lastError = error;
            // Se o usuário ESCOLHEU esse gateway, não fazemos fallback automático para outros
            if (preferredGateway) break;
        }
    }

    throw new Error(lastError?.message || 'Nenhum gateway de pagamento disponível no momento.');
};

export const estimateFee = (amount: number, gateway: PaymentGatewayConfig): { fee: number; total: number } => {
    if (!gateway.fees || gateway.gateway_name === 'pix') return { fee: 0, total: amount };

    // Por padrão usamos a taxa de PIX, já que o modal é focado em PIX no momento
    const feePercent = gateway.fees.pix || 0;
    const fee = amount * (feePercent / 100);
    return { fee, total: amount + fee };
};

export const generatePaymentQRCode = async (
    amount: number,
    metadata: Record<string, any>,
    preferredGateway?: string
): Promise<PaymentQRCodeResult> => {
    return attemptWithGateway(async (gateway) => {
        let qrCode: string;
        let txId: string;

        // Aplica taxa dinâmica se houver
        const { total } = estimateFee(amount, gateway);
        const finalAmount = Number(total.toFixed(2));

        if (gateway.gateway_name === 'infinitepay') {
            const payer = metadata.payer;
            const items = metadata.items;
            const result = await infinitePayCreateCharge(finalAmount, metadata, gateway.credentials as any, payer, items);
            qrCode = result.qrCode;
            txId = result.txId;
        } else if (gateway.gateway_name === 'mercadopago') {
            const processingMode = metadata.processing_mode || 'automatic';
            const result = await mercadoPagoCreateOrder(finalAmount, metadata, gateway.credentials as any, processingMode);
            qrCode = result.qrCode;
            txId = result.txId;
        } else if (gateway.gateway_name === 'pix') {
            // PIX Estático (Manual)
            const creds = gateway.credentials as any;
            qrCode = generatePixPayload({
                key: creds.pixKey,
                keyType: creds.pixKeyType,
                name: creds.merchantName || 'Zé Entregas',
                city: creds.merchantCity || 'Brasília',
                amount: finalAmount,
                description: metadata.description || 'Recarga Carteira'
            });
            txId = 'MANUAL_OFFLINE_' + Date.now();
        } else {
            throw new Error(`Gateway ${gateway.gateway_name} não suportado.`);
        }

        return {
            qrCode,
            txId,
            gatewayUsed: gateway.gateway_name
        };
    }, 'charge', preferredGateway);
};

/**
 * Verifica status de um pagamento
 */
export const checkPaymentStatus = async (txId: string, preferredGateway?: string): Promise<PaymentStatus> => {
    if (txId.startsWith('MANUAL_OFFLINE_')) {
        return { txId, status: 'pending' };
    }

    return attemptWithGateway(async (gateway) => {
        if (gateway.gateway_name === 'infinitepay') {
            return await infinitePayCheckStatus(txId, gateway.credentials as any);
        } else if (gateway.gateway_name === 'mercadopago') {
            return await mercadoPagoCheckStatus(txId, gateway.credentials as any);
        } else if (gateway.gateway_name === 'pix') {
            // Fallback para PIX se cair aqui sem prefixo manual (improvável)
            return { txId, status: 'pending' };
        } else {
            throw new Error(`Gateway ${gateway.gateway_name} não suportado.`);
        }
    }, 'check_status', preferredGateway);
};

/**
 * Estorna um pagamento
 */
export const refundPayment = async (txId: string): Promise<boolean> => {
    return attemptWithGateway(async (gateway) => {
        // Implementar lógica de estorno aqui (futuro)
        throw new Error('Funcionalidade de estorno ainda não implementada.');
    }, 'refund');
};
