import './config.js'; // DEVE SER O PRIMEIRO IMPORT
import express from 'express';
import cors from 'cors';
import path from 'path';
import compression from 'compression';
import { fileURLToPath } from 'url';
import http from 'http';

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
const PORT = Number(process.env.PORT) || 3001;

// Origens permitidas: localhost (dev) + domínio do Vercel (produção)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4000',
  'http://127.0.0.1:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  // Permite todos os previews do Vercel (ex: ze-entregas-git-main-xxx.vercel.app)
  /^https:\/\/.*\.vercel\.app$/,
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
    // Permite requisições sem origem (ex: chamadas server-to-server, curl, Postman)
    if (!origin) return callback(null, true);

    const isAllowed = allowedOrigins.some((allowed) => {
      if (allowed instanceof RegExp) return allowed.test(origin);
      return allowed === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Origem bloqueada: ${origin}`);
      callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-impersonation-store-id', 'X-Impersonation-Store-Id'],
}));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Middleware de autenticação real é aplicado via rotas específicas ou herança de token

app.use('/api/streets-neighborhoods', streetsNeighborhoodsRoutes);
app.use('/api/v1', integrationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ze-assistant', zeAssistantRoutes);
app.use('/api/whatsbot', whatsBotRoutes);
app.use('/pwa', pwaRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/mediation', mediationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({
    message: 'Ze Entregas - API Backend',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      streetsNeighborhoods: '/api/streets-neighborhoods',
      chat: '/api/chat/status',
      whatsbot: '/api/whatsbot/status'
    }
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro nao tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: err.message || 'Ocorreu um erro inesperado'
  });
});

const server = http.createServer(app);
initializeWebSocket(server);

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\nServidor backend ligado`);
  console.log(`Porta: ${PORT}`);

  try {
    const { error } = await supabaseAdmin.from('chat_sessions').select('store_id').limit(1);
    if (error) {
      console.error('\nErro de configuracao do banco de dados:');
      if (error.message.includes('column "store_id" does not exist')) {
        console.error('A coluna "store_id" esta faltando nas tabelas do WhatsApp.');
        console.error('Execute as migracoes mais recentes do Supabase antes de iniciar o backend.');
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
