# Lista de Tarefas - Implementação de Resgate de Dinheiro em Ouro de Metas

- [x] Atualizar a tipagem de Backend para receber coluna `bonus_claimed` (`types.ts`).
- [x] Alterar banco na `supabase_global_part3.sql` criando RPC `claim_bonus_campaign_reward` processando saldo virtual em real para extrato.
- [x] Construir "Botão de Resgatar" na UI do Painel Entregador habilitado dinamicamente caso o seu `bonus_earned - bonus_claimed > 0`.
