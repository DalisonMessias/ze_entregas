# Plano de Tarefas - Correção de Persistência de Cancelamento

- [ ] Analisar a função `storeCancelPartnerRequest` em `services/cloud.ts`
- [ ] Verificar a tabela de pedidos no banco de dados (`partner_requests` ou similar)
- [ ] Verificar se há algum gatilho (RPC) ou se a atualização é direta via Supabase
- [ ] Corrigir a lógica de cancelamento para garantir a persistência
- [ ] Validar a correção
- [ ] Atualizar `checklist.txt`
