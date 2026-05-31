# Plano de Tarefas — Correção Arquitetura WhatsBot/WebSocket para Produção no Vercel

- [x] Criar ou atualizar o arquivo de plano `documentation/TASK_LIST.md` com as tarefas atuais
- [x] Atualizar `checklist.txt` registrando o início da solicitação
- [x] Modificar `.env` para desenvolvimento — adicionar `VITE_API_BASE_URL=http://localhost:4000`
- [x] Criar `.env.production` com variáveis de produção (placeholder para Railway/Render)
- [x] Refatorar `utils/apiConfig.ts` — remover IPs hardcoded, usar `VITE_API_BASE_URL` com conversão automática `https→wss`
- [x] Refatorar `vite.config.ts` — proxy dinâmico via variável de ambiente
- [x] Refatorar `components/InternalChat/useChatWebSocket.ts` — reconexão inteligente com backoff exponencial, heartbeat e limite de tentativas
- [x] Atualizar `server/server.ts` — CORS dinâmico para aceitar domínio do Vercel via `FRONTEND_URL`
- [x] Corrigir `vercel.json` — remover rewrite incorreto de `/api/(.*)` serverless
- [x] Criar `documentation/DEPLOY.md` — guia completo de deploy Railway + Vercel
- [x] Atualizar `.gitignore` — proteger `.env.production` de commits
- [x] Atualizar `checklist.txt` com registro de conclusão
