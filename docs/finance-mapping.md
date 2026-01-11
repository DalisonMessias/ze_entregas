# Mapeamento de Funcionalidades Financeiras

## Zebank (Entregadores)
- Saldo e extrato pessoal
- Transferências P2P
- Poupança (guardar/resgatar)
- Cartões virtuais do usuário (criar, bloquear, limite)
- POS do usuário (quando aplicável)

Componentes/Rotas:
- `components/Zebank.tsx` (App: `zebank` em components/App.tsx:351)

Serviços/RPCs:
- `get_zebank_dashboard_data`, `zebank_p2p_transfer`, `zebank_manage_savings`, `zebank_create_virtual_card`

## Zepay (Lojistas e Superlojistas)
- Carteira da loja
- Extrato corporativo
- Maquininha POS (Superlojista)
- Cartões virtuais da loja (Superlojista)
- Transferências entre lojas
- Integrações de pagamento (InfinitePay)

Componentes/Rotas:
- `components/ZePayStore.tsx` (App: `zepay_store` em components/App.tsx:342)
- Redirecionamento: `store_finance_panel` → `zepay_store` (components/App.tsx:341)
- Incorporado: `FinancialPanel.tsx`, `MerchantPOS.tsx`

Serviços/RPCs:
- `get_zepay_dashboard_data`, `zepay_transfer`, `zepay_create_virtual_card`, `updateCardLimit('STORE')`, `create_recharge_charge`

## Funcionalidades migradas para Zepay
- POS Lojista: `components/MerchantPOS.tsx`
- Extrato: `components/FinancialPanel.tsx`
- Carteira da loja: saldo/recarregar via `create_recharge_charge`

## Admin (fora do escopo dos módulos de usuário)
- `AdminPayouts.tsx`, `AdminFees.tsx`, `AdminStoreFinance.tsx` permanecem sob módulo Admin.
