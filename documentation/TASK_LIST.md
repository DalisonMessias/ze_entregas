# Lista de Tarefas - Acesso de Admin à Loja (Impersonation)

## Banco de Dados
- [x] Criar tabela `admin_store_access_logs` em `supabase_global.sql`.
- [x] Definir RLS para `admin_store_access_logs`.

## Back-end (Services)
- [x] Criar `services/impersonation.ts` para gerenciar estado local.
- [x] Atualizar `services/cloud.ts` para interceptar chamadas de perfil/usuário quando em modo impersonation e adicionar logs de auditoria.

## UI Components
- [x] Implementar botão "Acessar Loja" em `components/AdminStores.tsx`.
- [x] Implementar Modal de Motivo em `components/AdminStores.tsx`.
- [x] Criar componente de Banner Global em `components/App.tsx`.
- [x] Integrar hooks de evento para mostrar banner reativamente.

## Verificação
- [ ] Validar fluxo completo de entrada e saída do modo loja.
- [ ] Verificar logs de auditoria no banco.
