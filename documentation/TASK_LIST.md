# Lista de Tarefas — Sistema Unificado: Backend + Frontend no mesmo servidor

## Objetivo
Eliminar qualquer dependência de URL externa. O backend Express serve também os
arquivos estáticos do frontend (pasta dist/), tudo em uma única porta, uma única aplicação.

## Tarefas

- [x] Atualizar `server/server.ts` para servir `dist/` em produção (single-server)
- [x] Simplificar `utils/apiConfig.ts` para usar URLs relativas (sem VITE_API_BASE_URL)
- [x] Simplificar `.env` removendo VITE_API_BASE_URL
- [x] Simplificar `.env.production` — apenas PORT, NODE_ENV e chaves Supabase
- [x] Adicionar script `start:prod` no `package.json` (build + server)
- [x] Atualizar `documentation/DEPLOY.md` — guia único sem URLs externas
- [x] Atualizar `checklist.txt` e `TASK_LIST.md`

## Como funciona agora

### Desenvolvimento (npm run dev)
```
┌─────────────────────────────────────────────────────┐
│  Vite :3000 ──proxy──▶ Express :4000                │
│  (frontend com HMR)     (API + WhatsBot + IA)       │
└─────────────────────────────────────────────────────┘
```

### Produção (npm run start:prod)
```
┌─────────────────────────────────────────────────────┐
│  Express :4000                                      │
│  ├── /              → dist/index.html (React)       │
│  ├── /api/*         → rotas da API                  │
│  ├── /pwa/*         → manifest dinâmico             │
│  └── /ws-chat       → WebSocket                     │
└─────────────────────────────────────────────────────┘
```

Sem URLs externas. Sem Railway. Sem Vercel obrigatório.
Apenas: `npm install` → `npm run dev` (dev) ou `npm run start:prod` (produção).
