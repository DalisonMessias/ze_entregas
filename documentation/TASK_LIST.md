# Lista de Tarefas - Correções de Sistema

## Backend

### Sistema de Entregas para Entregadores Fixos
- [x] Criar função `getStoreDeliveryPartners` em `cloud.ts` para buscar entregadores associados
- [x] Criar função `sendDeliveryToAssociatePartner` em `cloud.ts` para enviar entregas
- [x] Testar funções no backend

### Badge de Pedidos Pendentes
- [x] Revisar função `getPendingTicketsCount` em `cloud.ts`
- [x] Adicionar filtro por `store_id` se necessário
- [x] Testar contagem de tickets pendentes

## Frontend

### Sistema de Entregas (`StoreRequest.tsx`)
- [x] Integrar `getStoreDeliveryPartners` no componente
- [x] Criar UI para listar entregadores disponíveis
- [x] Implementar seleção de entregador (checkbox/radio)
- [x] Adicionar interface para múltiplos pontos de parada
- [x] Conectar botão "Enviar Entrega" ao backend
- [x] Adicionar validação de endereços
- [x] Implementar feedback visual de sucesso/erro
- [x] **CORREÇÃO**: Ajustar busca de endereço para priorizar `store_address_*` (Configurações da Loja)
- [x] **CORREÇÃO**: Corrigir chamada da função `getStoreDeliveryPartners`

### Badge (`App.tsx`)
- [x] Verificar integração do `pendingTicketsCount`
- [x] Confirmar que o valor está sendo passado corretamente para o `MenuButton`
- [x] Testar atualização em tempo real (Implementado via Realtime Subscription)

### Comanda (`InternalOrders.tsx`)
- [x] **CORREÇÃO**: Ajustar busca de endereço para priorizar `store_address_*` (Configurações da Loja)
- [x] **CORREÇÃO**: Corrigir chamada da função `getStoreDeliveryPartners` para listar entregadores corretamente

## Banco de Dados
- [x] Executar script SQL para criar tabela `store_delivery_partners`
- [x] Executar script SQL para adicionar colunas `payment_status`

## Testes
- [x] Testar fluxo completo de envio para entregador fixo
- [x] Testar badge com 0, 1 e múltiplos pedidos pendentes
- [x] Verificar notificações para entregadores
- [x] Validar responsividade mobile
