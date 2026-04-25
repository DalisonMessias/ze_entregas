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
DROP FUNCTION IF EXISTS public.public_get_store_by_slug(text, text);
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

-- 7. PIX da Plataforma (publico para /track)
CREATE OR REPLACE FUNCTION public.get_public_pix_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_credentials JSONB;
BEGIN
    SELECT credentials
    INTO v_credentials
    FROM public.payment_gateway_settings
    WHERE gateway_name = 'pix'
    LIMIT 1;

    RETURN jsonb_build_object(
        'pix_key', COALESCE(v_credentials ->> 'pixKey', ''),
        'pix_key_type', COALESCE(v_credentials ->> 'pixKeyType', 'EMAIL'),
        'merchant_name', COALESCE(v_credentials ->> 'merchantName', 'LOJA'),
        'merchant_city', COALESCE(v_credentials ->> 'merchantCity', 'CIDADE')
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_pix_config() TO anon, authenticated, service_role;

-- 8. Atualização do Trigger handle_new_user (Carteira para TODOS os usuários)
-- Recriando a função para garantir que usuários com role='user' também tenham carteira pessoal (driver_wallets)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name, avatar_url, role, phone_number, cpf, city, store_name, store_document, address_street, address_number, address_district, address_zip, address_state, association_code)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'delivery_person')::public.user_role,
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'store_name',
    NEW.raw_user_meta_data->>'store_document',
    NEW.raw_user_meta_data->>'address_street',
    NEW.raw_user_meta_data->>'address_number',
    NEW.raw_user_meta_data->>'address_district',
    NEW.raw_user_meta_data->>'address_zip',
    NEW.raw_user_meta_data->>'address_state',
    upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6))
  );

  -- Logística de Carteiras (Zebank vs ZéPay)
  -- 1. Carteira Pessoal (Zebank) - Agora para TODOS os usuários (Clientes, Entregadores e Lojistas)
  INSERT INTO public.driver_wallets (driver_id, balance_decimal, savings_balance_decimal)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (driver_id) DO NOTHING;

  -- 2. Carteira de Vendas (ZéPay) - Apenas para Lojistas (Preservado)
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'delivery_person') IN ('store_partner') THEN
      INSERT INTO public.store_wallets (store_id, balance_decimal)
      VALUES (NEW.id, 0)
      ON CONFLICT (store_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Migração para Usuários Existentes Sem Carteira
DO $$
BEGIN
    INSERT INTO public.driver_wallets (driver_id, balance_decimal, savings_balance_decimal)
    SELECT id, 0, 0 
    FROM public.user_profiles
    ON CONFLICT (driver_id) DO NOTHING;
END $$;

-- 10. RPC: Preparar Pagamento em Carteira (Reserva de Saldo)
CREATE OR REPLACE FUNCTION public.prepare_wallet_payment(
    p_user_id UUID,
    p_amount NUMERIC,
    p_description TEXT DEFAULT 'Reserva de saldo para pedido'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC;
    v_transaction_id UUID;
BEGIN
    -- Obter saldo atual
    SELECT balance_decimal INTO v_balance
    FROM public.driver_wallets
    WHERE driver_id = p_user_id
    FOR UPDATE;

    IF v_balance IS NULL THEN
        -- Criar carteira caso não exista (fallback)
        INSERT INTO public.driver_wallets (driver_id, balance_decimal)
        VALUES (p_user_id, 0)
        RETURNING balance_decimal INTO v_balance;
    END IF;

    -- Validar saldo
    IF v_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'INSUFFICIENT_BALANCE',
            'message', 'Saldo insuficiente na carteira pessoal.',
            'current_balance', v_balance
        );
    END IF;

    -- Registrar Transação de Reserva (PENDENTE)
    -- Importante: Usamos store_id na tabela wallet_transactions para usuários (consistência com a view)
    INSERT INTO public.wallet_transactions (
        store_id,
        amount,
        type,
        status,
        description,
        metadata
    ) VALUES (
        p_user_id,
        p_amount,
        'DEBIT',
        'PENDING',
        p_description,
        jsonb_build_object('is_reservation', true)
    ) RETURNING id INTO v_transaction_id;

    -- Dedução temporária do saldo (Reserva)
    UPDATE public.driver_wallets
    SET balance_decimal = balance_decimal - p_amount,
        updated_at = NOW()
    WHERE driver_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'reserved_amount', p_amount,
        'remaining_balance', v_balance - p_amount
    );
END;
$$;

