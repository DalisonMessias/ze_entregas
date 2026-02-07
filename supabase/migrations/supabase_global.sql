-- RPC para Dashboard de Desempenho do Lojista
-- Copie e execute este comando no SQL Editor do Supabase

-- Adicionando colunas necessárias na tabela de pedidos
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_orders_store_id ON public.orders(store_id);

CREATE OR REPLACE FUNCTION public.get_store_performance_dashboard(
    p_store_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_granularity TEXT DEFAULT 'day'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result JSONB;
    v_previous_start TIMESTAMPTZ;
    v_previous_end TIMESTAMPTZ;
BEGIN
    -- Determinar período anterior para comparação (mesma duração)
    v_previous_end := p_start_date - interval '1 second';
    v_previous_start := v_previous_end - (p_end_date - p_start_date);

    WITH 
    -- 1. Dados do Período Atual
    current_period AS (
        SELECT 
            COUNT(*) AS total_orders,
            COALESCE(SUM(total_price), 0) AS total_revenue,
            COALESCE(AVG(total_price), 0) AS avg_ticket,
            COUNT(*) FILTER (WHERE status = 'CANCELLED') AS cancelled_count,
            COUNT(*) FILTER (WHERE status = 'DELIVERED') AS completed_count,
            -- Tempo médio em minutos (apenas pedidos entregues)
            COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) FILTER (WHERE status = 'DELIVERED'), 0) / 60 AS avg_delivery_time_min
        FROM public.orders
        WHERE store_id = p_store_id
          AND created_at BETWEEN p_start_date AND p_end_date
    ),
    -- 2. Dados do Período Anterior
    previous_period AS (
        SELECT 
            COUNT(*) AS total_orders,
            COALESCE(SUM(total_price), 0) AS total_revenue,
            COALESCE(AVG(total_price), 0) AS avg_ticket
        FROM public.orders
        WHERE store_id = p_store_id
          AND created_at BETWEEN v_previous_start AND v_previous_end
    ),
    -- 3. Gráficos Temporal (Evolução de Vendas)
    graphs_data AS (
        SELECT 
            to_char(date_trunc(p_granularity, created_at), 'YYYY-MM-DD"T"HH24:MI:SS') as date_str,
            SUM(total_price) as revenue,
            COUNT(*) as count
        FROM public.orders
        WHERE store_id = p_store_id
          AND created_at BETWEEN p_start_date AND p_end_date
          AND status != 'CANCELLED'
        GROUP BY 1
        ORDER BY 1
    ),
    graphs AS (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'date', date_str,
            'revenue', revenue,
            'count', count
        )), '[]'::jsonb) AS timeline FROM graphs_data
    ),
    -- 4. Top Produtos (Extraído do array JSONB 'items')
    products_data AS (
        SELECT 
            item->>'name' as p_name,
            SUM(COALESCE((item->>'quantity')::int, 1)) as p_qty,
            SUM(COALESCE((item->>'total_price')::numeric, 0)) as p_total
        FROM public.orders,
             jsonb_array_elements(items) AS item
        WHERE store_id = p_store_id
          AND created_at BETWEEN p_start_date AND p_end_date
          AND status = 'DELIVERED'
        GROUP BY item->>'name'
        ORDER BY p_total DESC
        LIMIT 10
    ),
    products AS (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'name', p_name,
            'quantity', p_qty,
            'total', p_total
        )), '[]'::jsonb) AS top_items FROM products_data
    ),
    -- 5. Horários de Pico
    peaks_data AS (
        SELECT 
            EXTRACT(HOUR FROM created_at) as p_hour,
            COUNT(*) as p_count
        FROM public.orders
        WHERE store_id = p_store_id
          AND created_at BETWEEN p_start_date AND p_end_date
        GROUP BY 1
        ORDER BY 1
    ),
    peaks AS (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
            'hour', p_hour,
            'count', p_count
        )), '[]'::jsonb) AS hourly_distribution FROM peaks_data
    )
    -- Montagem do Resultado Final
    SELECT jsonb_build_object(
        'current', (SELECT row_to_json(c) FROM current_period c),
        'previous', (SELECT row_to_json(p) FROM previous_period p),
        'timeline', (SELECT timeline FROM graphs),
        'top_products', (SELECT top_items FROM products),
        'peak_hours', (SELECT hourly_distribution FROM peaks)
    ) INTO result;

    RETURN result;
END;
$$;

