# Lista de Tarefas: IA Multimodal, Busca por ID e Melhorias de UI

- [x] Suporte a imagens no chat de IA para análise de cardápios
- [x] Botão de preview de produtos pendentes no chat de IA
- [x] Botão para limpar histórico de conversa no chat
- [x] Busca de produtos por ID ("ID-xxxx")
- [x] Botão de troca rápida de imagem nos cards de produtos
- [x] Verificação de persistência no banco de dados
- [x] Correção de categorias e estabilização de UI
- [x] Corrigir erro 404/Fallback da IA Multimodal
- [x] Adicionar indicador de carregamento (Spinner) ao trocar imagem no card (ajustado para iniciar após a seleção)
- [x] Padronizar "switch" de ativação no modal de edição de produto
- [x] Resolver erros de tipagem do SDK da IA
- [x] Corrigir erro de API Key vazia na IA
- [x] Implementar Join de categorias na listagem de produtos
- [x] Implementar criação dinâmica de categorias na importação (Centralizado em cloud.ts)
- [x] Corrigir compatibilidade do SDK da IA (Suporte a @google/genai v1 e Legacy)
- [x] Adicionar filtro "Todos" na gestão de produtos da loja
- [x] Remover criação forçada da categoria "Geral" (no código e no banco)

---
*Histórico de Conclusões:*
- [x] Auto-criação de categoria "Geral"
- [x] Proteção contra exclusão da categoria "Geral"
- [x] SQL Idempotente (ON CONFLICT)
- [x] Switch de ativação rápida nos cards
- [x] Cards compactos e layout lateral estabilizado
