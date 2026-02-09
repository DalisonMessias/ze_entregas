# Plano de# Tarefas - Correção de Cancelamento de Pedidos

## Problema Identificado

✅ **CAUSA RAIZ**: O `OrderHistory.tsx` mapeia `Order[]` da tabela `orders` para `PartnerRequest[]` (compatibilidade de UI), mas usa `order.id` como ID. A função `storeCancelPartnerRequest` espera um `partner_request.id` e tenta atualizar a tabela `partner_requests`, resultando em falha silenciosa.

## Tarefas de Implementação

- [ ] Modificar `services/cloud.ts::storeCancelPartnerRequest` para aceitar parâmetro `isOrderId`
- [ ] Atualizar `components/OrderHistory.tsx` para passar `isOrderId: true` no cancelamento
- [ ] Verificar e atualizar `components/InternalOrders.tsx` se necessário
- [ ] Testar cancelamento de pedido e verificar persistência após refresh
- [ ] Atualizar `checklist.txt` com a correção implementada
