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

DROP FUNCTION IF EXISTS public.public_get_store_by_slug(text, text);

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
DROP POLICY IF EXISTS admin_all_base_addon_groups ON public.base_addon_groups;
CREATE POLICY admin_all_base_addon_groups ON public.base_addon_groups FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

DROP POLICY IF EXISTS admin_all_base_addon_options ON public.base_addon_options;
CREATE POLICY admin_all_base_addon_options ON public.base_addon_options FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Lojistas podem apenas ler (para importação)
DROP POLICY IF EXISTS store_read_base_addon_groups ON public.base_addon_groups;
CREATE POLICY store_read_base_addon_groups ON public.base_addon_groups FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'store_partner'
    ) AND is_active = true
);

DROP POLICY IF EXISTS store_read_base_addon_options ON public.base_addon_options;
CREATE POLICY store_read_base_addon_options ON public.base_addon_options FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'store_partner'
    ) AND is_active = true
);

-- ============================================================================
-- VARIAÇÕES DE TAMANHO DO PRODUTO (ADDITIONAL COLUMNS)
-- ============================================================================
-- Adicionando colunas de tamanho na tabela products (corrigido de store_products)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS has_sizes BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS available_sizes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_by_size JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS default_size TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS excluded_addon_options JSONB DEFAULT '[]'::jsonb;

-- Comentários
COMMENT ON COLUMN public.products.has_sizes IS 'Indica se o produto possui variações de tamanho';
COMMENT ON COLUMN public.products.available_sizes IS 'Lista de tamanhos habilitados ["Pequeno", "Médio", "Grande"]';
COMMENT ON COLUMN public.products.price_by_size IS 'Preços por tamanho {"Pequeno": 10.00, "Médio": 12.00}';
COMMENT ON COLUMN public.products.default_size IS 'Tamanho pré-selecionado';

-- Tabela de API Keys - Adicionar coluna para Voice ID (ElevenLabs)
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS voice_id TEXT;
COMMENT ON COLUMN public.api_keys.voice_id IS 'ID da voz personalizada (apenas para ElevenLabs)';


-- ============================================================================
-- SISTEMA DE INDIQUE E GANHE (PONTOS)
-- ============================================================================

-- 1. Alterações na tabela de perfis (user_profiles)
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES public.user_profiles(id);
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referral_points_balance INTEGER DEFAULT 0;

-- Index para busca rápida por código
CREATE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles(referral_code);

-- 2. Tabela de Configuração Geral do Programa
CREATE TABLE IF NOT EXISTS public.referral_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active BOOLEAN DEFAULT true,
    points_per_referral_user INTEGER DEFAULT 100,
    points_per_referral_store INTEGER DEFAULT 500,
    points_per_referral_courier INTEGER DEFAULT 200,
    reward_validity_days INTEGER DEFAULT 180,
    min_order_value_for_credit NUMERIC DEFAULT 0, -- Se 0, credita no cadastro. Se > 0, credita na 1ª compra acima desse valor.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.user_profiles(id)
);

-- Inserir configuração padrão se não existir
INSERT INTO public.referral_config (is_active)
SELECT true WHERE NOT EXISTS (SELECT 1 FROM public.referral_config);

-- RLS para Config (Administrativo)
ALTER TABLE public.referral_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view config" ON public.referral_config;
CREATE POLICY "Public view config" ON public.referral_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin manage config" ON public.referral_config;
CREATE POLICY "Admin manage config" ON public.referral_config FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Permissões básicas (GRANTs)
GRANT SELECT ON public.referral_config TO authenticated, anon;
GRANT ALL ON public.referral_config TO service_role;
GRANT ALL ON public.referral_config TO authenticated; -- Admin usa essa role no client

-- 3. Catálogo de Recompensas (Troca de Pontos)
CREATE TABLE IF NOT EXISTS public.referral_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    cost_points INTEGER NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('CUPOM_FIXED', 'CUPOM_PERCENT', 'FREE_SHIPPING')),
    reward_value NUMERIC NOT NULL DEFAULT 0, -- Valor do desconto (R$ ou %)
    min_order_value NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para Rewards
ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read rewards" ON public.referral_rewards;
CREATE POLICY "Public read rewards" ON public.referral_rewards FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admin manage rewards" ON public.referral_rewards;
CREATE POLICY "Admin manage rewards" ON public.referral_rewards FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Permissões básicas (GRANTs)
GRANT SELECT ON public.referral_rewards TO authenticated, anon;
GRANT ALL ON public.referral_rewards TO service_role;
GRANT ALL ON public.referral_rewards TO authenticated;

