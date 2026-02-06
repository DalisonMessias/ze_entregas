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

-- Correção para o Chat (04/02/2026)
-- 1. Adicionar valores faltantes ao enum chat_message_type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.chat_message_type'::regtype AND enumlabel = 'text') THEN
        ALTER TYPE public.chat_message_type ADD VALUE 'text';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.chat_message_type'::regtype AND enumlabel = 'image') THEN
        ALTER TYPE public.chat_message_type ADD VALUE 'image';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.chat_message_type'::regtype AND enumlabel = 'system') THEN
        ALTER TYPE public.chat_message_type ADD VALUE 'system';
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Tornar sender_id opcional na tabela chat_messages para permitir mensagens de convidados
ALTER TABLE public.chat_messages ALTER COLUMN sender_id DROP NOT NULL;

-- ==================================================================
-- Sincronizacao Global (04/02/2026 - Antigravity)
-- ==================================================================

-- 1. ENUMS FALTANTES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ze_assistant_rule_type') THEN
        CREATE TYPE public.ze_assistant_rule_type AS ENUM ('CUSTOM', 'DELIVERY_STATUS', 'CREATE_ORDER', 'CATALOG_INFO', 'GREETING', 'OFF_HOURS');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. NOVAS TABELAS

-- city_store_banner_assets
CREATE TABLE IF NOT EXISTS public.city_store_banner_assets (
  id text NOT NULL DEFAULT '1'::text,
  template_link text,
  canva_link text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banner_assets_pkey PRIMARY KEY (id)
);
ALTER TABLE public.city_store_banner_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access to banner assets" ON public.city_store_banner_assets;
CREATE POLICY "Public read access to banner assets" ON public.city_store_banner_assets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage banner assets" ON public.city_store_banner_assets;
CREATE POLICY "Admins manage banner assets" ON public.city_store_banner_assets FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_city_store_banner_assets_updated_at ON public.city_store_banner_assets;
CREATE TRIGGER handle_city_store_banner_assets_updated_at BEFORE UPDATE ON public.city_store_banner_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- city_store_banner_requests
CREATE TABLE IF NOT EXISTS public.city_store_banner_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
	  store_id uuid NOT NULL,
	  city_slug text NOT NULL,
	  request_type text NOT NULL,
	  topic text NOT NULL DEFAULT 'BANNER'::text,
	  status text NOT NULL DEFAULT 'OPEN'::text,
  banner_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banner_requests_pkey PRIMARY KEY (id),
  CONSTRAINT city_store_banner_requests_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
ALTER TABLE public.city_store_banner_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own banner requests" ON public.city_store_banner_requests;
CREATE POLICY "Users manage own banner requests" ON public.city_store_banner_requests FOR ALL USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins view all banner requests" ON public.city_store_banner_requests;
CREATE POLICY "Admins view all banner requests" ON public.city_store_banner_requests FOR SELECT USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_city_store_banner_requests_updated_at ON public.city_store_banner_requests;
CREATE TRIGGER handle_city_store_banner_requests_updated_at BEFORE UPDATE ON public.city_store_banner_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- city_store_banner_request_messages
CREATE TABLE IF NOT EXISTS public.city_store_banner_request_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  sender_id uuid,
  sender_role text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banner_request_messages_pkey PRIMARY KEY (id),
  CONSTRAINT city_store_banner_request_messages_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.city_store_banner_requests(id),
  CONSTRAINT city_store_banner_request_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id)
);
ALTER TABLE public.city_store_banner_request_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view messages for own request" ON public.city_store_banner_request_messages;
CREATE POLICY "Users view messages for own request" ON public.city_store_banner_request_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.city_store_banner_requests r WHERE r.id = request_id AND r.store_id = auth.uid()));
DROP POLICY IF EXISTS "Admins manage all messages" ON public.city_store_banner_request_messages;
CREATE POLICY "Admins manage all messages" ON public.city_store_banner_request_messages FOR ALL USING (public.is_admin());

-- city_store_banners
CREATE TABLE IF NOT EXISTS public.city_store_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  name text NOT NULL,
  image_url text NOT NULL,
  link text,
  is_active boolean DEFAULT true,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banners_pkey PRIMARY KEY (id)
);
ALTER TABLE public.city_store_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active banners" ON public.city_store_banners;
CREATE POLICY "Public read active banners" ON public.city_store_banners FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage banners" ON public.city_store_banners;
CREATE POLICY "Admins manage banners" ON public.city_store_banners FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_city_store_banners_updated_at ON public.city_store_banners;
CREATE TRIGGER handle_city_store_banners_updated_at BEFORE UPDATE ON public.city_store_banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- city_store_highlight_orders
CREATE TABLE IF NOT EXISTS public.city_store_highlight_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  city_slug text NOT NULL,
  amount_paid numeric NOT NULL,
  duration_days integer NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_highlight_orders_pkey PRIMARY KEY (id),
  CONSTRAINT city_store_highlight_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
