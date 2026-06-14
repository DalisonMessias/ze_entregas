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

    -- Verificar se o usuário está bloqueado
    IF EXISTS (
        SELECT 1 FROM public.store_blocked_users 
        WHERE store_id = p_store_id 
        AND (
            (block_type = 'phone' AND block_value = regexp_replace(COALESCE(p_customer_phone, ''), '\D', '', 'g'))
            OR (block_type = 'email' AND block_value = (SELECT email FROM auth.users WHERE id = auth.uid()))
        )
    ) THEN
        RAISE EXCEPTION 'Não foi possível processar o pedido no momento.';
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
END $$;


-- ==================================================================
-- ADIÇÃO DO CONTROLE TEMPORÁRIO DE MODO MANUAL (MÃOS JUNTAS UX)
-- ==================================================================
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS manual_override_until TIMESTAMPTZ DEFAULT NULL;
COMMENT ON COLUMN public.user_profiles.manual_override_until IS 'Data e hora limite do modo manual. Após este prazo, o sistema desativa manual_override e retorna ao modo automático.';

-- ==================================================================
-- CORREÇÃO DA AUTOMAÇÃO DE STATUS DA LOJA COM CRUZAMENTO DE MEIA-NOITE E EXPIRAÇÃO TEMPORÁRIA
-- ==================================================================

CREATE OR REPLACE FUNCTION public.update_shop_status_based_on_schedule()
RETURNS void AS $$
DECLARE
    store_record RECORD;
    day_index INT;
    day_of_week_pt TEXT;
    day_of_week_prev_pt TEXT;
    opening_hours_today JSONB;
    opening_hours_prev JSONB;
    time_range JSONB;
    is_currently_open BOOLEAN;
    current_time_local TIME;
    v_now_local TIMESTAMPTZ;
BEGIN
    -- Obter a data/hora atual no fuso local
    v_now_local := NOW() AT TIME ZONE 'America/Sao_Paulo';

    -- Pega o dia da semana como um número (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
    day_index := EXTRACT(DOW FROM v_now_local);
    day_of_week_pt := CASE day_index
        WHEN 0 THEN 'domingo'
        WHEN 1 THEN 'segunda'
        WHEN 2 THEN 'terca'
        WHEN 3 THEN 'quarta'
        WHEN 4 THEN 'quinta'
        WHEN 5 THEN 'sexta'
        WHEN 6 THEN 'sabado'
    END;

    day_of_week_prev_pt := CASE (day_index + 6) % 7
        WHEN 0 THEN 'domingo'
        WHEN 1 THEN 'segunda'
        WHEN 2 THEN 'terca'
        WHEN 3 THEN 'quarta'
        WHEN 4 THEN 'quinta'
        WHEN 5 THEN 'sexta'
        WHEN 6 THEN 'sabado'
    END;

    -- Pega a hora atual no fuso horário da loja
    current_time_local := v_now_local::TIME;

    -- Itera sobre todas as lojas que não estão em modo manual permanentemente
    FOR store_record IN
        SELECT
            id AS store_id,
            opening_hours_structured,
            is_open AS current_status,
            manual_override,
            manual_override_until
        FROM public.user_profiles
        WHERE role = 'store_partner'
    LOOP
        -- Expira o controle manual caso o tempo limite tenha passado
        IF store_record.manual_override = TRUE AND store_record.manual_override_until IS NOT NULL AND NOW() >= store_record.manual_override_until THEN
            UPDATE public.user_profiles
            SET manual_override = FALSE,
                manual_override_until = NULL
            WHERE id = store_record.store_id;

            -- Recarrega variáveis locais para prosseguir com o fluxo automático
            store_record.manual_override := FALSE;
            store_record.manual_override_until := NULL;
        END IF;

        -- Ignora as lojas que estão sob controle manual ativo sem limite de expiração
        IF store_record.manual_override = TRUE THEN
            CONTINUE;
        END IF;

        is_currently_open := FALSE;

        -- 1. Verificar expediente iniciado HOJE
        opening_hours_today := store_record.opening_hours_structured -> day_of_week_pt;
        IF opening_hours_today IS NOT NULL AND (opening_hours_today ->> 'enabled')::BOOLEAN = TRUE AND jsonb_typeof(opening_hours_today -> 'times') = 'array' AND jsonb_array_length(opening_hours_today -> 'times') > 0 THEN
            FOR time_range IN SELECT * FROM jsonb_array_elements(opening_hours_today -> 'times')
            LOOP
                DECLARE
                    v_start TIME := (time_range ->> 'start')::TIME;
                    v_end TIME := (time_range ->> 'end')::TIME;
                BEGIN
                    IF v_start <= v_end THEN
                        -- Horário normal
                        IF current_time_local >= v_start AND current_time_local < v_end THEN
                            is_currently_open := TRUE;
                            EXIT;
                        END IF;
                    ELSE
                        -- Cruza meia-noite (estamos na primeira parte, antes de 00:00)
                        IF current_time_local >= v_start THEN
                            is_currently_open := TRUE;
                            EXIT;
                        END IF;
                    END IF;
                END;
            END LOOP;
        END IF;

        -- 2. Se ainda não estiver aberta, verificar expediente iniciado ONTEM que cruza a meia-noite e ainda está vigente hoje de madrugada
        IF NOT is_currently_open THEN
            opening_hours_prev := store_record.opening_hours_structured -> day_of_week_prev_pt;
            IF opening_hours_prev IS NOT NULL AND (opening_hours_prev ->> 'enabled')::BOOLEAN = TRUE AND jsonb_typeof(opening_hours_prev -> 'times') = 'array' AND jsonb_array_length(opening_hours_prev -> 'times') > 0 THEN
                FOR time_range IN SELECT * FROM jsonb_array_elements(opening_hours_prev -> 'times')
                LOOP
                    DECLARE
                        v_start TIME := (time_range ->> 'start')::TIME;
                        v_end TIME := (time_range ->> 'end')::TIME;
                    BEGIN
                        -- Só nos interessa se cruzar a meia-noite
                        IF v_start > v_end THEN
                            -- Estamos na segunda parte (depois de 00:00, hoje de madrugada)
                            IF current_time_local < v_end THEN
                                is_currently_open := TRUE;
                                EXIT;
                            END IF;
                        END IF;
                    END;
                END LOOP;
            END IF;
        END IF;

        -- Atualiza o status na tabela user_profiles APENAS se ele mudou
        IF store_record.current_status IS DISTINCT FROM is_currently_open THEN
            UPDATE public.user_profiles
            SET is_open = is_currently_open
            WHERE id = store_record.store_id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_shop_status_based_on_schedule() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_shop_status_based_on_schedule() TO service_role;

-- ==========================================
-- TABELA: store_blocked_users (Anti-Spam / Blocklist)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.store_blocked_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    block_type text NOT NULL CHECK (block_type IN ('phone', 'email', 'ip')),
    block_value text NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(store_id, block_type, block_value)
);

-- RLS para store_blocked_users
ALTER TABLE public.store_blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojistas podem ver seus bloqueios" ON public.store_blocked_users;
CREATE POLICY "Lojistas podem ver seus bloqueios" ON public.store_blocked_users
    FOR SELECT USING (auth.uid() = store_id);

DROP POLICY IF EXISTS "Lojistas podem criar bloqueios" ON public.store_blocked_users;
CREATE POLICY "Lojistas podem criar bloqueios" ON public.store_blocked_users
    FOR INSERT WITH CHECK (auth.uid() = store_id);

