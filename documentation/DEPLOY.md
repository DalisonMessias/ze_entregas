# Guia de Deploy — Vercel (Frontend) + Render (Backend)

## Visão Geral

```
┌──────────────────────┐     VITE_API_BASE_URL     ┌──────────────────────┐
│       VERCEL         │ ─────────────────────────▶ │       RENDER         │
│  React/Vite (dist/)  │                            │  Express + WebSocket │
│  Grátis              │ ◀───────────────────────── │  WhatsBot + IA       │
└──────────────────────┘     FRONTEND_URL           └──────────────────────┘
           │                                                   │
           └──────────────────────┬────────────────────────────┘
                                  ▼
                        ┌──────────────────┐
                        │    SUPABASE      │
                        │ (Banco de Dados) │
                        └──────────────────┘
```

---

## PASSO 1 — Deploy do Backend no Render

### 1.1 Criar conta no Render

1. Acesse [render.com](https://render.com)
2. Clique em **Get Started for Free**
3. Faça login com sua conta do **GitHub** (mais fácil)

### 1.2 Criar o serviço Web

1. No painel do Render, clique em **New +** → **Web Service**
2. Conecte seu repositório GitHub do projeto
3. Selecione o repositório `ze_entregas`
4. Configure:

| Campo | Valor |
|---|---|
| **Name** | `ze-entregas-api` |
| **Region** | `Oregon (US West)` |
| **Branch** | `main` (ou sua branch) |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` (ou `Starter` $7/mês para não dormir) |

### 1.3 Variáveis de Ambiente no Render

No painel do serviço, vá em **Environment** e adicione:

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `SUPABASE_URL` | `https://pjnxrqemjozlpnvoxpmn.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | *(sua service role key)* |
| `SUPABASE_ANON_KEY` | *(sua anon key)* |
| `FRONTEND_URL` | *(preencher após o deploy do Vercel)* |
| `PUBLIC_APP_URL` | *(mesma URL do Vercel)* |

### 1.4 Fazer o Deploy

1. Clique em **Create Web Service**
2. Aguarde o build (aproximadamente 2-5 minutos)
3. Ao finalizar, você receberá uma URL como:
   ```
   https://ze-entregas.onrender.com
   ```
4. **Copie essa URL** — você vai precisar dela no próximo passo

### 1.5 Verificar

```
https://ze-entregas.onrender.com/health
```
Esperado: `{"status":"ok","mode":"producao-unificada",...}`

---

## PASSO 2 — Deploy do Frontend no Vercel

### 2.1 Criar conta no Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Faça login com sua conta do **GitHub**

### 2.2 Importar o Projeto

1. Clique em **Add New** → **Project**
2. Selecione o repositório `ze_entregas`
3. Configure:

| Campo | Valor |
|---|---|
| **Framework Preset** | `Vite` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |

### 2.3 Variáveis de Ambiente no Vercel

Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `VITE_API_BASE_URL` | `https://ze-entregas-api.onrender.com` *(URL do Render)* |
| `VITE_SUPABASE_URL` | `https://pjnxrqemjozlpnvoxpmn.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(sua anon key)* |

### 2.4 Fazer o Deploy

1. Clique em **Deploy**
2. Aguarde o build (aproximadamente 1-2 minutos)
3. Você receberá uma URL como:
   ```
   https://zeentregas.vercel.app
   ```

---

## PASSO 3 — Conectar Vercel ↔ Render

Agora que você tem as duas URLs, precisa atualizar o Render com a URL do Vercel:

1. No painel do Render, vá em **Environment** do serviço
2. Atualize as variáveis:
   - `FRONTEND_URL` = `https://zeentregas.vercel.app`
   - `PUBLIC_APP_URL` = `https://zeentregas.vercel.app`
3. Clique em **Save Changes** → o Render vai reiniciar automaticamente

---

## PASSO 4 — Verificação Final

### Backend (Render)
```
https://ze-entregas.onrender.com/health
# Esperado: {"status":"ok"}

https://ze-entregas.onrender.com/api/whatsbot/status
# Esperado: status do WhatsBot
```

### Frontend (Vercel)
- Acesse a URL do Vercel no navegador
- Faça login no sistema
- Vá em configurações do WhatsApp e verifique o QR Code

---

## Variáveis Completas de Referência

### Vercel (Frontend)

| Variável | Descrição |
|---|---|
| `VITE_API_BASE_URL` | URL do backend no Render |
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase |

### Render (Backend)

| Variável | Descrição |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secreta do Supabase (nunca expor) |
| `SUPABASE_ANON_KEY` | Chave pública do Supabase |
| `FRONTEND_URL` | URL do frontend no Vercel (para CORS) |
| `PUBLIC_APP_URL` | URL pública do app (para links do WhatsBot) |

---

## Solução de Problemas

### QR Code do WhatsApp não aparece
- Verifique se `FRONTEND_URL` no Render aponta para a URL correta do Vercel
- O QR Code é gerado via WebSocket — verifique se o Render está rodando (pode estar dormindo no plano free)

### CORS bloqueado
- Confirme que `FRONTEND_URL` no Render está exatamente igual à URL do Vercel (sem barra final)

### Plano Free do Render "dorme"
- No plano free, o Render "dorme" após 15 minutos de inatividade
- Primeira requisição após o sono demora ~30 segundos para acordar
- Para evitar: upgrade para o plano **Starter** ($7/mês)

### Rebuild necessário
- Após alterar variáveis de ambiente no Vercel, faça um novo deploy
- No Render, as variáveis são aplicadas automaticamente com restart

---

## Desenvolvimento Local

```bash
npm run dev
```

Roda tudo localmente:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