ALTER TABLE public.city_store_highlight_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own highlight orders" ON public.city_store_highlight_orders;
CREATE POLICY "Users view own highlight orders" ON public.city_store_highlight_orders FOR SELECT USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins manage highlight orders" ON public.city_store_highlight_orders;
CREATE POLICY "Admins manage highlight orders" ON public.city_store_highlight_orders FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_city_store_highlight_orders_updated_at ON public.city_store_highlight_orders;
CREATE TRIGGER handle_city_store_highlight_orders_updated_at BEFORE UPDATE ON public.city_store_highlight_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- city_store_highlight_settings
CREATE TABLE IF NOT EXISTS public.city_store_highlight_settings (
  id text NOT NULL DEFAULT '1'::text,
  highlight_price numeric NOT NULL DEFAULT 99.00,
  highlight_duration_days integer NOT NULL DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  cancel_fee numeric NOT NULL DEFAULT 0.00,
  CONSTRAINT city_store_highlight_settings_pkey PRIMARY KEY (id)
);
ALTER TABLE public.city_store_highlight_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read highlight settings" ON public.city_store_highlight_settings;
CREATE POLICY "Public read highlight settings" ON public.city_store_highlight_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage highlight settings" ON public.city_store_highlight_settings;
CREATE POLICY "Admins manage highlight settings" ON public.city_store_highlight_settings FOR ALL USING (public.is_admin());
	DROP TRIGGER IF EXISTS handle_city_store_highlight_settings_updated_at ON public.city_store_highlight_settings;
	CREATE TRIGGER handle_city_store_highlight_settings_updated_at BEFORE UPDATE ON public.city_store_highlight_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

	-- Funcoes: destaque por cidade
	CREATE OR REPLACE FUNCTION public.purchase_city_store_highlight(p_city_slug text, p_days integer)
	RETURNS JSONB
	LANGUAGE plpgsql
	SECURITY DEFINER
	AS $$
	DECLARE
	  v_user uuid := auth.uid();
	  v_price numeric;
	  v_base_days integer;
	  v_balance numeric;
	  v_start timestamptz;
	  v_end timestamptz;
	  v_order_id uuid;
	  v_status text := 'ACTIVE';
	  v_last_end timestamptz;
	BEGIN
	  IF v_user IS NULL THEN
	    RAISE EXCEPTION 'Not authenticated';
	  END IF;

	  IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
	    RAISE EXCEPTION 'Invalid days';
	  END IF;

	  SELECT highlight_price, highlight_duration_days
	    INTO v_price, v_base_days
	  FROM public.city_store_highlight_settings
	  ORDER BY updated_at DESC
	  LIMIT 1;

	  IF v_price IS NULL OR v_base_days IS NULL OR v_base_days = 0 THEN
	    RAISE EXCEPTION 'Highlight settings not configured';
	  END IF;

	  v_price := ROUND((v_price / v_base_days) * p_days, 2);

	  SELECT balance_decimal INTO v_balance
	  FROM public.store_wallets
	  WHERE store_id = v_user
	  FOR UPDATE;

	  IF v_balance IS NULL OR v_balance < v_price THEN
	    RAISE EXCEPTION 'Saldo insuficiente';
	  END IF;

	  SELECT ends_at INTO v_last_end
	  FROM public.city_store_highlight_orders
	  WHERE store_id = v_user
	    AND city_slug = p_city_slug
	    AND status IN ('ACTIVE','SCHEDULED')
	  ORDER BY ends_at DESC
	  LIMIT 1;

	  IF v_last_end IS NOT NULL AND v_last_end > now() THEN
	    v_start := v_last_end;
	    v_status := 'SCHEDULED';
	  ELSE
	    v_start := now();
	    v_status := 'ACTIVE';
	  END IF;

	  v_end := v_start + (p_days::text || ' days')::interval;

	  INSERT INTO public.city_store_highlight_orders (
	    store_id, city_slug, amount_paid, duration_days, starts_at, ends_at, status
	  ) VALUES (
	    v_user, p_city_slug, v_price, p_days, v_start, v_end, v_status
	  ) RETURNING id INTO v_order_id;

	  INSERT INTO public.store_wallet_transactions (store_id, amount, description, type, status)
	  VALUES (v_user, -ABS(v_price), 'Destaque por cidade', 'DEBIT', 'COMPLETED');

	  UPDATE public.store_wallets
	  SET balance_decimal = balance_decimal - ABS(v_price),
	      updated_at = now()
	  WHERE store_id = v_user;

	  RETURN jsonb_build_object('order_id', v_order_id, 'amount', v_price, 'status', v_status);
	END;
	$$;

	CREATE OR REPLACE FUNCTION public.cancel_city_store_highlight(p_order_id uuid)
	RETURNS JSONB
	LANGUAGE plpgsql
	SECURITY DEFINER
	AS $$
	DECLARE
	  v_user uuid := auth.uid();
	  v_order RECORD;
	  v_fee_percent numeric;
	  v_fee_amount numeric;
	  v_balance numeric;
	BEGIN
	  IF v_user IS NULL THEN
	    RAISE EXCEPTION 'Not authenticated';
	  END IF;

	  SELECT * INTO v_order
	  FROM public.city_store_highlight_orders
	  WHERE id = p_order_id AND store_id = v_user;

	  IF NOT FOUND THEN
	    RAISE EXCEPTION 'Highlight order not found';
	  END IF;

	  IF v_order.status NOT IN ('ACTIVE','SCHEDULED') THEN
	    RAISE EXCEPTION 'Order cannot be cancelled';
	  END IF;

	  SELECT cancel_fee INTO v_fee_percent
	  FROM public.city_store_highlight_settings
	  ORDER BY updated_at DESC
	  LIMIT 1;

	  v_fee_percent := COALESCE(v_fee_percent, 0);
	  v_fee_amount := ROUND((v_order.amount_paid * (v_fee_percent / 100)), 2);

	  SELECT balance_decimal INTO v_balance
	  FROM public.store_wallets
	  WHERE store_id = v_user
	  FOR UPDATE;

	  IF v_balance IS NULL OR v_balance < v_fee_amount THEN
	    RAISE EXCEPTION 'Saldo insuficiente';
	  END IF;

	  UPDATE public.city_store_highlight_orders
	  SET status = 'CANCELLED',
	      updated_at = now()
	  WHERE id = p_order_id;

	  IF v_fee_amount > 0 THEN
	    INSERT INTO public.store_wallet_transactions (store_id, amount, description, type, status)
	    VALUES (v_user, -ABS(v_fee_amount), 'Taxa de cancelamento destaque por cidade', 'DEBIT', 'COMPLETED');

	    UPDATE public.store_wallets
	    SET balance_decimal = balance_decimal - ABS(v_fee_amount),
	        updated_at = now()
	    WHERE store_id = v_user;
	  END IF;

	  RETURN jsonb_build_object('order_id', p_order_id, 'fee', v_fee_amount);
	END;
	$$;

	GRANT EXECUTE ON FUNCTION public.purchase_city_store_highlight(text, integer) TO authenticated;
	GRANT EXECUTE ON FUNCTION public.cancel_city_store_highlight(uuid) TO authenticated;
	
	-- 3. COLUNAS FALTANTES EM TABELAS EXISTENTES
	DO $$ 
	BEGIN
	    -- available_cities
	    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'available_cities' AND column_name = 'ibge_code') THEN
	        ALTER TABLE public.available_cities ADD COLUMN ibge_code text;
	    END IF;

	    -- city_store_banner_requests
	    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_store_banner_requests' AND column_name = 'topic') THEN
	        ALTER TABLE public.city_store_banner_requests ADD COLUMN topic text NOT NULL DEFAULT 'BANNER';
	    END IF;

    -- partner_fee_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_fee_settings' AND column_name = 'pos_min_value') THEN
        ALTER TABLE public.partner_fee_settings ADD COLUMN pos_min_value numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_fee_settings' AND column_name = 'pos_max_value') THEN
        ALTER TABLE public.partner_fee_settings ADD COLUMN pos_max_value numeric;
    END IF;

    -- api_keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'name') THEN
        ALTER TABLE public.api_keys ADD COLUMN name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_token') THEN
        ALTER TABLE public.api_keys ADD COLUMN key_token text;
    END IF;

    -- orders_tickets
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_tickets' AND column_name = 'general_order_id') THEN
        ALTER TABLE public.orders_tickets ADD COLUMN general_order_id uuid REFERENCES public.orders(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_tickets' AND column_name = 'payment_status') THEN
        ALTER TABLE public.orders_tickets ADD COLUMN payment_status text DEFAULT 'pending'::text;
    END IF;

    -- user_terminals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminals' AND column_name = 'pin_code') THEN
        ALTER TABLE public.user_terminals ADD COLUMN pin_code text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminals' AND column_name = 'auto_lock_minutes') THEN
        ALTER TABLE public.user_terminals ADD COLUMN auto_lock_minutes integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminals' AND column_name = 'fee_payer') THEN
        ALTER TABLE public.user_terminals ADD COLUMN fee_payer public.fee_payer_type DEFAULT 'MERCHANT'::public.fee_payer_type;
    END IF;

    -- user_terminal_transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'type') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN type text DEFAULT 'SALE'::text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'method') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN method text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'payer_id') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN payer_id uuid REFERENCES public.user_profiles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'description') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN description text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'payer_name') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN payer_name text;
    END IF;

    -- ze_assistant_rules
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_rules' AND column_name = 'rule_type') THEN
        ALTER TABLE public.ze_assistant_rules ADD COLUMN rule_type public.ze_assistant_rule_type NOT NULL DEFAULT 'CUSTOM'::public.ze_assistant_rule_type;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_rules' AND column_name = 'variables') THEN
        ALTER TABLE public.ze_assistant_rules ADD COLUMN variables jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- ze_assistant_conversations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'customer_name') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN customer_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'customer_phone') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN customer_phone text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'handoff_to_human') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN handoff_to_human boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'handoff_at') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN handoff_at timestamp with time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'handoff_reason') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN handoff_reason text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'summary') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN summary text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'last_interaction_at') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN last_interaction_at timestamp with time zone DEFAULT now();
    END IF;

