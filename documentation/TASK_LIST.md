# Lista de Tarefas - Melhorias na Comanda e Rastreamento

- [x] Adicionar sub-aba de "Pedidos Rejeitados/Cancelados" na Produção e Entregas no `InternalOrders.tsx`.
- [x] Implementar Badge de pedidos pendentes no item "Comanda" do menu lateral no `App.tsx`.
- [x] Modificar `cloud.ts` para fornecer contagem de pedidos pendentes no `getSystemPulse`.
- [x] Adicionar coluna `payment_status` nas tabelas `orders`, `orders_collaborators` e `orders_tickets` no `supabase_global.sql`.
- [x] Implementar exibição da forma de pagamento no modal de pedido (`InternalOrders.tsx`).
- [x] Implementar botão para alternar status de pagamento entre Pago e Pendente.
- [x] Implementar função `toggleTicketPaymentStatus` no `cloud.ts` com atualização em cascata.
- [x] Implementar persistência de `recentOrders` no `localStorage` do `DigitalMenu.tsx`.
- [x] Adicionar botão "Acompanhar Pedido" e modal de histórico no `DigitalMenu.tsx`.
- [x] Validar redirecionamento para a página de rastreamento pública (`OrderTracking.tsx`).
