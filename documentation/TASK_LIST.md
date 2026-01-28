# Lista de Tarefas - Correções de Sistema

## Backend

### Sistema de Entregas para Entregadores Fixos
- [x] Criar função `getStoreDeliveryPartners` em `cloud.ts` para buscar entregadores associados
- [x] Criar wrapper `getStoreAssociatedPartners` em `cloud.ts` para padronizar busca com ID da sessão
- [x] Criar função `sendDeliveryToAssociatePartner` em `cloud.ts` para enviar entregas
- [x] Testar funções no backend
- [x] **FIX**: Remover declarações duplicadas em `cloud.ts` e consolidar lógica
- [x] **FIX**: Retornar `partner_avatar` na busca de associados

## Frontend

### Sistema de Entregas (`StoreRequest.tsx`)
- [x] Integrar `getStoreAssociatedPartners` no componente
- [x] Criar UI para listar entregadores disponíveis
- [x] Implementar seleção de entregador (checkbox/radio)
- [x] Adicionar interface para múltiplos pontos de parada
- [x] Conectar botão "Enviar Entrega" ao backend
- [x] Adicionar validação de endereços
- [x] Implementar feedback visual de sucesso/erro
- [x] **CORREÇÃO**: Ajustar busca de endereço para priorizar `store_address_*` (Configurações da Loja)
- [x] **CORREÇÃO**: Reimplementar chamada usando `getStoreAssociatedPartners`
- [x] **UI**: Adicionar Avatar e Telefone na lista de seleção

### Badge (`App.tsx`)
- [x] Verificar integração do `pendingTicketsCount`
- [x] Confirmar que o valor está sendo passado corretamente para o `MenuButton`
- [x] Testar atualização em tempo real (Implementado via Realtime Subscription)

### Comanda (`InternalOrders.tsx`)
- [x] **CORREÇÃO**: Ajustar busca de endereço para priorizar `store_address_*` (Configurações da Loja)
- [x] **CORREÇÃO**: Adicionar fetch de `getStoreAssociatedPartners` no `Promise.all` do carregamento inicial (`loadProducts`) para garantir que lista apareça
- [x] **CORREÇÃO**: Usar nome correto `getStoreDeliveryPartners` para listagem
- [x] **FIX**: Adicionar verificação de nulo (`associate.name`) para evitar crash na renderização
- [x] **FIX**: Corrigir nomes de propriedades (`partner_name`, `partner_phone`, `partner_avatar`) para exibir dados corretamente

## Banco de Dados
- [x] Executar script SQL para criar tabela `store_delivery_partners`
- [x] Executar script SQL para adicionar colunas `payment_status`

## Testes
- [x] Testar fluxo completo de envio para entregador fixo
- [x] Testar badge com 0, 1 e múltiplos pedidos pendentes
- [x] Verificar notificações para entregadores
- [x] Validar responsividade mobile
