# Walkthrough - Correção do Cálculo de Frete e Regras de Entrega

## Objetivo
Implementar a aplicação correta das regras de frete configuradas na loja (especificamente "Frete Grátis acima de X") no Menu Digital. Anteriormente, o menu digital ignorava essas regras e apenas calculava o frete base (fixo ou por bairro).

## Alterações Realizadas

### 1. Backend (`services/cloud.ts`)
Foi adicionada uma nova função para permitir a busca pública das regras de frete de uma loja. Isso é necessário porque o menu digital é acessado publicamente sem autenticação de lojista.

```typescript
// services/cloud.ts
export const getPublicShippingRules = async (storeId: string): Promise<StoreShippingRule[]> => {
    // Busca na tabela 'store_shipping_rules' onde 'store_id' coincide
    // Utiliza a política RLS pública já existente no banco de dados
    // ...
};
```

### 2. Frontend (`components/DigitalMenu/DigitalMenu.tsx`)
O componente principal do menu digital foi atualizado para consumir essas regras e aplicá-las ao carrinho.

#### a. Carregamento de Dados
Agora, ao carregar a loja, o sistema também busca as regras de frete:
```typescript
const [prods, settingsData, feesData, rulesData] = await Promise.all([
    cloud.getPublicStoreProducts(storeData.id),
    cloud.getPublicDeliverySettings(storeData.id),
    cloud.getPublicNeighborhoodFees(storeData.id),
    cloud.getPublicShippingRules(storeData.id) // Nova chamada
]);
setShippingRules(rulesData);
```

#### b. Lógica de Cálculo (`deliveryFee`)
A lógica `useMemo` para o frete foi expandida para checar regras de "Frete Grátis acima de um valor":
```typescript
const deliveryFee = useMemo(() => {
    // ...
    if (deliverySettings.is_own_delivery_enabled) {
        // Verifica se existe regra 'free_above' e se o subtotal atinge o limite
        const freeShippingRule = shippingRules.find(r => r.rule_type === 'free_above');
        if (freeShippingRule && freeShippingRule.threshold && cartSubtotal >= freeShippingRule.threshold) {
            return 0; // Frete Grátis
        }
        // ... lógica padrão de taxa fixa ou por bairro
    }
    // ...
}, ...);
```

#### c. Interface do Carrinho
O rodapé do carrinho foi atualizado para exibir o detalhamento dos custos:
- **Subtotal**: Valor dos produtos.
- **Entrega**: Valor do frete ou "Grátis" (se a regra for aplicada).
- **Total**: Soma final.

Antes exibia apenas "Total com Entrega", o que escondia a informação de gratuidade.

## Como Testar
1. Configure na loja uma regra de "Frete Grátis acima de R$ 50,00".
2. Abra o menu digital da loja.
3. Adicione produtos até R$ 40,00.
   - Verifique se a taxa de entrega aparece (Fixa ou por Bairro).
4. Adicione mais produtos até passar de R$ 50,00.
   - Verifique se a taxa de entrega muda para "Grátis" verde e o total é ajustado.