END $$;

-- 4. TABELAS ADICIONAIS (CUPONS E SEGUROS)

-- coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['FIXED'::text, 'PERCENTAGE'::text, 'FREE_SHIPPING'::text])),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  max_discount_value numeric,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  user_usage_limit integer,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_platform_coupon boolean DEFAULT false,
  created_by uuid,
  CONSTRAINT coupons_pkey PRIMARY KEY (id),
  CONSTRAINT coupons_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT coupons_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Stores manage own coupons" ON public.coupons;
CREATE POLICY "Stores manage own coupons" ON public.coupons FOR ALL USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins manage all coupons" ON public.coupons;
CREATE POLICY "Admins manage all coupons" ON public.coupons FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_coupons_updated_at ON public.coupons;
CREATE TRIGGER handle_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- insurance_partners
CREATE TABLE IF NOT EXISTS public.insurance_partners (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_partners_pkey PRIMARY KEY (id)
);
ALTER TABLE public.insurance_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read insurance partners" ON public.insurance_partners;
CREATE POLICY "Public read insurance partners" ON public.insurance_partners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage insurance partners" ON public.insurance_partners;
CREATE POLICY "Admins manage insurance partners" ON public.insurance_partners FOR ALL USING (public.is_admin());

-- insurance_plans
CREATE TABLE IF NOT EXISTS public.insurance_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  price_mensal numeric NOT NULL,
  features text[] DEFAULT '{}'::text[],
  is_popular boolean DEFAULT false,
  is_active boolean DEFAULT true,
  deductible_percent numeric DEFAULT 0,
  deductible_info text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_plans_pkey PRIMARY KEY (id)
);
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read insurance plans" ON public.insurance_plans;
CREATE POLICY "Public read insurance plans" ON public.insurance_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage insurance plans" ON public.insurance_plans;
CREATE POLICY "Admins manage insurance plans" ON public.insurance_plans FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_insurance_plans_updated_at ON public.insurance_plans;
CREATE TRIGGER handle_insurance_plans_updated_at BEFORE UPDATE ON public.insurance_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- insurance_referral_requests
CREATE TABLE IF NOT EXISTS public.insurance_referral_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  city text NOT NULL,
  recommended_company text NOT NULL,
  status text DEFAULT 'PENDING'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_referral_requests_pkey PRIMARY KEY (id),
  CONSTRAINT insurance_referral_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
ALTER TABLE public.insurance_referral_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own referral requests" ON public.insurance_referral_requests;
CREATE POLICY "Users view own referral requests" ON public.insurance_referral_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage referral requests" ON public.insurance_referral_requests;
CREATE POLICY "Admins manage referral requests" ON public.insurance_referral_requests FOR ALL USING (public.is_admin());

-- insurance_subscriptions
CREATE TABLE IF NOT EXISTS public.insurance_subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status text DEFAULT 'ACTIVE'::text,
  start_date timestamp with time zone,
  next_billing_date timestamp with time zone,
  auto_renew boolean DEFAULT true,
  payment_method_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT insurance_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT insurance_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.insurance_plans(id)
);
ALTER TABLE public.insurance_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.insurance_subscriptions;
CREATE POLICY "Users view own subscriptions" ON public.insurance_subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.insurance_subscriptions;
CREATE POLICY "Admins manage subscriptions" ON public.insurance_subscriptions FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_insurance_subscriptions_updated_at ON public.insurance_subscriptions;
CREATE TRIGGER handle_insurance_subscriptions_updated_at BEFORE UPDATE ON public.insurance_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. COLUNAS ADICIONAIS FALTANTES
DO $$ 
BEGIN
    -- ze_assistant_config
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_config' AND column_name = 'whatsapp_sort_preference') THEN
        ALTER TABLE public.ze_assistant_config ADD COLUMN whatsapp_sort_preference text DEFAULT 'recent'::text;
    END IF;
END $$;

-- 6. TABELAS DE PROMOÇÕES E COMPLEMENTOS

-- store_addon_groups
CREATE TABLE IF NOT EXISTS public.store_addon_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['SINGLE'::text, 'MULTIPLE'::text])),
  min integer NOT NULL DEFAULT 0,
  max integer NOT NULL DEFAULT 1,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_addon_groups_pkey PRIMARY KEY (id),
  CONSTRAINT store_addon_groups_store_id_fkey FOREIGN KEY (store_id) REFERENCES auth.users(id)
);
ALTER TABLE public.store_addon_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores manage own addon groups" ON public.store_addon_groups;
CREATE POLICY "Stores manage own addon groups" ON public.store_addon_groups FOR ALL USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins manage all addon groups" ON public.store_addon_groups;
CREATE POLICY "Admins manage all addon groups" ON public.store_addon_groups FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_store_addon_groups_updated_at ON public.store_addon_groups;
CREATE TRIGGER handle_store_addon_groups_updated_at BEFORE UPDATE ON public.store_addon_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- store_addons
CREATE TABLE IF NOT EXISTS public.store_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_addons_pkey PRIMARY KEY (id),
  CONSTRAINT store_addons_store_id_fkey FOREIGN KEY (store_id) REFERENCES auth.users(id)
);
ALTER TABLE public.store_addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores manage own addons" ON public.store_addons;
CREATE POLICY "Stores manage own addons" ON public.store_addons FOR ALL USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins manage all addons" ON public.store_addons;
CREATE POLICY "Admins manage all addons" ON public.store_addons FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_store_addons_updated_at ON public.store_addons;
CREATE TRIGGER handle_store_addons_updated_at BEFORE UPDATE ON public.store_addons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- promotions
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['FIXED'::text, 'PERCENTAGE'::text, 'FREE_SHIPPING'::text])),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  applies_to_all_products boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotions_pkey PRIMARY KEY (id),
  CONSTRAINT promotions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores manage own promotions" ON public.promotions;
CREATE POLICY "Stores manage own promotions" ON public.promotions FOR ALL USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins manage all promotions" ON public.promotions;
CREATE POLICY "Admins manage all promotions" ON public.promotions FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_promotions_updated_at ON public.promotions;
CREATE TRIGGER handle_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- promotion_products
CREATE TABLE IF NOT EXISTS public.promotion_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotion_products_pkey PRIMARY KEY (id),
  CONSTRAINT promotion_products_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id),
  CONSTRAINT promotion_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.store_products(id)
);
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores manage own promotion products" ON public.promotion_products;
CREATE POLICY "Stores manage own promotion products" ON public.promotion_products FOR ALL USING (EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.store_id = auth.uid()));