-- Permissões
GRANT EXECUTE ON FUNCTION public.get_store_performance_dashboard(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_performance_dashboard(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT) TO service_role;

-- Tabela de Chaves de API (Segurança e Isolamento por Loja)
-- Se a tabela não existir, cria o básico. Se existir, adicionamos as colunas necessárias abaixo.
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL,
    key_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionando colunas de forma não destrutiva
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS key_value TEXT;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.user_profiles(id);
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.user_profiles(id);
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS service_name TEXT;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS key_token TEXT;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS encrypted_key TEXT;
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Remover restrições NOT NULL caso as colunas tenham sido criadas anteriormente como obrigatórias
ALTER TABLE public.api_keys ALTER COLUMN provider DROP NOT NULL;
ALTER TABLE public.api_keys ALTER COLUMN key_value DROP NOT NULL;
ALTER TABLE public.api_keys ALTER COLUMN service_name DROP NOT NULL;
ALTER TABLE public.api_keys ALTER COLUMN key_token DROP NOT NULL;



-- Atualizar service_name com o valor de provider de forma segura (apenas se provider existir)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='api_keys' AND column_name='provider') THEN
        UPDATE public.api_keys SET service_name = provider WHERE service_name IS NULL;
    END IF;
END $$;

ALTER TABLE public.api_keys ALTER COLUMN service_name SET NOT NULL;

-- Atualizar restrição de unicidade (Remover antiga se houver e adicionar nova)
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_provider_key;
ALTER TABLE public.api_keys DROP CONSTRAINT IF EXISTS api_keys_store_id_service_name_key;
ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_store_id_service_name_key UNIQUE (store_id, service_name);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_api_keys_store_id ON public.api_keys(store_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_service_name ON public.api_keys(service_name);

-- RLS para api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Remover regras antigas para garantir idempotência
DROP POLICY IF EXISTS "Authenticated users can view keys" ON public.api_keys;
DROP POLICY IF EXISTS "Service Role can manage keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can view their own store keys" ON public.api_keys;
DROP POLICY IF EXISTS "Admins can manage all keys" ON public.api_keys;

-- Novas políticas
-- Políticas de Segurança para api_keys
CREATE POLICY "Users can view their own store keys" ON public.api_keys
    FOR SELECT USING (
        auth.role() = 'authenticated' AND (
            store_id = auth.uid() OR -- Loja vê sua chave
            store_id IS NULL -- Todos veem chaves globais
        )
    );

CREATE POLICY "Admins can manage all keys" ON public.api_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service Role can manage keys" ON public.api_keys
    FOR ALL USING (auth.role() = 'service_role');


-- ==================================================================
-- CONFIGURAÇÕES DE AVALIAÇÕES E ESTATÍSTICAS
-- ==================================================================

-- Adicionando colunas de configuração e estatística em user_profiles de forma não destrutiva
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS show_comments_on_menu BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS ratings_count INT DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS ratings_sum INT DEFAULT 0;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0.00;

-- Função para atualizar automaticamente média e contagem de avaliações
CREATE OR REPLACE FUNCTION public.handle_new_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Apenas processa se for uma avaliação direcionada a um parceiro/loja
    IF NEW.direction = 'PARTNER_TO_STORE' THEN
        UPDATE public.user_profiles
        SET 
            ratings_count = COALESCE(ratings_count, 0) + 1,
            ratings_sum = COALESCE(ratings_sum, 0) + NEW.rating,
            average_rating = ROUND((COALESCE(ratings_sum, 0) + NEW.rating)::NUMERIC / (COALESCE(ratings_count, 0) + 1), 2),
            updated_at = NOW()
        WHERE id = NEW.evaluated_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para novas avaliações
DROP TRIGGER IF EXISTS on_rating_inserted ON public.partner_ratings;
CREATE TRIGGER on_rating_inserted
    AFTER INSERT ON public.partner_ratings
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_rating();

-- Script de Sincronização Retroativa (Executa uma vez para corrigir dados legados)
DO $$
BEGIN
    UPDATE public.user_profiles up
    SET 
        ratings_count = sub.cnt,
        ratings_sum = sub.sum_val,
        average_rating = ROUND(sub.sum_val::NUMERIC / sub.cnt, 2)
    FROM (
        SELECT 
            evaluated_id, 
            COUNT(*) as cnt, 
            SUM(rating) as sum_val
        FROM public.partner_ratings
        WHERE direction = 'PARTNER_TO_STORE'
        GROUP BY evaluated_id
    ) sub
    WHERE up.id = sub.evaluated_id;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN public.user_profiles.show_comments_on_menu IS 'Define se os comentários das avaliações ficam visíveis no Menu Digital';
COMMENT ON COLUMN public.user_profiles.ratings_count IS 'Total de avaliações recebidas pela loja';
COMMENT ON COLUMN public.user_profiles.average_rating IS 'Média aritmética das avaliações (1-5)';


-- ==================================================================
-- POLÍTICAS DE RLS PARA AVALIAÇÕES (partner_ratings)
-- ==================================================================

-- Habilitar RLS na tabela de avaliações
ALTER TABLE public.partner_ratings ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas para garantir idempotência
DROP POLICY IF EXISTS "Public can view ratings" ON public.partner_ratings;
DROP POLICY IF EXISTS "Authenticated users can insert ratings" ON public.partner_ratings;
DROP POLICY IF EXISTS "Admins can manage ratings" ON public.partner_ratings;

-- Novas políticas
CREATE POLICY "Public can view ratings" ON public.partner_ratings
    FOR SELECT USING (true); -- Visualização pública

CREATE POLICY "Authenticated users can insert ratings" ON public.partner_ratings
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        evaluator_id = auth.uid()
    );