-- 3.1 Prêmios Resgatados (Claimed Rewards)
CREATE TABLE IF NOT EXISTS public.claimed_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id),
    reward_id UUID REFERENCES public.referral_rewards(id),
    coupon_code TEXT,
    status TEXT DEFAULT 'ACTIVE', -- ACTIVE, USED, EXPIRED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- RLS para Claimed Rewards
ALTER TABLE public.claimed_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "My claimed rewards" ON public.claimed_rewards;
CREATE POLICY "My claimed rewards" ON public.claimed_rewards FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admin manage claimed rewards" ON public.claimed_rewards;
CREATE POLICY "Admin manage claimed rewards" ON public.claimed_rewards FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Permissões básicas (GRANTs)
GRANT SELECT ON public.claimed_rewards TO authenticated;
GRANT ALL ON public.claimed_rewards TO service_role;
GRANT ALL ON public.claimed_rewards TO authenticated;

-- 4. Extrato de Pontos (Ledger)
CREATE TABLE IF NOT EXISTS public.referral_points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    operation_type TEXT NOT NULL CHECK (operation_type IN ('CREDIT_REFERRAL', 'DEBIT_REDEEM', 'CREDIT_BONUS', 'REVERSAL')),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    description TEXT,
    reference_id UUID, -- ID do usuário indicado ou ID da recompensa/pedido
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para Ledger
ALTER TABLE public.referral_points_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "My ledger" ON public.referral_points_ledger;
CREATE POLICY "My ledger" ON public.referral_points_ledger FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admin view ledger" ON public.referral_points_ledger;
CREATE POLICY "Admin view ledger" ON public.referral_points_ledger FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Permissões básicas (GRANTs)
GRANT SELECT ON public.referral_points_ledger TO authenticated;
GRANT ALL ON public.referral_points_ledger TO service_role;
GRANT ALL ON public.referral_points_ledger TO authenticated;

-- 5. Função para Gerar Código de Indicação Único
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_code TEXT;
    exists_code BOOLEAN;
BEGIN
    LOOP
        -- Gera código formato REF-XXXXXX (6 caracteres hex aleatórios)
        new_code := 'REF-' || upper(substring(md5(random()::text) from 1 for 6));
        
        -- Verifica colisão
        SELECT EXISTS (SELECT 1 FROM public.user_profiles WHERE referral_code = new_code) INTO exists_code;
        
        EXIT WHEN NOT exists_code;
    END LOOP;
    RETURN new_code;
END;
$$;

-- 6. Trigger para criar código ao inserir usuário (se não vier preenchido)
CREATE OR REPLACE FUNCTION public.trigger_ensure_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code := public.generate_referral_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created_gen_code ON public.user_profiles;
CREATE TRIGGER on_user_created_gen_code
    BEFORE INSERT ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.trigger_ensure_referral_code();

-- Tentar preencher códigos para usuários antigos que não tenham
DO $$
DECLARE 
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.user_profiles WHERE referral_code IS NULL LOOP
        UPDATE public.user_profiles 
        SET referral_code = public.generate_referral_code() 
        WHERE id = r.id;
    END LOOP;
END $$;


