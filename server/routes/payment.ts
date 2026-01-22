
import { Router } from 'express';
import { supabaseAdmin } from '../services/supabaseClient.js';
import { generatePaymentQRCode, checkPaymentStatus, logTransaction } from '../../services/paymentGateway';

const router = Router();

/**
 * POST /api/payment/generate-qr
 * Gera QR Code PIX para pagamento
 */
router.post('/generate-qr', async (req, res) => {
    try {
        const { amount, userId, type, metadata } = req.body;

        if (!amount || !userId) {
            return res.status(400).json({ error: 'Campos obrigatórios: amount, userId' });
        }

        if (amount < 1) {
            return res.status(400).json({ error: 'Valor mínimo: R$ 1,00' });
        }

        const result = await generatePaymentQRCode(amount, {
            description: type === 'zepay_recharge' ? 'Recarga ZéPay' : 'Pagamento',
            userId,
            type,
            ...metadata
        });

        // Salvar registro de transação pendente
        await supabaseAdmin.from('user_terminal_transactions').insert({
            user_id: userId,
            amount,
            type: 'SALE',
            status: 'pending',
            method: 'PIX',
            metadata: {
                txId: result.txId,
                gatewayUsed: result.gatewayUsed,
                type
            }
        });

        res.json(result);
    } catch (error: any) {
        console.error('[Payment API] Erro ao gerar QR:', error);
        res.status(500).json({ error: error.message || 'Erro ao gerar cobrança' });
    }
});

/**
 * GET /api/payment/status/:txId
 * Verifica status de um pagamento
 */
router.get('/status/:txId', async (req, res) => {
    try {
        const { txId } = req.params;

        if (!txId) {
            return res.status(400).json({ error: 'txId é obrigatório' });
        }

        const status = await checkPaymentStatus(txId);
        res.json(status);
    } catch (error: any) {
        console.error('[Payment API] Erro ao verificar status:', error);
        res.status(500).json({ error: error.message || 'Erro ao verificar status' });
    }
});

/**
 * POST /api/payment/webhook/infinitepay
 * Webhook para receber confirmações do InfinitePay
 */
router.post('/webhook/infinitepay', async (req, res) => {
    try {
        const { event, data } = req.body;

        console.log('[Webhook InfinitePay]', event, data);

        // TODO: Validar assinatura do webhook em produção
        // const signature = req.headers['x-infinitepay-signature'];
        // if (!isValidSignature(signature, req.body)) {
        //     return res.status(401).json({ error: 'Assinatura inválida' });
        // }

        if (event === 'charge.paid' || event === 'payment.approved') {
            await processPaymentConfirmation(data.id, 'infinitepay');
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error('[Webhook InfinitePay] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/payment/webhook/mercadopago
 * Webhook para receber confirmações do Mercado Pago
 */
router.post('/webhook/mercadopago', async (req, res) => {
    try {
        const { type, action, data } = req.body;

        console.log('[Webhook Mercado Pago]', type, action, data);

        // Mercado Pago envia notificações de diferentes tipos
        if (type === 'payment' && action === 'payment.updated') {
            const paymentId = data.id;
            await processPaymentConfirmation(paymentId, 'mercadopago');
        }

        res.status(200).send('OK');
    } catch (error: any) {
        console.error('[Webhook Mercado Pago] Erro:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Processa confirmação de pagamento recebida via webhook
 */
async function processPaymentConfirmation(txId: string, gateway: string) {
    try {
        console.log(`[Payment] Processando confirmação ${txId} via ${gateway} `);

        // 1. Verificar status real na API
        const status = await checkPaymentStatus(txId);

        if (status.status !== 'paid') {
            console.log(`[Payment] Status não é 'paid': ${status.status} `);
            return;
        }

        // 2. Buscar transação no banco
        const { data: transaction, error: txError } = await supabaseAdmin
            .from('user_terminal_transactions')
            .select('*')
            .eq('metadata->>txId', txId)
            .maybeSingle();

        if (txError) {
            console.error('[Payment] Erro ao buscar transação:', txError);
            return;
        }

        if (!transaction) {
            console.log('[Payment] Transação não encontrada para txId:', txId);
            return;
        }

        if (transaction.status === 'paid') {
            console.log('[Payment] Transação já processada');
            return;
        }

        // 3. Atualizar status da transação
        await supabaseAdmin
            .from('user_terminal_transactions')
            .update({
                status: 'paid',
                updated_at: new Date().toISOString()
            })
            .eq('id', transaction.id);

        // 4. Atualizar saldo do usuário (se for recarga ZéPay)
        const metadata = transaction.metadata as any;
        if (metadata?.type === 'zepay_recharge') {
            // Verificar se existe driver_wallet
            const { data: wallet } = await supabaseAdmin
                .from('driver_wallets')
                .select('*')
                .eq('driver_id', transaction.user_id)
                .maybeSingle();

            if (wallet) {
                // Atualizar saldo existente
                await supabaseAdmin
                    .from('driver_wallets')
                    .update({
                        balance: (parseFloat(wallet.balance) + parseFloat(transaction.amount)).toFixed(2)
                    })
                    .eq('driver_id', transaction.user_id);
            } else {
                // Criar wallet
                await supabaseAdmin
                    .from('driver_wallets')
                    .insert({
                        driver_id: transaction.user_id,
                        balance: transaction.amount
                    });
            }
        }

        // 5. Registrar log de sucesso
        await logTransaction(
            gateway,
            'charge',
            true,
            { txId },
            { status: 'paid', amount: transaction.amount }
        );

        console.log(`[Payment] Pagamento ${txId} processado com sucesso!`);
    } catch (error: any) {
        console.error('[Payment] Erro ao processar confirmação:', error);

        // Registrar log de erro
        await logTransaction(
            gateway,
            'charge',
            false,
            { txId },
            {},
            error.message
        );
    }
}

export default router;
