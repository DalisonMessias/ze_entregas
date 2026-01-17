# TASK_LIST

## Otimização Vercel e Correção de Pedidos
- [x] Correção de erro de limite de Serverless Functions (Hobby Plan).
- [x] Otimização de Funções Serverless para limite Hobby da Vercel (12 funções).
- [x] Centralização da API em `/api/index.ts` e redirecionamento no `vercel.json`.
- [x] Correção de Erro ao Finalizar Pedido (Comanda):
  - Adição de valores de enum `pending_payment` e `PENDING` via `ALTER TYPE`.
  - Conversão da coluna `items` de `orders` para `JSONB` para compatibilidade com JS.
  - Refinamento da função `createOrder` no `services/cloud.ts`.
  - Atualização da RPC `create_order` no `supabase_global.sql`.
  - Correção de permissões (GRANTS) para as tabelas `orders` e `store_products`.
- [x] Atualização de `vercel.json` para roteamento único.
- [x] Adição do status `pending_payment` ao enum `order_status` no banco de dados.
- [x] Inclusão das colunas `order_type` e `delivery_mode` na tabela `orders`.
- [x] Ajuste de imports e export default no servidor Express.
- [x] Revisão do componente `InternalOrders.tsx`.