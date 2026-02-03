# Plano de Correção do Redirecionamento 404

O sistema está redirecionando rotas inexistentes para a Home em vez de exibir a página 404. Vou ajustar a lógica de roteamento no `App.tsx` e `routeMap.ts` para garantir que rotas inválidas permaneçam na aba `not_found`.

## Tarefas

- [x] Analisar `utils/routeMap.ts` para identificar falhas no mapeamento de rotas desconhecidas.
- [x] Verificar a lógica de redirecionamento no `useEffect` de roteamento do `components/App.tsx`.
- [x] Criar o plano de implementação detalhado.
- [x] Corrigir a lógica para exibir `NotFound` em vez de redirecionar para Home no `App.tsx`.
- [x] Corrigir a lógica de redirecionamento de URL no `AuthWrapper.tsx`.
- [x] Validar a correção acessando URLs inexistentes.
- [x] Corrigir erros de lint (addListener/removeListener) no `App.tsx`.
- [x] Garantir que `NotFound` seja pública para todos os usuários.
- [x] Atualizar `checklist.txt`.
