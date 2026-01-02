# Cálculo de Valores na Solicitação de Entrega

## O que é calculado
- Distância total em km (Haversine somando segmentos da rota).
- Líquido do entregador (valor base + km extra + paradas).
- Taxas de plataforma (fixa e percentual sobre o líquido).
- Total estimado para a loja.

## Como funciona
1. Validar endereços (coleta e entregas) para obter lat/lng.
2. Executar o cálculo.
3. Revisar pré-visualização com detalhamento.
4. Confirmar a chamada se o saldo for suficiente.

## Fórmula
- `km_total = soma(Haversine(segmentos))`
- `liquido = base_delivery_value + max(0, km_total - base_delivery_km) * extra_km_value + (paradas - 1) * additional_stop_fee`
- `taxa_fixa = global_tax_fixed`
- `taxa_percentual = liquido * global_tax_percent`
- `total_loja = liquido + taxa_fixa + taxa_percentual`

## Arquivos impactados
- `components/StoreRequest.tsx` — função `estimateDeliveryCosts` e UI de pré-visualização.

## Testes
- `components/__tests__/estimateDeliveryCosts.unit.test.ts` valida a função.
- UI test: `FinancialPanel.filters.test.tsx` cobre filtros do extrato.

## Conformidade
- Transparência: detalhamento de custos e bloqueio de confirmação sem cálculo.
- Auditoria: parâmetros do cálculo persistidos via `createPartnerRequest`.