DROP POLICY IF EXISTS "Lojistas podem deletar bloqueios" ON public.store_blocked_users;
CREATE POLICY "Lojistas podem deletar bloqueios" ON public.store_blocked_users
    FOR DELETE USING (auth.uid() = store_id);

DROP POLICY IF EXISTS "Leitura pública para validação de checkout" ON public.store_blocked_users;
CREATE POLICY "Leitura pública para validação de checkout" ON public.store_blocked_users
    FOR SELECT USING (true);

-- Permissões de tabela
GRANT ALL ON TABLE public.store_blocked_users TO anon, authenticated, service_role;

-- ==================================================================
-- CORREÇÃO DE ASSINATURA: DEBITAR DE DRIVER_WALLETS (ZEBANK)
-- ==================================================================
CREATE OR REPLACE FUNCTION public.subscribe_to_super_store(fee NUMERIC, p_plan_type TEXT DEFAULT 'MENSALIDADE')
RETURNS VOID AS $$
DECLARE
  v_user UUID := auth.uid()::uuid;
BEGIN
  -- Garante que a carteira exista (lazy creation)
  INSERT INTO public.driver_wallets (driver_id, balance_decimal, savings_balance_decimal, updated_at)
  VALUES (v_user, 0, 0, now())
  ON CONFLICT (driver_id) DO NOTHING;

  UPDATE public.user_profiles 
  SET is_super_store = TRUE, 
      super_store_plan_type = p_plan_type,
      super_store_expiration = CASE 
        WHEN p_plan_type = 'MENSALIDADE' THEN now() + interval '30 days' 
        ELSE NULL 
      END,
      updated_at = now() 
  WHERE id = v_user;
  
  -- Debita da carteira (apenas se for MENSALIDADE e houver taxa)
  IF p_plan_type = 'MENSALIDADE' AND fee > 0 THEN
      INSERT INTO public.driver_wallet_transactions(driver_id, amount, description, type, status)
      VALUES (v_user, -ABS(fee), 'Assinatura Super Store (MENSALIDADE)', 'DEBIT', 'COMPLETED');
      
      UPDATE public.driver_wallets
      SET balance_decimal = balance_decimal - ABS(fee),
          updated_at = now()
      WHERE driver_id = v_user;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.subscribe_to_super_store(NUMERIC, TEXT) TO authenticated, service_role;

-- ==================================================================
-- TABELA: system_announcements (Novidades Beta / Changelog)
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.system_announcements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    content text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS para system_announcements
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura pública de anúncios para autenticados" ON public.system_announcements;
CREATE POLICY "Leitura pública de anúncios para autenticados" ON public.system_announcements
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage system_announcements" ON public.system_announcements;
CREATE POLICY "Admins can manage system_announcements" ON public.system_announcements
    FOR ALL USING (public.is_admin());

-- ==================================================================
-- TABELA: user_announcement_reads (Sinalização de Lida do Lojista)
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.user_announcement_reads (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    announcement_id uuid NOT NULL REFERENCES public.system_announcements(id) ON DELETE CASCADE,
    read_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, announcement_id)
);

-- RLS para user_announcement_reads
ALTER TABLE public.user_announcement_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver suas próprias leituras" ON public.user_announcement_reads;
CREATE POLICY "Usuários podem ver suas próprias leituras" ON public.user_announcement_reads
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem criar suas próprias leituras" ON public.user_announcement_reads;
CREATE POLICY "Usuários podem criar suas próprias leituras" ON public.user_announcement_reads
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all announcement reads" ON public.user_announcement_reads;
CREATE POLICY "Admins can manage all announcement reads" ON public.user_announcement_reads
    FOR ALL USING (public.is_admin());

-- Permissões de tabela
GRANT ALL ON TABLE public.system_announcements TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.user_announcement_reads TO anon, authenticated, service_role;


-- ==================================================================
-- SISTEMA DE DESCANSO PARA ENTREGADORES (12/06/2026)
-- ==================================================================

-- 1. Colunas adicionais em public.user_profiles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'delivery_status') THEN
        ALTER TABLE public.user_profiles ADD COLUMN delivery_status TEXT NOT NULL DEFAULT 'available';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'last_break_time') THEN
        ALTER TABLE public.user_profiles ADD COLUMN last_break_time TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Tabela de Configurações de Pausa (Regras administrativas)
CREATE TABLE IF NOT EXISTS public.delivery_break_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_slug TEXT,
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    max_duration_minutes INTEGER NOT NULL DEFAULT 30,
    max_breaks_per_day INTEGER NOT NULL DEFAULT 3,
    min_interval_minutes INTEGER NOT NULL DEFAULT 120,
    allowed_hours_start TIME NOT NULL DEFAULT '00:00:00',
    allowed_hours_end TIME NOT NULL DEFAULT '23:59:59',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(city_slug, store_id)
);

-- RLS para Configurações de Pausa
ALTER TABLE public.delivery_break_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view break settings" ON public.delivery_break_settings;
CREATE POLICY "Public can view break settings" ON public.delivery_break_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage break settings" ON public.delivery_break_settings;
CREATE POLICY "Admins can manage break settings" ON public.delivery_break_settings FOR ALL USING (public.is_admin());

-- 3. Tabela de Histórico de Descansos
CREATE TABLE IF NOT EXISTS public.delivery_breaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_time TIMESTAMPTZ,
    expected_return TIMESTAMPTZ NOT NULL,
    reason TEXT,
    is_auto_returned BOOLEAN DEFAULT FALSE,
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para Histórico de Descansos
ALTER TABLE public.delivery_breaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Partners can manage own breaks" ON public.delivery_breaks;
CREATE POLICY "Partners can manage own breaks" ON public.delivery_breaks FOR ALL USING (auth.uid() = partner_id);
DROP POLICY IF EXISTS "Stores can read their partner breaks" ON public.delivery_breaks;
CREATE POLICY "Stores can read their partner breaks" ON public.delivery_breaks FOR SELECT USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins can manage all breaks" ON public.delivery_breaks;
CREATE POLICY "Admins can manage all breaks" ON public.delivery_breaks FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_delivery_breaks_partner ON public.delivery_breaks(partner_id, start_time DESC);

-- Grants
GRANT ALL ON TABLE public.delivery_break_settings TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.delivery_breaks TO anon, authenticated, service_role;

