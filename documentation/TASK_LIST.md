# TASK_LIST

## Otimização Vercel e Correção de Pedidos
- [x] Correção de erro de limite de Serverless Functions (Hobby Plan).
- [x] Migração da lógica de `/api` para `/server`.
- [x] Consolidação da API em um único entry point (`api/index.ts`).
- [x] Atualização de `vercel.json` para roteamento único.
- [x] Adição do status `pending_payment` ao enum `order_status` no banco de dados.
- [x] Inclusão das colunas `order_type` e `delivery_mode` na tabela `orders`.
- [x] Ajuste de imports e export default no servidor Express.
- [x] Revisão do componente `InternalOrders.tsx`.