# Plano de Sincronização SQL - 04/02/2026

- [x] Comparar `supabase_global.sql` com `supabase_global-backup.sql`
- [x] Identificar diferenças de tabelas e colunas (Script `compare_sql.py`)
- [x] Adicionar novas tabelas ao backup (Formas aditivas com IF NOT EXISTS)
- [x] Adicionar novas colunas ao backup (ALTER TABLE com segurança)
- [x] Implementar Políticas (RLS) e Gatilhos (Triggers) para os novos elementos
- [x] Validar a consistência dos arquivos
- [x] Atualizar o `checklist.txt`
- [x] Gerar Walkthrough final