-- 4. RPC: Iniciar Descanso
CREATE OR REPLACE FUNCTION public.start_delivery_break(
    p_reason TEXT,
    p_store_id UUID DEFAULT NULL,
    p_lat DOUBLE PRECISION DEFAULT NULL,
    p_lng DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner_id UUID := auth.uid();
    v_shift RECORD;
    v_settings RECORD;
    v_city_slug TEXT;
    v_active_deliveries INTEGER;
    v_breaks_today INTEGER;
    v_last_break_end TIMESTAMPTZ;
    v_max_duration INTEGER;
    v_expected_return TIMESTAMPTZ;
    v_new_break_id UUID;
    v_current_time TIME := current_time;
BEGIN
    -- Obter cidade do parceiro
    SELECT city_slug INTO v_city_slug FROM public.user_profiles WHERE id = v_partner_id;

    -- Obter configurações aplicáveis (específicas por loja, depois cidade, ou globais)
    SELECT * INTO v_settings 
    FROM public.delivery_break_settings
    WHERE (store_id = p_store_id OR (store_id IS NULL AND city_slug = v_city_slug) OR (store_id IS NULL AND city_slug IS NULL))
    ORDER BY store_id NULLS LAST, city_slug NULLS LAST
    LIMIT 1;

    -- Fallback de configurações globais se não houver registro
    IF v_settings.id IS NULL THEN
        v_max_duration := 30;
    ELSE
        v_max_duration := v_settings.max_duration_minutes;
        
        -- Validar horários permitidos
        IF v_current_time < v_settings.allowed_hours_start OR v_current_time > v_settings.allowed_hours_end THEN
            RETURN jsonb_build_object('success', false, 'message', 'Não é permitido iniciar pausas de descanso neste horário.');
        END IF;
    END IF;

    -- 1. Validar se tem turno ativo
    SELECT * INTO v_shift FROM public.work_shifts WHERE partner_id = v_partner_id AND status = 'ACTIVE' LIMIT 1;
    IF v_shift.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Você precisa estar com o turno de trabalho iniciado para pausar.');
    END IF;

    -- 2. Validar se tem entregas em andamento
    SELECT COUNT(*) INTO v_active_deliveries
    FROM public.partner_requests
    WHERE partner_id = v_partner_id 
      AND status IN ('ACCEPTED', 'PICKUP', 'IN_TRANSIT');

    IF v_active_deliveries > 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Não é permitido entrar em descanso enquanto houver entregas ativas ou pendentes de coleta.');
    END IF;

    -- 3. Validar limite de pausas diárias
    SELECT COUNT(*) INTO v_breaks_today
    FROM public.delivery_breaks
    WHERE partner_id = v_partner_id
      AND start_time::date = current_date;

    IF v_settings.id IS NOT NULL AND v_breaks_today >= v_settings.max_breaks_per_day THEN
        RETURN jsonb_build_object('success', false, 'message', 'Limite máximo de pausas diárias atingido (' || v_settings.max_breaks_per_day || ').');
    END IF;

    -- 4. Validar intervalo mínimo
    SELECT MAX(end_time) INTO v_last_break_end
    FROM public.delivery_breaks
    WHERE partner_id = v_partner_id;

    IF v_settings.id IS NOT NULL AND v_last_break_end IS NOT NULL THEN
        IF v_last_break_end + (v_settings.min_interval_minutes * interval '1 minute') > now() THEN
            RETURN jsonb_build_object('success', false, 'message', 'Intervalo mínimo entre descansos ainda não respeitado. Tente mais tarde.');
        END IF;
    END IF;

    v_expected_return := now() + (v_max_duration * interval '1 minute');

    -- Inserir descanso
    INSERT INTO public.delivery_breaks (
        partner_id,
        start_time,
        expected_return,
        reason,
        store_id,
        lat,
        lng
    ) VALUES (
        v_partner_id,
        now(),
        v_expected_return,
        p_reason,
        p_store_id,
        p_lat,
        p_lng
    ) RETURNING id INTO v_new_break_id;

    -- Atualizar status do entregador
    UPDATE public.user_profiles
    SET delivery_status = 'resting',
        is_available = FALSE
    WHERE id = v_partner_id;

    -- Sincronizar com breaks do work_shift para manter histórico unificado
    UPDATE public.work_shifts
    SET breaks = array_append(breaks, jsonb_build_object('start', now()::text, 'end', null, 'break_id', v_new_break_id::text)),
        status = 'PAUSED',
        updated_at = now()
    WHERE id = v_shift.id;

    -- Notificar admins/loja
    INSERT INTO public.user_notifications (user_id, title, message, type)
    SELECT id, 'Entregador em Descanso', (SELECT name FROM public.user_profiles WHERE id = v_partner_id) || ' iniciou pausa de descanso de ' || v_max_duration || ' min.', 'info'
    FROM public.user_profiles
    WHERE role = 'admin' OR id = p_store_id;

    RETURN jsonb_build_object(
        'success', true,
        'break_id', v_new_break_id,
        'start_time', now(),
        'expected_return', v_expected_return,
        'max_duration_minutes', v_max_duration
    );
END;
$$;

-- 5. RPC: Finalizar Descanso
CREATE OR REPLACE FUNCTION public.end_delivery_break(
    p_manual_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner_id UUID := auth.uid();
    v_active_break RECORD;
    v_shift RECORD;
    v_updated_breaks JSONB[];
    v_elem JSONB;
BEGIN
    -- Obter pausa ativa
    SELECT * INTO v_active_break 
    FROM public.delivery_breaks
    WHERE partner_id = v_partner_id AND end_time IS NULL
    LIMIT 1;

    IF v_active_break.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Nenhum descanso ativo encontrado para finalizar.');
    END IF;

    -- Atualizar pausa
    UPDATE public.delivery_breaks
    SET end_time = now(),
        is_auto_returned = (p_manual_reason IS NULL),
        reason = COALESCE(reason, '') || CASE WHEN p_manual_reason IS NOT NULL THEN ' [Manual: ' || p_manual_reason || ']' ELSE '' END
    WHERE id = v_active_break.id;

    -- Atualizar perfil
    UPDATE public.user_profiles
    SET delivery_status = 'available',
        is_available = TRUE,
        last_break_time = now()
    WHERE id = v_partner_id;

    -- Atualizar breaks do turno
    SELECT * INTO v_shift FROM public.work_shifts WHERE partner_id = v_partner_id AND status = 'PAUSED' LIMIT 1;
    IF v_shift.id IS NOT NULL THEN
        v_updated_breaks := ARRAY[]::JSONB[];
        FOREACH v_elem IN ARRAY v_shift.breaks LOOP
            IF v_elem->>'break_id' = v_active_break.id::text THEN
                v_elem := jsonb_set(v_elem, '{end}', to_jsonb(now()::text));
            END IF;
            v_updated_breaks := array_append(v_updated_breaks, v_elem);
        END LOOP;

        UPDATE public.work_shifts
        SET breaks = v_updated_breaks,
            status = 'ACTIVE',
            updated_at = now()
        WHERE id = v_shift.id;
    END IF;

    -- Notificar
    INSERT INTO public.user_notifications (user_id, title, message, type)
    SELECT id, 'Entregador de Volta', (SELECT name FROM public.user_profiles WHERE id = v_partner_id) || ' retornou do descanso.', 'success'
    FROM public.user_profiles
    WHERE role = 'admin' OR id = v_active_break.store_id;

    RETURN jsonb_build_object(
        'success', true,
        'end_time', now(),
        'duration_seconds', extract(epoch from (now() - v_active_break.start_time))
    );
END;
$$;

-- 6. RPC: Obter status do descanso ativo
CREATE OR REPLACE FUNCTION public.get_active_delivery_break()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner_id UUID := auth.uid();
    v_break RECORD;
    v_settings RECORD;
    v_city_slug TEXT;
    v_breaks_today INTEGER;
    v_max_breaks INTEGER := 3;
BEGIN
    SELECT * INTO v_break 
    FROM public.delivery_breaks
    WHERE partner_id = v_partner_id AND end_time IS NULL
    LIMIT 1;

    SELECT city_slug INTO v_city_slug FROM public.user_profiles WHERE id = v_partner_id;

    SELECT * INTO v_settings 
    FROM public.delivery_break_settings
    WHERE (store_id = v_break.store_id OR (store_id IS NULL AND city_slug = v_city_slug) OR (store_id IS NULL AND city_slug IS NULL))
    ORDER BY store_id NULLS LAST, city_slug NULLS LAST
    LIMIT 1;

    IF v_settings.id IS NOT NULL THEN
        v_max_breaks := v_settings.max_breaks_per_day;
    END IF;

    SELECT COUNT(*) INTO v_breaks_today
    FROM public.delivery_breaks
    WHERE partner_id = v_partner_id
      AND start_time::date = current_date;

    IF v_break.id IS NULL THEN
        RETURN jsonb_build_object(
            'active', false,
            'breaks_left', GREATEST(0, v_max_breaks - v_breaks_today),
            'max_breaks', v_max_breaks
        );
    END IF;

    RETURN jsonb_build_object(
        'active', true,
        'break_id', v_break.id,
        'start_time', v_break.start_time,
        'expected_return', v_break.expected_return,
        'seconds_remaining', GREATEST(0, extract(epoch from (v_break.expected_return - now()))),
        'reason', v_break.reason,
        'breaks_left', GREATEST(0, v_max_breaks - v_breaks_today),
        'max_breaks', v_max_breaks
    );
END;
$$;

-- 7. RPC: Verificar e auto-retornar pausas expiradas
CREATE OR REPLACE FUNCTION public.auto_check_expired_breaks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_record RECORD;
BEGIN
    -- Seleciona pausas onde já passou o tempo previsto de retorno e ainda não terminou
    FOR v_record IN 
        SELECT id FROM public.delivery_breaks
        WHERE end_time IS NULL AND expected_return <= now()
    LOOP
        -- Usar end_delivery_break simulando retorno automático
        -- Executa como o partner correspondente
        UPDATE public.delivery_breaks
        SET end_time = now(),
            is_auto_returned = TRUE
        WHERE id = v_record.id;
        
        -- Atualizar perfil do entregador associado a esta pausa
        UPDATE public.user_profiles
        SET delivery_status = 'available',
            is_available = TRUE,
            last_break_time = now()
        WHERE id = (SELECT partner_id FROM public.delivery_breaks WHERE id = v_record.id);

        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

-- 8. RPC: Estatísticas de descansos (Relatório Admin)
CREATE OR REPLACE FUNCTION public.get_delivery_break_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_breaks INTEGER;
    v_total_duration_minutes NUMERIC;
    v_avg_duration_minutes NUMERIC;
    v_ranking JSONB;
BEGIN
    SELECT COUNT(*), COALESCE(SUM(extract(epoch from (end_time - start_time))/60), 0)
    INTO v_total_breaks, v_total_duration_minutes
    FROM public.delivery_breaks
    WHERE end_time IS NOT NULL;

    IF v_total_breaks > 0 THEN
        v_avg_duration_minutes := (v_total_duration_minutes / v_total_breaks)::NUMERIC(10,2);
    ELSE
        v_avg_duration_minutes := 0;
    END IF;

    -- Top 5 entregadores com mais tempo em descanso
    SELECT jsonb_agg(t) INTO v_ranking FROM (
        SELECT 
            up.name,
            COUNT(db.id) as break_count,
            ROUND(SUM(extract(epoch from (db.end_time - db.start_time))/60)::numeric, 1) as total_minutes
        FROM public.delivery_breaks db
        JOIN public.user_profiles up ON up.id = db.partner_id
        WHERE db.end_time IS NOT NULL
        GROUP BY up.name
        ORDER BY total_minutes DESC
        LIMIT 5
    ) t;

    RETURN jsonb_build_object(
        'total_breaks', v_total_breaks,
        'total_duration_minutes', ROUND(v_total_duration_minutes, 1),
        'avg_duration_minutes', v_avg_duration_minutes,
        'ranking', COALESCE(v_ranking, '[]'::jsonb)
    );
END;
$$;

-- Permitir que autenticados executem as RPCs
GRANT EXECUTE ON FUNCTION public.start_delivery_break(TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_delivery_break(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_delivery_break() TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_check_expired_breaks() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_delivery_break_stats() TO authenticated, service_role;

-- ==================================================================
-- ENTREGADOR FIXO (FIXED DRIVER ASSIGNMENTS)
-- ==================================================================

-- 1. delivery_fixed_assignments
CREATE TABLE IF NOT EXISTS public.delivery_fixed_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL,
    store_id UUID NOT NULL,
    assignment_type TEXT NOT NULL CHECK (assignment_type IN ('EXCLUSIVE', 'PRIORITY', 'SHARED')),
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'REMOVED')),
    priority_level INTEGER DEFAULT 1,
    max_simultaneous_deliveries INTEGER DEFAULT 3,
    custom_delivery_fee NUMERIC(10, 2),
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID,
    CONSTRAINT unique_driver_store_assignment UNIQUE (driver_id, store_id)
);

-- Trigger for updated_at on delivery_fixed_assignments
DROP TRIGGER IF EXISTS trigger_delivery_fixed_assignments_updated_at ON public.delivery_fixed_assignments;
CREATE TRIGGER trigger_delivery_fixed_assignments_updated_at
BEFORE UPDATE ON public.delivery_fixed_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.delivery_fixed_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view delivery_fixed_assignments" ON public.delivery_fixed_assignments;
CREATE POLICY "Public can view delivery_fixed_assignments" ON public.delivery_fixed_assignments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage delivery_fixed_assignments" ON public.delivery_fixed_assignments;
CREATE POLICY "Admins can manage delivery_fixed_assignments" ON public.delivery_fixed_assignments FOR ALL USING (true);


-- 2. delivery_fixed_schedules
CREATE TABLE IF NOT EXISTS public.delivery_fixed_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.delivery_fixed_assignments(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_holiday BOOLEAN DEFAULT FALSE,
    is_special_shift BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_delivery_fixed_schedules_updated_at ON public.delivery_fixed_schedules;
CREATE TRIGGER trigger_delivery_fixed_schedules_updated_at
BEFORE UPDATE ON public.delivery_fixed_schedules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.delivery_fixed_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view delivery_fixed_schedules" ON public.delivery_fixed_schedules;
CREATE POLICY "Public can view delivery_fixed_schedules" ON public.delivery_fixed_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage delivery_fixed_schedules" ON public.delivery_fixed_schedules;
CREATE POLICY "Admins can manage delivery_fixed_schedules" ON public.delivery_fixed_schedules FOR ALL USING (true);


-- 3. delivery_fixed_logs
CREATE TABLE IF NOT EXISTS public.delivery_fixed_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.delivery_fixed_assignments(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.delivery_fixed_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view delivery_fixed_logs" ON public.delivery_fixed_logs;
CREATE POLICY "Public can view delivery_fixed_logs" ON public.delivery_fixed_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert delivery_fixed_logs" ON public.delivery_fixed_logs;
CREATE POLICY "Admins can insert delivery_fixed_logs" ON public.delivery_fixed_logs FOR INSERT WITH CHECK (true);


-- 4. delivery_fixed_priorities
CREATE TABLE IF NOT EXISTS public.delivery_fixed_priorities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.delivery_fixed_assignments(id) ON DELETE CASCADE,
    store_id UUID NOT NULL,
    priority_score INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_priority_assignment_store UNIQUE (assignment_id, store_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_delivery_fixed_priorities_updated_at ON public.delivery_fixed_priorities;
CREATE TRIGGER trigger_delivery_fixed_priorities_updated_at
BEFORE UPDATE ON public.delivery_fixed_priorities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.delivery_fixed_priorities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view delivery_fixed_priorities" ON public.delivery_fixed_priorities;
CREATE POLICY "Public can view delivery_fixed_priorities" ON public.delivery_fixed_priorities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage delivery_fixed_priorities" ON public.delivery_fixed_priorities;
CREATE POLICY "Admins can manage delivery_fixed_priorities" ON public.delivery_fixed_priorities FOR ALL USING (true);


-- 5. delivery_fixed_bonuses
CREATE TABLE IF NOT EXISTS public.delivery_fixed_bonuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.delivery_fixed_assignments(id) ON DELETE CASCADE,
    bonus_type TEXT NOT NULL CHECK (bonus_type IN ('FIXED_FEE', 'PER_KM', 'PRODUCTIVITY', 'PEAK_HOUR', 'RAIN', 'WEEKEND', 'GOALS')),
    amount NUMERIC(10, 2) NOT NULL,
    conditions JSONB,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_delivery_fixed_bonuses_updated_at ON public.delivery_fixed_bonuses;
CREATE TRIGGER trigger_delivery_fixed_bonuses_updated_at
BEFORE UPDATE ON public.delivery_fixed_bonuses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.delivery_fixed_bonuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view delivery_fixed_bonuses" ON public.delivery_fixed_bonuses;
CREATE POLICY "Public can view delivery_fixed_bonuses" ON public.delivery_fixed_bonuses FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage delivery_fixed_bonuses" ON public.delivery_fixed_bonuses;
CREATE POLICY "Admins can manage delivery_fixed_bonuses" ON public.delivery_fixed_bonuses FOR ALL USING (true);


-- 6. delivery_fixed_statistics
CREATE TABLE IF NOT EXISTS public.delivery_fixed_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES public.delivery_fixed_assignments(id) ON DELETE CASCADE UNIQUE,
    total_deliveries INTEGER DEFAULT 0,
    total_earnings NUMERIC(15, 2) DEFAULT 0.00,
    acceptance_rate NUMERIC(5, 2) DEFAULT 0.00,
    cancellation_rate NUMERIC(5, 2) DEFAULT 0.00,
    average_pickup_time INTEGER DEFAULT 0, -- em segundos
    average_delivery_time INTEGER DEFAULT 0, -- em segundos
    hours_worked NUMERIC(10, 2) DEFAULT 0.00,
    last_activity TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_delivery_fixed_statistics_updated_at ON public.delivery_fixed_statistics;
CREATE TRIGGER trigger_delivery_fixed_statistics_updated_at
BEFORE UPDATE ON public.delivery_fixed_statistics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.delivery_fixed_statistics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view delivery_fixed_statistics" ON public.delivery_fixed_statistics;
CREATE POLICY "Public can view delivery_fixed_statistics" ON public.delivery_fixed_statistics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage delivery_fixed_statistics" ON public.delivery_fixed_statistics;
CREATE POLICY "Admins can manage delivery_fixed_statistics" ON public.delivery_fixed_statistics FOR ALL USING (true);


-- 7. delivery_fixed_history
CREATE TABLE IF NOT EXISTS public.delivery_fixed_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL,
    store_id UUID NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.delivery_fixed_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view delivery_fixed_history" ON public.delivery_fixed_history;
CREATE POLICY "Public can view delivery_fixed_history" ON public.delivery_fixed_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can insert delivery_fixed_history" ON public.delivery_fixed_history;
CREATE POLICY "Admins can insert delivery_fixed_history" ON public.delivery_fixed_history FOR INSERT WITH CHECK (true);


-- ==================================================================
-- ADIÇÕES ADITIVAS: ENTREGADOR FIXO (RPCs, TRIGGERS E TABELAS DE SOLICITAÇÃO)
-- ==================================================================

-- 1. Nova Tabela: delivery_fixed_requests
CREATE TABLE IF NOT EXISTS public.delivery_fixed_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL CHECK (request_type IN ('VINCULO', 'SUBSTITUICAO')),
    assignment_type TEXT CHECK (assignment_type IN ('EXCLUSIVE', 'PRIORITY', 'SHARED')),
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para updated_at em delivery_fixed_requests
DROP TRIGGER IF EXISTS trigger_delivery_fixed_requests_updated_at ON public.delivery_fixed_requests;
CREATE TRIGGER trigger_delivery_fixed_requests_updated_at
BEFORE UPDATE ON public.delivery_fixed_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS e criar políticas
ALTER TABLE public.delivery_fixed_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojistas gerenciam suas proprias solicitacoes" ON public.delivery_fixed_requests;
CREATE POLICY "Lojistas gerenciam suas proprias solicitacoes" ON public.delivery_fixed_requests
    FOR ALL USING (auth.uid()::text = store_id::text OR public.is_admin());

DROP POLICY IF EXISTS "Entregadores visualizam solicitacoes de vinculo" ON public.delivery_fixed_requests;
CREATE POLICY "Entregadores visualizam solicitacoes de vinculo" ON public.delivery_fixed_requests
    FOR SELECT USING (auth.uid()::text = driver_id::text OR public.is_admin());

GRANT ALL ON public.delivery_fixed_requests TO anon, authenticated, service_role;

-- 2. Coluna rejected_partner_ids em partner_requests
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_requests' AND column_name = 'rejected_partner_ids') THEN
        ALTER TABLE public.partner_requests ADD COLUMN rejected_partner_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
    END IF;
END $$;

-- 3. Correções RLS nas tabelas existentes de delivery_fixed
-- delivery_fixed_assignments
ALTER TABLE public.delivery_fixed_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view delivery_fixed_assignments" ON public.delivery_fixed_assignments;
CREATE POLICY "Public can view delivery_fixed_assignments" ON public.delivery_fixed_assignments 
    FOR SELECT USING (auth.uid()::text = store_id::text OR auth.uid()::text = driver_id::text OR public.is_admin());
DROP POLICY IF EXISTS "Admins can manage delivery_fixed_assignments" ON public.delivery_fixed_assignments;
CREATE POLICY "Admins can manage delivery_fixed_assignments" ON public.delivery_fixed_assignments 
    FOR ALL USING (public.is_admin());

-- delivery_fixed_schedules
ALTER TABLE public.delivery_fixed_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view delivery_fixed_schedules" ON public.delivery_fixed_schedules;
CREATE POLICY "Public can view delivery_fixed_schedules" ON public.delivery_fixed_schedules 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.delivery_fixed_assignments 
            WHERE id = assignment_id 
              AND (store_id::text = auth.uid()::text OR driver_id::text = auth.uid()::text)
        ) 
        OR public.is_admin()
    );
DROP POLICY IF EXISTS "Admins can manage delivery_fixed_schedules" ON public.delivery_fixed_schedules;
CREATE POLICY "Admins can manage delivery_fixed_schedules" ON public.delivery_fixed_schedules 
    FOR ALL USING (public.is_admin());

-- delivery_fixed_bonuses
ALTER TABLE public.delivery_fixed_bonuses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view delivery_fixed_bonuses" ON public.delivery_fixed_bonuses;
CREATE POLICY "Public can view delivery_fixed_bonuses" ON public.delivery_fixed_bonuses 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.delivery_fixed_assignments 
            WHERE id = assignment_id 
              AND (store_id::text = auth.uid()::text OR driver_id::text = auth.uid()::text)
        ) 
        OR public.is_admin()
    );
