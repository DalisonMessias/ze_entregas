# Plano de Tarefas — Depuração e Correção de Erros de Provedores de IA (Gemini e Groq)

## Solicitação
- Diagnosticar e corrigir o erro de falha geral na IA (Gemini retornando erro nos modelos e Groq não sendo encontrado como ativo no fluxo do WhatsBot) e formatar o prompt para incluir quebras de linha nas respostas.

---

- [x] Adicionar logs detalhados para cada iteração do loop de modelos do Gemini em `zeAssistantAIService.ts` a fim de identificar se há rejeição por chave inválida ou indisponibilidade de modelo.
- [x] Adicionar logs detalhados da consulta de chaves do Groq e Gemini no `whatsBotService.ts` para entender quais chaves estão registradas na tabela `api_keys` e se o status `is_active` está impedindo o uso.
- [x] Corrigir a lógica de avaliação do status do Groq (`isGroqActive`) no painel `AdminApiKeysUnified.tsx` para evitar que a string `'false'` seja avaliada como verdadeira.
- [x] Refatorar e blindar a lógica de orquestração e fallback de IA em `zeAssistantAIService.ts` para evitar logs confusos no terminal e loops redundantes de repetição de erros do mesmo provedor.
- [x] Refinar as instruções do prompt de sistema no `zeAssistantAIService.ts` (Regra 5) para instruir firmemente a IA a estruturar as respostas com quebras de linha elegantes (`\n`), evitando textos corridos e de difícil leitura.
- [ ] Aplicar as correções com base nas informações coletadas pelos novos logs e garantir o perfeito funcionamento da IA preferencial.
