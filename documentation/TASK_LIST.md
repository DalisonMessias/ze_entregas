# TASK LIST - Análise de Catálogo Avançada & Busca Inteligente

## [x] Melhoria da Busca de Importação
- [x] Implementar função `normalizeText` para ignorar acentos e caracteres especiais.
- [x] Implementar lógica de `isFuzzyMatch` (match parcial e tolerância a erros).
- [x] Integrar busca otimizada na aba 'Importar' do Lojista.

## [x] Análise de Catálogo Avançada 2.0 (Lojista)
- [x] Refatorar Prompt do Gemini para diagnóstico estruturado.
- [x] Implementar Interface de Dashboard com Score (0-100).
- [x] Adicionar métricas de Qualidade, Mix e Preços.
- [x] Implementar Preview de Dados nas sugestões da IA.
- [x] Botão de aplicação automática de melhorias.

## [x] Análise de Catálogo Avançada 2.0 (Admin)
- [x] Refatorar Prompt do Gemini para auditoria estratégica do Admin.
- [x] Replicar UI de Dashboard com Score e Métricas.
- [x] Implementar Auditoria de Catálogo Base (Plataforma).

- [x] Correções Técnicas
- [x] Corrigir erro de tipagem `category_name` no state de revisão.
- [x] Corrigir prop `size="xs"` inválida nos botões.
- [x] Restaurar estado `isAILoading` removido acidentalmente.
- [x] Corrigir erro de build em `ProfileData.tsx` (await em função síncrona).
- [x] Corrigir erro de coluna inexistente (`category_name`) ao aplicar análise da IA.
- [x] Melhorar tratamento de erro 429 para exibir mensagens amigáveis de "Manutenção Momentânea".

---
*Status: 100% Concluído*