DROP POLICY IF EXISTS "Admins can manage delivery_fixed_bonuses" ON public.delivery_fixed_bonuses;
CREATE POLICY "Admins can manage delivery_fixed_bonuses" ON public.delivery_fixed_bonuses 
    FOR ALL USING (public.is_admin());

-- delivery_fixed_statistics
ALTER TABLE public.delivery_fixed_statistics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view delivery_fixed_statistics" ON public.delivery_fixed_statistics;
CREATE POLICY "Public can view delivery_fixed_statistics" ON public.delivery_fixed_statistics 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.delivery_fixed_assignments 
            WHERE id = assignment_id 
              AND (store_id::text = auth.uid()::text OR driver_id::text = auth.uid()::text)
        ) 
        OR public.is_admin()
    );
DROP POLICY IF EXISTS "Admins can manage delivery_fixed_statistics" ON public.delivery_fixed_statistics;
CREATE POLICY "Admins can manage delivery_fixed_statistics" ON public.delivery_fixed_statistics 
    FOR ALL USING (public.is_admin());

-- Grants adicionais
GRANT ALL ON TABLE public.delivery_fixed_assignments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.delivery_fixed_schedules TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.delivery_fixed_logs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.delivery_fixed_priorities TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.delivery_fixed_bonuses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.delivery_fixed_statistics TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.delivery_fixed_history TO anon, authenticated, service_role;

