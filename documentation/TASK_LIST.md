# Lista de Tarefas - Correção de Travamentos de UI

## Status Geral: [/] Em Progresso

### [x] Infraestrutura e Base
- [x] Corrigir `utils/dialogService.tsx` para garantir resolução de Promises ao fechar modais via "X" ou clique fora.
- [x] Revisar `CustomDialog.tsx` para consistência visual e funcional.

### [/] Componentes Críticos (Fase 1)
- [x] `CategoryModal.tsx`: Aplicado `try...catch...finally` e `useDialog`.
- [x] `MerchantPOS.tsx`: Substituído `window.confirm` e `window.alert`.
- [x] `AdminInstitutionalContent.tsx`: Substituído `window.confirm`.
- [ ] `AdminInstitutionalContent.tsx`: Corrigir chamadas para funções inexistentes no `cloud.ts`.

### [ ] Varredura Completa de Componentes (Fase 2)
Esta fase envolve a revisão de todos os componentes que realizam operações de CUD (Create, Update, Delete) para garantir que estados de carregamento sejam resetados no `finally` e que diálogos nativos sejam substituídos.

####- [x] AdminPartnerLevels.tsx
- [x] AdminInstitutionalContent.tsx
- [x] AdminStores.tsx
- [x] AdminPayouts.tsx
- [x] AdminBlacklist.tsx
- [x] AdminPanel.tsx (Módulos: UserManagement, PartnerVerification, CityManagement)
- [x] AdminNotifications.tsx
- [x] AdminShopManagement.tsx
- [x] AdminClaims.tsx
- [x] AdminFees.tsx
- [x] AdminSlides.tsx
- [x] AdminTips.tsx
- [x] AdminMaintenance.tsx
- [x] AdminInvestments.tsx
- [x] AdminLoanConfig.tsx
- [x] AdminMercadoPagoConfig.tsx (Revisado, íntegro)
- [x] AdminInfinitePayConfig.tsx (Revisado, íntegro)
- [x] AdminAIConfig.tsx (Revisado, íntegro)
- [x] AdminApiKeysUnified.tsx (Revisado, íntegro)
- [x] AdminPWASettings.tsx (Revisado, íntegro)
- [x] AdminRatings.tsx (Revisado, íntegro)
- [x] AdminReferrals.tsx (Revisado, íntegro)
- [x] AdminRoutingConfig.tsx
- [x] AdminScoreConfig.tsx
- [x] AdminStoreFinance.tsx
- [x] AdminWalletControl.tsx
- [x] AdminPlatformNews.tsx
- [x] MerchantPOS.tsx (Refatorado para useDialog)
- [x] CategoryModal.tsx (Refatorado para useDialog)
- [x] CategoryManager.tsx (Revisado, íntegro)

### [ ] Validação Final
- [ ] Teste manual de todos os fluxos de CUD.
- [ ] Verificação de logs de erro do Supabase.
- [ ] Garantir 100% de responsividade sem refresh manual.
