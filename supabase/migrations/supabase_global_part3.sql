-- ==================================================================
-- MIGRAÇÕES PART 3 (Consolidado: Taxas de Gateway e Carteira - Correção View)
-- ==================================================================

-- 1. Configuração de Taxas de Gateway (Manual/Visualização)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_gateway_settings' AND column_name = 'tax_percentage') THEN
        ALTER TABLE public.payment_gateway_settings ADD COLUMN tax_percentage NUMERIC(5, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_gateway_settings' AND column_name = 'tax_fixed') THEN
        ALTER TABLE public.payment_gateway_settings ADD COLUMN tax_fixed NUMERIC(15, 2);
    END IF;
END $$;

-- 2. Captura Automática de Taxas (10/02/2026)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'fee_amount') THEN
        ALTER TABLE public.wallet_transactions ADD COLUMN fee_amount NUMERIC(15, 2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallet_transactions' AND column_name = 'net_amount') THEN
        ALTER TABLE public.wallet_transactions ADD COLUMN net_amount NUMERIC(15, 2) DEFAULT 0.00;
    END IF;
END $$;

-- 3. View Financeira Admin (Atualizada com Taxas - CORREÇÃO: DROP ANTES DE RECRIAR)
DROP VIEW IF EXISTS public.admin_financial_transactions_view;

CREATE OR REPLACE VIEW public.admin_financial_transactions_view AS
SELECT
    t.id,
    t.store_id as user_id,
    up.name as user_name,
    t.amount,
    COALESCE(t.fee_amount, 0) as fee_amount,
    COALESCE(t.net_amount, t.amount) as net_amount,
    t.type,
    t.status,
    'ZEPAY_STORE' as source,
    t.description,
    t.created_at
FROM public.wallet_transactions t
LEFT JOIN public.user_profiles up ON t.store_id = up.id

UNION ALL

SELECT
    l.id,
    NULL as user_id,
    'Sistema' as user_name,
    0 as amount,
    0 as fee_amount,
    0 as net_amount,
    l.operation_type as type,
    CASE WHEN l.success THEN 'COMPLETED' ELSE 'FAILED' END as status,
    'GATEWAY_LOG (' || l.gateway_name || ')' as source,
    COALESCE(l.error_message, 'Operação registrada com sucesso'),
    l.created_at
FROM public.payment_gateway_logs l;

GRANT SELECT ON public.admin_financial_transactions_view TO authenticated;

-- 4. Função RPC Crédito em Carteira (Atualizada para suportar Taxas)
CREATE OR REPLACE FUNCTION public.credit_store_wallet(
    p_store_id UUID,
    p_amount NUMERIC,
    p_description TEXT,
    p_fee_amount NUMERIC DEFAULT 0,
    p_net_amount NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
    v_new_balance NUMERIC;
    v_credit_amount NUMERIC;
BEGIN
    -- Verificar/Criar Carteira
    INSERT INTO public.store_wallets (store_id, balance_decimal)
    VALUES (p_store_id, 0)
    ON CONFLICT (store_id) DO NOTHING;

    -- Definir valor de crédito (Líquido > 0 ? Líquido : Bruto)
    IF p_net_amount > 0 THEN
        v_credit_amount := p_net_amount;
    ELSE
        v_credit_amount := p_amount;
    END IF;

    -- Registrar Transação
    INSERT INTO public.wallet_transactions (
        store_id, 
        amount, 
        fee_amount, 
        net_amount, 
        type, 
        description, 
        status
    ) VALUES (
        p_store_id, 
        p_amount, 
        COALESCE(p_fee_amount, 0), 
        v_credit_amount, 
        'CREDIT', 
        p_description, 
        'COMPLETED'
    ) RETURNING id INTO v_transaction_id;

    -- Atualizar Saldo
    UPDATE public.store_wallets
    SET balance_decimal = balance_decimal + v_credit_amount,
        updated_at = NOW()
    WHERE store_id = p_store_id
    RETURNING balance_decimal INTO v_new_balance;

    RETURN jsonb_build_object(
        'success', true, 
        'transaction_id', v_transaction_id, 
        'new_balance', v_new_balance,
        'fee_deducted', COALESCE(p_fee_amount, 0),
        'credited_amount', v_credit_amount
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_store_wallet(UUID, NUMERIC, TEXT, NUMERIC, NUMERIC) TO authenticated, service_role;

-- 5. Correção de Store Slug (Reaplicação)
CREATE OR REPLACE FUNCTION public.public_get_store_by_slug(p_city_slug text, p_store_slug text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'store_name', store_name,
        'store_logo_url', store_logo_url,
        'cover_url', cover_url,
        'is_open', is_open,
        'is_currently_open', is_currently_open,
        'phone_number', phone_number,
        'chat_number', chat_number,
        'description', description,
        'pix_key', pix_key,
        'opening_hours', opening_hours,
        'preparation_time_min', preparation_time_min,
        'preparation_time_max', preparation_time_max,
        'store_address_street', store_address_street,
        'store_address_number', store_address_number,
        'store_address_district', store_address_district,
        'store_address_city', store_address_city,
        'store_address_state', store_address_state,
        'receive_orders_via_chat', receive_orders_via_chat,
        'receive_orders_via_platform', receive_orders_via_platform,
        'city', city,
        'state', store_address_state,
        'store_address_zip', store_address_zip,
        'store_slug', store_slug,
        'city_slug', city_slug,
        'show_comments_on_menu', show_comments_on_menu,
        'ratings_count', ratings_count,
        'average_rating', average_rating,
        'super_store_plan_type', super_store_plan_type
    )
    INTO v_result
    FROM public.user_profiles
    WHERE city_slug = p_city_slug 
      AND store_slug = p_store_slug
      AND role = 'store_partner'
    LIMIT 1;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_store_by_slug(text, text) TO anon, authenticated, service_role;

-- 6. Cancelamento Publico via /track (usuario convidado)
CREATE OR REPLACE FUNCTION public.cancel_public_order(p_order_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_status_upper TEXT;
    v_ticket_status TEXT;
    v_payment_status_upper TEXT;
    v_payment_method_upper TEXT;
    v_platform_payment BOOLEAN := FALSE;
    v_payment_confirmed BOOLEAN := FALSE;
    v_requires_support_refund BOOLEAN := FALSE;
    v_block_message TEXT;
BEGIN
    SELECT
        o.id,
        o.status::TEXT AS status_text,
        o.payment_status,
        o.payment_method::TEXT AS payment_method_text,
        o.amount_paid,
        o.infinitepay_status,
        o.infinitepay_id,
        o.infinitepay_url,
        o.payment_details
    INTO v_order
    FROM public.orders o
    WHERE o.id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'cancelled', false,
            'can_cancel', false,
            'code', 'NOT_FOUND',
            'message', 'Pedido nao encontrado.'
        );
    END IF;

    v_status_upper := UPPER(COALESCE(v_order.status_text, ''));
    v_payment_status_upper := UPPER(COALESCE(v_order.payment_status, ''));
    v_payment_method_upper := UPPER(COALESCE(v_order.payment_method_text, ''));

    IF v_status_upper IN ('CANCELLED', 'REJECTED') THEN
        RETURN jsonb_build_object(
            'success', false,
            'cancelled', false,
            'can_cancel', false,
            'code', 'ALREADY_FINALIZED',
            'current_status', v_order.status_text,
            'message', 'Pedido ja esta cancelado ou rejeitado.'
        );
    END IF;

    IF v_status_upper IN ('ACCEPTED', 'PREPARING') THEN
        RETURN jsonb_build_object(
            'success', false,
            'cancelled', false,
            'can_cancel', false,
            'code', 'CANCELLATION_BLOCKED',
            'current_status', v_order.status_text,
            'message', 'Cancelamento indisponivel: o pedido ja foi aceito pela loja e esta em producao.'
        );
    END IF;

    IF v_status_upper IN ('READY', 'IN_DELIVERY', 'IN_TRANSIT', 'ON_WAY', 'DELIVERED', 'COMPLETED') THEN
        RETURN jsonb_build_object(
            'success', false,
            'cancelled', false,
            'can_cancel', false,
            'code', 'CANCELLATION_BLOCKED',
            'current_status', v_order.status_text,
            'message', 'Cancelamento indisponivel: o pedido ja foi encaminhado para retirada/entrega ou finalizado.'
        );
    END IF;

    SELECT LOWER(COALESCE(ot.status, ''))
    INTO v_ticket_status
    FROM public.orders_tickets ot
    WHERE ot.general_order_id = p_order_id
    ORDER BY ot.created_at DESC
    LIMIT 1;

    IF v_ticket_status IN ('producing', 'ready', 'in_transit', 'delivered', 'completed') THEN
        RETURN jsonb_build_object(
            'success', false,
            'cancelled', false,
            'can_cancel', false,
            'code', 'CANCELLATION_BLOCKED',
            'current_status', v_order.status_text,
            'message', 'Cancelamento indisponivel: o pedido ja entrou no fluxo de producao/entrega.'
        );
    END IF;

    -- Pagamento via plataforma: cartao/boleto ou PIX com evidencias de gateway.
    IF v_payment_method_upper IN ('CREDIT_CARD', 'DEBIT_CARD', 'BOLETO') THEN
        v_platform_payment := TRUE;
    END IF;

    IF v_payment_method_upper = 'PIX' AND (
        COALESCE(v_order.infinitepay_id, '') <> ''
        OR COALESCE(v_order.infinitepay_status, '') <> ''
        OR COALESCE(v_order.infinitepay_url, '') <> ''
        OR LOWER(COALESCE(v_order.payment_details ->> 'gateway', '')) IN ('mercadopago', 'infinitepay')
        OR LOWER(COALESCE(v_order.payment_details ->> 'provider', '')) IN ('mercadopago', 'infinitepay')
    ) THEN
        v_platform_payment := TRUE;
    END IF;

    -- Pagamento confirmado/efetivado.
    IF v_payment_status_upper IN ('PAID', 'CONFIRMED', 'COMPLETED', 'APPROVED', 'SUCCESS')
       OR COALESCE(v_order.amount_paid, 0) > 0
       OR UPPER(COALESCE(v_order.infinitepay_status, '')) IN ('PAID', 'APPROVED', 'COMPLETED') THEN
        v_payment_confirmed := TRUE;
    END IF;

    v_requires_support_refund := v_platform_payment AND v_payment_confirmed;

    UPDATE public.orders
    SET
        status = 'CANCELLED',
        updated_at = NOW()
    WHERE id = p_order_id;

    UPDATE public.orders_tickets
    SET
        status = 'cancelled',
        updated_at = NOW()
    WHERE general_order_id = p_order_id
      AND LOWER(COALESCE(status, '')) IN ('pending');

    v_block_message := CASE
        WHEN v_requires_support_refund THEN
            'Pedido cancelado. O pagamento foi confirmado na plataforma. Abra o suporte para solicitar o reembolso.'
        ELSE
            'Pedido cancelado com sucesso.'
    END;

    RETURN jsonb_build_object(
        'success', true,
        'cancelled', true,
        'can_cancel', true,
        'code', 'CANCELLED',
        'current_status', 'CANCELLED',
        'is_platform_payment', v_platform_payment,
        'payment_confirmed', v_payment_confirmed,
        'requires_support_refund', v_requires_support_refund,
        'message', v_block_message
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'cancelled', false,
        'can_cancel', false,
        'code', 'INTERNAL_ERROR',
        'message', 'Erro inesperado ao cancelar pedido.'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_public_order(UUID) TO anon, authenticated, service_role;