-- 4. Função: find_available_fixed_partner
DROP FUNCTION IF EXISTS public.find_available_fixed_partner(UUID, DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC);
CREATE OR REPLACE FUNCTION public.find_available_fixed_partner(
    p_store_id UUID,
    p_delivery_lat DOUBLE PRECISION DEFAULT NULL,
    p_delivery_lng DOUBLE PRECISION DEFAULT NULL,
    p_max_distance_km NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    partner_id UUID,
    distance_km NUMERIC,
    priority_level INTEGER,
    assignment_type TEXT,
    custom_delivery_fee NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_day_of_week INTEGER := extract(dow from now())::INTEGER; -- 0 a 6
    v_current_time TIME := current_time::TIME;
BEGIN
    RETURN QUERY
    SELECT
        dfa.driver_id AS partner_id,
        CASE
            WHEN p_delivery_lat IS NULL OR p_delivery_lng IS NULL OR ul.lat IS NULL OR ul.lng IS NULL THEN NULL::NUMERIC
            ELSE public.distance_km(p_delivery_lat, p_delivery_lng, ul.lat, ul.lng)
        END AS distance_km,
        dfa.priority_level,
        dfa.assignment_type,
        dfa.custom_delivery_fee
    FROM public.delivery_fixed_assignments dfa
    JOIN public.user_profiles up ON up.id = dfa.driver_id
    LEFT JOIN public.user_locations ul
        ON ul.user_id = dfa.driver_id
       AND ul.updated_at > now() - interval '30 minutes'
    WHERE dfa.store_id = p_store_id
      AND dfa.status = 'ACTIVE'
      AND (dfa.start_date IS NULL OR dfa.start_date <= now())
      AND (dfa.end_date IS NULL OR dfa.end_date >= now())
      -- Verificação se o entregador está online e disponível
      AND COALESCE(up.is_available, FALSE) = TRUE
      AND up.delivery_status = 'available'
      AND COALESCE(up.status::TEXT, 'active') = 'active'
      -- Verificação se o turno está ativo
      AND EXISTS (
          SELECT 1 FROM public.work_shifts ws
          WHERE ws.partner_id = dfa.driver_id
            AND ws.status = 'ACTIVE'
      )
      -- Verificação de escala de horário
      AND (
          NOT EXISTS (SELECT 1 FROM public.delivery_fixed_schedules dfs WHERE dfs.assignment_id = dfa.id)
          OR EXISTS (
              SELECT 1 FROM public.delivery_fixed_schedules dfs
              WHERE dfs.assignment_id = dfa.id
                AND dfs.day_of_week = v_day_of_week
                AND dfs.start_time <= v_current_time
                AND dfs.end_time >= v_current_time
          )
      )
      -- Limite de entregas simultâneas
      AND (
          SELECT COUNT(*) FROM public.partner_requests pr
          WHERE pr.partner_id = dfa.driver_id
            AND pr.status IN ('ACCEPTED', 'PICKUP', 'IN_TRANSIT')
      ) < COALESCE(dfa.max_simultaneous_deliveries, 3)
      -- Distância máxima permitida
      AND (
          p_max_distance_km IS NULL
          OR p_delivery_lat IS NULL
          OR p_delivery_lng IS NULL
          OR (
              ul.lat IS NOT NULL
              AND ul.lng IS NOT NULL
              AND public.distance_km(p_delivery_lat, p_delivery_lng, ul.lat, ul.lng) <= p_max_distance_km
          )
      )
    ORDER BY
        -- Tipo EXCLUSIVE primeiro, depois PRIORITY, depois SHARED
        CASE 
            WHEN dfa.assignment_type = 'EXCLUSIVE' THEN 0 
            WHEN dfa.assignment_type = 'PRIORITY' THEN 1 
            ELSE 2 
        END ASC,
        dfa.priority_level DESC,
        distance_km ASC NULLS LAST,
        dfa.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_available_fixed_partner(UUID, DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC) TO authenticated, service_role;

-- 5. Atualização da RPC: create_partner_request
CREATE OR REPLACE FUNCTION public.create_partner_request(
    p_pickup_address TEXT,
    p_delivery_address TEXT,
    p_distance_km NUMERIC,
    p_total_charged_store NUMERIC,
    p_net_value_partner NUMERIC,
    p_fees JSONB,
    p_request_type TEXT,
    p_target_partner_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id UUID := auth.uid()::uuid;
    v_delivery_code TEXT;
    v_new_request_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_preferred_until TIMESTAMPTZ;
    v_is_super_store BOOLEAN := FALSE;
    v_final_total_charged NUMERIC;
    v_final_fee_fixed NUMERIC;
    v_final_fee_percent NUMERIC;
    v_target_partner_id UUID := p_target_partner_id;
    v_preferred_partner_ids UUID[] := ARRAY[]::UUID[];
    v_assignment_strategy TEXT := 'REGIONAL';
    v_fixed_priority_applied BOOLEAN := FALSE;
    v_available_partners INTEGER := 0;
    v_custom_fee NUMERIC;
BEGIN
    v_delivery_code := '#' || LPAD(FLOOR(random() * 10000)::int::text, 4, '0');

    SELECT COALESCE(is_super_store, FALSE)
    INTO v_is_super_store
    FROM public.user_profiles
    WHERE id = v_store_id;

    IF upper(COALESCE(p_request_type, 'PLATFORM')) = 'PLATFORM' THEN
        v_expires_at := now() + interval '5 minutes';

        -- Se não especificou entregador, busca o melhor entregador fixo disponível
        IF v_target_partner_id IS NULL THEN
            SELECT fp.partner_id, fp.custom_delivery_fee
            INTO v_target_partner_id, v_custom_fee
            FROM public.find_available_fixed_partner(v_store_id, NULL, NULL, NULL) fp
            LIMIT 1;

            IF v_target_partner_id IS NOT NULL THEN
                v_assignment_strategy := 'FIXED_FIRST';
                v_fixed_priority_applied := TRUE;
                v_preferred_until := now() + interval '90 seconds';
                v_preferred_partner_ids := ARRAY[v_target_partner_id];
                
                -- Se houver taxa personalizada, aplicar
                IF v_custom_fee IS NOT NULL THEN
                    p_net_value_partner := v_custom_fee;
                END IF;
            END IF;
        ELSE
            v_assignment_strategy := 'DIRECT_FIXED';
            v_fixed_priority_applied := TRUE;
            v_preferred_partner_ids := ARRAY[v_target_partner_id];
            
            -- Busca se tem taxa personalizada
            SELECT custom_delivery_fee INTO v_custom_fee
            FROM public.delivery_fixed_assignments
            WHERE store_id = v_store_id AND driver_id = v_target_partner_id AND status = 'ACTIVE'
            LIMIT 1;
            
            IF v_custom_fee IS NOT NULL THEN
                p_net_value_partner := v_custom_fee;
            END IF;
        END IF;
    ELSE
        v_assignment_strategy := 'DIRECT_FIXED';
        v_fixed_priority_applied := v_target_partner_id IS NOT NULL;
        IF v_target_partner_id IS NOT NULL THEN
            v_preferred_partner_ids := ARRAY[v_target_partner_id];
            
            SELECT custom_delivery_fee INTO v_custom_fee
            FROM public.delivery_fixed_assignments
            WHERE store_id = v_store_id AND driver_id = v_target_partner_id AND status = 'ACTIVE'
            LIMIT 1;
            
            IF v_custom_fee IS NOT NULL THEN
                p_net_value_partner := v_custom_fee;
            END IF;
        END IF;
        v_expires_at := NULL;
    END IF;

    IF upper(COALESCE(p_request_type, 'PLATFORM')) = 'ASSOCIATE' THEN
        v_final_total_charged := p_total_charged_store;
        v_final_fee_fixed := 0;
        v_final_fee_percent := 0;
    ELSIF upper(COALESCE(p_request_type, 'PLATFORM')) = 'PLATFORM' AND v_is_super_store = TRUE THEN
        v_final_total_charged := p_net_value_partner;
        v_final_fee_fixed := 0;
        v_final_fee_percent := 0;
    ELSE
        v_final_total_charged := p_total_charged_store;
        v_final_fee_fixed := COALESCE((p_fees->>'global_tax_fixed')::NUMERIC, 0);
        v_final_fee_percent := COALESCE((p_fees->>'global_tax_percent')::NUMERIC, 0) * p_net_value_partner;
    END IF;

    INSERT INTO public.partner_requests (
        store_id,
        pickup_address,
        delivery_address,
        distance_km,
        total_charged_store,
        net_value_partner,
        fee_fixed,
        fee_percent_value,
        partner_id,
        status,
        delivery_code,
        expires_at,
        request_type,
        assignment_strategy,
        preferred_partner_ids,
        preferred_until,
        fixed_partner_priority_applied,
        assignment_note
    )
    VALUES (
        v_store_id,
        p_pickup_address,
        p_delivery_address,
        p_distance_km,
        v_final_total_charged,
        p_net_value_partner,
        v_final_fee_fixed,
        v_final_fee_percent,
        v_target_partner_id,
        'PENDING'::public.partner_request_status,
        v_delivery_code,
        v_expires_at,
        upper(COALESCE(p_request_type, 'PLATFORM')),
        v_assignment_strategy,
        v_preferred_partner_ids,
        v_preferred_until,
        v_fixed_priority_applied,
        CASE
            WHEN v_assignment_strategy = 'FIXED_FIRST' THEN 'Prioridade para entregador fixo; fallback regional automatico apos 90 segundos.'
            WHEN v_assignment_strategy = 'DIRECT_FIXED' THEN 'Entrega direcionada para entregador fixo.'
            ELSE 'Sem entregador fixo disponivel; distribuicao regional.'
        END
    )
    RETURNING id INTO v_new_request_id;

    SELECT COUNT(*)
    INTO v_available_partners
    FROM public.user_profiles up
    WHERE up.role IN ('delivery_partner', 'delivery_person')
      AND COALESCE(up.is_available, FALSE) = TRUE
      AND COALESCE(up.status::TEXT, 'active') = 'active';

    RETURN jsonb_build_object(
        'requestId', v_new_request_id,
        'deliveryCode', v_delivery_code,
        'expiresAt', v_expires_at,
        'preferredUntil', v_preferred_until,
        'targetPartnerId', v_target_partner_id,
        'assignmentStrategy', v_assignment_strategy,
        'fixedPartnerPriorityApplied', v_fixed_priority_applied,
        'availablePartners', v_available_partners
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_partner_request(TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, JSONB, TEXT, UUID) TO authenticated;

-- 6. RPC: reject_fixed_partner_offer
CREATE OR REPLACE FUNCTION public.reject_fixed_partner_offer(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner_id UUID := auth.uid()::uuid;
    v_request RECORD;
    v_next_partner_id UUID;
    v_custom_fee NUMERIC;
BEGIN
    -- Buscar a corrida
    SELECT * INTO v_request FROM public.partner_requests WHERE id = p_request_id;
    
    IF v_request.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Corrida não encontrada.');
    END IF;
    
    IF v_request.status != 'PENDING' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Esta corrida já foi aceita ou cancelada.');
    END IF;
    
    -- Adicionar o entregador atual à lista de rejeitados
    UPDATE public.partner_requests
    SET rejected_partner_ids = array_append(rejected_partner_ids, v_partner_id)
    WHERE id = p_request_id;
    
    -- Recarregar a lista atualizada de rejeitados
    SELECT * INTO v_request FROM public.partner_requests WHERE id = p_request_id;
    
    -- Buscar o próximo entregador fixo que não tenha rejeitado a corrida ainda
    SELECT fp.partner_id, fp.custom_delivery_fee
    INTO v_next_partner_id, v_custom_fee
    FROM public.find_available_fixed_partner(v_request.store_id, NULL, NULL, NULL) fp
    WHERE NOT (fp.partner_id = ANY(v_request.rejected_partner_ids))
    LIMIT 1;
    
    IF v_next_partner_id IS NOT NULL THEN
        -- Avança para o próximo entregador fixo
        UPDATE public.partner_requests
        SET partner_id = v_next_partner_id,
            preferred_partner_ids = ARRAY[v_next_partner_id],
            preferred_until = now() + interval '90 seconds',
            net_value_partner = COALESCE(v_custom_fee, net_value_partner),
            assignment_note = 'Oferta recusada pelo entregador anterior. Repassado para o proximo entregador fixo.'
        WHERE id = p_request_id;
        
        RETURN jsonb_build_object(
            'success', true, 
            'strategy', 'NEXT_FIXED',
            'partner_id', v_next_partner_id,
            'preferred_until', now() + interval '90 seconds'
        );
    ELSE
        -- Se nenhum outro fixo estiver disponível, libera para regional
        UPDATE public.partner_requests
        SET partner_id = NULL,
            preferred_partner_ids = ARRAY[]::UUID[],
            preferred_until = NULL,
            assignment_strategy = 'REGIONAL',
            assignment_note = 'Todos os entregadores fixos recusaram ou estao indisponiveis. Liberado para distribuicao geral.'
        WHERE id = p_request_id;
        
        RETURN jsonb_build_object(
            'success', true, 
            'strategy', 'REGIONAL',
            'partner_id', NULL
        );
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_fixed_partner_offer(UUID) TO authenticated;

-- 7. RPC: check_fixed_offers_timeouts
CREATE OR REPLACE FUNCTION public.check_fixed_offers_timeouts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
    v_req RECORD;
    v_next_partner_id UUID;
    v_custom_fee NUMERIC;
BEGIN
    -- Seleciona corridas na estratégia FIXED_FIRST cujo tempo de prioridade expirou
    FOR v_req IN
        SELECT id, store_id, partner_id, rejected_partner_ids, net_value_partner
        FROM public.partner_requests
        WHERE status = 'PENDING'
          AND assignment_strategy = 'FIXED_FIRST'
          AND preferred_until IS NOT NULL
          AND preferred_until <= now()
    LOOP
        -- Consideramos o entregador anterior como rejeitado por timeout
        UPDATE public.partner_requests
        SET rejected_partner_ids = array_append(rejected_partner_ids, v_req.partner_id)
        WHERE id = v_req.id;
        
        -- Buscar o próximo entregador fixo disponível que não rejeitou
        SELECT fp.partner_id, fp.custom_delivery_fee
        INTO v_next_partner_id, v_custom_fee
        FROM public.find_available_fixed_partner(v_req.store_id, NULL, NULL, NULL) fp
        WHERE NOT (fp.partner_id = ANY(array_append(v_req.rejected_partner_ids, v_req.partner_id)))
        LIMIT 1;
        
        IF v_next_partner_id IS NOT NULL THEN
            UPDATE public.partner_requests
            SET partner_id = v_next_partner_id,
                preferred_partner_ids = ARRAY[v_next_partner_id],
                preferred_until = now() + interval '90 seconds',
                net_value_partner = COALESCE(v_custom_fee, v_req.net_value_partner),
                assignment_note = 'Tempo esgotado para o entregador anterior. Repassado para o proximo entregador fixo.'
            WHERE id = v_req.id;
        ELSE
            -- Libera para regional
            UPDATE public.partner_requests
            SET partner_id = NULL,
                preferred_partner_ids = ARRAY[]::UUID[],
                preferred_until = NULL,
                assignment_strategy = 'REGIONAL',
                assignment_note = 'Tempo esgotado para os entregadores fixos. Liberado para distribuicao geral.'
            WHERE id = v_req.id;
        END IF;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_fixed_offers_timeouts() TO authenticated, service_role;

-- 8. Trigger e Função de Estatísticas e Bônus Customizados
CREATE OR REPLACE FUNCTION public.update_delivery_fixed_statistics()
RETURNS TRIGGER AS $$
DECLARE
    v_assignment_id UUID;
    v_bonus_amount NUMERIC := 0;
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' AND NEW.partner_id IS NOT NULL THEN
        -- Buscar o vínculo correspondente
        SELECT id INTO v_assignment_id
        FROM public.delivery_fixed_assignments
        WHERE store_id = NEW.store_id AND driver_id = NEW.partner_id AND status = 'ACTIVE'
        LIMIT 1;
        
        IF v_assignment_id IS NOT NULL THEN
            -- Garantir que exista estatística
            INSERT INTO public.delivery_fixed_statistics (assignment_id)
            VALUES (v_assignment_id)
            ON CONFLICT (assignment_id) DO NOTHING;
            
            -- Verificar se o entregador fixo tem bônus ativos
            SELECT COALESCE(SUM(amount), 0) INTO v_bonus_amount
            FROM public.delivery_fixed_bonuses
            WHERE assignment_id = v_assignment_id AND status = 'ACTIVE';
            
            -- Atualizar estatísticas
            UPDATE public.delivery_fixed_statistics
            SET total_deliveries = total_deliveries + 1,
                total_earnings = total_earnings + NEW.net_value_partner + v_bonus_amount,
                last_activity = now(),
                updated_at = now()
            WHERE assignment_id = v_assignment_id;
            
            -- Se houver bônus ativo, creditamos o bônus na carteira do entregador no ZeBank (driver_wallets)
            IF v_bonus_amount > 0 THEN
                -- Garantir que a carteira do motorista exista
                INSERT INTO public.driver_wallets (driver_id, balance_decimal, savings_balance_decimal, updated_at)
                VALUES (NEW.partner_id, 0, 0, now())
                ON CONFLICT (driver_id) DO NOTHING;
                
                UPDATE public.driver_wallets
                SET balance_decimal = balance_decimal + v_bonus_amount,
                    updated_at = now()
                WHERE driver_id = NEW.partner_id;
                
                INSERT INTO public.driver_wallet_transactions (driver_id, amount, description, type, status)
                VALUES (NEW.partner_id, v_bonus_amount, 'Bônus de Entregador Fixo: Corrida #' || SUBSTRING(NEW.id::text, 1, 8), 'CREDIT', 'COMPLETED');
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_delivery_fixed_statistics ON public.partner_requests;
CREATE TRIGGER tr_update_delivery_fixed_statistics
AFTER UPDATE ON public.partner_requests
FOR EACH ROW EXECUTE FUNCTION public.update_delivery_fixed_statistics();

-- Adicionando chaves estrangeiras que faltavam em delivery_fixed_assignments para user_profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_delivery_fixed_assignments_driver'
    ) THEN
        ALTER TABLE public.delivery_fixed_assignments 
            ADD CONSTRAINT fk_delivery_fixed_assignments_driver 
            FOREIGN KEY (driver_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_delivery_fixed_assignments_store'
    ) THEN
        ALTER TABLE public.delivery_fixed_assignments 
            ADD CONSTRAINT fk_delivery_fixed_assignments_store 
            FOREIGN KEY (store_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;


-- ==================================================================
-- RPC PARA CONSOLIDAR CONSULTAS DO CARDÁPIO DIGITAL (14/06/2026)
-- ==================================================================
CREATE OR REPLACE FUNCTION public.get_public_store_menu_data(p_store_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_products JSONB;
    v_categories JSONB;
    v_promotions JSONB;
    v_promotion_products JSONB;
    v_delivery_settings JSONB;
    v_neighborhood_fees JSONB;
    v_shipping_rules JSONB;
    v_loyalty_settings JSONB;
    v_payment_gateways JSONB;
BEGIN
    -- 1. Buscar produtos ativos
    SELECT COALESCE(jsonb_agg(p), '[]'::jsonb) INTO v_products
    FROM (
        SELECT * FROM public.products 
        WHERE store_id = p_store_id AND is_active = true 
        ORDER BY name
    ) p;

    -- 2. Buscar categorias da loja
    SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) INTO v_categories
    FROM (
        SELECT id, name FROM public.categories 
        WHERE store_id = p_store_id
    ) c;

    -- 3. Buscar promoções ativas da loja
    SELECT COALESCE(jsonb_agg(pr), '[]'::jsonb) INTO v_promotions
    FROM (
        SELECT * FROM public.store_promotions 
        WHERE store_id = p_store_id AND is_active = true
    ) pr;

    -- 4. Buscar mapeamento de produtos em promoção
    SELECT COALESCE(jsonb_agg(pp), '[]'::jsonb) INTO v_promotion_products
    FROM (
        SELECT * FROM public.promotion_products 
        WHERE promotion_id IN (
            SELECT id FROM public.store_promotions 
            WHERE store_id = p_store_id AND is_active = true
        )
    ) pp;

    -- 5. Buscar configurações de entrega
    SELECT to_jsonb(ds) INTO v_delivery_settings
    FROM public.store_delivery_settings ds
    WHERE store_id = p_store_id;

    -- 6. Buscar taxas por bairro
    SELECT COALESCE(jsonb_agg(nf), '[]'::jsonb) INTO v_neighborhood_fees
    FROM (
        SELECT * FROM public.store_neighborhood_fees 
        WHERE store_id = p_store_id
    ) nf;

    -- 7. Buscar regras de frete
    SELECT COALESCE(jsonb_agg(sr), '[]'::jsonb) INTO v_shipping_rules
    FROM (
        SELECT * FROM public.store_shipping_rules 
        WHERE store_id = p_store_id
    ) sr;

    -- 8. Buscar programa de fidelidade
    SELECT to_jsonb(ls) INTO v_loyalty_settings
    FROM public.loyalty_settings ls
    WHERE store_id = p_store_id;

    -- 9. Buscar gateways ativos
    SELECT COALESCE(jsonb_agg(pg), '[]'::jsonb) INTO v_payment_gateways
    FROM (
        SELECT * FROM public.payment_gateway_settings
        ORDER BY created_at ASC
    ) pg;

    -- Retornar tudo em um único objeto JSONB consolidado
    RETURN jsonb_build_object(
        'products', v_products,
        'categories', v_categories,
        'promotions', v_promotions,
        'promotion_products', v_promotion_products,
        'delivery_settings', v_delivery_settings,
        'neighborhood_fees', v_neighborhood_fees,
        'shipping_rules', v_shipping_rules,
        'loyalty_settings', v_loyalty_settings,
        'payment_gateways', v_payment_gateways
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_store_menu_data(UUID) TO anon, authenticated, service_role;

