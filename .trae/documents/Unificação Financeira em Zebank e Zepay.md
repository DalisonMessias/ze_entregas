## Objetivo
Consolidar todas as funcionalidades financeiras da plataforma exclusivamente nos módulos Zebank (Entregadores) e Zepay (Lojistas e Superlojistas), preservando histórico, garantindo controles de acesso, redirecionamentos dos links antigos e uma experiência unificada dentro de cada módulo.

## Escopo Atual Mapeado
- Zebank
  - Componente e rota: `components/Zebank.tsx` e chave `zebank` em `components/App.tsx` (components/App.tsx:351).
  - APIs: `services/cloud.ts` (ex.: `getZebankDashboardData`, `zebankTransferP2P`, `zebankManageSavings`, `zebankCreateVirtualCard`, `zebankToggleCardStatus`, `updateCardLimit('USER')`).
  - SQL: `supabase/migrations/supabase_global.sql` (funcões e tabelas `zebank_*`).
- Zepay
  - Componente e rota: `components/ZePayStore.tsx` e chave `zepay_store` em `components/App.tsx` (components/App.tsx:342).
  - APIs: `services/cloud.ts` (`getZePayDashboardData`, `zepayTransfer`, `zepayCreateVirtualCard`, `updateCardLimit('STORE')`).
  - SQL: RPCs `get_zepay_dashboard_data`, `zepay_*`.
- Funcionalidades financeiras fora de Zebank/Zepay (a serem migradas)
  - `components/MerchantPOS.tsx` (POS Lojista)
  - `components/FinancialPanel.tsx` (Extrato/Saldo)
  - `components/StoreWallet.tsx` (Carteira da Loja)
  - Admin financeiro: `components/AdminAsaasConfig.tsx`, `components/AdminPayouts.tsx`, `components/AdminFees.tsx`, `components/AdminStoreFinance.tsx`
  - Navegação: `store_finance_panel` referenciada em `components/App.tsx` (components/App.tsx:341)

## Classificação por Tipo de Usuário
- Zebank (exclusivo para Entregadores)
  - `delivery_person` e `delivery_partner` (tipos em `types.ts`)
  - Funcionalidades: saldo, extrato, transferências P2P, poupança, cartões virtuais do usuário, POS do usuário (se aplicável), simulações/testes.
- Zepay (exclusivo para Lojistas)
  - `store_partner` e `store_partner + is_super_store=true`
  - Funcionalidades: carteira da loja, extrato corporativo, POS Lojista (MerchantPOS), criação/gestão de cartões virtuais da loja, transferências entre lojas, integrações de pagamento (Asaas), relatórios financeiros da loja.
  - Privilégios de Superlojista: recursos avançados (limites globais, relatórios avançados, configurações de frete e integrações), mantidos por flag `is_super_store`.

## Plano de Migração
1. Inventário e mapeamento
   - Levantar todas as páginas/abas/menus com operações financeiras e classificá-las para Zebank ou Zepay.
   - Identificar endpoints em `services/cloud.ts` e RPCs SQL usados por cada funcionalidade.
2. Realocação funcional
   - Zepay: incorporar `MerchantPOS`, `FinancialPanel` e visão de carteira da loja (`StoreWallet`) como sub-seções do dashboard Zepay.
   - Zebank: padronizar extrato/saldo e cartões sob um layout único; validar se há POS do usuário e integrá-lo aqui.
3. Redirecionamentos (compatibilidade de links)
   - `store_finance_panel` → redirecionar para `zepay_store` no switch de `App.tsx` (components/App.tsx:341–343).
   - Qualquer link direto para `StoreWallet`/`FinancialPanel` deve navegar para a sub-seção correspondente dentro de Zepay.
   - Manter rota `zebank` para entregadores.
4. Unificação da interface
   - Zebank: seções “Saldo”, “Transações”, “Transferir”, “Guardar/Resgatar”, “Cartões Virtuais”, “POS (se existir)”.
   - Zepay: seções “Visão Geral”, “Extrato da Loja”, “POS”, “Cartões da Loja”, “Transferências”, “Integrações (Asaas)”.
   - Componentizar seções para reuso e padronização visual (skeletons e estados de carregamento já utilizados).
5. Preservação de histórico
   - Não alterar estrutura de tabelas; reutilizar RPCs existentes.
   - Garantir que todos os movimentos anteriores permaneçam consultáveis nas novas telas.
