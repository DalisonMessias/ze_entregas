# Conformidade e Auditoria

## Regulamentações financeiras
- Segregação de fluxo da loja vs. pessoal na interface do extrato.
- Registro de entradas/saídas com data/hora, tipo, valor e status.
- Exportação de dados para auditoria (CSV).

## Políticas de transparência
- Detalhamento de cada taxa aplicada na solicitação de entrega.
- Exibição clara do líquido do entregador e total da loja.
- Bloqueio de confirmação sem cálculo.

## Requisitos de auditoria
- Origem de cada linha (corrida/maquininha) rastreável por `id`.
- Função `getFinancialStatement` consolida dados com filtros de período.
- Recibos acessíveis via `ReceiptModal`.

