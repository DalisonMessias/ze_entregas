# Lista de Tarefas: Correção e Redesign do Sistema de Indicações

- [x] Criar nova aba `referral_public` para a página de marketing (/indique)
- [x] Restaurar a aba `referral_info` como Dashboard Privado (Pontos e Código)
- [x] Mapear URL amigável `/indique` para a aba pública no `routeMap.ts`
- [x] Liberar acesso universal à `referral_public` no `accessControl.ts`
- [x] Reverter lógicas de autenticação global e layout redundante no `App.tsx`
- [x] Validar que o menu lateral aponta corretamente para o dashboard (`referral_info`)
- [x] Limpar declarações duplicadas de variáveis no `App.tsx`
- [x] **Corrigir bug de fetch no Painel de Indicações (Erro: "Object")**
- [x] **Mover tabela `claimed_rewards` para o escopo global no Supabase**
- [x] **Implementar Redesign Premium no `ReferralProgram.tsx` (Glassmorphism & Gradientes)**
- [x] **Aprimorar logging técnico em `cloud.ts` para diagnósticos futuros**
- [x] Atualizar `checklist.txt` e `walkthrough.md`