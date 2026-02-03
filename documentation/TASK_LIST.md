# Tarefas Concluídas - Correção de Rotas e Home

- [x] Mapeamento da rota raiz `/` no `routeMap.ts` para a tab `home`.
- [x] Remoção do redirecionamento forçado de `/` para `/home` no `AuthWrapper.tsx`.
- [x] Remoção da lógica de `replaceState` no `App.tsx` que forçava `/home`.
- [x] Atualização de todos os links de `Logo` (LandingPage, DigitalMenu, CollaboratorModule, Sidebar, AuthWrapper) para redirecionar para `/`.
- [x] Correção do componente `NotFound.tsx` para voltar para `/`.
- [x] Renomeação do `service-worker.js` para `sw.js` para maior compatibilidade.
- [x] Atualização da inclusão do Service Worker no `index.html` e registro no `index.tsx`.
- [x] Correção de erro de sintaxe no `App.tsx` após refatoração.
- [x] Garantia de que refreshes de página funcionam sem tela branca em `/`.
