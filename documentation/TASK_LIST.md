# Plano de Refinamento de Gateway de Pagamento

## Tarefas Realizadas

- [x] Corrigir ambiguidade na função SQL `create_public_order` (resolvido PGRST203).
- [x] Ajustar `OrderTracking.tsx` para mostrar rótulo "On-line" para todos os pagamentos via plataforma.
- [x] Melhorar detecção de `isPlatformPayment` no rastreamento.
- [x] Ajustar visibilidade do botão de pagamento no rastreamento para priorizar checkouts externos.
- [x] Refatorar `DigitalMenu.tsx` para identificar e priorizar o gateway "Principal" configurado no Admin.
- [x] Criar interface dinâmica de botões no checkout baseada no gateway principal (MP/Infinite/PIX).
- [x] Garantir que o fluxo de checkout siga estritamente o gateway principal ativo.
- [x] Documentar as alterações em `checklist.txt` e `walkthrough.md`.
