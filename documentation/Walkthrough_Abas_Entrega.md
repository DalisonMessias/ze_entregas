# Walkthrough - Exibição Condicional de Entrega/Retirada

## Objetivo
Garantir que o Carrinho do Menu Digital exiba apenas as opções de entrega (Delivery ou Pickup) que estão ativas nas configurações da loja, evitando que clientes selecionem métodos não suportados.

## Alterações Realizadas

### Frontend (`components/DigitalMenu/DigitalMenu.tsx`)

#### 1. Lógica Condicional de Renderização
Substituído o bloco fixo de abas por uma lógica dinâmica que verifica `deliverySettings`:

*   **Ambas Ativas (`DELIVERY` e `PICKUP`)**: Mantém o comportamento original, exibindo as abas "Entrega" e "Retirada" para escolha do cliente.
*   **Apenas Entrega**: Oculta as abas e exibe um banner "Apenas Entrega Disponível". Força o estado interno para `DELIVERY`.
*   **Apenas Retirada**: Oculta as abas e exibe um banner "Apenas Retirada na Loja". Força o estado interno para `PICKUP`.

#### 2. Inicialização Inteligente
A função `loadStoreData` foi ajustada para definir o `deliveryType` inicial correto assim que os dados da loja são carregados. Se a loja só faz entrega, começa como `DELIVERY`. Se só permite retirada, começa como `PICKUP`.

```typescript
// Exemplo da lógica aplicada
if (canDeliver && !canPickup) {
    setDeliveryType('DELIVERY');
} else if (!canDeliver && canPickup) {
    setDeliveryType('PICKUP');
}
```

## Benefícios
*   **Prevenção de Erros**: O cliente não consegue mais selecionar "Retirada" em uma loja que opera apenas por delivery, e vice-versa.
*   **Interface Mais Limpa**: Remove elementos de UI desnecessários quando não há escolha a ser feita.
*   **Consistência**: O carrinho reflete instantaneamente as configurações feitas no painel administrativo da loja.

## Como Testar
1.  Acesse o painel administrativva da loja > Configurações > Entrega.
2.  Desative "Retirada na Loja" e mantenha "Entrega Própria" ativa.
3.  Acesse o Menu Digital e abra o carrinho.
    *   **Resultado Esperado**: Deve aparecer apenas "Apenas Entrega Disponível" e os campos de endereço.
4.  Inverta: Ative "Retirada" e desative entregas.
    *   **Resultado Esperado**: Deve aparecer apenas "Apenas Retirada na Loja" e os dados da loja.
5.  Ative ambas.
    *   **Resultado Esperado**: As abas de seleção voltam a aparecer.