-- shop_platform_categories
CREATE TABLE IF NOT EXISTS public.shop_platform_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shop_platform_categories_pkey PRIMARY KEY (id)
);
ALTER TABLE public.shop_platform_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read shop categories" ON public.shop_platform_categories;
CREATE POLICY "Public read shop categories" ON public.shop_platform_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage shop categories" ON public.shop_platform_categories;
CREATE POLICY "Admins manage shop categories" ON public.shop_platform_categories FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_shop_platform_categories_updated_at ON public.shop_platform_categories;
CREATE TRIGGER handle_shop_platform_categories_updated_at BEFORE UPDATE ON public.shop_platform_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- shop_platform_products
CREATE TABLE IF NOT EXISTS public.shop_platform_products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  price numeric NOT NULL,
  category_id uuid,
  images text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  stock_quantity integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shop_platform_products_pkey PRIMARY KEY (id),
  CONSTRAINT shop_platform_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.shop_platform_categories(id)
);
ALTER TABLE public.shop_platform_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read shop products" ON public.shop_platform_products;
CREATE POLICY "Public read shop products" ON public.shop_platform_products FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage shop products" ON public.shop_platform_products;
CREATE POLICY "Admins manage shop products" ON public.shop_platform_products FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_shop_platform_products_updated_at ON public.shop_platform_products;
CREATE TRIGGER handle_shop_platform_products_updated_at BEFORE UPDATE ON public.shop_platform_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================================================================
-- [REPAIR SCRIPT] GARANTIR CARTEIRAS ZEBANK PARA TODOS OS PARCEIROS
-- ==================================================================
DO $$
BEGIN
    -- 1. Carteiras de Entregador/Pessoal - AGORA INCLUI LOJISTAS
    INSERT INTO public.driver_wallets (driver_id, balance_decimal, savings_balance_decimal)
    SELECT id, 0, 0
    FROM public.user_profiles
    WHERE role IN ('delivery_partner', 'delivery_person', 'store_partner')
    ON CONFLICT (driver_id) DO NOTHING;

    -- 2. Carteiras de Vendas/Loja - Apenas para Lojistas
    INSERT INTO public.store_wallets (store_id, balance_decimal)
    SELECT id, 0
    FROM public.user_profiles
    WHERE role IN ('store_partner')
    ON CONFLICT (store_id) DO NOTHING;
END $$;

-- ==================================================================
-- 10.x SISTEMA DE SEGUROS
-- ==================================================================

-- Tabela de Parceiros de Seguros (Seguradoras)
CREATE TABLE IF NOT EXISTS public.insurance_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insurance_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read insurance partners" ON public.insurance_partners;
CREATE POLICY "Public read insurance partners" ON public.insurance_partners FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage insurance partners" ON public.insurance_partners;
CREATE POLICY "Admins manage insurance partners" ON public.insurance_partners FOR ALL USING (public.is_admin());

-- Tabela de Planos de Seguros
CREATE TABLE IF NOT EXISTS public.insurance_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.insurance_partners(id),
    title TEXT NOT NULL,
    description TEXT,
    price_mensal NUMERIC(15, 2) NOT NULL,
    features TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    deductible_percent NUMERIC(5, 2),
    deductible_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read insurance plans" ON public.insurance_plans;
CREATE POLICY "Public read insurance plans" ON public.insurance_plans FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage insurance plans" ON public.insurance_plans;
CREATE POLICY "Admins manage insurance plans" ON public.insurance_plans FOR ALL USING (public.is_admin());

-- Tabela de Assinaturas de Seguros
CREATE TABLE IF NOT EXISTS public.insurance_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    plan_id UUID REFERENCES public.insurance_plans(id) NOT NULL,
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'CANCELLED', 'EXPIRED'
    payment_method TEXT NOT NULL, -- 'WALLET', 'CARD'
    next_billing_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insurance_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.insurance_subscriptions;
CREATE POLICY "Users view own subscriptions" ON public.insurance_subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all subscriptions" ON public.insurance_subscriptions;
CREATE POLICY "Admins view all subscriptions" ON public.insurance_subscriptions FOR SELECT USING (public.is_admin());

-- Tabela de Indicações de Seguros
CREATE TABLE IF NOT EXISTS public.insurance_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id),
    city TEXT NOT NULL,
    company_name TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insurance_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage referrals" ON public.insurance_referrals;
CREATE POLICY "Admins manage referrals" ON public.insurance_referrals FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Users can insert referrals" ON public.insurance_referrals;
CREATE POLICY "Users can insert referrals" ON public.insurance_referrals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Triggers para updated_at
DROP TRIGGER IF EXISTS handle_insurance_partners_updated_at ON public.insurance_partners;
CREATE TRIGGER handle_insurance_partners_updated_at BEFORE UPDATE ON public.insurance_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS handle_insurance_plans_updated_at ON public.insurance_plans;
CREATE TRIGGER handle_insurance_plans_updated_at BEFORE UPDATE ON public.insurance_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS handle_insurance_subscriptions_updated_at ON public.insurance_subscriptions;
CREATE TRIGGER handle_insurance_subscriptions_updated_at BEFORE UPDATE ON public.insurance_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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

-- Removendo assinatura antiga para evitar conflitos de overload (06/02/2026)
DROP FUNCTION IF EXISTS public.admin_adjust_balance(UUID, NUMERIC, TEXT);

-- Funﾃｧﾃ｣o: admin_adjust_balance (Atualizada em 06/02/2026 para suportar Pessoal vs Corporativo)
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
    p_user_id UUID, 
    p_amount NUMERIC, 
    p_reason TEXT,
    p_wallet_type TEXT DEFAULT 'CORPORATE' -- 'PERSONAL' ou 'CORPORATE'
)
RETURNS JSONB AS $$
DECLARE
    v_user_role public.user_role;
    v_success BOOLEAN := FALSE;
    v_message TEXT;
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Permission denied.');
    END IF;

    SELECT role INTO v_user_role FROM public.user_profiles WHERE id = p_user_id;

    IF p_wallet_type = 'PERSONAL' THEN
        -- Ajuste na Carteira Pessoal (driver_wallets / ZeBank)
        INSERT INTO public.driver_wallets (driver_id, balance_decimal)
        VALUES (p_user_id, p_amount)
        ON CONFLICT (driver_id) DO UPDATE
        SET balance_decimal = public.driver_wallets.balance_decimal + p_amount;

        INSERT INTO public.driver_wallet_transactions (driver_id, amount, description, type, status)
        VALUES (p_user_id, p_amount, 'Ajuste administrativo (Pessoal): ' || p_reason, 'ADJUSTMENT', 'COMPLETED');
        
        v_success := TRUE;
        v_message := 'Saldo pessoal ajustado com sucesso.';
    
    ELSIF p_wallet_type = 'CORPORATE' THEN
        -- Ajuste na Carteira Corporativa (store_wallets / ZePay)
        IF v_user_role != 'store_partner' THEN
            RETURN jsonb_build_object('success', false, 'message', 'Apenas lojistas possuem carteira corporativa.');
        END IF;

        INSERT INTO public.store_wallets (store_id, balance_decimal)
        VALUES (p_user_id, p_amount)
        ON CONFLICT (store_id) DO UPDATE
        SET balance_decimal = public.store_wallets.balance_decimal + p_amount;

        INSERT INTO public.store_wallet_transactions (store_id, amount, description, type, status)
        VALUES (p_user_id, p_amount, 'Ajuste administrativo (Corporativo): ' || p_reason, 'ADJUSTMENT', 'COMPLETED');
        
        v_success := TRUE;
        v_message := 'Saldo corporativo ajustado com sucesso.';
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Tipo de carteira inválido. Use PERSONAL ou CORPORATE.');
    END IF;

    RETURN jsonb_build_object('success', v_success, 'message', v_message);
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

