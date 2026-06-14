import './config.js'; // DEVE SER O PRIMEIRO IMPORT
import express from 'express';
import cors from 'cors';
import path from 'path';
import compression from 'compression';
import { fileURLToPath } from 'url';
import http from 'http';
import fs from 'fs';

import streetsNeighborhoodsRoutes from './routes/streetsNeighborhoods.js';
import integrationRoutes from './routes/integration.js';
import chatRoutes from './routes/chat.js';
import zeAssistantRoutes from './routes/zeAssistant.js';
import pwaRoutes from './routes/pwa.js';
import paymentRoutes from './routes/payment.js';
import mediationRoutes from './routes/mediation.js';
import whatsBotRoutes from './routes/whatsbot.js';
import { initializeWebSocket } from './websocket.js';
import './services/internalChatService.js'; // Chat Interno Nativo
import './services/zeAssistantService.js';
import { supabaseAdmin } from './services/supabaseClient.js';
import { whatsBotService } from './services/whatsBotService.js';

console.log('Servicos carregados: Chat Interno, Ze Assistente e WhatsBot');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ─────────────────────────────────────────────────────────────────────────────
// CORS — em produção com servidor unificado (mesmo origin) não é necessário.
// Em desenvolvimento (Vite na 3000 + backend na 4000) precisa permitir localhost.
// ─────────────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

app.use(cors({
  origin: (origin, callback) => {
    // Em modo unificado (produção), o frontend e backend são o mesmo servidor:
    // as requisições não têm "origin" (same-origin) — permitir tudo sem origin.
    if (!origin) return callback(null, true);

    // Em desenvolvimento, verificar origens locais
    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      // Em produção unificada, o frontend é servido pelo próprio Express,
      // então o CORS não bloqueia nada (same-origin). Se chegar aqui,
      // é uma chamada legítima de outro contexto — permitir com aviso.
      if (IS_PRODUCTION) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Origem bloqueada em dev: ${origin}`);
        callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-impersonation-store-id', 'X-Impersonation-Store-Id'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────────────────────
// ROTAS DA API
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/streets-neighborhoods', streetsNeighborhoodsRoutes);
app.use('/api/v1', integrationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ze-assistant', zeAssistantRoutes);
app.use('/api/whatsbot', whatsBotRoutes);
app.use('/pwa', pwaRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/mediation', mediationRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mode: IS_PRODUCTION ? 'producao-unificada' : 'desenvolvimento'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MODO PRODUÇÃO: serve o frontend (dist/) diretamente pelo Express.
// Tudo em um único servidor, uma única porta — sem URL externa necessária.
// ─────────────────────────────────────────────────────────────────────────────
if (IS_PRODUCTION) {
  // Caminho para o build do Vite (gerado por `npm run build`)
  const distPath = path.resolve(__dirname, '..', 'dist');

  if (fs.existsSync(distPath)) {
    // Servir arquivos estáticos (JS, CSS, imagens, etc.)
    app.use(express.static(distPath, {
      maxAge: '1d',
      etag: true,
    }));

    // SPA fallback: qualquer rota não-API retorna o index.html
    // Isso permite que o React Router funcione corretamente
    app.get('*', (req, res) => {
      // Não interceptar rotas de API
      if (req.path.startsWith('/api/') || req.path.startsWith('/pwa/') || req.path === '/health') {
        res.status(404).json({ error: 'Rota não encontrada' });
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });

    console.log(`\n🌐 Modo Produção Unificado: frontend servido de ${distPath}`);
  } else {
    console.warn(`\n⚠️  Pasta dist/ não encontrada. Execute "npm run build" antes de iniciar em produção.`);
    // Fallback: resposta simples para a raiz
    app.get('/', (req, res) => {
      res.json({
        message: 'Zé Entregas - API Backend (execute npm run build para servir o frontend)',
        endpoints: { health: '/health', api: '/api/*' }
      });
    });
  }
} else {
  // MODO DESENVOLVIMENTO: apenas a API roda aqui (porta 4000).
  // O frontend roda no Vite (porta 3000) com proxy apontando para cá.
  app.get('/', (req, res) => {
    res.json({
      message: 'Zé Entregas - API Backend (Desenvolvimento)',
      modo: 'desenvolvimento',
      frontend: 'http://localhost:3000 (Vite)',
      endpoints: {
        health: '/health',
        chat: '/api/chat/status',
        whatsbot: '/api/whatsbot/status'
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// TRATAMENTO GLOBAL DE ERROS
// ─────────────────────────────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Erro não tratado]', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: err.message || 'Ocorreu um erro inesperado'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZAÇÃO DO SERVIDOR
// ─────────────────────────────────────────────────────────────────────────────
const server = http.createServer(app);
initializeWebSocket(server);

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\nServidor ligado — Porta: ${PORT}`);

  try {
    const { error } = await supabaseAdmin.from('chat_sessions').select('store_id').limit(1);
    if (error) {
      console.error('\nErro de configuracao do banco de dados:');
      if (error.message.includes('column "store_id" does not exist')) {
        console.error('A coluna "store_id" esta faltando. Execute as migracoes do Supabase.');
      } else {
        console.error(`Erro: ${error.message}`);
      }
    } else {
      console.log('Conexao com Supabase e colunas multi-loja: OK');
    }
  } catch (e: any) {
    console.error('Falha ao validar estrutura do banco:', e.message);
  }

  await whatsBotService.bootstrapEnabledBots();

  const base = `http://localhost:${PORT}`;
  console.log(`Health check: ${base}/health`);
  console.log(`Chat API: ${base}/api/chat/status`);
  console.log(`WhatsBot API: ${base}/api/whatsbot/status\n`);
});

export default app;
