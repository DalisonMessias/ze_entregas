# Lista de Tarefas - Correção de Classificação de Pedidos

- [x] Analisar o fluxo de criação de pedido no "Novo Pedido" (`InternalOrders.tsx`)
- [x] Analisar o fluxo de criação de pedido no "Menu Digital" (`DigitalMenu.tsx`)
- [/] Investigar o esquema do banco de dados e triggers em `supabase_global.sql`
- [x] Implementar coluna `is_location_delivery` em `supabase_global.sql`
- [x] Atualizar RPC `create_public_order` em `supabase_global.sql`
- [x] Atualizar funções de serviço em `cloud.ts`
- [x] Corrigir lógica de exibição em `InternalOrders.tsx`
- [x] Corrigir lógica de exibição em `OrderHistory.tsx`
- [x] Corrigir erro de tipagem TypeScript na interface `Order` (`types.ts`)
- [x] Corrigir join falho em `getOrdersTickets` (usando `general_order_id`)
- [x] Corrigir erro "Object" na RPC `create_public_order` (tipo `JSONB`)
- [x] Garantir persistência de `origin: 'DIGITAL_MENU'` para pedidos externos
- [x] Exibir taxa de entrega e classificação correta na Fila de Produção
- [x] Validar persistência e visualização correta