-- 7. RPC: Validar Código de Indicação (para o frontend do cadastro)
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_referrer RECORD;
BEGIN
    SELECT id, name, role FROM public.user_profiles 
    WHERE referral_code = upper(trim(p_code)) 
    LIMIT 1 
    INTO v_referrer;

    IF v_referrer.id IS NULL THEN
        RETURN jsonb_build_object('valid', false, 'message', 'Código não encontrado');
    END IF;

    -- Não permitir indicar a si mesmo
    IF v_referrer.id = auth.uid() THEN
         RETURN jsonb_build_object('valid', false, 'message', 'Auto-indicação não permitida');
    END IF;

    RETURN jsonb_build_object(
        'valid', true, 
        'referrer_id', v_referrer.id,
        'referrer_name', v_referrer.name
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO anon, authenticated, service_role;


-- 8. RPC: Resgatar Pontos (Trocar por Recompensa)
CREATE OR REPLACE FUNCTION public.redeem_referral_points(p_reward_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_reward RECORD;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_coupon_code TEXT;
    v_coupon_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Não autorizado';
    END IF;

    -- Buscar recompensa
    SELECT * INTO v_reward FROM public.referral_rewards WHERE id = p_reward_id AND is_active = true;
    IF v_reward.id IS NULL THEN
        RAISE EXCEPTION 'Recompensa indisponível';
    END IF;

    -- Verificar saldo
    SELECT referral_points_balance INTO v_current_balance FROM public.user_profiles WHERE id = v_user_id;
    IF v_current_balance < v_reward.cost_points THEN
        RAISE EXCEPTION 'Saldo insuficiente';
    END IF;

    -- Gerar Cupom
    -- Assumindo que a tabela coupons existe (baseada no types.ts e contexto geral)
    -- Vamos criar um código único para o cupom: PROMO-XXXX
    v_coupon_code := 'RESGATE-' || upper(substring(md5(random()::text) from 1 for 6));
    
    INSERT INTO public.claimed_rewards (user_id, reward_id, coupon_code, expires_at)
    VALUES (v_user_id, v_reward.id, v_coupon_code, NOW() + interval '30 days');

    -- Debitar Pontos
    v_new_balance := v_current_balance - v_reward.cost_points;
    
    UPDATE public.user_profiles 
    SET referral_points_balance = v_new_balance 
    WHERE id = v_user_id;

    -- Registrar no Ledger
    INSERT INTO public.referral_points_ledger (
        user_id, operation_type, amount, balance_after, description, reference_id
    ) VALUES (
        v_user_id, 'DEBIT_REDEEM', v_reward.cost_points, v_new_balance, 'Resgate: ' || v_reward.title, v_reward.id
    );

    RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'coupon_code', v_coupon_code);
END;
$$;
GRANT EXECUTE ON FUNCTION public.redeem_referral_points(UUID) TO authenticated;


-- 9. RPC: Obter Resumo do Painel (Saldo + Histórico + Recompensas)
CREATE OR REPLACE FUNCTION public.get_referral_dashboard_data()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_balance INTEGER;
    v_code TEXT;
    v_ledger JSONB;
    v_rewards JSONB;
    v_my_claims JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN '{}'::jsonb; END IF;

    -- Dados do Usuário
    SELECT referral_points_balance, referral_code INTO v_balance, v_code 
    FROM public.user_profiles WHERE id = v_user_id;

    -- Extrato (Últimos 20)
    SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO v_ledger
    FROM (
        SELECT * FROM public.referral_points_ledger 
        WHERE user_id = v_user_id 
        ORDER BY created_at DESC LIMIT 20
    ) t;

    -- Recompensas Disponíveis
    SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) INTO v_rewards
    FROM (
        SELECT * FROM public.referral_rewards WHERE is_active = true ORDER BY cost_points ASC
    ) r;

    -- Meus Resgates Ativos
    SELECT COALESCE(jsonb_agg(c), '[]'::jsonb) INTO v_my_claims
    FROM (
        SELECT * FROM public.claimed_rewards 
        WHERE user_id = v_user_id AND status = 'ACTIVE'
    ) c;

    RETURN jsonb_build_object(
        'balance', COALESCE(v_balance, 0),
        'my_code', v_code,
        'history', v_ledger,
        'rewards', v_rewards,
        'active_claims', v_my_claims
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_referral_dashboard_data() TO authenticated;

-- 10. RPC: Administração - Obter Histórico Global com Joins
DROP FUNCTION IF EXISTS public.admin_get_referral_ledger();
CREATE OR REPLACE FUNCTION public.admin_get_referral_ledger()
RETURNS TABLE (
    t_id UUID,
    t_user_id UUID,
    t_operation_type TEXT,
    t_amount INTEGER,
    t_balance_after INTEGER,
    t_description TEXT,
    t_reference_id UUID,
    t_created_at TIMESTAMPTZ,
    referrer_name TEXT,
    referrer_role TEXT,
    referred_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verifica se é admin
    IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;

    RETURN QUERY
    SELECT 
        l.id as t_id,
        l.user_id as t_user_id,
        l.operation_type as t_operation_type,
        l.amount as t_amount,
        l.balance_after as t_balance_after,
        l.description as t_description,
        l.reference_id as t_reference_id,
        l.created_at as t_created_at,
        u.name as referrer_name,
        u.role::text as referrer_role,
        r.name as referred_name
    FROM public.referral_points_ledger l
    LEFT JOIN public.user_profiles u ON u.id = l.user_id
    LEFT JOIN public.user_profiles r ON r.id = l.reference_id
    ORDER BY l.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_get_referral_ledger() TO authenticated;




-- ==================================================================
-- TRIGGERS DE REFERRAL (METADATA + RECOMPENSA)
-- ==================================================================

-- TRIGGER 1: Sincronizar referred_by do metadata (BEFORE INSERT)
CREATE OR REPLACE FUNCTION public.sync_referral_from_auth()
RETURNS TRIGGER AS $$
DECLARE
    v_referral_code TEXT;
    v_referrer_id UUID;
    v_auth_data JSONB;
BEGIN
    SELECT raw_user_meta_data INTO v_auth_data FROM auth.users WHERE id = NEW.id;
    v_referral_code := v_auth_data->>'referral_code';
    
    IF v_referral_code IS NOT NULL AND NEW.referred_by IS NULL THEN
         SELECT id INTO v_referrer_id FROM public.user_profiles WHERE referral_code = upper(v_referral_code);
         IF v_referrer_id IS NOT NULL THEN
             NEW.referred_by := v_referrer_id;
         END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_profile_created_check_referral ON public.user_profiles;
CREATE TRIGGER on_user_profile_created_check_referral
    BEFORE INSERT ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_referral_from_auth();


-- TRIGGER 2: Processar Recompensa de Cadastro (AFTER INSERT)
CREATE OR REPLACE FUNCTION public.process_referral_reward_on_signup()
RETURNS TRIGGER AS $$
DECLARE
    v_config RECORD;
    v_points INTEGER := 0;
    v_referrer_balance INTEGER;
BEGIN
    IF NEW.referred_by IS NULL THEN RETURN NEW; END IF;

    SELECT * INTO v_config FROM public.referral_config LIMIT 1;
    
    IF v_config.is_active IS NOT TRUE OR v_config.min_order_value_for_credit > 0 THEN
        RETURN NEW;
    END IF;

    CASE NEW.role 
        WHEN 'USER' THEN v_points := v_config.points_per_referral_user;
        WHEN 'STORE_PARTNER' THEN v_points := v_config.points_per_referral_store;
        WHEN 'DELIVERY_PARTNER' THEN v_points := v_config.points_per_referral_courier;
        ELSE v_points := 0;
    END CASE;
    
    IF v_points > 0 THEN
        UPDATE public.user_profiles 
        SET referral_points_balance = COALESCE(referral_points_balance, 0) + v_points 
        WHERE id = NEW.referred_by
        RETURNING referral_points_balance INTO v_referrer_balance;
        
        INSERT INTO public.referral_points_ledger (
            user_id, operation_type, amount, balance_after, description, reference_id
        ) VALUES (
            NEW.referred_by, 
            'CREDIT_REFERRAL', 
            v_points, 
            v_referrer_balance, 
            'Indicação de novo usuário (Cadastro): ' || NEW.name || ' (' || NEW.role || ')', 
            NEW.id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_profile_created_reward ON public.user_profiles;
CREATE TRIGGER on_user_profile_created_reward
    AFTER INSERT ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.process_referral_reward_on_signup();

-- ==================================================================
-- MELHORIAS PÁGINA DE DESTAQUES (METRICAS E REALTIME) - 2026-02-09
-- ==================================================================

-- 1. Habilitar Realtime para mensagens de banner
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'city_store_banner_request_messages'
    ) THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.city_store_banner_request_messages;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Não foi possível adicionar à publicação supabase_realtime automaticamente.';
        END;
    END IF;
END $$;

ALTER TABLE public.city_store_banner_request_messages REPLICA IDENTITY FULL;

-- 2. Métricas para Destaques
ALTER TABLE public.city_store_highlight_orders ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE public.city_store_highlight_orders ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0;

-- 3. Métricas para Banners (Solicitações)
ALTER TABLE public.city_promotion_orders ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE public.city_promotion_orders ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0;

-- 4. RPC para incrementar métricas de forma atômica
CREATE OR REPLACE FUNCTION public.increment_promotion_metric(
    p_promo_id UUID,
    p_promo_type TEXT, -- 'HIGHLIGHT' ou 'BANNER'
    p_metric_type TEXT -- 'VIEW' ou 'CLICK'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_promo_type = 'HIGHLIGHT' THEN
        IF p_metric_type = 'VIEW' THEN
            UPDATE public.city_store_highlight_orders SET views_count = views_count + 1 WHERE id = p_promo_id;
        ELSIF p_metric_type = 'CLICK' THEN
            UPDATE public.city_store_highlight_orders SET clicks_count = clicks_count + 1 WHERE id = p_promo_id;
        END IF;
    ELSIF p_promo_type = 'BANNER' THEN
        IF p_metric_type = 'VIEW' THEN
            UPDATE public.city_promotion_orders SET views_count = views_count + 1 WHERE id = p_promo_id;
        ELSIF p_metric_type = 'CLICK' THEN
            UPDATE public.city_promotion_orders SET clicks_count = clicks_count + 1 WHERE id = p_promo_id;
        END IF;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_promotion_metric(UUID, TEXT, TEXT) TO anon, authenticated;

-- Comentários para documentação
COMMENT ON COLUMN public.city_store_highlight_orders.views_count IS 'Número total de visualizações do destaque da loja';
COMMENT ON COLUMN public.city_store_highlight_orders.clicks_count IS 'Número total de cliques no destaque da loja';
COMMENT ON COLUMN public.city_promotion_orders.views_count IS 'Número total de visualizações do banner da cidade';
COMMENT ON COLUMN public.city_promotion_orders.clicks_count IS 'Número total de cliques no banner da cidade';

-- Super Lojista Plan Expansion (09/02/2026)
DO $$
BEGIN
    -- user_profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'super_store_plan_type') THEN
        ALTER TABLE public.user_profiles ADD COLUMN super_store_plan_type TEXT CHECK (super_store_plan_type IN ('MENSALIDADE', 'COMISSAO')) DEFAULT 'MENSALIDADE';
    END IF;

    -- partner_fee_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_fee_settings' AND column_name = 'super_store_monthly_enabled') THEN
        ALTER TABLE public.partner_fee_settings ADD COLUMN super_store_monthly_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_fee_settings' AND column_name = 'super_store_commission_enabled') THEN
        ALTER TABLE public.partner_fee_settings ADD COLUMN super_store_commission_enabled BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_fee_settings' AND column_name = 'super_store_commission_percent') THEN
        ALTER TABLE public.partner_fee_settings ADD COLUMN super_store_commission_percent NUMERIC(5, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_fee_settings' AND column_name = 'super_store_commission_fixed') THEN
        ALTER TABLE public.partner_fee_settings ADD COLUMN super_store_commission_fixed NUMERIC(10, 2) DEFAULT 0;
    END IF;
END $$;

-- Tabela de Comissões da Plataforma
CREATE TABLE IF NOT EXISTS public.platform_commissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id),
    amount NUMERIC(15, 2) NOT NULL,
    base_value NUMERIC(15, 2) NOT NULL,
    commission_percent NUMERIC(5, 2),
    commission_fixed NUMERIC(10, 2),
    plan_type TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, COMPLETED, CANCELLED
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_commissions_store_id ON public.platform_commissions(store_id);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_order_id ON public.platform_commissions(order_id);

ALTER TABLE public.platform_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all commissions" ON public.platform_commissions;
CREATE POLICY "Admins can view all commissions" ON public.platform_commissions FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own commissions" ON public.platform_commissions;
CREATE POLICY "Users can view own commissions" ON public.platform_commissions FOR SELECT USING (auth.uid()::text = store_id::text);

GRANT ALL ON public.platform_commissions TO authenticated;
GRANT ALL ON public.platform_commissions TO service_role;


-- ==================================================================
-- SISTEMA DE FIDELIDADE E CUPONS (ATUALIZADO 10/02/2026)
-- ==================================================================

-- 1. Novas colunas na tabela orders
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'points_earned') THEN
        ALTER TABLE public.orders ADD COLUMN points_earned INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'points_redeemed') THEN
        ALTER TABLE public.orders ADD COLUMN points_redeemed INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'loyalty_discount_value') THEN
        ALTER TABLE public.orders ADD COLUMN loyalty_discount_value NUMERIC(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'coupon_discount_value') THEN
        ALTER TABLE public.orders ADD COLUMN coupon_discount_value NUMERIC(10, 2) DEFAULT 0;
    END IF;
