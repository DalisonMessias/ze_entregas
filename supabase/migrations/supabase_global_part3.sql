-- Adição de campos de endereço ao perfil do usuário para preenchimento automático
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'address_complement') THEN
        ALTER TABLE public.user_profiles ADD COLUMN address_complement TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'address_reference') THEN
        ALTER TABLE public.user_profiles ADD COLUMN address_reference TEXT;
    END IF;
END $$;
