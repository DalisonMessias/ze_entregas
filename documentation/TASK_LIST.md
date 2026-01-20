# LISTA DE TAREFAS - SISTEMA DE SCORE E BLOQUEIO

- [x] Criar estrutura de tabelas para Score e Histórico no SQL
- [x] Configurar pesos e regras administrativas para o Score no banco de dados
- [x] Implementar lógica de atualização automática de Score baseada em eventos
- [x] Criar lógica de bloqueio automático para entregadores parceiros (limite mensal)
- [x] Alterar a lógica de login para permitir acesso de contas bloqueadas/suspensas
- [x] Implementar modo "Apenas Visualização" no frontend para contas restritas
- [x] Criar middleware/guard no backend para bloquear ações mutáveis de contas restritas
- [x] Desenvolver painel de visualização de Score e Histórico para o entregador
- [x] Integrar Score no Menu Lateral e Atalhos Rápidos do Entregador
- [x] Desenvolver interface administrativa para configuração de limites e pesos
- [x] Realizar testes de pontuação, bloqueio e restrição de acesso
- [x] Refinar bordas dos botões (1px, baixa opacidade, adaptativa ao tema)
- [x] Remover todas as sombras de botões do sistema para visual "flat premium"
- [x] Corrigir alternador de temas na barra lateral (Tailwind v4 class strategy)
- [x] Limpar estilos residuais (border/shadow) nos componentes principais

# CORREÇÃO DE TIPAGEM (TypeScript)

- [x] Importar `UserStatus` em `AuthWrapper.tsx`
- [x] Adicionar `OVERDUE` ao tipo `LoanStatus` em `types.ts`
- [x] Refatorar `FinancialPanel.tsx` para usar status compatíveis (`ACTIVE`, `OVERDUE`)

# EDIÇÃO MANUAL DE SCORE (Admin)

- [x] Criar tabela `score_history` no banco de dados
- [x] Implementar funções de update e histórico no `cloud.ts`
- [x] Adicionar botões "Editar" e "Histórico" na tabela de entregadores (`AdminScoreConfig`)
- [x] Criar modal de edição com validação de motivo obrigatório
- [x] Criar modal de visualização de histórico de alterações
- [x] Integrar atualização em tempo real da lista após edição

