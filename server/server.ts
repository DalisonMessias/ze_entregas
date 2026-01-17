import './config.js'; // DEVE SER O PRIMEIRO IMPORT
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

import streetsNeighborhoodsRoutes from './routes/streetsNeighborhoods.js';
import integrationRoutes from './routes/integration.js';
import whatsappRoutes from './routes/whatsapp.js';
import { initializeWebSocket } from './websocket.js';
import './services/whatsappService.js'; // Importa para inicializar o serviço
import { supabaseAdmin } from './services/supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de autenticação simulado (para desenvolvimento)
app.use((req, res, next) => {
  // Simular usuário autenticado para desenvolvimento
  (req as any).user = {
    id: '123e4567-e89b-12d3-a456-426614174000', // UUID mockado
    email: 'usuario@example.com'
  };
  next();
});

// Rotas
app.use('/api/streets-neighborhoods', streetsNeighborhoodsRoutes);
app.use('/api/v1', integrationRoutes);
app.use('/api/whatsapp', whatsappRoutes); // Usar rotas do WhatsApp

// Rota de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'Zé Entregas - API Backend',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      streetsNeighborhoods: '/api/streets-neighborhoods',
      whatsapp: '/api/whatsapp/status'
    }
  });
});

// Tratamento de erros global
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: err.message || 'Ocorreu um erro inesperado'
  });
});

// Criar servidor HTTP e anexar WebSocket
const server = http.createServer(app);
initializeWebSocket(server);

// Iniciar servidor
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n🚀 SERVIDOR WHATSAPP LIGADO`);
  console.log(`🔌 Porta: ${PORT}`);

  // Teste básico de Supabase no boot
  try {
    const { error, data } = await supabaseAdmin.from('whatsapp_sessions').select('count', { count: 'exact', head: true });
    if (error) {
      console.error('❌ ERRO DE CONEXÃO COM SUPABASE:', error);
      console.error('👉 Código do erro:', error.code);
      console.error('👉 Detalhes:', error.details || error.message);
    } else {
      console.log('✅ Conexão com Supabase: OK');
    }
  } catch (e: any) {
    console.error('🔥 FALHA CATASTRÓFICA AO ACESSAR SUPABASE:', e);
  }

  const base = `http://localhost:${PORT}`;
  console.log(`📍 Health check: ${base}/health`);
  console.log(`💬 WhatsApp API: ${base}/api/whatsapp/status\n`);
});

export default app;
