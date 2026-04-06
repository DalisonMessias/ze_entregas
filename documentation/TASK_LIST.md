# Reestruturação Completa do Sistema de Planos — /loja/planos

## Tarefas

- [ ] 1. Adicionar colunas e RPCs no `supabase_global_part3.sql`:
  - Coluna `plan_level` em `user_profiles`
  - Atualizar trigger `handle_new_user` para atribuir `GRATUITO` ao criar conta de lojista
  - RPC `get_my_plan_status()` — retorna objeto completo do plano
  - RPC `check_and_downgrade_expired_plans()` — rebaixa planos expirados para GRATUITO

- [ ] 2. Adicionar tipos em `types.ts`:
  - `PlanLevel` type union
  - `PlanStatus` interface
  - Campo `plan_level` em `PartnerProfile`

- [ ] 3. Adicionar funções em `services/cloud.ts`:
  - `getMyPlanStatus()` — consulta RPC e retorna plano atual tipado
  - `checkAndDowngradeExpiredPlan()` — verifica e aplica downgrade

- [ ] 4. Criar hook `hooks/usePlanPermissions.ts`:
  - Retornar permissões centralizadas por plano
  - Incluir: `canAccessWhatsBot`, `canAccessAdvancedReports`, `canAccessPromotions`, `maxProducts`, etc.

- [ ] 5. Reformular completamente `components/StorePlans.tsx`:
  - Exibir 3 planos (Gratuito, Por Pedido, Mensal) com cards distintos
  - Destacar plano atual com badge e borda colorida
  - Exibir data de vencimento para plano mensal de forma proeminente
  - Mostrar alerta "Plano Expirado" quando aplicável
  - Cada plano com lista de recursos únicos e diferenciados
  - Design premium e responsivo

- [ ] 6. Atualizar `checklist.txt` com as alterações realizadas
