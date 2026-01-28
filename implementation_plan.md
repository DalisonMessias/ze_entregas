# Refletir Opções de Entrega/Retirada da Loja no Carrinho

## Objetivo
Garantir que o carrinho do Menu Digital exiba apenas as opções de entrega (Delivery ou Pickup) que estão habilitadas nas configurações da loja.

## Problema Atual
As abas "Entrega" e "Retirada" no carrinho são renderizadas incondicionalmente, permitindo que o usuário selecione uma opção que a loja pode ter desativado.

## Solução Proposta
1.  **Verificar Configurações**: Utilizar `deliverySettings` (`is_own_delivery_enabled`, `is_partner_delivery_enabled`, `is_pickup_enabled`).
2.  **Renderização Condicional**:
    *   Se ambas (Entrega e Retirada) estiverem ativas: Mostrar as duas abas (comportamento atual).
    *   Se apenas Entrega estiver ativa: Ocultar abas e forçar modo Entrega.
    *   Se apenas Retirada estiver ativa: Ocultar abas e forçar modo Retirada.
    *   Se nenhuma estiver ativa (caso raro/erro): Mostrar mensagem ou bloquear.
3.  **Estado Inicial**: Garantir que o `deliveryType` seja inicializado com a opção válida disponível.

## Arquivos Afetados
*   `components/DigitalMenu/DigitalMenu.tsx`

## Passos de Implementação
- [ ] Ler `DigitalMenu.tsx` para identificar o bloco de renderização das abas.
- [ ] Implementar lógica derivada para `isDeliveryAvailable` e `isPickupAvailable`.
- [ ] Alterar a UI das abas para renderizar apenas se ambas estiverem disponíveis, ou mostrar um indicador estático se apenas uma estiver.
- [ ] Verificar a lógica de inicialização do estado `deliveryType`.
