-- ==================================================================
-- 0.x EXTENSIONS E CONFIGURAÇÕES GERAIS
-- ==================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Função genérica para atualizar 'updated_at' automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';


-- ==================================================================
-- 1.x ENUMS
-- ==================================================================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('admin', 'store_partner', 'delivery_partner', 'delivery_person');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.user_status AS ENUM ('active', 'banned', 'pending');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.partner_request_status AS ENUM ('PENDING', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'RETURNING', 'AWAITING_STORE_DECISION');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM ('PIX', 'CREDIT_CARD', 'BOLETO', 'CASH');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payout_method_type AS ENUM ('PIX', 'BANK_TRANSFER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.vehicle_type AS ENUM ('moto', 'car', 'bike', 'other');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.document_type AS ENUM ('CNH', 'CRLV', 'VEHICLE_PHOTO', 'ADDRESS_PROOF', 'SELFIE', 'PERSONAL_ID');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payout_day_of_week AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.content_status AS ENUM ('draft', 'published', 'disabled');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.institutional_page_key AS ENUM ('faq', 'solutions', 'benefits', 'about');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'institutional_page_key'::regtype AND enumlabel = 'landing') THEN
    ALTER TYPE public.institutional_page_key ADD VALUE 'landing';
  END IF;
END $$;

DO $$ BEGIN
    CREATE TYPE public.loan_status AS ENUM ('VENCIDO', 'PAGO', 'EM_DIA');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.work_shift_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM ('PENDING', 'NEW', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.blitz_alert_type AS ENUM ('BLITZ', 'ACCIDENT', 'TRAFFIC', 'DANGER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.support_status_override_type AS ENUM ('AUTO', 'OPEN', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.city_request_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.chat_message_type AS ENUM ('ORDER', 'SUPPORT');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.document_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.referral_status AS ENUM ('PENDING', 'REWARDED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.shipping_rule_type AS ENUM ('free_above', 'fixed_rate');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.yield_frequency_type AS ENUM ('daily', 'weekly', 'monthly');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.interest_type_type AS ENUM ('simple', 'compound');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.change_policy_type AS ENUM ('keep_previous', 'migrate_new');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.card_status AS ENUM ('ACTIVE', 'BLOCKED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.fraud_alert_type AS ENUM ('BLITZ', 'MULTIPLE_ACCOUNTS', 'FAKE_DOCUMENT', 'SUSPICIOUS_ACTIVITY');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.fraud_alert_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.fraud_alert_status AS ENUM ('OPEN', 'RESOLVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.claim_status AS ENUM ('open', 'resolved', 'closed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.rating_direction AS ENUM ('STORE_TO_PARTNER', 'PARTNER_TO_STORE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.blacklist_status AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.terminal_status AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.fee_payer_type AS ENUM ('MERCHANT', 'CUSTOMER');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_type AS ENUM ('CREDIT', 'DEBIT', 'LOAN', 'REPAYMENT', 'PAYOUT', 'ADJUSTMENT', 'TRANSFER', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_status AS ENUM ('PENDING', 'COMPLETED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==================================================================
-- 2.x TABELAS
-- ==================================================================

-- Tabela de perfis de usuários (EXISTENTE - ESQUELETO, sendo completado)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY, -- Assumindo que o ID do perfil de usuário é o mesmo do auth.users
    email TEXT UNIQUE,
    name TEXT,
    phone_number TEXT,
    cpf TEXT UNIQUE,
    city TEXT,
    avatar_url TEXT,
    is_available BOOLEAN DEFAULT FALSE, -- Usado para status de entregador
    vehicle_type public.vehicle_type,
    vehicle_plate TEXT,
    vehicle_model TEXT,
    vehicle_year TEXT,
    verification_status TEXT DEFAULT 'NOT_SUBMITTED', -- 'NOT_SUBMITTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
    partner_level TEXT, -- Nível de parceiro
    is_active BOOLEAN DEFAULT TRUE,
    is_super_store BOOLEAN DEFAULT FALSE,
    association_code TEXT UNIQUE,
    share_phone_offline BOOLEAN DEFAULT FALSE,
    role public.user_role DEFAULT 'delivery_person'::public.user_role,
    status public.user_status DEFAULT 'active'::public.user_status,
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    last_known_location GEOMETRY(Point, 4326), -- Para localização de entregadores
    bank_details JSONB, -- Detalhes bancários (UserBankDetails)
    automatic_payouts_enabled BOOLEAN DEFAULT FALSE,
    preferred_payout_method_type public.payout_method_type,
    contact_email TEXT,
    opening_hours TEXT,
    address_zip TEXT,
    address_street TEXT,
    address_number TEXT,
    address_district TEXT,
    address_state TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    store_name TEXT,
    store_document TEXT
);
CREATE INDEX IF NOT EXISTS user_profiles_city_idx ON public.user_profiles (city);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles (role);
CREATE INDEX IF NOT EXISTS user_profiles_status_idx ON public.user_profiles (status);
CREATE INDEX IF NOT EXISTS user_profiles_verification_status_idx ON public.user_profiles (verification_status);
CREATE INDEX IF NOT EXISTS user_profiles_is_available_idx ON public.user_profiles (is_available);
CREATE INDEX IF NOT EXISTS user_profiles_association_code_idx ON public.user_profiles (association_code);
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER handle_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;

-- Função para verificar se o usuário é administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') = 'admin',
    false
  )
$$ LANGUAGE sql STABLE;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Admins can manage user profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage user profiles" ON public.user_profiles
    FOR ALL USING (public.is_admin());

-- Trigger para criar perfil de usuário após AUTH
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, avatar_url, role, phone_number, cpf, city, store_name, store_document, address_street, address_number, address_district, address_zip, address_state)
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
    NEW.raw_user_meta_data->>'address_state'
  );

  -- Se for lojista, criar carteira
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'delivery_person') = 'store_partner' THEN
      INSERT INTO public.store_wallets (store_id, balance_decimal)
      VALUES (NEW.id, 0)
      ON CONFLICT (store_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabela de terminais de usuário (POS físico ou virtual)
CREATE TABLE IF NOT EXISTS public.user_terminals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    terminal_id TEXT UNIQUE, -- ID físico/lógico do terminal
    api_key TEXT UNIQUE, -- Chave de API para integração do terminal
    status public.terminal_status NOT NULL DEFAULT 'ACTIVE',
    activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at TIMESTAMPTZ,
    label VARCHAR(255),
    fee_payer public.fee_payer_type DEFAULT 'MERCHANT',
    pin_code TEXT, -- PIN para ativar/desativar/usar o terminal
    auto_lock_minutes INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_terminals_user_id_idx ON public.user_terminals (user_id);
CREATE INDEX IF NOT EXISTS user_terminals_terminal_id_idx ON public.user_terminals (terminal_id);
DROP TRIGGER IF EXISTS handle_user_terminals_updated_at ON public.user_terminals;
CREATE TRIGGER handle_user_terminals_updated_at BEFORE UPDATE ON public.user_terminals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.user_terminals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own terminals" ON public.user_terminals;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own terminals' AND tablename = 'user_terminals') THEN
        CREATE POLICY "Users can manage their own terminals" ON public.user_terminals FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all user terminals" ON public.user_terminals;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all user terminals' AND tablename = 'user_terminals') THEN
        CREATE POLICY "Admins can manage all user terminals" ON public.user_terminals FOR ALL USING (public.is_admin());

-- Tabela de tags institucionais;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.institutional_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_institutional_tags_updated_at ON public.institutional_tags;
CREATE TRIGGER handle_institutional_tags_updated_at BEFORE UPDATE ON public.institutional_tags
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.institutional_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read institutional tags" ON public.institutional_tags;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read institutional tags' AND tablename = 'institutional_tags') THEN
        CREATE POLICY "Public can read institutional tags" ON public.institutional_tags FOR SELECT USING (true);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage institutional tags" ON public.institutional_tags;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage institutional tags' AND tablename = 'institutional_tags') THEN
        CREATE POLICY "Admins can manage institutional tags" ON public.institutional_tags FOR ALL USING (public.is_admin());

-- Tabela de categorias institucionais;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.institutional_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_institutional_categories_updated_at ON public.institutional_categories;
CREATE TRIGGER handle_institutional_categories_updated_at BEFORE UPDATE ON public.institutional_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.institutional_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read institutional categories" ON public.institutional_categories;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read institutional categories' AND tablename = 'institutional_categories') THEN
        CREATE POLICY "Public can read institutional categories" ON public.institutional_categories FOR SELECT USING (true);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage institutional categories" ON public.institutional_categories;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage institutional categories' AND tablename = 'institutional_categories') THEN
        CREATE POLICY "Admins can manage institutional categories" ON public.institutional_categories FOR ALL USING (public.is_admin());

-- Tabela de categorias de produtos;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_categories_updated_at ON public.categories;
CREATE TRIGGER handle_categories_updated_at BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read categories' AND tablename = 'categories') THEN
        CREATE POLICY "Public can read categories" ON public.categories FOR SELECT USING (true);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage categories' AND tablename = 'categories') THEN
        CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.is_admin());

-- Tabela de produtos;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    stock_quantity INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products (category_id);
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products (is_active);
DROP TRIGGER IF EXISTS handle_products_updated_at ON public.products;
CREATE TRIGGER handle_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
DROP POLICY IF EXISTS "Public can read active products" ON public.products;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read active products' AND tablename = 'products') THEN
        CREATE POLICY "Public can read active products" ON public.products FOR SELECT USING (is_active = TRUE OR public.is_admin());
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage products' AND tablename = 'products') THEN
        CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (
            public.is_admin() OR 
            EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
        );
    END IF;
END $$;


-- Tabela para logs de erro do cliente;

CREATE TABLE IF NOT EXISTS public.client_error_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    category VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_error_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated access to client_error_logs" ON public.client_error_logs;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated access to client_error_logs' AND tablename = 'client_error_logs') THEN
        CREATE POLICY "Allow authenticated access to client_error_logs" ON public.client_error_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
GRANT SELECT, INSERT ON public.client_error_logs TO authenticated;
-- Tabela de configurações PWA;
CREATE TABLE IF NOT EXISTS public.pwa_settings (
    id TEXT PRIMARY KEY DEFAULT '1', -- Assumindo uma única linha de configurações
    display_name VARCHAR(255),
    short_name VARCHAR(255),
    description TEXT,
    theme_color VARCHAR(7),
    background_color VARCHAR(7),
    start_url VARCHAR(255),
    orientation VARCHAR(50),
    language VARCHAR(10),
    app_version INT,
    -- Novos campos para personalização completa
    scope VARCHAR(255) DEFAULT '/',
    icons JSONB DEFAULT '[]'::jsonb, -- Array de ícones
    screenshots JSONB DEFAULT '[]'::jsonb, -- Array de screenshots
    shortcuts JSONB DEFAULT '[]'::jsonb, -- Array de atalhos
    categories TEXT[] DEFAULT ARRAY[]::TEXT[],
    iarc_rating_id VARCHAR(255),
    related_applications JSONB DEFAULT '[]'::jsonb,
    prefer_related_applications BOOLEAN DEFAULT FALSE,
    custom_splash_screens JSONB DEFAULT '[]'::jsonb,
    status_bar_color VARCHAR(7), -- Cor da barra de status (pode ser diferente do theme_color)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir que colunas existam caso a tabela já tenha sido criada anteriormente (abordagem aditiva)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'scope') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN scope VARCHAR(255) DEFAULT '/';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'icons') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN icons JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'screenshots') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN screenshots JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'shortcuts') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN shortcuts JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'categories') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN categories TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'iarc_rating_id') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN iarc_rating_id VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'related_applications') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN related_applications JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'prefer_related_applications') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN prefer_related_applications BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'custom_splash_screens') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN custom_splash_screens JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'status_bar_color') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN status_bar_color VARCHAR(7);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'display') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN display VARCHAR(20) DEFAULT 'standalone';
    END IF;
END $$;
ALTER TABLE public.pwa_settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read pwa_settings' AND tablename = 'pwa_settings') THEN
        CREATE POLICY "Public can read pwa_settings" ON public.pwa_settings FOR SELECT USING (true);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage pwa_settings' AND tablename = 'pwa_settings') THEN
        CREATE POLICY "Admins can manage pwa_settings" ON public.pwa_settings FOR ALL USING (public.is_admin());
    END IF;
