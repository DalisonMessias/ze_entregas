
# Script de Correção e Unificação SQL - Zé Entregas

$globalSqlPath = "supabase/migrations/supabase_global.sql"
$checklistPath = "checklist.txt"
$taskPath = "documentation/TASK_LIST.md"

# 1. Corrigir codificação e remover caminhos do Windows injetados
Write-Host "Corrigindo supabase_global.sql..."
if (Test-Path $globalSqlPath) {
    $content = Get-Content -Path $globalSqlPath
    $fixedContent = $content -replace "c:\\Users\\Dalison Messias\\Documents\\GitHub\\ze_entregas\\supabase\\migrations", "$$"
    $fixedContent | Set-Content -Path $globalSqlPath -Encoding UTF8
    Write-Host "✅ Caminhos removidos e arquivo convertido para UTF-8."
}

# 2. Conteúdo para Unificação
$pwaContent = @"

-- ==================================================================
-- SCRIPTS UNIFICADOS: PWA, PERMISSIONS E PARTNER DOCUMENTS
-- ==================================================================

-- [fix_pwa_column_manual.sql]
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pwa_settings' AND column_name = 'display') THEN
        ALTER TABLE public.pwa_settings ADD COLUMN display VARCHAR(20) DEFAULT 'standalone';
    END IF;
    GRANT SELECT ON public.pwa_settings TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON public.pwa_settings TO authenticated;
END $$;

INSERT INTO public.pwa_settings (id, display_name) 
VALUES ('1', 'Zé Entregas') 
ON CONFLICT (id) DO NOTHING;
"@

$permissionsContent = @"

-- [fix_permissions_manual.sql]
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_wallets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.partner_requests TO authenticated;
GRANT SELECT, INSERT ON public.client_error_logs TO authenticated;

DROP POLICY IF EXISTS "Store owners can view and manage their own wallet" ON public.store_wallets;
CREATE POLICY "Store owners can view and manage their own wallet" ON public.store_wallets FOR ALL USING (auth.uid() = store_id);

DROP POLICY IF EXISTS "Allow authenticated access to client_error_logs" ON public.client_error_logs;
CREATE POLICY "Allow authenticated access to client_error_logs" ON public.client_error_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.role() = 'authenticated');

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.user_profiles WHERE role = 'store_partner'
    LOOP
        INSERT INTO public.store_wallets (store_id, balance_decimal)
        VALUES (r.id, 0)
        ON CONFLICT (store_id) DO NOTHING;
    END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_delivery_partners TO authenticated;
GRANT SELECT, UPDATE ON public.user_notifications TO authenticated;
GRANT SELECT ON public.partner_fee_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;

CREATE OR REPLACE FUNCTION public.get_partner_financial_summary()
RETURNS TABLE (total_earnings NUMERIC, available_balance NUMERIC, max_emergency_value NUMERIC, emergency_message TEXT) AS $$
DECLARE
  v_role public.user_role;
  v_user UUID := auth.uid();
  v_emergency_msg TEXT;
BEGIN
  SELECT role INTO v_role FROM public.user_profiles WHERE id = v_user;
  SELECT p.emergency_message INTO v_emergency_msg FROM public.partner_fee_settings p ORDER BY p.updated_at DESC LIMIT 1;

  IF v_role = 'store_partner' THEN
    RETURN QUERY
      SELECT
        COALESCE((SELECT SUM(CASE WHEN t.status ILIKE '%APPROVED%' OR t.status ILIKE '%COMPLETED%' THEN t.amount ELSE 0 END)
                  FROM public.user_terminal_transactions t WHERE t.merchant_user_id = v_user), 0)::NUMERIC AS total_earnings,
        COALESCE((SELECT w.balance_decimal FROM public.store_wallets w WHERE w.store_id = v_user), 0)::NUMERIC AS available_balance,
        0::NUMERIC AS max_emergency_value,
        v_emergency_msg::TEXT AS emergency_message;
  ELSE
    RETURN QUERY
      SELECT
        COALESCE((SELECT SUM(pr.net_value_partner) FROM public.partner_requests pr WHERE pr.partner_id = v_user AND pr.status = 'COMPLETED'), 0)::NUMERIC,
        0::NUMERIC,
        0::NUMERIC,
        v_emergency_msg::TEXT AS emergency_message;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
"@

$docsContent = @"

-- [fix_partner_documents_permissions.sql]
ALTER TABLE partner_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own documents" ON partner_documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON partner_documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON partner_documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON partner_documents;

CREATE POLICY "Users can view their own documents" ON partner_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own documents" ON partner_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own documents" ON partner_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON partner_documents FOR DELETE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON partner_documents TO authenticated;
"@

# 3. Anexar scripts e deletar originais
Write-Host "Unificando scripts..."
Add-Content -Path $globalSqlPath -Value $pwaContent
Add-Content -Path $globalSqlPath -Value $permissionsContent
Add-Content -Path $globalSqlPath -Value $docsContent

$filesToDelete = @(
    "supabase/migrations/fix_pwa_column_manual.sql",
    "supabase/migrations/fix_permissions_manual.sql",
    "supabase/migrations/fix_partner_documents_permissions.sql"
)

foreach ($file in $filesToDelete) {
    if (Test-Path $file) {
        Remove-Item $file
        Write-Host "✅ Arquivo deletado: $file"
    }
}

# 4. Atualizar Checklist
Write-Host "Atualizando checklist..."
$checkEntry = "`n- Unificação completa dos scripts SQL (PWA, Permissões, Documentos) no arquivo supabase_global.sql e remoção de caminhos locais e arquivos redundantes."
Add-Content -Path $checklistPath -Value $checkEntry -Encoding UTF8

Write-Host "`n🚀 TUDO PRONTO! O arquivo supabase_global.sql está limpo e unificado."
