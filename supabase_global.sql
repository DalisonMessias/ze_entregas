-- RPC para Dashboard de Desempenho do Lojista
-- Copie e execute este comando no SQL Editor do Supabase

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
