import * as cloud from '../../services/cloud.js';
import type { ZeAssistantOrder, ZeAssistantOrderType } from '../../types/zeAssistant.js';

/**
 * Serviço de Criação de Pedidos pelo Zé Assistente
 * Converte conversas em pedidos estruturados
 */
export class ZeAssistantOrderService {

    /**
     * Cria rascunho de pedido a partir da conversa
     */
    async createOrderDraft(
        conversationId: string,
        customerName: string,
        customerPhone: string,
        items: Array<{ productId: string; quantity: number; name: string; price: number }>,
        orderType: ZeAssistantOrderType,
        customerAddress?: any
    ): Promise<ZeAssistantOrder | null> {
        const supabase = cloud.getClient();
        if (!supabase) return null;

        // Calcular total
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        const { data, error } = await supabase
            .from('ze_assistant_orders')
            .insert({
                conversation_id: conversationId,
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_address: customerAddress,
                items: items,
                order_type: orderType,
                total_amount: totalAmount,
                delivery_fee: orderType === 'DELIVERY' ? await this.calculateDeliveryFee(customerAddress) : 0,
                confirmed_by_customer: false,
                status: 'PENDING'
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar pedido:', error);
            return null;
        }

        return data;
    }

    /**
     * Confirma pedido e cria no sistema principal
     */
    async confirmOrder(orderId: string): Promise<boolean> {
        const supabase = cloud.getClient();
        if (!supabase) return false;

        try {
            // Buscar dados do pedido
            const { data: order } = await supabase
                .from('ze_assistant_orders')
                .select('*, ze_assistant_conversations(store_id)')
                .eq('id', orderId)
                .single();

            if (!order) {
                return false;
            }

            // Atualizar pedido do assistente
            await supabase
                .from('ze_assistant_orders')
                .update({
                    confirmed_by_customer: true,
                    confirmed_at: new Date().toISOString(),
                    status: 'CONFIRMED'
                })
                .eq('id', orderId);

            return true;

        } catch (error) {
            console.error('Erro ao confirmar pedido:', error);
            return false;
        }
    }

    /**
     * Cancela pedido
     */
    async cancelOrder(orderId: string, reason: string): Promise<boolean> {
        const supabase = cloud.getClient();
        if (!supabase) return false;

        const { error } = await supabase
            .from('ze_assistant_orders')
            .update({
                status: 'CANCELLED',
                notes: reason
            })
            .eq('id', orderId);

        return !error;
    }

    /**
     * Calcula taxa de entrega (integrar com sistema de entrega existente)
     */
    private async calculateDeliveryFee(address: any): Promise<number> {
        // Implementar lógica de cálculo de frete
        // Por enquanto, retornar valor fixo de exemplo
        return 5.00;
    }

    /**
     * Valida dados do pedido
     */
    validateOrderData(
        items: any[],
        orderType: ZeAssistantOrderType,
        address?: any
    ): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!items || items.length === 0) {
            errors.push('Pedido deve ter pelo menos 1 item');
        }

        if (orderType === 'DELIVERY' && !address) {
            errors.push('Endereço é obrigatório para entrega');
        }

        for (const item of items) {
            if (!item.productId || !item.quantity || item.quantity <= 0) {
                errors.push(`Item inválido: ${item.name || 'desconhecido'}`);
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Busca pedidos de uma conversa
     */
    async getConversationOrders(conversationId: string): Promise<ZeAssistantOrder[]> {
        const supabase = cloud.getClient();
        if (!supabase) return [];

        const { data } = await supabase
            .from('ze_assistant_orders')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false });

        return data || [];
    }

    /**
     * Busca pedidos pendentes de confirmação
     */
    async getPendingOrders(storeId: string): Promise<ZeAssistantOrder[]> {
        const supabase = cloud.getClient();
        if (!supabase) return [];

        const { data } = await supabase
            .from('ze_assistant_orders')
            .select('*, ze_assistant_conversations!inner(store_id)')
            .eq('ze_assistant_conversations.store_id', storeId)
            .eq('confirmed_by_customer', false)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false });

        return data || [];
    }
}

export const zeAssistantOrderService = new ZeAssistantOrderService();

