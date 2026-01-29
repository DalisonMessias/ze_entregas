# Lista de Tarefas - Integração PIX e Recarga

## Tarefas Concluídas

- [x] Atualizar schema do banco de dados (`payment_gateway_settings`, `gateway_name` enum) em `supabase_global.sql`.
- [x] Criar componente `AdminPixConfig.tsx` para configurar chaves PIX.
- [x] Integrar `AdminPixConfig` no `AdminPanel.tsx` e rotas do `App.tsx`.
- [x] Adicionar botão de menu "Configurar PIX" no painel Admin.
- [x] Atualizar `services/paymentGateway.ts` para suportar geração de PIX (Estático/Manual).
- [x] Atualizar `PixChargeModal.tsx` para lidar com UX de pagamento manual (aviso, confirmação).
- [x] Atualizar `StoreWallet.tsx` para usar `PixChargeModal` e integrar fluxo de recarga.
- [x] Corrigir definições de tipos (`AdminSubTab` em `types.ts`).
- [x] Corrigir erro de sintaxe SQL em `supabase_global.sql` (DO $$ aninhado).
- [x] Corrigir inicialização de gateways em `services/cloud.ts` para garantir exibição do PIX.

## Observações

- O fluxo de PIX implementado é **Manual/Estático** (o usuário faz o PIX e o admin confere).
- O gateway 'mercadopago' também está configurado, mas o PIX manual serve como fallback ou método principal sem taxas de gateway.
- A verificação de status manual requer ação humana no painel (em desenvolvimento futuro: painel de conferência de transações manuais).