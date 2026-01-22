# Lista de Tarefas: Refinamento de UX, Categorias e SQL Idempotente

- [x] Implementar auto-criação de categoria "Geral" para novos lojistas em `supabase_global.sql`
- [x] Implementar auto-correção de categorias em `cloud.ts` para lojistas existentes
- [x] Impedir exclusão da categoria "Geral" no `CategoryManager.tsx`
- [x] Refatorar resiliência de categorias no `StoreAIGenerator.tsx` para eliminar erros de salvamento
- [x] **[NOVO]** Revisar `supabase_global.sql` para garantir que todos os `INSERT` sejam idempotentes (`ON CONFLICT`)
- [x] **[NOVO]** Adicionar switch de ativação rápida no card do produto em `StoreCatalog.tsx`
- [x] **[NOVO]** Criar categorias dinamicamente ao salvar produtos (IA/Importação)
- [x] **[NOVO]** Corrigir visualização cortada do seletor de categorias
- [x] **[NOVO]** Reduzir tamanho dos cards de produtos para visualização densa
- [x] **[NOVO]** Corrigir persistência do estado do chat da IA ao trocar de abas
- [x] **[NOVO]** Chat da IA aumentado para 400px e layout lateral estabilizado
- [x] Validar integridade do fluxo de importação e criação por IA
- [ ] **[NOVO]** Suporte a imagens no chat de IA para análise de cardápios
- [ ] **[NOVO]** Botão de preview de produtos pendentes no chat de IA
- [ ] **[NOVO]** Botão para limpar histórico de conversa no chat
- [ ] **[NOVO]** Busca de produtos por ID ("ID-xxxx")
- [ ] **[NOVO]** Botão de troca rápida de imagem nos cards de produtos
- [ ] **[NOVO]** Verificação de persistência no banco de dados
