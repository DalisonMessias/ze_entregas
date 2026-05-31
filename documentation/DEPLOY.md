# Guia de Deploy — Zé Entregas em Produção

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────┐
│          USUÁRIO (Navegador)            │
└──────────────────┬──────────────────────┘
                   │
         ┌─────────▼─────────┐
         │  VERCEL (Frontend) │
         │  React + Vite      │
         │  zeentregas.vercel.│
         │  app               │
         └─────────┬─────────┘
                   │ HTTP/HTTPS (REST)
                   │ WebSocket (WSS)
         ┌─────────▼──────────────────┐
         │   RAILWAY / RENDER         │
         │   Backend Node.js          │
         │   Express + WebSocket      │
         │   Baileys (WhatsApp)       │
         └─────────┬──────────────────┘
                   │
         ┌─────────▼──────────────────┐
         │   SUPABASE                 │
         │   Banco de Dados           │
         │   (Postgres + Auth)        │
         └────────────────────────────┘
```

> **Por que separado?**
> O Vercel é *serverless* — não suporta processos Node.js persistentes.
> O backend usa `ws` (WebSocket) e `@whiskeysockets/baileys` (WhatsApp),
> que precisam de um processo **sempre ativo**. Por isso, o backend
> fica no Railway ou Render.

---

## Passo 1 — Deploy do Backend no Railway

### 1.1 Criar conta e projeto

1. Acesse [railway.app](https://railway.app) e crie uma conta
2. Clique em **New Project** → **Deploy from GitHub repo**
3. Selecione o repositório `ze_entregas`

### 1.2 Configurar o serviço

No painel do Railway, vá em **Settings** do serviço e configure:

- **Build Command:**
  ```
  npm install && npx tsc -p server/tsconfig.json
  ```
  > Se não tiver `server/tsconfig.json`, use:
  ```
  npm install
  ```

- **Start Command:**
  ```
  node --loader ts-node/esm server/server.ts
  ```
  > Ou se preferir compilar antes:
  ```
  npx tsx server/server.ts
  ```

- **Root Directory:** deixar em branco (raiz do projeto)

### 1.3 Variáveis de ambiente no Railway

Vá em **Variables** e adicione:

```
NODE_ENV=production
PORT=4000
SUPABASE_URL=https://pjnxrqemjozlpnvoxpmn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
SUPABASE_ANON_KEY=eyJhbGci...
FRONTEND_URL=https://zeentregas.vercel.app
PUBLIC_APP_URL=https://zeentregas.vercel.app
```

> ⚠️ Substitua `zeentregas.vercel.app` pelo seu domínio real do Vercel.

### 1.4 Anotar a URL do backend

Após o deploy, o Railway fornece uma URL como:
```
https://ze-entregas-backend-production.up.railway.app
```
**Guarde essa URL** — ela será usada no Vercel.

---

## Passo 2 — Deploy do Frontend no Vercel

### 2.1 Conectar o repositório

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **Add New → Project**
3. Importe o repositório `ze_entregas`

### 2.2 Configurações do projeto Vercel

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 2.3 Variáveis de ambiente no Vercel

Vá em **Settings → Environment Variables** e adicione:

| Nome | Valor | Ambiente |
|------|-------|----------|
| `VITE_API_BASE_URL` | `https://ze-entregas-backend-production.up.railway.app` | Production |
| `VITE_API_BASE_URL` | `http://localhost:4000` | Development |

> **IMPORTANTE:** Substitua a URL pelo endereço real do seu backend no Railway.
> Não inclua barra `/` no final da URL.

### 2.4 Fazer o deploy

Clique em **Deploy**. O Vercel vai:
1. Instalar dependências
2. Rodar `npm run build` (Vite com as variáveis de ambiente corretas)
3. Servir o `dist/` como site estático

---

## Verificação do Deploy

### Testar o backend

```
https://SEU-BACKEND.railway.app/health
```
Deve retornar:
```json
{ "status": "ok", "timestamp": "..." }
```

### Testar o WebSocket

No console do navegador (em produção):
```javascript
const ws = new WebSocket('wss://SEU-BACKEND.railway.app/ws-chat?storeId=TEST');
ws.onopen = () => console.log('✅ WebSocket conectado!');
ws.onerror = (e) => console.error('❌ Erro:', e);
```

### Testar o WhatsBot

Acesse `/loja/whatsbot` em produção e verifique se o QR Code aparece.

---

## Configuração Local (Desenvolvimento)

Nada muda para desenvolvimento local. O arquivo `.env` já tem:

```
PORT=4000
VITE_API_BASE_URL=http://localhost:4000
FRONTEND_URL=http://localhost:3000
```

Rode normalmente:
```bash
npm run dev
```

O Vite faz proxy automaticamente para `http://localhost:4000`.

---

## Resumo das Variáveis por Plataforma

### Vercel (Frontend)
| Variável | Descrição |
|----------|-----------|
| `VITE_API_BASE_URL` | URL do backend no Railway (sem barra final) |

### Railway (Backend)
| Variável | Descrição |
|----------|-----------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` (Railway define automaticamente) |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço do Supabase (secreta!) |
| `FRONTEND_URL` | URL do frontend no Vercel (para CORS) |
| `PUBLIC_APP_URL` | URL pública do app (para links no WhatsBot) |

---

## Solução de Problemas

### WebSocket não conecta em produção
- Verifique se `VITE_API_BASE_URL` começa com `https://` (não `http://`)
- O hook converte automaticamente `https://` → `wss://`
- Verifique se o backend está rodando: acesse `/health`

### Erro de CORS
- Confirme que `FRONTEND_URL` no Railway aponta para o domínio correto do Vercel
- O CORS aceita automaticamente qualquer subdomínio `*.vercel.app`

### QR Code não aparece
- O QR Code é gerado pelo backend (Railway) via WebSocket
- Verifique os logs do serviço no Railway

### Build falha no Vercel
- Confirme que `VITE_API_BASE_URL` está definida nas variáveis do Vercel
- O Vite usa essa variável em build-time para gerar o bundle correto
