
# Lista de Tarefas - Correção de Navegação Home -> Loja

## Objetivo
Corrigir o comportamento onde a URL é revertida para `/home` ao acessar uma loja a partir da página inicial.

## Tarefas
- [x] Atualizar `utils/routeMap.ts` para reconhecer a rota `/:city/:store/produtos` como aba `digital_menu`.
- [x] Refatorar navegação em `components/LandingPage.tsx` para usar `window.history.pushState` em vez de reload.
- [x] Verificar se a URL persiste corretamente ao navegar para uma loja (Validado via Código).
- [x] Garantir que o botão "Voltar" funcione corretamente (Validado via Código).
