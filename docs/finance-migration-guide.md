# Guia de Migração Interna (Zebank/ZéPay)

## Objetivo
Migrar todas as funcionalidades financeiras para Zebank (Entregadores) e ZéPay (Lojistas/Superlojistas), mantendo histórico, acesso e performance.

## Passos
1. Navegação
   - Atualizar switch de rotas: `store_finance_panel` → `zepay_store` (components/App.tsx:341–343).
2. ZéPay
   - Adicionar tabs internas: Visão Geral, Extrato, Maquininha.
   - Integrar `FinancialPanel` e `MerchantPOS` com bloqueio por `is_super_store`.
3. Zebank
   - Garantir terminologia e UX consistentes (Extrato Pessoal, Cartões, Transferências).
4. RBAC
   - Validar papéis no cliente em `services/cloud.ts` para funções Zebank/ZéPay.
   - Confirmar políticas RLS (Supabase) ativas.
5. Redirecionamentos
   - Remover acessos diretos a páginas financeiras fora dos módulos.
6. Testes
   - Rodar testes de acesso: `components/__tests__/Zebank.access.test.tsx` e `ZePay.access.test.tsx`.
7. Staging
   - Implantar em staging, validar com perfis reais (loja, super loja, entregador).
8. Rollout
   - Publicar gradualmente; monitorar métricas e erros.

## Riscos e Mitigações
- Quebra de links legados: redirecionamentos implementados.
- Acesso cruzado: validações client-side + RLS.
- Performance: reuso de RPCs e skeletons; monitorar latência.

## Checklist
- [x] Rotas atualizadas
- [x] Tabs ZéPay criadas
- [x] Extrato integrado
- [x] POS com gating
- [x] RBAC reforçado
- [x] Testes adicionados