6. Permissões e validação
   - Frontend: reforçar guardas — `zebank` só renderiza para `delivery_*`; `zepay_store` para `store_partner` (mantendo bloqueios internos para recursos de Superlojista via `ExclusiveLock`).
   - Backend: confirmar políticas RLS já existentes (`user_role_enum`, `user_profiles.role`, `is_super_store`) e ajustar RPCs se necessário.
   - Implementar verificação defensiva nos serviços (`cloud.ts`) para evitar acesso cruzado.
7. Testes
   - Atualizar e criar testes de acesso: Zebank (já existe `components/__tests__/Zebank.access.test.tsx`), adicionar `ZePay.access.test.tsx`.
   - Testar redirecionamentos: navegação de `store_finance_panel` para `zepay_store`.
   - Testes de integração de POS, extrato e cartões (mock de RPCs).
8. Staging e rollout
   - Habilitar feature flag para a navegação unificada.
   - Implantar em staging; validar com lojistas, superlojistas e entregadores.
   - Rollout progressivo com monitoramento de erros.
9. Monitoramento
   - Dashboard de transição: taxas de erro por módulo, latência RPC, sucesso de redirecionamentos, uso por perfil.

## Alterações Técnicas Propostas
- Navegação
  - Substituir `case 'store_finance_panel'` por um redirecionamento render/navigate para `zepay_store` (components/App.tsx:341–343).
  - Manter `case 'zebank'` para entregadores (components/App.tsx:351).
- Zepay
  - Incorporar `MerchantPOS.tsx`, `FinancialPanel.tsx` e blocos de carteira da loja em `ZePayStore.tsx` com tabs internas.
  - Reaproveitar `updateCardLimit('STORE')`, `zepayTransfer`, `zepayCreateVirtualCard`.
- Zebank
  - Consolidar ações de cartão/limite e extrato com layout padronizado.
  - Reaproveitar RPCs existentes `zebank_*`.
- RBAC e validação
  - Fortalecer `ExclusiveLock` onde necessário e validar `is_super_store` para recursos avançados.
  - Revisar chamadas no `cloud.ts` para checagem de papel antes de acionar RPCs sensíveis.

## Redirecionamentos Detalhados
- Abas antigas
  - `store_finance_panel` → `zepay_store`.
  - Links diretos de menu administrativo não mudam (Admin permanece no módulo Admin) e não entram no escopo de Zebank/Zepay do usuário final.
- Deep links
  - Mapear `?tab=` ou âncoras internas, convertendo para tabs internas de Zepay.

## Preservação de Dados e Performance
- Reutilizar tabelas e RPCs atuais; nenhuma migração destrutiva.
- Paginar listas de transações e aplicar skeletons para evitar jank.
- Manter ou melhorar caches locais (`storage`) e chamadas batched no `cloud.ts`.

## Testes e Validação
- Unitário: acesso por papel, tabs, redirecionamento.
- Integração: chamadas RPC com mocks e verificação de UI.
- E2E: fluxo completo de POS e extrato sob Zepay; transferências e cartões sob Zebank.

## Entregáveis
- Relatório de mapeamento completo das funcionalidades financeiras (tabela: funcionalidade → módulo → endpoints/RPCs).
- Documentação técnica da nova arquitetura (diagramas Zebank/Zepay, RBAC, navegação).
- Guia de migração para equipes internas (passo a passo dos redirecionamentos e pontos de atenção).
- Manual do usuário atualizado (Zebank para entregadores; Zepay para lojistas/superlojistas).
- Dashboard de monitoramento da transição (erros, latência, uso por perfil, sucesso de redirecionamentos).

## Critérios de Sucesso (validação)
- 100% das funcionalidades financeiras acessíveis apenas via Zebank/Zepay.
- Nenhum acesso financeiro fora desses módulos após a migração.
- Funcionalidades operacionais intactas; performance igual ou superior.
- Experiência consistente dentro de cada módulo, com tabs/seções claras.

Se aprovado, inicio pela navegação (`App.tsx`) e pela incorporação progressiva de `FinancialPanel`/`StoreWallet`/`MerchantPOS` dentro do `ZePayStore`, seguido dos testes e dos redirecionamentos controlados por feature flag.