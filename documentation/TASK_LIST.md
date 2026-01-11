# TASK LIST

- [x] Alterar inicialização do `activeTab` no `App.tsx` para respeitar a URL atual
- [x] Ajustar lógica de redirecionamento por cargo para evitar sobreposição ao carregar
- [ ] Validar redirecionamento automático para Lojista (Carteira)
- [ ] Validar redirecionamento automático para Entregador (Painel Diário)
- [ ] Validar persistência da página ao atualizar (F5)

## Notificações Individuais (Admin)
- [x] Criar tabela `app_notifications` no `supabase_global.sql`
- [x] Implementar serviços de busca e envio individual no `cloud.ts`
- [x] Adicionar interface de Notificação Específica no `AdminNotifications.tsx`