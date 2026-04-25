# Plano de Correção de Redirecionamento Vercel

- [x] Corrigir lógica de URL no `components/AuthWrapper.tsx` para priorizar `/home` em vez de `/`
- [x] Ajustar `vercel.json` para garantir o redirecionamento limpo no lado do servidor
- [x] Sincronizar estado `currentPath` ao mudar a URL via `pushState` no `AuthWrapper.tsx`
- [x] Adicionar bypass de cache ou verificação forçada de rota na inicialização
- [x] Atualizar `checklist.txt` com as modificações realizadas
- [x] Gerar walkthrough final das alterações
