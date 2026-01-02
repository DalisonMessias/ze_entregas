# Arquitetura Financeira Unificada (Zebank/ZéPay)

## Visão Geral
- Dois módulos principais concentram todas as funcionalidades financeiras:
  - Zebank (Entregadores: `delivery_person`, `delivery_partner`)
  - ZéPay (Lojistas: `store_partner`; recursos avançados para `is_super_store=true`)

## Navegação e Rotas
- `zebank` (App de entregadores) — components/App.tsx:351
- `zepay_store` (ZéPay Lojista) — components/App.tsx:342
- Redirecionamento: `store_finance_panel` → `zepay_store` — components/App.tsx:341

## Frontend
- Zebank: `components/Zebank.tsx`
- ZéPay: `components/ZePayStore.tsx`
  - Tabs internas: Visão Geral, Extrato, Maquininha
  - Integrações: `FinancialPanel.tsx`, `MerchantPOS.tsx`
- Bloqueios: `ExclusiveLock.tsx` para recursos de Superlojista

## RBAC (Client + Server)
- Client: validações em `services/cloud.ts` por `getUserRole()`
  - Zebank: funções só permitem `delivery_*`
  - ZéPay: funções só permitem `store_partner`
- Server (Supabase RLS): políticas com `user_role_enum`, `user_profiles.role` e `is_super_store`

## Serviços/Endpoints
- Zebank
  - `get_zebank_dashboard_data`, `zebank_p2p_transfer`, `zebank_manage_savings`, `zebank_create_virtual_card`
- ZéPay
  - `get_zepay_dashboard_data`, `zepay_transfer`, `zepay_create_virtual_card`, `updateCardLimit('STORE')`, `create_recharge_charge`
- Admin (fora do escopo do usuário final): `admin_*`, `get_pending_payouts_summary`, etc.

## Dados e Histórico
- Nenhuma migração destrutiva; histórico preservado em tabelas existentes.
- Listas paginadas e skeletons asseguram desempenho e UX.

## Performance
- Reuso de RPCs e consultas otimizadas; cache local quando aplicável.
- Estruturas visuais leves com carregamento incremental.
