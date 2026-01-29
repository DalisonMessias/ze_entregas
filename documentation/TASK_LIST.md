# Lista de Tarefas - Correção Mediação

- [x] Configurar URL amigável para o Painel de Mediação <!-- id: 1 -->
    - [x] Atualizar `utils/routeMap.ts` mapeando `admin_mediation` para `/admin/mediacao`
- [x] Resolver erro de tabela não encontrada <!-- id: 2 -->
    - [x] Verificar tabelas no arquivo mestre `supabase_global.sql` (Linha 10784+)
    - [x] Garantir inexistência de arquivos SQL separados (Deletado `fix_mediation_tables.sql`)
- [x] Verificação <!-- id: 3 -->
    - [x] Confirmar funcionamento das rotas (/admin/mediacao)
