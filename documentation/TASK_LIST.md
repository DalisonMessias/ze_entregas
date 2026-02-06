# Ajuste na Tabela api_keys

- [x] Remover coluna `store_id` da tabela `public.api_keys` em `supabase_global.sql`
- [x] Atualizar constraint `UNIQUE` para remover `store_id`
- [x] Atualizar políticas RLS da tabela `api_keys` para acesso administrativo
- [x] Atualizar `checklist.txt` com as alterações