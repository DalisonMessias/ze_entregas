-- Fixed delivery partners ("Entregador Fixo")
-- Adds priority assignment, fallback, management history, and availability-aware RPCs.

CREATE TABLE IF NOT EXISTS public.store_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, partner_id)
);

ALTER TABLE public.store_partners ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.store_partners TO authenticated;
GRANT ALL ON public.store_partners TO service_role;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_partners' AND column_name = 'status') THEN
        ALTER TABLE public.store_partners ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_partners' AND column_name = 'fixed_priority') THEN
        ALTER TABLE public.store_partners ADD COLUMN fixed_priority BOOLEAN NOT NULL DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_partners' AND column_name = 'priority_order') THEN
        ALTER TABLE public.store_partners ADD COLUMN priority_order INTEGER NOT NULL DEFAULT 100;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_partners' AND column_name = 'max_distance_km') THEN
        ALTER TABLE public.store_partners ADD COLUMN max_distance_km NUMERIC(8, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_partners' AND column_name = 'notes') THEN
        ALTER TABLE public.store_partners ADD COLUMN notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_partners' AND column_name = 'created_by') THEN
        ALTER TABLE public.store_partners ADD COLUMN created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_partners' AND column_name = 'updated_at') THEN
        ALTER TABLE public.store_partners ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_store_partners_store_fixed ON public.store_partners(store_id, fixed_priority, status);
CREATE INDEX IF NOT EXISTS idx_store_partners_partner_fixed ON public.store_partners(partner_id, fixed_priority, status);

DROP POLICY IF EXISTS "Store owners manage their partners" ON public.store_partners;
CREATE POLICY "Store owners manage their partners" ON public.store_partners
    FOR ALL USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Partners can view store links" ON public.store_partners;
CREATE POLICY "Partners can view store links" ON public.store_partners
    FOR SELECT USING (auth.uid()::text = partner_id::text);

DROP POLICY IF EXISTS "Admins manage store partners" ON public.store_partners;
CREATE POLICY "Admins manage store partners" ON public.store_partners
    FOR ALL USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.store_fixed_partner_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    association_id UUID,
    action TEXT NOT NULL,
    changed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    old_values JSONB,
    new_values JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_fixed_partner_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.store_fixed_partner_history TO authenticated;
GRANT ALL ON public.store_fixed_partner_history TO service_role;

DROP POLICY IF EXISTS "Store owners read fixed partner history" ON public.store_fixed_partner_history;
CREATE POLICY "Store owners read fixed partner history" ON public.store_fixed_partner_history
    FOR SELECT USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Partners read own fixed partner history" ON public.store_fixed_partner_history;
CREATE POLICY "Partners read own fixed partner history" ON public.store_fixed_partner_history
    FOR SELECT USING (auth.uid()::text = partner_id::text);

DROP POLICY IF EXISTS "Admins manage fixed partner history" ON public.store_fixed_partner_history;
CREATE POLICY "Admins manage fixed partner history" ON public.store_fixed_partner_history
    FOR ALL USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_fixed_partner_history_store ON public.store_fixed_partner_history(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fixed_partner_history_partner ON public.store_fixed_partner_history(partner_id, created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_requests' AND column_name = 'request_type') THEN
        ALTER TABLE public.partner_requests ADD COLUMN request_type TEXT NOT NULL DEFAULT 'PLATFORM';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_requests' AND column_name = 'assignment_strategy') THEN
        ALTER TABLE public.partner_requests ADD COLUMN assignment_strategy TEXT NOT NULL DEFAULT 'REGIONAL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_requests' AND column_name = 'preferred_partner_ids') THEN
        ALTER TABLE public.partner_requests ADD COLUMN preferred_partner_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_requests' AND column_name = 'preferred_until') THEN
        ALTER TABLE public.partner_requests ADD COLUMN preferred_until TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_requests' AND column_name = 'fixed_partner_priority_applied') THEN
        ALTER TABLE public.partner_requests ADD COLUMN fixed_partner_priority_applied BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_requests' AND column_name = 'assignment_note') THEN
        ALTER TABLE public.partner_requests ADD COLUMN assignment_note TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_requests_assignment ON public.partner_requests(status, assignment_strategy, preferred_until);
CREATE INDEX IF NOT EXISTS idx_partner_requests_preferred_partners ON public.partner_requests USING GIN(preferred_partner_ids);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'assignment_strategy') THEN
        ALTER TABLE public.orders ADD COLUMN assignment_strategy TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'fixed_partner_priority_applied') THEN
        ALTER TABLE public.orders ADD COLUMN fixed_partner_priority_applied BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'fixed_partner_candidate_ids') THEN
        ALTER TABLE public.orders ADD COLUMN fixed_partner_candidate_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[];
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_fixed_assignment ON public.orders(store_id, delivery_mode, fixed_partner_priority_applied);

