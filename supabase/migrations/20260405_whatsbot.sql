CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.whatsbot_settings (
    store_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    custom_message TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsbot_sessions (
    store_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    connection_status TEXT NOT NULL DEFAULT 'DISCONNECTED',
    session_data JSONB,
    connected_phone TEXT,
    last_connected_at TIMESTAMPTZ,
    last_disconnect_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsbot_send_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    contact_phone TEXT NOT NULL,
    contact_jid TEXT NOT NULL,
    send_date_local DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved',
    message_source TEXT NOT NULL,
    message_body TEXT,
    inbound_message_id TEXT,
    sent_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT whatsbot_send_history_unique_day UNIQUE (store_id, contact_phone, send_date_local),
    CONSTRAINT whatsbot_send_history_status_chk CHECK (status IN ('reserved', 'sent', 'failed')),
    CONSTRAINT whatsbot_send_history_source_chk CHECK (message_source IN ('custom', 'catalog_default'))
);

CREATE INDEX IF NOT EXISTS idx_whatsbot_settings_enabled ON public.whatsbot_settings (enabled);
CREATE INDEX IF NOT EXISTS idx_whatsbot_sessions_status ON public.whatsbot_sessions (connection_status);
CREATE INDEX IF NOT EXISTS idx_whatsbot_send_history_lookup ON public.whatsbot_send_history (store_id, contact_phone, send_date_local DESC);

ALTER TABLE public.whatsbot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsbot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsbot_send_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store manages own whatsbot settings" ON public.whatsbot_settings;
CREATE POLICY "Store manages own whatsbot settings"
ON public.whatsbot_settings
FOR ALL
USING (auth.uid() = store_id)
WITH CHECK (auth.uid() = store_id);

DROP POLICY IF EXISTS "Store manages own whatsbot sessions" ON public.whatsbot_sessions;
CREATE POLICY "Store manages own whatsbot sessions"
ON public.whatsbot_sessions
FOR ALL
USING (auth.uid() = store_id)
WITH CHECK (auth.uid() = store_id);

DROP POLICY IF EXISTS "Store manages own whatsbot history" ON public.whatsbot_send_history;
CREATE POLICY "Store manages own whatsbot history"
ON public.whatsbot_send_history
FOR ALL
USING (auth.uid() = store_id)
WITH CHECK (auth.uid() = store_id);

GRANT ALL ON public.whatsbot_settings TO authenticated, service_role;
GRANT ALL ON public.whatsbot_sessions TO authenticated, service_role;
GRANT ALL ON public.whatsbot_send_history TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reserve_whatsbot_daily_send(
    p_store_id UUID,
    p_contact_phone TEXT,
    p_contact_jid TEXT,
    p_send_date_local DATE,
    p_message_source TEXT,
    p_message_body TEXT,
    p_inbound_message_id TEXT DEFAULT NULL
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
        now(),
        now()
    )
    ON CONFLICT (store_id, contact_phone, send_date_local)
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
     LIMIT 1;

    RETURN QUERY
    SELECT FALSE, v_row.id, v_row.status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reserve_whatsbot_daily_send(UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT) TO authenticated, service_role;