-- Correção para o Chat (04/02/2026)
-- 1. Adicionar valores faltantes ao enum chat_message_type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.chat_message_type'::regtype AND enumlabel = 'text') THEN
        ALTER TYPE public.chat_message_type ADD VALUE 'text';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.chat_message_type'::regtype AND enumlabel = 'image') THEN
        ALTER TYPE public.chat_message_type ADD VALUE 'image';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = 'public.chat_message_type'::regtype AND enumlabel = 'system') THEN
        ALTER TYPE public.chat_message_type ADD VALUE 'system';
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Tornar sender_id opcional na tabela chat_messages para permitir mensagens de convidados
ALTER TABLE public.chat_messages ALTER COLUMN sender_id DROP NOT NULL;

-- ==================================================================
-- Sincronizacao Global (04/02/2026 - Antigravity)
-- ==================================================================

-- 1. ENUMS FALTANTES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ze_assistant_rule_type') THEN
        CREATE TYPE public.ze_assistant_rule_type AS ENUM ('CUSTOM', 'DELIVERY_STATUS', 'CREATE_ORDER', 'CATALOG_INFO', 'GREETING', 'OFF_HOURS');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. NOVAS TABELAS

-- city_store_banner_assets
CREATE TABLE IF NOT EXISTS public.city_store_banner_assets (
  id text NOT NULL DEFAULT '1'::text,
  template_link text,
  canva_link text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banner_assets_pkey PRIMARY KEY (id)
);
ALTER TABLE public.city_store_banner_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access to banner assets" ON public.city_store_banner_assets;
CREATE POLICY "Public read access to banner assets" ON public.city_store_banner_assets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage banner assets" ON public.city_store_banner_assets;
CREATE POLICY "Admins manage banner assets" ON public.city_store_banner_assets FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_city_store_banner_assets_updated_at ON public.city_store_banner_assets;
CREATE TRIGGER handle_city_store_banner_assets_updated_at BEFORE UPDATE ON public.city_store_banner_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- city_store_banner_requests
CREATE TABLE IF NOT EXISTS public.city_store_banner_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
	  store_id uuid NOT NULL,
	  city_slug text NOT NULL,
	  request_type text NOT NULL,
	  topic text NOT NULL DEFAULT 'BANNER'::text,
	  status text NOT NULL DEFAULT 'OPEN'::text,
  banner_url text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banner_requests_pkey PRIMARY KEY (id),
  CONSTRAINT city_store_banner_requests_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
ALTER TABLE public.city_store_banner_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own banner requests" ON public.city_store_banner_requests;
CREATE POLICY "Users manage own banner requests" ON public.city_store_banner_requests FOR ALL USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins view all banner requests" ON public.city_store_banner_requests;
CREATE POLICY "Admins view all banner requests" ON public.city_store_banner_requests FOR SELECT USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_city_store_banner_requests_updated_at ON public.city_store_banner_requests;
CREATE TRIGGER handle_city_store_banner_requests_updated_at BEFORE UPDATE ON public.city_store_banner_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- city_store_banner_request_messages
CREATE TABLE IF NOT EXISTS public.city_store_banner_request_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL,
  sender_id uuid,
  sender_role text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banner_request_messages_pkey PRIMARY KEY (id),
  CONSTRAINT city_store_banner_request_messages_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.city_store_banner_requests(id),
  CONSTRAINT city_store_banner_request_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.user_profiles(id)
);
ALTER TABLE public.city_store_banner_request_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view messages for own request" ON public.city_store_banner_request_messages;
CREATE POLICY "Users view messages for own request" ON public.city_store_banner_request_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.city_store_banner_requests r WHERE r.id = request_id AND r.store_id = auth.uid()));
DROP POLICY IF EXISTS "Admins manage all messages" ON public.city_store_banner_request_messages;
CREATE POLICY "Admins manage all messages" ON public.city_store_banner_request_messages FOR ALL USING (public.is_admin());

-- city_store_banners
CREATE TABLE IF NOT EXISTS public.city_store_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  city_slug text NOT NULL,
  name text NOT NULL,
  image_url text NOT NULL,
  link text,
  is_active boolean DEFAULT true,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_banners_pkey PRIMARY KEY (id)
);
ALTER TABLE public.city_store_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active banners" ON public.city_store_banners;
CREATE POLICY "Public read active banners" ON public.city_store_banners FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage banners" ON public.city_store_banners;
CREATE POLICY "Admins manage banners" ON public.city_store_banners FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_city_store_banners_updated_at ON public.city_store_banners;
CREATE TRIGGER handle_city_store_banners_updated_at BEFORE UPDATE ON public.city_store_banners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- city_store_highlight_orders
CREATE TABLE IF NOT EXISTS public.city_store_highlight_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  city_slug text NOT NULL,
  amount_paid numeric NOT NULL,
  duration_days integer NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT city_store_highlight_orders_pkey PRIMARY KEY (id),
  CONSTRAINT city_store_highlight_orders_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
