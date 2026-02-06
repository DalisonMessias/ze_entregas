# Plano de Correção - Seguros

Este plano visa corrigir os erros de compilação no componente `InsurancePage.tsx`, adicionando os tipos necessários, implementando os métodos de serviço e garantindo que o esquema do banco de dados esteja correto.

## Lista de Tarefas
- [x] Criar tipos `InsurancePlan`, `InsurancePartner` e `InsuranceSubscription` em `types/index.ts`
- [x] Implementar métodos de serviço em `services/cloud.ts`:
    - [x] `getInsurancePlans()`
    - [x] `getInsurancePartners()`
    - [x] `getUserInsuranceSubscriptions()`
    - [x] `createInsuranceSubscription()`
    - [x] `cancelInsuranceSubscription()`
    - [x] `submitInsuranceReferral()`
- [ ] Adicionar tabelas de seguros ao `supabase_global.sql` se não existirem:
    - [x] `insurance_plans`
    - [x] `insurance_partners`
    - [x] `insurance_subscriptions`
    - [x] `insurance_referrals`
- [x] Registrar conclusões no `checklist.txt`
- [x] Atualizar `documentation/TASK_LIST.md`
