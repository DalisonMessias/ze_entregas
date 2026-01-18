# TASK_LIST - Zé Assistente Fixes

## Banco de Dados (Supabase)
- [x] Correção de erro de cast UUID em políticas RLS (`::text = ::text`)
- [x] Restauração de políticas RLS corrompidas durante migração
- [x] Padronização de todas as tabelas do Zé Assistente no `supabase_global.sql`

## Frontend (React/Next.js)
- [x] Correção de sintaxe JSX em `WhatsappContainer.tsx` (modais e Sidebar)
- [x] Atualização de `ZeAssistantConfig.tsx`:
    - [x] Substituição de `@heroicons` por `lucide-react`
    - [x] Upgrade do Supabase Client para `services/cloud`
    - [x] Gestão manual de loading no componente Button
- [x] Atualização de `ZeAssistantRulesManager.tsx`:
    - [x] Remoção de `@headlessui/react` (substituído por modal customizado)
    - [x] Adição do campo `description` à interface e UI
    - [x] Upgrade do Supabase Client para `services/cloud`

## Backend (Node.js/Express)
- [x] Correção de sintaxe em `zeAssistantController.ts` (espaço extra em `getPendingOrders`)
- [x] Refatoração de todos os serviços para usar `cloud.getClient()`
- [x] Correção de caminhos de importação (`../../` em vez de `../`) e extensões `.js` para suporte a ESM
- [x] Criação de rotas dedicadas em `server/routes/zeAssistant.ts`
- [x] Registro das rotas em `server/server.ts`
- [x] Correção de `whatsappService.ts`:
    - [x] Declaração correta de `processWithZeAssistant` na classe `WhatsappInstance`
- [x] Correção de `zeAssistantService.ts`:
    - [x] Correção de erro de digitação `should Handoff` -> `shouldHandoff`
    - [x] Upgrade do Supabase Client