ALTER TABLE public.city_store_highlight_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own highlight orders" ON public.city_store_highlight_orders;
CREATE POLICY "Users view own highlight orders" ON public.city_store_highlight_orders FOR SELECT USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins manage highlight orders" ON public.city_store_highlight_orders;
CREATE POLICY "Admins manage highlight orders" ON public.city_store_highlight_orders FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_city_store_highlight_orders_updated_at ON public.city_store_highlight_orders;
CREATE TRIGGER handle_city_store_highlight_orders_updated_at BEFORE UPDATE ON public.city_store_highlight_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- city_store_highlight_settings
CREATE TABLE IF NOT EXISTS public.city_store_highlight_settings (
  id text NOT NULL DEFAULT '1'::text,
  highlight_price numeric NOT NULL DEFAULT 99.00,
  highlight_duration_days integer NOT NULL DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  cancel_fee numeric NOT NULL DEFAULT 0.00,
  CONSTRAINT city_store_highlight_settings_pkey PRIMARY KEY (id)
);
ALTER TABLE public.city_store_highlight_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read highlight settings" ON public.city_store_highlight_settings;
CREATE POLICY "Public read highlight settings" ON public.city_store_highlight_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage highlight settings" ON public.city_store_highlight_settings;
CREATE POLICY "Admins manage highlight settings" ON public.city_store_highlight_settings FOR ALL USING (public.is_admin());
	DROP TRIGGER IF EXISTS handle_city_store_highlight_settings_updated_at ON public.city_store_highlight_settings;
	CREATE TRIGGER handle_city_store_highlight_settings_updated_at BEFORE UPDATE ON public.city_store_highlight_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

	-- Funcoes: destaque por cidade
	CREATE OR REPLACE FUNCTION public.purchase_city_store_highlight(p_city_slug text, p_days integer)
	RETURNS JSONB
	LANGUAGE plpgsql
	SECURITY DEFINER
	AS $$
	DECLARE
	  v_user uuid := auth.uid();
	  v_price numeric;
	  v_base_days integer;
	  v_balance numeric;
	  v_start timestamptz;
	  v_end timestamptz;
	  v_order_id uuid;
	  v_status text := 'ACTIVE';
	  v_last_end timestamptz;
	BEGIN
	  IF v_user IS NULL THEN
	    RAISE EXCEPTION 'Not authenticated';
	  END IF;

	  IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
	    RAISE EXCEPTION 'Invalid days';
	  END IF;

	  SELECT highlight_price, highlight_duration_days
	    INTO v_price, v_base_days
	  FROM public.city_store_highlight_settings
	  ORDER BY updated_at DESC
	  LIMIT 1;

	  IF v_price IS NULL OR v_base_days IS NULL OR v_base_days = 0 THEN
	    RAISE EXCEPTION 'Highlight settings not configured';
	  END IF;

	  v_price := ROUND((v_price / v_base_days) * p_days, 2);

	  SELECT balance_decimal INTO v_balance
	  FROM public.store_wallets
	  WHERE store_id = v_user
	  FOR UPDATE;

	  IF v_balance IS NULL OR v_balance < v_price THEN
	    RAISE EXCEPTION 'Saldo insuficiente';
	  END IF;

	  SELECT ends_at INTO v_last_end
	  FROM public.city_store_highlight_orders
	  WHERE store_id = v_user
	    AND city_slug = p_city_slug
	    AND status IN ('ACTIVE','SCHEDULED')
	  ORDER BY ends_at DESC
	  LIMIT 1;

	  IF v_last_end IS NOT NULL AND v_last_end > now() THEN
	    v_start := v_last_end;
	    v_status := 'SCHEDULED';
	  ELSE
	    v_start := now();
	    v_status := 'ACTIVE';
	  END IF;

	  v_end := v_start + (p_days::text || ' days')::interval;

	  INSERT INTO public.city_store_highlight_orders (
	    store_id, city_slug, amount_paid, duration_days, starts_at, ends_at, status
	  ) VALUES (
	    v_user, p_city_slug, v_price, p_days, v_start, v_end, v_status
	  ) RETURNING id INTO v_order_id;

	  INSERT INTO public.store_wallet_transactions (store_id, amount, description, type, status)
	  VALUES (v_user, -ABS(v_price), 'Destaque por cidade', 'DEBIT', 'COMPLETED');

	  UPDATE public.store_wallets
	  SET balance_decimal = balance_decimal - ABS(v_price),
	      updated_at = now()
	  WHERE store_id = v_user;

	  RETURN jsonb_build_object('order_id', v_order_id, 'amount', v_price, 'status', v_status);
	END;
	$$;

	CREATE OR REPLACE FUNCTION public.cancel_city_store_highlight(p_order_id uuid)
	RETURNS JSONB
	LANGUAGE plpgsql
	SECURITY DEFINER
	AS $$
	DECLARE
	  v_user uuid := auth.uid();
	  v_order RECORD;
	  v_fee_percent numeric;
	  v_fee_amount numeric;
	  v_balance numeric;
	BEGIN
	  IF v_user IS NULL THEN
	    RAISE EXCEPTION 'Not authenticated';
	  END IF;

	  SELECT * INTO v_order
	  FROM public.city_store_highlight_orders
	  WHERE id = p_order_id AND store_id = v_user;

	  IF NOT FOUND THEN
	    RAISE EXCEPTION 'Highlight order not found';
	  END IF;

	  IF v_order.status NOT IN ('ACTIVE','SCHEDULED') THEN
	    RAISE EXCEPTION 'Order cannot be cancelled';
	  END IF;

	  SELECT cancel_fee INTO v_fee_percent
	  FROM public.city_store_highlight_settings
	  ORDER BY updated_at DESC
	  LIMIT 1;

	  v_fee_percent := COALESCE(v_fee_percent, 0);
	  v_fee_amount := ROUND((v_order.amount_paid * (v_fee_percent / 100)), 2);

	  SELECT balance_decimal INTO v_balance
	  FROM public.store_wallets
	  WHERE store_id = v_user
	  FOR UPDATE;

	  IF v_balance IS NULL OR v_balance < v_fee_amount THEN
	    RAISE EXCEPTION 'Saldo insuficiente';
	  END IF;

	  UPDATE public.city_store_highlight_orders
	  SET status = 'CANCELLED',
	      updated_at = now()
	  WHERE id = p_order_id;

	  IF v_fee_amount > 0 THEN
	    INSERT INTO public.store_wallet_transactions (store_id, amount, description, type, status)
	    VALUES (v_user, -ABS(v_fee_amount), 'Taxa de cancelamento destaque por cidade', 'DEBIT', 'COMPLETED');

	    UPDATE public.store_wallets
	    SET balance_decimal = balance_decimal - ABS(v_fee_amount),
	        updated_at = now()
	    WHERE store_id = v_user;
	  END IF;

	  RETURN jsonb_build_object('order_id', p_order_id, 'fee', v_fee_amount);
	END;
	$$;

	GRANT EXECUTE ON FUNCTION public.purchase_city_store_highlight(text, integer) TO authenticated;
	GRANT EXECUTE ON FUNCTION public.cancel_city_store_highlight(uuid) TO authenticated;
	
	-- 3. COLUNAS FALTANTES EM TABELAS EXISTENTES
	DO $$ 
	BEGIN
	    -- available_cities
	    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'available_cities' AND column_name = 'ibge_code') THEN
	        ALTER TABLE public.available_cities ADD COLUMN ibge_code text;
	    END IF;

	    -- city_store_banner_requests
	    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'city_store_banner_requests' AND column_name = 'topic') THEN
	        ALTER TABLE public.city_store_banner_requests ADD COLUMN topic text NOT NULL DEFAULT 'BANNER';
	    END IF;

    -- partner_fee_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_fee_settings' AND column_name = 'pos_min_value') THEN
        ALTER TABLE public.partner_fee_settings ADD COLUMN pos_min_value numeric;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_fee_settings' AND column_name = 'pos_max_value') THEN
        ALTER TABLE public.partner_fee_settings ADD COLUMN pos_max_value numeric;
    END IF;

    -- api_keys
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'name') THEN
        ALTER TABLE public.api_keys ADD COLUMN name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'key_token') THEN
        ALTER TABLE public.api_keys ADD COLUMN key_token text;
    END IF;

    -- orders_tickets
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_tickets' AND column_name = 'general_order_id') THEN
        ALTER TABLE public.orders_tickets ADD COLUMN general_order_id uuid REFERENCES public.orders(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders_tickets' AND column_name = 'payment_status') THEN
        ALTER TABLE public.orders_tickets ADD COLUMN payment_status text DEFAULT 'pending'::text;
    END IF;

    -- user_terminals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminals' AND column_name = 'pin_code') THEN
        ALTER TABLE public.user_terminals ADD COLUMN pin_code text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminals' AND column_name = 'auto_lock_minutes') THEN
        ALTER TABLE public.user_terminals ADD COLUMN auto_lock_minutes integer;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminals' AND column_name = 'fee_payer') THEN
        ALTER TABLE public.user_terminals ADD COLUMN fee_payer public.fee_payer_type DEFAULT 'MERCHANT'::public.fee_payer_type;
    END IF;

    -- user_terminal_transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'type') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN type text DEFAULT 'SALE'::text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'method') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN method text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'payer_id') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN payer_id uuid REFERENCES public.user_profiles(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'description') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN description text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_terminal_transactions' AND column_name = 'payer_name') THEN
        ALTER TABLE public.user_terminal_transactions ADD COLUMN payer_name text;
    END IF;

    -- ze_assistant_rules
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_rules' AND column_name = 'rule_type') THEN
        ALTER TABLE public.ze_assistant_rules ADD COLUMN rule_type public.ze_assistant_rule_type NOT NULL DEFAULT 'CUSTOM'::public.ze_assistant_rule_type;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_rules' AND column_name = 'variables') THEN
        ALTER TABLE public.ze_assistant_rules ADD COLUMN variables jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- ze_assistant_conversations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'customer_name') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN customer_name text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'customer_phone') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN customer_phone text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'handoff_to_human') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN handoff_to_human boolean DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'handoff_at') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN handoff_at timestamp with time zone;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'handoff_reason') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN handoff_reason text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'summary') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN summary text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_conversations' AND column_name = 'last_interaction_at') THEN
        ALTER TABLE public.ze_assistant_conversations ADD COLUMN last_interaction_at timestamp with time zone DEFAULT now();
    END IF;

