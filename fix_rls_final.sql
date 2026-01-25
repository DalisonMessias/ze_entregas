
-- Garantir RLS em store_quick_replies (reforço)
DO $$ 
BEGIN 
    -- Remover políticas antigas para garantir limpeza se estiverem conflitando
    DROP POLICY IF EXISTS "Lojistas podem ver suas próprias respostas rápidas" ON public.store_quick_replies;
    DROP POLICY IF EXISTS "Lojistas podem inserir suas próprias respostas rápidas" ON public.store_quick_replies;
    DROP POLICY IF EXISTS "Lojistas podem atualizar suas próprias respostas rápidas" ON public.store_quick_replies;
    DROP POLICY IF EXISTS "Lojistas podem deletar suas próprias respostas rápidas" ON public.store_quick_replies;
    
    -- Recriar políticas corretas
    CREATE POLICY "Lojistas podem ver suas próprias respostas rápidas" ON public.store_quick_replies FOR SELECT USING (auth.uid() = store_id);
    CREATE POLICY "Lojistas podem inserir suas próprias respostas rápidas" ON public.store_quick_replies FOR INSERT WITH CHECK (auth.uid() = store_id);
    CREATE POLICY "Lojistas podem atualizar suas próprias respostas rápidas" ON public.store_quick_replies FOR UPDATE USING (auth.uid() = store_id);
    CREATE POLICY "Lojistas podem deletar suas próprias respostas rápidas" ON public.store_quick_replies FOR DELETE USING (auth.uid() = store_id);
END $$;

-- RPC Segura para buscar loja por slug (Acesso Público Controlado) - CRÍTICO PARA O CHAT DO VISITANTE
CREATE OR REPLACE FUNCTION public_get_store_by_slug(p_city_slug text, p_store_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Permite executar como owner, ignorando RLS da tabela user_profiles para quem chama
AS $$
DECLARE
    v_store record;
BEGIN
    SELECT 
        id, store_name, store_logo_url, cover_url, is_open, 
        phone_number, whatsapp_number, description,
        store_address_street, store_address_number, store_address_district, store_address_city, store_address_state,
        receive_orders_via_whatsapp, receive_orders_via_platform,
        city, state, store_address_zip,
        payment_methods, delivery_settings, store_slug, city_slug
    INTO v_store
    FROM user_profiles
    WHERE city_slug = p_city_slug 
      AND store_slug = p_store_slug
      AND role = 'store_partner'
    LIMIT 1;

    RETURN row_to_json(v_store);
END;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public_get_store_by_slug(text, text) TO anon, authenticated, service_role;