END $$;
DROP TRIGGER IF EXISTS handle_pwa_settings_updated_at ON public.pwa_settings;
CREATE TRIGGER handle_pwa_settings_updated_at BEFORE UPDATE ON public.pwa_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.pwa_settings (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.pwa_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pwa_settings TO authenticated;


-- Tabela de transações de terminal de usuário (POS)
CREATE TABLE IF NOT EXISTS public.user_terminal_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    terminal_id UUID NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_offline_sync BOOLEAN DEFAULT FALSE,
    merchant_user_id UUID NOT NULL,
    payer_id UUID,
    -- Chave estrangeira para user_terminals
    CONSTRAINT fk_terminal
        FOREIGN KEY (terminal_id)
        REFERENCES public.user_terminals (id)
        ON DELETE CASCADE,
    -- Chave estrangeira para user_profiles (comerciante)
    CONSTRAINT fk_merchant_user
        FOREIGN KEY (merchant_user_id)
        REFERENCES public.user_profiles (id)
        ON DELETE CASCADE,
    -- Chave estrangeira para user_profiles (pagador)
    CONSTRAINT fk_payer_user
        FOREIGN KEY (payer_id)
        REFERENCES public.user_profiles (id)
        ON DELETE SET NULL
);
ALTER TABLE public.user_terminal_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can create transactions" ON public.user_terminal_transactions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create transactions' AND tablename = 'user_terminal_transactions') THEN
        CREATE POLICY "Authenticated users can create transactions" ON public.user_terminal_transactions FOR INSERT WITH CHECK (auth.uid() = merchant_user_id OR auth.uid() = payer_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Users can view their own terminal transactions" ON public.user_terminal_transactions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own terminal transactions' AND tablename = 'user_terminal_transactions') THEN
        CREATE POLICY "Users can view their own terminal transactions" ON public.user_terminal_transactions FOR SELECT USING (auth.uid() = merchant_user_id OR auth.uid() = payer_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all terminal transactions" ON public.user_terminal_transactions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all terminal transactions' AND tablename = 'user_terminal_transactions') THEN
        CREATE POLICY "Admins can manage all terminal transactions" ON public.user_terminal_transactions FOR ALL USING (public.is_admin());

-- Tabela para simulações de vendas (compatível com SalesSimulation);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.sales_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    sale_value NUMERIC(10, 2) NOT NULL,
    fee_payer TEXT NOT NULL,
    gross_value NUMERIC(10, 2) NOT NULL,
    net_value NUMERIC(10, 2) NOT NULL,
    fees NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sales_simulations_user_id_idx ON public.sales_simulations (user_id);
ALTER TABLE public.sales_simulations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own sales simulations" ON public.sales_simulations;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own sales simulations' AND tablename = 'sales_simulations') THEN
        CREATE POLICY "Users manage their own sales simulations" ON public.sales_simulations FOR ALL USING (auth.uid() = user_id);

-- Tabela para rotas salvas (compatível com SavedRoute);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.saved_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    waypoints TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    distance NUMERIC(10, 2),
    duration NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS saved_routes_user_id_idx ON public.saved_routes (user_id);
ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own saved routes" ON public.saved_routes;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users manage their own saved routes' AND tablename = 'saved_routes') THEN
        CREATE POLICY "Users manage their own saved routes" ON public.saved_routes FOR ALL USING (auth.uid() = user_id);


-- Tabela de configurações de manutenção (EXISTENTE) - Renomeada para manter consistência;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.maintenance_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    title VARCHAR(255) NOT NULL DEFAULT 'Manutenção Programada',
    message TEXT NOT NULL DEFAULT 'Estamos realizando melhorias em nosso sistema. Voltaremos em breve!',
    scheduled_downtime TIMESTAMPTZ,
    estimated_recovery_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS maintenance_settings_is_enabled_idx ON public.maintenance_settings (is_enabled);
DROP TRIGGER IF EXISTS handle_maintenance_updated_at ON public.maintenance_settings;
CREATE TRIGGER handle_maintenance_updated_at BEFORE UPDATE ON public.maintenance_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.maintenance_settings (id, is_enabled, title, message)
VALUES (
    'e6e7d8f9-0a1b-4c2d-3e4f-5a6b7c8d9e0f',
    FALSE,
    'Manutenção Programada',
    'Estamos realizando melhorias em nosso sistema. Voltaremos em breve!'
)
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read maintenance settings" ON public.maintenance_settings;
CREATE POLICY "Public can read maintenance settings" ON public.maintenance_settings
    FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage maintenance settings" ON public.maintenance_settings;
CREATE POLICY "Admins can manage maintenance settings" ON public.maintenance_settings
    FOR ALL USING (public.is_admin());

-- View de compatibilidade esperada pelo frontend: system_maintenance
-- Mapeia os campos usados na UI para os nomes presentes na tabela
CREATE OR REPLACE VIEW public.system_maintenance AS
SELECT
  is_enabled AS is_active,
  COALESCE(to_char(scheduled_downtime, 'HH24:MI'), '') AS start_time,
  COALESCE(to_char(estimated_recovery_time, 'HH24:MI'), '') AS end_time,
  message
FROM public.maintenance_settings
ORDER BY updated_at DESC
LIMIT 1;

GRANT SELECT ON public.system_maintenance TO anon, authenticated;


-- Tabela de cache de ruas e bairros (EXISTENTE)
CREATE TABLE IF NOT EXISTS public.streets_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_display_name VARCHAR(255) NOT NULL UNIQUE,
    streets_list TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    neighborhoods_list TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS streets_cache_city_display_name_idx ON public.streets_cache (city_display_name);
CREATE INDEX IF NOT EXISTS streets_cache_expires_at_idx ON public.streets_cache (expires_at);
DROP TRIGGER IF EXISTS handle_streets_cache_updated_at ON public.streets_cache;
CREATE TRIGGER handle_streets_cache_updated_at BEFORE UPDATE ON public.streets_cache
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.streets_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read streets cache" ON public.streets_cache;
CREATE POLICY "Public can read streets cache" ON public.streets_cache
    FOR SELECT USING (true);

-- Tabela de avatares (para armazenamento de arquivos, via storage.from('avatars'))
CREATE TABLE IF NOT EXISTS public.avatars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_avatar_for_user UNIQUE (user_id) -- Apenas um avatar por usuário
);
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON public.avatars;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own avatar' AND tablename = 'avatars') THEN
        CREATE POLICY "Users can upload their own avatar" ON public.avatars FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Users can update their own avatar" ON public.avatars;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own avatar' AND tablename = 'avatars') THEN
        CREATE POLICY "Users can update their own avatar" ON public.avatars FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON public.avatars;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own avatar' AND tablename = 'avatars') THEN
        CREATE POLICY "Users can delete their own avatar" ON public.avatars FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Public can read avatars" ON public.avatars;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read avatars' AND tablename = 'avatars') THEN
        CREATE POLICY "Public can read avatars" ON public.avatars FOR SELECT USING (true);


-- Tabela de turnos de trabalho de entregadores;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.work_shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status public.work_shift_status NOT NULL,
    breaks JSONB[] DEFAULT ARRAY[]::JSONB[], -- [{ start: TIMESTAMPTZ, end: TIMESTAMPTZ }]
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS work_shifts_partner_id_idx ON public.work_shifts (partner_id);
CREATE INDEX IF NOT EXISTS work_shifts_status_idx ON public.work_shifts (status);
DROP TRIGGER IF EXISTS handle_work_shifts_updated_at ON public.work_shifts;
CREATE TRIGGER handle_work_shifts_updated_at BEFORE UPDATE ON public.work_shifts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.work_shifts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_shifts TO authenticated;
DROP POLICY IF EXISTS "Partners can manage their own work_shifts" ON public.work_shifts;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Partners can manage their own work_shifts' AND tablename = 'work_shifts') THEN
        CREATE POLICY "Partners can manage their own work_shifts" ON public.work_shifts FOR ALL USING (auth.uid() = partner_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can view all work_shifts" ON public.work_shifts;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all work_shifts' AND tablename = 'work_shifts') THEN
        CREATE POLICY "Admins can view all work_shifts" ON public.work_shifts FOR SELECT USING (public.is_admin());

-- Tabela de pedidos;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE, -- Loja que criou o pedido
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Usuário que fez o pedido (se aplicável)
    status public.order_status NOT NULL,
    items JSONB[] NOT NULL DEFAULT ARRAY[]::JSONB[], -- [{ product_id, name, quantity, price }]
    total_price NUMERIC(10, 2) NOT NULL,
    payment_method public.payment_method NOT NULL,
    asaas_pix_copy_paste TEXT,
    asaas_bank_slip_url TEXT,
    shipping_address JSONB, -- Endereço de entrega
    payment_details JSONB, -- Detalhes adicionais do pagamento
    shipping_cost NUMERIC(10, 2),
    discount NUMERIC(10, 2) DEFAULT 0,
    coupon_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS orders_store_id_idx ON public.orders (store_id);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
CREATE TRIGGER handle_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store owners can manage their own orders" ON public.orders;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can manage their own orders' AND tablename = 'orders') THEN
        CREATE POLICY "Store owners can manage their own orders" ON public.orders FOR ALL USING (auth.uid() = store_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own orders' AND tablename = 'orders') THEN
        CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all orders' AND tablename = 'orders') THEN
        CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (public.is_admin());


-- Tabela de backups de usuário;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.user_backups (
    user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_user_backups_updated_at ON public.user_backups;
CREATE TRIGGER handle_user_backups_updated_at BEFORE UPDATE ON public.user_backups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.user_backups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own backups" ON public.user_backups;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own backups' AND tablename = 'user_backups') THEN
        CREATE POLICY "Users can manage their own backups" ON public.user_backups FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can view all backups" ON public.user_backups;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all backups' AND tablename = 'user_backups') THEN
        CREATE POLICY "Admins can view all backups" ON public.user_backups FOR SELECT USING (public.is_admin());


-- Tabela de notificações de aplicativo para usuários;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_notifications_user_id_idx ON public.user_notifications (user_id);
CREATE INDEX IF NOT EXISTS user_notifications_is_read_idx ON public.user_notifications (is_read);
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.user_notifications;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own notifications' AND tablename = 'user_notifications') THEN
        CREATE POLICY "Users can manage their own notifications" ON public.user_notifications FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.user_notifications;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all notifications' AND tablename = 'user_notifications') THEN
        CREATE POLICY "Admins can manage all notifications" ON public.user_notifications FOR ALL USING (public.is_admin());


-- Tabela de histórico manual de entregas de motoristas;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.driver_manual_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    summary_json JSONB NOT NULL, -- Contém a estrutura de DeliveryRecord
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driver_manual_histories_user_id_idx ON public.driver_manual_histories (user_id);
CREATE INDEX IF NOT EXISTS driver_manual_histories_date_idx ON public.driver_manual_histories (date);
ALTER TABLE public.driver_manual_histories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can manage their own manual histories" ON public.driver_manual_histories;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can manage their own manual histories' AND tablename = 'driver_manual_histories') THEN
        CREATE POLICY "Drivers can manage their own manual histories" ON public.driver_manual_histories FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can view all driver manual histories" ON public.driver_manual_histories;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all driver manual histories' AND tablename = 'driver_manual_histories') THEN
        CREATE POLICY "Admins can view all driver manual histories" ON public.driver_manual_histories FOR SELECT USING (public.is_admin());


-- Tabela de alertas Blitz (incidentes);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.blitz_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    type public.blitz_alert_type NOT NULL,
    lat NUMERIC(9, 6) NOT NULL,
    lng NUMERIC(9, 6) NOT NULL,
    city VARCHAR(255),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blitz_alerts_user_id_idx ON public.blitz_alerts (user_id);
CREATE INDEX IF NOT EXISTS blitz_alerts_location_idx ON public.blitz_alerts USING GIST (ST_SetSRID(ST_MakePoint(lng, lat), 4326));
ALTER TABLE public.blitz_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can insert blitz alerts" ON public.blitz_alerts;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert blitz alerts' AND tablename = 'blitz_alerts') THEN
        CREATE POLICY "Authenticated users can insert blitz alerts" ON public.blitz_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Public can read blitz alerts" ON public.blitz_alerts;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read blitz alerts' AND tablename = 'blitz_alerts') THEN
        CREATE POLICY "Public can read blitz alerts" ON public.blitz_alerts FOR SELECT USING (true);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage blitz alerts" ON public.blitz_alerts;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage blitz alerts' AND tablename = 'blitz_alerts') THEN
        CREATE POLICY "Admins can manage blitz alerts" ON public.blitz_alerts FOR ALL USING (public.is_admin());


-- Tabela de produtos da loja;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    stock_quantity INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON public.products (category_id);
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products (is_active);
DROP TRIGGER IF EXISTS handle_products_updated_at ON public.products;
CREATE TRIGGER handle_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read active products" ON public.products;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read active products' AND tablename = 'products') THEN
        CREATE POLICY "Public can read active products" ON public.products FOR SELECT USING (is_active = TRUE);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Tabela de configurações da loja (geral);

CREATE TABLE IF NOT EXISTS public.shop_settings (
    id TEXT PRIMARY KEY DEFAULT '1', -- Assumindo uma única linha
    is_shop_enabled BOOLEAN DEFAULT FALSE,
    shop_name VARCHAR(255),
    shop_city VARCHAR(255),
    banner_title VARCHAR(255),
    banner_subtitle VARCHAR(255),
    banner_tag VARCHAR(255),
    shipping_origin_cep VARCHAR(10),
    free_shipping_threshold NUMERIC(10, 2),
    payment_methods JSONB DEFAULT '{ "pix": false, "boleto": false, "credit_card": false }'::jsonb,
    coupons JSONB[] DEFAULT ARRAY[]::JSONB[], -- Array of ShopCoupon
    social_media JSONB, -- { instagram, facebook, linkedin, twitter }
    company_info JSONB, -- CompanyInfo, incluindo loan_config
    support_phone VARCHAR(20),
    support_hours_start VARCHAR(5),
    support_hours_end VARCHAR(5),
    support_status_override public.support_status_override_type,
    asaas_active BOOLEAN DEFAULT FALSE,
    asaas_api_key TEXT,
    asaas_webhook_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_shop_settings_updated_at ON public.shop_settings;
CREATE TRIGGER handle_shop_settings_updated_at BEFORE UPDATE ON public.shop_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.shop_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shop_settings TO authenticated;
DROP POLICY IF EXISTS "Public can read shop_settings" ON public.shop_settings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read shop_settings' AND tablename = 'shop_settings') THEN
        CREATE POLICY "Public can read shop_settings" ON public.shop_settings FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage shop_settings" ON public.shop_settings;
CREATE POLICY "Admins can manage shop_settings" ON public.shop_settings FOR ALL USING (
    public.is_admin() OR 
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
);

INSERT INTO public.shop_settings (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;


-- Tabela de requisições de parceiros (entregas);

CREATE TABLE IF NOT EXISTS public.partner_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    pickup_address TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    distance_km NUMERIC(10, 2) NOT NULL,
    total_charged_store NUMERIC(10, 2) NOT NULL,
    net_value_partner NUMERIC(10, 2) NOT NULL,
    status public.partner_request_status NOT NULL,
    failure_reason TEXT,
    delivery_code TEXT, -- Código de 4 dígitos para confirmação de entrega
    expires_at TIMESTAMPTZ, -- Para requisições que expiram se não aceitas
    fee_fixed NUMERIC(10, 2),
    fee_percent_value NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_requests_store_id_idx ON public.partner_requests (store_id);
CREATE INDEX IF NOT EXISTS partner_requests_partner_id_idx ON public.partner_requests (partner_id);
CREATE INDEX IF NOT EXISTS partner_requests_status_idx ON public.partner_requests (status);
DROP TRIGGER IF EXISTS handle_partner_requests_updated_at ON public.partner_requests;
CREATE TRIGGER handle_partner_requests_updated_at BEFORE UPDATE ON public.partner_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store owners can manage their own requests" ON public.partner_requests;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can manage their own requests' AND tablename = 'partner_requests') THEN
        CREATE POLICY "Store owners can manage their own requests" ON public.partner_requests FOR ALL USING (auth.uid() = store_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Partners can view and accept available requests" ON public.partner_requests;
CREATE POLICY "Partners can view and accept available requests" ON public.partner_requests FOR SELECT USING (
    status = 'PENDING' OR auth.uid() = partner_id
);
DROP POLICY IF EXISTS "Partners can update their accepted requests" ON public.partner_requests;
CREATE POLICY "Partners can update their accepted requests" ON public.partner_requests FOR UPDATE USING (
    auth.uid() = partner_id AND status IN ('ACCEPTED', 'IN_TRANSIT', 'RETURNING')
);
DROP POLICY IF EXISTS "Admins can manage all partner requests" ON public.partner_requests;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all partner requests' AND tablename = 'partner_requests') THEN
        CREATE POLICY "Admins can manage all partner requests" ON public.partner_requests FOR ALL USING (public.is_admin());


-- Tabela de parceiros de entrega associados a lojas;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.store_delivery_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    fee NUMERIC(5, 2) DEFAULT 0, -- Taxa percentual específica para este parceiro/loja
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_partner UNIQUE (store_id, partner_id)
);
CREATE INDEX IF NOT EXISTS store_delivery_partners_store_id_idx ON public.store_delivery_partners (store_id);
CREATE INDEX IF NOT EXISTS store_delivery_partners_partner_id_idx ON public.store_delivery_partners (partner_id);
ALTER TABLE public.store_delivery_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store owners can manage their associated partners" ON public.store_delivery_partners;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can manage their associated partners' AND tablename = 'store_delivery_partners') THEN
        CREATE POLICY "Store owners can manage their associated partners" ON public.store_delivery_partners FOR ALL USING (auth.uid() = store_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Partners can view their associated stores" ON public.store_delivery_partners;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Partners can view their associated stores' AND tablename = 'store_delivery_partners') THEN
        CREATE POLICY "Partners can view their associated stores" ON public.store_delivery_partners FOR SELECT USING (auth.uid() = partner_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all store_delivery_partners" ON public.store_delivery_partners;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all store_delivery_partners' AND tablename = 'store_delivery_partners') THEN
        CREATE POLICY "Admins can manage all store_delivery_partners" ON public.store_delivery_partners FOR ALL USING (public.is_admin());

-- Política para permitir que parceiros leiam perfis com base em associação ou visibilidade pública;
    END IF;
END $$;
DROP POLICY IF EXISTS "Partners and stores can view associated profiles" ON public.user_profiles;
CREATE POLICY "Partners and stores can view associated profiles" ON public.user_profiles
    FOR SELECT USING (
        -- Usuários podem ver o próprio perfil (Regra Absoluta)
        auth.uid() = id
        -- Lojistas podem ver perfis de entregadores associados
        OR (
             EXISTS (
                SELECT 1 FROM public.store_delivery_partners sdp
                WHERE sdp.store_id = auth.uid() AND sdp.partner_id = id
            )
             AND (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') = 'store_partner'
        )
        -- Entregadores podem ver perfis de lojistas associados
        OR (
             EXISTS (
                SELECT 1 FROM public.store_delivery_partners sdp
                WHERE sdp.store_id = id AND sdp.partner_id = auth.uid()
            )
             AND (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') = 'delivery_partner'
        )
        -- Admin pode ver tudo
        OR public.is_admin()
    );


-- Tabela de carteiras de loja
CREATE TABLE IF NOT EXISTS public.store_wallets (
    store_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    balance_decimal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_store_wallets_updated_at ON public.store_wallets;
CREATE TRIGGER handle_store_wallets_updated_at BEFORE UPDATE ON public.store_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.store_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store owners can view and manage their own wallet" ON public.store_wallets;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can view and manage their own wallet' AND tablename = 'store_wallets') THEN
        CREATE POLICY "Store owners can view and manage their own wallet" ON public.store_wallets FOR ALL USING (auth.uid() = store_id);
    END IF;
    -- Política de backup para garantir SELECT explícito se o ALL falhar em alguns contextos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can select their own wallet' AND tablename = 'store_wallets') THEN
        CREATE POLICY "Store owners can select their own wallet" ON public.store_wallets FOR SELECT USING (auth.uid() = store_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all store wallets" ON public.store_wallets;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all store wallets' AND tablename = 'store_wallets') THEN
        CREATE POLICY "Admins can manage all store wallets" ON public.store_wallets FOR ALL USING (public.is_admin());
    END IF;
END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_wallets TO authenticated;

-- Tabela de notícias da plataforma;

CREATE TABLE IF NOT EXISTS public.platform_news (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon_name VARCHAR(255),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_news_is_active_idx ON public.platform_news (is_active);
CREATE INDEX IF NOT EXISTS platform_news_sort_order_idx ON public.platform_news (sort_order);
DROP TRIGGER IF EXISTS handle_platform_news_updated_at ON public.platform_news;
CREATE TRIGGER handle_platform_news_updated_at BEFORE UPDATE ON public.platform_news
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.platform_news ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.platform_news TO anon, authenticated;
DROP POLICY IF EXISTS "Public can read active platform news" ON public.platform_news;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read active platform news' AND tablename = 'platform_news') THEN
        CREATE POLICY "Public can read active platform news" ON public.platform_news FOR SELECT TO anon, authenticated USING (is_active = TRUE);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage platform news' AND tablename = 'platform_news') THEN
        CREATE POLICY "Admins can manage platform news" ON public.platform_news FOR ALL USING (public.is_admin());


-- Tabela de cidades disponíveis;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.available_cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_city_state UNIQUE (name, state)
);
CREATE INDEX IF NOT EXISTS available_cities_name_idx ON public.available_cities (name);
CREATE INDEX IF NOT EXISTS available_cities_is_active_idx ON public.available_cities (is_active);
DROP TRIGGER IF EXISTS handle_available_cities_updated_at ON public.available_cities;
CREATE TRIGGER handle_available_cities_updated_at BEFORE UPDATE ON public.available_cities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.available_cities ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.available_cities TO anon, authenticated;
DROP POLICY IF EXISTS "Public can read available cities" ON public.available_cities;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read available cities' AND tablename = 'available_cities') THEN
        CREATE POLICY "Public can read available cities" ON public.available_cities FOR SELECT TO anon, authenticated USING (is_active = TRUE);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage available cities' AND tablename = 'available_cities') THEN
        CREATE POLICY "Admins can manage available cities" ON public.available_cities FOR ALL USING (public.is_admin());


-- Tabela de requisições de novas cidades;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.city_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_name VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    status public.city_request_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_email TEXT
);
CREATE INDEX IF NOT EXISTS city_requests_status_idx ON public.city_requests (status);
DROP TRIGGER IF EXISTS handle_city_requests_updated_at ON public.city_requests;
CREATE TRIGGER handle_city_requests_updated_at BEFORE UPDATE ON public.city_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.city_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can insert city requests" ON public.city_requests;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert city requests' AND tablename = 'city_requests') THEN
        CREATE POLICY "Authenticated users can insert city requests" ON public.city_requests FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage city requests" ON public.city_requests;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage city requests' AND tablename = 'city_requests') THEN
        CREATE POLICY "Admins can manage city requests" ON public.city_requests FOR ALL USING (public.is_admin());


-- Tabela de mensagens de chat;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    type public.chat_message_type NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_sender_id_idx ON public.chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS chat_messages_receiver_id_idx ON public.chat_messages (receiver_id);
CREATE INDEX IF NOT EXISTS chat_messages_order_id_idx ON public.chat_messages (order_id);
CREATE INDEX IF NOT EXISTS chat_messages_type_idx ON public.chat_messages (type);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can manage their own chat messages" ON public.chat_messages FOR ALL USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id
);
DROP POLICY IF EXISTS "Admins can manage all chat messages" ON public.chat_messages;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all chat messages' AND tablename = 'chat_messages') THEN
        CREATE POLICY "Admins can manage all chat messages" ON public.chat_messages FOR ALL USING (public.is_admin());


-- Tabela de documentos de parceiros (CNH, CRLV, etc.);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.partner_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    document_type public.document_type NOT NULL,
    file_url TEXT NOT NULL,
    status public.document_status NOT NULL DEFAULT 'PENDING',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_user_document_type UNIQUE (user_id, document_type)
);
CREATE INDEX IF NOT EXISTS partner_documents_user_id_idx ON public.partner_documents (user_id);
CREATE INDEX IF NOT EXISTS partner_documents_status_idx ON public.partner_documents (status);
DROP TRIGGER IF EXISTS handle_partner_documents_updated_at ON public.partner_documents;
CREATE TRIGGER handle_partner_documents_updated_at BEFORE UPDATE ON public.partner_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own partner documents" ON public.partner_documents;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own partner documents' AND tablename = 'partner_documents') THEN
        CREATE POLICY "Users can manage their own partner documents" ON public.partner_documents FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all partner documents" ON public.partner_documents;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all partner documents' AND tablename = 'partner_documents') THEN
        CREATE POLICY "Admins can manage all partner documents" ON public.partner_documents FOR ALL USING (public.is_admin());


-- Tabela de referências/indicações;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    referrer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    code_used TEXT NOT NULL,
    status public.referral_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_referred_user UNIQUE (referred_id)
);
CREATE INDEX IF NOT EXISTS referrals_referrer_id_idx ON public.referrals (referrer_id);
CREATE INDEX IF NOT EXISTS referrals_referred_id_idx ON public.referrals (referred_id);
CREATE INDEX IF NOT EXISTS referrals_code_used_idx ON public.referrals (code_used);
DROP TRIGGER IF EXISTS handle_referrals_updated_at ON public.referrals;
CREATE TRIGGER handle_referrals_updated_at BEFORE UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own referrals" ON public.referrals;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own referrals' AND tablename = 'referrals') THEN
        CREATE POLICY "Users can view their own referrals" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Authenticated users can insert referrals" ON public.referrals;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert referrals' AND tablename = 'referrals') THEN
        CREATE POLICY "Authenticated users can insert referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all referrals" ON public.referrals;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all referrals' AND tablename = 'referrals') THEN
        CREATE POLICY "Admins can manage all referrals" ON public.referrals FOR ALL USING (public.is_admin());


-- Tabela de regras de frete de loja;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.store_shipping_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    rule_type public.shipping_rule_type NOT NULL,
    value NUMERIC(10, 2) NOT NULL,
    threshold NUMERIC(10, 2), -- Usado para 'free_above'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_shipping_rules_store_id_idx ON public.store_shipping_rules (store_id);
DROP TRIGGER IF EXISTS handle_store_shipping_rules_updated_at ON public.store_shipping_rules;
CREATE TRIGGER handle_store_shipping_rules_updated_at BEFORE UPDATE ON public.store_shipping_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.store_shipping_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store owners can manage their own shipping rules" ON public.store_shipping_rules;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can manage their own shipping rules' AND tablename = 'store_shipping_rules') THEN
        CREATE POLICY "Store owners can manage their own shipping rules" ON public.store_shipping_rules FOR ALL USING (auth.uid() = store_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Public can read shipping rules for stores" ON public.store_shipping_rules;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read shipping rules for stores' AND tablename = 'store_shipping_rules') THEN
        CREATE POLICY "Public can read shipping rules for stores" ON public.store_shipping_rules FOR SELECT USING (true);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all shipping rules" ON public.store_shipping_rules;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all shipping rules' AND tablename = 'store_shipping_rules') THEN
        CREATE POLICY "Admins can manage all shipping rules" ON public.store_shipping_rules FOR ALL USING (public.is_admin());


-- Tabela de configurações do Cofrinho (investimento);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.cofrinho_settings (
    id TEXT PRIMARY KEY DEFAULT '1', -- Assumindo uma única linha
    yield_frequency public.yield_frequency_type NOT NULL,
    interest_type public.interest_type_type NOT NULL,
    rate_percent NUMERIC(5, 2) NOT NULL,
    min_lock_days INT NOT NULL,
    allow_early_withdrawal BOOLEAN NOT NULL,
    penalty_percent NUMERIC(5, 2) NOT NULL,
    min_deposit NUMERIC(10, 2) NOT NULL,
    formula_script TEXT,
    change_policy public.change_policy_type NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_cofrinho_settings_updated_at ON public.cofrinho_settings;
CREATE TRIGGER handle_cofrinho_settings_updated_at BEFORE UPDATE ON public.cofrinho_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.cofrinho_settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read cofrinho settings' AND tablename = 'cofrinho_settings') THEN
        CREATE POLICY "Public can read cofrinho settings" ON public.cofrinho_settings FOR SELECT USING (true);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage cofrinho settings' AND tablename = 'cofrinho_settings') THEN
        CREATE POLICY "Admins can manage cofrinho settings" ON public.cofrinho_settings FOR ALL USING (public.is_admin());
INSERT INTO public.cofrinho_settings (id, yield_frequency, interest_type, rate_percent, min_lock_days, allow_early_withdrawal, penalty_percent, min_deposit, change_policy)
VALUES ('1', 'monthly', 'compound', 0.5, 30, FALSE, 10.0, 50.0, 'migrate_new')
ON CONFLICT (id) DO NOTHING;


-- Tabela de cartões Zebank (virtuais/físicos de parceiros);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.zebank_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    card_number TEXT NOT NULL, -- Pode ser mascarado na aplicação
    card_last_four VARCHAR(4) NOT NULL,
    expiration_date VARCHAR(5) NOT NULL, -- MM/YY
    cvv VARCHAR(3) NOT NULL,
    card_holder VARCHAR(255) NOT NULL,
    status public.card_status NOT NULL DEFAULT 'ACTIVE',
    spending_limit_percent NUMERIC(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS zebank_cards_user_id_idx ON public.zebank_cards (user_id);
CREATE INDEX IF NOT EXISTS zebank_cards_status_idx ON public.zebank_cards (status);
DROP TRIGGER IF EXISTS handle_zebank_cards_updated_at ON public.zebank_cards;
CREATE TRIGGER handle_zebank_cards_updated_at BEFORE UPDATE ON public.zebank_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.zebank_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own Zebank cards" ON public.zebank_cards;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own Zebank cards' AND tablename = 'zebank_cards') THEN
        CREATE POLICY "Users can manage their own Zebank cards" ON public.zebank_cards FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all Zebank cards" ON public.zebank_cards;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all Zebank cards' AND tablename = 'zebank_cards') THEN
        CREATE POLICY "Admins can manage all Zebank cards" ON public.zebank_cards FOR ALL USING (public.is_admin());


-- Tabela de verificações de identidade;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.identity_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    location_data JSONB, -- { lat, lng, accuracy }
    status public.document_status NOT NULL DEFAULT 'PENDING',
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS identity_verifications_user_id_idx ON public.identity_verifications (user_id);
CREATE INDEX IF NOT EXISTS identity_verifications_status_idx ON public.identity_verifications (status);
DROP TRIGGER IF EXISTS handle_identity_verifications_updated_at ON public.identity_verifications;
CREATE TRIGGER handle_identity_verifications_updated_at BEFORE UPDATE ON public.identity_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own identity verifications" ON public.identity_verifications;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own identity verifications' AND tablename = 'identity_verifications') THEN
        CREATE POLICY "Users can manage their own identity verifications" ON public.identity_verifications FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all identity verifications" ON public.identity_verifications;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all identity verifications' AND tablename = 'identity_verifications') THEN
        CREATE POLICY "Admins can manage all identity verifications" ON public.identity_verifications FOR ALL USING (public.is_admin());


-- Tabela de alertas de fraude;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    type public.fraud_alert_type NOT NULL,
    description TEXT,
    severity public.fraud_alert_severity NOT NULL,
    status public.fraud_alert_status NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fraud_alerts_user_id_idx ON public.fraud_alerts (user_id);
CREATE INDEX IF NOT EXISTS fraud_alerts_status_idx ON public.fraud_alerts (status);
DROP TRIGGER IF EXISTS handle_fraud_alerts_updated_at ON public.fraud_alerts;
CREATE TRIGGER handle_fraud_alerts_updated_at BEFORE UPDATE ON public.fraud_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage fraud alerts" ON public.fraud_alerts;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage fraud alerts' AND tablename = 'fraud_alerts') THEN
        CREATE POLICY "Admins can manage fraud alerts" ON public.fraud_alerts FOR ALL USING (public.is_admin());


-- Tabela de chamados de suporte;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.support_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    user_email VARCHAR(255),
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    status public.claim_status NOT NULL DEFAULT 'open',
    admin_response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_claims_user_id_idx ON public.support_claims (user_id);
CREATE INDEX IF NOT EXISTS support_claims_status_idx ON public.support_claims (status);
DROP TRIGGER IF EXISTS handle_support_claims_updated_at ON public.support_claims;
CREATE TRIGGER handle_support_claims_updated_at BEFORE UPDATE ON public.support_claims
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.support_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own support claims" ON public.support_claims;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own support claims' AND tablename = 'support_claims') THEN
        CREATE POLICY "Users can manage their own support claims" ON public.support_claims FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all support claims" ON public.support_claims;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all support claims' AND tablename = 'support_claims') THEN
        CREATE POLICY "Admins can manage all support claims" ON public.support_claims FOR ALL USING (public.is_admin());


-- Tabela de configurações de taxas de parceiros;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.partner_fee_settings (
    id TEXT PRIMARY KEY DEFAULT '1', -- Assumindo uma única linha
    global_tax_fixed NUMERIC(10, 2),
    global_tax_percent NUMERIC(5, 2),
    base_delivery_value NUMERIC(10, 2),
    base_delivery_km NUMERIC(10, 2),
    extra_km_value NUMERIC(10, 2),
    additional_stop_fee NUMERIC(10, 2),
    weekday INT, -- 0=Sunday, 1=Monday...
    hour VARCHAR(5), -- HH:MM
    emergency_percentage NUMERIC(5, 2),
    emergency_cooldown_hours INT,
    emergency_enabled BOOLEAN DEFAULT FALSE,
    super_store_monthly_fee NUMERIC(10, 2),
    association_fee NUMERIC(10, 2),
    emergency_message TEXT,
    pos_min_value NUMERIC(10, 2),
    pos_max_value NUMERIC(10, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_partner_fee_settings_updated_at ON public.partner_fee_settings;
CREATE TRIGGER handle_partner_fee_settings_updated_at BEFORE UPDATE ON public.partner_fee_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.partner_fee_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read partner fee settings" ON public.partner_fee_settings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read partner fee settings' AND tablename = 'partner_fee_settings') THEN
        CREATE POLICY "Public can read partner fee settings" ON public.partner_fee_settings FOR SELECT USING (true);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage partner fee settings" ON public.partner_fee_settings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage partner fee settings' AND tablename = 'partner_fee_settings') THEN
        CREATE POLICY "Admins can manage partner fee settings" ON public.partner_fee_settings FOR ALL USING (public.is_admin());
INSERT INTO public.partner_fee_settings (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;


-- Tabela de avaliações de parceiros;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.partner_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    evaluated_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    direction public.rating_direction NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_ratings_evaluator_id_idx ON public.partner_ratings (evaluator_id);
CREATE INDEX IF NOT EXISTS partner_ratings_evaluated_id_idx ON public.partner_ratings (evaluated_id);
ALTER TABLE public.partner_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own ratings" ON public.partner_ratings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own ratings' AND tablename = 'partner_ratings') THEN
        CREATE POLICY "Users can view their own ratings" ON public.partner_ratings FOR SELECT USING (auth.uid() = evaluator_id OR auth.uid() = evaluated_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Authenticated users can insert partner ratings" ON public.partner_ratings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert partner ratings' AND tablename = 'partner_ratings') THEN
        CREATE POLICY "Authenticated users can insert partner ratings" ON public.partner_ratings FOR INSERT WITH CHECK (auth.uid() = evaluator_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all partner ratings" ON public.partner_ratings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all partner ratings' AND tablename = 'partner_ratings') THEN
        CREATE POLICY "Admins can manage all partner ratings" ON public.partner_ratings FOR ALL USING (public.is_admin());


-- Tabela de usuários na lista negra;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.blacklisted_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Pode ser NULL se o usuário não existir no sistema
    email VARCHAR(255),
    phone_number VARCHAR(20),
    reason TEXT NOT NULL,
    status public.blacklist_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_blacklisted_email UNIQUE (email),
    CONSTRAINT unique_blacklisted_phone UNIQUE (phone_number)
);
CREATE INDEX IF NOT EXISTS blacklisted_users_user_id_idx ON public.blacklisted_users (user_id);
CREATE INDEX IF NOT EXISTS blacklisted_users_email_idx ON public.blacklisted_users (email);
CREATE INDEX IF NOT EXISTS blacklisted_users_phone_number_idx ON public.blacklisted_users (phone_number);
DROP TRIGGER IF EXISTS handle_blacklisted_users_updated_at ON public.blacklisted_users;
CREATE TRIGGER handle_blacklisted_users_updated_at BEFORE UPDATE ON public.blacklisted_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.blacklisted_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage blacklisted users" ON public.blacklisted_users;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage blacklisted users' AND tablename = 'blacklisted_users') THEN
        CREATE POLICY "Admins can manage blacklisted users" ON public.blacklisted_users FOR ALL USING (public.is_admin());

-- Tabela de conteúdos institucionais (CMS);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.institutional_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    page_key public.institutional_page_key NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    slug VARCHAR(255) NOT NULL UNIQUE,
    status public.content_status NOT NULL DEFAULT 'draft',
    is_active BOOLEAN DEFAULT TRUE,
    category_id UUID REFERENCES public.institutional_categories(id) ON DELETE SET NULL,
    author_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    metadata JSONB,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS institutional_contents_page_key_idx ON public.institutional_contents (page_key);
CREATE INDEX IF NOT EXISTS institutional_contents_status_idx ON public.institutional_contents (status);
CREATE INDEX IF NOT EXISTS institutional_contents_is_active_idx ON public.institutional_contents (is_active);
CREATE INDEX IF NOT EXISTS institutional_contents_category_id_idx ON public.institutional_contents (category_id);
DROP TRIGGER IF EXISTS handle_institutional_contents_updated_at ON public.institutional_contents;
CREATE TRIGGER handle_institutional_contents_updated_at BEFORE UPDATE ON public.institutional_contents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.institutional_contents ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.institutional_contents TO anon, authenticated;
DROP POLICY IF EXISTS "Public can read published institutional content" ON public.institutional_contents;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read published institutional content' AND tablename = 'institutional_contents') THEN
        CREATE POLICY "Public can read published institutional content" ON public.institutional_contents FOR SELECT TO anon, authenticated USING (status = 'published' AND is_active = TRUE);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage institutional content" ON public.institutional_contents;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage institutional content' AND tablename = 'institutional_contents') THEN
        CREATE POLICY "Admins can manage institutional content" ON public.institutional_contents FOR ALL USING (public.is_admin());


-- Tabela de imagens de conteúdos institucionais;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.institutional_content_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES public.institutional_contents(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    alt_text VARCHAR(255),
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS institutional_content_images_content_id_idx ON public.institutional_content_images (content_id);
ALTER TABLE public.institutional_content_images ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read institutional content images" ON public.institutional_content_images;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read institutional content images' AND tablename = 'institutional_content_images') THEN
        CREATE POLICY "Public can read institutional content images" ON public.institutional_content_images FOR SELECT USING (true);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage institutional content images" ON public.institutional_content_images;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage institutional content images' AND tablename = 'institutional_content_images') THEN
        CREATE POLICY "Admins can manage institutional content images" ON public.institutional_content_images FOR ALL USING (public.is_admin());


-- Tabela de associação entre conteúdos institucionais e tags;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.institutional_content_tags (
    content_id UUID NOT NULL REFERENCES public.institutional_contents(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.institutional_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (content_id, tag_id)
);
CREATE INDEX IF NOT EXISTS institutional_content_tags_content_id_idx ON public.institutional_content_tags (content_id);
CREATE INDEX IF NOT EXISTS institutional_content_tags_tag_id_idx ON public.institutional_content_tags (tag_id);
ALTER TABLE public.institutional_content_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read institutional content tags" ON public.institutional_content_tags;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read institutional content tags' AND tablename = 'institutional_content_tags') THEN
        CREATE POLICY "Public can read institutional content tags" ON public.institutional_content_tags FOR SELECT USING (true);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage institutional content tags" ON public.institutional_content_tags;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage institutional content tags' AND tablename = 'institutional_content_tags') THEN
        CREATE POLICY "Admins can manage institutional content tags" ON public.institutional_content_tags FOR ALL USING (public.is_admin());

-- Tabela de versões de conteúdos institucionais (histórico);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.institutional_content_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_id UUID NOT NULL REFERENCES public.institutional_contents(id) ON DELETE CASCADE,
    version INT NOT NULL,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    CONSTRAINT unique_content_version UNIQUE (content_id, version)
);
CREATE INDEX IF NOT EXISTS institutional_content_versions_content_id_idx ON public.institutional_content_versions (content_id);
CREATE INDEX IF NOT EXISTS institutional_content_versions_created_by_idx ON public.institutional_content_versions (created_by);
ALTER TABLE public.institutional_content_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read institutional content versions" ON public.institutional_content_versions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read institutional content versions' AND tablename = 'institutional_content_versions') THEN
        CREATE POLICY "Admins can read institutional content versions" ON public.institutional_content_versions FOR SELECT USING (public.is_admin());


-- Tabela de níveis de parceiros;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.partner_levels (
    id TEXT PRIMARY KEY, -- Nível (ex: 'BRONZE', 'PRATA')
    display_name VARCHAR(255) NOT NULL,
    min_deliveries INT NOT NULL DEFAULT 0,
    min_rating NUMERIC(2, 1) NOT NULL DEFAULT 0.0,
    store_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    service_fee_reduction_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_partner_levels_updated_at ON public.partner_levels;
CREATE TRIGGER handle_partner_levels_updated_at BEFORE UPDATE ON public.partner_levels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.partner_levels ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read partner levels' AND tablename = 'partner_levels') THEN
        CREATE POLICY "Public can read partner levels" ON public.partner_levels FOR SELECT USING (true);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage partner levels' AND tablename = 'partner_levels') THEN
        CREATE POLICY "Admins can manage partner levels" ON public.partner_levels FOR ALL USING (public.is_admin());
-- Inserir níveis padrão se não existirem
INSERT INTO public.partner_levels (id, display_name, min_deliveries, min_rating, store_discount_percent, service_fee_reduction_percent) VALUES
('BRONZE', 'Bronze', 0, 0.0, 0.0, 0.0),
('SILVER', 'Prata', 50, 4.0, 2.0, 1.0),
('GOLD', 'Ouro', 200, 4.5, 5.0, 2.5),
('PLATINUM', 'Platina', 500, 4.8, 10.0, 5.0)
ON CONFLICT (id) DO NOTHING;


-- Tabela de configurações de repasse (payout);
    END IF;
END $$;
GRANT SELECT ON public.partner_levels TO anon, authenticated;
GRANT ALL ON public.partner_levels TO authenticated;
CREATE TABLE IF NOT EXISTS public.payout_settings (
    id TEXT PRIMARY KEY DEFAULT '1', -- Assumindo uma única linha
    min_payout_amount NUMERIC(10, 2) DEFAULT 0.00,
    automatic_payouts_enabled BOOLEAN DEFAULT FALSE,
    payout_day_of_week public.payout_day_of_week,
    payout_time VARCHAR(5), -- HH:MM
    default_payout_method_type public.payout_method_type,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_payout_settings_updated_at ON public.payout_settings;
CREATE TRIGGER handle_payout_settings_updated_at BEFORE UPDATE ON public.payout_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.payout_settings ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read payout settings' AND tablename = 'payout_settings') THEN
        CREATE POLICY "Public can read payout settings" ON public.payout_settings FOR SELECT USING (true);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage payout settings' AND tablename = 'payout_settings') THEN
        CREATE POLICY "Admins can manage payout settings" ON public.payout_settings FOR ALL USING (public.is_admin());
INSERT INTO public.payout_settings (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;


-- Tabela de pagamentos de parceiros (para repasses);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.partner_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status public.payment_status NOT NULL,
    transaction_details JSONB, -- Detalhes da transação, ex: asaas_response
    asaas_transaction_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_payments_partner_id_idx ON public.partner_payments (partner_id);
CREATE INDEX IF NOT EXISTS partner_payments_status_idx ON public.partner_payments (status);
DROP TRIGGER IF EXISTS handle_partner_payments_updated_at ON public.partner_payments;
CREATE TRIGGER handle_partner_payments_updated_at BEFORE UPDATE ON public.partner_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.partner_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Partners can view their own payments" ON public.partner_payments;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Partners can view their own payments' AND tablename = 'partner_payments') THEN
        CREATE POLICY "Partners can view their own payments" ON public.partner_payments FOR SELECT USING (auth.uid() = partner_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all partner payments" ON public.partner_payments;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all partner payments' AND tablename = 'partner_payments') THEN
        CREATE POLICY "Admins can manage all partner payments" ON public.partner_payments FOR ALL USING (public.is_admin());


-- Tabela de transações da carteira da loja (inclui empréstimos);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.store_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    type public.transaction_type NOT NULL,
    status public.transaction_status NOT NULL DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_wallet_transactions_store_id_idx ON public.store_wallet_transactions (store_id);
CREATE INDEX IF NOT EXISTS store_wallet_transactions_type_idx ON public.store_wallet_transactions (type);
CREATE INDEX IF NOT EXISTS store_wallet_transactions_status_idx ON public.store_wallet_transactions (status);
DROP TRIGGER IF EXISTS handle_store_wallet_transactions_updated_at ON public.store_wallet_transactions;
CREATE TRIGGER handle_store_wallet_transactions_updated_at BEFORE UPDATE ON public.store_wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.store_wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store owners can view their own wallet transactions" ON public.store_wallet_transactions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can view their own wallet transactions' AND tablename = 'store_wallet_transactions') THEN
        CREATE POLICY "Store owners can view their own wallet transactions" ON public.store_wallet_transactions FOR ALL USING (auth.uid() = store_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all store wallet transactions" ON public.store_wallet_transactions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all store wallet transactions' AND tablename = 'store_wallet_transactions') THEN
        CREATE POLICY "Admins can manage all store wallet transactions" ON public.store_wallet_transactions FOR ALL USING (public.is_admin());


-- Tabela de configurações de webhooks Asaas;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.asaas_webhook_settings (
    id TEXT PRIMARY KEY DEFAULT '1', -- Assumindo uma única linha
    active_events TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_asaas_webhook_settings_updated_at ON public.asaas_webhook_settings;
CREATE TRIGGER handle_asaas_webhook_settings_updated_at BEFORE UPDATE ON public.asaas_webhook_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.asaas_webhook_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage asaas webhook settings" ON public.asaas_webhook_settings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage asaas webhook settings' AND tablename = 'asaas_webhook_settings') THEN
        CREATE POLICY "Admins can manage asaas webhook settings" ON public.asaas_webhook_settings FOR ALL USING (public.is_admin());
INSERT INTO public.asaas_webhook_settings (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;


-- Tabela de logs de webhooks Asaas;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.asaas_webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    action_taken TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS asaas_webhook_logs_event_type_idx ON public.asaas_webhook_logs (event_type);
CREATE INDEX IF NOT EXISTS asaas_webhook_logs_status_idx ON public.asaas_webhook_logs (status);
ALTER TABLE public.asaas_webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can read asaas webhook logs" ON public.asaas_webhook_logs;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can read asaas webhook logs' AND tablename = 'asaas_webhook_logs') THEN
        CREATE POLICY "Admins can read asaas webhook logs" ON public.asaas_webhook_logs FOR SELECT USING (public.is_admin());

-- Tabela para cartões virtuais de loja;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.store_virtual_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    card_number TEXT NOT NULL,
    card_last_four VARCHAR(4) NOT NULL,
    expiration_date VARCHAR(5) NOT NULL, -- MM/YY
    cvv VARCHAR(3) NOT NULL,
    card_holder VARCHAR(255) NOT NULL,
    status public.card_status NOT NULL DEFAULT 'ACTIVE',
    spending_limit_percent NUMERIC(5, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_virtual_cards_store_id_idx ON public.store_virtual_cards (store_id);
CREATE INDEX IF NOT EXISTS store_virtual_cards_status_idx ON public.store_virtual_cards (status);
DROP TRIGGER IF EXISTS handle_store_virtual_cards_updated_at ON public.store_virtual_cards;
CREATE TRIGGER handle_store_virtual_cards_updated_at BEFORE UPDATE ON public.store_virtual_cards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.store_virtual_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store owners can manage their own virtual cards" ON public.store_virtual_cards;
CREATE POLICY "Store owners can manage their own virtual cards" ON public.store_virtual_cards
    FOR ALL USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins can manage all store virtual cards" ON public.store_virtual_cards;
CREATE POLICY "Admins can manage all store virtual cards" ON public.store_virtual_cards
    FOR ALL USING (public.is_admin());

-- Tabela para carteiras de entregadores (Zebank)
CREATE TABLE IF NOT EXISTS public.driver_wallets (
    driver_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    balance_decimal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_driver_wallets_updated_at ON public.driver_wallets;
CREATE TRIGGER handle_driver_wallets_updated_at BEFORE UPDATE ON public.driver_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.driver_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can access their own wallet" ON public.driver_wallets;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can access their own wallet' AND tablename = 'driver_wallets') THEN
        CREATE POLICY "Drivers can access their own wallet" ON public.driver_wallets FOR ALL USING (auth.uid() = driver_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all driver wallets" ON public.driver_wallets;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all driver wallets' AND tablename = 'driver_wallets') THEN
        CREATE POLICY "Admins can manage all driver wallets" ON public.driver_wallets FOR ALL USING (public.is_admin());

-- Tabela para transações da carteira de entregadores (Zebank);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.driver_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT,
    type public.transaction_type NOT NULL,
    status public.transaction_status NOT NULL DEFAULT 'COMPLETED',
    related_request_id UUID REFERENCES public.partner_requests(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driver_wallet_transactions_driver_id_idx ON public.driver_wallet_transactions (driver_id);
DROP TRIGGER IF EXISTS handle_driver_wallet_transactions_updated_at ON public.driver_wallet_transactions;
CREATE TRIGGER handle_driver_wallet_transactions_updated_at BEFORE UPDATE ON public.driver_wallet_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.driver_wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can view their own wallet transactions" ON public.driver_wallet_transactions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can view their own wallet transactions' AND tablename = 'driver_wallet_transactions') THEN
        CREATE POLICY "Drivers can view their own wallet transactions" ON public.driver_wallet_transactions FOR ALL USING (auth.uid() = driver_id);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all driver wallet transactions" ON public.driver_wallet_transactions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all driver wallet transactions' AND tablename = 'driver_wallet_transactions') THEN
        CREATE POLICY "Admins can manage all driver wallet transactions" ON public.driver_wallet_transactions FOR ALL USING (public.is_admin());

-- Tabela de API Keys;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid NOT NULL DEFAULT gen_random_uuid (),
  service_name character varying(100) NOT NULL,
  encrypted_key text NOT NULL,
  is_active boolean NULL DEFAULT true,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  constraint api_keys_pkey primary key (id),
  constraint api_keys_service_name_key unique (service_name)
);
-- RLS para api_keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage API keys" ON public.api_keys;
CREATE POLICY "Admins can manage API keys" ON public.api_keys
    FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Authenticated users can read API keys" ON public.api_keys;
CREATE POLICY "Authenticated users can read API keys" ON public.api_keys
    FOR SELECT USING (auth.role() = 'authenticated');
-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER handle_api_keys_updated_at BEFORE UPDATE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
GRANT SELECT, INSERT, UPDATE ON public.support_claims TO authenticated;
GRANT SELECT ON public.api_keys TO authenticated;
GRANT SELECT ON public.api_keys TO anon;

-- ==================================================================
-- 3.x FUNÇÕES (DO BANCO)
-- ==================================================================

CREATE OR REPLACE FUNCTION public.resolve_login_email(identifier TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
  v_clean_identifier TEXT := regexp_replace(identifier, '\D', '', 'g');
BEGIN
  SELECT email
  INTO v_email
  FROM public.user_profiles
  WHERE
    lower(email) = lower(identifier)
    OR association_code = identifier
    OR (
      phone_number IS NOT NULL
      AND regexp_replace(phone_number, '\D', '', 'g') = v_clean_identifier
    )
    OR (
      cpf IS NOT NULL
      AND regexp_replace(cpf, '\D', '', 'g') = v_clean_identifier
    );
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_my_role_and_status()
RETURNS TABLE (role public.user_role, status public.user_status) AS $$
BEGIN
  RETURN QUERY
    SELECT COALESCE(up.role, 'delivery_person'::public.user_role),
           COALESCE(up.status, 'active'::public.user_status)
    FROM public.user_profiles up
    WHERE up.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_my_role_and_status() TO authenticated;

-- Função: get_partner_financial_summary
CREATE OR REPLACE FUNCTION public.get_partner_financial_summary()
RETURNS TABLE (total_earnings NUMERIC, available_balance NUMERIC, max_emergency_value NUMERIC, emergency_message TEXT) AS $$
DECLARE
  v_role public.user_role;
  v_user UUID := auth.uid();
  v_emergency_msg TEXT;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = v_user;
  SELECT emergency_message INTO v_emergency_msg FROM public.partner_fee_settings ORDER BY updated_at DESC LIMIT 1;

  IF v_role = 'store_partner' THEN
    RETURN QUERY
      SELECT
        COALESCE((SELECT SUM(CASE WHEN status ILIKE '%APPROVED%' OR status ILIKE '%COMPLETED%' THEN amount ELSE 0 END)
                  FROM public.user_terminal_transactions WHERE merchant_user_id = v_user), 0)::NUMERIC AS total_earnings,
        COALESCE((SELECT balance_decimal FROM public.store_wallets WHERE store_id = v_user), 0)::NUMERIC AS available_balance,
        0::NUMERIC AS max_emergency_value,
        v_emergency_msg::TEXT AS emergency_message;
  ELSE
    RETURN QUERY
      SELECT
        COALESCE((SELECT SUM(net_value_partner) FROM public.partner_requests WHERE partner_id = v_user AND status = 'COMPLETED'), 0)::NUMERIC,
        0::NUMERIC,
        0::NUMERIC,
        v_emergency_msg::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: create_order
CREATE OR REPLACE FUNCTION public.create_order(order_details JSONB)
RETURNS JSONB AS $$
DECLARE
    new_order public.orders;
BEGIN
    INSERT INTO public.orders (
        store_id,
        user_id,
        status,
        items,
        total_price,
        payment_method,
        shipping_address,
        payment_details,
        shipping_cost,
        discount,
        coupon_code
    )
    VALUES (
        (order_details->>'store_id')::UUID,
        auth.uid(),
        'PENDING',
        (order_details->'items')::JSONB[],
        (order_details->>'total_price')::NUMERIC,
        (order_details->>'payment_method')::public.payment_method,
        (order_details->'shipping_address')::JSONB,
        (order_details->'payment_details')::JSONB,
        (order_details->>'shipping_cost')::NUMERIC,
        (order_details->>'discount')::NUMERIC,
        order_details->>'coupon_code'
    ) RETURNING * INTO new_order;

    RETURN to_jsonb(new_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: create_recharge_charge
CREATE OR REPLACE FUNCTION public.create_recharge_charge(amount NUMERIC, method TEXT)
RETURNS JSONB AS $$
BEGIN
  -- A lógica real que chama a API do Asaas deve ser em uma Edge Function por segurança.
  -- Esta função pode registrar a intenção e retornar um ID para a Edge Function.
  RETURN jsonb_build_object(
    'message', 'Not implemented: Asaas API calls should be handled via Edge Functions for security.',
    'asaas_pix_copy_paste', 'mock_pix_key_123',
    'asaas_bank_slip_url', 'https://mock.asaas.com/boleto/123'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: store_decide_failed_delivery
CREATE OR REPLACE FUNCTION public.store_decide_failed_delivery(request_id UUID, decision TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.partner_requests
  SET status = CASE WHEN LOWER(decision) = 'refund' THEN 'CANCELLED' ELSE 'RETURNING' END,
      updated_at = now()
  WHERE id = request_id AND store_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: submit_rating
CREATE OR REPLACE FUNCTION public.submit_rating(request_id UUID, rating INT, comment TEXT, direction TEXT)
RETURNS VOID AS $$
DECLARE
  v_req RECORD;
  v_evaluator_id UUID := auth.uid();
  v_evaluated_id UUID;
  v_dir public.rating_direction := direction::public.rating_direction;
BEGIN
  IF rating < 1 OR rating > 5 THEN
    RAISE EXCEPTION 'Invalid rating value. Must be between 1 and 5.';
  END IF;

  SELECT * INTO v_req FROM public.partner_requests WHERE id = request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found.'; END IF;

  IF v_dir = 'STORE_TO_PARTNER' THEN
    IF v_req.store_id != v_evaluator_id THEN RAISE EXCEPTION 'Only the store can rate the partner for this request.'; END IF;
    v_evaluated_id := v_req.partner_id;
  ELSE -- PARTNER_TO_STORE
    IF v_req.partner_id != v_evaluator_id THEN RAISE EXCEPTION 'Only the partner can rate the store for this request.'; END IF;
    v_evaluated_id := v_req.store_id;
  END IF;
  
  IF v_evaluated_id IS NULL THEN RAISE EXCEPTION 'Cannot rate as the evaluated user is not defined.'; END IF;

  INSERT INTO public.partner_ratings(evaluator_id, evaluated_id, rating, comment, direction)
  VALUES (v_evaluator_id, v_evaluated_id, rating, comment, v_dir);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_partner_requests_available
CREATE OR REPLACE FUNCTION public.get_partner_requests_available()
RETURNS SETOF public.partner_requests AS $$
BEGIN

    RETURN QUERY
    SELECT * FROM public.partner_requests
    WHERE status = 'PENDING' 
      AND (expires_at IS NULL OR expires_at > now())
      AND (partner_id IS NULL OR partner_id = auth.uid()) -- Visibilidade: Pública (NULL) ou Direcionada (Meu ID)
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: accept_partner_request
CREATE OR REPLACE FUNCTION public.accept_partner_request(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
  v_partner UUID := auth.uid();
BEGIN
  UPDATE public.partner_requests
  SET partner_id = v_partner, status = 'ACCEPTED', updated_at = now()
  WHERE id = p_request_id AND status = 'PENDING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: partner_confirm_pickup
CREATE OR REPLACE FUNCTION public.partner_confirm_pickup(p_request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.partner_requests
  SET status = 'IN_TRANSIT', updated_at = now()
  WHERE id = p_request_id AND partner_id = auth.uid() AND status = 'ACCEPTED';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: partner_confirm_delivery
CREATE OR REPLACE FUNCTION public.partner_confirm_delivery(request_id UUID, p_delivery_code TEXT)
RETURNS VOID AS $$
DECLARE
  v_code TEXT;
BEGIN
  SELECT delivery_code INTO v_code FROM public.partner_requests WHERE id = request_id;
  IF v_code IS NULL OR v_code <> p_delivery_code THEN
    RAISE EXCEPTION 'Invalid delivery code';
  END IF;
  UPDATE public.partner_requests
  SET status = 'COMPLETED', updated_at = now()
  WHERE id = request_id AND partner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: confirm_return
CREATE OR REPLACE FUNCTION public.confirm_return(request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.partner_requests
  SET status = 'CANCELLED', updated_at = now()
  WHERE id = request_id AND store_id = auth.uid() AND status = 'RETURNING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: request_emergency_payout
CREATE OR REPLACE FUNCTION public.request_emergency_payout(payout_details JSONB)
RETURNS VOID AS $$
BEGIN
  -- Lógica a ser implementada, provavelmente envolvendo inserção em partner_payments
  -- e uma chamada de webhook para um processador de pagamento.
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: associate_partner_to_store
CREATE OR REPLACE FUNCTION public.associate_partner_to_store(p_partner_id UUID, p_fee NUMERIC)
RETURNS VOID AS $$
DECLARE
  v_store_id UUID := auth.uid();
BEGIN
  INSERT INTO public.store_delivery_partners (store_id, partner_id, fee)
  VALUES (v_store_id, p_partner_id, p_fee)
  ON CONFLICT (store_id, partner_id) DO UPDATE SET fee = p_fee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_partner_associated_stores
CREATE OR REPLACE FUNCTION public.get_partner_associated_stores()
RETURNS TABLE (id UUID, name TEXT, city TEXT, avatar_url TEXT) AS $$
DECLARE
    v_partner_id UUID := auth.uid();
BEGIN
  RETURN QUERY
    SELECT p.id, p.name, p.city, p.avatar_url
    FROM public.user_profiles p
    JOIN public.store_delivery_partners sdp ON sdp.store_id = p.id
    WHERE sdp.partner_id = v_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: create_partner_request
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
RETURNS JSONB AS $$
DECLARE
    v_store_id UUID := auth.uid();
    v_delivery_code TEXT;
    v_new_request_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Gerar código de entrega único
    v_delivery_code := '#' || LPAD(FLOOR(random() * 10000)::int::text, 4, '0');

    -- Definir tempo de expiração se for para a plataforma
    IF p_request_type = 'PLATFORM' THEN
        v_expires_at := now() + interval '5 minutes';
    ELSE
        v_expires_at := NULL;
    END IF;

    -- Lógica de taxas: Se for ASSOCIATE, taxas da plataforma são ZERO.
    -- Se for PLATFORM, usa as taxas configuradas.
    IF p_request_type = 'ASSOCIATE' THEN
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
            expires_at
        )
        VALUES (
            v_store_id,
            p_pickup_address,
            p_delivery_address,
            p_distance_km,
            p_total_charged_store,
            p_net_value_partner,
            0, -- Taxa fixa ZERO para entregador próprio
            0, -- Taxa percentual ZERO para entregador próprio
            p_target_partner_id,
            'PENDING'::public.partner_request_status,
            v_delivery_code,
            v_expires_at
        ) RETURNING id INTO v_new_request_id;
    ELSE
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
            expires_at
        )
        VALUES (
            v_store_id,
            p_pickup_address,
            p_delivery_address,
            p_distance_km,
            p_total_charged_store,
            p_net_value_partner,
            (p_fees->>'global_tax_fixed')::NUMERIC,
            (p_fees->>'global_tax_percent')::NUMERIC * p_net_value_partner,
            p_target_partner_id,
            'PENDING'::public.partner_request_status,
            v_delivery_code,
            v_expires_at
        ) RETURNING id INTO v_new_request_id;
    END IF;

    RETURN jsonb_build_object(
        'requestId', v_new_request_id,
        'deliveryCode', v_delivery_code,
        'expiresAt', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: record_store_loan
CREATE OR REPLACE FUNCTION public.record_store_loan(p_amount NUMERIC)
RETURNS VOID AS $$
DECLARE
    v_store_id UUID := auth.uid();
    v_loan_amount NUMERIC := -ABS(p_amount);
BEGIN
    -- Inserir transação de empréstimo
    INSERT INTO public.store_wallet_transactions(store_id, amount, description, type, status)
    VALUES (v_store_id, v_loan_amount, 'Empréstimo para Capital de Giro', 'LOAN', 'PENDING');

    -- Atualizar o saldo da carteira da loja
    INSERT INTO public.store_wallets (store_id, balance_decimal)
    VALUES (v_store_id, v_loan_amount)
    ON CONFLICT (store_id) DO UPDATE
    SET balance_decimal = public.store_wallets.balance_decimal + v_loan_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_public_fee_settings
CREATE OR REPLACE FUNCTION public.get_public_fee_settings()
RETURNS SETOF public.partner_fee_settings AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.partner_fee_settings ORDER BY updated_at DESC LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: auto_cancel_unaccepted_request
CREATE OR REPLACE FUNCTION public.auto_cancel_unaccepted_request(p_request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.partner_requests
  SET status = 'EXPIRED', updated_at = now()
  WHERE id = p_request_id AND status IN ('PENDING', 'AWAITING_STORE_DECISION');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: process_city_request
CREATE OR REPLACE FUNCTION public.process_city_request(request_id UUID, new_status TEXT)
RETURNS VOID AS $$
DECLARE
  v_req RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;

  SELECT * INTO v_req FROM public.city_requests WHERE id = request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'City request % not found', request_id;
  END IF;

  UPDATE public.city_requests SET status = new_status::public.city_request_status, updated_at = now() WHERE id = request_id;

  IF new_status = 'APPROVED' THEN
    INSERT INTO public.available_cities (name, state, is_active)
    VALUES (v_req.city_name, v_req.state, TRUE)
    ON CONFLICT (name, state) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_admin_dashboard_stats
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS JSONB AS $$ -- Retorna JSONB para AdminDashboardStats complexo
DECLARE
  v_today DATE := CURRENT_DATE;
  v_orders_today INT;
  v_orders_week INT;
  v_orders_month INT;
  v_orders_total INT;
  v_gmv NUMERIC;
  v_platform_revenue NUMERIC;
  v_avg_ticket NUMERIC;
  v_stores_active INT;
  v_stores_total INT;
  v_drivers_online INT;
  v_drivers_total INT;
BEGIN
  SELECT COUNT(*) INTO v_orders_today FROM public.orders WHERE created_at::date = v_today;
  SELECT COUNT(*) INTO v_orders_week FROM public.orders WHERE created_at >= date_trunc('week', v_today);
  SELECT COUNT(*) INTO v_orders_month FROM public.orders WHERE created_at >= date_trunc('month', v_today);
  SELECT COUNT(*) INTO v_orders_total FROM public.orders;
  SELECT COALESCE(SUM(total_price), 0) INTO v_gmv FROM public.orders WHERE status <> 'CANCELLED';
  SELECT COALESCE(AVG(total_price), 0) INTO v_avg_ticket FROM public.orders WHERE status <> 'CANCELLED';
  v_platform_revenue := 0; -- Lógica de cálculo de receita precisa ser definida
  SELECT COUNT(*) INTO v_stores_total FROM public.user_profiles WHERE role = 'store_partner';
  SELECT COUNT(*) INTO v_stores_active FROM public.user_profiles WHERE role = 'store_partner' AND is_active = TRUE;
  SELECT COUNT(*) INTO v_drivers_total FROM public.user_profiles WHERE role IN ('delivery_partner','delivery_person');
  SELECT COUNT(*) INTO v_drivers_online FROM public.user_profiles WHERE role IN ('delivery_partner','delivery_person') AND is_available = TRUE;

  RETURN jsonb_build_object(
    'orders', jsonb_build_object(
      'today', v_orders_today, 'week', v_orders_week, 'month', v_orders_month, 'total', v_orders_total,
      'graphData', COALESCE((SELECT jsonb_agg(jsonb_build_object('date', to_char(d, 'YYYY-MM-DD'), 'count',
        (SELECT COUNT(*) FROM public.orders o WHERE o.created_at::date = d)))
        FROM generate_series(v_today - interval '6 day', v_today, interval '1 day') AS d), '[]'::jsonb)
    ),
    'finance', jsonb_build_object('gmv', v_gmv, 'platformRevenue', v_platform_revenue, 'averageTicket', v_avg_ticket),
    'users', jsonb_build_object('stores', jsonb_build_object('active', v_stores_active, 'total', v_stores_total),
                                'drivers', jsonb_build_object('online', v_drivers_online, 'total', v_drivers_total))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_my_referral_data
CREATE OR REPLACE FUNCTION public.get_my_referral_data()
RETURNS JSONB AS $$ -- Retorna JSONB para ReferralData complexo
DECLARE
  v_code TEXT;
BEGIN
  SELECT association_code INTO v_code FROM public.user_profiles WHERE id = auth.uid();
  RETURN jsonb_build_object('my_code', v_code, 'is_reward_active', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_my_referral_history
CREATE OR REPLACE FUNCTION public.get_my_referral_history()
RETURNS SETOF public.referrals AS $$ -- Retorna SETOF referrals simplificado
BEGIN
  RETURN QUERY SELECT * FROM public.referrals WHERE referrer_id = auth.uid() OR referred_id = auth.uid() ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: redeem_referral_code
CREATE OR REPLACE FUNCTION public.redeem_referral_code(code TEXT)
RETURNS VOID AS $$
DECLARE
  v_referrer UUID;
BEGIN
  SELECT id INTO v_referrer FROM public.user_profiles WHERE association_code = code;
  IF v_referrer IS NULL THEN
    RAISE EXCEPTION 'Referral code % not found', code;
  END IF;
  IF v_referrer = auth.uid() THEN
    RAISE EXCEPTION 'You cannot redeem your own referral code.';
  END IF;
  INSERT INTO public.referrals(referrer_id, referred_id, code_used, status)
  VALUES (v_referrer, auth.uid(), code, 'PENDING')
  ON CONFLICT (referred_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_store_reports
CREATE OR REPLACE FUNCTION public.get_store_reports()
RETURNS JSONB AS $$ -- Retorna JSONB para StoreReportData complexo
DECLARE
  v_store UUID := auth.uid();
  v_total_requests INT;
  v_total_value NUMERIC;
BEGIN
  SELECT COUNT(*), COALESCE(SUM(total_charged_store), 0)
    INTO v_total_requests, v_total_value
  FROM public.partner_requests
  WHERE store_id = v_store;

  RETURN jsonb_build_object(
    'totalRequests', v_total_requests,
    'totalValue', v_total_value,
    'peakHours', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('hour', EXTRACT(HOUR FROM created_at), 'count', COUNT(*)) ORDER BY EXTRACT(HOUR FROM created_at))
      FROM public.partner_requests WHERE store_id = v_store GROUP BY EXTRACT(HOUR FROM created_at)
    ), '[]'::jsonb),
    'driverPerformance', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('partner_id', partner_id, 'partner_name', COALESCE((SELECT name FROM public.user_profiles WHERE id = partner_id), 'Entregador'), 'count', COUNT(*)))
      FROM public.partner_requests WHERE store_id = v_store AND partner_id IS NOT NULL GROUP BY partner_id ORDER BY COUNT(*) DESC
    ), '[]'::jsonb),
    'counts', jsonb_build_object(
      'completed', COALESCE((SELECT COUNT(*) FROM public.partner_requests WHERE store_id = v_store AND status = 'COMPLETED'), 0),
      'cancelled', COALESCE((SELECT COUNT(*) FROM public.partner_requests WHERE store_id = v_store AND status = 'CANCELLED'), 0),
      'failed', COALESCE((SELECT COUNT(*) FROM public.partner_requests WHERE store_id = v_store AND status = 'EXPIRED'), 0)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: subscribe_to_super_store
CREATE OR REPLACE FUNCTION public.subscribe_to_super_store(fee NUMERIC)
RETURNS VOID AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  UPDATE public.user_profiles SET is_super_store = TRUE, updated_at = now() WHERE id = v_user;
  
  -- Debita da carteira
  INSERT INTO public.store_wallet_transactions(store_id, amount, description, type, status)
  VALUES (v_user, -ABS(fee), 'Assinatura Super Store', 'DEBIT', 'COMPLETED');
  
  UPDATE public.store_wallets
  SET balance_decimal = balance_decimal - ABS(fee)
  WHERE store_id = v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: admin_get_consolidated_wallets
CREATE OR REPLACE FUNCTION public.admin_get_consolidated_wallets()
RETURNS TABLE (user_id UUID, name TEXT, email TEXT, role public.user_role, balance NUMERIC) AS $$
BEGIN
  RETURN QUERY
    SELECT u.id, u.name, u.email, u.role, COALESCE(w.balance_decimal, 0)
    FROM public.user_profiles u
    LEFT JOIN public.store_wallets w ON w.store_id = u.id
    WHERE u.role = 'store_partner'
    ORDER BY COALESCE(w.balance_decimal, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_pending_payouts_summary
CREATE OR REPLACE FUNCTION public.get_pending_payouts_summary()
RETURNS TABLE (
    driver_id UUID,
    driver_name TEXT,
    driver_email TEXT,
    driver_automatic_payouts_enabled BOOLEAN,
    eligible_earnings NUMERIC,
    next_payout_date TIMESTAMPTZ,
    last_payout_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
    SELECT
      u.id,
      u.name,
      u.email,
      COALESCE(u.automatic_payouts_enabled, FALSE),
      COALESCE((SELECT SUM(net_value_partner) FROM public.partner_requests pr WHERE pr.partner_id = u.id AND pr.status = 'COMPLETED'), 0)::NUMERIC,
      NULL::TIMESTAMPTZ, -- Lógica de data do próximo payout precisa ser definida
      (SELECT MAX(pp.created_at) FROM public.partner_payments pp WHERE pp.partner_id = u.id AND pp.status = 'COMPLETED')
    FROM public.user_profiles u
    WHERE u.role IN ('delivery_partner','delivery_person');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: admin_adjust_balance
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(p_user_id UUID, p_amount NUMERIC, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
    v_user_role public.user_role;
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Permission denied.';
    END IF;

    SELECT role INTO v_user_role FROM public.user_profiles WHERE id = p_user_id;

    IF v_user_role = 'store_partner' THEN
        INSERT INTO public.store_wallets (store_id, balance_decimal)
        VALUES (p_user_id, p_amount)
        ON CONFLICT (store_id) DO UPDATE
        SET balance_decimal = public.store_wallets.balance_decimal + p_amount;

        INSERT INTO public.store_wallet_transactions (store_id, amount, description, type, status)
        VALUES (p_user_id, p_amount, 'Ajuste administrativo: ' || p_reason, 'ADJUSTMENT', 'COMPLETED');
    ELSE
        -- Para entregadores, a lógica pode ser diferente (ex: criar tabela driver_wallets)
        RAISE EXCEPTION 'Balance adjustment for this user role is not implemented yet.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: admin_update_driver_automatic_payouts
CREATE OR REPLACE FUNCTION public.admin_update_driver_automatic_payouts(p_user_id UUID, p_enabled BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;
  UPDATE public.user_profiles SET automatic_payouts_enabled = p_enabled WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: admin_update_driver_preferred_payout_method
CREATE OR REPLACE FUNCTION public.admin_update_driver_preferred_payout_method(p_user_id UUID, p_method_type public.payout_method_type)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;
  UPDATE public.user_profiles SET preferred_payout_method_type = p_method_type WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: generate_card_qr_token
CREATE OR REPLACE FUNCTION public.generate_card_qr_token(card_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- Apenas um exemplo simples. Para produção, use JWT ou um método mais seguro.
  RETURN md5(card_id::text || ':' || extract(epoch FROM now())::text || '-' || random()::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_zebank_dashboard_data
CREATE OR REPLACE FUNCTION public.get_zebank_dashboard_data()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_balance NUMERIC;
    v_savings_balance NUMERIC;
    v_cards JSONB;
    v_transactions JSONB;
    v_my_code TEXT;
    v_partner_level TEXT;
BEGIN
    SELECT COALESCE(balance_decimal, 0) INTO v_balance FROM public.driver_wallets WHERE driver_id = v_user_id;
    v_savings_balance := 0; -- Lógica do cofrinho a ser implementada

    SELECT association_code, partner_level 
    INTO v_my_code, v_partner_level
    FROM public.user_profiles WHERE id = v_user_id;

    SELECT jsonb_agg(t) INTO v_cards FROM (
        SELECT id, name, card_last_four, expiration_date, status, spending_limit_percent FROM public.zebank_cards WHERE user_id = v_user_id
    ) t;

    SELECT jsonb_agg(t) INTO v_transactions FROM (
        SELECT id, amount, description, type, status, created_at FROM public.driver_wallet_transactions WHERE driver_id = v_user_id ORDER BY created_at DESC LIMIT 10
    ) t;

    RETURN jsonb_build_object(
        'balance', COALESCE(v_balance, 0),
        'savings_balance', COALESCE(v_savings_balance, 0),
        'my_code', COALESCE(v_my_code, ''),
        'partner_level', COALESCE(v_partner_level, 'BRONZE'),
        'cards', COALESCE(v_cards, '[]'::jsonb),
        'recent_transactions', COALESCE(v_transactions, '[]'::jsonb),
        'cofrinho_balance', 0,
        'cofrinho_accrued_yield', 0
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Função: zebank_p2p_transfer
CREATE OR REPLACE FUNCTION public.zebank_p2p_transfer(receiver_code TEXT, amount NUMERIC)
RETURNS VOID AS $$
DECLARE
    v_sender_id UUID := auth.uid();
    v_receiver_id UUID;
    v_sender_balance NUMERIC;
BEGIN
    IF amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be positive.';
    END IF;

    SELECT id INTO v_receiver_id FROM public.user_profiles WHERE association_code = receiver_code;
    IF v_receiver_id IS NULL THEN
        RAISE EXCEPTION 'Receiver not found.';
    END IF;

    IF v_sender_id = v_receiver_id THEN
        RAISE EXCEPTION 'Cannot transfer to yourself.';
    END IF;

    -- Debitar do remetente
    UPDATE public.driver_wallets
    SET balance_decimal = balance_decimal - amount
    WHERE driver_id = v_sender_id
    RETURNING balance_decimal INTO v_sender_balance;

    IF v_sender_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient funds.';
    END IF;
    
    INSERT INTO public.driver_wallet_transactions(driver_id, amount, description, type, status)
    VALUES (v_sender_id, -amount, 'Transferência para ' || (SELECT name FROM user_profiles WHERE id = v_receiver_id), 'TRANSFER', 'COMPLETED');

    -- Creditar ao destinatário
    UPDATE public.driver_wallets
    SET balance_decimal = balance_decimal + amount
    WHERE driver_id = v_receiver_id;
    
    INSERT INTO public.driver_wallet_transactions(driver_id, amount, description, type, status)
    VALUES (v_receiver_id, amount, 'Transferência de ' || (SELECT name FROM user_profiles WHERE id = v_sender_id), 'TRANSFER', 'COMPLETED');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Função: zebank_manage_savings
CREATE OR REPLACE FUNCTION public.zebank_manage_savings(action TEXT, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  -- Lógica do cofrinho a ser implementada
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: admin_update_cofrinho_settings
CREATE OR REPLACE FUNCTION public.admin_update_cofrinho_settings(
    p_yield_frequency TEXT,
    p_interest_type TEXT,
    p_rate_percent NUMERIC,
    p_min_lock_days INT,
    p_allow_early_withdrawal BOOLEAN,
    p_penalty_percent NUMERIC,
    p_min_deposit NUMERIC,
    p_formula_script TEXT,
    p_change_policy TEXT
)
RETURNS VOID AS $$
BEGIN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Permission denied.';
    END IF;
    
    UPDATE public.cofrinho_settings
    SET
        yield_frequency = p_yield_frequency::public.yield_frequency_type,
        interest_type = p_interest_type::public.interest_type_type,
        rate_percent = p_rate_percent,
        min_lock_days = p_min_lock_days,
        allow_early_withdrawal = p_allow_early_withdrawal,
        penalty_percent = p_penalty_percent,
        min_deposit = p_min_deposit,
        formula_script = p_formula_script,
        change_policy = p_change_policy::public.change_policy_type
    WHERE id = '1';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: zebank_create_virtual_card
CREATE OR REPLACE FUNCTION public.zebank_create_virtual_card(card_name TEXT)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    INSERT INTO public.zebank_cards (user_id, name, card_number, card_last_four, expiration_date, cvv, card_holder)
    VALUES (
        v_user_id,
        card_name,
        '**** **** **** ' || LPAD(FLOOR(random() * 10000)::int::text, 4, '0'), -- Mock
        LPAD(FLOOR(random() * 10000)::int::text, 4, '0'),
        '12/29', -- Mock
        LPAD(FLOOR(random() * 1000)::int::text, 3, '0'), -- Mock
        (SELECT name FROM public.user_profiles WHERE id = v_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: simulate_card_transaction
CREATE OR REPLACE FUNCTION public.simulate_card_transaction(card_id UUID, amount NUMERIC, description TEXT)
RETURNS VOID AS $$
BEGIN
  -- Lógica para simular uma transação de cartão, útil para testes.
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: send_global_notification
CREATE OR REPLACE FUNCTION public.send_global_notification(p_title TEXT, p_message TEXT)
RETURNS VOID AS $$
DECLARE
    all_users CURSOR FOR SELECT id FROM public.user_profiles;
    user_id UUID;
BEGIN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Permission denied.';
    END IF;

    OPEN all_users;
    LOOP
        FETCH all_users INTO user_id;
        EXIT WHEN NOT FOUND;
        INSERT INTO public.user_notifications (user_id, title, message)
        VALUES (user_id, p_title, p_message);
    END LOOP;
    CLOSE all_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: activate_my_terminal
CREATE OR REPLACE FUNCTION public.activate_my_terminal()
RETURNS SETOF public.user_terminals AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  UPDATE public.user_terminals
  SET status = 'ACTIVE', activated_at = now(), deactivated_at = NULL
  WHERE user_id = v_user;
  RETURN QUERY SELECT * FROM public.user_terminals WHERE user_id = v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: deactivate_my_terminal
CREATE OR REPLACE FUNCTION public.deactivate_my_terminal()
RETURNS VOID AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  UPDATE public.user_terminals
  SET status = 'INACTIVE', deactivated_at = now()
  WHERE user_id = v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_my_terminal_history
CREATE OR REPLACE FUNCTION public.get_my_terminal_history()
RETURNS SETOF public.user_terminal_transactions AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.user_terminal_transactions WHERE merchant_user_id = auth.uid() ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: update_my_terminal_settings
CREATE OR REPLACE FUNCTION public.update_my_terminal_settings(p_label TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_terminals SET label = p_label, updated_at = now() WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: verify_terminal_pin
CREATE OR REPLACE FUNCTION public.verify_terminal_pin(p_pin_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.user_terminals WHERE user_id = auth.uid() AND pin_code = p_pin_code) INTO v_exists;
  RETURN COALESCE(v_exists, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_zepay_dashboard_data
CREATE OR REPLACE FUNCTION public.get_zepay_dashboard_data()
RETURNS JSONB AS $$
BEGIN
  -- Implementação similar a get_zebank_dashboard_data mas para lojistas
  RETURN '{}'::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: zepay_transfer
CREATE OR REPLACE FUNCTION public.zepay_transfer(receiver_code TEXT, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  -- Lógica de transferência entre lojas ou loja->entregador
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: zepay_create_virtual_card
CREATE OR REPLACE FUNCTION public.zepay_create_virtual_card(card_name TEXT)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    INSERT INTO public.store_virtual_cards (store_id, name, card_number, card_last_four, expiration_date, cvv, card_holder)
    VALUES (
        v_user_id,
        card_name,
        '**** **** **** ' || LPAD(FLOOR(random() * 10000)::int::text, 4, '0'), -- Mock
        LPAD(FLOOR(random() * 10000)::int::text, 4, '0'),
        '12/29', -- Mock
        LPAD(FLOOR(random() * 1000)::int::text, 3, '0'), -- Mock
        (SELECT name FROM public.user_profiles WHERE id = v_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: process_user_pos_payment
CREATE OR REPLACE FUNCTION public.process_user_pos_payment(
    p_card_id UUID,
    p_amount NUMERIC,
    p_user_role public.user_role,
    p_merchant_user_id UUID,
    p_split_group_id UUID,
    p_promo_code TEXT,
    p_discount_amount NUMERIC,
    p_originating_store_id UUID,
    p_originating_order_id UUID
)
RETURNS TEXT AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    INSERT INTO public.user_terminal_transactions(terminal_id, amount, status, merchant_user_id, payer_id)
    SELECT id, p_amount, 'COMPLETED', p_merchant_user_id, user_id
    FROM public.user_terminals WHERE id = p_card_id -- Simplificação, a lógica real seria mais complexa
    RETURNING id INTO v_transaction_id;
  RETURN v_transaction_id::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: log_client_error
CREATE OR REPLACE FUNCTION public.log_client_error(p_category TEXT, p_message TEXT, p_context JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.client_error_logs(user_id, category, message, payload)
  VALUES (auth.uid(), p_category, p_message, p_context);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: save_sales_simulation
CREATE OR REPLACE FUNCTION public.save_sales_simulation(
    p_sale_value NUMERIC,
    p_fee_payer TEXT,
    p_gross_value NUMERIC,
    p_net_value NUMERIC,
    p_fees NUMERIC
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.sales_simulations(user_id, sale_value, fee_payer, gross_value, net_value, fees)
  VALUES (auth.uid(), p_sale_value, p_fee_payer, p_gross_value, p_net_value, p_fees);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: get_my_sales_simulations
CREATE OR REPLACE FUNCTION public.get_my_sales_simulations()
RETURNS TABLE (
    id UUID,
    user_id UUID,
    sale_value NUMERIC,
    fee_payer TEXT,
    gross_value NUMERIC,
    net_value NUMERIC,
    fees NUMERIC,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY SELECT s.* FROM public.sales_simulations s WHERE s.user_id = auth.uid() ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: clear_my_sales_simulations
CREATE OR REPLACE FUNCTION public.clear_my_sales_simulations()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.sales_simulations WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tabela de Logs de Webhook do Asaas (Novo Recurso)
CREATE TABLE IF NOT EXISTS public.asaas_webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event TEXT NOT NULL,
    payment_id TEXT,
    payload JSONB,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT DEFAULT 'RECEIVED', -- 'RECEIVED', 'PROCESSED', 'ERROR'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.asaas_webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view asaas webhook logs" ON public.asaas_webhook_logs;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view asaas webhook logs' AND tablename = 'asaas_webhook_logs') THEN
        CREATE POLICY "Admins can view asaas webhook logs" ON public.asaas_webhook_logs FOR ALL USING (public.is_admin());
    END IF;
END $$;


-- Função: save_route
CREATE OR REPLACE FUNCTION public.save_route(
    p_name TEXT,
    p_waypoints TEXT[],
    p_distance NUMERIC,
    p_duration NUMERIC
)
RETURNS TEXT AS $$
DECLARE
  v_id UUID := uuid_generate_v4();
BEGIN
  INSERT INTO public.saved_routes(id, user_id, name, waypoints, distance, duration)
  VALUES (v_id, auth.uid(), p_name, p_waypoints, p_distance, p_duration);
  RETURN v_id::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================================
-- 4.x VIEWS & MATERIALIZED VIEWS
-- ==================================================================
-- Nenhuma view identificada diretamente ainda, mas reservado o espaço.

-- ==================================================================
-- 5.x RLS POLICIES & TRIGGERS ADICIONAIS
-- ==================================================================


-- ==================================================================
-- 6.x STORAGE (BUCKETS E POLÍTICAS)
-- ==================================================================

-- Inserir buckets se não existirem
INSERT INTO storage.buckets (id, name, public, owner)
VALUES
    ('avatars', 'avatars', TRUE, NULL),
    ('documents', 'documents', FALSE, NULL),
    ('identity_verifications', 'identity_verifications', FALSE, NULL),
    ('public-files', 'public-files', TRUE, NULL)
ON CONFLICT (id) DO NOTHING;

-- Políticas para o bucket 'avatars'
DROP POLICY IF EXISTS "Avatar images are publicly accessible." ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can upload an avatar." ON storage.objects;
CREATE POLICY "Anyone can upload an avatar."
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can update their own avatar." ON storage.objects;
CREATE POLICY "Anyone can update their own avatar."
    ON storage.objects FOR UPDATE
    USING (auth.uid() = owner)
    WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can delete their own avatar." ON storage.objects;
CREATE POLICY "Anyone can delete their own avatar."
    ON storage.objects FOR DELETE
    USING (auth.uid() = owner);


-- Políticas para o bucket 'documents' (documentos de parceiros)
DROP POLICY IF EXISTS "Users can view their own documents." ON storage.objects;
CREATE POLICY "Users can view their own documents."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Users can upload their own documents." ON storage.objects;
CREATE POLICY "Users can upload their own documents."
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Admins can view all documents." ON storage.objects;
CREATE POLICY "Admins can view all documents."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents' AND public.is_admin());


-- Políticas para o bucket 'identity_verifications'
DROP POLICY IF EXISTS "Users can upload their own identity verification." ON storage.objects;
CREATE POLICY "Users can upload their own identity verification."
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'identity_verifications' AND auth.uid() = owner);

DROP POLICY IF EXISTS "Admins can view all identity verifications." ON storage.objects;
CREATE POLICY "Admins can view all identity verifications."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'identity_verifications' AND public.is_admin());


-- Políticas para o bucket 'public-files'
DROP POLICY IF EXISTS "Public files are publicly accessible." ON storage.objects;
CREATE POLICY "Public files are publicly accessible."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'public-files');

DROP POLICY IF EXISTS "Admins can manage public files." ON storage.objects;
CREATE POLICY "Admins can manage public files."
    ON storage.objects FOR ALL
    USING (bucket_id = 'public-files' AND public.is_admin());

-- ==================================================================
-- Tabela de logs de QR Code (Novo Recurso: Item 8)
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.qrcode_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Quem escaneou
    content TEXT NOT NULL, -- Conteúdo do QR Code
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status VARCHAR(50) DEFAULT 'SUCCESS', -- SUCCESS, ERROR, INVALID
    metadata JSONB DEFAULT '{}'::jsonb, -- Contexto adicional (local, app version, etc)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS qrcode_logs_user_id_idx ON public.qrcode_logs (user_id);
CREATE INDEX IF NOT EXISTS qrcode_logs_scanned_at_idx ON public.qrcode_logs (scanned_at);

ALTER TABLE public.qrcode_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own qrcode logs" ON public.qrcode_logs;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own qrcode logs' AND tablename = 'qrcode_logs') THEN
        CREATE POLICY "Users can view their own qrcode logs" ON public.qrcode_logs FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated users can insert qrcode logs" ON public.qrcode_logs;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert qrcode logs' AND tablename = 'qrcode_logs') THEN
        CREATE POLICY "Authenticated users can insert qrcode logs" ON public.qrcode_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DROP POLICY IF EXISTS "Admins can view all qrcode logs" ON public.qrcode_logs;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all qrcode logs' AND tablename = 'qrcode_logs') THEN
        CREATE POLICY "Admins can view all qrcode logs" ON public.qrcode_logs FOR ALL USING (public.is_admin());
    END IF;
END $$;

-- ==================================================================
-- Atualizações para o Módulo de Comandas Internas
-- ==================================================================

-- 1. Atualizar Enum 'payment_method'
DO $$
BEGIN
    ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'DEBIT_CARD';
    ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'OTHER';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. Atualizar tabela 'orders' com novos campos para comandas internas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_name') THEN
        ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_phone') THEN
        ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'observation') THEN
        ALTER TABLE public.orders ADD COLUMN observation TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'origin') THEN
        ALTER TABLE public.orders ADD COLUMN origin TEXT DEFAULT 'APP'; -- 'APP' ou 'INTERNAL'
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'amount_paid') THEN
        ALTER TABLE public.orders ADD COLUMN amount_paid NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'change_amount') THEN
        ALTER TABLE public.orders ADD COLUMN change_amount NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'custom_payment_label') THEN
        ALTER TABLE public.orders ADD COLUMN custom_payment_label TEXT;
    END IF;
END $$;

-- ==================================================================
-- MÓDULO DE PEDIDOS INTERNOS - PRODUTOS DA LOJA
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.store_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    category TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para performance
CREATE INDEX IF NOT EXISTS store_products_store_id_idx ON public.store_products (store_id);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_store_products_updated_at ON public.store_products;
CREATE TRIGGER handle_store_products_updated_at BEFORE UPDATE ON public.store_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Permitir que a loja gerencie seus próprios produtos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store partners can manage their own products' AND tablename = 'store_products') THEN
        CREATE POLICY "Store partners can manage their own products" ON public.store_products
        FOR ALL
        USING (auth.uid() = store_id)
        WITH CHECK (auth.uid() = store_id);
    END IF;

    -- Permitir que admins gerenciem tudo
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all store products' AND tablename = 'store_products') THEN
        CREATE POLICY "Admins can manage all store products" ON public.store_products
        FOR ALL
        USING (public.is_admin());
    END IF;
END $$;

-- ==================================================================
-- Atualização da função create_order para suportar novos campos
-- ==================================================================
CREATE OR REPLACE FUNCTION public.create_order(order_details JSONB)
RETURNS JSONB AS $$
DECLARE
    new_order public.orders;
BEGIN
    INSERT INTO public.orders (
        store_id,
        user_id,
        status,
        items,
        total_price,
        payment_method,
        shipping_address,
        payment_details,
        shipping_cost,
        discount,
        coupon_code,
        customer_name,
        customer_phone,
        observation,
        origin,
        amount_paid,
        change_amount,
        custom_payment_label
    )
    VALUES (
        (order_details->>'store_id')::UUID,
        CASE 
            WHEN (order_details->>'origin') = 'INTERNAL' THEN NULL 
            ELSE auth.uid() 
        END,
        'PENDING',
        (order_details->'items')::JSONB[],
        (order_details->>'total_price')::NUMERIC,
        (order_details->>'payment_method')::public.payment_method,
        (order_details->'shipping_address')::JSONB,
        (order_details->'payment_details')::JSONB,
        (order_details->>'shipping_cost')::NUMERIC,
        (order_details->>'discount')::NUMERIC,
        order_details->>'coupon_code',
        order_details->>'customer_name',
        order_details->>'customer_phone',
        order_details->>'observation',
        COALESCE(order_details->>'origin', 'APP'),
        (order_details->>'amount_paid')::NUMERIC,
        (order_details->>'change_amount')::NUMERIC,
        order_details->>'custom_payment_label'
    ) RETURNING * INTO new_order;

    RETURN to_jsonb(new_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================================================================
-- UPDATES: M�dulo de Importa��o Universal e Colaboradores
-- ==================================================================

-- Atualiza��o do ENUM user_role com 'collaborator'
DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'collaborator';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- Atualiza��o da tabela products (Campos para Importador Universal)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'internal_code') THEN
        ALTER TABLE public.products ADD COLUMN internal_code VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'variations') THEN
        ALTER TABLE public.products ADD COLUMN variations JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'options') THEN
        ALTER TABLE public.products ADD COLUMN options JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'availability') THEN
        ALTER TABLE public.products ADD COLUMN availability JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'observations') THEN
        ALTER TABLE public.products ADD COLUMN observations TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'origin_prefix') THEN
        ALTER TABLE public.products ADD COLUMN origin_prefix VARCHAR(50);
    END IF;
END $$;

-- Tabela de Colaboradores
CREATE TABLE IF NOT EXISTS public.collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_username UNIQUE (store_id, username)
);
DROP TRIGGER IF EXISTS handle_collaborators_updated_at ON public.collaborators;
CREATE TRIGGER handle_collaborators_updated_at BEFORE UPDATE ON public.collaborators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stores can manage their own collaborators" ON public.collaborators;
CREATE POLICY "Stores can manage their own collaborators" ON public.collaborators
    FOR ALL USING (auth.uid() = store_id);

DROP POLICY IF EXISTS "Anon can check collaborator login" ON public.collaborators;
CREATE POLICY "Anon can check collaborator login" ON public.collaborators
    FOR SELECT TO anon, authenticated USING (true);

-- Tabela de Pedidos de Mesa/Colaborador
CREATE TABLE IF NOT EXISTS public.orders_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    table_identifier VARCHAR(50),
    status VARCHAR(50) DEFAULT 'opened', -- opened, sent, completed
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_orders_collaborators_updated_at ON public.orders_collaborators;
CREATE TRIGGER handle_orders_collaborators_updated_at BEFORE UPDATE ON public.orders_collaborators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders_collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores can manage table orders" ON public.orders_collaborators;
CREATE POLICY "Stores can manage table orders" ON public.orders_collaborators
    FOR ALL USING (auth.uid() = store_id);

-- Tabela de Itens do Pedido de Mesa
CREATE TABLE IF NOT EXISTS public.orders_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders_collaborators(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    additional JSONB DEFAULT '[]'::jsonb,
    quantity INT DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores can manage order items" ON public.orders_items;
CREATE POLICY "Stores can manage order items" ON public.orders_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.orders_collaborators oc WHERE oc.id = order_id AND oc.store_id = auth.uid())
    );

-- Fun��es de Autentica��o de Colaborador (usando pgcrypto)
CREATE OR REPLACE FUNCTION public.login_collaborator(p_username TEXT, p_password TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT * INTO v_user FROM public.collaborators
    WHERE username = p_username AND password_hash = crypt(p_password, password_hash) AND active = TRUE;

    IF v_user.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'id', v_user.id,
            'store_id', v_user.store_id,
            'username', v_user.username,
            'role', 'collaborator'
        );
    ELSE
        RETURN NULL;
    END IF;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.create_collaborator(p_username TEXT, p_password TEXT, p_store_id UUID)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.collaborators (store_id, username, password_hash)
    VALUES (p_store_id, p_username, crypt(p_password, gen_salt('bf')))
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC para enviar pedido de mesa
CREATE OR REPLACE FUNCTION public.place_collaborator_order(
    p_store_id UUID,
    p_collaborator_id UUID,
    p_table_identifier TEXT,
    p_items JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_total NUMERIC(10, 2) := 0;
    v_item_total NUMERIC(10, 2);
BEGIN
    -- Calcular total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_total := (v_item->>'quantity')::INT * (v_item->>'unit_price')::NUMERIC;
        v_total := v_total + v_item_total;
    END LOOP;

    -- Criar Pedido
    INSERT INTO public.orders_collaborators (store_id, collaborator_id, table_identifier, status)
    VALUES (p_store_id, p_collaborator_id, p_table_identifier, 'sent')
    RETURNING id INTO v_order_id;

    -- Inserir Itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_total := (v_item->>'quantity')::INT * (v_item->>'unit_price')::NUMERIC;
        INSERT INTO public.orders_items (order_id, product_id, additional, quantity, unit_price, total_price)
        VALUES (
            v_order_id,
            (v_item->>'product_id')::UUID,
            COALESCE(v_item->'additional', '[]'::jsonb),
            (v_item->>'quantity')::INT,
            (v_item->>'unit_price')::NUMERIC,
            v_item_total
        );
    END LOOP;

    RETURN jsonb_build_object('id', v_order_id, 'status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC para listar produtos pelo colaborador
CREATE OR REPLACE FUNCTION public.get_products_for_collaborator(p_store_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(to_jsonb(p.*)) INTO result
    FROM public.products p
    WHERE p.store_id = p_store_id AND p.is_active = TRUE;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Atualiza��o da Tabela store_products (Para garantir compatibilidade com Importa��o Universal)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_products' AND column_name = 'internal_code') THEN
        ALTER TABLE public.store_products ADD COLUMN internal_code VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_products' AND column_name = 'variations') THEN
        ALTER TABLE public.store_products ADD COLUMN variations JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_products' AND column_name = 'options') THEN
        ALTER TABLE public.store_products ADD COLUMN options JSONB DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_products' AND column_name = 'availability') THEN
        ALTER TABLE public.store_products ADD COLUMN availability JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_products' AND column_name = 'observations') THEN
        ALTER TABLE public.store_products ADD COLUMN observations TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_products' AND column_name = 'origin_prefix') THEN
        ALTER TABLE public.store_products ADD COLUMN origin_prefix VARCHAR(50);
    END IF;
END $$;


-- RPC para listar colaboradores da loja
CREATE OR REPLACE FUNCTION public.get_store_collaborators(p_store_id UUID)
RETURNS JSONB AS $$
BEGIN
    RETURN COALESCE((
        SELECT jsonb_agg(to_jsonb(c.*))
        FROM public.collaborators c
        WHERE c.store_id = p_store_id
    ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para alterar status do colaborador
CREATE OR REPLACE FUNCTION public.toggle_collaborator_status(p_collaborator_id UUID, p_active BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE public.collaborators SET active = p_active WHERE id = p_collaborator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Tabela de Slides Promocionais (1600x400)
CREATE TABLE IF NOT EXISTS public.slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    link TEXT,
    display_days INTEGER DEFAULT 7,
    target_audience TEXT NOT NULL CHECK (target_audience IN ('drivers', 'merchants', 'both')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;

-- Permissões de acesso
GRANT SELECT ON public.slides TO anon, authenticated;
GRANT ALL ON public.slides TO authenticated; -- Permite que usuários autenticados (admins) gerenciem via políticas RLS

-- PolÃ­ticas de RLS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Slides are viewable by everyone') THEN
        CREATE POLICY "Slides are viewable by everyone" ON public.slides FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow admins to manage slides') THEN
        CREATE POLICY "Allow admins to manage slides" ON public.slides FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles
                WHERE id = auth.uid() AND role = 'admin'
            )
        );
    END IF;
END $$;

-- Inserir Slides de Exemplo (Seed Data)
INSERT INTO public.slides (name, image_url, link, target_audience, is_active)
SELECT 'Bem-vindo ao Zé Entregas', 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&q=80&w=1600&h=400', '/profile', 'both', true
WHERE NOT EXISTS (SELECT 1 FROM public.slides WHERE name = 'Bem-vindo ao Zé Entregas');

INSERT INTO public.slides (name, image_url, link, target_audience, is_active)
SELECT 'Novas Taxas Disponíveis', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1600&h=400', '/partner', 'drivers', true
WHERE NOT EXISTS (SELECT 1 FROM public.slides WHERE name = 'Novas Taxas Disponíveis');

INSERT INTO public.slides (name, image_url, link, target_audience, is_active)
SELECT 'Gestão de Estoque Facilitada', 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=1600&h=400', '/shop', 'merchants', true
WHERE NOT EXISTS (SELECT 1 FROM public.slides WHERE name = 'Gestão de Estoque Facilitada');

INSERT INTO public.slides (name, image_url, link, target_audience, is_active)
SELECT 'Suporte 24h', 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=1600&h=400', '/support', 'both', true
WHERE NOT EXISTS (SELECT 1 FROM public.slides WHERE name = 'Suporte 24h');

-- Garantir links em slides que foram inseridos sem link anteriormente
UPDATE public.slides SET link = '/profile' WHERE name = 'Bem-vindo ao Zé Entregas' AND link IS NULL;
UPDATE public.slides SET link = '/partner' WHERE name = 'Novas Taxas Disponíveis' AND link IS NULL;
UPDATE public.slides SET link = '/shop' WHERE name = 'Gestão de Estoque Facilitada' AND link IS NULL;



-- ==================================================================
-- MARKETING E TEMPLATES
-- ==================================================================

-- Tabela de templates de marketing
CREATE TABLE IF NOT EXISTS public.marketing_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'promotion', 'new_product', 'info', etc.
    format TEXT NOT NULL, -- 'square', 'story', 'horizontal'
    config JSONB NOT NULL, -- Configurações padrão (cores, fontes, posições)
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de designs salvos pelos lojistas
CREATE TABLE IF NOT EXISTS public.marketing_designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.marketing_templates(id),
    name TEXT NOT NULL DEFAULT 'Sem título',
    config JSONB NOT NULL, -- Configurações personalizadas (textos, cores, imagens)
    last_image_url TEXT, -- URL da última exportação salva (opcional)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS e Permissões
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_designs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.marketing_templates TO anon, authenticated;
GRANT ALL ON public.marketing_designs TO authenticated;

-- Políticas para Templates
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.marketing_templates;
CREATE POLICY "Anyone can view active templates" ON public.marketing_templates
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage templates" ON public.marketing_templates;
CREATE POLICY "Admins can manage templates" ON public.marketing_templates
    FOR ALL USING (public.is_admin());

-- Políticas para Designs
DROP POLICY IF EXISTS "Users can manage their own designs" ON public.marketing_designs;
CREATE POLICY "Users can manage their own designs" ON public.marketing_designs
    FOR ALL USING (auth.uid() = user_id);

-- Trigger para updated_at em marketing_designs
DROP TRIGGER IF EXISTS handle_marketing_designs_updated_at ON public.marketing_designs;
CREATE TRIGGER handle_marketing_designs_updated_at BEFORE UPDATE ON public.marketing_designs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed de Templates Iniciais
INSERT INTO public.marketing_templates (name, category, format, config, is_active)
SELECT 'Promoção Relâmpago', 'promotion', 'square', '{
    "backgroundColor": "#f43f5e",
    "textColor": "#ffffff",
    "format": "post",
    "elements": [
        {"type": "text", "id": "title", "text": "PROMOÇÃO RELÂMPAGO", "x": 90, "y": 100, "width": 900, "height": 120, "fontSize": 64, "fontWeight": "black", "color": "#ffffff", "zIndex": 2},
        {"type": "text", "id": "subtitle", "text": "Aproveite agora!", "x": 90, "y": 240, "width": 900, "height": 60, "fontSize": 36, "color": "#ffffff", "zIndex": 2},
        {"type": "image", "id": "product", "shape": "circle", "x": 290, "y": 400, "width": 500, "height": 500, "zIndex": 1},
        {"type": "text", "id": "contact", "text": "(00) 00000-0000", "x": 90, "y": 950, "width": 900, "height": 50, "fontSize": 28, "color": "#ffffff", "zIndex": 2}
    ]
}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.marketing_templates WHERE name = 'Promoção Relâmpago');

INSERT INTO public.marketing_templates (name, category, format, config, is_active)
SELECT 'Novo no Cardápio', 'new_product', 'square', '{
    "backgroundColor": "#ffffff",
    "textColor": "#1f2937",
    "format": "post",
    "elements": [
        {"type": "text", "id": "title", "text": "NOVIDADE!", "x": 90, "y": 80, "width": 900, "height": 100, "fontSize": 56, "fontWeight": "black", "color": "#7c3aed", "zIndex": 2},
        {"type": "image", "id": "product", "shape": "square", "x": 240, "y": 300, "width": 600, "height": 600, "zIndex": 1},
        {"type": "text", "id": "contact", "text": "Peça pelo WhatsApp", "x": 90, "y": 950, "width": 900, "height": 50, "fontSize": 28, "color": "#1f2937", "zIndex": 2}
    ]
}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.marketing_templates WHERE name = 'Novo no Cardápio');

-- ==================================================================
-- STORAGE: MARKETING ASSETS
-- ==================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public access (Read)
DROP POLICY IF EXISTS "Public Access Marketing Assets" ON storage.objects;
CREATE POLICY "Public Access Marketing Assets" ON storage.objects
    FOR SELECT USING (bucket_id = 'marketing-assets');

-- Policy: Authenticated upload (Insert)
DROP POLICY IF EXISTS "Auth Upload Marketing Assets" ON storage.objects;
CREATE POLICY "Auth Upload Marketing Assets" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'marketing-assets' AND auth.role() = 'authenticated');

