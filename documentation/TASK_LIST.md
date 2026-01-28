# Lista de Tarefas - Correções de Sistema

## Backend
- [x] Corrigir funções de parceiros em `cloud.ts`
- [x] Adicionar `partner_avatar`

## Frontend
- [x] **StoreRequest.tsx**: Fix de endereço e listagem
- [x] **InternalOrders.tsx**: Fix de display e endereço
- [x] **App.tsx**: 
    - [x] Realtime Badge
    - [x] **FIX**: Whitelist de rotas públicas (`order_tracking`)
- [x] **DigitalMenu.tsx**:
    - [x] **FIX**: Corrigir navegação no modal "Meus Pedidos" (Forçando reload)

## Banco de Dados
- [x] Tabela `store_delivery_partners`
- [x] Coluna `delivery_location_reference`

## Testes
- [x] Testar fluxo completo de envio para entregador fixo
- [x] Testar badge
- [x] Validar navegação do menu digital aprimorada
