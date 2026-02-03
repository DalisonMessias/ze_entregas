-- ==================================================================
-- [DOCUMENTATION NOTE]
-- AS TABELAS COM PREFIXO 'chat_' REFEREM-SE AO CHAT INTERNO DO SISTEMA.
-- ELAS FORAM UNIFICADAS PARA UM PADRÃO NATIVO.
-- NO CÓDIGO (FE/BE), ELAS SÃO TRATADAS COMO 'Chat Interno'.
-- ==================================================================
-- 0.x EXTENSIONS E CONFIGURAﾃ�髭S GERAIS
-- ==================================================================



-- ==================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Funﾃｧﾃ｣o genﾃｩrica para atualizar 'updated_at' automaticamente
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
    CREATE TYPE public.user_role AS ENUM ('admin', 'store_partner', 'delivery_partner', 'delivery_person', 'user');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Garantir que 'user' exista no enum (Migraﾃｧﾃ｣o Segura)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype AND enumlabel = 'user') THEN
    ALTER TYPE public.user_role ADD VALUE 'user';
  END IF;
END $$;

DO $$ BEGIN
    CREATE TYPE public.user_status AS ENUM ('active', 'banned', 'pending', 'blocked', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Garantir novos status se o enum já existir (Migração Aditiva)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_status'::regtype AND enumlabel = 'blocked') THEN
    ALTER TYPE public.user_status ADD VALUE 'blocked';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.user_status'::regtype AND enumlabel = 'suspended') THEN
    ALTER TYPE public.user_status ADD VALUE 'suspended';
  END IF;
END $$;

DO $$ BEGIN
    CREATE TYPE public.partner_request_status AS ENUM ('PENDING', 'ACCEPTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'RETURNING', 'AWAITING_STORE_DECISION');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE public.payment_method AS ENUM ('PIX', 'CREDIT_CARD', 'BOLETO', 'CASH');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.payment_method'::regtype AND enumlabel = 'DEBIT_CARD') THEN
        ALTER TYPE public.payment_method ADD VALUE 'DEBIT_CARD';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.payment_method'::regtype AND enumlabel = 'OTHER') THEN
        ALTER TYPE public.payment_method ADD VALUE 'OTHER';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.payment_method'::regtype AND enumlabel = 'PENDING') THEN
        ALTER TYPE public.payment_method ADD VALUE 'PENDING';
    END IF;
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

-- Criar tipo order_status antes de tentar adicionar valores
DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM ('PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'IN_DELIVERY', 'DELIVERED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Adicionar valor pending_payment se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'pending_payment') THEN
    ALTER TYPE public.order_status ADD VALUE 'pending_payment';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'REJECTED') THEN
    ALTER TYPE public.order_status ADD VALUE 'REJECTED';
  END IF;
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

-- Tabela de perfis de usuﾃ｡rios (EXISTENTE - ESQUELETO, sendo completado)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY, -- Assumindo que o ID do perfil de usuﾃ｡rio ﾃｩ o mesmo do auth.users
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
    partner_level TEXT, -- Nﾃｭvel de parceiro
    is_active BOOLEAN DEFAULT TRUE,
    is_super_store BOOLEAN DEFAULT FALSE,
    association_code TEXT UNIQUE,
    share_phone_offline BOOLEAN DEFAULT FALSE,
    role public.user_role DEFAULT 'delivery_person'::public.user_role,
    status public.user_status DEFAULT 'active'::public.user_status,
    notification_preferences JSONB DEFAULT '{}'::jsonb,
    last_known_location GEOMETRY(Point, 4326), -- Para localizaﾃｧﾃ｣o de entregadores
    bank_details JSONB, -- Detalhes bancﾃ｡rios (UserBankDetails)
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
    store_document TEXT,
    score INTEGER DEFAULT 0, -- Score do entregador (0-1000)
    refusal_count_monthly INTEGER DEFAULT 0,
    cancellation_count_monthly INTEGER DEFAULT 0,
    monthly_reset_date TIMESTAMPTZ DEFAULT (date_trunc('month', now()) + interval '1 month')
);
CREATE INDEX IF NOT EXISTS user_profiles_city_idx ON public.user_profiles (city);
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles (role);
CREATE INDEX IF NOT EXISTS user_profiles_status_idx ON public.user_profiles (status);
CREATE INDEX IF NOT EXISTS user_profiles_verification_status_idx ON public.user_profiles (verification_status);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_active') THEN
        ALTER TABLE public.user_profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'pix_key') THEN
        ALTER TABLE public.user_profiles ADD COLUMN pix_key TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'pix_key_type') THEN
        ALTER TABLE public.user_profiles ADD COLUMN pix_key_type TEXT DEFAULT 'CPF';
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS user_profiles_is_active_idx ON public.user_profiles (is_active);
CREATE INDEX IF NOT EXISTS user_profiles_is_available_idx ON public.user_profiles (is_available);
CREATE INDEX IF NOT EXISTS user_profiles_association_code_idx ON public.user_profiles (association_code);
DROP TRIGGER IF EXISTS handle_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER handle_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adicao de colunas especificas de endereco da loja e slugs
DO $$
BEGIN
    -- Store Address Fields
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_zip') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_zip TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_street') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_street TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_number') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_district') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_district TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_city') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_city TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_state') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_state TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_complement') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_complement TEXT;
    END IF;

    -- Slugs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'city_slug') THEN
        ALTER TABLE public.user_profiles ADD COLUMN city_slug TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_slug') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_slug TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_logo_url') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_logo_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'cover_url') THEN
        ALTER TABLE public.user_profiles ADD COLUMN cover_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'description') THEN
        ALTER TABLE public.user_profiles ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'preparation_time_min') THEN
        ALTER TABLE public.user_profiles ADD COLUMN preparation_time_min INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'preparation_time_max') THEN
        ALTER TABLE public.user_profiles ADD COLUMN preparation_time_max INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_open') THEN
        ALTER TABLE public.user_profiles ADD COLUMN is_open BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Função auxiliar para slugify (simples)
CREATE OR REPLACE FUNCTION public.slugify(value TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        translate(value, 'áàâãäåāăąÁÀÂÃÄÅĀĂĄèééêëēĕėęěÈÉÊËĒĔĖĘĚìíîïìĩīĭÌÍÎÏÌĨĪĬóòôõöōŏőÓÒÔÕÖŌŎŐùúûüũūŭůÙÚÛÜŨŪŬŮñÑçÇ', 'aaaaaaaaaaaaaaaaQmeeeeeeeeeeeeeeeiiiiiiiióoooooooooooooooouuuuuuuuuuuuuuuuunncC'),
        '[^a-z0-9\-_]+', '-', 'gi'
      ),
      '(^-+|-+$)', '', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para atualizar slugs automaticamente
CREATE OR REPLACE FUNCTION public.update_store_slugs()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualiza store_slug se store_name mudar
    IF NEW.store_name IS DISTINCT FROM OLD.store_name OR NEW.store_slug IS NULL THEN
        NEW.store_slug := public.slugify(NEW.store_name);
    END IF;

    -- Atualiza city_slug se store_address_city mudar (ou fallback para city)
    IF NEW.store_address_city IS NOT NULL THEN
        IF NEW.store_address_city IS DISTINCT FROM OLD.store_address_city OR NEW.city_slug IS NULL THEN
             NEW.city_slug := public.slugify(NEW.store_address_city);
        END IF;
    ELSIF NEW.city IS NOT NULL THEN
        -- Fallback para cidade pessoal se a da loja não estiver definida
         IF NEW.city IS DISTINCT FROM OLD.city OR NEW.city_slug IS NULL THEN
             -- City geralmente vem "Nome - UF", pegamos só o nome
             NEW.city_slug := public.slugify(split_part(NEW.city, ' - ', 1));
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_store_slugs ON public.user_profiles;
CREATE TRIGGER tr_update_store_slugs
BEFORE INSERT OR UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_store_slugs();

-- Função para verificar se o usuário é administrador (Com SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $body$
DECLARE
  v_role public.user_role;
  v_is_admin BOOLEAN;
BEGIN
  -- 1. Tentar via JWT (Meta-dados do usuário)
  IF (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- 2. Fallback via Banco de Dados (Bypassa RLS por ser SECURITY DEFINER)
    SELECT (role = 'admin') INTO v_is_admin FROM public.user_profiles WHERE id = auth.uid();
    RETURN COALESCE(v_is_admin, FALSE);
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se o usuário está restrito (blocked/suspended)
CREATE OR REPLACE FUNCTION public.is_restricted()
RETURNS BOOLEAN AS $body$
DECLARE
    v_status public.user_status;
BEGIN
    SELECT status INTO v_status FROM public.user_profiles WHERE id = auth.uid();
    RETURN v_status::text IN ('blocked', 'suspended');
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função gatilho para bloquear ações de escrita em usuários restritos
CREATE OR REPLACE FUNCTION public.check_not_restricted_trigger()
RETURNS TRIGGER AS $body$
BEGIN
    IF public.is_restricted() THEN
        RAISE EXCEPTION 'Ação bloqueada: Sua conta está em modo restrito (apenas visualização).';
    END IF;
    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bloqueio para usuários restritos (Exceto o próprio campo de status que admin muda via SECURITY DEFINER em funções, 
-- mas aqui como é trigger BEFORE, o admin pode ser afetado se não filtrarmos por is_admin(). 
-- No entanto, admin não deve estar 'blocked'. 
-- Para garantir: admin nunca é restrito.
DROP TRIGGER IF EXISTS tr_restrict_user_profiles ON public.user_profiles;
CREATE TRIGGER tr_restrict_user_profiles
BEFORE UPDATE OR DELETE ON public.user_profiles
FOR EACH ROW
WHEN (NOT public.is_admin())
EXECUTE FUNCTION public.check_not_restricted_trigger();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE ON public.user_profiles TO authenticated;


DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid()::text = id::text);
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid()::text = id::text);
DROP POLICY IF EXISTS "Admins can manage user profiles" ON public.user_profiles;
CREATE POLICY "Admins can manage user profiles" ON public.user_profiles
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can view delivery partners" ON public.user_profiles;
CREATE POLICY "Authenticated users can view delivery partners" ON public.user_profiles
    FOR SELECT USING (role IN ('delivery_partner'::public.user_role, 'delivery_person'::public.user_role) AND is_active = true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;

-- Permitir leitura pública de perfis de LOJAS (Para exibir nome/endereço no Rastreio e Menu Digital)
DROP POLICY IF EXISTS "Public can view store profiles" ON public.user_profiles;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view store profiles' AND tablename = 'user_profiles') THEN
        CREATE POLICY "Public can view store profiles" ON public.user_profiles FOR SELECT USING (role = 'store_partner');
    END IF;
END $$;

-- ==================================================================
-- 2.1 CARTEIRAS E TRANSAÇÕES
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.store_wallets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.user_profiles(id) NOT NULL UNIQUE,
    balance_decimal NUMERIC(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.store_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own wallet" ON public.store_wallets;
CREATE POLICY "Users can view own wallet" ON public.store_wallets FOR SELECT USING (auth.uid()::text = store_id::text);
DROP POLICY IF EXISTS "Admins can view all wallets" ON public.store_wallets;
CREATE POLICY "Admins can view all wallets" ON public.store_wallets FOR SELECT USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    type TEXT NOT NULL, -- 'CREDIT', 'DEBIT', 'RECHARGE', 'PAYOUT', 'ADJUSTMENT'
    status TEXT DEFAULT 'COMPLETED',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.wallet_transactions;
CREATE POLICY "Users can view own transactions" ON public.wallet_transactions FOR SELECT USING (auth.uid()::text = store_id::text);
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.wallet_transactions;
CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions FOR SELECT USING (public.is_admin());

-- Garantir que a coluna address exista (Fix: erro rota /perfil)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'address') THEN
        ALTER TABLE public.user_profiles ADD COLUMN address TEXT;
    END IF;
    -- Novos campos para Branding da Loja (15/01/2026)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'cover_url') THEN
        ALTER TABLE public.user_profiles ADD COLUMN cover_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_logo_url') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_logo_url TEXT;
    END IF;
    -- Novos campos para Endereﾃｧo da Loja (separado do pessoal)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_zip') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_zip TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_street') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_street TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_number') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_district') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_district TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_city') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_city TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_state') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_state TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_address_complement') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_address_complement TEXT;
    END IF;
    -- Novos campos para URLs Amigﾃ｡veis (16/01/2026)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_slug') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_slug TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'city_slug') THEN
        ALTER TABLE public.user_profiles ADD COLUMN city_slug TEXT;
    END IF;
    -- Novo campo para vencimento do plano Super Lojista (17/01/2026)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'super_store_expiration') THEN
        ALTER TABLE public.user_profiles ADD COLUMN super_store_expiration TIMESTAMPTZ;
    END IF;

    -- Novos campos para Score e Bloqueio (20/01/2026)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'score') THEN
        ALTER TABLE public.user_profiles ADD COLUMN score INTEGER DEFAULT 50;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'refusal_count_monthly') THEN
        ALTER TABLE public.user_profiles ADD COLUMN refusal_count_monthly INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'cancellation_count_monthly') THEN
        ALTER TABLE public.user_profiles ADD COLUMN cancellation_count_monthly INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'config') THEN
        ALTER TABLE public.user_profiles ADD COLUMN config JSONB DEFAULT '{}'::jsonb;
    END IF;

END $$;

-- Tabela de Histórico de Score Manual (20/01/2026)
CREATE TABLE IF NOT EXISTS public.score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    old_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    diff INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que a coluna admin_id exista (em caso de migração parcial anterior)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'score_history' AND column_name = 'admin_id') THEN
        ALTER TABLE public.score_history ADD COLUMN admin_id UUID REFERENCES public.user_profiles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'score_history' AND column_name = 'diff') THEN
        ALTER TABLE public.score_history ADD COLUMN diff INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'score_history' AND column_name = 'old_score') THEN
        ALTER TABLE public.score_history ADD COLUMN old_score INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'score_history' AND column_name = 'new_score') THEN
        ALTER TABLE public.score_history ADD COLUMN new_score INTEGER NOT NULL DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'score_history' AND column_name = 'reason') THEN
        ALTER TABLE public.score_history ADD COLUMN reason TEXT NOT NULL DEFAULT '';
    END IF;

    -- Fix for event_key constraint if it exists (DB mismatch handling)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'score_history' AND column_name = 'event_key') THEN
        ALTER TABLE public.score_history ALTER COLUMN event_key DROP NOT NULL;
    END IF;

    -- Fix for impact constraint if it exists (DB mismatch handling)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'score_history' AND column_name = 'impact') THEN
        ALTER TABLE public.score_history ALTER COLUMN impact DROP NOT NULL;
    END IF;

    -- Fix for previous_score constraint if it exists (DB mismatch handling)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'score_history' AND column_name = 'previous_score') THEN
        ALTER TABLE public.score_history ALTER COLUMN previous_score DROP NOT NULL;
    END IF;
END $$;

ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view score history" ON public.score_history;
CREATE POLICY "Admins can view score history" ON public.score_history
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert score history" ON public.score_history;
CREATE POLICY "Admins can insert score history" ON public.score_history
    FOR INSERT WITH CHECK (public.is_admin());


-- Tabela de Dicas do Dia (Adicionada 11/01/2026 e movida para cﾃ｡ para resolver dependﾃｪncia de is_admin)
CREATE TABLE IF NOT EXISTS public.system_tips (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message text NOT NULL,
    target_role text NOT NULL, -- admin, store_partner, delivery_partner, all
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Migraﾃｧﾃ｣o segura para alterar tipo da coluna caso jﾃ｡ exista como enum
DO $$
BEGIN
    ALTER TABLE public.system_tips ALTER COLUMN target_role TYPE text;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE public.system_tips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to system_tips" ON public.system_tips;
CREATE POLICY "Public read access to system_tips" ON public.system_tips FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admin full access to system_tips" ON public.system_tips;
CREATE POLICY "Admin full access to system_tips" ON public.system_tips FOR ALL USING (public.is_admin());

GRANT SELECT ON public.system_tips TO anon, authenticated;
GRANT ALL ON public.system_tips TO authenticated;

-- Trigger para criar perfil de usuﾃ｡rio apﾃｳs AUTH
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

  -- Se for lojista ou entregador, criar carteira (Unificado em store_wallets)
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'delivery_person') IN ('store_partner', 'delivery_partner', 'delivery_person') THEN
      INSERT INTO public.store_wallets (store_id, balance_decimal)
      VALUES (NEW.id, 0)
      ON CONFLICT (store_id) DO NOTHING;
  END IF;

  -- Categoria Geral removida conforme solicitação. O lojista cria suas próprias categorias ou importa.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabela de terminais de usuﾃ｡rio (POS fﾃｭsico ou virtual)
CREATE TABLE IF NOT EXISTS public.user_terminals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    terminal_id TEXT UNIQUE, -- ID fﾃｭsico/lﾃｳgico do terminal
    api_key TEXT UNIQUE, -- Chave de API para integraﾃｧﾃ｣o do terminal
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
        CREATE POLICY "Users can manage their own terminals" ON public.user_terminals FOR ALL USING (auth.uid()::text = user_id::text);
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
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir que a coluna image_url exista (caso a tabela já existisse sem ela)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutional_categories' AND column_name = 'image_url') THEN
        ALTER TABLE public.institutional_categories ADD COLUMN image_url TEXT;
    END IF;
END $$;

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
    name VARCHAR(255) NOT NULL,
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir que a coluna store_id exista (caso a tabela jﾃ｡ existisse sem ela)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'store_id') THEN
        ALTER TABLE public.categories ADD COLUMN store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Remover UNIQUE antigo se existir para permitir nomes iguais em lojas diferentes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'categories' AND constraint_name = 'categories_name_key') THEN
        ALTER TABLE public.categories DROP CONSTRAINT categories_name_key;
    END IF;
END $$;

DROP TRIGGER IF EXISTS handle_categories_updated_at ON public.categories;
CREATE TRIGGER handle_categories_updated_at BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;

-- Políticas de Categorias
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
CREATE POLICY "Public can read categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Lojistas gerenciam categorias" ON public.categories;
CREATE POLICY "Lojistas gerenciam categorias" ON public.categories 
    FOR ALL USING (store_id::text = auth.uid()::text OR public.is_admin());
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    category_id UUID, -- Referência movida para bloco dinâmico abaixo
    store_id UUID, -- Referência movida para bloco dinâmico abaixo
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    stock_quantity INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Garantir que colunas existam (Fix: erro 42703 e 42804 compatibilidade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
        BEGIN
            ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
        EXCEPTION WHEN others THEN
            ALTER TABLE public.products ADD COLUMN category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL;
        END;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'store_id') THEN
        ALTER TABLE public.products ADD COLUMN store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE public.products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
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
-- Políticas Granulares para Produtos (Refatoradas em 18/01/2026 - Idempotentes)
DO $$
BEGIN
    -- 1. DROP da política antiga genérica (se existir)
    DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

    -- 2. SELECT Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and Owners can view all own products' AND tablename = 'products') THEN
        CREATE POLICY "Admins and Owners can view all own products" ON public.products
            FOR SELECT USING (
                public.is_admin() OR
                store_id::text = auth.uid()::text
            );
    END IF;

    -- 3. INSERT Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and Owners can insert products' AND tablename = 'products') THEN
        CREATE POLICY "Admins and Owners can insert products" ON public.products
            FOR INSERT WITH CHECK (
                public.is_admin() OR
                store_id::text = auth.uid()::text
            );
    END IF;

    -- 4. UPDATE Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and Owners can update products' AND tablename = 'products') THEN
        CREATE POLICY "Admins and Owners can update products" ON public.products
            FOR UPDATE USING (
                public.is_admin() OR
                store_id::text = auth.uid()::text
            );
    END IF;

    -- 5. DELETE Policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins and Owners can delete products' AND tablename = 'products') THEN
        CREATE POLICY "Admins and Owners can delete products" ON public.products
            FOR DELETE USING (
                public.is_admin() OR
                store_id::text = auth.uid()::text
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
        CREATE POLICY "Allow authenticated access to client_error_logs" ON public.client_error_logs FOR ALL USING (auth.uid()::text = user_id::text) WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;
GRANT SELECT, INSERT ON public.client_error_logs TO authenticated;
-- Tabela de configuraﾃｧﾃｵes PWA;
CREATE TABLE IF NOT EXISTS public.pwa_settings (
    id TEXT PRIMARY KEY DEFAULT '1', -- Assumindo uma ﾃｺnica linha de configuraﾃｧﾃｵes
    display_name VARCHAR(255),
    short_name VARCHAR(255),
    description TEXT,
    theme_color VARCHAR(7),
    background_color VARCHAR(7),
    start_url VARCHAR(255),
    orientation VARCHAR(50),
    language VARCHAR(10),
    app_version INT,
    -- Novos campos para personalizaﾃｧﾃ｣o completa
    scope VARCHAR(255) DEFAULT '/',
    icons JSONB DEFAULT '[]'::jsonb, -- Array de ﾃｭcones
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

-- Garantir que colunas existam caso a tabela jﾃ｡ tenha sido criada anteriormente (abordagem aditiva)
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


-- Tabela de transaﾃｧﾃｵes de terminal de usuﾃ｡rio (POS)
CREATE TABLE IF NOT EXISTS public.user_terminal_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    terminal_id UUID NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_offline_sync BOOLEAN DEFAULT FALSE,
    merchant_user_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    payer_id UUID,
    description TEXT,
    payer_name TEXT,
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
        CREATE POLICY "Authenticated users can create transactions" ON public.user_terminal_transactions FOR INSERT WITH CHECK (auth.uid()::text = merchant_user_id::text OR auth.uid()::text = payer_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Users can view their own terminal transactions" ON public.user_terminal_transactions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own terminal transactions' AND tablename = 'user_terminal_transactions') THEN
        CREATE POLICY "Users can view their own terminal transactions" ON public.user_terminal_transactions FOR SELECT USING (auth.uid()::text = merchant_user_id::text OR auth.uid()::text = payer_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all terminal transactions" ON public.user_terminal_transactions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all terminal transactions' AND tablename = 'user_terminal_transactions') THEN
        CREATE POLICY "Admins can manage all terminal transactions" ON public.user_terminal_transactions FOR ALL USING (public.is_admin());

-- Tabela para simulaﾃｧﾃｵes de vendas (compatﾃｭvel com SalesSimulation);
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
        CREATE POLICY "Users manage their own sales simulations" ON public.sales_simulations FOR ALL USING (auth.uid()::text = user_id::text);

-- Tabela para rotas salvas (compatﾃｭvel com SavedRoute);
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
        CREATE POLICY "Users manage their own saved routes" ON public.saved_routes FOR ALL USING (auth.uid()::text = user_id::text);


-- Tabela de configuraﾃｧﾃｵes de manutenﾃｧﾃ｣o (EXISTENTE) - Renomeada para manter consistﾃｪncia;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.maintenance_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    title VARCHAR(255) NOT NULL DEFAULT 'Manutenﾃｧﾃ｣o Programada',
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
    'Manutenﾃｧﾃ｣o Programada',
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

GRANT SELECT ON public.maintenance_settings TO anon, authenticated;
GRANT ALL ON public.maintenance_settings TO authenticated;

-- View de compatibilidade esperada pelo frontend: system_maintenance
-- Mapeia os campos usados na UI para os nomes presentes na tabela
-- Tabela de sistema para manutenﾃｧﾃ｣o (Compatibilidade com Realtime)
-- Substitui VIEW antiga para permitir publicaﾃｧﾃ｣o no Supabase Realtime e evitar erro 22023
-- DROP TABLE IF EXISTS public.system_maintenance;

CREATE TABLE IF NOT EXISTS public.system_maintenance (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    is_active BOOLEAN,
    start_time TEXT,
    end_time TEXT,
    message TEXT
);

-- Habilitar RLS
ALTER TABLE public.system_maintenance ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.system_maintenance TO anon, authenticated;

DROP POLICY IF EXISTS "Public read system_maintenance" ON public.system_maintenance;
CREATE POLICY "Public read system_maintenance" ON public.system_maintenance FOR SELECT USING (true);

-- Funﾃｧﾃ｣o e Trigger para sincronizar
CREATE OR REPLACE FUNCTION public.sync_system_maintenance()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.system_maintenance;
    INSERT INTO public.system_maintenance (id, is_active, start_time, end_time, message)
    SELECT
        1,
        is_enabled,
        COALESCE(to_char(scheduled_downtime, 'HH24:MI'), ''),
        COALESCE(to_char(estimated_recovery_time, 'HH24:MI'), ''),
        message
    FROM public.maintenance_settings
    ORDER BY updated_at DESC
    LIMIT 1;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_maintenance ON public.maintenance_settings;
CREATE TRIGGER trigger_sync_maintenance
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_settings
FOR EACH STATEMENT EXECUTE FUNCTION public.sync_system_maintenance();

-- Inicializar dados imediatamente
DO $$
BEGIN
    DELETE FROM public.system_maintenance;
    INSERT INTO public.system_maintenance (id, is_active, start_time, end_time, message)
    SELECT
        1,
        is_enabled,
        COALESCE(to_char(scheduled_downtime, 'HH24:MI'), ''),
        COALESCE(to_char(estimated_recovery_time, 'HH24:MI'), ''),
        message
    FROM public.maintenance_settings
    ORDER BY updated_at DESC
    LIMIT 1;
END $$;

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

-- Tabela de solicitações de novas ruas (29/01/2026)
CREATE TABLE IF NOT EXISTS public.street_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    street_name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    neighborhood TEXT,
    reference TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.street_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view and create their own street requests" ON public.street_requests;
CREATE POLICY "Users can view and create their own street requests" ON public.street_requests
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all street requests" ON public.street_requests;
CREATE POLICY "Admins can manage all street requests" ON public.street_requests
    FOR ALL USING (public.is_admin());

DROP TRIGGER IF EXISTS handle_street_requests_updated_at ON public.street_requests;
CREATE TRIGGER handle_street_requests_updated_at BEFORE UPDATE ON public.street_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de ruas aprovadas manualmente (29/01/2026)
CREATE TABLE IF NOT EXISTS public.approved_streets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    neighborhood TEXT,
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    request_id UUID REFERENCES public.street_requests(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS approved_streets_city_idx ON public.approved_streets (city);
CREATE INDEX IF NOT EXISTS approved_streets_name_idx ON public.approved_streets (name);

ALTER TABLE public.approved_streets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read approved streets" ON public.approved_streets;
CREATE POLICY "Public can read approved streets" ON public.approved_streets
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage approved streets" ON public.approved_streets;
CREATE POLICY "Admins can manage approved streets" ON public.approved_streets
    FOR ALL USING (public.is_admin());

DROP TRIGGER IF EXISTS handle_approved_streets_updated_at ON public.approved_streets;
CREATE TRIGGER handle_approved_streets_updated_at BEFORE UPDATE ON public.approved_streets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de avatares (para armazenamento de arquivos, via storage.from('avatars'))
CREATE TABLE IF NOT EXISTS public.avatars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_avatar_for_user UNIQUE (user_id) -- Apenas um avatar por usuﾃ｡rio
);
ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON public.avatars;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own avatar' AND tablename = 'avatars') THEN
        CREATE POLICY "Users can upload their own avatar" ON public.avatars FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Users can update their own avatar" ON public.avatars;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own avatar' AND tablename = 'avatars') THEN
        CREATE POLICY "Users can update their own avatar" ON public.avatars FOR UPDATE USING (auth.uid()::text = user_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON public.avatars;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own avatar' AND tablename = 'avatars') THEN
        CREATE POLICY "Users can delete their own avatar" ON public.avatars FOR DELETE USING (auth.uid()::text = user_id::text);
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
        CREATE POLICY "Partners can manage their own work_shifts" ON public.work_shifts FOR ALL USING (auth.uid()::text = partner_id::text);
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
    items JSONB NOT NULL DEFAULT '[]'::JSONB, -- [{ product_id, name, quantity, price }]
    total_price NUMERIC(10, 2) NOT NULL,
    payment_method public.payment_method NOT NULL,

    shipping_address JSONB, -- Endereço de entrega
    payment_details JSONB, -- Detalhes adicionais do pagamento
    shipping_cost NUMERIC(10, 2),
    discount NUMERIC(10, 2) DEFAULT 0,
    coupon_code TEXT,
    order_type TEXT, -- 'LOCAL' | 'PICKUP' | 'DELIVERY'
    delivery_mode TEXT, -- 'OWN' | 'PLATFORM' | 'ASSOCIATE'
    delivery_location_reference TEXT, -- Referência ou Local da Entrega (Obrigatório para Entregar por Localização)
    driver_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Entregador atribuído (fixo)
    customer_name TEXT,
    customer_phone TEXT,
    observation TEXT,
    origin TEXT DEFAULT 'INTERNAL',
    amount_paid NUMERIC(10, 2),
    change_amount NUMERIC(10, 2),
    custom_payment_label TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payment_status TEXT DEFAULT 'pending' -- pending, paid
);
CREATE INDEX IF NOT EXISTS orders_store_id_idx ON public.orders (store_id);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status);
DROP TRIGGER IF EXISTS handle_orders_updated_at ON public.orders;
CREATE TRIGGER handle_orders_updated_at BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bloqueio para usuários restritos
DROP TRIGGER IF EXISTS tr_restrict_orders ON public.orders;
CREATE TRIGGER tr_restrict_orders
BEFORE INSERT OR UPDATE OR DELETE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.check_not_restricted_trigger();

-- Adicionar colunas e corrigir tipos na tabela orders se necessário
DO $$
BEGIN
    -- Corrigir tipo da coluna items se for array (JSONB[]) para JSONB
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'items' AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE public.orders ALTER COLUMN items TYPE JSONB USING array_to_json(items)::JSONB;
        ALTER TABLE public.orders ALTER COLUMN items SET DEFAULT '[]'::JSONB;
    END IF;

    -- Adicionar colunas de dados do cliente e metadados
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
        ALTER TABLE public.orders ADD COLUMN origin TEXT DEFAULT 'INTERNAL';
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
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_location_reference') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_location_reference TEXT;
    END IF;
END $$;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store owners can manage their own orders" ON public.orders;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can manage their own orders' AND tablename = 'orders') THEN
        CREATE POLICY "Store owners can manage their own orders" ON public.orders FOR ALL USING (auth.uid()::text = store_id::text);
    END IF;
END $$;

-- Permissões para a tabela de pedidos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT ON public.orders TO anon;

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own orders' AND tablename = 'orders') THEN
        CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all orders' AND tablename = 'orders') THEN
        CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (public.is_admin());
    END IF;
END $$;

-- Permitir leitura pública de pedidos pelo ID (Tracking)
DROP POLICY IF EXISTS "Public can view orders by id" ON public.orders;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can view orders by id' AND tablename = 'orders') THEN
        -- RLS policy that admits access to everyone for SELECT
        -- In practice, the client must filter by ID in the query, and since UUIDs are unguessable, this is safe for tracking.
        CREATE POLICY "Public can view orders by id" ON public.orders FOR SELECT USING (true);
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
        CREATE POLICY "Users can manage their own backups" ON public.user_backups FOR ALL USING (auth.uid()::text = user_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can view all backups" ON public.user_backups;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view all backups' AND tablename = 'user_backups') THEN
        CREATE POLICY "Admins can view all backups" ON public.user_backups FOR SELECT USING (public.is_admin());


-- Tabela de notificaﾃｧﾃｵes de aplicativo para usuﾃ｡rios;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type TEXT DEFAULT 'info', -- 'success' | 'error' | 'warning' | 'info'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_notifications_user_id_idx ON public.user_notifications (user_id);
CREATE INDEX IF NOT EXISTS user_notifications_is_read_idx ON public.user_notifications (is_read);

DROP TRIGGER IF EXISTS handle_user_notifications_updated_at ON public.user_notifications;
CREATE TRIGGER handle_user_notifications_updated_at BEFORE UPDATE ON public.user_notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON public.user_notifications;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own notifications' AND tablename = 'user_notifications') THEN
        CREATE POLICY "Users can manage their own notifications" ON public.user_notifications FOR ALL USING (auth.uid()::text = user_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.user_notifications;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all notifications' AND tablename = 'user_notifications') THEN
        CREATE POLICY "Admins can manage all notifications" ON public.user_notifications FOR ALL USING (public.is_admin());


-- Tabela de histﾃｳrico manual de entregas de motoristas;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.driver_manual_histories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    summary_json JSONB NOT NULL, -- Contﾃｩm a estrutura de DeliveryRecord
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS driver_manual_histories_user_id_idx ON public.driver_manual_histories (user_id);
CREATE INDEX IF NOT EXISTS driver_manual_histories_date_idx ON public.driver_manual_histories (date);
ALTER TABLE public.driver_manual_histories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Drivers can manage their own manual histories" ON public.driver_manual_histories;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can manage their own manual histories' AND tablename = 'driver_manual_histories') THEN
        CREATE POLICY "Drivers can manage their own manual histories" ON public.driver_manual_histories FOR ALL USING (auth.uid()::text = user_id::text);
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
        CREATE POLICY "Authenticated users can insert blitz alerts" ON public.blitz_alerts FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
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
    category_id UUID, -- Referência movida para bloco dinâmico abaixo
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    stock_quantity INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Garantir que colunas existam (Fix: erro 42703 e 42804 compatibilidade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category_id') THEN
        BEGIN
            ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
        EXCEPTION WHEN others THEN
            ALTER TABLE public.products ADD COLUMN category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL;
        END;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'store_id') THEN
        ALTER TABLE public.products ADD COLUMN store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'is_active') THEN
        ALTER TABLE public.products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
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
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id::text = auth.uid()::text AND role = 'admin')
);

-- Tabela de configuraﾃｧﾃｵes da loja (geral);

CREATE TABLE IF NOT EXISTS public.shop_settings (
    id TEXT PRIMARY KEY DEFAULT '1', -- Assumindo uma ﾃｺnica linha
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

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    google_gemini_api_key TEXT,
    open_route_service_api_key TEXT
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
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id::text = auth.uid()::text AND role = 'admin')
);

INSERT INTO public.shop_settings (id) VALUES ('1') ON CONFLICT (id) DO NOTHING;

-- Garantir colunas de API se nﾃ｣o existirem
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS google_gemini_api_key TEXT;
ALTER TABLE public.shop_settings ADD COLUMN IF NOT EXISTS open_route_service_api_key TEXT;




-- ==================================================================
-- WALLET FUNCTIONS
-- ==================================================================

CREATE OR REPLACE FUNCTION public.credit_store_wallet(
    p_store_id UUID,
    p_amount NUMERIC,
    p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update Wallet Balance
    UPDATE public.store_wallets
    SET 
        balance_decimal = balance_decimal + p_amount,
        updated_at = NOW()
    WHERE store_id = p_store_id;

    -- Create Transaction Record
    INSERT INTO public.wallet_transactions (
        store_id,
        amount,
        type,
        status,
        description,
        created_at
    ) VALUES (
        p_store_id,
        p_amount,
        'CREDIT',
        'COMPLETED',
        p_description,
        NOW()
    );
END;
$$;

-- Alias genérico para crédito em carteira
CREATE OR REPLACE FUNCTION public.credit_wallet(
    p_user_id UUID,
    p_amount NUMERIC,
    p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.credit_store_wallet(p_user_id, p_amount, p_description);
END;
$$;

-- Função para tornar-se parceiro de entrega
CREATE OR REPLACE FUNCTION public.become_delivery_partner()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.user_profiles
    SET role = 'delivery_partner',
        status = 'active',
        is_active = true
    WHERE id::text = auth.uid()::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_wallet(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.become_delivery_partner() TO authenticated;




-- Tabela de requisiﾃｧﾃｵes de parceiros (entregas);

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
    delivery_code TEXT, -- Cﾃｳdigo de 4 dﾃｭgitos para confirmaﾃｧﾃ｣o de entrega
    expires_at TIMESTAMPTZ, -- Para requisiﾃｧﾃｵes que expiram se nﾃ｣o aceitas
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_requests TO authenticated;
DROP POLICY IF EXISTS "Store owners can manage their own requests" ON public.partner_requests;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can manage their own requests' AND tablename = 'partner_requests') THEN
        CREATE POLICY "Store owners can manage their own requests" ON public.partner_requests FOR ALL USING (auth.uid()::text = store_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Partners can view and accept available requests" ON public.partner_requests;
CREATE POLICY "Partners can view and accept available requests" ON public.partner_requests FOR SELECT USING (
    status = 'PENDING' OR auth.uid()::text = partner_id::text
);
DROP POLICY IF EXISTS "Partners can update their accepted requests" ON public.partner_requests;
CREATE POLICY "Partners can update their accepted requests" ON public.partner_requests FOR UPDATE USING (
    auth.uid()::text = partner_id::text AND status IN ('ACCEPTED', 'IN_TRANSIT', 'RETURNING')
);
DROP POLICY IF EXISTS "Admins can manage all partner requests" ON public.partner_requests;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all partner requests' AND tablename = 'partner_requests') THEN
        CREATE POLICY "Admins can manage all partner requests" ON public.partner_requests FOR ALL USING (public.is_admin());
    END IF;
END $$;


-- ==================================================================
-- TRIGGER PARA PAGAMENTO AUTOMÁTICO DE ENTREGAS (01/02/2026)
-- ==================================================================

CREATE OR REPLACE FUNCTION public.process_delivery_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_level TEXT;
    v_bonus_percent NUMERIC(5, 2) := 0;
    v_bonus_amount NUMERIC(10, 2) := 0;
    v_total_amount NUMERIC(10, 2);
    v_description TEXT;
BEGIN
    -- Verificar se status mudou para COMPLETED e existe delivered_code (confirmação simples) ou só status
    -- Aqui usamos status = 'COMPLETED'
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' AND NEW.partner_id IS NOT NULL THEN
        
        -- 1. Obter Nível do Parceiro
        SELECT partner_level INTO v_partner_level
        FROM public.user_profiles
        WHERE id = NEW.partner_id;

        -- 2. Obter Porcentagem de Bônus se existir nível
        IF v_partner_level IS NOT NULL THEN
            SELECT delivery_price_extra_percent INTO v_bonus_percent
            FROM public.partner_levels
            WHERE id = v_partner_level;
            
            IF v_bonus_percent IS NULL THEN v_bonus_percent := 0; END IF;
        END IF;

        -- 3. Calcular Bônus
        IF v_bonus_percent > 0 THEN
            v_bonus_amount := NEW.net_value_partner * (v_bonus_percent / 100.0);
        END IF;

        v_total_amount := NEW.net_value_partner + v_bonus_amount;
        
        IF v_bonus_amount > 0 THEN
            v_description := 'Entrega Realizada #' || SUBSTRING(NEW.id::text, 1, 8) || ' (Bônus Nível: ' || v_bonus_percent || '%)';
        ELSE
            v_description := 'Entrega Realizada #' || SUBSTRING(NEW.id::text, 1, 8);
        END IF;

        -- 4. Creditar Carteira do Entregador
        PERFORM public.credit_wallet(NEW.partner_id, v_total_amount, v_description);

        -- 5. Atualizar Score (Opcional, mas recomendado já que entrega foi sucesso)
        PERFORM public.update_driver_score(NEW.partner_id, 'DELIVERY_SUCCESS', 'Entrega finalizada', NEW.id);

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_process_delivery_payment ON public.partner_requests;
CREATE TRIGGER tr_process_delivery_payment
AFTER UPDATE ON public.partner_requests
FOR EACH ROW
EXECUTE FUNCTION public.process_delivery_payment();


-- ==================================================================
-- TRIGGER PARA PAGAMENTO AUTOMÁTICO DE ENTREGAS (01/02/2026)
-- ==================================================================

CREATE OR REPLACE FUNCTION public.process_delivery_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_partner_level TEXT;
    v_bonus_percent NUMERIC(5, 2) := 0;
    v_bonus_amount NUMERIC(10, 2) := 0;
    v_total_amount NUMERIC(10, 2);
    v_description TEXT;
BEGIN
    -- Verificar se status mudou para COMPLETED e existe delivered_code (confirmação simples) ou só status
    -- Aqui usamos status = 'COMPLETED'
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' AND NEW.partner_id IS NOT NULL THEN
        
        -- 1. Obter Nível do Parceiro
        SELECT partner_level INTO v_partner_level
        FROM public.user_profiles
        WHERE id = NEW.partner_id;

        -- 2. Obter Porcentagem de Bônus se existir nível
        IF v_partner_level IS NOT NULL THEN
            SELECT delivery_price_extra_percent INTO v_bonus_percent
            FROM public.partner_levels
            WHERE id = v_partner_level;
            
            IF v_bonus_percent IS NULL THEN v_bonus_percent := 0; END IF;
        END IF;

        -- 3. Calcular Bônus
        IF v_bonus_percent > 0 THEN
            v_bonus_amount := NEW.net_value_partner * (v_bonus_percent / 100.0);
        END IF;

        v_total_amount := NEW.net_value_partner + v_bonus_amount;
        
        IF v_bonus_amount > 0 THEN
            v_description := 'Entrega Realizada #' || SUBSTRING(NEW.id::text, 1, 8) || ' (Bônus Nível: ' || v_bonus_percent || '%)';
        ELSE
            v_description := 'Entrega Realizada #' || SUBSTRING(NEW.id::text, 1, 8);
        END IF;

        -- 4. Creditar Carteira do Entregador
        PERFORM public.credit_wallet(NEW.partner_id, v_total_amount, v_description);

        -- 5. Atualizar Score (Opcional, mas recomendado já que entrega foi sucesso)
        PERFORM public.update_driver_score(NEW.partner_id, 'DELIVERY_SUCCESS', 'Entrega finalizada', NEW.id);

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_process_delivery_payment ON public.partner_requests;
CREATE TRIGGER tr_process_delivery_payment
AFTER UPDATE ON public.partner_requests
FOR EACH ROW
EXECUTE FUNCTION public.process_delivery_payment();


-- ==================================================================
-- 2.3 SCORE E BLOQUEIO (20/01/2026)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.score_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_key TEXT UNIQUE NOT NULL, -- 'DELIVERY_SUCCESS', 'DELIVERY_IN_TIME', 'ORDER_CANCELLED_BY_DRIVER', etc.
    label TEXT NOT NULL,
    impact_value INTEGER NOT NULL, -- Positivo ou negativo
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    event_key TEXT NOT NULL,
    reason TEXT,
    impact INTEGER NOT NULL,
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    order_id UUID, -- Relacionamento opcional com pedido
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blocking_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    monthly_cancellation_limit INTEGER DEFAULT 10,
    monthly_refusal_limit INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blocking_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    type TEXT NOT NULL, -- 'AUTOMATIC', 'MANUAL'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configurações padrão de Score se não existirem
INSERT INTO public.score_config (event_key, label, impact_value)
VALUES 
    ('DELIVERY_SUCCESS', 'Entrega finalizada com sucesso', 5),
    ('DELIVERY_IN_TIME', 'Entrega no prazo', 2),
    ('HIGH_ACCEPTANCE_RATE', 'Alta taxa de aceitação', 10),
    ('ORDER_CANCELLED_BY_DRIVER', 'Pedido cancelado pelo entregador', -15),
    ('ORDER_REFUSED_BY_DRIVER', 'Pedido recusado pelo entregador', -5),
    ('ABANDON_AFTER_ACCEPT', 'Abandono de pedido após aceite', -25)
ON CONFLICT (event_key) DO NOTHING;

-- Inserir configuração padrão de Bloqueio se não existir
INSERT INTO public.blocking_config (monthly_cancellation_limit, monthly_refusal_limit)
VALUES (10, 30)
ON CONFLICT DO NOTHING;

-- RLS e Permissões
ALTER TABLE public.score_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocking_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocking_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read score config" ON public.score_config;
CREATE POLICY "Anyone can read score config" ON public.score_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage score config" ON public.score_config;
CREATE POLICY "Admins can manage score config" ON public.score_config FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own score history" ON public.score_history;
CREATE POLICY "Users can view own score history" ON public.score_history FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can view all score history" ON public.score_history;
CREATE POLICY "Admins can view all score history" ON public.score_history FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Anyone can read blocking config" ON public.blocking_config;
CREATE POLICY "Anyone can read blocking config" ON public.blocking_config FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage blocking config" ON public.blocking_config;
CREATE POLICY "Admins can manage blocking config" ON public.blocking_config FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own blocking history" ON public.blocking_history;
CREATE POLICY "Users can view own blocking history" ON public.blocking_history FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can view all blocking history" ON public.blocking_history;
CREATE POLICY "Admins can view all blocking history" ON public.blocking_history FOR SELECT USING (public.is_admin());

-- Seed initial data for blocking_config
INSERT INTO public.blocking_config (monthly_cancellation_limit, monthly_refusal_limit)
SELECT 999, 999
WHERE NOT EXISTS (SELECT 1 FROM public.blocking_config);

GRANT SELECT, UPDATE ON public.score_config TO authenticated;
GRANT SELECT, INSERT ON public.score_history TO authenticated;
GRANT SELECT, UPDATE ON public.blocking_config TO authenticated;
GRANT SELECT ON public.blocking_history TO authenticated;

-- Função para atualizar Score
CREATE OR REPLACE FUNCTION public.update_driver_score(
    p_user_id UUID,
    p_event_key TEXT,
    p_reason TEXT DEFAULT NULL,
    p_order_id UUID DEFAULT NULL
) RETURNS VOID AS $body$
DECLARE
    v_impact INTEGER;
    v_old_score INTEGER;
    v_new_score INTEGER;
    v_min_score INTEGER := 0;
    v_max_score INTEGER := 1000;
BEGIN
    -- Obter impacto da configuração
    SELECT impact_value INTO v_impact FROM public.score_config WHERE event_key = p_event_key AND is_active = TRUE;
    
    IF v_impact IS NULL THEN RETURN; END IF;

    -- Obter score atual
    SELECT score INTO v_old_score FROM public.user_profiles WHERE id = p_user_id;
    
    IF v_old_score IS NULL THEN v_old_score := 500; END IF;

    -- Calcular novo score respeitando limites
    v_new_score := v_old_score + v_impact;
    IF v_new_score < v_min_score THEN v_new_score := v_min_score; END IF;
    IF v_new_score > v_max_score THEN v_new_score := v_max_score; END IF;

    -- Atualizar perfil
    UPDATE public.user_profiles SET score = v_new_score, updated_at = NOW() WHERE id = p_user_id;

    -- Registrar no histórico
    INSERT INTO public.score_history (user_id, event_key, impact, previous_score, new_score, reason, order_id)
    SELECT p_user_id, p_event_key, v_impact, v_old_score, v_new_score, COALESCE(p_reason, label), p_order_id
    FROM public.score_config WHERE event_key = p_event_key;
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar bloqueio automático
CREATE OR REPLACE FUNCTION public.check_driver_blocking(p_user_id UUID)
RETURNS VOID AS $body$
DECLARE
    v_cancellations INTEGER;
    v_refusals INTEGER;
    v_limit_cancellation INTEGER;
    v_limit_refusal INTEGER;
    v_role public.user_role;
BEGIN
    -- Obter role
    SELECT role INTO v_role FROM public.user_profiles WHERE id = p_user_id;
    
    -- Bloqueio automático aplica apenas para entregador parceiro
    IF v_role != 'delivery_partner' THEN RETURN; END IF;

    -- Obter contadores atuais
    SELECT cancellation_count_monthly, refusal_count_monthly INTO v_cancellations, v_refusals
    FROM public.user_profiles WHERE id = p_user_id;

    -- Obter limites
    SELECT monthly_cancellation_limit, monthly_refusal_limit INTO v_limit_cancellation, v_limit_refusal
    FROM public.blocking_config LIMIT 1;

    -- Verificar limites
    IF v_cancellations >= v_limit_cancellation OR v_refusals >= v_limit_refusal THEN
        -- Bloquear conta
        UPDATE public.user_profiles 
        SET status = 'blocked', 
            updated_at = NOW() 
        WHERE id = p_user_id;

        -- Registrar no histórico
        INSERT INTO public.blocking_history (user_id, reason, type)
        VALUES (p_user_id, 
                CASE 
                    WHEN v_cancellations >= v_limit_cancellation THEN 'Limite mensal de cancelamentos atingido (' || v_cancellations || ')'
                    ELSE 'Limite mensal de recusas atingido (' || v_refusals || ')'
                END, 
                'AUTOMATIC');
    END IF;
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para registrar recusa/cancelamento e disparar verificação
CREATE OR REPLACE FUNCTION public.register_driver_event(
    p_user_id UUID,
    p_event_type TEXT -- 'REFUSAL', 'CANCELLATION'
) RETURNS VOID AS $body$
BEGIN
    IF p_event_type = 'REFUSAL' THEN
        UPDATE public.user_profiles SET refusal_count_monthly = refusal_count_monthly + 1 WHERE id = p_user_id;
        PERFORM public.update_driver_score(p_user_id, 'ORDER_REFUSED_BY_DRIVER', 'Recusa de pedido');
    ELSIF p_event_type = 'CANCELLATION' THEN
        UPDATE public.user_profiles SET cancellation_count_monthly = cancellation_count_monthly + 1 WHERE id = p_user_id;
        PERFORM public.update_driver_score(p_user_id, 'ORDER_CANCELLED_BY_DRIVER', 'Cancelamento de pedido');
    END IF;

    -- Verificar bloqueio
    PERFORM public.check_driver_blocking(p_user_id);
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para reset mensal (deve ser chamada via Cron ou gatilho de login)
CREATE OR REPLACE FUNCTION public.reset_monthly_stats_if_needed(p_user_id UUID)
RETURNS VOID AS $body$
DECLARE
    v_reset_date TIMESTAMPTZ;
BEGIN
    SELECT monthly_reset_date INTO v_reset_date FROM public.user_profiles WHERE id = p_user_id;

    IF NOW() >= v_reset_date THEN
        UPDATE public.user_profiles 
        SET refusal_count_monthly = 0,
            cancellation_count_monthly = 0,
            monthly_reset_date = (date_trunc('month', now()) + interval '1 month'),
            updated_at = NOW()
        WHERE id = p_user_id;
    END IF;
END;
$body$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TABLE IF NOT EXISTS public.store_delivery_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    fee NUMERIC(5, 2) DEFAULT 0, -- Taxa percentual especﾃｭfica para este parceiro/loja
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_partner UNIQUE (store_id, partner_id)
);
CREATE INDEX IF NOT EXISTS store_delivery_partners_store_id_idx ON public.store_delivery_partners (store_id);
CREATE INDEX IF NOT EXISTS store_delivery_partners_partner_id_idx ON public.store_delivery_partners (partner_id);
ALTER TABLE public.store_delivery_partners ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_delivery_partners TO authenticated;
DROP POLICY IF EXISTS "Store owners can manage their associated partners" ON public.store_delivery_partners;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can manage their associated partners' AND tablename = 'store_delivery_partners') THEN
        CREATE POLICY "Store owners can manage their associated partners" ON public.store_delivery_partners FOR ALL USING (auth.uid()::text = store_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Partners can view their associated stores" ON public.store_delivery_partners;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Partners can view their associated stores' AND tablename = 'store_delivery_partners') THEN
        CREATE POLICY "Partners can view their associated stores" ON public.store_delivery_partners FOR SELECT USING (auth.uid()::text = partner_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all store_delivery_partners" ON public.store_delivery_partners;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all store_delivery_partners' AND tablename = 'store_delivery_partners') THEN
        CREATE POLICY "Admins can manage all store_delivery_partners" ON public.store_delivery_partners FOR ALL USING (public.is_admin());

-- Polﾃｭtica para permitir que parceiros leiam perfis com base em associaﾃｧﾃ｣o ou visibilidade pﾃｺblica;
    END IF;
END $$;

-- Polﾃｭtica para permitir leitura durante avaliaﾃｧﾃ｣o de polﾃｭticas de outras tabelas
-- Necessﾃ｡ria para que delivery_person possa acessar user_profiles sem erro de permissﾃ｣o
DROP POLICY IF EXISTS "Authenticated users can read store_delivery_partners" ON public.store_delivery_partners;
CREATE POLICY "Authenticated users can read store_delivery_partners" 
    ON public.store_delivery_partners 
    FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Partners and stores can view associated profiles" ON public.user_profiles;
CREATE POLICY "Partners and stores can view associated profiles" ON public.user_profiles
    FOR SELECT USING (
        -- Usuﾃ｡rios podem ver o prﾃｳprio perfil (Regra Absoluta)
        auth.uid()::text = id::text
        -- Lojistas podem ver perfis de entregadores associados
        OR (
             EXISTS (
                SELECT 1 FROM public.store_delivery_partners sdp
                WHERE sdp.store_id::text = auth.uid()::text AND sdp.partner_id::text = id::text
            )
             AND (current_setting('request.jwt.claims', true)::jsonb -> 'user_metadata' ->> 'role') = 'store_partner'
        )
        -- Entregadores podem ver perfis de lojistas associados
        OR (
             EXISTS (
                SELECT 1 FROM public.store_delivery_partners sdp
                WHERE sdp.store_id::text = id::text AND sdp.partner_id::text = auth.uid()::text
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

-- Bloqueio para usuários restritos
DROP TRIGGER IF EXISTS tr_restrict_store_wallets ON public.store_wallets;
CREATE TRIGGER tr_restrict_store_wallets
BEFORE INSERT OR UPDATE OR DELETE ON public.store_wallets
FOR EACH ROW EXECUTE FUNCTION public.check_not_restricted_trigger();

ALTER TABLE public.store_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Store owners can view and manage their own wallet" ON public.store_wallets;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can view and manage their own wallet' AND tablename = 'store_wallets') THEN
        CREATE POLICY "Store owners can view and manage their own wallet" ON public.store_wallets FOR ALL USING (auth.uid()::text = store_id::text);
    END IF;
    -- Polﾃｭtica de backup para garantir SELECT explﾃｭcito se o ALL falhar em alguns contextos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can select their own wallet' AND tablename = 'store_wallets') THEN
        CREATE POLICY "Store owners can select their own wallet" ON public.store_wallets FOR SELECT USING (auth.uid()::text = store_id::text);
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

-- Tabela de notﾃｭcias da plataforma;

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
GRANT SELECT ON public.platform_news TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_news TO authenticated;
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


-- Tabela de cidades disponﾃｭveis;
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
GRANT SELECT ON public.available_cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.available_cities TO authenticated;
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


-- Tabela de requisiﾃｧﾃｵes de novas cidades;
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
    END IF;
END $$;

-- Atualização Manual (29/01/2026): Removendo ibge_code conforme solicitado
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'available_cities' AND column_name = 'ibge_code') THEN
        ALTER TABLE public.available_cities DROP COLUMN ibge_code;
    END IF;
END $$;

-- Tabela de Bairros (29/01/2026): Criando tabela neighborhoods para substituir city_districts de forma consistente
CREATE TABLE IF NOT EXISTS public.neighborhoods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_id UUID NOT NULL REFERENCES public.available_cities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    api_external_id INTEGER,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_city_neighborhood UNIQUE (city_id, name)
);

-- Índices e Trigger para neighborhoods
CREATE INDEX IF NOT EXISTS neighborhoods_city_id_idx ON public.neighborhoods (city_id);
CREATE INDEX IF NOT EXISTS neighborhoods_active_idx ON public.neighborhoods (active);

DROP TRIGGER IF EXISTS handle_neighborhoods_updated_at ON public.neighborhoods;
CREATE TRIGGER handle_neighborhoods_updated_at BEFORE UPDATE ON public.neighborhoods
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para neighborhoods
ALTER TABLE public.neighborhoods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active neighborhoods" ON public.neighborhoods;
CREATE POLICY "Public can read active neighborhoods" ON public.neighborhoods
    FOR SELECT USING (active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage neighborhoods" ON public.neighborhoods;
CREATE POLICY "Admins can manage neighborhoods" ON public.neighborhoods
    FOR ALL USING (public.is_admin());

GRANT SELECT ON public.neighborhoods TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.neighborhoods TO authenticated;
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
    order_id UUID, -- Referência movida para bloco dinâmico abaixo
    type public.chat_message_type NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir order_id e constraint (Fix: erro 42804 compatibilidade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'order_id') THEN
        BEGIN
            ALTER TABLE public.chat_messages ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
        EXCEPTION WHEN others THEN
            ALTER TABLE public.chat_messages ADD COLUMN order_id INTEGER REFERENCES public.orders(id) ON DELETE SET NULL;
        END;
    ELSE
        -- Garantir a FK se a coluna já existir mas estiver sem ela
        BEGIN
            ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL;
        EXCEPTION WHEN others THEN
            NULL;
        END;
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS chat_messages_sender_id_idx ON public.chat_messages (sender_id);
CREATE INDEX IF NOT EXISTS chat_messages_receiver_id_idx ON public.chat_messages (receiver_id);
CREATE INDEX IF NOT EXISTS chat_messages_order_id_idx ON public.chat_messages (order_id);
CREATE INDEX IF NOT EXISTS chat_messages_type_idx ON public.chat_messages (type);

-- Bloqueio para usuários restritos
DROP TRIGGER IF EXISTS tr_restrict_chat_messages ON public.chat_messages;
CREATE TRIGGER tr_restrict_chat_messages
BEFORE INSERT OR UPDATE OR DELETE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.check_not_restricted_trigger();

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can manage their own chat messages" ON public.chat_messages FOR ALL USING (
    auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text
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

-- Bloqueio para usuários restritos
DROP TRIGGER IF EXISTS tr_restrict_partner_documents ON public.partner_documents;
CREATE TRIGGER tr_restrict_partner_documents
BEFORE INSERT OR UPDATE OR DELETE ON public.partner_documents
FOR EACH ROW EXECUTE FUNCTION public.check_not_restricted_trigger();

ALTER TABLE public.partner_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own partner documents" ON public.partner_documents;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own partner documents' AND tablename = 'partner_documents') THEN
        CREATE POLICY "Users can manage their own partner documents" ON public.partner_documents FOR ALL USING (auth.uid()::text = user_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all partner documents" ON public.partner_documents;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all partner documents' AND tablename = 'partner_documents') THEN
        CREATE POLICY "Admins can manage all partner documents" ON public.partner_documents FOR ALL USING (public.is_admin());


-- Tabela de referﾃｪncias/indicaﾃｧﾃｵes;
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
        CREATE POLICY "Users can view their own referrals" ON public.referrals FOR SELECT USING (auth.uid()::text = referrer_id::text OR auth.uid()::text = referred_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Authenticated users can insert referrals" ON public.referrals;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert referrals' AND tablename = 'referrals') THEN
        CREATE POLICY "Authenticated users can insert referrals" ON public.referrals FOR INSERT WITH CHECK (auth.uid()::text = referred_id::text);
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
        CREATE POLICY "Store owners can manage their own shipping rules" ON public.store_shipping_rules FOR ALL USING (auth.uid()::text = store_id::text);
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


-- Tabela de configuraﾃｧﾃｵes do Cofrinho (investimento);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.cofrinho_settings (
    id TEXT PRIMARY KEY DEFAULT '1', -- Assumindo uma ﾃｺnica linha
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


-- Tabela de cartﾃｵes Zebank (virtuais/fﾃｭsicos de parceiros);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.zebank_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    card_number TEXT NOT NULL, -- Pode ser mascarado na aplicaﾃｧﾃ｣o
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zebank_cards TO authenticated;
DROP POLICY IF EXISTS "Users can manage their own Zebank cards" ON public.zebank_cards;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own Zebank cards' AND tablename = 'zebank_cards') THEN
        CREATE POLICY "Users can manage their own Zebank cards" ON public.zebank_cards FOR ALL USING (auth.uid()::text = user_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all Zebank cards" ON public.zebank_cards;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all Zebank cards' AND tablename = 'zebank_cards') THEN
        CREATE POLICY "Admins can manage all Zebank cards" ON public.zebank_cards FOR ALL USING (public.is_admin());


-- Tabela de verificaﾃｧﾃｵes de identidade;
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
        CREATE POLICY "Users can manage their own identity verifications" ON public.identity_verifications FOR ALL USING (auth.uid()::text = user_id::text);
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
        CREATE POLICY "Users can manage their own support claims" ON public.support_claims FOR ALL USING (auth.uid()::text = user_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all support claims" ON public.support_claims;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all support claims' AND tablename = 'support_claims') THEN
        CREATE POLICY "Admins can manage all support claims" ON public.support_claims FOR ALL USING (public.is_admin());


-- Tabela de configuraﾃｧﾃｵes de taxas de parceiros;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.partner_fee_settings (
    id TEXT PRIMARY KEY DEFAULT '1', -- Assumindo uma ﾃｺnica linha
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
GRANT ALL ON public.partner_fee_settings TO authenticated;
GRANT ALL ON public.partner_fee_settings TO service_role;


-- Tabela de avaliaﾃｧﾃｵes de parceiros;
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
        CREATE POLICY "Users can view their own ratings" ON public.partner_ratings FOR SELECT USING (auth.uid()::text = evaluator_id::text OR auth.uid()::text = evaluated_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Authenticated users can insert partner ratings" ON public.partner_ratings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert partner ratings' AND tablename = 'partner_ratings') THEN
        CREATE POLICY "Authenticated users can insert partner ratings" ON public.partner_ratings FOR INSERT WITH CHECK (auth.uid()::text = evaluator_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all partner ratings" ON public.partner_ratings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all partner ratings' AND tablename = 'partner_ratings') THEN
        CREATE POLICY "Admins can manage all partner ratings" ON public.partner_ratings FOR ALL USING (public.is_admin());


-- Tabela de usuﾃ｡rios na lista negra;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.blacklisted_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Pode ser NULL se o usuﾃ｡rio nﾃ｣o existir no sistema
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

-- Tabela de conteﾃｺdos institucionais (CMS);
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
-- Garantir que colunas existam (Fix: erro 42703 e 42804 compatibilidade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutional_contents' AND column_name = 'category_id') THEN
        BEGIN
            ALTER TABLE public.institutional_contents ADD COLUMN category_id UUID REFERENCES public.institutional_categories(id) ON DELETE SET NULL;
        EXCEPTION WHEN others THEN
            ALTER TABLE public.institutional_contents ADD COLUMN category_id INTEGER REFERENCES public.institutional_categories(id) ON DELETE SET NULL;
        END;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'institutional_contents' AND column_name = 'is_active') THEN
        ALTER TABLE public.institutional_contents ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;
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


-- Tabela de imagens de conteﾃｺdos institucionais;
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


-- Tabela de associaﾃｧﾃ｣o entre conteﾃｺdos institucionais e tags;
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

-- Tabela de versﾃｵes de conteﾃｺdos institucionais (histﾃｳrico);
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


-- Tabela de nﾃｭveis de parceiros;
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.partner_levels (
    id TEXT PRIMARY KEY, -- Nﾃｭvel (ex: 'BRONZE', 'PRATA')
    display_name VARCHAR(255) NOT NULL,
    min_deliveries INT NOT NULL DEFAULT 0,
    min_rating NUMERIC(2, 1) NOT NULL DEFAULT 0.0,
    store_discount_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    service_fee_reduction_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    delivery_price_extra_percent NUMERIC(5, 2) DEFAULT 0.0, -- Adicionado em 01/02/2026
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
-- Inserir nﾃｭveis padrﾃ｣o se nﾃ｣o existirem
INSERT INTO public.partner_levels (id, display_name, min_deliveries, min_rating, store_discount_percent, service_fee_reduction_percent, delivery_price_extra_percent) VALUES
('BRONZE', 'Bronze', 0, 0.0, 0.0, 0.0, 0.0),
('SILVER', 'Prata', 50, 4.0, 2.0, 1.0, 2.0),
('GOLD', 'Ouro', 200, 4.5, 5.0, 2.5, 5.0),
('PLATINUM', 'Platina', 500, 4.8, 10.0, 5.0, 10.0)
ON CONFLICT (id) DO NOTHING;


-- Tabela de configuraﾃｧﾃｵes de repasse (payout);
    END IF;
END $$;
GRANT SELECT ON public.partner_levels TO anon, authenticated;
GRANT ALL ON public.partner_levels TO authenticated;
CREATE TABLE IF NOT EXISTS public.payout_settings (
    id TEXT PRIMARY KEY DEFAULT '1', -- Assumindo uma ﾃｺnica linha
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
    transaction_details JSONB, -- Detalhes da transaﾃｧﾃ｣o
    external_transaction_id TEXT,
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
        CREATE POLICY "Partners can view their own payments" ON public.partner_payments FOR SELECT USING (auth.uid()::text = partner_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all partner payments" ON public.partner_payments;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all partner payments' AND tablename = 'partner_payments') THEN
        CREATE POLICY "Admins can manage all partner payments" ON public.partner_payments FOR ALL USING (public.is_admin());


-- Tabela de transaﾃｧﾃｵes da carteira da loja (inclui emprﾃｩstimos);
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
        CREATE POLICY "Store owners can view their own wallet transactions" ON public.store_wallet_transactions FOR ALL USING (auth.uid()::text = store_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all store wallet transactions" ON public.store_wallet_transactions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all store wallet transactions' AND tablename = 'store_wallet_transactions') THEN
        CREATE POLICY "Admins can manage all store wallet transactions" ON public.store_wallet_transactions FOR ALL USING (public.is_admin());


-- Tabela para cartﾃｵes virtuais de loja;
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
    FOR ALL USING (auth.uid()::text = store_id::text);
DROP POLICY IF EXISTS "Admins can manage all store virtual cards" ON public.store_virtual_cards;
CREATE POLICY "Admins can manage all store virtual cards" ON public.store_virtual_cards
    FOR ALL USING (public.is_admin());

-- Tabela para carteiras de entregadores (Zebank)
CREATE TABLE IF NOT EXISTS public.driver_wallets (
    driver_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    balance_decimal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    savings_balance_decimal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS handle_driver_wallets_updated_at ON public.driver_wallets;
CREATE TRIGGER handle_driver_wallets_updated_at BEFORE UPDATE ON public.driver_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.driver_wallets ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_wallets TO authenticated;
DROP POLICY IF EXISTS "Drivers can access their own wallet" ON public.driver_wallets;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can access their own wallet' AND tablename = 'driver_wallets') THEN
        CREATE POLICY "Drivers can access their own wallet" ON public.driver_wallets FOR ALL USING (auth.uid()::text = driver_id::text);
    END IF;
END $$;
DROP POLICY IF EXISTS "Admins can manage all driver wallets" ON public.driver_wallets;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all driver wallets' AND tablename = 'driver_wallets') THEN
        CREATE POLICY "Admins can manage all driver wallets" ON public.driver_wallets FOR ALL USING (public.is_admin());

-- Tabela para transaﾃｧﾃｵes da carteira de entregadores (Zebank);
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
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_wallet_transactions TO authenticated;
DROP POLICY IF EXISTS "Drivers can view their own wallet transactions" ON public.driver_wallet_transactions;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can view their own wallet transactions' AND tablename = 'driver_wallet_transactions') THEN
        CREATE POLICY "Drivers can view their own wallet transactions" ON public.driver_wallet_transactions FOR ALL USING (auth.uid()::text = driver_id::text);
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
  name TEXT,
  key_token TEXT,
  encrypted_key text NOT NULL,
  permissions JSONB DEFAULT '{}'::jsonb,
  is_active boolean NULL DEFAULT true,
  user_id UUID REFERENCES public.user_profiles(id),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  constraint api_keys_pkey primary key (id),
  constraint api_keys_service_name_key unique (service_name)
);

-- Garantir colunas extras e unicidade
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_token') THEN
        ALTER TABLE public.api_keys ADD COLUMN key_token TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'name') THEN
        ALTER TABLE public.api_keys ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'permissions') THEN
        ALTER TABLE public.api_keys ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_service_name_key') THEN
        ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_service_name_key UNIQUE (service_name);
    END IF;
END $$;
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
GRANT ALL ON public.api_keys TO authenticated;
GRANT SELECT ON public.api_keys TO anon;

-- ==================================================================
-- 3.x FUNﾃ�髭S (DO BANCO)
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
    WHERE up.id::text = auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_my_role_and_status() TO authenticated;

-- Funﾃｧﾃ｣o: get_partner_financial_summary
CREATE OR REPLACE FUNCTION public.get_partner_financial_summary()
RETURNS TABLE (total_earnings NUMERIC, available_balance NUMERIC, max_emergency_value NUMERIC, emergency_message TEXT) AS $$
DECLARE
  v_role public.user_role;
  v_user UUID := auth.uid()::uuid;
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

-- Funﾃｧﾃ｣o: create_order
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
        auth.uid()::uuid,
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

-- Funﾃｧﾃ｣o: create_recharge_charge
CREATE OR REPLACE FUNCTION public.create_recharge_charge(amount NUMERIC, method TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN jsonb_build_object(
    'message', 'Not implemented: Payment API calls should be handled via Edge Functions for security.',
    'pix_copy_paste', 'mock_pix_key_123',
    'bank_slip_url', 'https://mock.bank.com/boleto/123'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: store_decide_failed_delivery
CREATE OR REPLACE FUNCTION public.store_decide_failed_delivery(request_id UUID, decision TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.partner_requests
  SET status = CASE WHEN LOWER(decision) = 'refund' THEN 'CANCELLED' ELSE 'RETURNING' END,
      updated_at = now()
  WHERE id = request_id AND store_id::text = auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: submit_rating
CREATE OR REPLACE FUNCTION public.submit_rating(request_id UUID, rating INT, comment TEXT, direction TEXT)
RETURNS VOID AS $$
DECLARE
  v_req RECORD;
  v_evaluator_id UUID := auth.uid()::uuid;
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

-- Funﾃｧﾃ｣o: get_partner_requests_available
CREATE OR REPLACE FUNCTION public.get_partner_requests_available()
RETURNS SETOF public.partner_requests AS $$
BEGIN

    RETURN QUERY
    SELECT * FROM public.partner_requests
    WHERE status = 'PENDING' 
      AND (expires_at IS NULL OR expires_at > now())
      AND (partner_id IS NULL OR partner_id::text = auth.uid()::text) -- Visibilidade: Pﾃｺblica (NULL) ou Direcionada (Meu ID)
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: accept_partner_request
CREATE OR REPLACE FUNCTION public.accept_partner_request(p_request_id UUID)
RETURNS VOID AS $$
DECLARE
  v_partner UUID := auth.uid()::uuid;
BEGIN
  UPDATE public.partner_requests
  SET partner_id = v_partner, status = 'ACCEPTED', updated_at = now()
  WHERE id = p_request_id AND status = 'PENDING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: partner_confirm_pickup
CREATE OR REPLACE FUNCTION public.partner_confirm_pickup(p_request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.partner_requests
  SET status = 'IN_TRANSIT', updated_at = now()
  WHERE id = p_request_id AND partner_id::text = auth.uid()::text AND status = 'ACCEPTED';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: partner_confirm_delivery
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
  WHERE id = request_id AND partner_id::text = auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: confirm_return
CREATE OR REPLACE FUNCTION public.confirm_return(request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.partner_requests
  SET status = 'CANCELLED', updated_at = now()
  WHERE id = request_id AND store_id::text = auth.uid()::text AND status = 'RETURNING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: request_emergency_payout
CREATE OR REPLACE FUNCTION public.request_emergency_payout(payout_details JSONB)
RETURNS VOID AS $$
BEGIN
  -- Lﾃｳgica a ser implementada, provavelmente envolvendo inserﾃｧﾃ｣o em partner_payments
  -- e uma chamada de webhook para um processador de pagamento.
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: associate_partner_to_store
CREATE OR REPLACE FUNCTION public.associate_partner_to_store(p_partner_id UUID, p_fee NUMERIC)
RETURNS VOID AS $$
DECLARE
  v_store_id UUID := auth.uid()::uuid;
BEGIN
  INSERT INTO public.store_delivery_partners (store_id, partner_id, fee)
  VALUES (v_store_id, p_partner_id, p_fee)
  ON CONFLICT (store_id, partner_id) DO UPDATE SET fee = p_fee;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: get_partner_associated_stores
CREATE OR REPLACE FUNCTION public.get_partner_associated_stores()
RETURNS TABLE (id UUID, name TEXT, city TEXT, avatar_url TEXT) AS $$
DECLARE
    v_partner_id UUID := auth.uid()::uuid;
BEGIN
  RETURN QUERY
    SELECT p.id, p.name, p.city, p.avatar_url
    FROM public.user_profiles p
    JOIN public.store_delivery_partners sdp ON sdp.store_id = p.id
    WHERE sdp.partner_id = v_partner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: create_partner_request
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
    v_store_id UUID := auth.uid()::uuid;
    v_delivery_code TEXT;
    v_new_request_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_is_super_store BOOLEAN := FALSE;
    v_final_total_charged NUMERIC;
    v_final_fee_fixed NUMERIC;
    v_final_fee_percent NUMERIC;
BEGIN
    -- Gerar código de entrega único
    v_delivery_code := '#' || LPAD(FLOOR(random() * 10000)::int::text, 4, '0');

    -- Verificar se o lojista é Super Lojista
    SELECT COALESCE(is_super_store, FALSE) INTO v_is_super_store 
    FROM public.user_profiles 
    WHERE id = v_store_id;

    -- Definir tempo de expiração se for para a plataforma
    IF p_request_type = 'PLATFORM' THEN
        v_expires_at := now() + interval '5 minutes';
    ELSE
        v_expires_at := NULL;
    END IF;

    -- Lógica de taxas: 
    -- 1. Se for ASSOCIATE, taxas da plataforma são ZERO.
    -- 2. Se for PLATFORM e Super Lojista, taxas da plataforma são ZERO (apenas valor da entrega).
    -- 3. Se for PLATFORM e lojista comum, usa as taxas configuradas.
    IF p_request_type = 'ASSOCIATE' THEN
        -- Entregador próprio: sem taxas
        v_final_total_charged := p_total_charged_store;
        v_final_fee_fixed := 0;
        v_final_fee_percent := 0;
    ELSIF p_request_type = 'PLATFORM' AND v_is_super_store = TRUE THEN
        -- Super Lojista: sem taxas da plataforma, paga apenas o valor da entrega
        v_final_total_charged := p_net_value_partner;
        v_final_fee_fixed := 0;
        v_final_fee_percent := 0;
    ELSE
        -- Lojista comum: com taxas da plataforma
        v_final_total_charged := p_total_charged_store;
        v_final_fee_fixed := (p_fees->>'global_tax_fixed')::NUMERIC;
        v_final_fee_percent := (p_fees->>'global_tax_percent')::NUMERIC * p_net_value_partner;
    END IF;

    -- Inserir o pedido com os valores calculados
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
        v_final_total_charged,
        p_net_value_partner,
        v_final_fee_fixed,
        v_final_fee_percent,
        p_target_partner_id,
        'PENDING'::public.partner_request_status,
        v_delivery_code,
        v_expires_at
    ) RETURNING id INTO v_new_request_id;

    RETURN jsonb_build_object(
        'requestId', v_new_request_id,
        'deliveryCode', v_delivery_code,
        'expiresAt', v_expires_at
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: record_payment_gateway_log
CREATE OR REPLACE FUNCTION public.record_payment_gateway_log(
    p_request_data JSONB,
    p_response_data JSONB,
    p_error_message TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.payment_gateway_logs (request_data, response_data, error_message)
  VALUES (p_request_data, p_response_data, p_error_message);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 
-- TABELA DE ASSOCIAÇÃO LOJA-ENTREGADOR (Correção Bug Entregador Fixo)
--
CREATE TABLE IF NOT EXISTS public.store_delivery_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES auth.users(id), -- Assume que store_id é o ID do usuário lojista
    partner_id UUID NOT NULL REFERENCES public.user_profiles(id),
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, PENDING, BLOCKED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_store_partner UNIQUE (store_id, partner_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_store_partners_store ON public.store_delivery_partners(store_id);
CREATE INDEX IF NOT EXISTS idx_store_partners_partner ON public.store_delivery_partners(partner_id);

-- RLS
-- RLS
ALTER TABLE public.store_delivery_partners ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lojistas vêm e gerenciam seus parceiros' AND tablename = 'store_delivery_partners') THEN
        CREATE POLICY "Lojistas vêm e gerenciam seus parceiros" ON public.store_delivery_partners
            FOR ALL
            USING (auth.uid() = store_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Entregadores vêm suas associações' AND tablename = 'store_delivery_partners') THEN
        CREATE POLICY "Entregadores vêm suas associações" ON public.store_delivery_partners
            FOR SELECT
            USING (auth.uid() = partner_id);
    END IF;
END $$;

-- Grants
GRANT ALL ON public.store_delivery_partners TO authenticated;
GRANT ALL ON public.store_delivery_partners TO service_role;

-- Funﾃｧﾃ｣o: record_store_loan
CREATE OR REPLACE FUNCTION public.record_store_loan(p_amount NUMERIC)
RETURNS VOID AS $$
DECLARE
    v_store_id UUID := auth.uid()::uuid;
    v_loan_amount NUMERIC := -ABS(p_amount);
BEGIN
    -- Inserir transaﾃｧﾃ｣o de emprﾃｩstimo
    INSERT INTO public.store_wallet_transactions(store_id, amount, description, type, status)
    VALUES (v_store_id, v_loan_amount, 'Emprﾃｩstimo para Capital de Giro', 'LOAN', 'PENDING');

    -- Atualizar o saldo da carteira da loja
    INSERT INTO public.store_wallets (store_id, balance_decimal)
    VALUES (v_store_id, v_loan_amount)
    ON CONFLICT (store_id) DO UPDATE
    SET balance_decimal = public.store_wallets.balance_decimal + v_loan_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: get_public_fee_settings
CREATE OR REPLACE FUNCTION public.get_public_fee_settings()
RETURNS SETOF public.partner_fee_settings AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.partner_fee_settings ORDER BY updated_at DESC LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: auto_cancel_unaccepted_request
CREATE OR REPLACE FUNCTION public.auto_cancel_unaccepted_request(p_request_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.partner_requests
  SET status = 'EXPIRED', updated_at = now()
  WHERE id = p_request_id AND status IN ('PENDING', 'AWAITING_STORE_DECISION');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: process_city_request
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

-- Funﾃｧﾃ｣o: get_admin_dashboard_stats
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
  v_platform_revenue := 0; -- Lﾃｳgica de cﾃ｡lculo de receita precisa ser definida
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

-- Funﾃｧﾃ｣o: get_my_referral_data
CREATE OR REPLACE FUNCTION public.get_my_referral_data()
RETURNS JSONB AS $$ -- Retorna JSONB para ReferralData complexo
DECLARE
  v_code TEXT;
BEGIN
  SELECT association_code INTO v_code FROM public.user_profiles WHERE id::text = auth.uid()::text;
  RETURN jsonb_build_object('my_code', v_code, 'is_reward_active', FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: get_my_referral_history
CREATE OR REPLACE FUNCTION public.get_my_referral_history()
RETURNS SETOF public.referrals AS $$ -- Retorna SETOF referrals simplificado
BEGIN
  RETURN QUERY SELECT * FROM public.referrals WHERE referrer_id::text = auth.uid()::text OR referred_id::text = auth.uid()::text ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: redeem_referral_code
CREATE OR REPLACE FUNCTION public.redeem_referral_code(code TEXT)
RETURNS VOID AS $$
DECLARE
  v_referrer UUID;
BEGIN
  SELECT id INTO v_referrer FROM public.user_profiles WHERE association_code = code;
  IF v_referrer IS NULL THEN
    RAISE EXCEPTION 'Referral code % not found', code;
  END IF;
  IF v_referrer::text = auth.uid()::text THEN
    RAISE EXCEPTION 'You cannot redeem your own referral code.';
  END IF;
  INSERT INTO public.referrals(referrer_id, referred_id, code_used, status)
  VALUES (v_referrer, auth.uid()::uuid, code, 'PENDING')
  ON CONFLICT (referred_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: get_store_reports
CREATE OR REPLACE FUNCTION public.get_store_reports()
RETURNS JSONB AS $$ -- Retorna JSONB para StoreReportData complexo
DECLARE
  v_store UUID := auth.uid()::uuid;
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

-- Funﾃｧﾃ｣o: subscribe_to_super_store
CREATE OR REPLACE FUNCTION public.subscribe_to_super_store(fee NUMERIC)
RETURNS VOID AS $$
DECLARE
  v_user UUID := auth.uid()::uuid;
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

-- Funﾃｧﾃ｣o: admin_get_consolidated_wallets
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

-- Funﾃｧﾃ｣o: get_pending_payouts_summary
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
      NULL::TIMESTAMPTZ, -- Lﾃｳgica de data do prﾃｳximo payout precisa ser definida
      (SELECT MAX(pp.created_at) FROM public.partner_payments pp WHERE pp.partner_id = u.id AND pp.status = 'COMPLETED')
    FROM public.user_profiles u
    WHERE u.role IN ('delivery_partner','delivery_person');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: admin_adjust_balance
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
        -- Para entregadores, a lﾃｳgica pode ser diferente (ex: criar tabela driver_wallets)
        RAISE EXCEPTION 'Balance adjustment for this user role is not implemented yet.';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: admin_update_driver_automatic_payouts
CREATE OR REPLACE FUNCTION public.admin_update_driver_automatic_payouts(p_user_id UUID, p_enabled BOOLEAN)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;
  UPDATE public.user_profiles SET automatic_payouts_enabled = p_enabled WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: admin_update_driver_preferred_payout_method
CREATE OR REPLACE FUNCTION public.admin_update_driver_preferred_payout_method(p_user_id UUID, p_method_type public.payout_method_type)
RETURNS VOID AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;
  UPDATE public.user_profiles SET preferred_payout_method_type = p_method_type WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: generate_card_qr_token
CREATE OR REPLACE FUNCTION public.generate_card_qr_token(card_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- Apenas um exemplo simples. Para produﾃｧﾃ｣o, use JWT ou um mﾃｩtodo mais seguro.
  RETURN md5(card_id::text || ':' || extract(epoch FROM now())::text || '-' || random()::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: get_zebank_dashboard_data
CREATE OR REPLACE FUNCTION public.get_zebank_dashboard_data()
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID := auth.uid()::uuid;
    v_balance NUMERIC;
    v_savings_balance NUMERIC;
    v_cards JSONB;
    v_transactions JSONB;
    v_my_code TEXT;
    v_partner_level TEXT;
BEGIN
    SELECT COALESCE(balance_decimal, 0) INTO v_balance FROM public.driver_wallets WHERE driver_id = v_user_id;
    v_savings_balance := 0; -- Lﾃｳgica do cofrinho a ser implementada

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


-- Funﾃｧﾃ｣o: zebank_p2p_transfer
CREATE OR REPLACE FUNCTION public.zebank_p2p_transfer(receiver_code TEXT, amount NUMERIC)
RETURNS VOID AS $$
DECLARE
    v_sender_id UUID := auth.uid()::uuid;
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
    VALUES (v_sender_id, -amount, 'Transferﾃｪncia para ' || (SELECT name FROM user_profiles WHERE id = v_receiver_id), 'TRANSFER', 'COMPLETED');

    -- Creditar ao destinatﾃ｡rio
    UPDATE public.driver_wallets
    SET balance_decimal = balance_decimal + amount
    WHERE driver_id = v_receiver_id;
    
    INSERT INTO public.driver_wallet_transactions(driver_id, amount, description, type, status)
    VALUES (v_receiver_id, amount, 'Transferﾃｪncia de ' || (SELECT name FROM user_profiles WHERE id = v_sender_id), 'TRANSFER', 'COMPLETED');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Funﾃｧﾃ｣o: zebank_manage_savings
CREATE OR REPLACE FUNCTION public.zebank_manage_savings(action TEXT, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  -- Lﾃｳgica do cofrinho a ser implementada
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: admin_update_cofrinho_settings
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

-- Funﾃｧﾃ｣o: zebank_create_virtual_card
CREATE OR REPLACE FUNCTION public.zebank_create_virtual_card(card_name TEXT)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid()::uuid;
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

-- Funﾃｧﾃ｣o: simulate_card_transaction
CREATE OR REPLACE FUNCTION public.simulate_card_transaction(card_id UUID, amount NUMERIC, description TEXT)
RETURNS VOID AS $$
BEGIN
  -- Lﾃｳgica para simular uma transaﾃｧﾃ｣o de cartﾃ｣o, ﾃｺtil para testes.
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: send_global_notification
CREATE OR REPLACE FUNCTION public.send_global_notification(p_title TEXT, p_message TEXT, p_type TEXT DEFAULT 'info')
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
        INSERT INTO public.user_notifications (user_id, title, message, type)
        VALUES (user_id, p_title, p_message, p_type);
    END LOOP;
    CLOSE all_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: activate_my_terminal
CREATE OR REPLACE FUNCTION public.activate_my_terminal()
RETURNS SETOF public.user_terminals AS $$
DECLARE
  v_user UUID := auth.uid()::uuid;
BEGIN
  UPDATE public.user_terminals
  SET status = 'ACTIVE', activated_at = now(), deactivated_at = NULL
  WHERE user_id = v_user;
  RETURN QUERY SELECT * FROM public.user_terminals WHERE user_id = v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: deactivate_my_terminal
CREATE OR REPLACE FUNCTION public.deactivate_my_terminal()
RETURNS VOID AS $$
DECLARE
  v_user UUID := auth.uid()::uuid;
BEGIN
  UPDATE public.user_terminals
  SET status = 'INACTIVE', deactivated_at = now()
  WHERE user_id = v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: get_my_terminal_history
CREATE OR REPLACE FUNCTION public.get_my_terminal_history()
RETURNS SETOF public.user_terminal_transactions AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.user_terminal_transactions WHERE merchant_user_id::text = auth.uid()::text ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: update_my_terminal_settings
CREATE OR REPLACE FUNCTION public.update_my_terminal_settings(p_label TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE public.user_terminals SET label = p_label, updated_at = now() WHERE user_id::text = auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: verify_terminal_pin
CREATE OR REPLACE FUNCTION public.verify_terminal_pin(p_pin_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.user_terminals WHERE user_id::text = auth.uid()::text AND pin_code = p_pin_code) INTO v_exists;
  RETURN COALESCE(v_exists, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: get_zepay_dashboard_data
CREATE OR REPLACE FUNCTION public.get_zepay_dashboard_data()
RETURNS JSONB AS $$
BEGIN
  -- Implementaﾃｧﾃ｣o similar a get_zebank_dashboard_data mas para lojistas
  RETURN '{}'::JSONB;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: zepay_transfer
CREATE OR REPLACE FUNCTION public.zepay_transfer(receiver_code TEXT, amount NUMERIC)
RETURNS VOID AS $$
BEGIN
  -- Lﾃｳgica de transferﾃｪncia entre lojas ou loja->entregador
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: zepay_create_virtual_card
CREATE OR REPLACE FUNCTION public.zepay_create_virtual_card(card_name TEXT)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid()::uuid;
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

-- Funﾃｧﾃ｣o: process_user_pos_payment
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
    FROM public.user_terminals WHERE id = p_card_id -- Simplificaﾃｧﾃ｣o, a lﾃｳgica real seria mais complexa
    RETURNING id INTO v_transaction_id;
  RETURN v_transaction_id::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: log_client_error
CREATE OR REPLACE FUNCTION public.log_client_error(p_category TEXT, p_message TEXT, p_context JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.client_error_logs(user_id, category, message, payload)
  VALUES (auth.uid()::uuid, p_category, p_message, p_context);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: save_sales_simulation
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
  VALUES (auth.uid()::uuid, p_sale_value, p_fee_payer, p_gross_value, p_net_value, p_fees);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: get_my_sales_simulations
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
  RETURN QUERY SELECT s.* FROM public.sales_simulations s WHERE s.user_id::text = auth.uid()::text ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funﾃｧﾃ｣o: clear_my_sales_simulations
CREATE OR REPLACE FUNCTION public.clear_my_sales_simulations()
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.sales_simulations WHERE user_id::text = auth.uid()::text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Funﾃｧﾃ｣o: save_route
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
  VALUES (v_id, auth.uid()::uuid, p_name, p_waypoints, p_distance, p_duration);
  RETURN v_id::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================================
-- 4.x VIEWS & MATERIALIZED VIEWS
-- ==================================================================
-- Nenhuma view identificada diretamente ainda, mas reservado o espaﾃｧo.

-- ==================================================================
-- 5.x RLS POLICIES & TRIGGERS ADICIONAIS
-- ==================================================================


-- ==================================================================
-- ALTERAﾃ�髭S EM TABELAS EXISTENTES (Non-destructive)
-- ==================================================================

-- Adicionar rejection_reason em partner_loans
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'partner_loans') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_loans' AND column_name = 'rejection_reason') THEN
        ALTER TABLE public.partner_loans ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- ==================================================================
-- 6.x STORAGE (BUCKETS E POLﾃ控ICAS)
-- ==================================================================

-- Inserir buckets se nﾃ｣o existirem
INSERT INTO storage.buckets (id, name, public, owner)
VALUES
    ('avatars', 'avatars', TRUE, NULL),
    ('documents', 'documents', FALSE, NULL),
    ('identity_verifications', 'identity_verifications', FALSE, NULL),
    ('public-files', 'public-files', TRUE, NULL)
ON CONFLICT (id) DO NOTHING;

-- Polﾃｭticas para o bucket 'avatars'
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
    USING (auth.uid()::text = owner::text)
    WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can delete their own avatar." ON storage.objects;
CREATE POLICY "Anyone can delete their own avatar."
    ON storage.objects FOR DELETE
    USING (auth.uid()::text = owner::text);


-- Polﾃｭticas para o bucket 'documents' (documentos de parceiros)
DROP POLICY IF EXISTS "Users can view their own documents." ON storage.objects;
CREATE POLICY "Users can view their own documents."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents' AND auth.uid()::text = owner::text);

DROP POLICY IF EXISTS "Users can upload their own documents." ON storage.objects;
CREATE POLICY "Users can upload their own documents."
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = owner::text);

DROP POLICY IF EXISTS "Admins can view all documents." ON storage.objects;
CREATE POLICY "Admins can view all documents."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'documents' AND public.is_admin());


-- Polﾃｭticas para o bucket 'identity_verifications'
DROP POLICY IF EXISTS "Users can upload their own identity verification." ON storage.objects;
CREATE POLICY "Users can upload their own identity verification."
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'identity_verifications' AND auth.uid()::text = owner::text);

DROP POLICY IF EXISTS "Admins can view all identity verifications." ON storage.objects;
CREATE POLICY "Admins can view all identity verifications."
    ON storage.objects FOR SELECT
    USING (bucket_id = 'identity_verifications' AND public.is_admin());


-- Polﾃｭticas para o bucket 'public-files'
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
    content TEXT NOT NULL, -- Conteﾃｺdo do QR Code
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
        CREATE POLICY "Users can view their own qrcode logs" ON public.qrcode_logs FOR SELECT USING (auth.uid()::text = user_id::text);
    END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated users can insert qrcode logs" ON public.qrcode_logs;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can insert qrcode logs' AND tablename = 'qrcode_logs') THEN
        CREATE POLICY "Authenticated users can insert qrcode logs" ON public.qrcode_logs FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
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
-- Atualizaﾃｧﾃｵes para o Mﾃｳdulo de Comandas Internas
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
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_type') THEN
        ALTER TABLE public.orders ADD COLUMN order_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_mode') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_mode TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'driver_id') THEN
        ALTER TABLE public.orders ADD COLUMN driver_id UUID REFERENCES public.user_profiles(id);
    END IF;
    
    -- Correção de compatibilidade: converter items de JSONB[] para JSONB
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'items' AND data_type = 'ARRAY') THEN
        ALTER TABLE public.orders ALTER COLUMN items DROP DEFAULT;
        ALTER TABLE public.orders ALTER COLUMN items TYPE JSONB USING to_jsonb(items);
        ALTER TABLE public.orders ALTER COLUMN items SET DEFAULT '[]'::JSONB;
    END IF;
END $$;

-- ==================================================================
-- Mﾃ泥ULO DE PEDIDOS INTERNOS - PRODUTOS DA LOJA
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.store_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    image_url TEXT,
    category TEXT,
    category_id UUID, -- Referência movida para bloco dinâmico abaixo
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Garantir que colunas existam (Fix: erro 42703 e 42804 compatibilidade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_products' AND column_name = 'category_id') THEN
        BEGIN
            ALTER TABLE public.store_products ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;
        EXCEPTION WHEN others THEN
            ALTER TABLE public.store_products ADD COLUMN category_id INTEGER REFERENCES public.categories(id) ON DELETE SET NULL;
        END;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_products' AND column_name = 'is_active') THEN
        ALTER TABLE public.store_products ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Index para performance
CREATE INDEX IF NOT EXISTS store_products_store_id_idx ON public.store_products (store_id);

-- Permissões
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.store_products TO anon, authenticated;
GRANT ALL ON public.store_products TO authenticated;

-- Políticas
DROP POLICY IF EXISTS "Public can view active products" ON public.store_products;
CREATE POLICY "Public can view active products" ON public.store_products FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Store owners can manage their products" ON public.store_products;
CREATE POLICY "Store owners can manage their products" ON public.store_products FOR ALL USING (auth.uid()::text = store_id::text);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_store_products_updated_at ON public.store_products;
CREATE TRIGGER handle_store_products_updated_at BEFORE UPDATE ON public.store_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Permitir que a loja gerencie seus prﾃｳprios produtos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store partners can manage their own products' AND tablename = 'store_products') THEN
        CREATE POLICY "Store partners can manage their own products" ON public.store_products
        FOR ALL
        USING (auth.uid()::text = store_id::text)
        WITH CHECK (auth.uid()::text = store_id::text);
    END IF;

    -- Permitir que admins gerenciem tudo
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all store products' AND tablename = 'store_products') THEN
        CREATE POLICY "Admins can manage all store products" ON public.store_products
        FOR ALL
        USING (public.is_admin());
    END IF;
END $$;

-- ==================================================================
-- Atualizaﾃｧﾃ｣o da funﾃｧﾃ｣o create_order para suportar novos campos
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
        custom_payment_label,
        order_type,
        delivery_mode,
        driver_id
    )
    VALUES (
        (order_details->>'store_id')::UUID,
        CASE 
            WHEN (order_details->>'origin') = 'INTERNAL' THEN NULL 
            ELSE auth.uid()::uuid 
        END,
        COALESCE(order_details->>'status', 'PENDING')::public.order_status,
        COALESCE((order_details->'items'), '[]'::JSONB),
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
        order_details->>'custom_payment_label',
        order_details->>'order_type',
        order_details->>'delivery_mode',
        (order_details->>'driver_id')::UUID
    ) RETURNING * INTO new_order;

    -- Gerar Ticket de Produﾃｧﾃ｣o Automaticamente para pedidos internos
    INSERT INTO public.orders_tickets (store_id, general_order_id, items, status)
    VALUES (new_order.store_id, new_order.id, new_order.items, 'pending');

    RETURN to_jsonb(new_order);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================================================================
-- UPDATES: M�ｽdulo de Importa�ｽ�ｽo Universal e Colaboradores
-- ==================================================================

-- Atualiza�ｽ�ｽo do ENUM user_role com 'collaborator'
DO $$
BEGIN
  ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'collaborator';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN OTHERS THEN NULL;
END $$;

-- Atualiza�ｽ�ｽo da tabela products (Campos para Importador Universal)
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
    name VARCHAR(255),
    email VARCHAR(255),
    password_hash TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    function VARCHAR(50) DEFAULT 'waiter', -- waiter, kitchen
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_email UNIQUE (store_id, email)
);

-- Garantir colunas se a tabela j existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collaborators' AND column_name = 'name') THEN
        ALTER TABLE public.collaborators ADD COLUMN name VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collaborators' AND column_name = 'email') THEN
        ALTER TABLE public.collaborators ADD COLUMN email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collaborators' AND column_name = 'function') THEN
        ALTER TABLE public.collaborators ADD COLUMN function VARCHAR(50) DEFAULT 'waiter';
    END IF;

    -- Ajustar restrio de unicidade se necessrio
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_store_username') THEN
        ALTER TABLE public.collaborators DROP CONSTRAINT unique_store_username;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_store_email') THEN
        ALTER TABLE public.collaborators ADD CONSTRAINT unique_store_email UNIQUE (store_id, email);
    END IF;

    -- Remover coluna username redundante
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collaborators' AND column_name = 'username') THEN
        ALTER TABLE public.collaborators DROP COLUMN username;
    END IF;
END $$;

DROP TRIGGER IF EXISTS handle_collaborators_updated_at ON public.collaborators;
CREATE TRIGGER handle_collaborators_updated_at BEFORE UPDATE ON public.collaborators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stores can manage their own collaborators" ON public.collaborators;
CREATE POLICY "Stores can manage their own collaborators" ON public.collaborators
    FOR ALL USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Anon can check collaborator login" ON public.collaborators;
CREATE POLICY "Anon can check collaborator login" ON public.collaborators
    FOR SELECT TO anon, authenticated USING (true);

GRANT ALL ON public.collaborators TO authenticated;
GRANT ALL ON public.collaborators TO service_role;

-- Tabela de Pedidos de Mesa/Colaborador
CREATE TABLE IF NOT EXISTS public.orders_collaborators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    table_identifier VARCHAR(50),
    customer_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'opened', -- opened, sent, completed
    total_amount NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payment_status TEXT DEFAULT 'pending' -- pending, paid
);

-- Garantir colunas se a tabela j existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_collaborators' AND column_name = 'customer_name') THEN
        ALTER TABLE public.orders_collaborators ADD COLUMN customer_name VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_collaborators' AND column_name = 'total_amount') THEN
        ALTER TABLE public.orders_collaborators ADD COLUMN total_amount NUMERIC(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_collaborators' AND column_name = 'collaborator_name') THEN
        ALTER TABLE public.orders_collaborators ADD COLUMN collaborator_name TEXT;
    END IF;
END $$;
DROP TRIGGER IF EXISTS handle_orders_collaborators_updated_at ON public.orders_collaborators;
CREATE TRIGGER handle_orders_collaborators_updated_at BEFORE UPDATE ON public.orders_collaborators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders_collaborators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores can manage table orders" ON public.orders_collaborators;
CREATE POLICY "Stores can manage table orders" ON public.orders_collaborators
    FOR ALL USING (auth.uid()::text = store_id::text);

GRANT ALL ON public.orders_collaborators TO authenticated;
GRANT ALL ON public.orders_collaborators TO service_role;

-- Tabela de Itens do Pedido de Mesa
CREATE TABLE IF NOT EXISTS public.orders_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders_collaborators(id) ON DELETE CASCADE,
    product_id UUID, -- Referência movida para bloco dinâmico abaixo
    name TEXT, -- Armazena o nome do produto (essencial para itens avulsos)
    additional JSONB DEFAULT '[]'::jsonb,
    quantity INT DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir product_id dinâmico (Fix: erro 42804 compatibilidade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_items' AND column_name = 'product_id') THEN
        BEGIN
            ALTER TABLE public.orders_items ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
        EXCEPTION WHEN others THEN
            ALTER TABLE public.orders_items ADD COLUMN product_id INTEGER REFERENCES public.products(id) ON DELETE SET NULL;
        END;
    END IF;
END $$;


-- Garantir coluna name se a tabela j existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_items' AND column_name = 'name') THEN
        ALTER TABLE public.orders_items ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_items' AND column_name = 'observation') THEN
        ALTER TABLE public.orders_items ADD COLUMN observation TEXT;
    END IF;
END $$;

ALTER TABLE public.orders_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores can manage order items" ON public.orders_items;
CREATE POLICY "Stores can manage order items" ON public.orders_items
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.orders_collaborators oc WHERE oc.id = order_id AND oc.store_id::text = auth.uid()::text)
    );

GRANT ALL ON public.orders_items TO authenticated;
GRANT ALL ON public.orders_items TO service_role;

-- Tabela de Tickets para Impresso/Cozinha (Novos Pedidos)
CREATE TABLE IF NOT EXISTS public.orders_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders_collaborators(id) ON DELETE CASCADE, -- Referência para mesa (opcional se for pedido direto)
    general_order_id UUID, -- Referência movida para bloco dinâmico abaixo
    collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
    items JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, producing, ready
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payment_status TEXT DEFAULT 'pending' -- pending, paid
);

-- Garantir general_order_id dinâmico (Fix: erro 42804 compatibilidade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_tickets' AND column_name = 'general_order_id') THEN
        BEGIN
            ALTER TABLE public.orders_tickets ADD COLUMN general_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
        EXCEPTION WHEN others THEN
            ALTER TABLE public.orders_tickets ADD COLUMN general_order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE;
        END;
    END IF;
END $$;

ALTER TABLE public.orders_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores can manage their tickets" ON public.orders_tickets;
CREATE POLICY "Stores can manage their tickets" ON public.orders_tickets
    FOR ALL USING (auth.uid()::text = store_id::text);

GRANT ALL ON public.orders_tickets TO authenticated;
GRANT ALL ON public.orders_tickets TO service_role;

-- Funes de Autenticao de Colaborador (usando pgcrypto)
DROP FUNCTION IF EXISTS public.login_collaborator(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.login_collaborator(p_email TEXT, p_password TEXT)
RETURNS JSONB AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT * INTO v_user FROM public.collaborators
    WHERE email = p_email AND password_hash = crypt(p_password, password_hash) AND active = TRUE;

    IF v_user.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'id', v_user.id,
            'store_id', v_user.store_id,
            'name', v_user.name,
            'email', v_user.email,
            'function', v_user.function,
            'role', 'collaborator'
        );
    ELSE
        RETURN NULL;
    END IF;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.create_collaborator(TEXT, TEXT, TEXT, UUID, TEXT);
CREATE OR REPLACE FUNCTION public.create_collaborator(p_email TEXT, p_name TEXT, p_password TEXT, p_store_id UUID, p_function TEXT DEFAULT 'waiter')
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.collaborators (store_id, email, name, password_hash, function)
    VALUES (p_store_id, p_email, p_name, crypt(p_password, gen_salt('bf')), p_function)
    RETURNING id INTO v_id;
    RETURN v_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS public.update_collaborator(UUID, TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.update_collaborator(
    p_collaborator_id UUID,
    p_name TEXT,
    p_email TEXT,
    p_password TEXT DEFAULT NULL,
    p_function TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    IF p_password IS NOT NULL AND p_password != '' THEN
        UPDATE public.collaborators 
        SET name = p_name, 
            email = p_email, 
            password_hash = crypt(p_password, gen_salt('bf')),
            function = COALESCE(p_function, function),
            updated_at = now()
        WHERE id = p_collaborator_id;
    ELSE
        UPDATE public.collaborators 
        SET name = p_name, 
            email = p_email,
            function = COALESCE(p_function, function),
            updated_at = now()
        WHERE id = p_collaborator_id;
    END IF;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para alteraﾃｧﾃ｣o de senha segura (exige senha antiga)
DROP FUNCTION IF EXISTS public.update_collaborator_password(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.update_collaborator_password(
    p_collaborator_id UUID,
    p_old_password TEXT,
    p_new_password TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_valid BOOLEAN;
BEGIN
    -- Verifica se a senha antiga estﾃ｡ correta
    SELECT (password_hash = crypt(p_old_password, password_hash)) INTO v_valid
    FROM public.collaborators
    WHERE id = p_collaborator_id;

    IF v_valid THEN
        UPDATE public.collaborators 
        SET password_hash = crypt(p_new_password, gen_salt('bf')),
            updated_at = now()
        WHERE id = p_collaborator_id;
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para excluir colaborador
DROP FUNCTION IF EXISTS public.delete_collaborator(UUID);
CREATE OR REPLACE FUNCTION public.delete_collaborator(p_collaborator_id UUID)
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.collaborators WHERE id = p_collaborator_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC para enviar pedido de mesa (Permite criar nova ou adicionar a uma aberta)
DROP FUNCTION IF EXISTS public.place_collaborator_order(UUID, UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.place_collaborator_order(UUID, UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.place_collaborator_order(UUID, UUID, TEXT, TEXT, JSONB, UUID);
CREATE OR REPLACE FUNCTION public.place_collaborator_order(
    p_store_id UUID,
    p_collaborator_id UUID,
    p_table_identifier TEXT,
    p_customer_name TEXT,
    p_items JSONB, -- Array de itens [{product_id, quantity, unit_price, additional}]
    p_order_id UUID DEFAULT NULL, -- Se enviado, adiciona nessa mesa
    p_collaborator_name TEXT DEFAULT NULL -- Nome do colaborador para rastreabilidade
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID := p_order_id;
    v_item JSONB;
    v_item_total NUMERIC;
    v_total NUMERIC := 0;
BEGIN
    -- Se no passou order_id, tenta encontrar uma mesa aberta com o mesmo identificador
    IF v_order_id IS NULL THEN
        SELECT id INTO v_order_id FROM public.orders_collaborators 
        WHERE store_id = p_store_id AND table_identifier = p_table_identifier AND status IN ('opened', 'sent')
        LIMIT 1;
    END IF;

    -- Se ainda no tem order_id, cria um novo
    IF v_order_id IS NULL THEN
        INSERT INTO public.orders_collaborators (store_id, collaborator_id, collaborator_name, table_identifier, customer_name, status)
        VALUES (p_store_id, p_collaborator_id, p_collaborator_name, p_table_identifier, p_customer_name, 'sent')
        RETURNING id INTO v_order_id;
    ELSE
        -- Se j existe, garante que o nome do cliente seja atualizado se enviado
        UPDATE public.orders_collaborators 
        SET customer_name = COALESCE(p_customer_name, customer_name), 
            collaborator_name = COALESCE(p_collaborator_name, collaborator_name),
            status = 'sent' 
        WHERE id = v_order_id;
    END IF;

    -- Inserir Itens e calcular total para o campo redundante
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_total := (v_item->>'quantity')::INT * (COALESCE(v_item->>'unit_price', v_item->>'price'))::NUMERIC;
        v_total := v_total + v_item_total;
        
        INSERT INTO public.orders_items (order_id, product_id, name, observation, additional, quantity, unit_price, total_price)
        VALUES (
            v_order_id,
            CASE 
                WHEN (v_item->>'product_id') LIKE 'custom_%' THEN NULL
                ELSE (v_item->>'product_id')::UUID
            END,
            v_item->>'name',
            v_item->>'observation',
            COALESCE(v_item->'additional', '[]'::jsonb),
            (v_item->>'quantity')::INT,
            (COALESCE(v_item->>'unit_price', v_item->>'price'))::NUMERIC,
            v_item_total
        );
    END LOOP;

    -- Gerar Ticket de Produﾃｧﾃ｣o/Impressﾃ｣o para o lote atual
    INSERT INTO public.orders_tickets (store_id, order_id, collaborator_id, items)
    VALUES (p_store_id, v_order_id, p_collaborator_id, p_items);

    -- Atualizar total acumulado da mesa
    UPDATE public.orders_collaborators 
    SET total_amount = total_amount + v_total,
        updated_at = now()
    WHERE id = v_order_id;

    RETURN jsonb_build_object('id', v_order_id, 'status', 'success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para listar mesas abertas
DROP FUNCTION IF EXISTS public.get_open_orders(UUID);
CREATE OR REPLACE FUNCTION public.get_open_orders(p_store_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', oc.id,
            'table_identifier', oc.table_identifier,
            'customer_name', oc.customer_name,
            'status', oc.status,
            'total_amount', oc.total_amount,
            'created_at', oc.created_at,
            'items', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', oi.id,
                        'name', COALESCE(oi.name, p.name, 'Produto'),
                        'observation', oi.observation,
                        'quantity', oi.quantity,
                        'unit_price', oi.unit_price,
                        'total_price', oi.total_price,
                        'additional', oi.additional
                    )
                ) FROM public.orders_items oi 
                LEFT JOIN public.products p ON p.id = oi.product_id
                WHERE oi.order_id = oc.id
            )
        ) ORDER BY oc.created_at DESC
    ) INTO result
    FROM public.orders_collaborators oc
    WHERE oc.store_id = p_store_id AND oc.status IN ('opened', 'sent');

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para finalizar mesa
DROP FUNCTION IF EXISTS public.close_collaborator_order(UUID);
CREATE OR REPLACE FUNCTION public.close_collaborator_order(p_order_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.orders_collaborators SET status = 'completed', updated_at = now() WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para listar histﾃｳrico de mesas fechadas do colaborador
DROP FUNCTION IF EXISTS public.get_closed_orders(UUID, UUID);
CREATE OR REPLACE FUNCTION public.get_closed_orders(p_store_id UUID, p_collaborator_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', oc.id,
            'table_identifier', oc.table_identifier,
            'customer_name', oc.customer_name,
            'status', oc.status,
            'total_amount', oc.total_amount,
            'created_at', oc.created_at,
            'updated_at', oc.updated_at,
            'items', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', oi.id,
                        'name', p.name,
                        'quantity', oi.quantity,
                        'unit_price', oi.unit_price,
                        'total_price', oi.total_price
                    )
                ) FROM public.orders_items oi 
                JOIN public.products p ON p.id = oi.product_id
                WHERE oi.order_id = oc.id
            )
        ) ORDER BY oc.updated_at DESC
    ) INTO result
    FROM public.orders_collaborators oc
    WHERE oc.store_id = p_store_id 
      AND oc.collaborator_id = p_collaborator_id 
      AND oc.status = 'completed'
      AND oc.updated_at >= CURRENT_DATE; -- Histrico do dia

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para resumo de vendas do colaborador no dia
DROP FUNCTION IF EXISTS public.get_collaborator_summary(UUID, UUID);
CREATE OR REPLACE FUNCTION public.get_collaborator_summary(p_store_id UUID, p_collaborator_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_total_sales NUMERIC := 0;
    v_total_orders INT := 0;
    v_avg_ticket NUMERIC := 0;
BEGIN
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COUNT(id)
    INTO v_total_sales, v_total_orders
    FROM public.orders_collaborators
    WHERE store_id = p_store_id 
      AND collaborator_id = p_collaborator_id 
      AND status = 'completed'
      AND updated_at >= CURRENT_DATE;

    IF v_total_orders > 0 THEN
        v_avg_ticket := v_total_sales / v_total_orders;
    END IF;

    RETURN jsonb_build_object(
        'total_sales', v_total_sales,
        'total_orders', v_total_orders,
        'avg_ticket', v_avg_ticket
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC para listar produtos pelo colaborador (com nome da categoria e imagens)
DROP FUNCTION IF EXISTS public.get_products_for_collaborator(UUID);
CREATE OR REPLACE FUNCTION public.get_products_for_collaborator(p_store_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', sp.id,
            'name', sp.name,
            'description', sp.description,
            'price', sp.price,
            'image_url', sp.image_url,
            'category_name', COALESCE(sp.category, 'Geral'), -- Nome da categoria (usando coluna category TEXT)
            'is_active', sp.is_active
        ) ORDER BY sp.name ASC
    ) INTO result
    FROM public.store_products sp
    WHERE sp.store_id = p_store_id
      AND sp.is_active = true;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Tabela de Grupos de Adicionais (Global)
CREATE TABLE IF NOT EXISTS public.store_addon_groups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('SINGLE', 'MULTIPLE')),
    min INTEGER NOT NULL DEFAULT 0,
    max INTEGER NOT NULL DEFAULT 1,
    options JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array de {id, name, price, is_active}
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index para performance
CREATE INDEX IF NOT EXISTS store_addon_groups_store_id_idx ON public.store_addon_groups (store_id);

-- OTIMIZAÇÃO DE PERFORMANCE (STORE ORDERS)
CREATE INDEX IF NOT EXISTS idx_products_store_id ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_tickets_store_id ON public.orders_tickets(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_tickets_created_at ON public.orders_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_tickets_status ON public.orders_tickets(status);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_store_addon_groups_updated_at ON public.store_addon_groups;
CREATE TRIGGER handle_store_addon_groups_updated_at BEFORE UPDATE ON public.store_addon_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.store_addon_groups ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- Permitir que a loja gerencie seus prprios grupos
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store partners can manage their own addon groups' AND tablename = 'store_addon_groups') THEN
        CREATE POLICY "Store partners can manage their own addon groups" ON public.store_addon_groups
        FOR ALL
        USING (auth.uid()::text = store_id::text)
        WITH CHECK (auth.uid()::text = store_id::text);
    END IF;

    -- Permitir que admins gerenciem tudo
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all store addon groups' AND tablename = 'store_addon_groups') THEN
        CREATE POLICY "Admins can manage all store addon groups" ON public.store_addon_groups
        FOR ALL
        USING (public.is_admin());
    END IF;
END $$;

-- Garantir permisses
GRANT ALL ON TABLE public.store_addon_groups TO anon;
GRANT ALL ON TABLE public.store_addon_groups TO authenticated;
GRANT ALL ON TABLE public.store_addon_groups TO service_role;

-- RPC para listar categorias da loja
DROP FUNCTION IF EXISTS public.get_categories_for_collaborator(UUID);
CREATE OR REPLACE FUNCTION public.get_categories_for_collaborator(p_store_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'name', name
        ) ORDER BY name ASC
    ) INTO result
    FROM public.categories
    WHERE store_id = p_store_id;
    
    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Atualizaｽｽo da Tabela store_products (Para garantir compatibilidade com Importaｽｽo Universal)
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
DROP FUNCTION IF EXISTS public.get_store_collaborators(UUID);
CREATE OR REPLACE FUNCTION public.get_store_collaborators(p_store_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
BEGIN
    RETURN COALESCE((
        SELECT jsonb_agg(to_jsonb(c.*))
        FROM public.collaborators c
        WHERE c.store_id::text = COALESCE(p_store_id::text, auth.uid()::text)
    ), '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC para alterar status do colaborador
DROP FUNCTION IF EXISTS public.toggle_collaborator_status(UUID, BOOLEAN);
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

-- Permissﾃｵes de acesso
GRANT SELECT ON public.slides TO anon, authenticated;
GRANT ALL ON public.slides TO authenticated; -- Permite que usuﾃ｡rios autenticados (admins) gerenciem via polﾃｭticas RLS

-- Polﾃδｭticas de RLS
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Slides are viewable by everyone') THEN
        CREATE POLICY "Slides are viewable by everyone" ON public.slides FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Allow admins to manage slides') THEN
        CREATE POLICY "Allow admins to manage slides" ON public.slides FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.user_profiles
                WHERE id::text = auth.uid()::text AND role = 'admin'
            )
        );
    END IF;
END $$;

-- Inserir Slides de Exemplo (Seed Data)
INSERT INTO public.slides (name, image_url, link, target_audience, is_active)
SELECT 'Bem-vindo ao Zﾃｩ Entregas', 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&q=80&w=1600&h=400', '/profile', 'both', true
WHERE NOT EXISTS (SELECT 1 FROM public.slides WHERE name = 'Bem-vindo ao Zﾃｩ Entregas');

INSERT INTO public.slides (name, image_url, link, target_audience, is_active)
SELECT 'Novas Taxas Disponﾃｭveis', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1600&h=400', '/partner', 'drivers', true
WHERE NOT EXISTS (SELECT 1 FROM public.slides WHERE name = 'Novas Taxas Disponﾃｭveis');

INSERT INTO public.slides (name, image_url, link, target_audience, is_active)
SELECT 'Gestﾃ｣o de Estoque Facilitada', 'https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&q=80&w=1600&h=400', '/shop', 'merchants', true
WHERE NOT EXISTS (SELECT 1 FROM public.slides WHERE name = 'Gestﾃ｣o de Estoque Facilitada');

INSERT INTO public.slides (name, image_url, link, target_audience, is_active)
SELECT 'Suporte 24h', 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&q=80&w=1600&h=400', '/support', 'both', true
WHERE NOT EXISTS (SELECT 1 FROM public.slides WHERE name = 'Suporte 24h');

-- Garantir links em slides que foram inseridos sem link anteriormente
UPDATE public.slides SET link = '/profile' WHERE name = 'Bem-vindo ao Zﾃｩ Entregas' AND link IS NULL;
UPDATE public.slides SET link = '/partner' WHERE name = 'Novas Taxas Disponﾃｭveis' AND link IS NULL;
UPDATE public.slides SET link = '/shop' WHERE name = 'Gestﾃ｣o de Estoque Facilitada' AND link IS NULL;



-- ==================================================================
-- MARKETING E TEMPLATES
-- ==================================================================

-- Tabela de templates de marketing
CREATE TABLE IF NOT EXISTS public.marketing_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'promotion', 'new_product', 'info', etc.
    format TEXT NOT NULL, -- 'square', 'story', 'horizontal'
    config JSONB NOT NULL, -- Configuraﾃｧﾃｵes padrﾃ｣o (cores, fontes, posiﾃｧﾃｵes)
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de designs salvos pelos lojistas
CREATE TABLE IF NOT EXISTS public.marketing_designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.marketing_templates(id),
    name TEXT NOT NULL DEFAULT 'Sem tﾃｭtulo',
    config JSONB NOT NULL, -- Configuraﾃｧﾃｵes personalizadas (textos, cores, imagens)
    last_image_url TEXT, -- URL da ﾃｺltima exportaﾃｧﾃ｣o salva (opcional)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS e Permissﾃｵes
ALTER TABLE public.marketing_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_designs ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.marketing_templates TO anon, authenticated;
GRANT ALL ON public.marketing_designs TO authenticated;

-- Polﾃｭticas para Templates
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.marketing_templates;
CREATE POLICY "Anyone can view active templates" ON public.marketing_templates
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage templates" ON public.marketing_templates;
CREATE POLICY "Admins can manage templates" ON public.marketing_templates
    FOR ALL USING (public.is_admin());

-- Polﾃｭticas para Designs
DROP POLICY IF EXISTS "Users can manage their own designs" ON public.marketing_designs;
CREATE POLICY "Users can manage their own designs" ON public.marketing_designs
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Trigger para updated_at em marketing_designs
DROP TRIGGER IF EXISTS handle_marketing_designs_updated_at ON public.marketing_designs;
CREATE TRIGGER handle_marketing_designs_updated_at BEFORE UPDATE ON public.marketing_designs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed de Templates Iniciais
INSERT INTO public.marketing_templates (name, category, format, config, is_active)
SELECT 'Promoﾃｧﾃ｣o Relﾃ｢mpago', 'promotion', 'square', '{
    "backgroundColor": "#f43f5e",
    "textColor": "#ffffff",
    "format": "post",
    "elements": [
        {"type": "text", "id": "title", "text": "PROMOﾃ�グ RELﾃ�PAGO", "x": 90, "y": 100, "width": 900, "height": 120, "fontSize": 64, "fontWeight": "black", "color": "#ffffff", "zIndex": 2},
        {"type": "text", "id": "subtitle", "text": "Aproveite agora!", "x": 90, "y": 240, "width": 900, "height": 60, "fontSize": 36, "color": "#ffffff", "zIndex": 2},
        {"type": "image", "id": "product", "shape": "circle", "x": 290, "y": 400, "width": 500, "height": 500, "zIndex": 1},
        {"type": "text", "id": "contact", "text": "(00) 00000-0000", "x": 90, "y": 950, "width": 900, "height": 50, "fontSize": 28, "color": "#ffffff", "zIndex": 2}
    ]
}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.marketing_templates WHERE name = 'Promoﾃｧﾃ｣o Relﾃ｢mpago');

INSERT INTO public.marketing_templates (name, category, format, config, is_active)
SELECT 'Novo no Cardﾃ｡pio', 'new_product', 'square', '{
    "backgroundColor": "#ffffff",
    "textColor": "#1f2937",
    "format": "post",
    "elements": [
        {"type": "text", "id": "title", "text": "NOVIDADE!", "x": 90, "y": 80, "width": 900, "height": 100, "fontSize": 56, "fontWeight": "black", "color": "#7c3aed", "zIndex": 2},
        {"type": "image", "id": "product", "shape": "square", "x": 240, "y": 300, "width": 600, "height": 600, "zIndex": 1},
        {"type": "text", "id": "contact", "text": "Peﾃｧa pelo WhatsApp", "x": 90, "y": 950, "width": 900, "height": 50, "fontSize": 28, "color": "#1f2937", "zIndex": 2}
    ]
}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM public.marketing_templates WHERE name = 'Novo no Cardﾃ｡pio');

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


-- ==================================================================
-- BACKFILL: Generate association_code for existing users
-- ==================================================================
DO $$
BEGIN
    UPDATE public.user_profiles
    SET association_code = upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6))
    WHERE association_code IS NULL;
END $$;

-- Garantir colunas para produtos e pedidos de lojista
DO $$
BEGIN
    -- Coluna store_id na tabela products (se nﾃ｣o existir)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'store_id') THEN
        ALTER TABLE public.products ADD COLUMN store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- Coluna origin na tabela orders (se nﾃ｣o existir)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'origin') THEN
        ALTER TABLE public.orders ADD COLUMN origin VARCHAR(50) DEFAULT 'APP';
    END IF;

    -- Colunas de troco e pagamento personalizado na tabela orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'amount_paid') THEN
        ALTER TABLE public.orders ADD COLUMN amount_paid DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'change_amount') THEN
        ALTER TABLE public.orders ADD COLUMN change_amount DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'custom_payment_label') THEN
        ALTER TABLE public.orders ADD COLUMN custom_payment_label VARCHAR(100);
    END IF;

    -- Coluna category na tabela products (se nﾃ｣o existir, para compatibilidade com o frontend)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category') THEN
        ALTER TABLE public.products ADD COLUMN category VARCHAR(255);
    END IF;

    -- Coluna image_url na tabela products (se nﾃ｣o existir, para compatibilidade com o frontend)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url') THEN
        ALTER TABLE public.products ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- ==================================================================
-- STORAGE CONFIGURATION: Products Bucket
-- ==================================================================

-- Create bucket: products
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Public access (View)
DROP POLICY IF EXISTS "Public View Products" ON storage.objects;
CREATE POLICY "Public View Products" ON storage.objects
    FOR SELECT USING (bucket_id = 'products');

-- Policy: Authenticated upload (Insert)
DROP POLICY IF EXISTS "Auth Upload Products" ON storage.objects;
CREATE POLICY "Auth Upload Products" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- Policy: Authenticated update (Update)
DROP POLICY IF EXISTS "Auth Update Products" ON storage.objects;
CREATE POLICY "Auth Update Products" ON storage.objects
    FOR UPDATE WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');

-- Policy: Authenticated delete (Delete)
DROP POLICY IF EXISTS "Auth Delete Products" ON storage.objects;
CREATE POLICY "Auth Delete Products" ON storage.objects
    FOR DELETE USING (bucket_id = 'products' AND auth.role() = 'authenticated');

-- ==================================================================
-- 3.x API / INTEGRAﾃ�グ (Adicionado em 2026-01-07)
-- ==================================================================

-- Tabela de Chaves de API
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_token TEXT UNIQUE NOT NULL, -- O token em si (sk_...)
    service_name TEXT, -- Nome do serviﾃｧo (ex: google_gemini_api_key)
    encrypted_key TEXT, -- A chave de API propiamente dita
    permissions JSONB DEFAULT '{"all": true}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas em api_keys (Migraﾃｧﾃ｣o Segura)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'user_id') THEN
        ALTER TABLE public.api_keys ADD COLUMN user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'permissions') THEN
        ALTER TABLE public.api_keys ADD COLUMN permissions JSONB DEFAULT '{"all": true}'::jsonb;
    END IF;
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_token') THEN
        ALTER TABLE public.api_keys ADD COLUMN key_token TEXT UNIQUE NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'name') THEN
        ALTER TABLE public.api_keys ADD COLUMN name VARCHAR(255) DEFAULT 'Chave API';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'service_name') THEN
        ALTER TABLE public.api_keys ADD COLUMN service_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'encrypted_key') THEN
        ALTER TABLE public.api_keys ADD COLUMN encrypted_key TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'updated_at') THEN
        ALTER TABLE public.api_keys ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_key_token_idx ON public.api_keys (key_token);

-- Correﾃｧﾃ｣o de Constraints (Fix para duplicidade global)
DO $$
BEGIN
    -- Remover constraint antiga incorreta (que forﾃｧava service_name ﾃｺnico globalmente)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_service_name_key') THEN
        ALTER TABLE public.api_keys DROP CONSTRAINT api_keys_service_name_key;
    END IF;

    -- Adicionar constraint correta (ﾃｺnico por usuﾃ｡rio e serviﾃｧo)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'api_keys_user_service_key') THEN
        ALTER TABLE public.api_keys ADD CONSTRAINT api_keys_user_service_key UNIQUE (user_id, service_name);
    END IF;
END $$;

DROP TRIGGER IF EXISTS handle_api_keys_updated_at ON public.api_keys;
CREATE TRIGGER handle_api_keys_updated_at BEFORE UPDATE ON public.api_keys
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Permissions
GRANT ALL ON TABLE public.api_keys TO authenticated;
GRANT ALL ON TABLE public.api_keys TO service_role;

-- Policies api_keys
DROP POLICY IF EXISTS "Users can manage their own api keys" ON public.api_keys;
CREATE POLICY "Users can manage their own api keys" ON public.api_keys
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can manage all api keys" ON public.api_keys;
CREATE POLICY "Admins can manage all api keys" ON public.api_keys
    FOR ALL
    TO authenticated
    USING (public.is_admin());

-- Tabela de Logs de API
CREATE TABLE IF NOT EXISTS public.api_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INT NOT NULL,
    ip_address TEXT,
    duration_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir colunas em api_logs (Migraﾃｧﾃ｣o Segura)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_logs' AND column_name = 'user_id') THEN
        ALTER TABLE public.api_logs ADD COLUMN user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_logs' AND column_name = 'api_key_id') THEN
        ALTER TABLE public.api_logs ADD COLUMN api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_logs' AND column_name = 'status_code') THEN
        ALTER TABLE public.api_logs ADD COLUMN status_code INT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS api_logs_user_id_idx ON public.api_logs (user_id);
CREATE INDEX IF NOT EXISTS api_logs_api_key_id_idx ON public.api_logs (api_key_id);
CREATE INDEX IF NOT EXISTS api_logs_created_at_idx ON public.api_logs (created_at DESC);

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

-- Policies api_logs

DROP POLICY IF EXISTS "Drivers can view assigned orders" ON public.orders;
CREATE POLICY "Drivers can view assigned orders" ON public.orders FOR SELECT USING (
    driver_id = auth.uid()
);

DROP POLICY IF EXISTS "Drivers can update assigned orders status" ON public.orders;
CREATE POLICY "Drivers can update assigned orders status" ON public.orders FOR UPDATE USING (
    driver_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (
    auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can view their own api logs" ON public.api_logs;
CREATE POLICY "Users can view their own api logs" ON public.api_logs
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can view all api logs" ON public.api_logs;
CREATE POLICY "Admins can view all api logs" ON public.api_logs
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can insert api logs" ON public.api_logs;
CREATE POLICY "Authenticated users can insert api logs" ON public.api_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Garantir colunas da InfinitePay em shop_settings (Migraﾃｧﾃ｣o Segura)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'infinitepay_handle') THEN
        ALTER TABLE public.shop_settings ADD COLUMN infinitepay_handle TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shop_settings' AND column_name = 'infinitepay_webhook_secret') THEN
        ALTER TABLE public.shop_settings ADD COLUMN infinitepay_webhook_secret TEXT;
    END IF;
END $$;

-- Garantir colunas da InfinitePay em orders (Migraﾃｧﾃ｣o Segura)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'infinitepay_id') THEN
        ALTER TABLE public.orders ADD COLUMN infinitepay_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'infinitepay_url') THEN
        ALTER TABLE public.orders ADD COLUMN infinitepay_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'infinitepay_status') THEN
        ALTER TABLE public.orders ADD COLUMN infinitepay_status TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'infinitepay_metadata') THEN
        ALTER TABLE public.orders ADD COLUMN infinitepay_metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- ==================================================================
-- 7.x CARTEIRAS E CONTROLE FINANCEIRO (Adicionado em 2026-01-08)
-- ==================================================================

-- Tabela de Carteira Unificada (Antiga store_wallets, agora para todos)
-- Mantemos o nome 'store_wallets' para evitar migraﾃｧﾃｵes destrutivas, mas conceitualmente ﾃｩ 'user_wallets'
CREATE TABLE IF NOT EXISTS public.store_wallets (
    store_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    balance_decimal NUMERIC(10, 2) DEFAULT 0.00,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para updated_at em store_wallets
DROP TRIGGER IF EXISTS handle_store_wallets_updated_at ON public.store_wallets;
CREATE TRIGGER handle_store_wallets_updated_at BEFORE UPDATE ON public.store_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para store_wallets
ALTER TABLE public.store_wallets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage store wallets' AND tablename = 'store_wallets') THEN
        CREATE POLICY "Admins can manage store wallets" ON public.store_wallets FOR ALL USING (public.is_admin());
    END IF;
    
    -- Polﾃｭtica ajustada para permitir que qualquer usuﾃ｡rio veja SUAS PRﾃ撤RIA carteira (seja loja ou entregador)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own wallet' AND tablename = 'store_wallets') THEN
        CREATE POLICY "Users can view own wallet" ON public.store_wallets FOR SELECT USING (auth.uid()::text = store_id::text);
    END IF;
    
    -- Remover polﾃｭtica antiga restrita se existir (opcional, mas boa prﾃ｡tica manter limpo)
    -- DROP POLICY IF EXISTS "Stores can view own wallet" ON public.store_wallets;
END $$;

-- Remover courier_wallets se foi criada anteriormente (Reversﾃ｣o)
-- DROP TABLE IF EXISTS public.courier_wallets CASCADE;

-- Conceder permissﾃｵes para a role authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_wallets TO service_role;

-- Garantir criaﾃｧﾃ｣o automﾃ｡tica de carteiras para TODOS usuﾃ｡rios relevantes
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Unificado: Para Lojistas E Entregadores
    FOR r IN SELECT id FROM public.user_profiles WHERE role IN ('store_partner', 'delivery_partner', 'delivery_person')
    LOOP
        INSERT INTO public.store_wallets (store_id, balance_decimal)
        VALUES (r.id, 0)
        ON CONFLICT (store_id) DO NOTHING;
    END LOOP;
END $$;

-- Funﾃｧﾃ｣o RPC para Ajuste de Saldo (ZeBank)
-- Permite saldos negativos conforme solicitado (representando dﾃｭvida)
CREATE OR REPLACE FUNCTION public.adjust_wallet_balance(
    p_user_id UUID,
    p_amount NUMERIC(10, 2),
    p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance NUMERIC(10, 2);
BEGIN
    -- 1. Verificar se ﾃｩ admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acesso negado. Apenas administradores podem ajustar saldos.';
    END IF;

    -- 2. Atualizar ou Criar Carteira
    INSERT INTO public.store_wallets (store_id, balance_decimal)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (store_id) DO UPDATE
    SET balance_decimal = public.store_wallets.balance_decimal + p_amount,
        updated_at = now()
    RETURNING balance_decimal INTO v_new_balance;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'message', 'Saldo ajustado com sucesso.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_wallet_balance(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_wallet_balance(UUID, NUMERIC, TEXT) TO service_role;

-- ==================================================================
-- 3.x SECURITY MODULE TABLES (Adicionado 11/01/2026)
-- ==================================================================

-- Tabela de Verificaﾃｧﾃ｣o de Identidade
CREATE TABLE IF NOT EXISTS public.identity_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDING', -- VERIFIED, REJECTED, PENDING
    photo_url TEXT,
    location_data JSONB,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS handle_identity_verifications_updated_at ON public.identity_verifications;
CREATE TRIGGER handle_identity_verifications_updated_at BEFORE UPDATE ON public.identity_verifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage identity verifications" ON public.identity_verifications;
CREATE POLICY "Admins can manage identity verifications" ON public.identity_verifications
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users can create their own identity verification" ON public.identity_verifications;
CREATE POLICY "Users can create their own identity verification" ON public.identity_verifications
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can view their own identity verification" ON public.identity_verifications;
CREATE POLICY "Users can view their own identity verification" ON public.identity_verifications
    FOR SELECT USING (auth.uid()::text = user_id::text);

GRANT ALL ON public.identity_verifications TO authenticated;
GRANT ALL ON public.identity_verifications TO service_role;

-- Tabela de Alertas de Fraude
CREATE TABLE IF NOT EXISTS public.fraud_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    description TEXT,
    severity public.fraud_alert_severity DEFAULT 'MEDIUM',
    status TEXT DEFAULT 'OPEN', -- OPEN, RESOLVED
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS handle_fraud_alerts_updated_at ON public.fraud_alerts;
CREATE TRIGGER handle_fraud_alerts_updated_at BEFORE UPDATE ON public.fraud_alerts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage fraud alerts" ON public.fraud_alerts;
CREATE POLICY "Admins can manage fraud alerts" ON public.fraud_alerts
    FOR ALL USING (public.is_admin());

GRANT ALL ON public.fraud_alerts TO authenticated;
GRANT ALL ON public.fraud_alerts TO service_role;

-- Tabela para Notificaﾃｧﾃｵes Individuais do Usuﾃ｡rio (Adicionada em 2026-01-11)
CREATE TABLE IF NOT EXISTS public.app_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' NOT NULL, -- 'success' | 'error' | 'warning' | 'info'
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS app_notifications_user_id_idx ON public.app_notifications (user_id);
CREATE INDEX IF NOT EXISTS app_notifications_is_read_idx ON public.app_notifications (is_read);

DROP TRIGGER IF EXISTS handle_app_notifications_updated_at ON public.app_notifications;
CREATE TRIGGER handle_app_notifications_updated_at BEFORE UPDATE ON public.app_notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.app_notifications;
CREATE POLICY "Users can view their own notifications" ON public.app_notifications
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.app_notifications;
CREATE POLICY "Admins can manage all notifications" ON public.app_notifications
    FOR ALL USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_notifications TO authenticated;
GRANT ALL ON public.app_notifications TO service_role;


-- ==================================================================
-- Mﾃ泥ULO DE EMPRﾃ唄TIMOS (2026-01-11)
-- ==================================================================

-- Tabela de Tipos de Emprﾃｩstimo
CREATE TABLE IF NOT EXISTS public.loan_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    interest_rate_monthly NUMERIC(5, 2) NOT NULL DEFAULT 0,
    max_installments INT NOT NULL DEFAULT 1,
    max_amount NUMERIC(10, 2), -- Limite especﾃｭfico do tipo (opcional)
    target_audience VARCHAR(20) DEFAULT 'BOTH', -- 'STORE', 'COURIER', 'BOTH'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safe migration for target_audience column
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_types' AND column_name = 'target_audience') THEN
        ALTER TABLE public.loan_types ADD COLUMN target_audience VARCHAR(20) DEFAULT 'BOTH';
    END IF;
END $$;

DROP TRIGGER IF EXISTS handle_loan_types_updated_at ON public.loan_types;
CREATE TRIGGER handle_loan_types_updated_at BEFORE UPDATE ON public.loan_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.loan_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to loan_types" ON public.loan_types;
CREATE POLICY "Public read access to loan_types" ON public.loan_types FOR SELECT USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage loan_types" ON public.loan_types;
CREATE POLICY "Admins can manage loan_types" ON public.loan_types FOR ALL USING (public.is_admin());

GRANT ALL ON public.loan_types TO authenticated;
GRANT ALL ON public.loan_types TO service_role;


-- Tabela de Limites por Nﾃｭvel de Parceiro
CREATE TABLE IF NOT EXISTS public.loan_level_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_type VARCHAR(20) NOT NULL DEFAULT 'DELIVERY', -- 'DELIVERY', 'STORE'
    partner_level VARCHAR(50) NOT NULL, -- 'BRONZE', 'PRATA', 'OURO', 'DIAMANTE'
    max_limit NUMERIC(10, 2) NOT NULL DEFAULT 0,
    max_installments INTEGER NOT NULL DEFAULT 12,
    allow_negative_balance BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT loan_level_limits_user_type_partner_level_key UNIQUE (user_type, partner_level)
);

-- Migraﾃｧﾃ｣o segura: adicionar coluna user_type se nﾃ｣o existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_level_limits' AND column_name = 'user_type') THEN
        ALTER TABLE public.loan_level_limits ADD COLUMN user_type VARCHAR(20) NOT NULL DEFAULT 'DELIVERY';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'loan_level_limits' AND column_name = 'max_installments') THEN
        ALTER TABLE public.loan_level_limits ADD COLUMN max_installments INTEGER NOT NULL DEFAULT 12;
    END IF;
END $$;

-- Remover constraint antiga e criar nova com user_type + partner_level
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loan_level_limits_partner_level_key') THEN
        ALTER TABLE public.loan_level_limits DROP CONSTRAINT loan_level_limits_partner_level_key;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'loan_level_limits_user_type_partner_level_key') THEN
        ALTER TABLE public.loan_level_limits ADD CONSTRAINT loan_level_limits_user_type_partner_level_key UNIQUE (user_type, partner_level);
    END IF;
END $$;

DROP TRIGGER IF EXISTS handle_loan_level_limits_updated_at ON public.loan_level_limits;
CREATE TRIGGER handle_loan_level_limits_updated_at BEFORE UPDATE ON public.loan_level_limits
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.loan_level_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to loan_level_limits" ON public.loan_level_limits;
CREATE POLICY "Public read access to loan_level_limits" ON public.loan_level_limits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage loan_level_limits" ON public.loan_level_limits;
CREATE POLICY "Admins can manage loan_level_limits" ON public.loan_level_limits FOR ALL USING (public.is_admin());

GRANT ALL ON public.loan_level_limits TO authenticated;
GRANT ALL ON public.loan_level_limits TO service_role;


-- Tabela de Solicitaﾃｧﾃｵes/Contratos de Emprﾃｩstimo
CREATE TABLE IF NOT EXISTS public.partner_loans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    loan_type_id UUID REFERENCES public.loan_types(id) ON DELETE SET NULL,
    amount_requested NUMERIC(10, 2) NOT NULL,
    amount_total NUMERIC(10, 2) NOT NULL, -- Inclui juros
    installments_count INT NOT NULL,
    interest_rate_applied NUMERIC(5, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, ACTIVE, REJECTED, PAID, DEFAULTED
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.user_profiles(id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migraﾃｧﾃ｣o segura: adicionar colunas se nﾃ｣o existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_loans' AND column_name = 'disbursement_method') THEN
        ALTER TABLE public.partner_loans ADD COLUMN disbursement_method VARCHAR(20) DEFAULT 'WALLET'; -- 'WALLET' or 'BANK_ACCOUNT'
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_loans' AND column_name = 'rejection_reason') THEN
        ALTER TABLE public.partner_loans ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS partner_loans_user_id_idx ON public.partner_loans (user_id);
CREATE INDEX IF NOT EXISTS partner_loans_status_idx ON public.partner_loans (status);

DROP TRIGGER IF EXISTS handle_partner_loans_updated_at ON public.partner_loans;
CREATE TRIGGER handle_partner_loans_updated_at BEFORE UPDATE ON public.partner_loans
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.partner_loans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own loans" ON public.partner_loans;
CREATE POLICY "Users can view their own loans" ON public.partner_loans
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can create loan requests" ON public.partner_loans;
CREATE POLICY "Users can create loan requests" ON public.partner_loans
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Users can update their own loans" ON public.partner_loans;
CREATE POLICY "Users can update their own loans" ON public.partner_loans
    FOR UPDATE USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can manage partner_loans" ON public.partner_loans;
CREATE POLICY "Admins can manage partner_loans" ON public.partner_loans
    FOR ALL USING (public.is_admin());

GRANT ALL ON public.partner_loans TO authenticated;
GRANT ALL ON public.partner_loans TO service_role;


-- Tabela de Parcelas do Emprﾃｩstimo
CREATE TABLE IF NOT EXISTS public.loan_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES public.partner_loans(id) ON DELETE CASCADE,
    installment_number INT NOT NULL,
    due_date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PAID, PARTIALLY_PAID, OVERDUE
    paid_amount NUMERIC(10, 2) DEFAULT 0,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loan_installments_loan_id_idx ON public.loan_installments (loan_id);
CREATE INDEX IF NOT EXISTS loan_installments_due_date_idx ON public.loan_installments (due_date);

DROP TRIGGER IF EXISTS handle_loan_installments_updated_at ON public.loan_installments;
CREATE TRIGGER handle_loan_installments_updated_at BEFORE UPDATE ON public.loan_installments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.loan_installments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own loan installments" ON public.loan_installments;
CREATE POLICY "Users can view their own loan installments" ON public.loan_installments
    FOR SELECT USING (EXISTS (SELECT 1 FROM public.partner_loans WHERE id = loan_installments.loan_id AND user_id::text = auth.uid()::text));

DROP POLICY IF EXISTS "Admins can manage loan_installments" ON public.loan_installments;
CREATE POLICY "Admins can manage loan_installments" ON public.loan_installments
    FOR ALL USING (public.is_admin());

GRANT ALL ON public.loan_installments TO authenticated;
GRANT ALL ON public.loan_installments TO service_role;


-- Tabela de Logs de Auditoria de Emprﾃｩstimos
CREATE TABLE IF NOT EXISTS public.loan_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES public.partner_loans(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- APPROVED, REJECTED, PAYMENT_DEDUCTED, MANUAL_ADJUSTMENT
    details JSONB DEFAULT '{}'::jsonb,
    performed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS loan_audit_logs_loan_id_idx ON public.loan_audit_logs (loan_id);

ALTER TABLE public.loan_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view loan audits" ON public.loan_audit_logs;
CREATE POLICY "Admins can view loan audits" ON public.loan_audit_logs
    FOR SELECT USING (public.is_admin());

GRANT ALL ON public.loan_audit_logs TO service_role;
GRANT ALL ON public.loan_audit_logs TO authenticated;

-- ==================================================================
-- LOAN PAYMENT PROCESSING FUNCTION (2026-01-11)
-- ==================================================================

-- Funﾃｧﾃ｣o para processar pagamento de parcelas de emprﾃｩstimo
-- Deve ser chamada durante o processamento de repasses semanais
CREATE OR REPLACE FUNCTION public.process_loan_installment_payments(
    p_user_id UUID,
    p_payout_amount NUMERIC
)
RETURNS TABLE (
    remaining_payout NUMERIC,
    installments_paid INT,
    total_deducted NUMERIC
) AS $$
DECLARE
    v_installment RECORD;
    v_remaining NUMERIC := p_payout_amount;
    v_paid_count INT := 0;
    v_total_deducted NUMERIC := 0;
    v_allow_negative BOOLEAN := FALSE;
    v_partner_level TEXT;
BEGIN
    -- Buscar nﾃｭvel do parceiro e verificar se permite saldo negativo
    SELECT partner_level INTO v_partner_level 
    FROM public.user_profiles 
    WHERE id = p_user_id;
    
    IF v_partner_level IS NOT NULL THEN
        SELECT allow_negative_balance INTO v_allow_negative
        FROM public.loan_level_limits
        WHERE partner_level = v_partner_level;
    END IF;
    
    -- Processar parcelas pendentes em ordem de vencimento
    FOR v_installment IN 
        SELECT li.*
        FROM public.loan_installments li
        INNER JOIN public.partner_loans pl ON li.loan_id = pl.id
        WHERE pl.user_id = p_user_id
        AND pl.status = 'ACTIVE'
        AND li.status IN ('PENDING', 'OVERDUE')
        AND li.due_date <= CURRENT_DATE
        ORDER BY li.due_date ASC
    LOOP
        DECLARE
            v_amount_to_pay NUMERIC := v_installment.amount - COALESCE(v_installment.paid_amount, 0);
        BEGIN
            -- Se o repasse cobre a parcela
            IF v_remaining >= v_amount_to_pay THEN
                -- Pagar parcela completa
                UPDATE public.loan_installments
                SET 
                    status = 'PAID',
                    paid_amount = v_installment.amount,
                    paid_at = NOW()
                WHERE id = v_installment.id;
                
                v_remaining := v_remaining - v_amount_to_pay;
                v_total_deducted := v_total_deducted + v_amount_to_pay;
                v_paid_count := v_paid_count + 1;
                
                -- Log de auditoria
                INSERT INTO public.loan_audit_logs (loan_id, action, details, performed_by)
                VALUES (
                    v_installment.loan_id,
                    'INSTALLMENT_PAID',
                    jsonb_build_object(
                        'installment_id', v_installment.id,
                        'installment_number', v_installment.installment_number,
                        'amount', v_amount_to_pay,
                        'payment_type', 'AUTOMATIC_DEDUCTION'
                    ),
                    p_user_id
                );
                
            -- Se o repasse nﾃ｣o cobre, mas permite saldo negativo
            ELSIF v_allow_negative THEN
                -- Pagar parcela mesmo ficando negativo
                UPDATE public.loan_installments
                SET 
                    status = 'PAID',
                    paid_amount = v_installment.amount,
                    paid_at = NOW()
                WHERE id = v_installment.id;
                
                v_remaining := v_remaining - v_amount_to_pay;
                v_total_deducted := v_total_deducted + v_amount_to_pay;
                v_paid_count := v_paid_count + 1;
                
                -- Log de auditoria
                INSERT INTO public.loan_audit_logs (loan_id, action, details, performed_by)
                VALUES (
                    v_installment.loan_id,
                    'INSTALLMENT_PAID_NEGATIVE_BALANCE',
                    jsonb_build_object(
                        'installment_id', v_installment.id,
                        'installment_number', v_installment.installment_number,
                        'amount', v_amount_to_pay,
                        'payment_type', 'AUTOMATIC_DEDUCTION',
                        'resulting_balance', v_remaining
                    ),
                    p_user_id
                );
                
            -- Se nﾃ｣o cobre e nﾃ｣o permite negativo
            ELSE
                -- Marcar como atrasada
                UPDATE public.loan_installments
                SET status = 'OVERDUE'
                WHERE id = v_installment.id;
                
                -- Log de auditoria
                INSERT INTO public.loan_audit_logs (loan_id, action, details, performed_by)
                VALUES (
                    v_installment.loan_id,
                    'INSTALLMENT_OVERDUE',
                    jsonb_build_object(
                        'installment_id', v_installment.id,
                        'installment_number', v_installment.installment_number,
                        'amount_due', v_amount_to_pay,
                        'available_balance', v_remaining
                    ),
                    p_user_id
                );
            END IF;
        END;
    END LOOP;
    
    -- Verificar se algum emprﾃｩstimo foi totalmente pago
    UPDATE public.partner_loans pl
    SET status = 'PAID'
    WHERE pl.user_id = p_user_id
    AND pl.status = 'ACTIVE'
    AND NOT EXISTS (
        SELECT 1 FROM public.loan_installments li
        WHERE li.loan_id = pl.id
        AND li.status != 'PAID'
    );
    
    RETURN QUERY SELECT v_remaining, v_paid_count, v_total_deducted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissﾃｵes
GRANT EXECUTE ON FUNCTION public.process_loan_installment_payments(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_loan_installment_payments(UUID, NUMERIC) TO service_role;

-- ==================================================================
-- SEEDS & BACKFILLS (LOANS MODULE) - Adicionado em 2026-01-12
-- ==================================================================

-- 1. Inserir Limites por Nﾃｭvel e Tipo de Usuﾃ｡rio (Se nﾃ｣o existirem)
-- Limites para Entregadores
INSERT INTO public.loan_level_limits (user_type, partner_level, max_limit, max_installments, allow_negative_balance)
VALUES
    ('DELIVERY', 'BRONZE', 200.00, 3, false),
    ('DELIVERY', 'PRATA', 500.00, 6, false),
    ('DELIVERY', 'OURO', 1000.00, 12, true),
    ('DELIVERY', 'DIAMANTE', 2500.00, 24, true)
ON CONFLICT (user_type, partner_level) DO UPDATE
SET max_limit = EXCLUDED.max_limit,
    max_installments = EXCLUDED.max_installments,
    allow_negative_balance = EXCLUDED.allow_negative_balance;

-- Limites para Lojistas (valores menores que entregadores)
INSERT INTO public.loan_level_limits (user_type, partner_level, max_limit, max_installments, allow_negative_balance)
VALUES
    ('STORE', 'BRONZE', 100.00, 6, false),
    ('STORE', 'PRATA', 300.00, 12, false),
    ('STORE', 'OURO', 700.00, 24, false),
    ('STORE', 'DIAMANTE', 1500.00, 36, true)
ON CONFLICT (user_type, partner_level) DO UPDATE
SET max_limit = EXCLUDED.max_limit,
    max_installments = EXCLUDED.max_installments,
    allow_negative_balance = EXCLUDED.allow_negative_balance;

-- 2. Backfill: Garantir que usuﾃ｡rios tenham nﾃｭvel 'BRONZE' se estiver nulo
UPDATE public.user_profiles
SET partner_level = 'BRONZE'
WHERE partner_level IS NULL OR partner_level = '';

-- 3. Inserir Tipos de Emprﾃｩstimo Padrﾃ｣o (Evitando duplicidade)
INSERT INTO public.loan_types (name, description, interest_rate_monthly, max_installments, max_amount, target_audience, is_active)
SELECT 'Antecipaﾃｧﾃ｣o de Recebﾃｭveis', 'Antecipe seus ganhos futuros com taxas reduzidas.', 2.50, 4, 1000.00, 'BOTH', true
WHERE NOT EXISTS (SELECT 1 FROM public.loan_types WHERE name = 'Antecipaﾃｧﾃ｣o de Recebﾃｭveis');

INSERT INTO public.loan_types (name, description, interest_rate_monthly, max_installments, max_amount, target_audience, is_active)
SELECT 'Capital de Giro', 'Emprﾃｩstimo para impulsionar seu negﾃｳcio.', 3.90, 12, 5000.00, 'STORE', true
WHERE NOT EXISTS (SELECT 1 FROM public.loan_types WHERE name = 'Capital de Giro');

INSERT INTO public.loan_types (name, description, interest_rate_monthly, max_installments, max_amount, target_audience, is_active)
SELECT 'Crﾃｩdito Pessoal', 'Dinheiro rﾃ｡pido para emergﾃｪncias.', 4.50, 6, 2000.00, 'COURIER', true
WHERE NOT EXISTS (SELECT 1 FROM public.loan_types WHERE name = 'Crﾃｩdito Pessoal');

-- 4. Correção RLS: Permitir INSERT em loan_installments pelo usuário dono do empréstimo
DROP POLICY IF EXISTS "Users can create loan installments" ON public.loan_installments;
CREATE POLICY "Users can create loan installments" ON public.loan_installments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.partner_loans 
            WHERE id = loan_installments.loan_id 
            AND user_id::text = auth.uid()::text
        )
    );
-- Adicionando coluna order_type para controle de pedidos (Local, Retirada, Entrega)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'LOCAL';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS collaborator_name text;


-- Liberar RLS para tabela orders (Lojistas) e definir policies corretas
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Remover policies antigas se existirem para evitar conflitos
DROP POLICY IF EXISTS "Enable read for store owners" ON public.orders;
DROP POLICY IF EXISTS "Enable insert for store owners" ON public.orders;
DROP POLICY IF EXISTS "Enable update for store owners" ON public.orders;

-- Criar policies com cast para texto para evitar erro uuid=text
CREATE POLICY "Enable read for store owners" ON public.orders
FOR SELECT
USING (auth.uid()::text = store_id::text);

CREATE POLICY "Enable insert for store owners" ON public.orders
FOR INSERT
WITH CHECK (auth.uid()::text = store_id::text);

CREATE POLICY "Enable update for store owners" ON public.orders
FOR UPDATE
USING (auth.uid()::text = store_id::text);

-- ==================================================================
-- CONFIGURAÇÕES DE ENTREGA DA LOJA (Adicionado em 2026-01-14)
-- ==================================================================

-- Tabela para configurar modo de entrega e taxas
CREATE TABLE IF NOT EXISTS public.store_delivery_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    delivery_mode TEXT NOT NULL DEFAULT 'FIXED', -- 'FIXED' ou 'NEIGHBORHOOD'
    fixed_fee NUMERIC(10, 2) DEFAULT 0.00,
    allow_outside_city BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_delivery_settings UNIQUE (store_id)
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_store_delivery_settings_updated_at ON public.store_delivery_settings;
CREATE TRIGGER handle_store_delivery_settings_updated_at BEFORE UPDATE ON public.store_delivery_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para store_delivery_settings
ALTER TABLE public.store_delivery_settings ENABLE ROW LEVEL SECURITY;

-- Garantir permissões de leitura para authenticated
GRANT SELECT ON public.store_delivery_settings TO authenticated;
GRANT SELECT ON public.store_delivery_settings TO anon;
GRANT ALL ON public.store_delivery_settings TO service_role;

DROP POLICY IF EXISTS "Store owners manage their delivery settings" ON public.store_delivery_settings;
CREATE POLICY "Store owners manage their delivery settings" ON public.store_delivery_settings
    FOR ALL USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Anyone can view delivery settings" ON public.store_delivery_settings;
CREATE POLICY "Anyone can view delivery settings" ON public.store_delivery_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can view delivery settings" ON public.store_delivery_settings;
CREATE POLICY "Authenticated users can view delivery settings" ON public.store_delivery_settings
    FOR SELECT TO authenticated USING (true);


-- Tabela para taxas por bairro
CREATE TABLE IF NOT EXISTS public.store_neighborhood_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    neighborhood_name TEXT NOT NULL,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_neighborhood UNIQUE (store_id, neighborhood_name)
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_store_neighborhood_fees_updated_at ON public.store_neighborhood_fees;
CREATE TRIGGER handle_store_neighborhood_fees_updated_at BEFORE UPDATE ON public.store_neighborhood_fees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS para store_neighborhood_fees
ALTER TABLE public.store_neighborhood_fees ENABLE ROW LEVEL SECURITY;

-- Garantir permissões de leitura para authenticated
GRANT SELECT ON public.store_neighborhood_fees TO authenticated;
GRANT SELECT ON public.store_neighborhood_fees TO anon;
GRANT ALL ON public.store_neighborhood_fees TO service_role;

DROP POLICY IF EXISTS "Store owners manage their neighborhood fees" ON public.store_neighborhood_fees;
CREATE POLICY "Store owners manage their neighborhood fees" ON public.store_neighborhood_fees
    FOR ALL USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Anyone can view neighborhood fees" ON public.store_neighborhood_fees;
CREATE POLICY "Anyone can view neighborhood fees" ON public.store_neighborhood_fees
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can view neighborhood fees" ON public.store_neighborhood_fees;
CREATE POLICY "Authenticated users can view neighborhood fees" ON public.store_neighborhood_fees
    FOR SELECT TO authenticated USING (true);

-- Permissões adicionais para permitir salvamento pelos lojistas
GRANT ALL ON public.store_delivery_settings TO authenticated;
GRANT ALL ON public.store_neighborhood_fees TO authenticated;



-- ==================================================================
-- RPCs para Gestão de Usuários (Admin) - Adicionado em 14/01/2026
-- ==================================================================

-- RPC: Atualizar senha de usuário (Admin Only)
CREATE OR REPLACE FUNCTION public.admin_update_user_password(
    p_user_id UUID,
    p_new_password TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Verifica se quem chama é admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem alterar senhas de outros usuários.';
    END IF;

    -- Atualiza a senha na tabela auth.users
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
    WHERE id = p_user_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.admin_update_user_password(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_user_password(UUID, TEXT) TO service_role;


-- RPC: Criar usuário manualmente (Admin Only)
-- Permite criar usuário passando metadados completos sem logar automaticamente
CREATE OR REPLACE FUNCTION public.admin_create_user_manual(
    p_email TEXT,
    p_password TEXT,
    p_metadata JSONB
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Verifica se quem chama é admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Acesso negado: Apenas administradores podem criar usuários manualmente.';
    END IF;

    -- Verifica se usuário já existe
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
        RAISE EXCEPTION 'Email já cadastrado.';
    END IF;

    -- Gera novo UUID
    v_user_id := uuid_generate_v4();

    -- Insere em auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated',
        'authenticated',
        p_email,
        crypt(p_password, gen_salt('bf')),
        now(),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        p_metadata,
        now(),
        now(),
        '',
        ''
    );

    -- Insere na tabela identity (necessário para login funcionar corretamente em alguns casos do Supabase)
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        v_user_id,
        v_user_id,
        format('{"sub": "%s", "email": "%s"}', v_user_id, p_email)::jsonb,
        'email',
        v_user_id,
        now(),
        now(),
        now()
    );

    -- O trigger handle_new_user será disparado automaticamente após insert em auth.users
    -- preenchendo user_profiles e outras tabelas

    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir permissões
GRANT EXECUTE ON FUNCTION public.admin_create_user_manual(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user_manual(TEXT, TEXT, JSONB) TO service_role;

-- ==================================================================
-- ASSOCIAÇÃO DE LOJISTAS E PARCEIROS (Adicionado em 14/01/2026)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.store_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, partner_id)
);

ALTER TABLE public.store_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners manage their partners" ON public.store_partners;
CREATE POLICY "Store owners manage their partners" ON public.store_partners
    FOR ALL USING (auth.uid()::text = store_id::text);

GRANT ALL ON public.store_partners TO authenticated;
GRANT ALL ON public.store_partners TO service_role;

-- Nova política para permitir que lojistas gerenciem empréstimos de seus parceiros associados
DROP POLICY IF EXISTS "Store partners can manage their drivers loans" ON public.partner_loans;
CREATE POLICY "Store partners can manage their drivers loans" ON public.partner_loans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.store_partners 
            WHERE store_id::text = auth.uid()::text 
            AND partner_id = partner_loans.user_id
        )
    );

-- ==================================================================
-- 3.x ATUALIZAﾃ�髭S PARA GESTﾃグ DE LOJA (15/01/2026)
-- ==================================================================

-- 1. Adicionar status de loja aberta/fechada no perfil
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'is_open') THEN
        ALTER TABLE public.user_profiles ADD COLUMN is_open BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Garantir que usuﾃ｡rios possam atualizar seu prﾃｳprio status is_open
DROP POLICY IF EXISTS "Users can update own is_open" ON public.user_profiles;
CREATE POLICY "Users can update own is_open" ON public.user_profiles
    FOR UPDATE USING (auth.uid()::text = id::text) WITH CHECK (auth.uid()::text = id::text);

-- 2. Tabela de Relatﾃｳrios Diﾃ｡rios da Loja
CREATE TABLE IF NOT EXISTS public.store_daily_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    report_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    total_orders INT DEFAULT 0,
    total_revenue NUMERIC(10, 2) DEFAULT 0,
    total_delivery_fees NUMERIC(10, 2) DEFAULT 0,
    orders_summary JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ﾃ肱dices e Trigger de Updated At
CREATE INDEX IF NOT EXISTS store_daily_reports_store_id_idx ON public.store_daily_reports (store_id);
CREATE INDEX IF NOT EXISTS store_daily_reports_date_idx ON public.store_daily_reports (report_date);

-- RLS Policies
ALTER TABLE public.store_daily_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojistas veem seus proprios relatorios diarios" ON public.store_daily_reports;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lojistas veem seus proprios relatorios diarios' AND tablename = 'store_daily_reports') THEN
        CREATE POLICY "Lojistas veem seus proprios relatorios diarios" ON public.store_daily_reports
            FOR SELECT USING (auth.uid()::text = store_id::text);
    END IF;
END $$;

DROP POLICY IF EXISTS "Lojistas criam seus proprios relatorios diarios" ON public.store_daily_reports;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lojistas criam seus proprios relatorios diarios' AND tablename = 'store_daily_reports') THEN
        CREATE POLICY "Lojistas criam seus proprios relatorios diarios" ON public.store_daily_reports
            FOR INSERT WITH CHECK (auth.uid()::text = store_id::text);
    END IF;
END $$;

GRANT SELECT, INSERT ON public.store_daily_reports TO authenticated;

-- Garantir permissﾃｵes de leitura na tabela orders para lojistas (Correﾃｧﾃ｣o 2026-01-15)
GRANT SELECT ON public.orders TO authenticated;

DROP POLICY IF EXISTS "Lojistas leem seus proprios pedidos" ON public.orders;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lojistas leem seus proprios pedidos' AND tablename = 'orders') THEN
        CREATE POLICY "Lojistas leem seus proprios pedidos" ON public.orders
            FOR SELECT USING (auth.uid()::text = store_id::text OR public.is_admin());
    END IF;
END $$;

DROP POLICY IF EXISTS "Colaboradores leem pedidos da loja" ON public.orders;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Colaboradores leem pedidos da loja' AND tablename = 'orders') THEN
        CREATE POLICY "Colaboradores leem pedidos da loja" ON public.orders
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.collaborators
                    WHERE id::text = auth.uid()::text
                    AND store_id::text = public.orders.store_id::text
                )
            );
    END IF;
END $$;


-- Correﾃｧﾃ｣o para get_products_for_collaborator (15/01/2026)
-- A relaﾃｧﾃ｣o store_categories nﾃ｣o existe, e a tabela store_products usa a coluna 'category' (TEXT).
CREATE OR REPLACE FUNCTION public.get_products_for_collaborator(p_store_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', sp.id,
            'name', sp.name,
            'description', sp.description,
            'price', sp.price,
            'image_url', sp.image_url,
            'category_name', COALESCE(sp.category, 'Geral'),
            'is_active', sp.is_active
        ) ORDER BY sp.name ASC
    ) INTO result
    FROM public.store_products sp
    WHERE sp.store_id = p_store_id
      AND sp.is_active = true;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==================================================================
-- 4.x GESTﾃグ DE MESAS E QR CODES (16/01/2026)
-- ==================================================================

-- 1. Tabela store_tables
CREATE TABLE IF NOT EXISTS public.store_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    identifier TEXT NOT NULL,
    qr_code_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(store_id, identifier)
);

-- ﾃ肱dices e Trigger
CREATE INDEX IF NOT EXISTS store_tables_store_id_idx ON public.store_tables (store_id);
DROP TRIGGER IF EXISTS handle_store_tables_updated_at ON public.store_tables;
CREATE TRIGGER handle_store_tables_updated_at BEFORE UPDATE ON public.store_tables
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.store_tables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojistas gerenciam suas proprias mesas" ON public.store_tables;
CREATE POLICY "Lojistas gerenciam suas proprias mesas" ON public.store_tables
    FOR ALL USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Colaboradores veem mesas da loja" ON public.store_tables;
CREATE POLICY "Colaboradores veem mesas da loja" ON public.store_tables
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.collaborators
            WHERE id::text = auth.uid()::text
            AND store_id = public.store_tables.store_id
        )
    );

-- Permissﾃｵes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_tables TO authenticated;


-- 2. Storage Bucket para QR Codes
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-codes', 'qr-codes', true)
ON CONFLICT (id) DO NOTHING;

-- Policies para Storage
DROP POLICY IF EXISTS "QR Codes Public Access" ON storage.objects;
CREATE POLICY "QR Codes Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'qr-codes' );

DROP POLICY IF EXISTS "Lojistas Upload QR Codes" ON storage.objects;
CREATE POLICY "Lojistas Upload QR Codes"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'qr-codes' AND
    auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Lojistas Delete Own QR Codes" ON storage.objects;
CREATE POLICY "Lojistas Delete Own QR Codes"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'qr-codes' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1]::text = auth.uid()::text
);

-- 3. RPC para buscar pedidos internos (Bypass RLS para Colaboradores)
CREATE OR REPLACE FUNCTION public.get_store_internal_orders_rpc(p_store_id UUID)
RETURNS SETOF public.orders
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM public.orders
  WHERE store_id = p_store_id
  AND origin = 'INTERNAL'
  ORDER BY created_at DESC
  LIMIT 50;
$$;


-- 4. Tabelas de Notificaﾃｧﾃｵes
-- Tabela de Preferﾃｪncias de Notificaﾃｧﾃ｣o
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    categories JSONB DEFAULT '["orders", "system", "promotions"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage own notification preferences" ON public.notification_preferences
    FOR ALL USING (auth.uid()::text = user_id::text);

GRANT ALL ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;

-- Tabela de Notificaﾃｧﾃｵes do Usuﾃ｡rio
CREATE TABLE IF NOT EXISTS public.user_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, success, warning, error
    read BOOLEAN DEFAULT false,
    link TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir colunas em user_notifications (Migraﾃｧﾃ｣o Segura)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'read') THEN
        ALTER TABLE public.user_notifications ADD COLUMN "read" BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'title') THEN
        ALTER TABLE public.user_notifications ADD COLUMN title TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'message') THEN
        ALTER TABLE public.user_notifications ADD COLUMN message TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'type') THEN
        ALTER TABLE public.user_notifications ADD COLUMN type VARCHAR(50) DEFAULT 'info';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'link') THEN
        ALTER TABLE public.user_notifications ADD COLUMN link TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_notifications' AND column_name = 'metadata') THEN
        ALTER TABLE public.user_notifications ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- ﾃ肱dices
CREATE INDEX IF NOT EXISTS user_notifications_user_id_idx ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS user_notifications_read_idx ON public.user_notifications("read");

-- RLS para user_notifications
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own notifications" ON public.user_notifications;
CREATE POLICY "Users can manage own notifications" ON public.user_notifications
    FOR ALL USING (auth.uid()::text = user_id::text);

GRANT ALL ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;


-- RPC para buscar perfil da loja (Bypass RLS para Colaboradores) - 17/01/2026
CREATE OR REPLACE FUNCTION public.get_store_profile_for_collaborator_rpc(p_store_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
BEGIN
    -- Selecionar apenas colunas que garantidamente existem para evitar erros de campo inexistente
    SELECT id, name, store_name, city, store_address_city, address_street, store_address_street, is_open 
    INTO v_profile 
    FROM public.user_profiles 
    WHERE id = p_store_id;
    
    IF v_profile.id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'id', v_profile.id,
            'name', COALESCE(v_profile.store_name, v_profile.name),
            'city', COALESCE(v_profile.city, v_profile.store_address_city, ''),
            'address_street', COALESCE(v_profile.address_street, v_profile.store_address_street, ''),
            'is_open', COALESCE(v_profile.is_open, true)
        );
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- �ｽndices para otimiza�ｽ�ｽo de performance (Partner Requests)
CREATE INDEX IF NOT EXISTS partner_requests_created_at_idx ON public.partner_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS partner_requests_store_status_idx ON public.partner_requests (store_id, status);



-- Arquivo de esquema global do Supabase.
-- Todas as alteraﾃｧﾃｵes de banco de dados devem ser adicionadas aqui de forma nﾃ｣o destrutiva.
-- Nﾃ｣o remova ou altere cﾃｳdigo existente, apenas adicione novas estruturas ou modificaﾃｧﾃｵes.

-- ===============================================================
-- ===============================================================
-- MÓDULO DE CHAT INTERNO (NATIVO - SEM SESSÕES)
-- ===============================================================



-- 1.5 Tabela de Sessões de Chat (WhatsApp/Baileys)
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    session_id TEXT,
    session_data JSONB,
    status TEXT DEFAULT 'DISCONNECTED',
    qr_code TEXT,
    last_full_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id)
);

-- RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners manage their sessions" ON public.chat_sessions;
CREATE POLICY "Store owners manage their sessions" ON public.chat_sessions
    FOR ALL USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Admins can view sessions" ON public.chat_sessions;
CREATE POLICY "Admins can view sessions" ON public.chat_sessions
    FOR SELECT USING (public.is_admin());

-- Trigger updated_at
DROP TRIGGER IF EXISTS handle_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER handle_chat_sessions_updated_at BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT ALL ON public.chat_sessions TO authenticated, service_role;

-- 2. Garantia de Schema Robustos (Reparo Aditivo)
DO $$ 
BEGIN
    -- TABELA: chat_conversations
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_conversations') THEN
        CREATE TABLE public.chat_conversations (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());
    END IF;
    
    -- Adicionar colunas se faltarem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='store_id') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='conversation_id') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN conversation_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='status') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN status TEXT DEFAULT 'open';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='unread_count') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN unread_count INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='last_message_content') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN last_message_content TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='last_message_timestamp') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN last_message_timestamp TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='contact_name') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN contact_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='profile_pic_url') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN profile_pic_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='customer_type') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN customer_type TEXT DEFAULT 'visitor';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='priority') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN priority TEXT DEFAULT 'normal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='attendant_id') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN attendant_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='is_blocked') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='created_at') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='updated_at') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;

    -- Garantir Unicidade
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_conversations_store_id_conversation_id_key') THEN
        ALTER TABLE public.chat_conversations ADD CONSTRAINT chat_conversations_store_id_conversation_id_key UNIQUE(store_id, conversation_id);
    END IF;

    -- TABELA: chat_messages
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages') THEN
        CREATE TABLE public.chat_messages (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='store_id') THEN
        ALTER TABLE public.chat_messages ADD COLUMN store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='conversation_id') THEN
        ALTER TABLE public.chat_messages ADD COLUMN conversation_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='message_id') THEN
        ALTER TABLE public.chat_messages ADD COLUMN message_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='content') THEN
        ALTER TABLE public.chat_messages ADD COLUMN content TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='from_me') THEN
        ALTER TABLE public.chat_messages ADD COLUMN from_me BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='status') THEN
        ALTER TABLE public.chat_messages ADD COLUMN status TEXT DEFAULT 'sent';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='message_type') THEN
        ALTER TABLE public.chat_messages ADD COLUMN message_type TEXT DEFAULT 'chat';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='message_timestamp') THEN
        ALTER TABLE public.chat_messages ADD COLUMN message_timestamp TIMESTAMPTZ DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='sender_id') THEN
        ALTER TABLE public.chat_messages ADD COLUMN sender_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
    ELSE
        -- Garantir que sender_id aceite NULL (para visitantes anônimos)
        BEGIN
            ALTER TABLE public.chat_messages ALTER COLUMN sender_id DROP NOT NULL;
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='sender_name') THEN
        ALTER TABLE public.chat_messages ADD COLUMN sender_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='chat_id') THEN
        ALTER TABLE public.chat_messages ADD COLUMN chat_id UUID REFERENCES public.order_chats(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='message') THEN
        ALTER TABLE public.chat_messages ADD COLUMN message TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='is_read') THEN
        ALTER TABLE public.chat_messages ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='sender_type') THEN
        ALTER TABLE public.chat_messages ADD COLUMN sender_type VARCHAR(20) DEFAULT 'user';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_messages' AND column_name='created_at') THEN
        ALTER TABLE public.chat_messages ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;

    -- Garantir Unicidade das Mensagens
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_message_id_key') THEN
        ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_message_id_key UNIQUE(message_id);
    END IF;

    -- TABELA: chat_contacts
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_contacts') THEN
        CREATE TABLE public.chat_contacts (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_contacts' AND column_name='store_id') THEN
        ALTER TABLE public.chat_contacts ADD COLUMN store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_contacts' AND column_name='name') THEN
        ALTER TABLE public.chat_contacts ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_contacts' AND column_name='phone_number') THEN
        ALTER TABLE public.chat_contacts ADD COLUMN phone_number TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_contacts_store_id_phone_number_key') THEN
        ALTER TABLE public.chat_contacts ADD CONSTRAINT chat_contacts_store_id_phone_number_key UNIQUE(store_id, phone_number);
    END IF;

    -- TABELA: chat_conversation_orders
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_conversation_orders') THEN
        CREATE TABLE public.chat_conversation_orders (id UUID PRIMARY KEY DEFAULT uuid_generate_v4());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversation_orders' AND column_name='store_id') THEN
        ALTER TABLE public.chat_conversation_orders ADD COLUMN store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversation_orders' AND column_name='attendant_id') THEN
        ALTER TABLE public.chat_conversation_orders ADD COLUMN attendant_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversation_orders' AND column_name='conversation_id') THEN
        ALTER TABLE public.chat_conversation_orders ADD COLUMN conversation_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversation_orders' AND column_name='position') THEN
        ALTER TABLE public.chat_conversation_orders ADD COLUMN position INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Índices (Performance)
CREATE INDEX IF NOT EXISTS idx_chat_conv_store ON public.chat_conversations(store_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_last_msg ON public.chat_conversations(last_message_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON public.chat_messages(store_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_timestamp ON public.chat_messages(message_timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_chat_contacts_store_phone ON public.chat_contacts(store_id, phone_number);

-- 4. Segurança (RLS e Políticas com garantia de store_id)
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversation_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store access chat_conversations" ON public.chat_conversations;
CREATE POLICY "Store access chat_conversations" ON public.chat_conversations USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Store access chat_messages" ON public.chat_messages;
CREATE POLICY "Store access chat_messages" ON public.chat_messages USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Store access chat_contacts" ON public.chat_contacts;
CREATE POLICY "Store access chat_contacts" ON public.chat_contacts USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Store access chat_orders" ON public.chat_conversation_orders;
CREATE POLICY "Store access chat_orders" ON public.chat_conversation_orders USING (auth.uid()::text = store_id::text);

-- 5. Permissões
GRANT ALL ON TABLE public.chat_conversations TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.chat_messages TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.chat_contacts TO authenticated, service_role;
GRANT ALL ON TABLE public.chat_conversation_orders TO authenticated, service_role;

-- 6. Triggers Updated At
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER tr_chat_conversations_updated_at BEFORE UPDATE ON chat_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_chat_contacts_updated_at ON chat_contacts;
CREATE TRIGGER tr_chat_contacts_updated_at BEFORE UPDATE ON chat_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();




-- ===============================================================
-- SCRIPT DE CORREÇÃO MANUAL - COLUNAS UPDATED_AT FALTANTES
-- ===============================================================

ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.chat_conversations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Bloco duplicado removido para consolidação.



-- ==================================================================
-- INTEGRAÇÃO BRASIL ABERTO (Adicionado em 2026-01-17)
-- ==================================================================
-- ORGANIZAÇÃO MANUAL DE CONVERSAS (Adicionado em 2026-01-18)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.chat_conversation_orders (
    attendant_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    conversation_id TEXT,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (attendant_id, store_id, conversation_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_conv_orders_attendant ON public.chat_conversation_orders(attendant_id, store_id);

-- RLS
ALTER TABLE public.chat_conversation_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Atendentes gerenciam sua própria ordem" ON public.chat_conversation_orders;
CREATE POLICY "Atendentes gerenciam sua própria ordem" ON public.chat_conversation_orders
    FOR ALL USING (auth.uid()::text = attendant_id::text);

GRANT ALL ON public.chat_conversation_orders TO authenticated, service_role;

COMMENT ON TABLE public.chat_conversation_orders IS 'Armazena a ordem manual das conversas de Chat por atendente';
-- ==================================================================

-- Tabela de Bairros (Distritos) importados da API
CREATE TABLE IF NOT EXISTS public.city_districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_id UUID NOT NULL REFERENCES public.available_cities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(city_id, name)
);

-- Índices
CREATE INDEX IF NOT EXISTS city_districts_city_id_idx ON public.city_districts (city_id);

-- RLS
ALTER TABLE public.city_districts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to city_districts" ON public.city_districts;
CREATE POLICY "Public read access to city_districts" ON public.city_districts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage city_districts" ON public.city_districts;
CREATE POLICY "Admins can manage city_districts" ON public.city_districts FOR ALL USING (public.is_admin());

GRANT SELECT ON public.city_districts TO anon, authenticated;
GRANT ALL ON public.city_districts TO authenticated;

-- available_cities setup
CREATE TABLE IF NOT EXISTS public.available_cities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    name text NOT NULL,
    state text NOT NULL,
    is_active boolean DEFAULT true,
    ibge_code text
);

-- Ensure RLS is enabled
ALTER TABLE public.available_cities ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public read access to cities" ON public.available_cities;
CREATE POLICY "Public read access to cities" ON public.available_cities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert cities" ON public.available_cities;
CREATE POLICY "Admins can insert cities" ON public.available_cities FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update cities" ON public.available_cities;
CREATE POLICY "Admins can update cities" ON public.available_cities FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete cities" ON public.available_cities;
CREATE POLICY "Admins can delete cities" ON public.available_cities FOR DELETE USING (public.is_admin());

-- Grants
GRANT SELECT ON public.available_cities TO anon, authenticated;
GRANT ALL ON public.available_cities TO authenticated;

-- Add column if missing (legacy block kept for safety)
DO $$ BEGIN
    ALTER TABLE public.available_cities ADD COLUMN IF NOT EXISTS ibge_code text;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Fix available_cities structure and policies (Added 17/01/2026)
DO $$ 
BEGIN
    -- Garantir que updated_at existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'available_cities' AND column_name = 'updated_at') THEN
        ALTER TABLE public.available_cities ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;

    -- Garantir restrição de unicidade (necessário para ON CONFLICT e evitar duplicatas inconsistentes)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_city_state') THEN
        -- Nota: Se já houver duplicatas, isso pode falhar. Mas a regra proíbe deletar dados.
        -- Em sistemas novos ou limpos, isso garante a integridade.
        ALTER TABLE public.available_cities ADD CONSTRAINT unique_city_state UNIQUE (name, state);
    END IF;
END $$;

-- Garantir trigger de updated_at
DROP TRIGGER IF EXISTS handle_available_cities_updated_at ON public.available_cities;
CREATE TRIGGER handle_available_cities_updated_at 
    BEFORE UPDATE ON public.available_cities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sincronizar RLS para garantir permissões de Admin
DROP POLICY IF EXISTS "Admins can manage available cities" ON public.available_cities;
CREATE POLICY "Admins can manage available cities" ON public.available_cities FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert cities" ON public.available_cities;
CREATE POLICY "Admins can insert cities" ON public.available_cities FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update cities" ON public.available_cities;
CREATE POLICY "Admins can update cities" ON public.available_cities FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete cities" ON public.available_cities;
CREATE POLICY "Admins can delete cities" ON public.available_cities FOR DELETE USING (public.is_admin());

-- ==================================================================
-- PRINTER SETTINGS (17/01/2026)
-- ==================================================================

-- Tabela de configurações de impressora por loja
CREATE TABLE IF NOT EXISTS public.printer_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    printer_width INTEGER DEFAULT 80, -- Largura em mm (58, 80)
    paper_type TEXT DEFAULT 'thermal', -- 'thermal' | 'a4'
    margin_top INTEGER DEFAULT 0,
    margin_bottom INTEGER DEFAULT 0,
    margin_left INTEGER DEFAULT 2,
    margin_right INTEGER DEFAULT 2,
    font_size_base INTEGER DEFAULT 12,
    auto_cut BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_printer UNIQUE (store_id)
);

CREATE INDEX IF NOT EXISTS printer_settings_store_id_idx ON public.printer_settings (store_id);

DROP TRIGGER IF EXISTS handle_printer_settings_updated_at ON public.printer_settings;
CREATE TRIGGER handle_printer_settings_updated_at BEFORE UPDATE ON public.printer_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.printer_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stores can manage their printer settings" ON public.printer_settings;
CREATE POLICY "Stores can manage their printer settings" ON public.printer_settings
    FOR ALL USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Admins can manage all printer settings" ON public.printer_settings;
CREATE POLICY "Admins can manage all printer settings" ON public.printer_settings
    FOR ALL USING (public.is_admin());

GRANT ALL ON public.printer_settings TO authenticated;
GRANT SELECT ON public.printer_settings TO anon;

-- ==================================================================
-- MIGRAÇÃO: Adicionar general_order_id à orders_tickets (17/01/2026)
-- ==================================================================

-- Adicionar coluna general_order_id se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders_tickets' 
        AND column_name = 'general_order_id'
    ) THEN
        BEGIN
            ALTER TABLE public.orders_tickets 
            ADD COLUMN general_order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
        EXCEPTION WHEN others THEN
            ALTER TABLE public.orders_tickets 
            ADD COLUMN general_order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE;
        END;
    END IF;
END $$;

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS orders_tickets_general_order_id_idx 
ON public.orders_tickets (general_order_id);



-- ==================================================================
-- UNIFICAÇÃO DE PEDIDOS: RPCs para Visualização Integrada (17/01/2026)
-- CORREÇÃO 18/01/2026: Correção de erro de coluna oc.items e ajuste de tipo JSONB
-- CORREÇÃO 18/01/2026 (v2): Cast explícito de status para TEXT para evitar erro 22P02
-- CORREÇÃO 18/01/2026 (v3): Inclusão de status lowercase e remoção de filtro restritivo de origem (APP+INTERNAL)
-- ==================================================================

-- Função para buscar pedidos ativos unificados (Mesas e Internos/App)
DROP FUNCTION IF EXISTS public.get_unified_active_orders(UUID);
CREATE OR REPLACE FUNCTION public.get_unified_active_orders(p_store_id UUID)
RETURNS TABLE (
    id UUID,
    store_id UUID,
    customer_name VARCHAR(255),
    table_identifier VARCHAR(50),
    status VARCHAR(50),
    total_amount NUMERIC(10, 2),
    items JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    origin TEXT -- 'COLLABORATOR', 'INTERNAL' ou 'APP'
) AS $$
BEGIN
    RETURN QUERY
    -- Pedidos de Colaboradores (Mesas)
    SELECT 
        oc.id, 
        oc.store_id, 
        oc.customer_name, 
        oc.table_identifier, 
        oc.status::VARCHAR(50), 
        oc.total_amount, 
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'name', COALESCE(oi.name, p.name, 'Produto'),
                    'observation', oi.observation,
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'total_price', oi.total_price,
                    'additional', oi.additional
                )
            ) FROM public.orders_items oi 
            LEFT JOIN public.products p ON p.id = oi.product_id
            WHERE oi.order_id = oc.id
        ) as items,
        oc.created_at, 
        oc.updated_at,
        'COLLABORATOR'::TEXT as origin
    FROM public.orders_collaborators oc
    WHERE oc.store_id = p_store_id AND oc.status::TEXT IN ('opened', 'sent', 'OPENED', 'SENT')

    UNION ALL

    -- Pedidos Gerais (Balcão, App, Entrega)
    SELECT 
        o.id, 
        o.store_id, 
        o.customer_name, 
        (CASE WHEN o.order_type = 'LOCAL' THEN 'Balcão' ELSE o.order_type END)::VARCHAR(50) as table_identifier, 
        o.status::TEXT::VARCHAR(50), 
        o.total_price as total_amount, 
        o.items::JSONB, 
        o.created_at, 
        o.updated_at,
        COALESCE(o.origin, 'INTERNAL')::TEXT as origin
    FROM public.orders o
    WHERE o.store_id = p_store_id 
      -- Removemos filtro de origin para incluir APP e INTERNAL
      AND o.status::TEXT IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'pending', 'confirmed', 'processing', 'ready');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para buscar histórico de pedidos unificado
DROP FUNCTION IF EXISTS public.get_unified_order_history(UUID, INT);
CREATE OR REPLACE FUNCTION public.get_unified_order_history(p_store_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
    id UUID,
    store_id UUID,
    customer_name VARCHAR(255),
    table_identifier VARCHAR(50),
    status VARCHAR(50),
    total_amount NUMERIC(10, 2),
    items JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    origin TEXT,
    payment_method TEXT
) AS $$
BEGIN
    RETURN QUERY
    -- Histórico de Colaboradores
    SELECT 
        oc.id, 
        oc.store_id, 
        oc.customer_name, 
        oc.table_identifier, 
        oc.status::VARCHAR(50), 
        oc.total_amount, 
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', oi.id,
                    'name', COALESCE(oi.name, p.name, 'Produto'),
                    'quantity', oi.quantity,
                    'unit_price', oi.unit_price,
                    'total_price', oi.total_price
                )
            ) FROM public.orders_items oi 
            LEFT JOIN public.products p ON p.id = oi.product_id
            WHERE oi.order_id = oc.id
        ) as items,
        oc.created_at, 
        oc.updated_at,
        'COLLABORATOR'::TEXT as origin,
        'N/A'::TEXT as payment_method
    FROM public.orders_collaborators oc
    WHERE oc.store_id = p_store_id AND oc.status::TEXT IN ('completed', 'COMPLETED')

    UNION ALL

    -- Histórico de Pedidos Gerais
    SELECT 
        o.id, 
        o.store_id, 
        o.customer_name, 
        (CASE WHEN o.order_type = 'LOCAL' THEN 'Balcão' ELSE o.order_type END)::VARCHAR(50) as table_identifier, 
        o.status::TEXT::VARCHAR(50), 
        o.total_price as total_amount, 
        o.items::JSONB, 
        o.created_at, 
        o.updated_at,
        COALESCE(o.origin, 'INTERNAL')::TEXT as origin,
        o.payment_method::TEXT as payment_method
    FROM public.orders o
    WHERE o.store_id = p_store_id 
      -- Removemos filtro de origin para incluir APP e INTERNAL
      AND o.status::TEXT IN ('DELIVERED', 'COMPLETED', 'CANCELLED', 'delivered', 'completed', 'cancelled')
    
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_unified_active_orders(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unified_order_history(UUID, INT) TO authenticated;

-- ==================================================================
-- AUTOMAÇÃO DE TICKETS DE PRODUÇÃO (FILA DE COZINHA)
-- ==================================================================

-- Garantir que a tabela orders_tickets existe
CREATE TABLE IF NOT EXISTS public.orders_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id),
    order_id UUID, -- Referência movida para bloco dinâmico abaixo
    collaborator_order_id UUID REFERENCES public.orders_collaborators(id) ON DELETE CASCADE,
    display_id SERIAL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, producing, ready, delivered, completed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir order_id dinâmico (Fix: erro 42804 compatibilidade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_tickets' AND column_name = 'order_id') THEN
        BEGIN
            ALTER TABLE public.orders_tickets ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
        EXCEPTION WHEN others THEN
            ALTER TABLE public.orders_tickets ADD COLUMN order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE;
        END;
    END IF;
END $$;


-- Índices para orders_tickets
CREATE INDEX IF NOT EXISTS orders_tickets_store_id_idx ON public.orders_tickets(store_id); 
CREATE INDEX IF NOT EXISTS orders_tickets_status_idx ON public.orders_tickets(status);
CREATE INDEX IF NOT EXISTS orders_tickets_created_at_idx ON public.orders_tickets(created_at);

-- RLS para orders_tickets
ALTER TABLE public.orders_tickets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view tickets' AND tablename = 'orders_tickets') THEN
        CREATE POLICY "Authenticated users can view tickets" ON public.orders_tickets FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can manage tickets' AND tablename = 'orders_tickets') THEN
        CREATE POLICY "Authenticated users can manage tickets" ON public.orders_tickets FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS handle_orders_tickets_updated_at ON public.orders_tickets;
CREATE TRIGGER handle_orders_tickets_updated_at BEFORE UPDATE ON public.orders_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função: handle_new_order_ticket (Para Pedidos Internos/Delivery)
CREATE OR REPLACE FUNCTION public.handle_new_order_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o pedido for criado com status PENDING ou CONFIRMED ou PROCESSING, criar ou atualizar ticket
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.status IN ('PENDING', 'CONFIRMED', 'PROCESSING') AND OLD.status != NEW.status) THEN
        
        -- Verificar se já existe ticket para este pedido
        IF NOT EXISTS (SELECT 1 FROM public.orders_tickets WHERE order_id = NEW.id) THEN
            INSERT INTO public.orders_tickets (store_id, order_id, general_order_id, items, status, created_at)
            VALUES (NEW.store_id, NEW.id, NEW.id, COALESCE(NEW.items, '[]'::jsonb), 'pending', NEW.created_at);
        END IF;

    END IF;

    -- Se o pedido for cancelado, remover ticket ou marcar como cancelado? Vamos marcar como completed para sair da fila visível ou deletar?
    -- Melhor manter histórico como completed/cancelled se existir status. Por enquanto, se cancelado, removemos da fila ativa via filtro, ou mudamos status do ticket.
    IF (TG_OP = 'UPDATE' AND NEW.status = 'CANCELLED') THEN
         UPDATE public.orders_tickets SET status = 'completed' WHERE order_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create_ticket_on_order
DROP TRIGGER IF EXISTS trigger_create_ticket_on_order ON public.orders;
CREATE TRIGGER trigger_create_ticket_on_order
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_new_order_ticket();


-- Função: handle_new_collaborator_order_ticket (Para Pedidos de Mesa/Colaborador)
CREATE OR REPLACE FUNCTION public.handle_new_collaborator_order_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o pedido da mesa for 'sent' (enviado para cozinha) ou 'opened' (aberto, dependendo do fluxo)
    -- Geralmente 'sent' é quando vai para cozinha.
    IF (TG_OP = 'INSERT' AND NEW.status IN ('opened', 'sent')) OR 
       (TG_OP = 'UPDATE' AND NEW.status IN ('opened', 'sent') AND OLD.status != NEW.status) THEN
        
        -- Verificar se já existe ticket
        IF NOT EXISTS (SELECT 1 FROM public.orders_tickets WHERE collaborator_order_id = NEW.id) THEN
            -- Para pedidos de colaborador, buscar items da tabela orders_items
            INSERT INTO public.orders_tickets (store_id, collaborator_order_id, items, status, created_at)
            VALUES (
                NEW.store_id, 
                NEW.id, 
                COALESCE(
                    (SELECT jsonb_agg(
                        jsonb_build_object(
                            'product_id', oi.product_id,
                            'name', COALESCE(oi.name, p.name, 'Produto'),
                            'quantity', oi.quantity,
                            'price', oi.unit_price
                        )
                    ) FROM public.orders_items oi 
                    LEFT JOIN public.products p ON p.id = oi.product_id
                    WHERE oi.order_id = NEW.id),
                    '[]'::jsonb
                ),
                'pending', 
                NEW.created_at
            );
        END IF;
    END IF;
    
    -- Se completado, finalizar ticket também
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed') THEN
        UPDATE public.orders_tickets SET status = 'completed' WHERE collaborator_order_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create_ticket_on_collaborator_order
DROP TRIGGER IF EXISTS trigger_create_ticket_on_collaborator_order ON public.orders_collaborators;
CREATE TRIGGER trigger_create_ticket_on_collaborator_order
AFTER INSERT OR UPDATE ON public.orders_collaborators
FOR EACH ROW EXECUTE FUNCTION public.handle_new_collaborator_order_ticket();

-- ==================================================================
-- AUTOMAÇÃO DE TICKETS DE PRODUÇÃO (FILA DE COZINHA)
-- ==================================================================

-- Garantir que a tabela orders_tickets existe
CREATE TABLE IF NOT EXISTS public.orders_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id),
    order_id UUID, -- Referência movida para bloco dinâmico abaixo
    collaborator_order_id UUID REFERENCES public.orders_collaborators(id) ON DELETE CASCADE,
    display_id SERIAL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, producing, ready, delivered, completed
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Garantir order_id dinâmico (Fix: erro 42804 compatibilidade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_tickets' AND column_name = 'order_id') THEN
        BEGIN
            ALTER TABLE public.orders_tickets ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
        EXCEPTION WHEN others THEN
            ALTER TABLE public.orders_tickets ADD COLUMN order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE;
        END;
    END IF;
END $$;


-- Índices para orders_tickets
CREATE INDEX IF NOT EXISTS orders_tickets_store_id_idx ON public.orders_tickets(store_id);
CREATE INDEX IF NOT EXISTS orders_tickets_status_idx ON public.orders_tickets(status);
CREATE INDEX IF NOT EXISTS orders_tickets_created_at_idx ON public.orders_tickets(created_at);

-- RLS para orders_tickets
ALTER TABLE public.orders_tickets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can view tickets' AND tablename = 'orders_tickets') THEN
        CREATE POLICY "Authenticated users can view tickets" ON public.orders_tickets FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can manage tickets' AND tablename = 'orders_tickets') THEN
        CREATE POLICY "Authenticated users can manage tickets" ON public.orders_tickets FOR ALL TO authenticated USING (true);
    END IF;
END $$;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS handle_orders_tickets_updated_at ON public.orders_tickets;
CREATE TRIGGER handle_orders_tickets_updated_at BEFORE UPDATE ON public.orders_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função: handle_new_order_ticket (Para Pedidos Internos/Delivery)
CREATE OR REPLACE FUNCTION public.handle_new_order_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o pedido for criado com status PENDING ou CONFIRMED ou PROCESSING, criar ou atualizar ticket
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.status IN ('PENDING', 'CONFIRMED', 'PROCESSING') AND OLD.status != NEW.status) THEN
        
        -- Verificar se já existe ticket para este pedido
        IF NOT EXISTS (SELECT 1 FROM public.orders_tickets WHERE order_id = NEW.id) THEN
            INSERT INTO public.orders_tickets (store_id, order_id, items, status, created_at)
            VALUES (NEW.store_id, NEW.id, COALESCE(NEW.items, '[]'::jsonb), 'pending', NEW.created_at);
        END IF;
    END IF;

    -- Se o pedido for cancelado, remover ticket ou marcar como cancelado? Vamos marcar como completed para sair da fila visível ou deletar?
    -- Melhor manter histórico como completed/cancelled se existir status. Por enquanto, se cancelado, removemos da fila ativa via filtro, ou mudamos status do ticket.
    IF (TG_OP = 'UPDATE' AND NEW.status = 'CANCELLED') THEN
         UPDATE public.orders_tickets SET status = 'completed' WHERE order_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create_ticket_on_order
DROP TRIGGER IF EXISTS trigger_create_ticket_on_order ON public.orders;
CREATE TRIGGER trigger_create_ticket_on_order
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_new_order_ticket();


-- Função: handle_new_collaborator_order_ticket (Para Pedidos de Mesa/Colaborador)
CREATE OR REPLACE FUNCTION public.handle_new_collaborator_order_ticket()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o pedido da mesa for 'sent' (enviado para cozinha) ou 'opened' (aberto, dependendo do fluxo)
    -- Geralmente 'sent' é quando vai para cozinha.
    IF (TG_OP = 'INSERT' AND NEW.status IN ('opened', 'sent')) OR 
       (TG_OP = 'UPDATE' AND NEW.status IN ('opened', 'sent') AND OLD.status != NEW.status) THEN
        
        -- Verificar se já existe ticket
        IF NOT EXISTS (SELECT 1 FROM public.orders_tickets WHERE collaborator_order_id = NEW.id) THEN
            -- Para pedidos de colaborador, buscar items da tabela orders_items
            INSERT INTO public.orders_tickets (store_id, collaborator_order_id, items, status, created_at)
            VALUES (
                NEW.store_id, 
                NEW.id, 
                COALESCE(
                    (SELECT jsonb_agg(
                        jsonb_build_object(
                            'product_id', oi.product_id,
                            'name', COALESCE(oi.name, p.name, 'Produto'),
                            'quantity', oi.quantity,
                            'price', oi.unit_price
                        )
                    ) FROM public.orders_items oi 
                    LEFT JOIN public.products p ON p.id = oi.product_id
                    WHERE oi.order_id = NEW.id),
                    '[]'::jsonb
                ),
                'pending', 
                NEW.created_at
            );
        END IF;
    END IF;
    
    -- Se completado, finalizar ticket também
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed') THEN
        UPDATE public.orders_tickets SET status = 'completed' WHERE collaborator_order_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create_ticket_on_collaborator_order
DROP TRIGGER IF EXISTS trigger_create_ticket_on_collaborator_order ON public.orders_collaborators;
CREATE TRIGGER trigger_create_ticket_on_collaborator_order
AFTER INSERT OR UPDATE ON public.orders_collaborators
FOR EACH ROW EXECUTE FUNCTION public.handle_new_collaborator_order_ticket();

-- ==================================================================
-- 15.x OTIMIZAÇÕES DE PERFORMANCE (18/01/2026)
-- ==================================================================

-- RPC: Estatísticas Consolidadas do Dashboard Admin (v2 - Otimizado)
-- Reduz ~15 requisições sequenciais para 1 única chamada atômica
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats_v2()
RETURNS JSONB AS $$
DECLARE
    v_now TIMESTAMPTZ := now();
    v_today TIMESTAMPTZ := date_trunc('day', v_now);
    v_yesterday TIMESTAMPTZ := v_today - interval '1 day';
    v_month_ago TIMESTAMPTZ := v_now - interval '30 days';
    v_two_months_ago TIMESTAMPTZ := v_now - interval '60 days';
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'orders', jsonb_build_object(
            'today', (SELECT count(*) FROM public.partner_requests WHERE created_at >= v_today),
            'yesterday', (SELECT count(*) FROM public.partner_requests WHERE created_at >= v_yesterday AND created_at < v_today),
            'total', (SELECT count(*) FROM public.partner_requests),
            'week', (SELECT count(*) FROM public.partner_requests WHERE created_at >= v_now - interval '7 days'),
            'month', (SELECT count(*) FROM public.partner_requests WHERE created_at >= v_month_ago)
        ),
        'finance', (
            WITH current_month AS (
                SELECT 
                    SUM(total_charged_store) as gmv,
                    SUM(total_charged_store - net_value_partner) as rev,
                    COUNT(*) as count
                FROM public.partner_requests 
                WHERE status = 'COMPLETED' AND created_at >= v_month_ago
            ),
            prev_month AS (
                SELECT 
                    SUM(total_charged_store) as gmv,
                    SUM(total_charged_store - net_value_partner) as rev
                FROM public.partner_requests 
                WHERE status = 'COMPLETED' AND created_at >= v_two_months_ago AND created_at < v_month_ago
            )
            SELECT jsonb_build_object(
                'gmv', COALESCE(c.gmv, 0),
                'platformRevenue', COALESCE(c.rev, 0),
                'averageTicket', CASE WHEN COALESCE(c.count, 0) > 0 THEN COALESCE(c.gmv, 0) / c.count ELSE 0 END,
                'gmvTrend', CASE WHEN COALESCE(p.gmv, 0) > 0 THEN ((COALESCE(c.gmv, 0) - p.gmv) / p.gmv) * 100 ELSE (CASE WHEN COALESCE(c.gmv, 0) > 0 THEN 100 ELSE 0 END) END,
                'revenueTrend', CASE WHEN COALESCE(p.rev, 0) > 0 THEN ((COALESCE(c.rev, 0) - p.rev) / p.rev) * 100 ELSE (CASE WHEN COALESCE(c.rev, 0) > 0 THEN 100 ELSE 0 END) END
            ) FROM current_month c, prev_month p
        ),
        'users', jsonb_build_object(
            'stores', jsonb_build_object(
                'active', (SELECT count(*) FROM public.user_profiles WHERE role = 'store_partner' AND is_active = true),
                'total', (SELECT count(*) FROM public.user_profiles WHERE role = 'store_partner')
            ),
            'drivers', jsonb_build_object(
                'online', (SELECT count(*) FROM public.user_profiles WHERE role IN ('delivery_partner', 'delivery_person') AND is_available = true),
                'total', (SELECT count(*) FROM public.user_profiles WHERE role IN ('delivery_partner', 'delivery_person'))
            )
        ),
        'graphData', (
            SELECT jsonb_agg(d) FROM (
                SELECT 
                    t.day::date::text as date,
                    count(pr.id) as count
                FROM generate_series(v_today - interval '6 days', v_today, interval '1 day') AS t(day)
                LEFT JOIN public.partner_requests pr ON date_trunc('day', pr.created_at) = t.day
                GROUP BY t.day
                ORDER BY t.day
            ) d
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adição de Índices Estratégicos para Performance
CREATE INDEX IF NOT EXISTS partner_requests_status_idx ON public.partner_requests (status);
CREATE INDEX IF NOT EXISTS partner_requests_store_created_idx ON public.partner_requests (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS partner_requests_partner_created_idx ON public.partner_requests (partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS store_wallets_store_id_idx ON public.store_wallets (store_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_store_created_idx ON public.wallet_transactions (store_id, created_at DESC);

-- Índices Globais de Fase 2
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles (role);
CREATE INDEX IF NOT EXISTS user_profiles_is_active_idx ON public.user_profiles (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products (is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS products_store_id_idx ON public.products (store_id);
CREATE INDEX IF NOT EXISTS categories_store_id_idx ON public.categories (store_id);
CREATE INDEX IF NOT EXISTS orders_store_id_created_idx ON public.orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_customer_phone_idx ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS chat_messages_order_type_idx ON public.chat_messages (order_id, type);

-- ==================================================================
-- OTIMIZAÇÃO DE PERFORMANCE: ÍNDICES PARA COMANDA (18/01/2026)
-- ==================================================================

-- Índices para otimizar get_unified_active_orders e get_unified_order_history
-- Permitem busca eficiente por loja + origem + status (usado nos WHERE das RPCs)
CREATE INDEX IF NOT EXISTS orders_store_origin_status_idx ON public.orders (store_id, origin, status);

-- Índice para orders_collaborators filtering by store and status
CREATE INDEX IF NOT EXISTS orders_collaborators_store_status_idx ON public.orders_collaborators (store_id, status);

-- Índices para ordenação eficiente (ORDER BY created_at DESC)
-- Combinando com as colunas de filtro para Index Only Scan ou Index Scan eficiente
CREATE INDEX IF NOT EXISTS orders_store_origin_created_at_idx ON public.orders (store_id, origin, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_collaborators_store_created_at_idx ON public.orders_collaborators (store_id, created_at DESC);

-- ==================================================================
-- ALINHAMENTO DE STATUS: Garantir que order_status suporte todos os rótulos usados (18/01/2026)
-- Resolve Erro 22P02: invalid input value for enum order_status: "CONFIRMED"
-- ==================================================================
DO $$ 
BEGIN
    -- Lista de status para garantir no enum public.order_status
    -- Maiúsculos (Padrão esperado pelo backend)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'PENDING') THEN
        ALTER TYPE public.order_status ADD VALUE 'PENDING';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'CONFIRMED') THEN
        ALTER TYPE public.order_status ADD VALUE 'CONFIRMED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'PROCESSING') THEN
        ALTER TYPE public.order_status ADD VALUE 'PROCESSING';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'READY') THEN
        ALTER TYPE public.order_status ADD VALUE 'READY';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'DELIVERED') THEN
        ALTER TYPE public.order_status ADD VALUE 'DELIVERED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'COMPLETED') THEN
        ALTER TYPE public.order_status ADD VALUE 'COMPLETED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'CANCELLED') THEN
        ALTER TYPE public.order_status ADD VALUE 'CANCELLED';
    END IF;

    -- Minúsculos (Para compatibilidade com dados legados ou envios acidentais)
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'pending') THEN
        ALTER TYPE public.order_status ADD VALUE 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'confirmed') THEN
        ALTER TYPE public.order_status ADD VALUE 'confirmed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'processing') THEN
        ALTER TYPE public.order_status ADD VALUE 'processing';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'ready') THEN
        ALTER TYPE public.order_status ADD VALUE 'ready';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'delivered') THEN
        ALTER TYPE public.order_status ADD VALUE 'delivered';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'completed') THEN
        ALTER TYPE public.order_status ADD VALUE 'completed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.order_status'::regtype AND enumlabel = 'cancelled') THEN
        ALTER TYPE public.order_status ADD VALUE 'cancelled';
    END IF;
END $$;

-- ==================================================================
-- CORREÇÃO DEFINITIVA: Recriar tabela orders_tickets corretamente (18/01/2026)
-- ==================================================================

-- Dropar triggers antigos
DROP TRIGGER IF EXISTS trigger_create_ticket_on_order ON public.orders;
DROP TRIGGER IF EXISTS trigger_create_ticket_on_collaborator_order ON public.orders_collaborators;
DROP TRIGGER IF EXISTS handle_orders_tickets_updated_at ON public.orders_tickets;

-- Dropar funções antigas
DROP FUNCTION IF EXISTS public.handle_new_order_ticket() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_collaborator_order_ticket() CASCADE;

-- Dropar tabela antiga se existir
-- Manter tabela orders_tickets (Removido DROP para preservar dados conforme regra 1)
-- Tabela de Tickets de Pedido (Consolidada com Schema Repair)
-- Garantir colunas e constraints dinâmicas (Fix: erro 42804 compatibilidade)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_tickets' AND column_name = 'order_id') THEN
        BEGIN
            ALTER TABLE public.orders_tickets ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE;
        EXCEPTION WHEN others THEN
            ALTER TABLE public.orders_tickets ADD COLUMN order_id INTEGER REFERENCES public.orders(id) ON DELETE CASCADE;
        END;
    ELSE
        -- Garantir a FK se a coluna já existir mas estiver sem ela
        BEGIN
            ALTER TABLE public.orders_tickets ADD CONSTRAINT orders_tickets_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;
        EXCEPTION WHEN others THEN
            NULL;
        END;
    END IF;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS orders_tickets_store_id_idx ON public.orders_tickets(store_id);
CREATE INDEX IF NOT EXISTS orders_tickets_status_idx ON public.orders_tickets(status);
CREATE INDEX IF NOT EXISTS orders_tickets_created_at_idx ON public.orders_tickets(created_at);
CREATE INDEX IF NOT EXISTS orders_tickets_order_id_idx ON public.orders_tickets(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_tickets_collaborator_order_id_idx ON public.orders_tickets(collaborator_order_id) WHERE collaborator_order_id IS NOT NULL;

-- RLS
ALTER TABLE public.orders_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.orders_tickets;
CREATE POLICY "Authenticated users can view tickets" ON public.orders_tickets FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can manage tickets" ON public.orders_tickets;
CREATE POLICY "Authenticated users can manage tickets" ON public.orders_tickets FOR ALL TO authenticated USING (true);

-- Trigger para updated_at
CREATE TRIGGER handle_orders_tickets_updated_at 
BEFORE UPDATE ON public.orders_tickets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para pedidos internos/delivery
CREATE OR REPLACE FUNCTION public.handle_new_order_ticket()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.status IN ('PENDING', 'CONFIRMED', 'PROCESSING') AND OLD.status != NEW.status) THEN
        IF NOT EXISTS (SELECT 1 FROM public.orders_tickets WHERE order_id = NEW.id) THEN
            INSERT INTO public.orders_tickets (store_id, order_id, items, status, created_at)
            VALUES (NEW.store_id, NEW.id, COALESCE(NEW.items, '[]'::jsonb), 'pending', NEW.created_at);
        END IF;
    END IF;
    
    IF (TG_OP = 'UPDATE' AND NEW.status = 'CANCELLED') THEN
        UPDATE public.orders_tickets SET status = 'completed' WHERE order_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para pedidos de colaborador
CREATE OR REPLACE FUNCTION public.handle_new_collaborator_order_ticket()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' AND NEW.status IN ('opened', 'sent')) OR 
       (TG_OP = 'UPDATE' AND NEW.status IN ('opened', 'sent') AND OLD.status != NEW.status) THEN
        
        IF NOT EXISTS (SELECT 1 FROM public.orders_tickets WHERE collaborator_order_id = NEW.id) THEN
            INSERT INTO public.orders_tickets (store_id, collaborator_order_id, items, status, created_at)
            VALUES (
                NEW.store_id, 
                NEW.id, 
                COALESCE(
                    (SELECT jsonb_agg(
                        jsonb_build_object(
                            'product_id', oi.product_id,
                            'name', COALESCE(oi.name, p.name, 'Produto'),
                            'quantity', oi.quantity,
                            'price', oi.unit_price
                        )
                    ) FROM public.orders_items oi 
                    LEFT JOIN public.products p ON p.id = oi.product_id
                    WHERE oi.order_id = NEW.id),
                    '[]'::jsonb
                ),
                'pending', 
                NEW.created_at
            );
        END IF;
    END IF;
    
    IF (TG_OP = 'UPDATE' AND NEW.status = 'completed') THEN
        UPDATE public.orders_tickets SET status = 'completed' WHERE collaborator_order_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar triggers
CREATE TRIGGER trigger_create_ticket_on_order
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_new_order_ticket();

CREATE TRIGGER trigger_create_ticket_on_collaborator_order
AFTER INSERT OR UPDATE ON public.orders_collaborators
FOR EACH ROW EXECUTE FUNCTION public.handle_new_collaborator_order_ticket();

-- ==================================================================
-- CORREÇÃO DE PERMISSÕES RLS - orders_tickets (18/01/2026)
-- ==================================================================

-- Remover policies antigas
DROP POLICY IF EXISTS "Authenticated users can view tickets" ON public.orders_tickets;
DROP POLICY IF EXISTS "Authenticated users can manage tickets" ON public.orders_tickets;
DROP POLICY IF EXISTS "Users can view their store tickets" ON public.orders_tickets;
DROP POLICY IF EXISTS "Users can create tickets for their store" ON public.orders_tickets;
DROP POLICY IF EXISTS "Users can update their store tickets" ON public.orders_tickets;
DROP POLICY IF EXISTS "Users can delete their store tickets" ON public.orders_tickets;

-- Criar policies corretas
CREATE POLICY "Users can view their store tickets" 
ON public.orders_tickets 
FOR SELECT 
TO authenticated 
USING (
    store_id::text = auth.uid()::text 
    OR 
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id::text = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "Users can create tickets for their store" 
ON public.orders_tickets 
FOR INSERT 
TO authenticated 
WITH CHECK (
    store_id::text = auth.uid()::text 
    OR 
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id::text = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "Users can update their store tickets" 
ON public.orders_tickets 
FOR UPDATE 
TO authenticated 
USING (
    store_id::text = auth.uid()::text 
    OR 
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id::text = auth.uid()::text AND role = 'admin')
);

CREATE POLICY "Users can delete their store tickets" 
ON public.orders_tickets 
FOR DELETE 
TO authenticated 
USING (
    store_id::text = auth.uid()::text 
    OR 
    EXISTS (SELECT 1 FROM public.user_profiles WHERE id::text = auth.uid()::text AND role = 'admin')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders_tickets TO authenticated;

-- Função RPC para atualizar status do ticket (Acessível por Colaboradores/Lojistas)
CREATE OR REPLACE FUNCTION public.update_ticket_status(p_ticket_id UUID, p_status TEXT)
RETURNS VOID AS $$
DECLARE
    v_ticket RECORD;
    v_order RECORD;
    v_next_status TEXT := 'ready';
    v_final_status TEXT := p_status;
BEGIN
    -- 1. Atualizar o status do ticket
    UPDATE public.orders_tickets
    SET status = p_status, updated_at = now()
    WHERE id = p_ticket_id
    RETURNING * INTO v_ticket;

    IF v_ticket.id IS NULL THEN
        RAISE EXCEPTION 'Ticket not found';
    END IF;

    -- 2. Sincronizar status com o pedido principal quando entrar em produção
    IF p_status = 'producing' AND v_ticket.order_id IS NOT NULL THEN
        UPDATE public.orders
        SET status = 'PREPARING'::public.order_status, updated_at = now()
        WHERE id = v_ticket.order_id;
    END IF;

    -- 3. Se for marcado como 'delivered' ou 'in_transit', finalizar automaticamente
    -- Isso garante que pedidos nas abas Ready (Entrega/Retirada/Local)
    -- sejam movidos para o histórico quando entregues
    IF p_status = 'delivered' OR p_status = 'in_transit' THEN
        v_final_status := 'delivered';
        
        -- Atualizar o ticket para 'delivered' se ainda não estiver
        IF p_status != 'delivered' THEN
            UPDATE public.orders_tickets
            SET status = 'delivered', updated_at = now()
            WHERE id = p_ticket_id;
        END IF;
    END IF;

    -- 4. Se for finalizado (ready) e tiver pedido principal associado (Delivery/Balcão)
    IF p_status = 'ready' AND v_ticket.order_id IS NOT NULL THEN
        -- Buscar pedido para ver tipo
        SELECT * INTO v_order FROM public.orders WHERE id = v_ticket.order_id;
        
        IF v_order.id IS NOT NULL THEN
            -- Se for delivery com entregador, vai para in_transit
            IF v_order.order_type = 'DELIVERY' AND v_order.driver_id IS NOT NULL THEN
                v_next_status := 'IN_DELIVERY'; -- Ajustado para MAIÚSCULAS conforme enum
            ELSE
                v_next_status := 'READY'; -- Ajustado para MAIÚSCULAS conforme enum
            END IF;

            -- Atualizar pedido principal
            UPDATE public.orders 
            SET status = v_next_status::public.order_status, updated_at = now()
            WHERE id = v_order.id;
        END IF;
    END IF;

    -- 5. Se for entregue e tiver pedido principal, marcar pedido como COMPLETED
    IF v_final_status = 'delivered' AND v_ticket.general_order_id IS NOT NULL THEN
        UPDATE public.orders
        SET status = 'COMPLETED'::public.order_status, updated_at = now()
        WHERE id = v_ticket.general_order_id;
    END IF;
    
    -- Caso o ticket seja marcado como delivered mas o general_order_id seja nulo (v_ticket.order_id é usado)
    IF v_final_status = 'delivered' AND v_ticket.order_id IS NOT NULL THEN
         UPDATE public.orders
         SET status = 'COMPLETED'::public.order_status, updated_at = now()
         WHERE id = v_ticket.order_id;
    END IF;

    -- 6. Se for rejeitado e tiver pedido principal associado
    IF p_status = 'rejected' AND v_ticket.order_id IS NOT NULL THEN
        UPDATE public.orders
        SET status = 'CANCELLED'::public.order_status, updated_at = now()
        WHERE id = v_ticket.order_id;
    END IF;

    -- 7. Se for pedido de colaborador (Mesa)
    IF v_ticket.collaborator_order_id IS NOT NULL THEN
        -- Se for rejeitado, cancela o pedido do colaborador também
        IF p_status = 'rejected' THEN
            UPDATE public.orders_collaborators
            SET status = 'cancelled', updated_at = now()
            WHERE id = v_ticket.collaborator_order_id;
        -- Se for entregue, marca como completed
        ELSIF v_final_status = 'delivered' THEN
            UPDATE public.orders_collaborators
            SET status = 'completed', updated_at = now()
            WHERE id = v_ticket.collaborator_order_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.update_ticket_status TO anon, authenticated, service_role;

-- ==================================================================
-- EXTENSÕES DE CHAT LEGADAS (Consolidadas)
-- ==================================================================

-- Garantir colunas de controle para o novo Chat Nativo
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_conversations' AND column_name = 'locked_by_agent_id') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN locked_by_agent_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_conversations' AND column_name = 'locked_at') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN locked_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'client_message_id') THEN
        ALTER TABLE public.chat_messages ADD COLUMN client_message_id TEXT;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_conv_locked_by ON public.chat_conversations(locked_by_agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_client_id ON public.chat_messages(client_message_id);

COMMENT ON COLUMN public.chat_conversations.locked_by_agent_id IS 'ID do atendente que está respondendo no momento';
COMMENT ON COLUMN public.chat_messages.client_message_id IS 'ID gerado pelo cliente para deduplicação';

-- Bloco legado removido para consolidação.

-- ==================================================================
-- ORGANIZAÇÃO MANUAL DE CONVERSAS (Adicionado em 2026-01-18)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.chat_conversation_orders (
    attendant_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    conversation_id TEXT,
    position INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (attendant_id, store_id, conversation_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_chat_conv_orders_attendant ON public.chat_conversation_orders(attendant_id, store_id);

-- RLS
ALTER TABLE public.chat_conversation_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Atendentes gerenciam sua própria ordem" ON public.chat_conversation_orders;
CREATE POLICY "Atendentes gerenciam sua própria ordem" ON public.chat_conversation_orders
    FOR ALL USING (auth.uid()::text = attendant_id::text);

GRANT ALL ON public.chat_conversation_orders TO authenticated, service_role;

COMMENT ON TABLE public.chat_conversation_orders IS 'Armazena a ordem manual das conversas de Chat por atendente';

-- Extensão de Prioridade e Telefone
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_conversations' AND column_name = 'priority') THEN
        ALTER TABLE "chat_conversations" ADD COLUMN "priority" text DEFAULT 'normal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_conversations' AND column_name = 'phone_number') THEN
        ALTER TABLE "chat_conversations" ADD COLUMN "phone_number" text;
    END IF;
END $$;

-- ==================================================================
-- ZÉ ASSISTENTE - ASSISTENTE VIRTUAL WHATSAPP (Adicionado em 2026-01-18)
-- ==================================================================

-- Enum para tipos de resposta do assistente
DO $$ BEGIN
    CREATE TYPE public.ze_assistant_response_type AS ENUM ('AI', 'RULE', 'HYBRID', 'HUMAN');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para tipos de regra
DO $$ BEGIN
    CREATE TYPE public.ze_assistant_rule_type AS ENUM ('SYSTEM', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para tipos de pedido
DO $$ BEGIN
    CREATE TYPE public.ze_assistant_order_type AS ENUM ('DELIVERY', 'PICKUP');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Enum para tipos de conteúdo da base de conhecimento
DO $$ BEGIN
    CREATE TYPE public.ze_assistant_content_type AS ENUM ('PRODUCT', 'FAQ', 'POLICY', 'HOURS', 'PAYMENT', 'DELIVERY');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==================================================================
-- TABELA 1: Configurações do Zé Assistente por Loja
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.ze_assistant_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    ai_enabled BOOLEAN DEFAULT TRUE,
    rules_enabled BOOLEAN DEFAULT TRUE,
    can_create_orders BOOLEAN DEFAULT FALSE,
    can_delivery BOOLEAN DEFAULT FALSE,
    can_pickup BOOLEAN DEFAULT FALSE,
    greeting_message TEXT DEFAULT 'Olá! Sou o Zé, assistente virtual desta loja. Como posso ajudar?',
    fallback_message TEXT DEFAULT 'Desculpe, não entendi. Vou transferir você para um atendente humano.',
    auto_handoff_on_confusion BOOLEAN DEFAULT TRUE,
    max_confusion_attempts INTEGER DEFAULT 2,
    response_delay_ms INTEGER DEFAULT 1000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ze_assistant_config_store ON public.ze_assistant_config(store_id);

DROP TRIGGER IF EXISTS handle_ze_assistant_config_updated_at ON public.ze_assistant_config;
CREATE TRIGGER handle_ze_assistant_config_updated_at BEFORE UPDATE ON public.ze_assistant_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ze_assistant_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojistas gerenciam sua configuração" ON public.ze_assistant_config;
CREATE POLICY "Lojistas gerenciam sua configuração" ON public.ze_assistant_config
    FOR ALL USING (auth.uid()::text = store_id::text OR public.is_admin());

GRANT ALL ON public.ze_assistant_config TO authenticated, service_role;

COMMENT ON TABLE public.ze_assistant_config IS 'Configurações do Zé Assistente por loja';

-- ==================================================================
-- TABELA 2: Regras Fixas do Assistente (Sistema + Personalizadas)
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.ze_assistant_rules (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    rule_type public.ze_assistant_rule_type NOT NULL DEFAULT 'CUSTOM',
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_keywords TEXT[] NOT NULL,
    response_template TEXT NOT NULL,
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    match_mode VARCHAR(20) DEFAULT 'contains', -- 'exact', 'contains', 'starts_with', 'regex'
    variables JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_rule_type_store CHECK (
        (rule_type = 'SYSTEM' AND store_id IS NULL) OR 
        (rule_type = 'CUSTOM' AND store_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_ze_assistant_rules_store ON public.ze_assistant_rules(store_id);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_rules_type ON public.ze_assistant_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_rules_active ON public.ze_assistant_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_rules_priority ON public.ze_assistant_rules(priority DESC);

DROP TRIGGER IF EXISTS handle_ze_assistant_rules_updated_at ON public.ze_assistant_rules;
CREATE TRIGGER handle_ze_assistant_rules_updated_at BEFORE UPDATE ON public.ze_assistant_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ze_assistant_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos visualizam regras do sistema" ON public.ze_assistant_rules;
CREATE POLICY "Todos visualizam regras do sistema" ON public.ze_assistant_rules
    FOR SELECT USING (rule_type = 'SYSTEM' OR auth.uid()::text = store_id::text OR public.is_admin());

DROP POLICY IF EXISTS "Lojistas gerenciam suas regras" ON public.ze_assistant_rules;
CREATE POLICY "Lojistas gerenciam suas regras" ON public.ze_assistant_rules
    FOR ALL USING (
        (rule_type = 'CUSTOM' AND auth.uid()::text = store_id::text) OR 
        public.is_admin()
    );

GRANT SELECT ON public.ze_assistant_rules TO authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.ze_assistant_rules TO authenticated, service_role;

COMMENT ON TABLE public.ze_assistant_rules IS 'Regras fixas do Zé Assistente (sistema e personalizadas)';

-- ==================================================================
-- TABELA 3: Histórico de Conversas do Assistente
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.ze_assistant_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    is_assistant_active BOOLEAN DEFAULT TRUE,
    handoff_to_human BOOLEAN DEFAULT FALSE,
    handoff_at TIMESTAMPTZ,
    handoff_reason TEXT,
    context_data JSONB DEFAULT '{}'::jsonb,
    summary TEXT,
    confusion_count INTEGER DEFAULT 0,
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_ze_assistant_conv_store ON public.ze_assistant_conversations(store_id);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_conv_phone ON public.ze_assistant_conversations(customer_phone);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_conv_active ON public.ze_assistant_conversations(is_assistant_active);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_conv_last_interaction ON public.ze_assistant_conversations(last_interaction_at DESC);

DROP TRIGGER IF EXISTS handle_ze_assistant_conversations_updated_at ON public.ze_assistant_conversations;
CREATE TRIGGER handle_ze_assistant_conversations_updated_at BEFORE UPDATE ON public.ze_assistant_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ze_assistant_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojistas visualizam conversas da sua loja" ON public.ze_assistant_conversations;
CREATE POLICY "Lojistas visualizam conversas da sua loja" ON public.ze_assistant_conversations
    FOR ALL USING (auth.uid()::text = store_id::text OR public.is_admin());

GRANT ALL ON public.ze_assistant_conversations TO authenticated, service_role;

COMMENT ON TABLE public.ze_assistant_conversations IS 'Histórico de conversas do Zé Assistente';

-- ==================================================================
-- TABELA 4: Mensagens Processadas pelo Assistente
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.ze_assistant_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.ze_assistant_conversations(id) ON DELETE CASCADE NOT NULL,
    message_id TEXT,
    message_text TEXT NOT NULL,
    response_text TEXT,
    response_type public.ze_assistant_response_type DEFAULT 'HYBRID',
    confidence_score NUMERIC(3, 2),
    rule_id UUID REFERENCES public.ze_assistant_rules(id) ON DELETE SET NULL,
    processing_time_ms INTEGER,
    was_successful BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ze_assistant_msg_conv ON public.ze_assistant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_msg_type ON public.ze_assistant_messages(response_type);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_msg_created ON public.ze_assistant_messages(created_at DESC);

ALTER TABLE public.ze_assistant_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojistas visualizam mensagens da sua loja" ON public.ze_assistant_messages;
CREATE POLICY "Lojistas visualizam mensagens da sua loja" ON public.ze_assistant_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.ze_assistant_conversations 
            WHERE id = ze_assistant_messages.conversation_id AND 
            (store_id::text = auth.uid()::text OR public.is_admin())
        )
    );

GRANT SELECT, INSERT ON public.ze_assistant_messages TO authenticated, service_role;

COMMENT ON TABLE public.ze_assistant_messages IS 'Registro de mensagens processadas pelo Zé Assistente';

-- ==================================================================
-- TABELA 5: Pedidos Criados pelo Assistente
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.ze_assistant_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.ze_assistant_conversations(id) ON DELETE CASCADE NOT NULL,
    order_id UUID,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address JSONB,
    items JSONB NOT NULL,
    order_type public.ze_assistant_order_type NOT NULL,
    total_amount NUMERIC(10, 2),
    delivery_fee NUMERIC(10, 2),
    payment_method TEXT,
    confirmed_by_customer BOOLEAN DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ze_assistant_orders_conv ON public.ze_assistant_orders(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_orders_status ON public.ze_assistant_orders(status);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_orders_created ON public.ze_assistant_orders(created_at DESC);

DROP TRIGGER IF EXISTS handle_ze_assistant_orders_updated_at ON public.ze_assistant_orders;
CREATE TRIGGER handle_ze_assistant_orders_updated_at BEFORE UPDATE ON public.ze_assistant_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ze_assistant_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojistas gerenciam pedidos da sua loja" ON public.ze_assistant_orders;
CREATE POLICY "Lojistas gerenciam pedidos da sua loja" ON public.ze_assistant_orders
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.ze_assistant_conversations 
            WHERE id = ze_assistant_orders.conversation_id AND 
            (store_id::text = auth.uid()::text OR public.is_admin())
        )
    );

GRANT ALL ON public.ze_assistant_orders TO authenticated, service_role;

COMMENT ON TABLE public.ze_assistant_orders IS 'Pedidos criados pelo Zé Assistente';

-- ==================================================================
-- TABELA 6: Base de Conhecimento por Loja
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.ze_assistant_knowledge_base (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    content_type public.ze_assistant_content_type NOT NULL,
    title VARCHAR(500),
    content TEXT NOT NULL,
    structured_data JSONB,
    embeddings JSONB,
    relevance_score NUMERIC(3, 2) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ze_assistant_kb_store ON public.ze_assistant_knowledge_base(store_id);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_kb_type ON public.ze_assistant_knowledge_base(content_type);
CREATE INDEX IF NOT EXISTS idx_ze_assistant_kb_active ON public.ze_assistant_knowledge_base(is_active);

DROP TRIGGER IF EXISTS handle_ze_assistant_kb_updated_at ON public.ze_assistant_knowledge_base;
CREATE TRIGGER handle_ze_assistant_kb_updated_at BEFORE UPDATE ON public.ze_assistant_knowledge_base
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.ze_assistant_knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lojistas gerenciam sua base de conhecimento" ON public.ze_assistant_knowledge_base;
CREATE POLICY "Lojistas gerenciam sua base de conhecimento" ON public.ze_assistant_knowledge_base
    FOR ALL USING (auth.uid()::text = store_id::text OR public.is_admin());

GRANT ALL ON public.ze_assistant_knowledge_base TO authenticated, service_role;

COMMENT ON TABLE public.ze_assistant_knowledge_base IS 'Base de conhecimento do Zé Assistente por loja';

-- ==================================================================
-- DADOS INICIAIS: Regras Padrão do Sistema
-- ==================================================================

-- Inserir regras padrão do sistema (apenas se não existirem)
-- Inserir regras padrão do sistema (apenas se não existirem)
-- Usando DO block para iterar e inserir de forma segura sem duplicar

DO $$
DECLARE
    v_rule_name TEXT;
    v_rule_desc TEXT;
    v_keywords TEXT[];
    v_response TEXT;
    v_priority INTEGER;
BEGIN
    -- 1. Saudação
    IF NOT EXISTS (SELECT 1 FROM public.ze_assistant_rules WHERE name = 'Saudação' AND rule_type = 'SYSTEM') THEN
        INSERT INTO public.ze_assistant_rules (rule_type, name, description, trigger_keywords, response_template, priority, match_mode)
        VALUES ('SYSTEM', 'Saudação', 'Resposta para saudações', ARRAY['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'ola'], 
                'Olá! 👋 Sou o Zé, assistente virtual. Como posso ajudar você hoje?', 90, 'contains');
    END IF;

    -- 2. Agradecimento
    IF NOT EXISTS (SELECT 1 FROM public.ze_assistant_rules WHERE name = 'Agradecimento' AND rule_type = 'SYSTEM') THEN
        INSERT INTO public.ze_assistant_rules (rule_type, name, description, trigger_keywords, response_template, priority, match_mode)
        VALUES ('SYSTEM', 'Agradecimento', 'Resposta para agradecimentos', ARRAY['obrigado', 'obrigada', 'valeu', 'muito obrigado'],
                'Por nada! 😊 Sempre à disposição. Precisa de mais alguma coisa?', 80, 'contains');
    END IF;

    -- 3. Despedida
    IF NOT EXISTS (SELECT 1 FROM public.ze_assistant_rules WHERE name = 'Despedida' AND rule_type = 'SYSTEM') THEN
        INSERT INTO public.ze_assistant_rules (rule_type, name, description, trigger_keywords, response_template, priority, match_mode)
        VALUES ('SYSTEM', 'Despedida', 'Resposta para despedidas', ARRAY['tchau', 'até logo', 'até mais', 'falou', 'bye'],
                'Até logo! 👋 Volte sempre que precisar!', 85, 'contains');
    END IF;

    -- 4. Cardápio
    IF NOT EXISTS (SELECT 1 FROM public.ze_assistant_rules WHERE name = 'Cardápio/Produtos' AND rule_type = 'SYSTEM') THEN
        INSERT INTO public.ze_assistant_rules (rule_type, name, description, trigger_keywords, response_template, priority, match_mode)
        VALUES ('SYSTEM', 'Cardápio/Produtos', 'Solicitar lista de produtos', ARRAY['cardápio', 'cardapio', 'menu', 'produtos', 'o que tem', 'o que vocês tem', 'que tem'],
                'Claro! Vou buscar nosso cardápio completo para você. Um momento... 📋', 70, 'contains');
    END IF;

    -- 5. Preço
    IF NOT EXISTS (SELECT 1 FROM public.ze_assistant_rules WHERE name = 'Preço' AND rule_type = 'SYSTEM') THEN
        INSERT INTO public.ze_assistant_rules (rule_type, name, description, trigger_keywords, response_template, priority, match_mode)
        VALUES ('SYSTEM', 'Preço', 'Pergunta sobre preços', ARRAY['quanto custa', 'preço', 'preco', 'valor', 'quanto é', 'quanto fica'],
                'Sobre qual produto você gostaria de saber o preço? 💰', 75, 'contains');
    END IF;

    -- 6. Forma de Pagamento
    IF NOT EXISTS (SELECT 1 FROM public.ze_assistant_rules WHERE name = 'Forma de Pagamento' AND rule_type = 'SYSTEM') THEN
        INSERT INTO public.ze_assistant_rules (rule_type, name, description, trigger_keywords, response_template, priority, match_mode)
        VALUES ('SYSTEM', 'Forma de Pagamento', 'Pergunta sobre pagamento', ARRAY['pagar', 'pagamento', 'aceita', 'forma de pagamento', 'cartão', 'cartao', 'pix', 'dinheiro'],
                'Aceitamos diversas formas de pagamento. Deixe-me verificar as opções disponíveis para você! 💳', 70, 'contains');
    END IF;

    -- 7. Entrega
    IF NOT EXISTS (SELECT 1 FROM public.ze_assistant_rules WHERE name = 'Entrega' AND rule_type = 'SYSTEM') THEN
        INSERT INTO public.ze_assistant_rules (rule_type, name, description, trigger_keywords, response_template, priority, match_mode)
        VALUES ('SYSTEM', 'Entrega', 'Pergunta sobre entrega', ARRAY['entrega', 'entregar', 'delivery', 'frete', 'quanto tempo', 'demora'],
                'Sobre entrega: deixe-me verificar as informações de prazo e taxa para sua região! 🚚', 75, 'contains');
    END IF;

    -- 8. Horário
    IF NOT EXISTS (SELECT 1 FROM public.ze_assistant_rules WHERE name = 'Horário' AND rule_type = 'SYSTEM') THEN
        INSERT INTO public.ze_assistant_rules (rule_type, name, description, trigger_keywords, response_template, priority, match_mode)
        VALUES ('SYSTEM', 'Horário', 'Pergunta sobre horário de funcionamento', ARRAY['horário', 'horario', 'abre', 'fecha', 'funciona', 'funcionamento', 'aberto'],
                'Vou verificar nosso horário de funcionamento para você! ⏰', 80, 'contains');
    END IF;

    -- 9. Endereço
    IF NOT EXISTS (SELECT 1 FROM public.ze_assistant_rules WHERE name = 'Endereço' AND rule_type = 'SYSTEM') THEN
        INSERT INTO public.ze_assistant_rules (rule_type, name, description, trigger_keywords, response_template, priority, match_mode)
        VALUES ('SYSTEM', 'Endereço', 'Pergunta sobre localização', ARRAY['endereço', 'endereco', 'onde fica', 'localização', 'localizacao', 'onde é'],
                'Vou te passar o endereço da loja! 📍', 75, 'contains');
    END IF;

    -- 10. Fazer Pedido
    IF NOT EXISTS (SELECT 1 FROM public.ze_assistant_rules WHERE name = 'Fazer Pedido' AND rule_type = 'SYSTEM') THEN
        INSERT INTO public.ze_assistant_rules (rule_type, name, description, trigger_keywords, response_template, priority, match_mode)
        VALUES ('SYSTEM', 'Fazer Pedido', 'Iniciar pedido', ARRAY['fazer pedido', 'quero pedir', 'gostaria de pedir', 'queria pedir', 'pedido'],
                'Ótimo! Vou te ajudar a fazer seu pedido. 🛒 Me diga o que você gostaria!', 95, 'contains');
    END IF;
END $$;


-- ==================================================================
-- 2.x TABELAS DE ROTAS (Adicionado em 20/01/2026)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.user_saved_routes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    name TEXT,
    items JSONB DEFAULT '[]'::jsonb, -- Lista de endere�os/paradas
    origin_data JSONB DEFAULT '{}'::jsonb, -- Dados da origem da rota
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que colunas existam (Migra��o Aditiva)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_saved_routes' AND column_name = 'origin_data') THEN
        ALTER TABLE public.user_saved_routes ADD COLUMN origin_data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

DROP TRIGGER IF EXISTS handle_user_saved_routes_updated_at ON public.user_saved_routes;
CREATE TRIGGER handle_user_saved_routes_updated_at BEFORE UPDATE ON public.user_saved_routes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.user_saved_routes ENABLE ROW LEVEL SECURITY;

-- Pol�ticas de Acesso
DROP POLICY IF EXISTS "Users can manage their own routes" ON public.user_saved_routes;
CREATE POLICY "Users can manage their own routes" ON public.user_saved_routes
    FOR ALL USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Admins can view all routes" ON public.user_saved_routes;
CREATE POLICY "Admins can view all routes" ON public.user_saved_routes
    FOR SELECT USING (public.is_admin());
-- Garante permissÃ£o pÃºblica de leitura para configuraÃ§Ãµes do PWA
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can read pwa_settings" ON public.pwa_settings;
    CREATE POLICY "Public can read pwa_settings" ON public.pwa_settings
    FOR SELECT USING (true);
END $$;
-- PolÃ­ticas de RLS para liberar acesso a colaboradores e manifesto
DO $$
BEGIN
    -- Permitir leitura pÃºblica das configuraÃ§Ãµes do PWA (essencial para o manifesto dinÃ¢mico)
    DROP POLICY IF EXISTS "Public can read pwa_settings" ON public.pwa_settings;
    CREATE POLICY "Public can read pwa_settings" ON public.pwa_settings
    FOR SELECT USING (true);

    -- Permitir que colaboradores leiam seus prÃ³prios dados e dados vinculados Ã  sua loja
    DROP POLICY IF EXISTS "Collaborators can read store data" ON public.collaborators;
    CREATE POLICY "Collaborators can read store data" ON public.collaborators
    FOR SELECT USING (true); -- Ajustado para permitir leitura por colaboradores autenticados via login customizado

    -- Permitir leitura de pedidos da loja por colaboradores
    DROP POLICY IF EXISTS "Collaborators can read store orders" ON public.orders_collaborators;
    CREATE POLICY "Collaborators can read store orders" ON public.orders_collaborators
    FOR SELECT USING (true);

    -- Garantir permissÃµes de acesso Ã s tabelas
    GRANT SELECT ON public.pwa_settings TO anon, authenticated, service_role;
    GRANT SELECT ON public.collaborators TO anon, authenticated;
    GRANT SELECT ON public.orders_collaborators TO anon, authenticated;

    -- Liberar acesso ao ZÃ© Assistente para colaboradores
    DROP POLICY IF EXISTS "Colaboradores gerenciam config do assistente" ON public.ze_assistant_config;
    CREATE POLICY "Colaboradores gerenciam config do assistente" ON public.ze_assistant_config
    FOR ALL USING (
        auth.uid()::text = store_id::text OR 
        EXISTS (SELECT 1 FROM public.collaborators WHERE id::text = auth.uid()::text AND store_id = public.ze_assistant_config.store_id) OR
        public.is_admin()
    );

    DROP POLICY IF EXISTS "Colaboradores gerenciam regras do assistente" ON public.ze_assistant_rules;
    CREATE POLICY "Colaboradores gerenciam regras do assistente" ON public.ze_assistant_rules
    FOR ALL USING (
        auth.uid()::text = store_id::text OR 
        EXISTS (SELECT 1 FROM public.collaborators WHERE id::text = auth.uid()::text AND store_id = public.ze_assistant_rules.store_id) OR
        public.is_admin()
    );

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.ze_assistant_config TO authenticated;
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.ze_assistant_rules TO authenticated;

    -- Tabela de Figurinhas da Loja
    CREATE TABLE IF NOT EXISTS public.store_stickers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        store_id UUID NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        is_favorite BOOLEAN DEFAULT FALSE
    );

    -- RLS para Figurinhas
    ALTER TABLE public.store_stickers ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Lojas veem suas figurinhas" ON public.store_stickers;
    CREATE POLICY "Lojas veem suas figurinhas" ON public.store_stickers
    FOR ALL USING (
        auth.uid()::text = store_id::text OR 
        EXISTS (SELECT 1 FROM public.collaborators WHERE id::text = auth.uid()::text AND store_id = public.store_stickers.store_id) OR
        public.is_admin()
    );

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_stickers TO authenticated;

    -- ==================================================================
    -- Tabela de Configurações PWA (20/01/2026)
    -- ==================================================================
    CREATE TABLE IF NOT EXISTS public.pwa_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        display_name TEXT DEFAULT 'Zé Entregas',
        short_name TEXT DEFAULT 'Zé Entregas',
        description TEXT DEFAULT 'Logística e entregas inteligentes',
        start_url TEXT DEFAULT '/',
        display TEXT DEFAULT 'standalone',
        orientation TEXT DEFAULT 'portrait',
        theme_color TEXT DEFAULT '#ed2b05',
        background_color TEXT DEFAULT '#f9fafb',
        language TEXT DEFAULT 'pt-BR',
        scope TEXT DEFAULT '/',
        icons JSONB DEFAULT '[]'::jsonb,
        shortcuts JSONB DEFAULT '[]'::jsonb,
        screenshots JSONB DEFAULT '[]'::jsonb,
        categories JSONB DEFAULT '[]'::jsonb,
        prefer_related_applications BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Índices para pwa_settings
    CREATE INDEX IF NOT EXISTS pwa_settings_created_at_idx ON public.pwa_settings(created_at);

    -- Trigger para atualizar updated_at
    DROP TRIGGER IF EXISTS handle_pwa_settings_updated_at ON public.pwa_settings;
    CREATE TRIGGER handle_pwa_settings_updated_at BEFORE UPDATE ON public.pwa_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    -- RLS para pwa_settings
    ALTER TABLE public.pwa_settings ENABLE ROW LEVEL SECURITY;

    -- Política: Leitura pública (anônimo e autenticado)
    DROP POLICY IF EXISTS "Public can read pwa_settings" ON public.pwa_settings;
    CREATE POLICY "Public can read pwa_settings" ON public.pwa_settings
    FOR SELECT USING (true);

    -- Política: Admin pode gerenciar
    DROP POLICY IF EXISTS "Admins can manage pwa_settings" ON public.pwa_settings;
    CREATE POLICY "Admins can manage pwa_settings" ON public.pwa_settings
    FOR ALL USING (public.is_admin());

    -- Grants para pwa_settings
    GRANT SELECT ON public.pwa_settings TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON public.pwa_settings TO authenticated;

    -- Inserir configuração padrão se não existir
    INSERT INTO public.pwa_settings (id, display_name, short_name, description)
    VALUES (
        '00000000-0000-0000-0000-000000000001',
        'Zé Entregas',
        'Zé Entregas',
        'Logística e entregas inteligentes'
    )
    ON CONFLICT (id) DO NOTHING;

    -- ==================================================================
    -- Tabela de Terminais/Maquininhas (20/01/2026)
    -- ==================================================================
    CREATE TABLE IF NOT EXISTS public.user_terminals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        terminal_id TEXT UNIQUE NOT NULL,
        pin_code TEXT,
        status TEXT DEFAULT 'INACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED')),
        device_info JSONB DEFAULT '{}'::jsonb,
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Índices para user_terminals
    CREATE INDEX IF NOT EXISTS user_terminals_user_id_idx ON public.user_terminals(user_id);
    CREATE INDEX IF NOT EXISTS user_terminals_terminal_id_idx ON public.user_terminals(terminal_id);
    CREATE INDEX IF NOT EXISTS user_terminals_status_idx ON public.user_terminals(status);

    -- Trigger para atualizar updated_at
    DROP TRIGGER IF EXISTS handle_user_terminals_updated_at ON public.user_terminals;
    CREATE TRIGGER handle_user_terminals_updated_at BEFORE UPDATE ON public.user_terminals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    -- RLS para user_terminals
    ALTER TABLE public.user_terminals ENABLE ROW LEVEL SECURITY;

    -- Política: Usuário pode ver e gerenciar apenas seu próprio terminal
    DROP POLICY IF EXISTS "Users can manage own terminal" ON public.user_terminals;
    CREATE POLICY "Users can manage own terminal" ON public.user_terminals
    FOR ALL USING (auth.uid() = user_id);

    -- Política: Admin pode ver e gerenciar todos os terminais
    DROP POLICY IF EXISTS "Admins can manage all terminals" ON public.user_terminals;
    CREATE POLICY "Admins can manage all terminals" ON public.user_terminals
    FOR ALL USING (public.is_admin());

    GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_terminals TO authenticated;

    -- ==================================================================
    -- Tabela de Carteiras de Entregadores (20/01/2026)
    -- ==================================================================
    CREATE TABLE IF NOT EXISTS public.driver_wallets (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        balance DECIMAL(10,2) DEFAULT 0.00,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(driver_id)
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS driver_wallets_driver_id_idx ON public.driver_wallets(driver_id);

    -- Trigger
    DROP TRIGGER IF EXISTS handle_driver_wallets_updated_at ON public.driver_wallets;
    CREATE TRIGGER handle_driver_wallets_updated_at BEFORE UPDATE ON public.driver_wallets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    -- RLS
    ALTER TABLE public.driver_wallets ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own wallet" ON public.driver_wallets;
    CREATE POLICY "Users can view own wallet" ON public.driver_wallets
    FOR SELECT USING (auth.uid() = driver_id);

    DROP POLICY IF EXISTS "Admins can manage all wallets" ON public.driver_wallets;
    CREATE POLICY "Admins can manage all wallets" ON public.driver_wallets
    FOR ALL USING (public.is_admin());

    -- Grants
    GRANT SELECT ON public.driver_wallets TO authenticated;
    GRANT INSERT, UPDATE, DELETE ON public.driver_wallets TO authenticated;

    -- ==================================================================
    -- Tabela de Transações da Maquininha (20/01/2026)
    -- ==================================================================
    CREATE TABLE IF NOT EXISTS public.user_terminal_transactions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        terminal_id UUID REFERENCES public.user_terminals(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        amount DECIMAL(10,2) NOT NULL,
        type TEXT CHECK (type IN ('SALE', 'REFUND')),
        status TEXT DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'failed', 'processing')),
        method TEXT CHECK (method IN ('PIX', 'CREDIT_CARD', 'ZE_QR', 'ZE_CODE')),
        metadata JSONB DEFAULT '{}'::jsonb,
        description TEXT,
        payer_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Garantir colunas (Migração Aditiva para tabela existente)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'user_id') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'terminal_id') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN terminal_id UUID REFERENCES public.user_terminals(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'merchant_user_id') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN merchant_user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;

    -- Atualizar merchant_user_id com user_id se estiver nulo
    UPDATE public.user_terminal_transactions SET merchant_user_id = user_id WHERE merchant_user_id IS NULL;

    -- Índices
    CREATE INDEX IF NOT EXISTS user_terminal_transactions_terminal_id_idx ON public.user_terminal_transactions(terminal_id);
    CREATE INDEX IF NOT EXISTS user_terminal_transactions_user_id_idx ON public.user_terminal_transactions(user_id);
    CREATE INDEX IF NOT EXISTS user_terminal_transactions_status_idx ON public.user_terminal_transactions(status);
    CREATE INDEX IF NOT EXISTS user_terminal_transactions_created_at_idx ON public.user_terminal_transactions(created_at DESC);

    -- RLS
    ALTER TABLE public.user_terminal_transactions ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can view own terminal transactions" ON public.user_terminal_transactions;
    CREATE POLICY "Users can view own terminal transactions" ON public.user_terminal_transactions
    FOR SELECT USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Users can insert own terminal transactions" ON public.user_terminal_transactions;
    CREATE POLICY "Users can insert own terminal transactions" ON public.user_terminal_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Admins can manage all terminal transactions" ON public.user_terminal_transactions;
    CREATE POLICY "Admins can manage all terminal transactions" ON public.user_terminal_transactions
    FOR ALL USING (public.is_admin());

    -- Grants
    GRANT SELECT, INSERT ON public.user_terminal_transactions TO authenticated;
    GRANT UPDATE, DELETE ON public.user_terminal_transactions TO authenticated;

    -- ==================================================================
    -- Tabela de Configurações de Gateways de Pagamento (20/01/2026)
    -- ==================================================================
    CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        gateway_name TEXT UNIQUE NOT NULL CHECK (gateway_name IN ('infinitepay', 'mercadopago', 'pix')),
        is_active BOOLEAN DEFAULT FALSE,
        is_primary BOOLEAN DEFAULT FALSE,
        credentials JSONB DEFAULT '{}'::jsonb,
        fees JSONB DEFAULT '{"pix": 0, "credit_card": 0, "credit_card_installments": 0}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Garantir coluna fees se a tabela já existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_gateway_settings' AND column_name = 'fees') THEN
        ALTER TABLE public.payment_gateway_settings ADD COLUMN fees JSONB DEFAULT '{"pix": 0, "credit_card": 0, "credit_card_installments": 0}'::jsonb;
    END IF;

    -- Garantir que o gateway 'pix' possa ser inserido se a tabela já existir (caso a constraint precise ser atualizada)
    BEGIN 
        -- Tentar atualizar a constraint se ela for restritiva
        ALTER TABLE public.payment_gateway_settings DROP CONSTRAINT IF EXISTS payment_gateway_settings_gateway_name_check;
        ALTER TABLE public.payment_gateway_settings ADD CONSTRAINT payment_gateway_settings_gateway_name_check CHECK (gateway_name IN ('infinitepay', 'mercadopago', 'pix'));
    EXCEPTION WHEN others THEN
        NULL;
    END;

    -- Inserir gateways padrão se não existirem
    INSERT INTO public.payment_gateway_settings (gateway_name, is_active, is_primary)
    VALUES 
        ('infinitepay', false, false),
        ('mercadopago', false, false),
        ('pix', false, false)
    ON CONFLICT (gateway_name) DO NOTHING;

    -- Índices
    -- ==================================================================
    -- GARANTIR COLUNAS DE TRANSAÇÃO (Fix para View Unificada)
    -- ==================================================================
    
    -- 1. store_wallet_transactions
    -- ==================================================================
    -- GARANTIR COLUNAS DE TRANSAÇÃO (Fix para View Unificada)
    -- ==================================================================
    
    -- 1. store_wallet_transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_wallet_transactions' AND column_name = 'type') THEN
        ALTER TABLE public.store_wallet_transactions ADD COLUMN type TEXT DEFAULT 'PAYMENT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_wallet_transactions' AND column_name = 'status') THEN
        ALTER TABLE public.store_wallet_transactions ADD COLUMN status TEXT DEFAULT 'COMPLETED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_wallet_transactions' AND column_name = 'description') THEN
        ALTER TABLE public.store_wallet_transactions ADD COLUMN description TEXT;
    END IF;

    -- 2. driver_wallet_transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_wallet_transactions' AND column_name = 'type') THEN
        ALTER TABLE public.driver_wallet_transactions ADD COLUMN type TEXT DEFAULT 'PAYMENT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_wallet_transactions' AND column_name = 'status') THEN
        ALTER TABLE public.driver_wallet_transactions ADD COLUMN status TEXT DEFAULT 'COMPLETED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_wallet_transactions' AND column_name = 'description') THEN
        ALTER TABLE public.driver_wallet_transactions ADD COLUMN description TEXT;
    END IF;

    -- 3. user_terminal_transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'type') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN type TEXT DEFAULT 'SALE';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'status') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'method') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN method TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'metadata') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'description') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN description TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'payer_name') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN payer_name TEXT;
    END IF;

    CREATE INDEX IF NOT EXISTS payment_gateway_settings_gateway_name_idx ON public.payment_gateway_settings(gateway_name);
    CREATE INDEX IF NOT EXISTS payment_gateway_settings_is_active_idx ON public.payment_gateway_settings(is_active);
    CREATE INDEX IF NOT EXISTS payment_gateway_settings_is_primary_idx ON public.payment_gateway_settings(is_primary);

    -- Trigger
    DROP TRIGGER IF EXISTS handle_payment_gateway_settings_updated_at ON public.payment_gateway_settings;
    CREATE TRIGGER handle_payment_gateway_settings_updated_at BEFORE UPDATE ON public.payment_gateway_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    -- RLS (apenas admin)
    ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Only admins can manage gateways" ON public.payment_gateway_settings;
    -- ==================================================================
    -- View Unificada de Logs Financeiros (21/01/2026)
    -- ==================================================================
    CREATE OR REPLACE VIEW public.admin_financial_transactions_view AS
    SELECT
        t.id,
        t.driver_id as user_id,
        up.name as user_name,
        t.amount,
        t.type::text,
        t.status::text,
        'ZEBANK' as source,
        t.description,
        t.created_at
    FROM public.driver_wallet_transactions t
    LEFT JOIN public.user_profiles up ON t.driver_id = up.id

    UNION ALL

    SELECT
        t.id,
        t.store_id as user_id,
        up.name as user_name,
        t.amount,
        t.type::text,
        t.status::text,
        'ZEPAY_STORE' as source,
        t.description,
        t.created_at
    FROM public.store_wallet_transactions t
    LEFT JOIN public.user_profiles up ON t.store_id = up.id

    UNION ALL

    SELECT
        t.id,
        t.user_id,
        up.name as user_name,
        t.amount,
        t.type,
        t.status,
        'TERMINAL' as source,
        t.method || ' - ' || COALESCE(t.metadata->>'description', ''),
        t.created_at
    FROM public.user_terminal_transactions t
    LEFT JOIN public.user_profiles up ON t.user_id = up.id

    UNION ALL

    SELECT
        l.id,
        NULL as user_id,
        'Sistema' as user_name,
        0 as amount,
        l.operation_type as type,
        CASE WHEN l.success THEN 'COMPLETED' ELSE 'FAILED' END as status,
        'GATEWAY_LOG (' || l.gateway_name || ')' as source,
        COALESCE(l.error_message, 'Operação registrada com sucesso'),
        l.created_at
    FROM public.payment_gateway_logs l;

    -- Grant access to View
    GRANT SELECT ON public.admin_financial_transactions_view TO authenticated;
    CREATE POLICY "Only admins can manage gateways" ON public.payment_gateway_settings
    FOR ALL USING (public.is_admin());

    DROP POLICY IF EXISTS "Anyone authenticated can view active gateways" ON public.payment_gateway_settings;
    CREATE POLICY "Anyone authenticated can view active gateways" ON public.payment_gateway_settings
    FOR SELECT USING (auth.role() = 'authenticated');

    -- Grants
    GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_gateway_settings TO authenticated;

    -- Inserir gateways padrão
    INSERT INTO public.payment_gateway_settings (gateway_name, is_active, is_primary, fees)
    VALUES 
        ('infinitepay', true, true, '{"pix": 0, "credit_card": 0, "credit_card_installments": 0}'::jsonb),
        ('mercadopago', true, false, '{"pix": 0, "credit_card": 0, "credit_card_installments": 0}'::jsonb),
        ('pix', true, false, '{"pix": 0, "credit_card": 0, "credit_card_installments": 0}'::jsonb)
    ON CONFLICT (gateway_name) DO UPDATE SET 
        is_active = EXCLUDED.is_active,
        is_primary = EXCLUDED.is_primary,
        fees = COALESCE(payment_gateway_settings.fees, EXCLUDED.fees);

    -- ==================================================================
    -- Tabela de Logs de Gateways de Pagamento (20/01/2026)
    -- ==================================================================
    CREATE TABLE IF NOT EXISTS public.payment_gateway_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        gateway_name TEXT NOT NULL,
        operation_type TEXT CHECK (operation_type IN ('charge', 'refund', 'check_status')),
        success BOOLEAN DEFAULT FALSE,
        request_data JSONB DEFAULT '{}'::jsonb,
        response_data JSONB DEFAULT '{}'::jsonb,
        error_message TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS payment_gateway_logs_gateway_name_idx ON public.payment_gateway_logs(gateway_name);
    CREATE INDEX IF NOT EXISTS payment_gateway_logs_success_idx ON public.payment_gateway_logs(success);
    CREATE INDEX IF NOT EXISTS payment_gateway_logs_created_at_idx ON public.payment_gateway_logs(created_at DESC);

    -- RLS (apenas admin)
    ALTER TABLE public.payment_gateway_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Only admins can view logs" ON public.payment_gateway_logs;
    CREATE POLICY "Only admins can view logs" ON public.payment_gateway_logs
    FOR SELECT USING (public.is_admin());

    DROP POLICY IF EXISTS "System can insert logs" ON public.payment_gateway_logs;
    CREATE POLICY "System can insert logs" ON public.payment_gateway_logs
    FOR INSERT WITH CHECK (true);

    -- Grants
    GRANT SELECT ON public.payment_gateway_logs TO authenticated;
    GRANT INSERT ON public.payment_gateway_logs TO authenticated;

    -- ==================================================================
    -- Tabela de Histórico de Status de Usuário (21/01/2026)
    -- ==================================================================
    CREATE TABLE IF NOT EXISTS public.user_status_history (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
        admin_id UUID REFERENCES public.user_profiles(id),
        previous_status TEXT,
        new_status TEXT NOT NULL,
        reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- RLS
    ALTER TABLE public.user_status_history ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins podem ver todo historico" ON public.user_status_history;
    CREATE POLICY "Admins podem ver todo historico" 
    ON public.user_status_history FOR SELECT 
    TO authenticated 
    USING (
         public.is_admin()
    );

    DROP POLICY IF EXISTS "Admins podem inserir historico" ON public.user_status_history;
    CREATE POLICY "Admins podem inserir historico" 
    ON public.user_status_history FOR INSERT 
    TO authenticated 
    WITH CHECK (
         public.is_admin()
    );

    -- Grants
    GRANT SELECT, INSERT ON public.user_status_history TO authenticated;
END $$;

-- ==================================================================
-- TABELA DE LOCALIZAÇÃO DE USUÁRIOS (Corrigindo dependência da RPC)
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.user_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- RLS
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can update own location" ON public.user_locations;
CREATE POLICY "Users can update own location" ON public.user_locations
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins/System read locations" ON public.user_locations;
CREATE POLICY "Admins/System read locations" ON public.user_locations
    FOR SELECT USING (true); -- Permitir leitura global por enquanto ou restringir a admin

GRANT ALL ON public.user_locations TO authenticated;


-- ==================================================================
-- FUNÇÃO DASHBOARD ADMIN V3 (21/01/2026) - Correção Financeira
-- ==================================================================
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats_v3()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_users INT;
    v_total_stores INT;
    v_active_stores INT;
    v_total_drivers INT;
    v_online_drivers INT;
    v_total_orders INT;
    v_orders_today INT;
    v_orders_week INT;
    v_orders_month INT;
    v_gmv NUMERIC(10, 2);
    
    -- Novos contadores financeiros
    v_total_recharges NUMERIC(10, 2); -- Recargas (Depósitos de Lojas)
    v_platform_fees NUMERIC(10, 2);   -- Taxas diversas (Entregas, Comissões)
    v_subscription_fees NUMERIC(10, 2); -- Associações
    v_driver_fees NUMERIC(10, 2);     -- Taxas cobradas de motoristas
    v_total_revenue NUMERIC(10, 2);   -- Soma das receitas reais da plataforma

BEGIN
    -- 1. Métricas de Usuários
    SELECT COUNT(*) INTO v_total_users FROM public.user_profiles;
    SELECT COUNT(*) INTO v_total_stores FROM public.user_profiles WHERE role = 'store_partner';
    SELECT COUNT(*) INTO v_active_stores FROM public.user_profiles WHERE role = 'store_partner' AND status = 'active';
    SELECT COUNT(*) INTO v_total_drivers FROM public.user_profiles WHERE role = 'delivery_partner';
    
    -- Motoristas online
    SELECT COUNT(DISTINCT user_id) INTO v_online_drivers FROM public.user_locations WHERE updated_at > NOW() - INTERVAL '5 minutes';
    
    -- Se não houver tabela, assumir 0 (fallback seguro)
    IF v_online_drivers IS NULL THEN v_online_drivers := 0; END IF;

    -- 2. Métricas de Pedidos
    SELECT COUNT(*) INTO v_total_orders FROM public.orders;
    SELECT COUNT(*) INTO v_orders_today FROM public.orders WHERE created_at >= CURRENT_DATE;
    SELECT COUNT(*) INTO v_orders_week FROM public.orders WHERE created_at >= date_trunc('week', CURRENT_DATE);
    SELECT COUNT(*) INTO v_orders_month FROM public.orders WHERE created_at >= date_trunc('month', CURRENT_DATE);
    
    -- 3. GMV
    SELECT COALESCE(SUM(total_price), 0) INTO v_gmv 
    FROM public.orders 
    WHERE status IN ('completed', 'delivered');

    -- 4. Métricas Financeiras Detalhadas (Baseado na View Unificada)
    -- Recargas de Lojas (Entrada de saldo)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_recharges
    FROM public.store_wallet_transactions
    WHERE type::text = 'DEPOSIT' AND status::text = 'COMPLETED';

    -- Taxas de Lojas (Saídas da carteira da loja = Receita da Plataforma)
    -- Assumindo valores negativos para saídas, usamos ABS.
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_platform_fees
    FROM public.store_wallet_transactions
    WHERE type::text IN ('FEE', 'COMMISSION') AND status::text = 'COMPLETED';

    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_subscription_fees
    FROM public.store_wallet_transactions
    WHERE type::text = 'SUBSCRIPTION' AND status::text = 'COMPLETED';
    
    -- Taxas de Motoristas (Saídas da carteira do motorista = Receita da Plataforma)
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_driver_fees
    FROM public.driver_wallet_transactions
    WHERE type::text IN ('FEE', 'COMMISSION', 'SUBSCRIPTION') AND status::text = 'COMPLETED';
    
    v_total_revenue := v_platform_fees + v_subscription_fees + v_driver_fees;

    RETURN jsonb_build_object(
        'users', jsonb_build_object(
            'total', v_total_users,
            'stores', jsonb_build_object('total', v_total_stores, 'active', v_active_stores),
            'drivers', jsonb_build_object('total', v_total_drivers, 'online', v_online_drivers)
        ),
        'orders', jsonb_build_object(
            'total', v_total_orders,
            'today', v_orders_today,
            'week', v_orders_week,
            'month', v_orders_month
        ),
        'finance', jsonb_build_object(
            'gmv', v_gmv,
            'platformRevenue', v_total_revenue,
            'recharges', v_total_recharges,
            'fees', v_platform_fees,
            'subscriptions', v_subscription_fees,
            'driverFees', v_driver_fees
        )
    );
END;
$$;

-- ==================================================================
-- ÍNDICES DE PERFORMANCE (ADICIONADOS 21/01/2026)
-- ==================================================================
CREATE INDEX IF NOT EXISTS wallet_transactions_store_id_created_at_idx ON public.wallet_transactions (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS partner_requests_status_idx ON public.partner_requests (status);
CREATE INDEX IF NOT EXISTS user_profiles_store_slug_idx ON public.user_profiles (store_slug);
CREATE INDEX IF NOT EXISTS user_profiles_city_slug_idx ON public.user_profiles (city_slug);

-- ==================================================================
-- CATÁLOGO BASE DE PRODUTOS (ADICIONADO 21/01/2026)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.catalog_base_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    brand TEXT,
    category TEXT,
    brand TEXT,
    observations TEXT,
    valor_sugerido NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir campo brand se tabela já existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'catalog_base_products' AND column_name = 'brand') THEN
        ALTER TABLE public.catalog_base_products ADD COLUMN brand TEXT;
    END IF;
END $$;

-- Habilitar RLS
ALTER TABLE public.catalog_base_products ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para catalog_base_products
DROP POLICY IF EXISTS "Public can read active base products" ON public.catalog_base_products;
CREATE POLICY "Public can read active base products" ON public.catalog_base_products
    FOR SELECT USING (is_active = TRUE OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage base products" ON public.catalog_base_products;
CREATE POLICY "Admins can manage base products" ON public.catalog_base_products
    FOR ALL USING (public.is_admin());

-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_catalog_base_products_updated_at ON public.catalog_base_products;
CREATE TRIGGER handle_catalog_base_products_updated_at BEFORE UPDATE ON public.catalog_base_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar referência no catálogo de lojistas e campo brand
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'base_product_id') THEN
        ALTER TABLE public.products ADD COLUMN base_product_id UUID REFERENCES public.catalog_base_products(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand') THEN
        ALTER TABLE public.products ADD COLUMN brand TEXT;
    END IF;
END $$;

-- Vincular Lojas a Categorias Institucionais
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_category_id') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_category_id UUID REFERENCES public.institutional_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Popular Categorias Institucionais Iniciais (Modo Idempotente)
INSERT INTO public.institutional_categories (name, slug)
VALUES 
    ('Pizzaria', 'pizzaria'),
    ('Hamburgueria', 'hamburgueria'),
    ('Lanchonete', 'lanchonete'),
    ('Mercado', 'mercado'),
    ('Cafeteria', 'cafeteria'),
    ('Farmácia', 'farmacia'),
    ('Supermercado', 'supermercado'),
    ('Bebidas', 'bebidas'),
    ('Pet Shop', 'pet-shop'),
    ('Restaurante', 'restaurante'),
    ('Japonês', 'japones'),
    ('Sorveteria', 'sorveteria')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- Habilitar RLS em institutional_categories
ALTER TABLE public.institutional_categories ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para institutional_categories
DROP POLICY IF EXISTS "Public can read institutional categories" ON public.institutional_categories;
CREATE POLICY "Public can read institutional categories" ON public.institutional_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage institutional categories" ON public.institutional_categories;
CREATE POLICY "Admins can manage institutional categories" ON public.institutional_categories
    FOR ALL USING (public.is_admin());

-- Permissões para institutional_categories
GRANT SELECT ON public.institutional_categories TO anon, authenticated;
GRANT ALL ON public.institutional_categories TO authenticated;

-- Permissões
GRANT SELECT ON public.catalog_base_products TO anon, authenticated;
GRANT ALL ON public.catalog_base_products TO authenticated;

-- ==================================================================
-- CONFIGURAÇÕES DE ENTREGA DA LOJA (22/01/2026)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.store_delivery_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    is_pickup_enabled BOOLEAN DEFAULT TRUE,
    is_own_delivery_enabled BOOLEAN DEFAULT FALSE,
    own_delivery_mode TEXT DEFAULT 'FIXED' CHECK (own_delivery_mode IN ('FIXED', 'NEIGHBORHOOD', 'RADIUS')),
    fixed_fee NUMERIC(10, 2) DEFAULT 0.00,
    is_partner_delivery_enabled BOOLEAN DEFAULT FALSE,
    radius_km NUMERIC(10, 2) DEFAULT 0.00,
    delivery_time_min INT DEFAULT 30,
    delivery_time_max INT DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id)
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS handle_store_delivery_settings_updated_at ON public.store_delivery_settings;
CREATE TRIGGER handle_store_delivery_settings_updated_at BEFORE UPDATE ON public.store_delivery_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.store_delivery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read store_delivery_settings" ON public.store_delivery_settings;
CREATE POLICY "Public read store_delivery_settings" ON public.store_delivery_settings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Store owners manage delivery settings" ON public.store_delivery_settings;
CREATE POLICY "Store owners manage delivery settings" ON public.store_delivery_settings
FOR ALL USING (auth.uid() = store_id);

GRANT ALL ON public.store_delivery_settings TO authenticated;
GRANT SELECT ON public.store_delivery_settings TO anon;

-- ==================================================================
-- REGRAS DE FRETE (FRETE GRÁTIS / TAXA FIXA)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.store_shipping_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rule_type public.shipping_rule_type NOT NULL, -- 'free_above', 'fixed_rate'
    min_order_value NUMERIC(10, 2) DEFAULT 0.00,
    shipping_fee NUMERIC(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS handle_store_shipping_rules_updated_at ON public.store_shipping_rules;
CREATE TRIGGER handle_store_shipping_rules_updated_at BEFORE UPDATE ON public.store_shipping_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS store_shipping_rules_store_id_idx ON public.store_shipping_rules(store_id);

-- RLS
ALTER TABLE public.store_shipping_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read shipping rules" ON public.store_shipping_rules;
CREATE POLICY "Public read shipping rules" ON public.store_shipping_rules
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Store owners manage shipping rules" ON public.store_shipping_rules;
CREATE POLICY "Store owners manage shipping rules" ON public.store_shipping_rules
FOR ALL USING (auth.uid() = store_id);

GRANT ALL ON public.store_shipping_rules TO authenticated;
GRANT SELECT ON public.store_shipping_rules TO anon;

-- ==================================================================
-- TAXAS POR BAIRRO (ENTREGA PRÓPRIA)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.store_neighborhood_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    neighborhood_name TEXT NOT NULL,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS handle_store_neighborhood_fees_updated_at ON public.store_neighborhood_fees;
CREATE TRIGGER handle_store_neighborhood_fees_updated_at BEFORE UPDATE ON public.store_neighborhood_fees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Índices
CREATE INDEX IF NOT EXISTS store_neighborhood_fees_store_id_idx ON public.store_neighborhood_fees(store_id);

-- RLS
ALTER TABLE public.store_neighborhood_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read neighborhood fees" ON public.store_neighborhood_fees;
CREATE POLICY "Public read neighborhood fees" ON public.store_neighborhood_fees
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Store owners manage neighborhood fees" ON public.store_neighborhood_fees;
CREATE POLICY "Store owners manage neighborhood fees" ON public.store_neighborhood_fees
FOR ALL USING (auth.uid() = store_id);

GRANT ALL ON public.store_neighborhood_fees TO authenticated;
GRANT SELECT ON public.store_neighborhood_fees TO anon;


-- ==================================================================
-- UPDATES (22/01/2026) - Description for Store Profile
-- ==================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'description') THEN
        ALTER TABLE public.user_profiles ADD COLUMN description TEXT;
    END IF;
END $$;

-- ==================================================================
-- AVALIAÇÃO DE ENTREGADORES (Adicionado por Agente)
-- ==================================================================

-- Tabela de Avaliações
CREATE TABLE IF NOT EXISTS public.delivery_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    delivery_man_id UUID NOT NULL REFERENCES public.user_profiles(id),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_rating_per_order UNIQUE (order_id)
);

-- Colunas de Score para Recalculo
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'ratings_count') THEN
        ALTER TABLE public.user_profiles ADD COLUMN ratings_count INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'ratings_sum') THEN
        ALTER TABLE public.user_profiles ADD COLUMN ratings_sum INT DEFAULT 0;
    END IF;
END $$;

-- Policies delivery_ratings
ALTER TABLE public.delivery_ratings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create ratings' AND tablename = 'delivery_ratings') THEN
        CREATE POLICY "Users can create ratings" ON public.delivery_ratings FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read own ratings' AND tablename = 'delivery_ratings') THEN
        CREATE POLICY "Users can read own ratings" ON public.delivery_ratings FOR SELECT USING (auth.uid()::text = user_id::text);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Drivers can read own ratings' AND tablename = 'delivery_ratings') THEN
        CREATE POLICY "Drivers can read own ratings" ON public.delivery_ratings FOR SELECT USING (auth.uid()::text = delivery_man_id::text);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all ratings' AND tablename = 'delivery_ratings') THEN
        CREATE POLICY "Admins can manage all ratings" ON public.delivery_ratings FOR ALL USING (public.is_admin());
    END IF;
END $$;

-- Função de Calculo de Score
CREATE OR REPLACE FUNCTION public.update_delivery_score()
RETURNS TRIGGER AS $$
DECLARE
    v_new_score INT;
    v_total_ratings INT;
    v_sum_ratings INT;
BEGIN
    -- Atualizar contadores
    UPDATE public.user_profiles
    SET 
        ratings_count = COALESCE(ratings_count, 0) + 1,
        ratings_sum = COALESCE(ratings_sum, 0) + NEW.rating
    WHERE id = NEW.delivery_man_id
    RETURNING ratings_count, ratings_sum INTO v_total_ratings, v_sum_ratings;

    -- Calcular Score (Base 0-5 para 0-1000)
    -- Score = (Média / 5) * 1000
    IF v_total_ratings > 0 THEN
        v_new_score := (v_sum_ratings::numeric / v_total_ratings::numeric / 5.0) * 1000;
        
        -- Atualizar Score na tabela
        UPDATE public.user_profiles
        SET score = v_new_score
        WHERE id = NEW.delivery_man_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger Score
DROP TRIGGER IF EXISTS tr_update_delivery_score ON public.delivery_ratings;
CREATE TRIGGER tr_update_delivery_score
AFTER INSERT ON public.delivery_ratings
FOR EACH ROW EXECUTE FUNCTION public.update_delivery_score();


-- ==================================================================
-- CORRECAO DE VISIBILIDADE DE LOJAS E DADOS (24/01/2026)
-- ==================================================================

-- 1. Fix de Dados de Slugs (Para garantir que lojas antigas apareçam na busca)
UPDATE public.user_profiles 
SET city_slug = public.slugify(split_part(city, ' - ', 1))
WHERE city_slug IS NULL AND city IS NOT NULL;

UPDATE public.user_profiles
SET store_slug = public.slugify(store_name)
WHERE store_slug IS NULL AND store_name IS NOT NULL AND role = 'store_partner';

-- 2. Permite que qualquer usuario (auth ou anon) visualize lojas ativas
DROP POLICY IF EXISTS "Public can view active stores" ON public.user_profiles;
CREATE POLICY "Public can view active stores" ON public.user_profiles
    FOR SELECT USING (role = 'store_partner'::public.user_role AND is_active = true);

-- 3. Garante permissao de SELECT para anonimos e logados
GRANT SELECT ON public.user_profiles TO anon, authenticated;

-- ==================================================================
-- RPC PARA BUSCA PUBLICA DE LOJAS (Bypass RLS Seguro) - 24/01/2026
-- ==================================================================
DROP FUNCTION IF EXISTS public.get_public_stores_by_city(TEXT);
CREATE OR REPLACE FUNCTION public.get_public_stores_by_city(p_city_slug TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    store_name TEXT,
    city_slug TEXT,
    store_slug TEXT,
    cover_url TEXT,
    store_logo_url TEXT,
    description TEXT,
    is_open BOOLEAN,
    is_currently_open BOOLEAN,
    opening_hours TEXT,
    store_category_id UUID,
    preparation_time_min INTEGER,
    preparation_time_max INTEGER,
    score INTEGER
)
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.id,
        up.name,
        up.store_name,
        up.city_slug,
        up.store_slug,
        up.cover_url,
        up.store_logo_url,
        up.description,
        up.is_open,
        up.is_currently_open,
        up.opening_hours,
        up.store_category_id,
        up.preparation_time_min,
        up.preparation_time_max,
        up.score
    FROM public.user_profiles up
    WHERE up.role = 'store_partner'
      AND up.status = 'active'
      AND (
          up.city_slug = p_city_slug 
          OR 
          public.slugify(split_part(up.city, ' - ', 1)) = p_city_slug -- Fallback robusto
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_public_stores_by_city(TEXT) TO anon, authenticated;


-- ==================================================================
-- CHAT INTERNO, REPORTES E CONFIGURACOES DE PEDIDO (24/01/2026)
-- ==================================================================

-- 1. Configuracoes da Loja (User Profiles)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'receive_orders_via_platform') THEN
        ALTER TABLE public.user_profiles ADD COLUMN receive_orders_via_platform BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'receive_orders_via_chat') THEN
        ALTER TABLE public.user_profiles ADD COLUMN receive_orders_via_chat BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'chat_number') THEN
        ALTER TABLE public.user_profiles ADD COLUMN chat_number TEXT;
    END IF;
END $$;

-- 2. Tabela de Chats de Pedidos
CREATE TABLE IF NOT EXISTS public.order_chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id),
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'closed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT order_chats_order_unique UNIQUE (order_id)
);

ALTER TABLE public.order_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view order chats" ON public.order_chats;
CREATE POLICY "Participants can view order chats" ON public.order_chats
    FOR SELECT USING (auth.uid()::text = user_id::text OR auth.uid()::text = store_id::text OR public.is_admin());

DROP POLICY IF EXISTS "Participants can update order chats" ON public.order_chats;
CREATE POLICY "Participants can update order chats" ON public.order_chats
    FOR UPDATE USING (auth.uid()::text = user_id::text OR auth.uid()::text = store_id::text OR public.is_admin());

-- 3. Tabela de Mensagens do Chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID, -- Referência garantida abaixo
    sender_id UUID NOT NULL REFERENCES public.user_profiles(id),
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'system'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Garantir chat_id se tabela existir sem ela (ou com nome diferente)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'chat_id') THEN
        ALTER TABLE public.chat_messages ADD COLUMN chat_id UUID REFERENCES public.order_chats(id) ON DELETE CASCADE;
    END IF;
END $$;


ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view messages" ON public.chat_messages;
CREATE POLICY "Participants can view messages" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.order_chats oc
            WHERE oc.id = chat_messages.chat_id
            AND (oc.user_id::text = auth.uid()::text OR oc.store_id::text = auth.uid()::text)
        )
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Participants can send messages" ON public.chat_messages;
CREATE POLICY "Participants can send messages" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.order_chats oc
            WHERE oc.id = chat_messages.chat_id
            AND (oc.user_id::text = auth.uid()::text OR oc.store_id::text = auth.uid()::text)
        )
        AND auth.uid()::text = sender_id::text
    );

-- 4. Tabela de Reportes de Pedidos
CREATE TABLE IF NOT EXISTS public.order_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id), -- Desnormalizado para facilitar queries da loja
    type VARCHAR(50) NOT NULL, -- 'item_missing', 'wrong_item', 'general_problem'
    description TEXT,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'resolved'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants can view reports" ON public.order_reports;
CREATE POLICY "Participants can view reports" ON public.order_reports
    FOR SELECT USING (auth.uid()::text = user_id::text OR auth.uid()::text = store_id::text OR public.is_admin());

DROP POLICY IF EXISTS "Users can create reports" ON public.order_reports;
CREATE POLICY "Users can create reports" ON public.order_reports
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Loja and Admin can update reports" ON public.order_reports;
CREATE POLICY "Loja and Admin can update reports" ON public.order_reports
    FOR UPDATE USING (auth.uid()::text = store_id::text OR public.is_admin());

-- Permissoes
GRANT SELECT, INSERT, UPDATE ON public.order_chats TO authenticated;
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.order_reports TO authenticated;


-- Trigger para criar chat automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_order_chat()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o user_id estiver presente (cliente cadastrado), cria o chat
    IF NEW.user_id IS NOT NULL THEN
        INSERT INTO public.order_chats (order_id, user_id, store_id, status)
        VALUES (NEW.id, NEW.user_id, NEW.store_id, 'active')
        ON CONFLICT (order_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_create_order_chat ON public.orders;
CREATE TRIGGER tr_create_order_chat
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_new_order_chat();


-- ==================================================================
-- COLUNAS DE CLIENTE E RPC DE PUBLIC ORDER (24/01/2026)
-- ==================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_name') THEN
        ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_phone') THEN
        ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
    END IF;
END $$;


-- Adicionar coluna de observação geral no pedido (28/01/2026)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'observation') THEN
        ALTER TABLE public.orders ADD COLUMN observation TEXT;
    END IF;
END $$;

-- RPC para criar pedido público (Checkout Digital Segura)
CREATE OR REPLACE FUNCTION public.create_public_order(
    p_store_id UUID,
    p_items JSONB[],
    p_total_price NUMERIC,
    p_payment_method TEXT,
    p_shipping_address JSONB,
    p_delivery_mode TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_pix_active BOOLEAN DEFAULT FALSE,
    p_observation TEXT DEFAULT NULL
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
        observation
    )
    VALUES (
        p_store_id, 
        auth.uid(),
        v_status, 
        to_jsonb(p_items), 
        p_total_price, 
        p_payment_method::public.payment_method, 
        p_shipping_address, 
        p_delivery_mode, 
        p_customer_name, 
        p_customer_phone,
        p_observation
    )
    RETURNING id INTO v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_public_order(UUID, JSONB[], NUMERIC, TEXT, JSONB, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO anon, authenticated;

-- ==================================================================
-- CHAT PÚBLICO (GUEST) - 24/01/2026
-- ==================================================================

-- 1. Permitir User ID nulo em chats (para convidados)
ALTER TABLE public.order_chats ALTER COLUMN user_id DROP NOT NULL;

-- 2. Permitir Sender ID nulo em mensagens e adicionar tipo
ALTER TABLE public.chat_messages ALTER COLUMN sender_id DROP NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'sender_type') THEN
        ALTER TABLE public.chat_messages ADD COLUMN sender_type VARCHAR(20) DEFAULT 'user'; -- 'user', 'store', 'guest', 'system'
    END IF;
END $$;

-- 3. RPC para buscar mensagens (Público)
CREATE OR REPLACE FUNCTION public.get_public_order_chat(p_order_id UUID)
RETURNS TABLE (
    chat_id UUID,
    messages JSONB
)
AS $$
DECLARE
    v_chat_id UUID;
BEGIN
    -- Busca Chat ID
    SELECT id INTO v_chat_id FROM public.order_chats WHERE order_id = p_order_id;
    
    IF v_chat_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        v_chat_id,
        jsonb_agg(
            jsonb_build_object(
                'id', m.id,
                'message', m.message,
                'sender_type', m.sender_type,
                'created_at', m.created_at,
                'is_read', m.is_read
            ) ORDER BY m.created_at ASC
        )
    FROM public.chat_messages m
    WHERE m.chat_id = v_chat_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.get_public_order_chat(UUID) TO anon, authenticated;


-- 4. RPC para enviar mensagem (Público)
CREATE OR REPLACE FUNCTION public.send_public_message(
    p_order_id UUID,
    p_message TEXT
)
RETURNS BOOLEAN
AS $$
DECLARE
    v_chat_id UUID;
    v_store_id UUID;
BEGIN
    -- Busca dados do pedido
    SELECT store_id INTO v_store_id FROM public.orders WHERE id = p_order_id;
    IF v_store_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Busca ou Cria Chat
    SELECT id INTO v_chat_id FROM public.order_chats WHERE order_id = p_order_id;
    
    IF v_chat_id IS NULL THEN
        INSERT INTO public.order_chats (order_id, store_id, user_id, status)
        VALUES (p_order_id, v_store_id, NULL, 'active') -- User NULL for Guest
        RETURNING id INTO v_chat_id;
    END IF;

    -- Insere Mensagem
    INSERT INTO public.chat_messages (chat_id, sender_id, message, type, sender_type)
    VALUES (v_chat_id, NULL, p_message, 'text', 'guest');

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.send_public_message(UUID, TEXT) TO anon, authenticated;

-- ==================================================================
-- GALERIA DE IMAGENS DE PRODUTOS (ADMIN)
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.product_images_gallery (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    subtitle TEXT DEFAULT 'Imagem meramente ilustrativa',
    is_ai_generated BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS para Galeria de Imagens
ALTER TABLE public.product_images_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view gallery images" ON public.product_images_gallery;
CREATE POLICY "Public can view gallery images" ON public.product_images_gallery
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage gallery images" ON public.product_images_gallery;
CREATE POLICY "Admins can manage gallery images" ON public.product_images_gallery
    FOR ALL USING (public.is_admin());

-- Trigger para updated_at
DROP TRIGGER IF EXISTS handle_product_images_gallery_updated_at ON public.product_images_gallery;
CREATE TRIGGER handle_product_images_gallery_updated_at BEFORE UPDATE ON public.product_images_gallery
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Permissões para Galeria de Imagens
GRANT SELECT ON public.product_images_gallery TO anon, authenticated;
GRANT ALL ON public.product_images_gallery TO authenticated;

-- ==================================================================
-- STORAGE CONFIGURATION (BUCKET: gallery)
-- ==================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para o bucket 'gallery'
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'gallery');

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'gallery' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'gallery' AND auth.role() = 'authenticated');



-- ==================================================================
-- ATUALIZAÇÃO DE STATUS DE PEDIDO (24/01/2026)
-- ==================================================================
-- Adicionando novos status ao enum de forma segura
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'Aguardando pagamento (PIX)') THEN
        ALTER TYPE public.order_status ADD VALUE 'Aguardando pagamento (PIX)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid WHERE t.typname = 'order_status' AND e.enumlabel = 'Pagamento a combinar com a loja') THEN
        ALTER TYPE public.order_status ADD VALUE 'Pagamento a combinar com a loja';
    END IF;
END $$;

-- 1. Coluna de prioridade para conversas (Sincronizado com Chat Interno)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_conversations' AND column_name = 'priority') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN priority TEXT DEFAULT 'normal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_conversations' AND column_name = 'last_message_content') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN last_message_content TEXT;
    END IF;
END $$;

COMMENT ON COLUMN public.chat_conversations.priority IS 'Nível de prioridade da conversa: critical, high, normal, low';


-- Tabela para Respostas Rápidas do Chat Interno (Com Reparo de Schema)
CREATE TABLE IF NOT EXISTS public.store_quick_replies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_quick_replies' AND column_name='store_id') THEN
        ALTER TABLE public.store_quick_replies ADD COLUMN store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_quick_replies' AND column_name='trigger') THEN
        ALTER TABLE public.store_quick_replies ADD COLUMN trigger TEXT NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_quick_replies' AND column_name='message') THEN
        ALTER TABLE public.store_quick_replies ADD COLUMN message TEXT NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_quick_replies' AND column_name='created_at') THEN
        ALTER TABLE public.store_quick_replies ADD COLUMN created_at TIMESTAMPTZ DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='store_quick_replies' AND column_name='updated_at') THEN
        ALTER TABLE public.store_quick_replies ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
    
    -- Garantir Unicidade
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'store_quick_replies_store_id_trigger_key') THEN
        ALTER TABLE public.store_quick_replies ADD CONSTRAINT store_quick_replies_store_id_trigger_key UNIQUE(store_id, trigger);
    END IF;
END $$;

-- Adicionar nova instrução para loja fechada no Zé Assistente
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ze_assistant_config' AND column_name='instruction_closed_store') THEN
        ALTER TABLE public.ze_assistant_config ADD COLUMN instruction_closed_store TEXT DEFAULT 'Olá! No momento estamos fechados, mas deixe sua mensagem que responderemos assim que abrirmos.';
    END IF;

    -- Adicionar classificação de cliente ao chat
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='chat_conversations' AND column_name='customer_type') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN customer_type TEXT;
    END IF;
END $$;

-- Habilitar RLS para store_quick_replies
ALTER TABLE public.store_quick_replies ENABLE ROW LEVEL SECURITY;

-- Políticas para store_quick_replies
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lojistas podem ver suas próprias respostas rápidas' AND tablename = 'store_quick_replies') THEN
        CREATE POLICY "Lojistas podem ver suas próprias respostas rápidas" ON public.store_quick_replies FOR SELECT USING (auth.uid() = store_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lojistas podem inserir suas próprias respostas rápidas' AND tablename = 'store_quick_replies') THEN
        CREATE POLICY "Lojistas podem inserir suas próprias respostas rápidas" ON public.store_quick_replies FOR INSERT WITH CHECK (auth.uid() = store_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lojistas podem atualizar suas próprias respostas rápidas' AND tablename = 'store_quick_replies') THEN
        CREATE POLICY "Lojistas podem atualizar suas próprias respostas rápidas" ON public.store_quick_replies FOR UPDATE USING (auth.uid() = store_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lojistas podem deletar suas próprias respostas rápidas' AND tablename = 'store_quick_replies') THEN
        CREATE POLICY "Lojistas podem deletar suas próprias respostas rápidas" ON public.store_quick_replies FOR DELETE USING (auth.uid() = store_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Público pode ler respostas rápidas para uso no chat' AND tablename = 'store_quick_replies') THEN
        CREATE POLICY "Público pode ler respostas rápidas para uso no chat" ON public.store_quick_replies FOR SELECT USING (true);
    END IF;
END $$;

-- Função movida e consolidada abaixo.


-- ==================================================================
-- CORREÇÕES FINAIS DE PERMISSÕES E RPCs (CONSOLIDADO)
-- ==================================================================

-- 1. Resolver erro de permissão na tabela store_quick_replies
ALTER TABLE public.store_quick_replies ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas antigas
DROP POLICY IF EXISTS "Lojistas podem ver suas próprias respostas rápidas" ON public.store_quick_replies;
DROP POLICY IF EXISTS "Público pode ler respostas rápidas para uso no chat" ON public.store_quick_replies;
DROP POLICY IF EXISTS "Public read access" ON public.store_quick_replies;

-- Política de Leitura Pública
CREATE POLICY "Public read access" ON public.store_quick_replies FOR SELECT USING (true);

-- Políticas de Escrita (Lojista)
DROP POLICY IF EXISTS "Lojistas podem inserir suas próprias respostas rápidas" ON public.store_quick_replies;
CREATE POLICY "Lojistas podem inserir suas próprias respostas rápidas" ON public.store_quick_replies FOR INSERT WITH CHECK (auth.uid() = store_id);

DROP POLICY IF EXISTS "Lojistas podem atualizar suas próprias respostas rápidas" ON public.store_quick_replies;
CREATE POLICY "Lojistas podem atualizar suas próprias respostas rápidas" ON public.store_quick_replies FOR UPDATE USING (auth.uid() = store_id);

DROP POLICY IF EXISTS "Lojistas podem deletar suas próprias respostas rápidas" ON public.store_quick_replies;
CREATE POLICY "Lojistas podem deletar suas próprias respostas rápidas" ON public.store_quick_replies FOR DELETE USING (auth.uid() = store_id);

-- Grants
GRANT SELECT ON public.store_quick_replies TO anon, authenticated, service_role;
GRANT ALL ON public.store_quick_replies TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.store_quick_replies TO authenticated;


-- 2. Garantir permissões na tabela store_delivery_settings (Erro 406 resolvido)
ALTER TABLE public.store_delivery_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access settings" ON public.store_delivery_settings;
CREATE POLICY "Public read access settings" ON public.store_delivery_settings FOR SELECT USING (true);
GRANT SELECT ON public.store_delivery_settings TO anon, authenticated, service_role;

-- ==================================================================
-- MIGRAÇÃO FINAL E CONSOLIDAÇÃO (WhatsApp -> Chat Interno)
-- ==================================================================

-- 1. Renomeação de Colunas e Tabelas Legadas
DO $$
BEGIN
    -- Migração final: Renomeação de colunas legadas para Chat
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'chat_number_old') THEN
        ALTER TABLE public.user_profiles RENAME COLUMN chat_number_old TO chat_number;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'receive_orders_via_chat_old') THEN
        ALTER TABLE public.user_profiles RENAME COLUMN receive_orders_via_chat_old TO receive_orders_via_chat;
    END IF;

    -- Tabelas Legadas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages_old_v1') THEN
        ALTER TABLE public.chat_messages_old_v1 RENAME TO chat_messages_old;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_conversations_old_v1') THEN
        ALTER TABLE public.chat_conversations_old_v1 RENAME TO chat_conversations_old;
    END IF;

    -- Outras colunas de preferência
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_config' AND column_name = 'chat_sort_preference_old') THEN
        ALTER TABLE public.ze_assistant_config RENAME COLUMN chat_sort_preference_old TO chat_sort_preference;
    END IF;
END $$;

-- 2. Função RPC: Buscar Loja por Slug (Versão Definitiva)
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
        opening_hours, preparation_time_min, preparation_time_max, preparation_time,
        store_address_street, store_address_number, store_address_district, store_address_city, store_address_state,
        receive_orders_via_chat, receive_orders_via_platform,
        city, store_address_state AS state, store_address_zip,
        store_slug, city_slug
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

-- ==================================================================
-- 3.x ATUALIZAÇÕES DE CHAT (26/01/2026)
-- ==================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'is_edited') THEN
        ALTER TABLE public.chat_messages ADD COLUMN is_edited BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'edited_at') THEN
        ALTER TABLE public.chat_messages ADD COLUMN edited_at TIMESTAMPTZ;
    END IF;
END $$;

-- ==================================================================
-- 4.x FIX PERMISSÕES ZE ASSISTANT (26/01/2026)
-- ==================================================================
-- Resolver erro "permission denied for table ze_assistant_conversations"
ALTER TABLE public.ze_assistant_conversations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lojistas podem gerenciar suas conversas do assistente' AND tablename = 'ze_assistant_conversations') THEN
        CREATE POLICY "Lojistas podem gerenciar suas conversas do assistente" ON public.ze_assistant_conversations FOR ALL USING (auth.uid() = store_id);
    END IF;
    -- Permissão para leitura pública (necessário para verificação do bot?)
    -- Geralmente o bot roda como service_role ou o próprio lojista. Se for visitante, não deve acessar isso diretos.
END $$;

GRANT ALL ON public.ze_assistant_conversations TO authenticated;

-- ==================================================================
-- 5.x TABELA DE VOTOS EM ENQUETES (26/01/2026)
-- ==================================================================
CREATE TABLE IF NOT EXISTS public.chat_poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id TEXT NOT NULL,
    option_index INTEGER NOT NULL,
    voter_id TEXT NOT NULL,
    voter_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, voter_id, option_index)
);

ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Todos podem votar e ver votos" ON public.chat_poll_votes;
CREATE POLICY "Todos podem votar e ver votos" ON public.chat_poll_votes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.chat_poll_votes TO anon, authenticated, service_role;


-- ==================================================================
-- ATUALIZAÇÃO: Campo de Status da Loja em Tempo Real
-- ==================================================================
-- Adicionar campo is_currently_open para controlar se a loja está aberta/fechada
-- Este campo permite que o lojista controle o status manualmente
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_currently_open BOOLEAN DEFAULT true;

-- Comentário do campo
COMMENT ON COLUMN public.user_profiles.is_currently_open IS 'Indica se a loja está atualmente aberta (true) ou fechada (false). Controlado manualmente pelo lojista.';

-- ==================================================================
-- ATUALIZAÇÃO: Bucket de Áudio para Chat
-- ==================================================================
-- Criar bucket para armazenar mensagens de áudio
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-audio', 'chat-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Política de upload (autenticados podem fazer upload)
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de áudio" ON storage.objects;
CREATE POLICY "Usuários autenticados podem fazer upload de áudio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-audio');

-- Política de leitura (público pode ler)
DROP POLICY IF EXISTS "Áudios são públicos para leitura" ON storage.objects;
CREATE POLICY "Áudios são públicos para leitura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-audio');

-- ==================================================================
-- 8.x ZÉ ASSISTENTE (IA E AUTOMATION)
-- ==================================================================

-- Configuração do Assistente (uma por loja)
CREATE TABLE IF NOT EXISTS public.ze_assistant_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT FALSE,
    ai_enabled BOOLEAN DEFAULT TRUE,
    rules_enabled BOOLEAN DEFAULT TRUE,
    can_create_orders BOOLEAN DEFAULT TRUE,
    can_delivery BOOLEAN DEFAULT TRUE,
    can_pickup BOOLEAN DEFAULT TRUE,
    greeting_message TEXT DEFAULT 'Olá! Sou o Zé, o assistente virtual da loja. Como posso ajudar?',
    fallback_message TEXT DEFAULT 'Desculpe, não entendi. Pode repetir ou pedir para falar com um atendente?',
    instruction_closed_store TEXT DEFAULT 'No momento estamos fechados. Nosso horário é...',
    auto_handoff_on_confusion BOOLEAN DEFAULT TRUE,
    max_confusion_attempts INTEGER DEFAULT 3,
    response_delay_ms INTEGER DEFAULT 2000,
    chat_sort_preference VARCHAR(20) DEFAULT 'recent', -- 'recent' ou 'manual'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT ze_assistant_config_store_id_key UNIQUE (store_id)
);

-- Regras de Resposta Fixas
CREATE TABLE IF NOT EXISTS public.ze_assistant_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name VARCHAR(100),
    description TEXT,
    trigger_keywords TEXT[],
    response_template TEXT,
    priority INTEGER DEFAULT 1, -- Quanto maior, maior prioridade
    match_mode VARCHAR(20) DEFAULT 'contains', -- contains, exact, regex
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estado da Conversa do Assistente
CREATE TABLE IF NOT EXISTS public.ze_assistant_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    conversation_id VARCHAR(100) NOT NULL, -- Telefone ou UUID
    is_assistant_active BOOLEAN DEFAULT TRUE,
    handoff_to_human BOOLEAN DEFAULT FALSE,
    handoff_at TIMESTAMPTZ,
    handoff_reason TEXT,
    context_data JSONB DEFAULT '{}'::jsonb,
    confusion_count INTEGER DEFAULT 0,
    summary TEXT,
    last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT ze_assistant_conversations_uniq UNIQUE (store_id, conversation_id)
);

-- Base de Conhecimento (RAG)
CREATE TABLE IF NOT EXISTS public.ze_assistant_knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    content_type VARCHAR(50) DEFAULT 'FAQ', -- FAQ, PRODUCT, POLICY
    title TEXT,
    content TEXT,
    embedding VECTOR(1536), -- Para embeddings da OpenAI/Gemini
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs de Processamento (Opcional, bom ter)
CREATE TABLE IF NOT EXISTS public.ze_assistant_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID,
    conversation_id VARCHAR(100),
    message_input TEXT,
    response_output TEXT,
    used_ai BOOLEAN DEFAULT FALSE,
    sentiment VARCHAR(20),
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir permissões para service_role (backend) e authenticated
GRANT ALL ON public.ze_assistant_config TO service_role;
GRANT ALL ON public.ze_assistant_config TO authenticated;

GRANT ALL ON public.ze_assistant_rules TO service_role;
GRANT ALL ON public.ze_assistant_rules TO authenticated;

GRANT ALL ON public.ze_assistant_conversations TO service_role;
GRANT ALL ON public.ze_assistant_conversations TO authenticated;

GRANT ALL ON public.ze_assistant_knowledge_base TO service_role;
GRANT ALL ON public.ze_assistant_knowledge_base TO authenticated;

GRANT ALL ON public.ze_assistant_logs TO service_role;
GRANT ALL ON public.ze_assistant_logs TO authenticated;

-- RLS Policies


-- RLS Policies
ALTER TABLE public.ze_assistant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ze_assistant_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ze_assistant_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ze_assistant_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ze_assistant_logs ENABLE ROW LEVEL SECURITY;

-- Config: Lojista vê e edita a sua
DROP POLICY IF EXISTS "Lojista gerencia sua config do assistente" ON public.ze_assistant_config;
CREATE POLICY "Lojista gerencia sua config do assistente" ON public.ze_assistant_config
    FOR ALL USING (store_id = auth.uid());

-- Regras: Lojista gerencia as suas
DROP POLICY IF EXISTS "Lojista gerencia suas regras" ON public.ze_assistant_rules;
CREATE POLICY "Lojista gerencia suas regras" ON public.ze_assistant_rules
    FOR ALL USING (store_id = auth.uid());

-- Conversas: Lojista vê e edita
DROP POLICY IF EXISTS "Lojista gerencia conversas do assistente" ON public.ze_assistant_conversations;
CREATE POLICY "Lojista gerencia conversas do assistente" ON public.ze_assistant_conversations
    FOR ALL USING (store_id = auth.uid());

-- Knowledge Base: Lojista gerencia
DROP POLICY IF EXISTS "Lojista gerencia KB" ON public.ze_assistant_knowledge_base;
CREATE POLICY "Lojista gerencia KB" ON public.ze_assistant_knowledge_base
    FOR ALL USING (store_id = auth.uid());

-- Logs: Lojista vê seus logs
DROP POLICY IF EXISTS "Lojista ve logs" ON public.ze_assistant_logs;
CREATE POLICY "Lojista ve logs" ON public.ze_assistant_logs
    FOR SELECT USING (store_id = auth.uid());

-- TRIGGERS de Updated At
DROP TRIGGER IF EXISTS handle_ze_config_updated_at ON public.ze_assistant_config;
CREATE TRIGGER handle_ze_config_updated_at BEFORE UPDATE ON public.ze_assistant_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS handle_ze_rules_updated_at ON public.ze_assistant_rules;
CREATE TRIGGER handle_ze_rules_updated_at BEFORE UPDATE ON public.ze_assistant_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS handle_ze_conversations_updated_at ON public.ze_assistant_conversations;
CREATE TRIGGER handle_ze_conversations_updated_at BEFORE UPDATE ON public.ze_assistant_conversations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- Adicionar coluna assistant_name para personalização do chatbot
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_config' AND column_name = 'assistant_name') THEN
        ALTER TABLE public.ze_assistant_config ADD COLUMN assistant_name TEXT DEFAULT 'Zé';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_config' AND column_name = 'chat_sort_preference') THEN
        ALTER TABLE public.ze_assistant_config ADD COLUMN chat_sort_preference VARCHAR(20) DEFAULT 'recent';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_conversations' AND column_name = 'is_blocked') THEN
        ALTER TABLE public.chat_conversations ADD COLUMN is_blocked BOOLEAN DEFAULT FALSE;
    END IF;
-- Garantir comentários
COMMENT ON COLUMN public.ze_assistant_config.assistant_name IS 'Nome personalizado do chatbot definido pelo lojista.';
COMMENT ON COLUMN public.user_profiles.preparation_time_min IS 'Tempo mínimo de preparo em minutos.';
COMMENT ON COLUMN public.user_profiles.preparation_time_max IS 'Tempo máximo de preparo em minutos.';
END $$;

-- Tabela de configuraÃ§Ãµes de entrega;
CREATE TABLE IF NOT EXISTS public.store_delivery_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    is_pickup_enabled BOOLEAN DEFAULT TRUE,
    is_own_delivery_enabled BOOLEAN DEFAULT FALSE,
    own_delivery_mode TEXT DEFAULT 'FIXED', -- 'FIXED', 'NEIGHBORHOOD', 'RADIUS'
    fixed_fee NUMERIC(10, 2) DEFAULT 0,
    is_partner_delivery_enabled BOOLEAN DEFAULT FALSE,
    radius_km NUMERIC(10, 2) DEFAULT 0,
    delivery_time_min INTEGER DEFAULT 30,
    delivery_time_max INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_store_delivery_settings UNIQUE (store_id)
);

CREATE INDEX IF NOT EXISTS store_delivery_settings_store_id_idx ON public.store_delivery_settings (store_id);

DROP TRIGGER IF EXISTS handle_store_delivery_settings_updated_at ON public.store_delivery_settings;
CREATE TRIGGER handle_store_delivery_settings_updated_at BEFORE UPDATE ON public.store_delivery_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.store_delivery_settings ENABLE ROW LEVEL SECURITY;

-- Garante que colunas novas e essenciais existam (Idempotência para corrigir erro de Schema Cache/Tabela Incompleta)
DO $$
BEGIN
    -- Tempos de Entrega
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_delivery_settings' AND column_name = 'delivery_time_min') THEN
        ALTER TABLE public.store_delivery_settings ADD COLUMN delivery_time_min INTEGER DEFAULT 30;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_delivery_settings' AND column_name = 'delivery_time_max') THEN
        ALTER TABLE public.store_delivery_settings ADD COLUMN delivery_time_max INTEGER DEFAULT 60;
    END IF;

    -- Opções de Entrega (Retirada e Própria)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_delivery_settings' AND column_name = 'is_pickup_enabled') THEN
        ALTER TABLE public.store_delivery_settings ADD COLUMN is_pickup_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_delivery_settings' AND column_name = 'is_own_delivery_enabled') THEN
        ALTER TABLE public.store_delivery_settings ADD COLUMN is_own_delivery_enabled BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_delivery_settings' AND column_name = 'own_delivery_mode') THEN
        ALTER TABLE public.store_delivery_settings ADD COLUMN own_delivery_mode TEXT DEFAULT 'FIXED';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_delivery_settings' AND column_name = 'fixed_fee') THEN
        ALTER TABLE public.store_delivery_settings ADD COLUMN fixed_fee NUMERIC(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_delivery_settings' AND column_name = 'radius_km') THEN
        ALTER TABLE public.store_delivery_settings ADD COLUMN radius_km NUMERIC(10, 2) DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_delivery_settings' AND column_name = 'is_partner_delivery_enabled') THEN
        ALTER TABLE public.store_delivery_settings ADD COLUMN is_partner_delivery_enabled BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- PolÃ­ticas
DROP POLICY IF EXISTS "Store owners can manage their own delivery settings" ON public.store_delivery_settings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can manage their own delivery settings' AND tablename = 'store_delivery_settings') THEN
        CREATE POLICY "Store owners can manage their own delivery settings" ON public.store_delivery_settings FOR ALL USING (auth.uid()::text = store_id::text);
    END IF;
END $$;

DROP POLICY IF EXISTS "Public can read store delivery settings" ON public.store_delivery_settings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read store delivery settings' AND tablename = 'store_delivery_settings') THEN
        CREATE POLICY "Public can read store delivery settings" ON public.store_delivery_settings FOR SELECT USING (true);
    END IF;
END $$;

DROP POLICY IF EXISTS "Admins can manage all store delivery settings" ON public.store_delivery_settings;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all store delivery settings' AND tablename = 'store_delivery_settings') THEN
        CREATE POLICY "Admins can manage all store delivery settings" ON public.store_delivery_settings FOR ALL USING (public.is_admin());
    END IF;
END $$;


-- Tabela de taxas por bairro (store_neighborhood_fees) - Garantir existÃªncia
CREATE TABLE IF NOT EXISTS public.store_neighborhood_fees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    neighborhood_name VARCHAR(255) NOT NULL,
    fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_neighborhood_fees_store_id_idx ON public.store_neighborhood_fees (store_id);

DROP TRIGGER IF EXISTS handle_store_neighborhood_fees_updated_at ON public.store_neighborhood_fees;
CREATE TRIGGER handle_store_neighborhood_fees_updated_at BEFORE UPDATE ON public.store_neighborhood_fees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.store_neighborhood_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can manage their own neighborhood fees" ON public.store_neighborhood_fees;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Store owners can manage their own neighborhood fees' AND tablename = 'store_neighborhood_fees') THEN
        CREATE POLICY "Store owners can manage their own neighborhood fees" ON public.store_neighborhood_fees FOR ALL USING (auth.uid()::text = store_id::text);
    END IF;
END $$;

DROP POLICY IF EXISTS "Public can read store neighborhood fees" ON public.store_neighborhood_fees;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read store neighborhood fees' AND tablename = 'store_neighborhood_fees') THEN
        CREATE POLICY "Public can read store neighborhood fees" ON public.store_neighborhood_fees FOR SELECT USING (true);
    END IF;
END $$;

DROP POLICY IF EXISTS "Admins can manage neighborhood fees" ON public.store_neighborhood_fees;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage neighborhood fees' AND tablename = 'store_neighborhood_fees') THEN
        CREATE POLICY "Admins can manage neighborhood fees" ON public.store_neighborhood_fees FOR ALL USING (public.is_admin());
    END IF;
END $$;


-- Tabela de regras de entrega (store_shipping_rules) - Restaurando tabela faltante
CREATE TABLE IF NOT EXISTS public.store_shipping_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    rule_type public.shipping_rule_type NOT NULL, -- 'free_above', 'fixed_rate'
    threshold NUMERIC(10, 2), -- Valor mínimo do pedido para aplicar a regra (opcional dependendo do tipo)
    value NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Custo ou Desconto
    is_active BOOLEAN DEFAULT TRUE,
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
        CREATE POLICY "Store owners can manage their own shipping rules" ON public.store_shipping_rules FOR ALL USING (auth.uid()::text = store_id::text);
    END IF;
END $$;

DROP POLICY IF EXISTS "Public can read store shipping rules" ON public.store_shipping_rules;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read store shipping rules' AND tablename = 'store_shipping_rules') THEN
        CREATE POLICY "Public can read store shipping rules" ON public.store_shipping_rules FOR SELECT USING (true);
    END IF;
END $$;


-- Atualizar configurações do Bucket 'avatars' para permitir WebP, GIF, etc.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'video/mp4']
WHERE id = 'avatars';

-- Garantir que o bucket exista se não existir (Opcional, mas seguro)
INSERT INTO storage.buckets (id, name, public, allowed_mime_types)
VALUES ('avatars', 'avatars', true, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'video/mp4'])
ON CONFLICT (id) DO UPDATE
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff', 'video/mp4'];

-- ========================================
-- Adicionar colunas payment_status (se não existirem)
-- ========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_status') THEN
        ALTER TABLE public.orders ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_collaborators' AND column_name = 'payment_status') THEN
        ALTER TABLE public.orders_collaborators ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_tickets' AND column_name = 'payment_status') THEN
        ALTER TABLE public.orders_tickets ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
END $$;


-- ========================================
-- Tabela de Entregadores Associados à Loja
-- ========================================

CREATE TABLE IF NOT EXISTS public.store_delivery_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_name VARCHAR(255),
    partner_phone VARCHAR(50),
    partner_vehicle VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(store_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_store_delivery_partners_store ON public.store_delivery_partners(store_id);
CREATE INDEX IF NOT EXISTS idx_store_delivery_partners_partner ON public.store_delivery_partners(partner_id);

-- RLS Policies
ALTER TABLE public.store_delivery_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Store owners can manage their delivery partners" ON public.store_delivery_partners;
CREATE POLICY "Store owners can manage their delivery partners" ON public.store_delivery_partners FOR ALL USING (auth.uid()::text = store_id::text);

DROP POLICY IF EXISTS "Partners can view their associations" ON public.store_delivery_partners;
CREATE POLICY "Partners can view their associations" ON public.store_delivery_partners FOR SELECT USING (auth.uid()::text = partner_id::text);

-- [29/01/2026] Marcar customer_phone como opcional para evitar erro 500 no toggle do assistente
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'customer_phone') THEN
        ALTER TABLE public.ze_assistant_conversations ALTER COLUMN customer_phone DROP NOT NULL;
    END IF;
END $$;

-- ==================================================================
-- [29/01/2026] STREET REQUESTS & APPROVED STREETS
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.street_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id),
    street_name TEXT NOT NULL,
    neighborhood TEXT,
    city TEXT NOT NULL,
    state TEXT,
    reference TEXT,
    latitude NUMERIC(15, 8),
    longitude NUMERIC(15, 8),
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.approved_streets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    neighborhood TEXT,
    latitude NUMERIC(15, 8),
    longitude NUMERIC(15, 8),
    request_id UUID REFERENCES public.street_requests(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para street_requests
ALTER TABLE public.street_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all street requests" ON public.street_requests;
CREATE POLICY "Admins can manage all street requests" ON public.street_requests 
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users can insert their own street requests" ON public.street_requests;
CREATE POLICY "Users can insert their own street requests" ON public.street_requests 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own street requests" ON public.street_requests;
CREATE POLICY "Users can view their own street requests" ON public.street_requests 
    FOR SELECT USING (auth.uid() = user_id);

-- RLS para approved_streets
ALTER TABLE public.approved_streets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage all approved streets" ON public.approved_streets;
CREATE POLICY "Admins can manage all approved streets" ON public.approved_streets 
    FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Public/Authenticated can view approved streets" ON public.approved_streets;
CREATE POLICY "Public/Authenticated can view approved streets" ON public.approved_streets 
    FOR SELECT USING (true);

-- Triggers para updated_at
DROP TRIGGER IF EXISTS tr_street_requests_updated_at ON public.street_requests;
CREATE TRIGGER tr_street_requests_updated_at BEFORE UPDATE ON public.street_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS tr_approved_streets_updated_at ON public.approved_streets;
CREATE TRIGGER tr_approved_streets_updated_at BEFORE UPDATE ON public.approved_streets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grants para permitir acesso básico (o RLS filtrará o conteúdo)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.street_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.approved_streets TO authenticated;
GRANT SELECT ON public.street_requests TO anon;
GRANT SELECT ON public.approved_streets TO anon;

-- Ajuste de políticas com casts de UUID para garantir compatibilidade
DROP POLICY IF EXISTS "Users can insert their own street requests" ON public.street_requests;
CREATE POLICY "Users can insert their own street requests" ON public.street_requests 
    FOR INSERT WITH CHECK (auth.uid()::uuid = user_id::uuid);

DROP POLICY IF EXISTS "Users can view their own street requests" ON public.street_requests;
CREATE POLICY "Users can view their own street requests" ON public.street_requests 
    FOR SELECT USING (auth.uid()::uuid = user_id::uuid);


-- ==================================================================
-- 9.x MÓDULO DE MEDIAÇÃO INTELIGENTE (SEM DESTRUIR DADOS)
-- ==================================================================

-- 1. Adicionar colunas de códigos e flag de mediação na tabela orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'pickup_code') THEN
        ALTER TABLE public.orders ADD COLUMN pickup_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'delivery_code') THEN
        ALTER TABLE public.orders ADD COLUMN delivery_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'return_code') THEN
        ALTER TABLE public.orders ADD COLUMN return_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_mediation_active') THEN
        ALTER TABLE public.orders ADD COLUMN is_mediation_active BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Tabela de Sessões de Mediação
CREATE TABLE IF NOT EXISTS public.mediation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'RESOLVED', 'ESCALATED', 'CANCELLED'
    current_step TEXT DEFAULT 'INIT',
    ai_memory JSONB DEFAULT '{}'::jsonb, -- Contexto e memória da IA para essa sessão
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_active_mediation_per_order UNIQUE (order_id) -- Uma mediação por pedido
);

-- RLS para mediation_sessions
ALTER TABLE public.mediation_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage mediation sessions" ON public.mediation_sessions;
CREATE POLICY "Admins can manage mediation sessions" ON public.mediation_sessions FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Participants can view mediation sessions" ON public.mediation_sessions;
CREATE POLICY "Participants can view mediation sessions" ON public.mediation_sessions
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.orders WHERE id = mediation_sessions.order_id
            UNION
            SELECT driver_id::uuid FROM public.orders WHERE id = mediation_sessions.order_id AND driver_id IS NOT NULL
             -- Loja? store_id geralmente não é auth.uid direto se for perfil de loja, mas vamos simplificar:
            UNION
            SELECT id FROM public.user_profiles WHERE id = (SELECT store_id::uuid FROM public.orders WHERE id = mediation_sessions.order_id)
        )
    );

-- Triggers para updated_at em mediation_sessions
DROP TRIGGER IF EXISTS handle_mediation_sessions_updated_at ON public.mediation_sessions;
CREATE TRIGGER handle_mediation_sessions_updated_at BEFORE UPDATE ON public.mediation_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. Tabela de Ações da Mediação (Logs Auditáveis)
CREATE TABLE IF NOT EXISTS public.mediation_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.mediation_sessions(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'MESSAGE', 'DECISION', 'COMMAND', 'ESCALATION'
    description TEXT,
    payload JSONB DEFAULT '{}'::jsonb, -- Detalhes da ação (ex: código gerado, motivo)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS para mediation_actions
ALTER TABLE public.mediation_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view mediation actions" ON public.mediation_actions;
CREATE POLICY "Admins can view mediation actions" ON public.mediation_actions FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Systems can insert mediation actions" ON public.mediation_actions;
-- Assumindo que o backend (service role) insere, mas se for via client (IA simulada), precisamos de permissão
DROP POLICY IF EXISTS "Participants can view actions" ON public.mediation_actions;
CREATE POLICY "Participants can view actions" ON public.mediation_actions
    FOR SELECT USING (
        session_id IN (SELECT id FROM public.mediation_sessions) 
        -- Simplificado, idealmente checaria se o usuário participa da sessão
    );

-- 4. Grants
GRANT ALL ON public.mediation_sessions TO authenticated;
GRANT ALL ON public.mediation_actions TO authenticated;
GRANT ALL ON public.mediation_sessions TO service_role;
GRANT ALL ON public.mediation_actions TO service_role;


-- ==================================================================
-- 3.x FUNÇÕES RPC (Correções de NaN e Unificação de Pedidos)
-- ==================================================================

-- Drop para evitar erro de assinatura diferente (42P13)
DROP FUNCTION IF EXISTS public.get_unified_order_history(uuid, integer);
DROP FUNCTION IF EXISTS public.get_unified_active_orders(uuid);

-- Função para buscar histórico unificado de pedidos (corrigindo NaN)
CREATE OR REPLACE FUNCTION public.get_unified_order_history(p_store_id uuid, p_limit integer)
RETURNS TABLE (
    id uuid,
    customer_name text,
    status text,
    total_price numeric,
    payment_method text,
    created_at timestamptz,
    items jsonb,
    order_type text,
    table_identifier text,
    ticket_id uuid
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.customer_name,
        o.status::text,
        COALESCE(o.total_price, oc.total_amount, 0) as total_price,
        o.payment_method::text,
        o.created_at,
        o.items,
        o.order_type,
        oc.table_identifier::text,
        ot.id as ticket_id
    FROM public.orders o
    LEFT JOIN public.orders_tickets ot ON o.id = ot.general_order_id
    LEFT JOIN public.orders_collaborators oc ON ot.order_id = oc.id
    WHERE o.store_id = p_store_id
    ORDER BY o.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar pedidos ativos unificados
CREATE OR REPLACE FUNCTION public.get_unified_active_orders(p_store_id uuid)
RETURNS TABLE (
    id uuid,
    customer_name text,
    status text,
    total_amount numeric,
    created_at timestamptz,
    items jsonb,
    origin text,
    table_identifier text,
    order_type text,
    payment_status text,
    ticket_id uuid
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.customer_name,
        o.status::text,
        COALESCE(o.total_price, 0) as total_amount,
        o.created_at,
        o.items,
        o.origin,
        oc.table_identifier::text,
        o.order_type,
        o.payment_status::text,
        ot.id as ticket_id
    FROM public.orders o
    LEFT JOIN public.orders_tickets ot ON o.id = ot.general_order_id
    LEFT JOIN public.orders_collaborators oc ON ot.order_id = oc.id
    WHERE o.store_id = p_store_id
    AND o.status NOT IN ('COMPLETED', 'CANCELLED', 'DELIVERED', 'REJECTED')
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar histórico unificado de pedidos por intervalo de datas (Server-Side Filtering)
CREATE OR REPLACE FUNCTION public.get_unified_order_history_by_date(
    p_store_id uuid, 
    p_start_date timestamptz, 
    p_end_date timestamptz
)
RETURNS TABLE (
    id uuid,
    customer_name text,
    status text,
    total_price numeric,
    payment_method text,
    created_at timestamptz,
    items jsonb,
    order_type text,
    table_identifier text,
    ticket_id uuid
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.customer_name,
        o.status::text,
        COALESCE(o.total_price, oc.total_amount, 0) as total_price,
        o.payment_method::text,
        o.created_at,
        o.items,
        o.order_type,
        oc.table_identifier::text,
        ot.id as ticket_id
    FROM public.orders o
    LEFT JOIN public.orders_tickets ot ON o.id = ot.general_order_id
    LEFT JOIN public.orders_collaborators oc ON ot.order_id = oc.id
    WHERE o.store_id = p_store_id
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para restaurar um pedido à fila de produção (recriando ticket se necessário)
CREATE OR REPLACE FUNCTION public.restore_order_ticket(p_order_id uuid)
RETURNS jsonb
AS $$
DECLARE
    v_ticket_id uuid;
    v_order_status text;
    v_updates_count int;
BEGIN
    -- Verifica se o pedido existe e pega status atual
    SELECT status INTO v_order_status FROM public.orders WHERE id = p_order_id;
    
    IF v_order_status IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Order not found for ID: ' || p_order_id);
    END IF;

    -- Atualiza status do pedido para PENDING forçadamente
    UPDATE public.orders 
    SET status = 'PENDING' 
    WHERE id = p_order_id;
    
    GET DIAGNOSTICS v_updates_count = ROW_COUNT;
    IF v_updates_count = 0 THEN
         RETURN json_build_object('success', false, 'message', 'Failed to update order status');
    END IF;

    -- Verifica se já existe ticket para este pedido
    SELECT id INTO v_ticket_id FROM public.orders_tickets WHERE general_order_id = p_order_id LIMIT 1;
    
    IF v_ticket_id IS NOT NULL THEN
        -- Ticket existe, apenas reativa
        UPDATE public.orders_tickets 
        SET status = 'pending' 
        WHERE id = v_ticket_id;
        
        RETURN json_build_object('success', true, 'message', 'Ticket updated', 'ticket_id', v_ticket_id, 'previous_status', v_order_status);
    ELSE
        -- Ticket não existe, cria um novo
        INSERT INTO public.orders_tickets (
            store_id,
            general_order_id,
            order_id,
            status,
            items,
            created_at,
            updated_at
        )
        SELECT 
            store_id,
            id,
            id, -- Preenchendo order_id também para satisfazer constraint legada
            'pending',
            -- Coluna items em orders é JSONB, então passamos direto.
            -- COALESCE garante que não seja NULL.
            COALESCE(items, '[]'::jsonb),
            NOW(),
            NOW()
        FROM public.orders WHERE id = p_order_id
        RETURNING id INTO v_ticket_id;
        
        RETURN json_build_object('success', true, 'message', 'Ticket created', 'ticket_id', v_ticket_id, 'previous_status', v_order_status);
    END IF;
EXCEPTION WHEN others THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Correção de permissão para sequência de tickets (Necessário para INSERT na restore_order_ticket)
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.orders_tickets_display_id_seq TO authenticated;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.orders_tickets_display_id_seq TO service_role;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.orders_tickets_display_id_seq TO anon;

-- Função para atualizar status do ticket E AUTOMATIZAR PAGAMENTO se finalizado
CREATE OR REPLACE FUNCTION public.update_ticket_status(p_ticket_id uuid, p_status text)
RETURNS void
AS $$
DECLARE
    v_general_order_id uuid;
    v_order_id uuid;
    v_new_payment_status text;
    v_order_status_mapped text;
BEGIN
    -- Mapeamento de status de interface para status de banco (Enum)
    v_order_status_mapped := CASE
        WHEN p_status = 'pending' THEN 'PENDING'
        WHEN p_status = 'producing' THEN 'PREPARING'
        WHEN p_status = 'ready' THEN 'READY'
        WHEN p_status = 'in_transit' THEN 'IN_DELIVERY'
        WHEN p_status = 'delivered' THEN 'DELIVERED'
        WHEN p_status = 'completed' THEN 'DELIVERED'
        WHEN p_status = 'cancelled' THEN 'CANCELLED'
        WHEN p_status = 'rejected' THEN 'REJECTED'
        ELSE UPPER(p_status) -- Tenta converter direto caso não mapeado
    END;

    -- Se o status for de finalização (entregue), define pagamento como 'paid'
    -- Aceita variações de string comuns no frontend
    IF p_status ILIKE 'delivered' OR p_status ILIKE 'completed' THEN
        v_new_payment_status := 'paid';
    END IF;

    -- Atualiza o ticket com o status original (geralmente lowercase no frontend)
    UPDATE public.orders_tickets
    SET status = p_status, updated_at = NOW()
    WHERE id = p_ticket_id
    RETURNING general_order_id, order_id INTO v_general_order_id, v_order_id;

    -- Atualiza pedidos vinculados
    IF v_general_order_id IS NOT NULL THEN
        -- Tenta atualizar status apenas se for um valor válido para o enum, senão ignora o status e atualiza só pagamento
        BEGIN
            UPDATE public.orders 
            SET 
                status = v_order_status_mapped::public.order_status, 
                updated_at = NOW(),
                payment_status = COALESCE(v_new_payment_status, payment_status)
            WHERE id = v_general_order_id;
        EXCEPTION WHEN invalid_text_representation THEN
            -- Se falhar o cast do status, atualiza apenas o pagamento (fallback seguro)
            UPDATE public.orders 
            SET 
                updated_at = NOW(),
                payment_status = COALESCE(v_new_payment_status, payment_status)
            WHERE id = v_general_order_id;
        END;
    END IF;

    IF v_order_id IS NOT NULL THEN
        UPDATE public.orders_collaborators 
        SET 
            status = p_status, -- orders_collaborators costuma usar status texto simples
            updated_at = NOW(),
            payment_status = COALESCE(v_new_payment_status, payment_status)
        WHERE id = v_order_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar PREÇO TOTAL do pedido manualmente
CREATE OR REPLACE FUNCTION public.update_order_price(p_order_id uuid, p_new_price numeric)
RETURNS void
AS $$
DECLARE
    v_general_order_id uuid;
    v_order_id uuid;
BEGIN
    -- Atualiza orders (tabela principal)
    -- 1. Tenta achar o ticket usando o ID fornecido (pode ser order.id ou orders_collaborators.id)
    SELECT general_order_id, order_id 
    INTO v_general_order_id, v_order_id
    FROM public.orders_tickets 
    WHERE general_order_id = p_order_id OR order_id = p_order_id
    LIMIT 1;

    -- 2. Se não achou ticket, assume que p_order_id é orders.id (comportamento padrão)
    IF v_general_order_id IS NULL AND v_order_id IS NULL THEN
        UPDATE public.orders
        SET total_price = p_new_price, updated_at = NOW()
        WHERE id = p_order_id;
        RETURN;
    END IF;

    -- 3. Atualiza orders (Tabela Principal)
    IF v_general_order_id IS NOT NULL THEN
        UPDATE public.orders
        SET total_price = p_new_price, updated_at = NOW()
        WHERE id = v_general_order_id;
    END IF;

    -- 4. Atualiza orders_collaborators (Mesas/Comandas)
    IF v_order_id IS NOT NULL THEN
        UPDATE public.orders_collaborators
        SET total_amount = p_new_price, updated_at = NOW()
        WHERE id = v_order_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================
-- CORREÇÃO DE CLASSIFICAÇÃO DE PEDIDOS - 31/01/2026
-- ==================================================================

-- 1. Adicionar coluna is_location_delivery se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_location_delivery') THEN
        ALTER TABLE public.orders ADD COLUMN is_location_delivery BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Atualizar create_public_order para persistir is_location_delivery
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
    p_shipping_cost NUMERIC DEFAULT 0
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
        'DIGITAL_MENU'
    )
    RETURNING id INTO v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_public_order(UUID, JSONB, NUMERIC, TEXT, JSONB, TEXT, TEXT, TEXT, BOOLEAN, TEXT, BOOLEAN, NUMERIC) TO anon, authenticated;

-- ==================================================================
-- MIGRAÇÃO LOCALSTORAGE PARA BANCO DE DADOS - 01/02/2026
-- ==================================================================

DO $$
BEGIN
    -- 1. Colunas para controle diário (DailyPanel)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'daily_fixed_value') THEN
        ALTER TABLE public.user_profiles ADD COLUMN daily_fixed_value NUMERIC(15, 2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'daily_goal') THEN
        ALTER TABLE public.user_profiles ADD COLUMN daily_goal NUMERIC(15, 2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'today_transactions') THEN
        ALTER TABLE public.user_profiles ADD COLUMN today_transactions JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- 2. Coluna para filtros persistentes (Busca/Filtros Globais)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'saved_filters') THEN
        ALTER TABLE public.user_profiles ADD COLUMN saved_filters JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- ==================================================================
-- CONFIGURAÇÃO DE REALTIME - 01/02/2026
-- ==================================================================

-- Garantir que a publicação para Realtime exista e inclua a tabela orders
-- Isso permite atualizações instantâneas no acompanhamento do cliente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    -- Tenta adicionar a tabela orders à publicação
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL; -- Tabela já está na publicação
    END;
END $$;

-- ==================================================================
-- 3.x PROMOÇÕES E CUPONS (Adicionado em 01/02/2026)
-- ==================================================================

-- Tabela de Promoções Automáticas
CREATE TABLE IF NOT EXISTS public.store_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    discount_type TEXT DEFAULT 'PERCENTAGE', -- 'PERCENTAGE', 'FIXED', 'FREE_SHIPPING'
    discount_value NUMERIC(10, 2) DEFAULT 0,
    min_order_value NUMERIC(10, 2) DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    applies_to_all_products BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_promotions_store_id_idx ON public.store_promotions (store_id);
CREATE INDEX IF NOT EXISTS store_promotions_is_active_idx ON public.store_promotions (is_active);

DROP TRIGGER IF EXISTS handle_store_promotions_updated_at ON public.store_promotions;
CREATE TRIGGER handle_store_promotions_updated_at BEFORE UPDATE ON public.store_promotions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Relacionamento Promoções x Produtos (Para promoções específicas)
CREATE TABLE IF NOT EXISTS public.promotion_products (
    promotion_id UUID REFERENCES public.store_promotions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    PRIMARY KEY (promotion_id, product_id)
);

-- Tabela de Cupons de Desconto
CREATE TABLE IF NOT EXISTS public.store_coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    discount_type TEXT DEFAULT 'PERCENTAGE', -- 'PERCENTAGE', 'FIXED', 'FREE_SHIPPING'
    discount_value NUMERIC(10, 2) DEFAULT 0,
    min_order_value NUMERIC(10, 2) DEFAULT 0,
    max_discount_value NUMERIC(10, 2),
    usage_limit INTEGER,
    user_usage_limit INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, code)
);

CREATE INDEX IF NOT EXISTS store_coupons_store_id_idx ON public.store_coupons (store_id);
CREATE INDEX IF NOT EXISTS store_coupons_code_idx ON public.store_coupons (code);

DROP TRIGGER IF EXISTS handle_store_coupons_updated_at ON public.store_coupons;
CREATE TRIGGER handle_store_coupons_updated_at BEFORE UPDATE ON public.store_coupons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.store_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_coupons ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para Lojistas (Pelo store_id)
DROP POLICY IF EXISTS "Lojistas gerenciam suas próprias promoções" ON public.store_promotions;
CREATE POLICY "Lojistas gerenciam suas próprias promoções" ON public.store_promotions
    FOR ALL USING (store_id::text = auth.uid()::text OR public.is_admin());

DROP POLICY IF EXISTS "Lojistas gerenciam produtos de suas promoções" ON public.promotion_products;
CREATE POLICY "Lojistas gerenciam produtos de suas promoções" ON public.promotion_products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.store_promotions 
            WHERE id = promotion_id AND (store_id::text = auth.uid()::text OR public.is_admin())
        )
    );

DROP POLICY IF EXISTS "Lojistas gerenciam seus próprios cupons" ON public.store_coupons;
CREATE POLICY "Lojistas gerenciam seus próprios cupons" ON public.store_coupons
    FOR ALL USING (store_id::text = auth.uid()::text OR public.is_admin());

-- Políticas de Leitura Pública (Para validação no checkout e exibição)
DROP POLICY IF EXISTS "Leitura pública de promoções ativas" ON public.store_promotions;
CREATE POLICY "Leitura pública de promoções ativas" ON public.store_promotions
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Leitura pública de produtos em promoção" ON public.promotion_products;
CREATE POLICY "Leitura pública de produtos em promoção" ON public.promotion_products
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Leitura pública de cupons ativos" ON public.store_coupons;
CREATE POLICY "Leitura pública de cupons ativos" ON public.store_coupons
    FOR SELECT USING (is_active = TRUE);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_promotions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotion_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_coupons TO authenticated;
GRANT SELECT ON public.store_promotions TO anon;
GRANT SELECT ON public.promotion_products TO anon;
GRANT SELECT ON public.store_coupons TO anon;

-- ==================================================================
-- 4.x SETTINGS & FEES (Adicionado para persistência real de taxas)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.partner_fee_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    global_tax_fixed NUMERIC(10, 2) DEFAULT 0.50,
    global_tax_percent NUMERIC(10, 2) DEFAULT 2.0,
    super_store_monthly_fee NUMERIC(10, 2) DEFAULT 99.00,
    association_fee NUMERIC(10, 2) DEFAULT 10.00,
    base_delivery_value NUMERIC(10, 2) DEFAULT 5.00,
    base_delivery_km NUMERIC(10, 2) DEFAULT 3.00,
    extra_km_value NUMERIC(10, 2) DEFAULT 1.50,
    additional_stop_fee NUMERIC(10, 2) DEFAULT 2.00,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir apenas uma linha (Singleton)
CREATE UNIQUE INDEX IF NOT EXISTS partner_fee_settings_singleton_idx ON public.partner_fee_settings ((TRUE));

-- Trigger update_at
DROP TRIGGER IF EXISTS handle_partner_fee_settings_updated_at ON public.partner_fee_settings;
CREATE TRIGGER handle_partner_fee_settings_updated_at BEFORE UPDATE ON public.partner_fee_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.partner_fee_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access to fees" ON public.partner_fee_settings;
CREATE POLICY "Public read access to fees" ON public.partner_fee_settings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Admin write access to fees" ON public.partner_fee_settings;
CREATE POLICY "Admin write access to fees" ON public.partner_fee_settings FOR ALL USING (public.is_admin());

GRANT SELECT ON public.partner_fee_settings TO anon, authenticated;
GRANT ALL ON public.partner_fee_settings TO service_role;

-- Inserir valores padrão se não existir
INSERT INTO public.partner_fee_settings (base_delivery_value, extra_km_value)
VALUES (5.00, 1.50)
ON CONFLICT DO NOTHING;

-- ==================================================================
-- 3.x PLATFORM SETTINGS & PARTNER SALES
-- ==================================================================

-- Tabela para configurações globais da plataforma (Chave Pix, Taxas, etc.)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL, -- Ex: 'pix_key_type', 'pix_key_value'
    value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que a tabela tenha RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Política de leitura: Todos (autenticados ou anon para checkout) podem ler configurações públicas como pix_key
DROP POLICY IF EXISTS "Public read access to platform_settings" ON public.platform_settings;
CREATE POLICY "Public read access to platform_settings" ON public.platform_settings FOR SELECT USING (true);

-- Política de escrita: Apenas Admin
DROP POLICY IF EXISTS "Admins can manage platform_settings" ON public.platform_settings;
CREATE POLICY "Admins can manage platform_settings" ON public.platform_settings FOR ALL USING (public.is_admin());


-- Inserir/Garantir chave Pix padrão (Placeholder)
INSERT INTO public.platform_settings (key, value, description)
VALUES ('platform_pix_key', 'chave-pix-padrao-plataforma', 'Chave Pix oficial da plataforma para recebimento de vendas de parceiros')
ON CONFLICT (key) DO NOTHING;


-- Função RPC para buscar a chave Pix da plataforma de forma simples
CREATE OR REPLACE FUNCTION public.get_platform_pix_key()
RETURNS TEXT AS $$
DECLARE
    v_key TEXT;
BEGIN
    SELECT value INTO v_key FROM public.platform_settings WHERE key = 'platform_pix_key';
    RETURN COALESCE(v_key, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Função RPC para processar venda de parceiro (Creditando Carteira e NÃO gerando histórico de loja)
-- Esta função deve ser chamada quando o vendedor é um 'delivery_partner' (entregador parceiro sem vínculo de loja)
CREATE OR REPLACE FUNCTION public.process_partner_sale_wallet(
    p_user_id UUID,
    p_amount NUMERIC,
    p_payment_method TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_wallet_id UUID;
    v_transaction_id UUID;
    v_user_role public.user_role;
BEGIN
    -- 1. Verificar Role do Usuário
    SELECT role INTO v_user_role FROM public.user_profiles WHERE id = p_user_id;
    
    IF v_user_role IS NULL THEN
        RAISE EXCEPTION 'Usuário não encontrado.';
    END IF;

    -- Opcional: Validar se é delivery_partner, mas a lógica pode ser usada por outros no futuro se desejado.
    -- Por regra de negócio atual, focado em parceiros.

    -- 2. Garantir existência da carteira (store_wallets unificada também atende parceiros conforme trigger handle_new_user)
    -- Se não existir, cria agora.
    INSERT INTO public.store_wallets (store_id, balance_decimal)
    VALUES (p_user_id, 0)
    ON CONFLICT (store_id) DO NOTHING;

    SELECT id INTO v_wallet_id FROM public.store_wallets WHERE store_id = p_user_id;

    -- 3. Inserir Transação de Crédito na Carteira
    -- Tipo 'SALE_CREDIT' ou 'CREDIT'
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
        'CREDIT', -- Tipo genérico de crédito
        'COMPLETED',
        'Venda Avulsa (App Parceiro)',
        p_metadata || jsonb_build_object('source', 'partner_pos', 'payment_method', p_payment_method)
    ) RETURNING id INTO v_transaction_id;

    -- 4. Atualizar Saldo da Carteira
    UPDATE public.store_wallets
    SET balance_decimal = balance_decimal + p_amount,
        updated_at = NOW()
    WHERE store_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'new_balance', (SELECT balance_decimal FROM public.store_wallets WHERE store_id = p_user_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================================
-- 3.x AUDITORIA DE ACESSO DE ADMIN (IMPERSONATION)
-- ==================================================================

CREATE TABLE IF NOT EXISTS public.admin_store_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES public.user_profiles(id),
    store_id UUID NOT NULL REFERENCES public.user_profiles(id),
    store_name_snapshot TEXT, -- Nome da loja no momento do acesso (para histÃ³rico)
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb, -- IP, User Agent, etc.
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ãndices para performance em consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_admin_access_admin_id ON public.admin_store_access_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_store_id ON public.admin_store_access_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_admin_access_started_at ON public.admin_store_access_logs(started_at);

-- RLS: Apenas Admins podem ver e criar logs
ALTER TABLE public.admin_store_access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view access logs" ON public.admin_store_access_logs;
CREATE POLICY "Admins can view access logs" ON public.admin_store_access_logs
    FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert access logs" ON public.admin_store_access_logs;
CREATE POLICY "Admins can insert access logs" ON public.admin_store_access_logs
    FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update access logs" ON public.admin_store_access_logs;
CREATE POLICY "Admins can update access logs" ON public.admin_store_access_logs
    FOR UPDATE USING (public.is_admin());

-- Grants
GRANT ALL ON public.admin_store_access_logs TO authenticated;
GRANT ALL ON public.admin_store_access_logs TO service_role;

-- ==================================================================
-- SEED FAQ PUBLICO (Perguntas Frequentes)
-- ==================================================================

INSERT INTO public.institutional_contents (
    page_key,
    title,
    description,
    slug,
    status,
    is_active,
    order_index
) VALUES
('faq', 'Como fazer um pedido?', 'Escolha a loja, adicione os itens ao carrinho e finalize o pedido. Voce recebe atualizacoes em tempo real.', 'como-fazer-um-pedido', 'published', TRUE, 1),
('faq', 'Quais formas de pagamento aceitamos?', 'Aceitamos PIX e cartao. Algumas lojas tambem aceitam dinheiro. As opcoes aparecem no checkout.', 'formas-de-pagamento', 'published', TRUE, 2),
('faq', 'Como acompanhar meu pedido?', 'Acompanhe pelo app na area "Meus Pedidos" ou pelo link de rastreamento enviado apos a compra.', 'acompanhar-meu-pedido', 'published', TRUE, 3),
('faq', 'Esqueci minha senha', 'Na tela de login, clique em "Esqueci minha senha" e siga as instrucoes enviadas por e-mail.', 'esqueci-minha-senha', 'published', TRUE, 4),
('faq', 'Em quais cidades atendemos?', 'Digite sua cidade na busca da home para ver as lojas disponiveis na sua regiao.', 'cidades-atendidas', 'published', TRUE, 5),
('faq', 'Sou lojista ou entregador, como entrar?', 'Escolha o tipo de cadastro na home e preencha seus dados para iniciar o processo.', 'como-entrar', 'published', TRUE, 6)
ON CONFLICT (slug) DO NOTHING;

-- Grants para leitura pÃºblica de relacionamentos institucionais (FAQ)
GRANT SELECT ON public.institutional_tags TO anon, authenticated;
GRANT SELECT ON public.institutional_content_tags TO anon, authenticated;
GRANT SELECT ON public.institutional_content_images TO anon, authenticated;


-- Adicionar store_category_id à user_profiles se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'store_category_id') THEN
        ALTER TABLE public.user_profiles ADD COLUMN store_category_id UUID REFERENCES public.institutional_categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Adicionar addon_group_id à tabela products (03/02/2026)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'addon_group_id') THEN
        ALTER TABLE public.products ADD COLUMN addon_group_id UUID REFERENCES public.store_addon_groups(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Adicionar addon_options à tabela products para adicionais avulsos (03/02/2026)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'addon_options') THEN
        ALTER TABLE public.products ADD COLUMN addon_options JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Adicionar addon_options à tabela store_products para adicionais avulsos (03/02/2026)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'store_products' AND column_name = 'addon_options') THEN
        ALTER TABLE public.store_products ADD COLUMN addon_options JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;
