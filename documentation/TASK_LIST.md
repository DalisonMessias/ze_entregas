# Plano de Tarefas — WebSocket Automático por Domínio (window.location)

- [x] Criar ou atualizar o arquivo de plano `documentation/TASK_LIST.md` com as tarefas atuais
- [x] Atualizar `checklist.txt` registrando o início da solicitação
- [ ] Refatorar `utils/apiConfig.ts` — usar `window.location` como fonte de verdade para todas as URLs
- [ ] Refatorar `vite.config.ts` — proxy fixo de dev sem depender de variável de ambiente obrigatória
- [ ] Reescrever `components/InternalChat/useChatWebSocket.ts` — hook com refs, sem circular deps, backoff exponencial real, heartbeat, logs detalhados
- [ ] Corrigir `components/DigitalMenu/StoreChatPage.tsx` — connectWebSocket com reconexão inteligente e cleanup correto
- [ ] Atualizar `server/server.ts` — CORS aberto em desenvolvimento, restrito apenas em produção
- [ ] Atualizar `checklist.txt` com registro de conclusão