-- 11. RPC: Confirmar Pagamento em Carteira
CREATE OR REPLACE FUNCTION public.confirm_wallet_payment(
    p_transaction_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Apenas marcar como COMPLETED. O saldo já foi deduzido no prepare.
    UPDATE public.wallet_transactions
    SET status = 'COMPLETED',
        updated_at = NOW()
    WHERE id = p_transaction_id AND status = 'PENDING';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transação não encontrada ou já processada.');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 12. RPC: Cancelar Pagamento em Carteira (Estorno de Reserva)
CREATE OR REPLACE FUNCTION public.cancel_wallet_payment(
    p_transaction_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_amount NUMERIC;
    v_user_id UUID;
    v_status TEXT;
BEGIN
    SELECT store_id, amount, status INTO v_user_id, v_amount, v_status
    FROM public.wallet_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    IF v_status <> 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Transação não está pendente ou já foi processada.');
    END IF;

    -- Devolver saldo
    UPDATE public.driver_wallets
    SET balance_decimal = balance_decimal + v_amount,
        updated_at = NOW()
    WHERE driver_id = v_user_id;

    -- Marcar como CANCELLED
    UPDATE public.wallet_transactions
    SET status = 'CANCELLED',
        updated_at = NOW()
    WHERE id = p_transaction_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.prepare_wallet_payment(UUID, NUMERIC, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.confirm_wallet_payment(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_wallet_payment(UUID) TO authenticated, service_role;

-- ==================================================================
-- SISTEMA DE CUPONS E DESCONTOS (10/02/2026)
-- ==================================================================

-- 1. Adicionar colunas de cupom na tabela orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_discount_value NUMERIC(10, 2) DEFAULT 0;

-- 2. RPC: Validar Cupom (Global, Loja ou Indicação)
CREATE OR REPLACE FUNCTION public.validate_coupon(
    p_code TEXT,
    p_store_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_coupon JSONB;
    v_claimed_reward RECORD;
    v_shop_settings RECORD;
    v_store_config JSONB;
    v_code TEXT := upper(trim(p_code));
BEGIN
    -- 1. Verificar em shop_settings (Cupons Globais)
    SELECT coupons INTO v_shop_settings FROM public.shop_settings WHERE id = '1';
    
    IF v_shop_settings.coupons IS NOT NULL THEN
        FOR v_coupon IN SELECT jsonb_array_elements(v_shop_settings.coupons) LOOP
            IF upper(v_coupon->>'code') = v_code THEN
                RETURN jsonb_build_object(
                    'valid', true,
                    'type', 'GLOBAL',
                    'discount_type', CASE WHEN (v_coupon->>'discount_percent')::numeric > 0 THEN 'PERCENT' ELSE 'FIXED' END,
                    'discount_value', CASE WHEN (v_coupon->>'discount_percent')::numeric > 0 THEN (v_coupon->>'discount_percent')::numeric ELSE (v_coupon->>'discount_value')::numeric END,
                    'min_order_value', COALESCE((v_coupon->>'min_purchase_value')::numeric, 0)
                );
            END IF;
        END LOOP;
    END IF;

    -- 2. Verificar em claimed_rewards (Cupons de Indicação/Recompensas)
    SELECT cr.*, rr.reward_type, rr.reward_value, rr.min_order_value 
    INTO v_claimed_reward
    FROM public.claimed_rewards cr
    JOIN public.referral_rewards rr ON rr.id = cr.reward_id
    WHERE upper(cr.coupon_code) = v_code 
      AND cr.status = 'ACTIVE' 
      AND (cr.expires_at IS NULL OR cr.expires_at > NOW())
    LIMIT 1;

    IF v_claimed_reward.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'valid', true,
            'type', 'REWARD',
            'discount_type', CASE WHEN v_claimed_reward.reward_type = 'CUPOM_PERCENT' THEN 'PERCENT' ELSE 'FIXED' END,
            'discount_value', v_claimed_reward.reward_value,
            'min_order_value', COALESCE(v_claimed_reward.min_order_value, 0)
        );
    END IF;

    -- 3. Verificar em user_profiles (Cupons da Loja no campo config)
    SELECT config INTO v_store_config FROM public.user_profiles WHERE id = p_store_id;
    
    IF v_store_config ? 'coupons' AND jsonb_typeof(v_store_config->'coupons') = 'array' THEN
        FOR v_coupon IN SELECT jsonb_array_elements(v_store_config->'coupons') LOOP
            IF upper(v_coupon->>'code') = v_code THEN
                RETURN jsonb_build_object(
                    'valid', true,
                    'type', 'STORE',
                    'discount_type', CASE WHEN (v_coupon->>'discount_percent')::numeric > 0 THEN 'PERCENT' ELSE 'FIXED' END,
                    'discount_value', CASE WHEN (v_coupon->>'discount_percent')::numeric > 0 THEN (v_coupon->>'discount_percent')::numeric ELSE (v_coupon->>'discount_value')::numeric END,
                    'min_order_value', COALESCE((v_coupon->>'min_purchase_value')::numeric, 0)
                );
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object('valid', false, 'message', 'Cupom inválido ou expirado');
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, UUID) TO anon, authenticated;

-- 3. Atualizar create_public_order para suportar cupons
DROP FUNCTION IF EXISTS public.create_public_order(UUID, JSONB, NUMERIC, TEXT, JSONB, TEXT, TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN, NUMERIC, INTEGER, NUMERIC);
DROP FUNCTION IF EXISTS public.create_public_order(UUID, JSONB, NUMERIC, TEXT, JSONB, TEXT, TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN, NUMERIC, INTEGER, NUMERIC, TEXT, NUMERIC);

CREATE OR REPLACE FUNCTION public.create_public_order(
    p_store_id UUID,
    p_items JSONB,
    p_total_price NUMERIC,
    p_payment_method TEXT,
    p_shipping_address JSONB,
    p_delivery_mode TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_pix_active BOOLEAN DEFAULT FALSE,
    p_observation TEXT DEFAULT NULL,
    p_is_location_delivery BOOLEAN DEFAULT FALSE,
    p_shipping_cost NUMERIC DEFAULT 0,
    p_points_redeemed INTEGER DEFAULT 0,
    p_loyalty_discount_value NUMERIC DEFAULT 0,
    p_coupon_code TEXT DEFAULT NULL,
    p_coupon_discount_value NUMERIC DEFAULT 0
)
RETURNS UUID
AS $$
DECLARE
    v_order_id UUID;
    v_status public.order_status := 'pending';
BEGIN
    -- Definir status baseado na ativação do PIX
    IF p_payment_method = 'PIX' THEN
        IF p_pix_active THEN
            v_status := 'Aguardando pagamento (PIX)';
        ELSE
            v_status := 'Pagamento a combinar com a loja';
        END IF;
    END IF;

    INSERT INTO public.orders (
        store_id, 
        user_id, 
        status, 
        items, 
        total_price, 
        payment_method, 
        shipping_address, 
        order_type,
        customer_name, 
        customer_phone,
        observation,
        is_location_delivery,
        shipping_cost,
        points_redeemed,
        loyalty_discount_value,
        coupon_code,
        coupon_discount_value,
        origin
    )
    VALUES (
        p_store_id, 
        auth.uid(),
        v_status, 
        p_items, 
        p_total_price, 
        p_payment_method::public.payment_method, 
        p_shipping_address, 
        p_delivery_mode, 
        p_customer_name, 
        p_customer_phone,
        p_observation,
        p_is_location_delivery,
        p_shipping_cost,
        p_points_redeemed,
        p_loyalty_discount_value,
        upper(trim(p_coupon_code)),
        p_coupon_discount_value,
        'DIGITAL_MENU'
    )
    RETURNING id INTO v_order_id;

    -- DEDUZIR PONTOS (Se houver resgate)
    IF p_points_redeemed > 0 THEN
        INSERT INTO public.loyalty_history (store_id, user_id, order_id, points, type, description)
        VALUES (p_store_id, auth.uid(), v_order_id, -p_points_redeemed, 'DEBIT', 'Uso de pontos no pedido #' || SUBSTRING(v_order_id::text, 1, 8));

        UPDATE public.loyalty_points 
        SET balance = balance - p_points_redeemed, updated_at = now()
        WHERE store_id = p_store_id AND user_id = auth.uid();
    END IF;

    -- MARCAR CUPOM COMO USADO (Se for de indicação/recompensa)
    IF p_coupon_code IS NOT NULL THEN
        UPDATE public.claimed_rewards 
        SET status = 'USED' 
        WHERE upper(coupon_code) = upper(trim(p_coupon_code)) 
          AND user_id = auth.uid()
          AND status = 'ACTIVE';
    END IF;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_public_order(UUID, JSONB, NUMERIC, TEXT, JSONB, TEXT, TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN, NUMERIC, INTEGER, NUMERIC, TEXT, NUMERIC) TO anon, authenticated;

-- ==================================================================
-- SISTEMA DE BÔNUS POR PRODUTIVIDADE (03/04/2026)
-- ==================================================================

-- 1. Tabela de Campanhas de Bônus
CREATE TABLE IF NOT EXISTS public.bonus_campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    target_city TEXT, -- Alterado de city_id para target_city para compatibilidade
    tiers JSONB NOT NULL, -- Ex: [{"deliveries": 25, "reward": 30}, {"deliveries": 33, "reward": 50}]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para Campanhas
ALTER TABLE public.bonus_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active campaigns" ON public.bonus_campaigns;
CREATE POLICY "Public can view active campaigns" ON public.bonus_campaigns FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins can manage campaigns" ON public.bonus_campaigns;
CREATE POLICY "Admins can manage campaigns" ON public.bonus_campaigns FOR ALL USING (public.is_admin());

-- 2. Tabela de Progresso dos Entregadores
CREATE TABLE IF NOT EXISTS public.bonus_driver_progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.bonus_campaigns(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    deliveries_count INTEGER DEFAULT 0,
    bonus_earned NUMERIC(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'COMPLETED'
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (campaign_id, driver_id)
);

-- RLS para Progresso
ALTER TABLE public.bonus_driver_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can view own progress" ON public.bonus_driver_progress;
CREATE POLICY "Drivers can view own progress" ON public.bonus_driver_progress FOR SELECT USING (auth.uid() = driver_id);
DROP POLICY IF EXISTS "Admins can view all progress" ON public.bonus_driver_progress;
CREATE POLICY "Admins can view all progress" ON public.bonus_driver_progress FOR SELECT USING (public.is_admin());
DROP POLICY IF EXISTS "Drivers can insert zero progress" ON public.bonus_driver_progress;
CREATE POLICY "Drivers can insert zero progress" ON public.bonus_driver_progress FOR INSERT WITH CHECK (auth.uid() = driver_id AND deliveries_count = 0);

-- 3. Função para atualizar progresso de bônus
CREATE OR REPLACE FUNCTION public.update_driver_bonus_progress()
RETURNS TRIGGER AS $$
DECLARE
    v_campaign RECORD;
    v_tier JSONB;
    v_total_bonus NUMERIC(15, 2) := 0;
    v_current_count INTEGER;
BEGIN
    -- Só processa se a entrega foi COMPLETED
    IF NEW.status = 'COMPLETED' AND (OLD.status IS DISTINCT FROM 'COMPLETED') THEN
        -- Procurar campanhas ativas que englobem a data da entrega e (opcionalmente) a cidade
        FOR v_campaign IN 
            SELECT id, tiers 
            FROM public.bonus_campaigns 
            WHERE is_active = true 
              AND NOW() BETWEEN start_date AND end_date
        LOOP
            -- Upsert no progresso do entregador para esta campanha
            INSERT INTO public.bonus_driver_progress (campaign_id, driver_id, deliveries_count, last_updated)
            VALUES (v_campaign.id, NEW.partner_id, 1, NOW())
            ON CONFLICT (campaign_id, driver_id) 
            DO UPDATE SET 
                deliveries_count = public.bonus_driver_progress.deliveries_count + 1,
                last_updated = NOW()
            RETURNING deliveries_count INTO v_current_count;

            -- Calcular bônus acumulado baseado nos tiers
            -- Nota: O bônus é cumulativo baseado em atingir as metas
            FOR v_tier IN SELECT * FROM jsonb_array_elements(v_campaign.tiers) LOOP
                IF v_current_count >= (v_tier->>'deliveries')::integer THEN
                    v_total_bonus := v_total_bonus + (v_tier->>'reward')::numeric;
                END IF;
            END LOOP;

            -- Atualizar o valor do bônus ganho
            UPDATE public.bonus_driver_progress 
            SET bonus_earned = v_total_bonus
            WHERE campaign_id = v_campaign.id AND driver_id = NEW.partner_id;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger na tabela partner_requests
DROP TRIGGER IF EXISTS tr_update_bonus_progress ON public.partner_requests;
CREATE TRIGGER tr_update_bonus_progress
AFTER UPDATE ON public.partner_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_driver_bonus_progress();

-- 5. RPC para Admin listar progresso consolidado
CREATE OR REPLACE FUNCTION public.get_admin_bonus_stats(p_campaign_id UUID)
RETURNS TABLE (
    driver_name TEXT,
    deliveries_count INTEGER,
    bonus_earned NUMERIC,
    last_updated TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.name as driver_name,
        bdp.deliveries_count,
        bdp.bonus_earned,
        bdp.last_updated
    FROM public.bonus_driver_progress bdp
    JOIN public.user_profiles up ON up.id = bdp.driver_id
    WHERE bdp.campaign_id = p_campaign_id
    ORDER BY bdp.deliveries_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grants de Acesso as Tabelas e Funções de Bônus Essenciais 
GRANT ALL ON TABLE public.bonus_campaigns TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.bonus_driver_progress TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_bonus_stats(UUID) TO anon, authenticated, service_role;

-- Rotinas Inclusas de Resgate Manual do Entregador
ALTER TABLE public.bonus_driver_progress ADD COLUMN IF NOT EXISTS bonus_claimed NUMERIC(15, 2) DEFAULT 0;

CREATE OR REPLACE FUNCTION public.claim_bonus_campaign_reward(p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_progress RECORD;
    v_balance NUMERIC;
    v_transaction_id UUID;
    v_claim_amount NUMERIC;
    v_driver_id UUID := auth.uid();
BEGIN
    SELECT * INTO v_progress 
    FROM public.bonus_driver_progress
    WHERE campaign_id = p_campaign_id AND driver_id = v_driver_id
    FOR UPDATE;

    IF v_progress.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nenhuma recompensa disponível para resgate nesta campanha.');
    END IF;

    v_claim_amount := COALESCE(v_progress.bonus_earned, 0) - COALESCE(v_progress.bonus_claimed, 0);

    IF v_claim_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Você já resgatou todos os ganhos ou ainda não atingiu novas metas.');
    END IF;

    -- Depositar na Wallet Oficial do Entregador
    UPDATE public.driver_wallets
    SET balance_decimal = balance_decimal + v_claim_amount,
        updated_at = NOW()
    WHERE driver_id = v_driver_id
    RETURNING balance_decimal INTO v_balance;

    -- Registrar Extrato
    INSERT INTO public.wallet_transactions (
        store_id, 
        amount,
        net_amount,
        type,
        status,
        description
    ) VALUES (
        v_driver_id,
        v_claim_amount,
        v_claim_amount,
        'CREDIT',
        'COMPLETED',
        'Resgate de Bônus da Campanha: ' || COALESCE((SELECT title FROM public.bonus_campaigns WHERE id = p_campaign_id), 'Meta Bônus')
    ) RETURNING id INTO v_transaction_id;

    -- Atualizar que isso já foi resgatado
    UPDATE public.bonus_driver_progress
    SET bonus_claimed = COALESCE(bonus_claimed, 0) + v_claim_amount,
        last_updated = NOW()
    WHERE id = v_progress.id;

    RETURN jsonb_build_object('success', true, 'new_balance', v_balance, 'amount_credited', v_claim_amount);
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_bonus_campaign_reward(UUID) TO anon, authenticated, service_role;

-- Rotina de Auto-Upgrade Livre da Interface (Criação de Entregadores ou Lojas a partir do App Comum)
CREATE OR REPLACE FUNCTION public.upgrade_user_role(p_new_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário não conectado.');
    END IF;

    IF p_new_role NOT IN ('delivery_partner', 'store_partner') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cargo de upgrade inexistente nas regras do sistema.');
    END IF;

    -- Concretiza a fusão de papéis pulando o RLS original da user_profiles.
    UPDATE public.user_profiles
    SET role = p_new_role, last_updated = NOW()
    WHERE id = v_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'Perfil aprimorado com sucesso.');
END;
$$;
GRANT EXECUTE ON FUNCTION public.upgrade_user_role(TEXT) TO anon, authenticated, service_role;

-- 15. Garantir permissões de sistema para tabelas críticas (06/04/2026)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO service_role;
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon; -- Necessário para public_get_store_by_slug

-- 16. Garantir permissões para as tabelas do WhatsBot (06/04/2026)
GRANT ALL ON TABLE public.whatsbot_sessions TO service_role;
GRANT ALL ON TABLE public.whatsbot_settings TO service_role;
GRANT ALL ON TABLE public.whatsbot_send_history TO service_role;
GRANT ALL ON TABLE public.whatsbot_sessions TO authenticated;
GRANT ALL ON TABLE public.whatsbot_settings TO authenticated;
GRANT ALL ON TABLE public.whatsbot_send_history TO authenticated;

-- Adicionar coluna para descoberta dinâmica de URL
ALTER TABLE public.whatsbot_sessions 
ADD COLUMN IF NOT EXISTS last_known_public_url TEXT;

-- Tabela para armazenar chaves de sinal do WhatsApp individualmente (evita corrupção de sessão)
CREATE TABLE IF NOT EXISTS public.whatsbot_auth_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    key_type TEXT NOT NULL,
    key_id TEXT NOT NULL,
    key_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (store_id, key_type, key_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsbot_auth_keys_lookup ON public.whatsbot_auth_keys (store_id, key_type, key_id);

ALTER TABLE public.whatsbot_auth_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service manages whatsbot auth keys" ON public.whatsbot_auth_keys;
CREATE POLICY "Service manages whatsbot auth keys"
ON public.whatsbot_auth_keys
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

GRANT ALL ON TABLE public.whatsbot_auth_keys TO service_role;
GRANT ALL ON TABLE public.whatsbot_auth_keys TO authenticated;

-- Adicionar campo para mensagem de loja fechada (WhatsBot)
ALTER TABLE public.whatsbot_settings 
ADD COLUMN IF NOT EXISTS custom_closed_message TEXT;

-- ==================================================================
-- SISTEMA DE PLANOS REESTRUTURADO (06/04/2026)
-- ==================================================================

-- 1. Adicionar coluna plan_level em user_profiles
-- Valores: 'GRATUITO', 'COMISSAO', 'MENSALIDADE'
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS plan_level TEXT DEFAULT 'GRATUITO';

-- 2. Migrar dados existentes: quem já tem is_super_store = true recebe o plan_level do super_store_plan_type
-- Quem estava no plano COMISSAO
UPDATE public.user_profiles
SET plan_level = 'COMISSAO'
WHERE is_super_store = TRUE 
  AND super_store_plan_type = 'COMISSAO'
  AND (plan_level IS NULL OR plan_level = 'GRATUITO');

-- Quem estava no plano MENSALIDADE
UPDATE public.user_profiles
SET plan_level = 'MENSALIDADE'
WHERE is_super_store = TRUE 
  AND super_store_plan_type = 'MENSALIDADE'
  AND (plan_level IS NULL OR plan_level = 'GRATUITO');

-- 3. Atualizar trigger handle_new_user para atribuir plan_level GRATUITO a novos lojistas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, name, avatar_url, role, phone_number, cpf, city, store_name, store_document, address_street, address_number, address_district, address_zip, address_state, association_code, plan_level)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'avatar_url',
    COALESCE(NEW.raw_user_meta_data->>'role', 'delivery_person')::public.user_role,
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'cpf',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'store_name',
    NEW.raw_user_meta_data->>'store_document',
    NEW.raw_user_meta_data->>'address_street',
    NEW.raw_user_meta_data->>'address_number',
    NEW.raw_user_meta_data->>'address_district',
    NEW.raw_user_meta_data->>'address_zip',
    NEW.raw_user_meta_data->>'address_state',
    upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6)),
    'GRATUITO'
  );

  -- Logística de Carteiras (Zebank vs ZéPay)
  -- 1. Carteira Pessoal (Zebank) - Agora para TODOS os usuários (Clientes, Entregadores e Lojistas)
  INSERT INTO public.driver_wallets (driver_id, balance_decimal, savings_balance_decimal)
  VALUES (NEW.id, 0, 0)
  ON CONFLICT (driver_id) DO NOTHING;

  -- 2. Carteira de Vendas (ZéPay) - Apenas para Lojistas (Preservado)
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'delivery_person') IN ('store_partner') THEN
      INSERT INTO public.store_wallets (store_id, balance_decimal)
      VALUES (NEW.id, 0)
      ON CONFLICT (store_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RPC: Retornar status completo do plano atual do usuário logado
CREATE OR REPLACE FUNCTION public.get_my_plan_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile RECORD;
    v_is_expired BOOLEAN := FALSE;
    v_effective_level TEXT;
    v_plan_status TEXT;
BEGIN
    SELECT 
        is_super_store,
        super_store_plan_type,
        super_store_expiration,
        plan_level
    INTO v_profile
    FROM public.user_profiles
    WHERE id = v_user_id;

    IF v_profile IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Perfil não encontrado.'
        );
    END IF;

    -- Verificar se o plano mensal expirou
    IF v_profile.super_store_plan_type = 'MENSALIDADE' 
       AND v_profile.super_store_expiration IS NOT NULL 
       AND v_profile.super_store_expiration < NOW() THEN
        v_is_expired := TRUE;
    END IF;

    -- Determinar nível efetivo do plano
    IF v_is_expired THEN
        v_effective_level := 'GRATUITO';
        v_plan_status := 'EXPIRADO';
    ELSIF v_profile.is_super_store = TRUE THEN
        v_effective_level := COALESCE(v_profile.super_store_plan_type, 'COMISSAO');
        v_plan_status := 'ATIVO';
    ELSE
        v_effective_level := 'GRATUITO';
        v_plan_status := 'GRATUITO';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'plan_level', v_effective_level,
        'plan_status', v_plan_status,
        'is_super_store', COALESCE(v_profile.is_super_store, FALSE),
        'super_store_plan_type', v_profile.super_store_plan_type,
        'super_store_expiration', v_profile.super_store_expiration,
        'is_expired', v_is_expired
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_plan_status() TO authenticated;

-- 5. RPC: Verificar e aplicar downgrade automático em planos mensais expirados
-- Deve ser chamada periodicamente pelo sistema (ou no carregamento da página de planos)
CREATE OR REPLACE FUNCTION public.check_and_downgrade_expired_plans()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Rebaixar lojas cujo plano mensal expirou
    UPDATE public.user_profiles
    SET 
        is_super_store = FALSE,
        plan_level = 'GRATUITO'
    WHERE 
        is_super_store = TRUE
        AND super_store_plan_type = 'MENSALIDADE'
        AND super_store_expiration IS NOT NULL
        AND super_store_expiration < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'downgraded_count', v_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_and_downgrade_expired_plans() TO authenticated, service_role;

-- 6. Evolução WhatsBot: Suporte a mensagens duplas (Aberto/Fechado) no mesmo dia
ALTER TABLE public.whatsbot_send_history 
ADD COLUMN IF NOT EXISTS is_closed_message BOOLEAN DEFAULT FALSE;

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsbot_send_history_unique_day') THEN
        ALTER TABLE public.whatsbot_send_history DROP CONSTRAINT whatsbot_send_history_unique_day;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsbot_send_history_unique_day_v2') THEN
        ALTER TABLE public.whatsbot_send_history 
        ADD CONSTRAINT whatsbot_send_history_unique_day_v2 
        UNIQUE (store_id, contact_phone, send_date_local, is_closed_message);
    END IF;
END $$;

-- Redefinir função de reserva para considerar o tipo de mensagem
CREATE OR REPLACE FUNCTION public.reserve_whatsbot_daily_send(
    p_store_id UUID,
    p_contact_phone TEXT,
    p_contact_jid TEXT,
    p_send_date_local DATE,
    p_message_source TEXT,
    p_message_body TEXT,
    p_inbound_message_id TEXT DEFAULT NULL,
    p_is_closed_message BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    allowed BOOLEAN,
    history_id UUID,
    current_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_row public.whatsbot_send_history%ROWTYPE;
BEGIN
    INSERT INTO public.whatsbot_send_history (
        store_id,
        contact_phone,
        contact_jid,
        send_date_local,
        status,
        message_source,
        message_body,
        inbound_message_id,
        is_closed_message,
        created_at,
        updated_at
    )
    VALUES (
        p_store_id,
        p_contact_phone,
        p_contact_jid,
        p_send_date_local,
        'reserved',
        p_message_source,
        p_message_body,
        p_inbound_message_id,
        p_is_closed_message,
        now(),
        now()
    )
    ON CONFLICT (store_id, contact_phone, send_date_local, is_closed_message)
    DO UPDATE
        SET contact_jid = EXCLUDED.contact_jid,
            status = 'reserved',
            message_source = EXCLUDED.message_source,
            message_body = EXCLUDED.message_body,
            inbound_message_id = COALESCE(EXCLUDED.inbound_message_id, public.whatsbot_send_history.inbound_message_id),
            last_error = NULL,
            updated_at = now()
    WHERE public.whatsbot_send_history.status = 'failed'
    RETURNING * INTO v_row;

    IF FOUND THEN
        RETURN QUERY SELECT TRUE, v_row.id, v_row.status;
        RETURN;
    END IF;

    SELECT *
      INTO v_row
      FROM public.whatsbot_send_history
     WHERE store_id = p_store_id
       AND contact_phone = p_contact_phone
       AND send_date_local = p_send_date_local
       AND is_closed_message = p_is_closed_message
     LIMIT 1;

    RETURN QUERY
    SELECT FALSE, v_row.id, v_row.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_whatsbot_daily_send(UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated, service_role;

-- 7. WhatsBot: Sistema de Campanhas de Marketing
CREATE TABLE IF NOT EXISTS public.whatsbot_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, stopped
    total_recipients INTEGER DEFAULT 0,
    sent_successfully INTEGER DEFAULT 0,
    sent_failed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT whatsbot_campaign_status_chk CHECK (status IN ('pending', 'processing', 'completed', 'stopped'))
);

CREATE TABLE IF NOT EXISTS public.whatsbot_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES public.whatsbot_campaigns(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, failed
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_whatsbot_campaigns_store ON public.whatsbot_campaigns (store_id);
CREATE INDEX IF NOT EXISTS idx_whatsbot_campaign_recipients_lookup ON public.whatsbot_campaign_recipients (campaign_id, status);

-- RLS para Campanhas
ALTER TABLE public.whatsbot_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsbot_campaign_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store manages own campaigns" ON public.whatsbot_campaigns;
CREATE POLICY "Store manages own campaigns"
ON public.whatsbot_campaigns
FOR ALL
USING (auth.uid() = store_id)
WITH CHECK (auth.uid() = store_id);

DROP POLICY IF EXISTS "Store manages own campaign recipients" ON public.whatsbot_campaign_recipients;
CREATE POLICY "Store manages own campaign recipients"
ON public.whatsbot_campaign_recipients
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.whatsbot_campaigns
        WHERE id = public.whatsbot_campaign_recipients.campaign_id
        AND store_id = auth.uid()
    )
);

GRANT ALL ON public.whatsbot_campaigns TO authenticated, service_role;
GRANT ALL ON public.whatsbot_campaign_recipients TO authenticated, service_role;

-- RPC para buscar contatos únicos que já falaram com o bot
DROP FUNCTION IF EXISTS public.get_whatsbot_available_contacts(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_whatsbot_available_contacts(p_store_id UUID)
RETURNS TABLE (
    phone TEXT,
    last_interaction TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        contact_phone as phone,
        MAX(created_at) as last_interaction
    FROM public.whatsbot_send_history
    WHERE store_id = p_store_id
    GROUP BY contact_phone
    ORDER BY last_interaction DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_whatsbot_available_contacts(UUID) TO authenticated, service_role;

-- RPC para incrementar estatísticas de campanha de forma atômica
CREATE OR REPLACE FUNCTION public.increment_whatsbot_campaign_stats(
    p_campaign_id UUID,
    p_success BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_success THEN
        UPDATE public.whatsbot_campaigns
        SET sent_successfully = sent_successfully + 1,
            updated_at = now()
        WHERE id = p_campaign_id;
    ELSE
        UPDATE public.whatsbot_campaigns
        SET sent_failed = sent_failed + 1,
            updated_at = now()
        WHERE id = p_campaign_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_whatsbot_campaign_stats(UUID, BOOLEAN) TO authenticated, service_role;

-- 9. WhatsBot: Tabela de Contatos Sincronizados
CREATE TABLE IF NOT EXISTS public.whatsbot_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    push_name TEXT,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_contact UNIQUE (store_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_whatsbot_contacts_store ON public.whatsbot_contacts (store_id);
CREATE INDEX IF NOT EXISTS idx_whatsbot_contacts_phone ON public.whatsbot_contacts (phone);

ALTER TABLE public.whatsbot_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store manages own contacts" ON public.whatsbot_contacts;
CREATE POLICY "Store manages own contacts"
ON public.whatsbot_contacts
FOR ALL
USING (auth.uid() = store_id)
WITH CHECK (auth.uid() = store_id);

GRANT ALL ON public.whatsbot_contacts TO authenticated, service_role;

-- Redefinir RPC para buscar contatos disponíveis (Sincronizados + Histórico)
DROP FUNCTION IF EXISTS public.get_whatsbot_available_contacts(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_whatsbot_available_contacts(p_store_id UUID)
RETURNS TABLE (
    phone TEXT,
    name TEXT,
    last_interaction TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH combined_contacts AS (
        -- Contatos que já interagiram via WhatsBot (histórico)
        SELECT 
            contact_phone as c_phone,
            NULL::TEXT as c_name,
            MAX(created_at) as c_last
        FROM public.whatsbot_send_history
        WHERE store_id = p_store_id
        GROUP BY contact_phone

        UNION

        -- Contatos sincronizados via WhatsApp
        SELECT 
            wc.phone as c_phone,
            COALESCE(wc.push_name, wc.name) as c_name,
            wc.updated_at as c_last
        FROM public.whatsbot_contacts wc
        WHERE wc.store_id = p_store_id
    )
    SELECT 
        c_phone,
        string_agg(c_name, ' / ') filter (where c_name is not null) as name,
        MAX(c_last) as last_interaction
    FROM combined_contacts
    GROUP BY c_phone
    ORDER BY last_interaction DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_whatsbot_available_contacts(UUID) TO authenticated, service_role;

-- 10. WhatsBot: Melhorias nas Campanhas (Mídia e Links)
ALTER TABLE public.whatsbot_campaigns ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.whatsbot_campaigns ADD COLUMN IF NOT EXISTS link_url TEXT;

-- ==================================================================
-- WHATSBOT ADVANCED FEATURES (06/04/2026)
-- ==================================================================

-- 1. Tabela de Gatilhos de Palavras-chave (Auto-respostas)
CREATE TABLE IF NOT EXISTS public.whatsbot_triggers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    response TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (store_id, keyword)
);

-- RLS para Gatilhos
ALTER TABLE public.whatsbot_triggers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own triggers" ON public.whatsbot_triggers;
CREATE POLICY "Users can manage own triggers" ON public.whatsbot_triggers FOR ALL USING (auth.uid() = store_id);

-- Permissões de Acesso
GRANT ALL ON public.whatsbot_triggers TO authenticated;
GRANT ALL ON public.whatsbot_triggers TO service_role;
GRANT SELECT ON public.whatsbot_triggers TO anon;

-- 2. Coluna de Agendamento em Campanhas
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsbot_campaigns' AND column_name = 'scheduled_at') THEN
      ALTER TABLE public.whatsbot_campaigns ADD COLUMN scheduled_at TIMESTAMPTZ DEFAULT NULL;
   END IF;
END $$;

-- 3. Modo Assistente de IA no WhatsBot
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsbot_settings' AND column_name = 'ai_enabled') THEN
      ALTER TABLE public.whatsbot_settings ADD COLUMN ai_enabled BOOLEAN DEFAULT FALSE;
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsbot_settings' AND column_name = 'ai_context') THEN
      ALTER TABLE public.whatsbot_settings ADD COLUMN ai_context TEXT DEFAULT 'Você é o assistente virtual da nossa loja. Seu objetivo é ser educado, tirar dúvidas dos clientes e incentivá-los a clicar no link do nosso catálogo digital para fazer o pedido.';
   END IF;
   IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsbot_settings' AND column_name = 'ai_name') THEN
      ALTER TABLE public.whatsbot_settings ADD COLUMN ai_name TEXT DEFAULT 'Assistente';
   END IF;
END $$;


