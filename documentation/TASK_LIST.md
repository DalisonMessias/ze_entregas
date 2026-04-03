# Plano de Implementação: Sistema de Bônus por Produtividade

## Tarefas de Banco de Dados
- [x] Criar tabela `bonus_campaigns` para gerenciar campanhas de bônus.
- [x] Criar tabela `bonus_driver_progress` para rastrear o progresso dos entregadores.
- [x] Implementar trigger para atualização automática de progresso após entregas concluídas.
- [x] Criar função RPC `get_admin_bonus_stats` para o dashboard administrativo.

## Componentes de Interface (UI)
- [x] Desenvolver `AdminBonusCampaigns.tsx` (Gestão de campanhas para Admin).
- [x] Desenvolver `DriverBonusDashboard.tsx` (Visualização de progresso para Entregadores).

## Integração e Navegação
- [x] Atualizar `types/navigation.ts` com novas abas (`admin_bonuses`, `driver_bonuses`).
- [x] Configurar rotas amigáveis em `utils/routeMap.ts`.
- [x] Registrar componentes via Lazy Loading em `App.tsx`.
- [x] Integrar link "Bônus e Metas" no menu do Entregador (`App.tsx`).
- [/] Integrar link "Gestão de Bônus" no menu do Administrador (`App.tsx` & `AdminPanel.tsx`).

## Finalização
- [ ] Testar fluxo completo (Criação de campanha -> Entrega -> Cálculo de bônus).
- [ ] Revisão de design e responsividade.
- [x] Atualizar `checklist.txt`.
