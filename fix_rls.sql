-- RLS Policies for store_quick_replies
ALTER TABLE store_quick_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for own store quick replies" ON store_quick_replies
    FOR SELECT
    USING (auth.uid() = store_id);

CREATE POLICY "Enable insert access for own store quick replies" ON store_quick_replies
    FOR INSERT
    WITH CHECK (auth.uid() = store_id);

CREATE POLICY "Enable update access for own store quick replies" ON store_quick_replies
    FOR UPDATE
    USING (auth.uid() = store_id);

CREATE POLICY "Enable delete access for own store quick replies" ON store_quick_replies
    FOR DELETE
    USING (auth.uid() = store_id);

-- RPC Segura para buscar loja por slug (Acesso Público Controlado)
CREATE OR REPLACE FUNCTION public_get_store_by_slug(p_city_slug text, p_store_slug text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_store record;
BEGIN
    SELECT 
        id, store_name, store_logo_url, cover_url, is_open, 
        phone_number, whatsapp_number, description,
        store_address_street, store_address_number, store_address_district, store_address_city, store_address_state,
        receive_orders_via_whatsapp, receive_orders_via_platform
    INTO v_store
    FROM user_profiles
    WHERE city_slug = p_city_slug 
      AND store_slug = p_store_slug
      AND role = 'store_partner'
    LIMIT 1;

    RETURN row_to_json(v_store);
END;
$$;
