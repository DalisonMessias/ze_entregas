# Plano: Navegação Interna de Entregas (ORS + GPS em Tempo Real)

- [ ] Atualizar tipos e estado de navegação em `types.ts`
- [ ] Implementar helper unificado para abrir navegação em `mapHelpers.ts`
- [ ] Configurar roteamento e controle de acesso (`navigation.ts`, `routeMap.ts`, `accessControl.ts`, `App.tsx`)
- [ ] Criar nova tela full screen `DeliveryNavigation.tsx`
- [ ] Incluir plugin Leaflet Rotate no `index.html`
- [ ] Substituir ações de mapas externos por navegação interna nos componentes:
    - [ ] `AddressBook.tsx`
    - [ ] `StoreRequest.tsx`
    - [ ] `RouteList.tsx`
    - [ ] `PartnerArea.tsx`
    - [ ] `OrderHistory.tsx`
    - [ ] `InternalOrders.tsx`
    - [ ] `RouteOptimizer.tsx`
    - [ ] `App.tsx` (short link)
- [ ] Validar casos de teste e funcionamento geral