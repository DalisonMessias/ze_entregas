# Extrato Financeiro da Loja

## Visão
- Exibe exclusivamente movimentações ligadas à operação da loja.
- Remove histórico pessoal do lojista/administrador da visualização padrão.

## Fontes de dados
- Saídas (DEBIT): `partner_requests.total_charged_store` por período.
- Entradas (EARNING): `user_terminal_transactions.amount` por período, do `merchant_user_id` da loja.
- Resumo: `get_partner_financial_summary` (saldo, entradas, saídas).

## Filtros
- Período: Hoje, 7 dias, 30 dias, Personalizado.
- Origem: Loja (padrão), Pessoal (placeholder sem dados).
- Tipo: Todos, Entradas, Saídas, Saques, Estornos.

## Organização
- Data/hora, tipo de operação, valor e status (Concluído/Pendente/Falha).

## Arquivos impactados
- `services/cloud.ts:getFinancialStatement` — montagem de itens e resumo.
- `components/FinancialPanel.tsx` — filtros e colunas detalhadas.

## Exportar CSV e recibos
- Mantidos e compatíveis com os novos campos.

## Conformidade
- Transparência: cada linha explicita tipo e status.
- Auditoria: separação clara por origem e período, com exportação.

