# TASK LIST

- [x] Alterar inicialização do `activeTab` no `App.tsx` para respeitar a URL atual
- [x] Ajustar lógica de redirecionamento por cargo para evitar sobreposição ao carregar
- [x] Validar redirecionamento automático para Lojista (Carteira)
- [x] Validar redirecionamento automático para Entregador (Painel Diário)
- [x] Validar persistência da página ao atualizar (F5)

## Notificações Individuais (Admin)
- [x] Criar tabela `app_notifications` no `supabase_global.sql`
- [x] Implementar serviços de busca e envio individual no `cloud.ts`
- [x] Atualizar SQL para suportar `app_notifications`
- [x] Unificar `app_notifications` em `user_notifications` (Schema Update)
- [x] Refatorar `cloud.ts` para usar tabela unificada
- [x] Refatorar `notificationService.ts` para tabela unificada
- [x] Atualizar `AdminNotifications.tsx`
- [x] Integrar `notificationService.ts` com Realtime
- [x] Adicionar botão de Refresh no menu superior direito (ao lado das notificações)

## Remoção Asaas & Integração InfinitePay (Wallet)
- [x] Identificar e mapear referências ao Asaas (SQL e Code)
- [x] Renomear colunas do Asaas no banco para `deprecated_asaas_*`
- [x] Remover campos Asaas das interfaces TypeScript (`types.ts`)
- [x] Limpar componentes frontend (`StoreWallet`, `SuperStoreModal`) de referências ao Asaas
- [x] Validar fluxo de recarga via InfinitePay (apenas link/modal novo)
- [x] Verificar integridade do sistema (build check)

## Integração Backend InfinitePay (Próximos Passos)
- [x] Implementar Cloud Function para gerar link de pagamento Real (`createInfinitePayCheckout`)
- [x] Configurar Webhook para receber confirmação de pagamento
- [x] Implementar lógica de crédito automático na carteira (`handleInfinitePayWebhook`)
- [ ] Configurar credenciais de produção no Supabase Secrets