CREATE POLICY "Admins can manage ratings" ON public.partner_ratings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Stores can reply to ratings" ON public.partner_ratings;

CREATE POLICY "Stores can reply to ratings" ON public.partner_ratings
    FOR UPDATE USING (
        auth.uid() = evaluated_id
    );

-- Garantir permissões de acesso às roles do Supabase
GRANT SELECT, INSERT, UPDATE ON public.partner_ratings TO authenticated;
GRANT SELECT ON public.partner_ratings TO anon;
GRANT ALL ON public.partner_ratings TO service_role;



-- ==================================================================
-- ATUALIZAÇÃO DO RPC DE BUSCA DE LOJA (Incluindo Avaliações)
-- ==================================================================

CREATE OR REPLACE FUNCTION public.public_get_store_by_slug(p_city_slug text, p_store_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store record;
BEGIN
    SELECT 
        id, name, store_name, store_logo_url, cover_url, is_open, is_currently_open,
        phone_number, chat_number, description, pix_key,
        opening_hours, preparation_time_min, preparation_time_max,
        store_address_street, store_address_number, store_address_district, store_address_city, store_address_state,
        receive_orders_via_chat, receive_orders_via_platform,
        city, store_address_state AS state, store_address_zip,
        store_slug, city_slug,
        show_comments_on_menu, ratings_count, average_rating -- Novos campos incluídos
    INTO v_store
    FROM user_profiles
    WHERE city_slug = p_city_slug 
      AND store_slug = p_store_slug
      AND role = 'store_partner'
    LIMIT 1;

    RETURN row_to_json(v_store);
END;
$$;

GRANT EXECUTE ON FUNCTION public.public_get_store_by_slug(text, text) TO anon, authenticated, service_role;

-- Adicionar coluna de anonimato para avaliações
ALTER TABLE public.partner_ratings ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT FALSE;

-- Limpeza de duplicatas: manter apenas a avaliação mais recente de cada perfil para cada loja e direção
DELETE FROM public.partner_ratings a
USING public.partner_ratings b
WHERE a.created_at < b.created_at
AND a.evaluator_id = b.evaluator_id
AND a.evaluated_id = b.evaluated_id
AND a.direction = b.direction;

-- Garantir apenas uma avaliação por pessoa por loja/parceiro
CREATE UNIQUE INDEX IF NOT EXISTS partner_ratings_unique_eval_idx ON public.partner_ratings (evaluator_id, evaluated_id, direction);

-- Adicionar colunas para resposta do lojista
ALTER TABLE public.partner_ratings ADD COLUMN IF NOT EXISTS store_response TEXT;
ALTER TABLE public.partner_ratings ADD COLUMN IF NOT EXISTS store_response_at TIMESTAMPTZ;

-- ==================================================================
-- SISTEMA DE SOLICITAÇÃO DE ALTERAÇÃO DE AVALIAÇÃO (PROTOCOLO + TAXAS)
-- ==================================================================

-- 1. Tabela de Taxas do Sistema
CREATE TABLE IF NOT EXISTS public.system_fees (
    key TEXT PRIMARY KEY,
    value NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    updated_by UUID REFERENCES public.user_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir taxas padrão se não existirem
INSERT INTO public.system_fees (key, value, description)
VALUES 
    ('rating_edit_fee', 10.00, 'Taxa para editar comentário de avaliação'),
    ('rating_delete_fee', 20.00, 'Taxa para excluir avaliação')
ON CONFLICT (key) DO NOTHING;

-- Função auxiliar para verificar admin (SECURITY DEFINER para evitar RLS recursion/bloqueio)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- RLS para system_fees
ALTER TABLE public.system_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read fees" ON public.system_fees;
CREATE POLICY "Public read fees" ON public.system_fees FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage fees" ON public.system_fees;
CREATE POLICY "Admins manage fees" ON public.system_fees FOR ALL USING (
    public.is_admin()
);

GRANT SELECT ON public.system_fees TO anon, authenticated;
GRANT UPDATE ON public.system_fees TO authenticated;
GRANT ALL ON public.system_fees TO service_role;

    -- 2. Coluna Super Lojista
    -- (Já existe is_super_store em user_profiles, linha 312 do part1)

    -- 3. Tabela de Solicitações (Protocolos)
    CREATE TABLE IF NOT EXISTS public.rating_change_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        protocol TEXT UNIQUE NOT NULL,
        store_id UUID NOT NULL REFERENCES public.user_profiles(id),
        rating_id UUID NOT NULL REFERENCES public.partner_ratings(id),
        request_types TEXT[] NOT NULL, -- ['EDIT_COMMENT', 'DELETE_RATING']
        status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, IN_ANALYSIS, COMPLETED, REJECTED, CANCELLED
        reason TEXT NOT NULL,
        new_comment TEXT, -- Obrigatório se EDIT_COMMENT
        fee_charged NUMERIC NOT NULL DEFAULT 0,
        admin_notes TEXT,
        executed_by UUID REFERENCES public.user_profiles(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- RLS para rating_change_requests
    ALTER TABLE public.rating_change_requests ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Stores view own requests" ON public.rating_change_requests;
    CREATE POLICY "Stores view own requests" ON public.rating_change_requests FOR SELECT USING (store_id = auth.uid());

    DROP POLICY IF EXISTS "Admins manage requests" ON public.rating_change_requests;
    CREATE POLICY "Admins manage requests" ON public.rating_change_requests FOR ALL USING (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

    -- 4. Função RPC para criar solicitação com pagamento atômico
    -- 4. Função RPC para criar solicitação com pagamento atômico (Atualizada para Combo)

    -- Adicionando colunas para configuração de Desconto Combo (não destrutivo)
    ALTER TABLE public.partner_fee_settings ADD COLUMN IF NOT EXISTS combo_discount_percent NUMERIC DEFAULT 10;
    ALTER TABLE public.partner_fee_settings ADD COLUMN IF NOT EXISTS combo_discount_enabled BOOLEAN DEFAULT false;

    -- Adicionando colunas de rastreamento financeiro na tabela de solicitações
    ALTER TABLE public.rating_change_requests ADD COLUMN IF NOT EXISTS base_value NUMERIC DEFAULT 0;
    ALTER TABLE public.rating_change_requests ADD COLUMN IF NOT EXISTS discount_percent_applied NUMERIC DEFAULT 0;
    ALTER TABLE public.rating_change_requests ADD COLUMN IF NOT EXISTS discount_value NUMERIC DEFAULT 0;
    ALTER TABLE public.rating_change_requests ADD COLUMN IF NOT EXISTS final_value NUMERIC DEFAULT 0;

    -- Atualizar RPC para suportar Desconto Combo
CREATE OR REPLACE FUNCTION public.create_rating_request_with_payment(
    p_rating_id UUID,
    p_request_types TEXT[],
    p_reason TEXT,
    p_new_comment TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store_id UUID;
    v_is_super_store BOOLEAN;
    v_edit_fee NUMERIC;
    v_delete_fee NUMERIC;
    v_total_fee NUMERIC;
    v_base_value NUMERIC;
    v_discount_percent NUMERIC := 0;
    v_discount_value NUMERIC := 0;
    v_combo_enabled BOOLEAN;
    v_protocol TEXT;
    v_request_id UUID;
BEGIN
        -- Verificar Autorização
        IF auth.uid() IS NULL THEN
            RAISE EXCEPTION 'Não autorizado';
        END IF;

        v_store_id := auth.uid();

        -- Verificar se é Super Lojista
        SELECT is_super_store INTO v_is_super_store
        FROM public.user_profiles WHERE id = v_store_id;

        -- Obter Taxas do Sistema
        SELECT value INTO v_edit_fee FROM public.system_fees WHERE key = 'rating_edit_fee';
        SELECT value INTO v_delete_fee FROM public.system_fees WHERE key = 'rating_delete_fee';

        -- Obter Configuração de Desconto Combo
        SELECT combo_discount_percent, combo_discount_enabled 
        INTO v_discount_percent, v_combo_enabled
        FROM public.partner_fee_settings LIMIT 1;

        -- Calcular Valor Base
        v_base_value := 0;
        IF 'EDIT_COMMENT' = ANY(p_request_types) THEN
            v_base_value := v_base_value + COALESCE(v_edit_fee, 0);
        END IF;
        IF 'DELETE_RATING' = ANY(p_request_types) THEN
            v_base_value := v_base_value + COALESCE(v_delete_fee, 0);
        END IF;

        -- Aplicar Desconto se for Combo (ambos os tipos) e estiver habilitado
        v_total_fee := v_base_value;
        IF v_combo_enabled AND 
           'EDIT_COMMENT' = ANY(p_request_types) AND 
           'DELETE_RATING' = ANY(p_request_types) THEN
            
            v_discount_value := v_base_value * (v_discount_percent / 100);
            v_total_fee := v_base_value - v_discount_value;
        ELSE
            -- Reseta variaveis de desconto caso nao aplique
            v_discount_percent := 0;
            v_discount_value := 0;
        END IF;

        -- Se for Super Store, valor final é zero
        IF v_is_super_store THEN
            v_total_fee := 0;
            -- Mantemos registro do valor base e desconto para estatística, 
            -- mas o final cobrado é 0. O desconto aqui é 100% "técnico" do super store,
            -- mas para manter a lógica do combo separada, vamos zerar o final.
            v_discount_value := v_base_value; 
            v_discount_percent := 100;
        END IF;

        -- Debitar da Carteira (se houver custo)
        IF v_total_fee > 0 THEN
            PERFORM public.debit_store_wallet(
                v_store_id, 
                v_total_fee, 
                'TAXA_SOLICITACAO_AVALIACAO', 
                'Taxa de solicitação de alteração de avaliação'
            );
        END IF;

        -- Gerar Protocolo: AVA-YYYYMMDD-HEX
        v_protocol := 'AVA-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substring(md5(random()::text) from 1 for 6));

        -- Criar Solicitação
        INSERT INTO public.rating_change_requests (
            protocol, store_id, rating_id, request_types, status, reason, new_comment, 
            fee_charged, base_value, discount_percent_applied, discount_value, final_value
        ) VALUES (
            v_protocol, v_store_id, p_rating_id, p_request_types, 'OPEN', p_reason, p_new_comment, 
            v_total_fee, v_base_value, v_discount_percent, v_discount_value, v_total_fee
        ) RETURNING id INTO v_request_id;

        RETURN jsonb_build_object('success', true, 'protocol', v_protocol, 'request_id', v_request_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_rating_request_with_payment(UUID, TEXT[], TEXT, TEXT) TO authenticated;

-- ============================================================================
-- SISTEMA DE ADICIONAIS - CATÁLOGO BASE (ADMIN)
-- ============================================================================

-- Tabela: base_addon_groups
-- Descrição: Grupos de adicionais criados pelo admin no catálogo base
CREATE TABLE IF NOT EXISTS public.base_addon_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('SINGLE', 'MULTIPLE')),
    min INTEGER DEFAULT 0,
    max INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela: base_addon_options
-- Descrição: Opções (itens) de cada grupo de adicionais base
CREATE TABLE IF NOT EXISTS public.base_addon_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.base_addon_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_base_addon_options_group ON public.base_addon_options(group_id);
CREATE INDEX IF NOT EXISTS idx_base_addon_groups_active ON public.base_addon_groups(is_active);

-- Adicionar rastreamento de origem nos adicionais do lojista
ALTER TABLE public.store_addon_groups ADD COLUMN IF NOT EXISTS base_addon_group_id UUID REFERENCES public.base_addon_groups(id);
CREATE INDEX IF NOT EXISTS idx_store_addon_groups_base ON public.store_addon_groups(base_addon_group_id);

-- RLS (Row Level Security)
ALTER TABLE public.base_addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_addon_options ENABLE ROW LEVEL SECURITY;

-- Admins podem fazer tudo
CREATE POLICY admin_all_base_addon_groups ON public.base_addon_groups FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY admin_all_base_addon_options ON public.base_addon_options FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Lojistas podem apenas ler (para importação)
CREATE POLICY store_read_base_addon_groups ON public.base_addon_groups FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'store_partner'
    ) AND is_active = true
);

CREATE POLICY store_read_base_addon_options ON public.base_addon_options FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'store_partner'
    ) AND is_active = true
);
