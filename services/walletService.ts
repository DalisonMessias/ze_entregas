import { getClient } from './cloud';

export interface DebitWalletParams {
    userId: string;
    amount: number;
    description: string;
    paymentMethod: string; // 'PIX', 'CREDIT_CARD', etc.
    isCorporatePayment?: boolean; // Flag explícita para indicar uso de cartão corporativo
    metadata?: any;
}

export interface WalletTransactionResult {
    success: boolean;
    transactionId?: string;
    message?: string;
    newBalance?: number;
    walletType: 'PERSONAL' | 'CORPORATE';
}

/**
 * Realiza o débito na carteira do usuário seguindo a regra:
 * - Padrão: Débito na Carteira Pessoal (driver_wallets)
 * - Exceção: Se isCorporatePayment for true, debita na Carteira Corporativa (store_wallets)
 */
export const debitUserWallet = async (params: DebitWalletParams): Promise<WalletTransactionResult> => {
    const sb = getClient();
    if (!sb) {
        return { success: false, message: 'Erro de conexão com banco de dados', walletType: 'PERSONAL' };
    }

    const { userId, amount, description, paymentMethod, isCorporatePayment, metadata } = params;

    // Regra de Negócio: Seleção da Carteira
    // Se for pagamento corporativo, usa store_wallets. Caso contrário, driver_wallets (Pessoal).
    const useCorporateWallet = isCorporatePayment === true;
    const itemsTable = useCorporateWallet ? 'store_wallets' : 'driver_wallets';
    const idField = useCorporateWallet ? 'store_id' : 'driver_id';
    const walletType = useCorporateWallet ? 'CORPORATE' : 'PERSONAL';

    try {
        // 1. Buscar saldo atual
        const { data: wallet, error: walletError } = await sb
            .from(itemsTable)
            .select('balance_decimal')
            .eq(idField, userId)
            .single();

        if (walletError || !wallet) {
            // Se não encontrar a carteira, podemos tentar criar (para driver) ou retornar erro
            // Assumindo que a carteira já deve existir via triggers
            return {
                success: false,
                message: `Carteira não encontrada: ${walletType} (${walletError?.message})`,
                walletType
            };
        }

        const currentBalance = Number(wallet.balance_decimal || 0);

        // --- Lógica de Verificação de Limite de Saldo (Overdraft) ---
        // Padrão: Permite ficar negativo até R$ -20,00
        // Exceção: Menu Digital não permite saldo negativo (Limite R$ 0,00)

        let overdraftLimit = -20.00;

        // Identificar se é transação de Menu Digital via metadata ou origem
        // Assumindo que o chamador passará 'origin' ou 'source' no metadata
        if (metadata?.origin === 'DIGITAL_MENU' || metadata?.source === 'DIGITAL_MENU') {
            overdraftLimit = 0.00;
        }

        const predictedBalance = currentBalance - amount;

        if (predictedBalance < overdraftLimit) {
            return {
                success: false,
                message: `Transação bloqueada. Saldo insuficiente. Limite de saldo negativo: R$ ${overdraftLimit.toFixed(2).replace('.', ',')}. Saldo atual: R$ ${currentBalance.toFixed(2).replace('.', ',')}`,
                walletType,
                newBalance: currentBalance
            };
        }

        const newBalance = predictedBalance;

        // 3. Atualizar saldo
        const { error: updateError } = await sb
            .from(itemsTable)
            .update({
                balance_decimal: newBalance,
                updated_at: new Date().toISOString()
            })
            .eq(idField, userId);

        if (updateError) {
            return {
                success: false,
                message: `Erro ao atualizar saldo: ${updateError.message}`,
                walletType
            };
        }

        // 4. Registrar Transação (wallet_transactions)
        // A tabela wallet_transactions parece estar ligada a store_id. 
        // Preciso verificar se existe uma tabela para transações de driver (user_terminal_transactions ou similar).
        // No supabase_global_part1.sql vi 'wallet_transactions' com 'store_id'.
        // E 'user_terminal_transactions' em payment.ts.
        // Se for carteira pessoal (driver), onde salvamos?
        // O `payment.ts` usa `user_terminal_transactions`.

        if (useCorporateWallet) {
            await sb.from('wallet_transactions').insert({
                store_id: userId,
                amount: -amount, // Valor negativo para representar débito visualmente se necessário, ou positivo com type DEBIT
                type: 'DEBIT',
                status: 'COMPLETED',
                description: description,
                metadata: {
                    paymentMethod,
                    originalAmount: amount,
                    ...metadata
                }
            });
        } else {
            // Carteira Pessoal (Driver) - usando user_terminal_transactions como log ou criando log específico?
            // Verificando payment.ts, ele usa user_terminal_transactions para recargas.
            // Vamos usar user_terminal_transactions também para débitos pessoais por consistência se não houver outra.
            await sb.from('user_terminal_transactions').insert({
                user_id: userId,
                amount: amount, // Aqui geralmente é o valor absoluto
                type: 'DEBIT', // Ajustando tipo para DEBIT
                status: 'COMPLETED',
                method: paymentMethod, // Mantendo compatibilidade com schema
                metadata: {
                    description,
                    isCorporatePayment,
                    ...metadata
                }
            });
        }

        return {
            success: true,
            newBalance,
            walletType,
            message: 'Débito realizado com sucesso'
        };

    } catch (error: any) {
        console.error('Erro no débito de carteira:', error);
        return {
            success: false,
            message: `Erro interno: ${error.message}`,
            walletType
        };
    }
};