END $$;

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

-- 3. Tabela de Configurações de Fidelidade por Loja

-- 2. Tabela de Configurações de Fidelidade por Loja
CREATE TABLE IF NOT EXISTS public.loyalty_settings (
    store_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT FALSE,
    conversion_factor NUMERIC DEFAULT 1.0, -- Pontos por Real
    calculation_base TEXT DEFAULT 'SUBTOTAL', -- 'SUBTOTAL' | 'PAID'
    rounding_rule TEXT DEFAULT 'TRUNC', -- 'TRUNC' | 'ROUND'
    points_expiry_days INTEGER,
    min_points_redemption INTEGER DEFAULT 0,
    max_discount_percentage INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de Saldo de Pontos por Cliente/Loja
CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, user_id)
);

-- 4. Tabela de Histórico de Pontos
CREATE TABLE IF NOT EXISTS public.loyalty_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'CREDIT', 'DEBIT', 'REVERSAL', 'ADJUSTMENT'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Índices para Performance
CREATE INDEX IF NOT EXISTS idx_loyalty_points_user ON public.loyalty_points(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_store ON public.loyalty_points(store_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_user_store ON public.loyalty_history(user_id, store_id);

-- 6. RLS para as novas tabelas
ALTER TABLE public.loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_history ENABLE ROW LEVEL SECURITY;

-- Policies para loyalty_settings
DROP POLICY IF EXISTS "Lojistas gerenciam suas configs de fidelidade" ON public.loyalty_settings;
CREATE POLICY "Lojistas gerenciam suas configs de fidelidade" ON public.loyalty_settings 
    FOR ALL USING (auth.uid()::text = store_id::text OR public.is_admin());

DROP POLICY IF EXISTS "Public can read loyalty_settings" ON public.loyalty_settings;
CREATE POLICY "Public can read loyalty_settings" ON public.loyalty_settings FOR SELECT USING (true);

-- Policies para loyalty_points
DROP POLICY IF EXISTS "Users can view their own loyalty points" ON public.loyalty_points;
CREATE POLICY "Users can view their own loyalty points" ON public.loyalty_points 
    FOR SELECT USING (auth.uid()::text = user_id::text OR auth.uid()::text = store_id::text OR public.is_admin());

-- Policies para loyalty_history
DROP POLICY IF EXISTS "Users can view their own loyalty history" ON public.loyalty_history;
CREATE POLICY "Users can view their own loyalty history" ON public.loyalty_history 
    FOR SELECT USING (auth.uid()::text = user_id::text OR auth.uid()::text = store_id::text OR public.is_admin());

GRANT ALL ON public.loyalty_settings TO authenticated, anon;
GRANT ALL ON public.loyalty_points TO authenticated, anon;
GRANT ALL ON public.loyalty_history TO authenticated, anon;
GRANT ALL ON public.loyalty_settings TO service_role;
GRANT ALL ON public.loyalty_points TO service_role;
GRANT ALL ON public.loyalty_history TO service_role;

-- 7. Função para Calcular e Processar Pontos (Trigger)
CREATE OR REPLACE FUNCTION public.handle_loyalty_on_order_update()
RETURNS TRIGGER AS $$
DECLARE
    v_settings RECORD;
    v_points INTEGER;
    v_base_value NUMERIC;
BEGIN
    -- Obter configurações da loja
    SELECT * INTO v_settings FROM public.loyalty_settings WHERE store_id = NEW.store_id;
    
    -- Se fidelidade não estiver ativa, ignorar
    IF v_settings IS NULL OR v_settings.is_active = FALSE THEN
        RETURN NEW;
    END IF;

    -- CRÉDITO DE PONTOS
    -- Quando status muda para 'DELIVERED' e origem é 'MENU_DIGITAL'
    IF NEW.status = 'DELIVERED' AND OLD.status != 'DELIVERED' AND NEW.origin = 'MENU_DIGITAL' AND NEW.user_id IS NOT NULL THEN
        
        -- Definir base de cálculo
        IF v_settings.calculation_base = 'PAID' THEN
            v_base_value := NEW.total_price;
        ELSE
            -- SUBTOTAL
            v_base_value := NEW.total_price - COALESCE(NEW.shipping_cost, 0);
        END IF;

        -- Cálculo de pontos
        v_points := v_base_value * v_settings.conversion_factor;
        
        IF v_settings.rounding_rule = 'ROUND' THEN
            v_points := ROUND(v_points);
        ELSE
            v_points := TRUNC(v_points);
        END IF;

        IF v_points > 0 THEN
            -- Registrar no histórico
            INSERT INTO public.loyalty_history (store_id, user_id, order_id, points, type, description)
            VALUES (NEW.store_id, NEW.user_id, NEW.id, v_points, 'CREDIT', 'Pontos ganhos no pedido #' || SUBSTRING(NEW.id::text, 1, 8));

            -- Atualizar saldo
            INSERT INTO public.loyalty_points (store_id, user_id, balance)
            VALUES (NEW.store_id, NEW.user_id, v_points)
            ON CONFLICT (store_id, user_id) 
            DO UPDATE SET balance = public.loyalty_points.balance + EXCLUDED.balance, updated_at = now();
            
            NEW.points_earned := v_points;
        END IF;
    END IF;

    -- ESTORNO DE PONTOS
    -- Quando pedido é CANCELADO e já tinha gerado pontos
    IF NEW.status = 'CANCELLED' AND OLD.status = 'DELIVERED' AND OLD.points_earned > 0 AND NEW.user_id IS NOT NULL THEN
        -- Registrar no histórico
        INSERT INTO public.loyalty_history (store_id, user_id, order_id, points, type, description)
        VALUES (NEW.store_id, NEW.user_id, NEW.id, -OLD.points_earned, 'REVERSAL', 'Estorno de pontos do pedido cancelado #' || SUBSTRING(NEW.id::text, 1, 8));

        -- Atualizar saldo
        UPDATE public.loyalty_points 
        SET balance = balance - OLD.points_earned, updated_at = now()
        WHERE store_id = NEW.store_id AND user_id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Criar o Trigger
DROP TRIGGER IF EXISTS tr_handle_loyalty_order ON public.orders;
CREATE TRIGGER tr_handle_loyalty_order
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_loyalty_on_order_update();

-- 9. Função para Resgate de Pontos (Chamada via RPC/Frontend)
CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(
    p_store_id UUID,
    p_points_to_redeem INTEGER,
    p_discount_value NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance INTEGER;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Usuário não autenticado.');
    END IF;

    -- Verificar saldo
    SELECT balance INTO v_balance FROM public.loyalty_points 
    WHERE store_id = p_store_id AND user_id = v_user_id;

    IF v_balance IS NULL OR v_balance < p_points_to_redeem THEN
        RETURN jsonb_build_object('success', false, 'message', 'Saldo de pontos insuficiente.');
    END IF;

    -- Registrar débito no histórico
    INSERT INTO public.loyalty_history (store_id, user_id, points, type, description)
    VALUES (p_store_id, v_user_id, -p_points_to_redeem, 'DEBIT', 'Resgate de pontos por desconto no valor de R$ ' || p_discount_value);

    -- Atualizar saldo
    UPDATE public.loyalty_points 
    SET balance = balance - p_points_to_redeem, updated_at = now()
    WHERE store_id = p_store_id AND user_id = v_user_id;

    RETURN jsonb_build_object('success', true, 'new_balance', v_balance - p_points_to_redeem);
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(UUID, INTEGER, NUMERIC) TO authenticated;

-- 10. Função para Validar Cupom (Chamada via RPC/Frontend)
CREATE OR REPLACE FUNCTION public.validate_coupon(
    p_store_id UUID,
    p_coupon_code TEXT,
    p_cart_total NUMERIC,
    p_customer_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_coupon_record RECORD;
    v_store_record RECORD;
    v_usage_count INTEGER;
    v_discount_value NUMERIC := 0;
    v_user_id UUID;
    v_user_phone TEXT;
BEGIN
    v_user_id := auth.uid();
    
    -- Se logado, pegar o telefone do perfil
    IF v_user_id IS NOT NULL THEN
        SELECT phone_number INTO v_user_phone FROM public.user_profiles WHERE id = v_user_id;
    ELSE
        v_user_phone := p_customer_phone;
    END IF;

    -- 1. Buscar nas configurações da loja (Cupons Globais da Loja)
    SELECT * INTO v_store_record FROM public.shop_settings WHERE id = p_store_id;
    
    -- Localizar cupom no JSONB da loja
    SELECT * INTO v_coupon_record 
    FROM jsonb_to_recordset(v_store_record.coupons) AS x(code TEXT, discount_percent NUMERIC, discount_value NUMERIC, is_active BOOLEAN, min_purchase NUMERIC)
    WHERE x.code = UPPER(p_coupon_code) AND (x.is_active IS NULL OR x.is_active = TRUE);

    IF v_coupon_record.code IS NOT NULL THEN
        -- Validar valor mínimo
        IF p_cart_total < COALESCE(v_coupon_record.min_purchase, 0) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Valor mínimo para este cupom é R$ ' || v_coupon_record.min_purchase);
        END IF;

        IF v_coupon_record.discount_percent > 0 THEN
            v_discount_value := (p_cart_total * v_coupon_record.discount_percent) / 100;
        ELSE
            v_discount_value := v_coupon_record.discount_value;
        END IF;

        RETURN jsonb_build_object('success', true, 'discount_value', LEAST(v_discount_value, p_cart_total), 'message', 'Cupom aplicado!');
    END IF;

    -- 2. Buscar nos Recompensas de Indicação (Cupons de Usuário)
    -- Se o cupom for um código de indicação que virou recompensa (Claimed Rewards)
    SELECT * INTO v_coupon_record 
    FROM public.claimed_rewards 
    WHERE coupon_code = UPPER(p_coupon_code) AND status = 'AVAILABLE' AND (user_id = v_user_id OR v_user_id IS NULL);

    IF v_coupon_record.id IS NOT NULL THEN
        v_discount_value := v_coupon_record.reward_value;
        RETURN jsonb_build_object('success', true, 'discount_value', LEAST(v_discount_value, p_cart_total), 'message', 'Cupom de indicação aplicado!');
    END IF;

    RETURN jsonb_build_object('success', false, 'message', 'Cupom inválido ou expirado.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(UUID, TEXT, NUMERIC, TEXT) TO anon, authenticated;

-- 11. Atualizar create_public_order para suportar Resgate de Pontos e Cupons
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
        -- Registrar no histórico
        INSERT INTO public.loyalty_history (store_id, user_id, order_id, points, type, description)
        VALUES (p_store_id, auth.uid(), v_order_id, -p_points_redeemed, 'DEBIT', 'Uso de pontos no pedido #' || SUBSTRING(v_order_id::text, 1, 8));

        -- Atualizar saldo
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
-- CORREÇÃO getStoreBySlug (2026-02-09)
-- ==================================================================

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

-- ==================================================================
-- WHATSBOT SETTINGS & AI ASSISTANT
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.whatsbot_settings (
    store_id UUID PRIMARY KEY REFERENCES public.user_profiles(id),
    enabled BOOLEAN DEFAULT false,
    custom_message TEXT,
    custom_closed_message TEXT,
    image_url TEXT,
    closed_image_url TEXT,
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionando colunas de IA de forma não destrutiva
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsbot_settings' AND column_name = 'ai_enabled') THEN
        ALTER TABLE public.whatsbot_settings ADD COLUMN ai_enabled BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsbot_settings' AND column_name = 'ai_context') THEN
        ALTER TABLE public.whatsbot_settings ADD COLUMN ai_context TEXT DEFAULT 'Você é o assistente virtual da nossa loja. Seu objetivo é ser educado, tirar dúvidas dos clientes e incentivá-los a clicar no link do nosso catálogo digital para fazer o pedido.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'whatsbot_settings' AND column_name = 'ai_name') THEN
        ALTER TABLE public.whatsbot_settings ADD COLUMN ai_name TEXT DEFAULT 'Assistente';
    END IF;
END $$;

COMMENT ON TABLE public.whatsbot_settings IS 'Configurações do Robô de WhatsApp e Assistente de IA';
COMMENT ON COLUMN public.whatsbot_settings.ai_enabled IS 'Indica se o Assistente de IA (Gemini) está ativo';
COMMENT ON COLUMN public.whatsbot_settings.ai_context IS 'Instruções e contexto para a Inteligência Artificial';
COMMENT ON COLUMN public.whatsbot_settings.ai_name IS 'Nome personalizado do assistente de IA';

-- ==================================================================
-- 11. FUNÇÕES DE CHECKOUT E PEDIDOS
-- ==================================================================

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
    p_is_location_delivery BOOLEAN,
    p_observation TEXT,
    p_pix_active BOOLEAN,
    p_shipping_cost NUMERIC,
    p_points_redeemed INTEGER,
    p_loyalty_discount_value NUMERIC,
    p_coupon_code TEXT,
    p_coupon_discount_value NUMERIC
)
RETURNS UUID
AS $$
DECLARE
    v_status TEXT;
    v_order_id UUID;
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
        -- Registrar no histórico
        INSERT INTO public.loyalty_history (store_id, user_id, order_id, points, type, description)
        VALUES (p_store_id, auth.uid(), v_order_id, -p_points_redeemed, 'DEBIT', 'Uso de pontos no pedido #' || SUBSTRING(v_order_id::text, 1, 8));

        -- Atualizar saldo
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
-- 12. BASE DE CONHECIMENTO DO ZÉ ASSISTENTE (WhatsBot AI)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.ze_assistant_knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL, -- 'PRODUCT', 'FAQ', 'HOURS', 'POLICY', 'GENERAL'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_knowledge_base_store_type ON public.ze_assistant_knowledge_base(store_id, content_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON public.ze_assistant_knowledge_base(is_active);

-- Habilitar RLS
ALTER TABLE public.ze_assistant_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Store manages own knowledge base" ON public.ze_assistant_knowledge_base;
CREATE POLICY "Store manages own knowledge base"
ON public.ze_assistant_knowledge_base
FOR ALL
USING (auth.uid() = store_id)
WITH CHECK (auth.uid() = store_id);

-- Permissões Administrativas
GRANT ALL ON public.ze_assistant_knowledge_base TO authenticated, service_role;


-- Ajuste de compatibilidade para chaves de API
ALTER TABLE public.api_keys ALTER COLUMN encrypted_key DROP NOT NULL;
