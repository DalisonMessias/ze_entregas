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
- [x] Implementação de estágios de produção (Pendente, Produzindo, Finalizado).
- [x] Automação de criação de tickets de produção para pedidos internos via RPC.
- [x] Integração de seleção de Entregador Fixo no checkout da comanda.
- [x] Lógica de despacho automático para entregadores ao finalizar preparo.
- [x] Atualização da estrutura do banco de dados (tabelas `orders` e `orders_tickets`).
- [x] Criação do Ticket de Impressão Premium com logo oficial P&B e suporte térmica.
- [x] Adição da variante de logo preto e branco no componente `Logo.tsx`.
- [x] Correção de erros de sintaxe JSX no componente `InternalOrders.tsx` (tags desalinhadas e fechamento de elemento raiz).

## Melhorias na Lista de Rotas para Entregadores
- [x] Integração do componente `StreetAutocomplete` para busca inteligente de ruas baseada na cidade do entregador.
- [x] Adição de botão de status "Entregue" para marcação visual e organização das entregas.
- [x] Persistência do status de entrega no armazenamento local.
- [x] Identificação visual dos itens concluídos (opacidade e riscado) para facilitar a leitura da rota.