END $$;

-- 4. TABELAS ADICIONAIS (CUPONS E SEGUROS)

-- coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['FIXED'::text, 'PERCENTAGE'::text, 'FREE_SHIPPING'::text])),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  max_discount_value numeric,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  user_usage_limit integer,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_platform_coupon boolean DEFAULT false,
  created_by uuid,
  CONSTRAINT coupons_pkey PRIMARY KEY (id),
  CONSTRAINT coupons_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id),
  CONSTRAINT coupons_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Stores manage own coupons" ON public.coupons;
CREATE POLICY "Stores manage own coupons" ON public.coupons FOR ALL USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins manage all coupons" ON public.coupons;
CREATE POLICY "Admins manage all coupons" ON public.coupons FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_coupons_updated_at ON public.coupons;
CREATE TRIGGER handle_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- insurance_partners
CREATE TABLE IF NOT EXISTS public.insurance_partners (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_partners_pkey PRIMARY KEY (id)
);
ALTER TABLE public.insurance_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read insurance partners" ON public.insurance_partners;
CREATE POLICY "Public read insurance partners" ON public.insurance_partners FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage insurance partners" ON public.insurance_partners;
CREATE POLICY "Admins manage insurance partners" ON public.insurance_partners FOR ALL USING (public.is_admin());

-- insurance_plans
CREATE TABLE IF NOT EXISTS public.insurance_plans (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  price_mensal numeric NOT NULL,
  features text[] DEFAULT '{}'::text[],
  is_popular boolean DEFAULT false,
  is_active boolean DEFAULT true,
  deductible_percent numeric DEFAULT 0,
  deductible_info text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_plans_pkey PRIMARY KEY (id)
);
ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read insurance plans" ON public.insurance_plans;
CREATE POLICY "Public read insurance plans" ON public.insurance_plans FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage insurance plans" ON public.insurance_plans;
CREATE POLICY "Admins manage insurance plans" ON public.insurance_plans FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_insurance_plans_updated_at ON public.insurance_plans;
CREATE TRIGGER handle_insurance_plans_updated_at BEFORE UPDATE ON public.insurance_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- insurance_referral_requests
CREATE TABLE IF NOT EXISTS public.insurance_referral_requests (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  city text NOT NULL,
  recommended_company text NOT NULL,
  status text DEFAULT 'PENDING'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_referral_requests_pkey PRIMARY KEY (id),
  CONSTRAINT insurance_referral_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
ALTER TABLE public.insurance_referral_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own referral requests" ON public.insurance_referral_requests;
CREATE POLICY "Users view own referral requests" ON public.insurance_referral_requests FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage referral requests" ON public.insurance_referral_requests;
CREATE POLICY "Admins manage referral requests" ON public.insurance_referral_requests FOR ALL USING (public.is_admin());

-- insurance_subscriptions
CREATE TABLE IF NOT EXISTS public.insurance_subscriptions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status text DEFAULT 'ACTIVE'::text,
  start_date timestamp with time zone,
  next_billing_date timestamp with time zone,
  auto_renew boolean DEFAULT true,
  payment_method_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT insurance_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT insurance_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT insurance_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.insurance_plans(id)
);
ALTER TABLE public.insurance_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.insurance_subscriptions;
CREATE POLICY "Users view own subscriptions" ON public.insurance_subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins manage subscriptions" ON public.insurance_subscriptions;
CREATE POLICY "Admins manage subscriptions" ON public.insurance_subscriptions FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_insurance_subscriptions_updated_at ON public.insurance_subscriptions;
CREATE TRIGGER handle_insurance_subscriptions_updated_at BEFORE UPDATE ON public.insurance_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. COLUNAS ADICIONAIS FALTANTES
DO $$ 
BEGIN
    -- ze_assistant_config
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ze_assistant_config' AND column_name = 'whatsapp_sort_preference') THEN
        ALTER TABLE public.ze_assistant_config ADD COLUMN whatsapp_sort_preference text DEFAULT 'recent'::text;
    END IF;
END $$;

-- 6. TABELAS DE PROMOÇÕES E COMPLEMENTOS