CREATE OR REPLACE FUNCTION public.distance_km(
    p_lat1 DOUBLE PRECISION,
    p_lng1 DOUBLE PRECISION,
    p_lat2 DOUBLE PRECISION,
    p_lng2 DOUBLE PRECISION
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT (
        6371 * acos(
            LEAST(
                1,
                GREATEST(
                    -1,
                    cos(radians(p_lat1)) * cos(radians(p_lat2)) *
                    cos(radians(p_lng2) - radians(p_lng1)) +
                    sin(radians(p_lat1)) * sin(radians(p_lat2))
                )
            )
        )
    )::NUMERIC;
$$;

CREATE OR REPLACE FUNCTION public.find_available_fixed_partner(
    p_store_id UUID,
    p_delivery_lat DOUBLE PRECISION DEFAULT NULL,
    p_delivery_lng DOUBLE PRECISION DEFAULT NULL,
    p_max_distance_km NUMERIC DEFAULT NULL
)
RETURNS TABLE (
    partner_id UUID,
    distance_km NUMERIC,
    priority_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        sp.partner_id,
        CASE
            WHEN p_delivery_lat IS NULL OR p_delivery_lng IS NULL OR ul.lat IS NULL OR ul.lng IS NULL THEN NULL::NUMERIC
            ELSE public.distance_km(p_delivery_lat, p_delivery_lng, ul.lat, ul.lng)
        END AS distance_km,
        sp.priority_order
    FROM public.store_partners sp
    JOIN public.user_profiles up ON up.id = sp.partner_id
    LEFT JOIN public.user_locations ul
        ON ul.user_id = sp.partner_id
       AND ul.updated_at > now() - interval '30 minutes'
    WHERE sp.store_id = p_store_id
      AND sp.fixed_priority = TRUE
      AND lower(COALESCE(sp.status, 'active')) = 'active'
      AND up.role IN ('delivery_partner', 'delivery_person')
      AND COALESCE(up.is_available, FALSE) = TRUE
      AND COALESCE(up.status::TEXT, 'active') = 'active'
      AND EXISTS (
          SELECT 1 FROM public.work_shifts ws
          WHERE ws.user_id = sp.partner_id
            AND ws.status = 'ACTIVE'
      )
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
      AND (
          sp.max_distance_km IS NULL
          OR p_delivery_lat IS NULL
          OR p_delivery_lng IS NULL
          OR (
              ul.lat IS NOT NULL
              AND ul.lng IS NOT NULL
              AND public.distance_km(p_delivery_lat, p_delivery_lng, ul.lat, ul.lng) <= sp.max_distance_km
          )
      )
    ORDER BY
        CASE WHEN p_delivery_lat IS NULL OR p_delivery_lng IS NULL OR ul.lat IS NULL OR ul.lng IS NULL THEN 1 ELSE 0 END,
        distance_km ASC NULLS LAST,
        sp.priority_order ASC,
        sp.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_available_fixed_partner(UUID, DOUBLE PRECISION, DOUBLE PRECISION, NUMERIC) TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_partner_associated_stores();

CREATE OR REPLACE FUNCTION public.get_partner_associated_stores()
RETURNS TABLE (
    id UUID,
    name TEXT,
    city TEXT,
    avatar_url TEXT,
    fixed_priority BOOLEAN,
    priority_order INTEGER,
    association_status TEXT,
    linked_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner_id UUID := auth.uid()::uuid;
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        COALESCE(p.store_name, p.name) AS name,
        COALESCE(p.store_address_city, p.city) AS city,
        COALESCE(p.store_logo_url, p.avatar_url) AS avatar_url,
        sp.fixed_priority,
        sp.priority_order,
        sp.status AS association_status,
        sp.created_at AS linked_at
    FROM public.user_profiles p
    JOIN public.store_partners sp ON sp.store_id = p.id
    WHERE sp.partner_id = v_partner_id
      AND lower(COALESCE(sp.status, 'active')) = 'active'
    ORDER BY sp.fixed_priority DESC, sp.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_associated_stores() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_partner_requests_available()
RETURNS SETOF public.partner_requests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner UUID := auth.uid()::uuid;
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.partner_requests pr
    WHERE pr.status = 'PENDING'
      AND (pr.expires_at IS NULL OR pr.expires_at > now())
      AND (
          pr.partner_id IS NULL
          OR pr.partner_id = v_partner
          OR v_partner = ANY(pr.preferred_partner_ids)
          OR (
              pr.assignment_strategy = 'FIXED_FIRST'
              AND pr.preferred_until IS NOT NULL
              AND pr.preferred_until <= now()
          )
      )
    ORDER BY
        CASE
            WHEN pr.partner_id = v_partner THEN 0
            WHEN v_partner = ANY(pr.preferred_partner_ids) THEN 1
            WHEN pr.assignment_strategy = 'FIXED_FIRST' AND pr.preferred_until <= now() THEN 2
            ELSE 3
        END,
        pr.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_partner_requests_available() TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_partner_request(p_request_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_partner UUID := auth.uid()::uuid;
BEGIN
    UPDATE public.partner_requests pr
    SET partner_id = v_partner,
        status = 'ACCEPTED',
        updated_at = now(),
        assignment_note = CASE
            WHEN pr.assignment_strategy = 'FIXED_FIRST'
             AND pr.preferred_until IS NOT NULL
             AND pr.preferred_until <= now()
             AND pr.partner_id IS DISTINCT FROM v_partner
            THEN 'Fallback regional aceito apos janela de prioridade fixa.'
            ELSE pr.assignment_note
        END
    WHERE pr.id = p_request_id
      AND pr.status = 'PENDING'
      AND (
          pr.partner_id IS NULL
          OR pr.partner_id = v_partner
          OR v_partner = ANY(pr.preferred_partner_ids)
          OR (
              pr.assignment_strategy = 'FIXED_FIRST'
              AND pr.preferred_until IS NOT NULL
              AND pr.preferred_until <= now()
          )
      );
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_partner_request(UUID) TO authenticated;

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
BEGIN
    v_delivery_code := '#' || LPAD(FLOOR(random() * 10000)::int::text, 4, '0');

    SELECT COALESCE(is_super_store, FALSE)
    INTO v_is_super_store
    FROM public.user_profiles
    WHERE id = v_store_id;

    IF upper(COALESCE(p_request_type, 'PLATFORM')) = 'PLATFORM' THEN
        v_expires_at := now() + interval '5 minutes';

        IF v_target_partner_id IS NULL THEN
            SELECT fp.partner_id
            INTO v_target_partner_id
            FROM public.find_available_fixed_partner(v_store_id, NULL, NULL, NULL) fp
            LIMIT 1;

            IF v_target_partner_id IS NOT NULL THEN
                v_assignment_strategy := 'FIXED_FIRST';
                v_fixed_priority_applied := TRUE;
                v_preferred_until := now() + interval '90 seconds';
                v_preferred_partner_ids := ARRAY[v_target_partner_id];
            END IF;
        ELSE
            v_assignment_strategy := 'DIRECT_FIXED';
            v_fixed_priority_applied := TRUE;
            v_preferred_partner_ids := ARRAY[v_target_partner_id];
        END IF;
    ELSE
        v_assignment_strategy := 'DIRECT_FIXED';
        v_fixed_priority_applied := v_target_partner_id IS NOT NULL;
        IF v_target_partner_id IS NOT NULL THEN
            v_preferred_partner_ids := ARRAY[v_target_partner_id];
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
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_status public.order_status := 'pending';
    v_driver_id UUID;
    v_fixed_candidate_ids UUID[] := ARRAY[]::UUID[];
    v_assignment_strategy TEXT := 'REGIONAL';
    v_delivery_lat DOUBLE PRECISION;
    v_delivery_lng DOUBLE PRECISION;
BEGIN
    IF p_payment_method = 'PIX' THEN
        IF p_pix_active THEN
            v_status := 'Aguardando pagamento (PIX)';
        ELSE
            v_status := 'Pagamento a combinar com a loja';
        END IF;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.store_blocked_users
        WHERE store_id = p_store_id
          AND (
              (block_type = 'phone' AND block_value = regexp_replace(COALESCE(p_customer_phone, ''), '\D', '', 'g'))
              OR (block_type = 'email' AND block_value = (SELECT email FROM auth.users WHERE id = auth.uid()))
          )
    ) THEN
        RAISE EXCEPTION 'Nao foi possivel processar o pedido no momento.';
    END IF;

    IF upper(COALESCE(p_delivery_mode, '')) = 'DELIVERY' THEN
        v_delivery_lat := NULLIF(p_shipping_address->>'latitude', '')::DOUBLE PRECISION;
        v_delivery_lng := NULLIF(p_shipping_address->>'longitude', '')::DOUBLE PRECISION;

        SELECT fp.partner_id
        INTO v_driver_id
        FROM public.find_available_fixed_partner(p_store_id, v_delivery_lat, v_delivery_lng, NULL) fp
        LIMIT 1;

        IF v_driver_id IS NOT NULL THEN
            v_assignment_strategy := 'FIXED_FIRST';
            v_fixed_candidate_ids := ARRAY[v_driver_id];
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
        delivery_mode,
        driver_id,
        customer_name,
        customer_phone,
        observation,
        is_location_delivery,
        shipping_cost,
        points_redeemed,
        loyalty_discount_value,
        coupon_code,
        coupon_discount_value,
        origin,
        assignment_strategy,
        fixed_partner_priority_applied,
        fixed_partner_candidate_ids
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
        CASE WHEN upper(COALESCE(p_delivery_mode, '')) = 'DELIVERY' THEN 'PLATFORM' ELSE NULL END,
        v_driver_id,
        p_customer_name,
        p_customer_phone,
        p_observation,
        p_is_location_delivery,
        p_shipping_cost,
        p_points_redeemed,
        p_loyalty_discount_value,
        upper(trim(p_coupon_code)),
        p_coupon_discount_value,
        'DIGITAL_MENU',
        v_assignment_strategy,
        v_driver_id IS NOT NULL,
        v_fixed_candidate_ids
    )
    RETURNING id INTO v_order_id;

    IF p_points_redeemed > 0 THEN
        INSERT INTO public.loyalty_history (store_id, user_id, order_id, points, type, description)
        VALUES (p_store_id, auth.uid(), v_order_id, -p_points_redeemed, 'DEBIT', 'Uso de pontos no pedido #' || SUBSTRING(v_order_id::text, 1, 8));

        UPDATE public.loyalty_points
        SET balance = balance - p_points_redeemed, updated_at = now()
        WHERE store_id = p_store_id AND user_id = auth.uid();
    END IF;

    IF p_coupon_code IS NOT NULL THEN
        UPDATE public.claimed_rewards
        SET status = 'USED'
        WHERE upper(coupon_code) = upper(trim(p_coupon_code))
          AND user_id = auth.uid()
          AND status = 'ACTIVE';
    END IF;

    RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_order(UUID, JSONB, NUMERIC, TEXT, JSONB, TEXT, TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN, NUMERIC, INTEGER, NUMERIC, TEXT, NUMERIC) TO anon, authenticated;
