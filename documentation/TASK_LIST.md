# Lista de Tarefas (Solicitado pelo Usuário)
## Implementação de Capa e Perfil na Loja

- [x] Analisar código existente e banco de dados
- [x] Adicionar colunas `cover_url` e `store_logo_url` em `supabase_global.sql`
- [x] Atualizar tipos em `types.ts`
- [x] Atualizar serviço `cloud.ts`
- [x] Criar UI de Branding em `StoreSettings.tsx`
- [x] Validar funcionamento
- [x] Atualizar `checklist.txt`
- [x] Atualizar `checklist.txt`

## Funcionalidades de Loja (Status e Relatórios)
- [x] Criar tabela `store_daily_reports`
- [x] Adicionar campo `is_open` em `user_profiles`
- [x] Implementar componente `StoreStatus`
- [x] Adicionar rota `/loja/status` e item no menu
- [x] Implementar lógica de geração de relatório diário
- [x] Corrigir persistência do status (race condition)
- [x] Limpeza geral de logs (console.log)upabase_global.sql` (is_open, store_daily_reports)
- [x] Criar componente `StoreStatus` com histórico
- [x] Adicionar rota e menu "Status da Loja"
- [x] Remover `console.log` do sistema
- [x] Atualizar documentação

## Melhorias na Área do Colaborador
- [x] Remover botão flutuante (+) do dashboard
- [x] Adicionar botão de "Produtos Avulsos" na visualização do menu
- [x] Implementar modal para adição de produtos manuais sem registro imediato no banco
- [x] Garantir que produtos avulsos sejam adicionados ao carrinho de forma consistente

## Correção de Inconsistências (15/01/2026)
- [x] Corrigir erro de tipagem `created_at` em `Product` no `CollaboratorModule.tsx`
- [x] Corrigir RPC `get_products_for_collaborator` em `supabase_global.sql` (referência a `sp.category` ajustada)
- [x] Corrigir RPC `place_collaborator_order` para suportar itens avulsos (UUID cast skip)
- [x] Corrigir mapeamento de `unit_price` em `CollaboratorModule.tsx` e adicionar fallback no RPC

## Gerenciamento de Pedidos e Fila de Produção (16/01/2026)
- [x] Criar tabela `public.orders_tickets` em `supabase_global.sql`
- [x] Atualizar RPC `place_collaborator_order` para gerar tickets de produção automaticamente
- [x] Melhorar modal de "Conferência" no lojista (`InternalOrders.tsx`) para exibir observações e adicionais
- [x] Implementar aba "Pedidos / Cozinha" no colaborador (`CollaboratorModule.tsx`) para re-impressão
- [x] Implementar aba "Produção" no lojista (`InternalOrders.tsx`) para gestão e impressão de tickets
- [x] Implementar funções `getOrdersTickets` e `updateTicketStatus` no `cloud.ts`
- [x] Corrigir erro JSX no `CollaboratorModule.tsx` (tags de botões quebradas)
- [x] Corrigir tipagem de `OrderItem` no `types.ts` (adicionadas propriedades missing)