-- store_addon_groups
CREATE TABLE IF NOT EXISTS public.store_addon_groups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['SINGLE'::text, 'MULTIPLE'::text])),
  min integer NOT NULL DEFAULT 0,
  max integer NOT NULL DEFAULT 1,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_addon_groups_pkey PRIMARY KEY (id),
  CONSTRAINT store_addon_groups_store_id_fkey FOREIGN KEY (store_id) REFERENCES auth.users(id)
);
ALTER TABLE public.store_addon_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores manage own addon groups" ON public.store_addon_groups;
CREATE POLICY "Stores manage own addon groups" ON public.store_addon_groups FOR ALL USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins manage all addon groups" ON public.store_addon_groups;
CREATE POLICY "Admins manage all addon groups" ON public.store_addon_groups FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_store_addon_groups_updated_at ON public.store_addon_groups;
CREATE TRIGGER handle_store_addon_groups_updated_at BEFORE UPDATE ON public.store_addon_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- store_addons
CREATE TABLE IF NOT EXISTS public.store_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT store_addons_pkey PRIMARY KEY (id),
  CONSTRAINT store_addons_store_id_fkey FOREIGN KEY (store_id) REFERENCES auth.users(id)
);
ALTER TABLE public.store_addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores manage own addons" ON public.store_addons;
CREATE POLICY "Stores manage own addons" ON public.store_addons FOR ALL USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins manage all addons" ON public.store_addons;
CREATE POLICY "Admins manage all addons" ON public.store_addons FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_store_addons_updated_at ON public.store_addons;
CREATE TRIGGER handle_store_addons_updated_at BEFORE UPDATE ON public.store_addons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- promotions
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['FIXED'::text, 'PERCENTAGE'::text, 'FREE_SHIPPING'::text])),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_value numeric DEFAULT 0,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone,
  is_active boolean DEFAULT true,
  applies_to_all_products boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotions_pkey PRIMARY KEY (id),
  CONSTRAINT promotions_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.user_profiles(id)
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores manage own promotions" ON public.promotions;
CREATE POLICY "Stores manage own promotions" ON public.promotions FOR ALL USING (auth.uid() = store_id);
DROP POLICY IF EXISTS "Admins manage all promotions" ON public.promotions;
CREATE POLICY "Admins manage all promotions" ON public.promotions FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_promotions_updated_at ON public.promotions;
CREATE TRIGGER handle_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- promotion_products
CREATE TABLE IF NOT EXISTS public.promotion_products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  promotion_id uuid NOT NULL,
  product_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT promotion_products_pkey PRIMARY KEY (id),
  CONSTRAINT promotion_products_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES public.promotions(id),
  CONSTRAINT promotion_products_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.store_products(id)
);
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stores manage own promotion products" ON public.promotion_products;
CREATE POLICY "Stores manage own promotion products" ON public.promotion_products FOR ALL USING (EXISTS (SELECT 1 FROM public.promotions p WHERE p.id = promotion_id AND p.store_id = auth.uid()));

-- shop_platform_categories
CREATE TABLE IF NOT EXISTS public.shop_platform_categories (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shop_platform_categories_pkey PRIMARY KEY (id)
);
ALTER TABLE public.shop_platform_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read shop categories" ON public.shop_platform_categories;
CREATE POLICY "Public read shop categories" ON public.shop_platform_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins manage shop categories" ON public.shop_platform_categories;
CREATE POLICY "Admins manage shop categories" ON public.shop_platform_categories FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_shop_platform_categories_updated_at ON public.shop_platform_categories;
CREATE TRIGGER handle_shop_platform_categories_updated_at BEFORE UPDATE ON public.shop_platform_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- shop_platform_products
CREATE TABLE IF NOT EXISTS public.shop_platform_products (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  name character varying NOT NULL,
  description text,
  price numeric NOT NULL,
  category_id uuid,
  images text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  stock_quantity integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT shop_platform_products_pkey PRIMARY KEY (id),
  CONSTRAINT shop_platform_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.shop_platform_categories(id)
);
ALTER TABLE public.shop_platform_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read shop products" ON public.shop_platform_products;
CREATE POLICY "Public read shop products" ON public.shop_platform_products FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage shop products" ON public.shop_platform_products;
CREATE POLICY "Admins manage shop products" ON public.shop_platform_products FOR ALL USING (public.is_admin());
DROP TRIGGER IF EXISTS handle_shop_platform_products_updated_at ON public.shop_platform_products;
CREATE TRIGGER handle_shop_platform_products_updated_at BEFORE UPDATE ON public.shop_platform_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==================================================================
-- [REPAIR SCRIPT] GARANTIR CARTEIRAS ZEBANK PARA TODOS OS PARCEIROS
-- ==================================================================
DO $$
BEGIN
    -- 1. Carteiras de Entregador/Pessoal - AGORA INCLUI LOJISTAS
    INSERT INTO public.driver_wallets (driver_id, balance_decimal, savings_balance_decimal)
    SELECT id, 0, 0
    FROM public.user_profiles
    WHERE role IN ('delivery_partner', 'delivery_person', 'store_partner')
    ON CONFLICT (driver_id) DO NOTHING;

    -- 2. Carteiras de Vendas/Loja - Apenas para Lojistas
    INSERT INTO public.store_wallets (store_id, balance_decimal)
    SELECT id, 0
    FROM public.user_profiles
    WHERE role IN ('store_partner')
    ON CONFLICT (store_id) DO NOTHING;
END $$;

-- ==================================================================
-- 10.x SISTEMA DE SEGUROS
-- ==================================================================

-- Tabela de Parceiros de Seguros (Seguradoras)
CREATE TABLE IF NOT EXISTS public.insurance_partners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insurance_partners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read insurance partners" ON public.insurance_partners;
CREATE POLICY "Public read insurance partners" ON public.insurance_partners FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage insurance partners" ON public.insurance_partners;
CREATE POLICY "Admins manage insurance partners" ON public.insurance_partners FOR ALL USING (public.is_admin());

-- Tabela de Planos de Seguros
CREATE TABLE IF NOT EXISTS public.insurance_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    partner_id UUID REFERENCES public.insurance_partners(id),
    title TEXT NOT NULL,
    description TEXT,
    price_mensal NUMERIC(15, 2) NOT NULL,
    features TEXT[] DEFAULT ARRAY[]::TEXT[],
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    deductible_percent NUMERIC(5, 2),
    deductible_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insurance_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read insurance plans" ON public.insurance_plans;
CREATE POLICY "Public read insurance plans" ON public.insurance_plans FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Admins manage insurance plans" ON public.insurance_plans;
CREATE POLICY "Admins manage insurance plans" ON public.insurance_plans FOR ALL USING (public.is_admin());

-- Tabela de Assinaturas de Seguros
CREATE TABLE IF NOT EXISTS public.insurance_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) NOT NULL,
    plan_id UUID REFERENCES public.insurance_plans(id) NOT NULL,
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'CANCELLED', 'EXPIRED'
    payment_method TEXT NOT NULL, -- 'WALLET', 'CARD'
    next_billing_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insurance_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.insurance_subscriptions;
CREATE POLICY "Users view own subscriptions" ON public.insurance_subscriptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all subscriptions" ON public.insurance_subscriptions;
CREATE POLICY "Admins view all subscriptions" ON public.insurance_subscriptions FOR SELECT USING (public.is_admin());

-- Tabela de Indicações de Seguros
CREATE TABLE IF NOT EXISTS public.insurance_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id),
    city TEXT NOT NULL,
    company_name TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insurance_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage referrals" ON public.insurance_referrals;
CREATE POLICY "Admins manage referrals" ON public.insurance_referrals FOR ALL USING (public.is_admin());
DROP POLICY IF EXISTS "Users can insert referrals" ON public.insurance_referrals;
CREATE POLICY "Users can insert referrals" ON public.insurance_referrals FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Triggers para updated_at
DROP TRIGGER IF EXISTS handle_insurance_partners_updated_at ON public.insurance_partners;
CREATE TRIGGER handle_insurance_partners_updated_at BEFORE UPDATE ON public.insurance_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS handle_insurance_plans_updated_at ON public.insurance_plans;
CREATE TRIGGER handle_insurance_plans_updated_at BEFORE UPDATE ON public.insurance_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS handle_insurance_subscriptions_updated_at ON public.insurance_subscriptions;
CREATE TRIGGER handle_insurance_subscriptions_updated_at BEFORE UPDATE ON public.insurance_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();





-- ==================================================================
-- AJUSTES FINAIS DE RLS E RPC (06/02/2026)
-- ==================================================================


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
