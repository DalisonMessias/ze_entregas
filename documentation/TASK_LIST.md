# TASK LIST - Melhorias de Equipe e Login

- [x] Analisar o componente `CollaboratorModule.tsx` e o fluxo de login
- [x] Criar o plano de implementação
- [x] Atualizar `supabase_global.sql` (adicionar coluna `name` e RPCs)
- [x] Atualizar `cloud.ts` (modificar `createCollaborator`, adicionar `deleteCollaborator`)
- [x] Modificar `StoreCollaborators.tsx` (adicionar campo Nome e exclusão)
- [x] Revisar `StoreTeam.tsx` (desvinculação de entregadores)
- [x] Atualizar `AuthWrapper.tsx` (lógica de login com e-mail para colaboradores)
- [x] Atualizar `checklist.txt`
- [x] Corrigir import de `Collaborator` em `cloud.ts`
- [x] Corrigir erro de runtime (substring) em `StoreCollaborators.tsx`
- [x] Corrigir erro SQL 42P13 (cannot change return type) adicionando `DROP FUNCTION IF EXISTS` em `supabase_global.sql`