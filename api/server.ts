import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import streetsNeighborhoodsRoutes from './routes/streetsNeighborhoods.js';
import integrationRoutes from './routes/integration.js';

// Configurar dotenv com caminho explícito
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

const result = dotenv.config({ path: envPath });

console.log(`🔌 Tentando carregar .env de: ${envPath}`);
if (result.error) {
  console.error("❌ Erro ao carregar .env:", result.error);
} else {
  console.log("✅ .env carregado. Variáveis encontradas:", Object.keys(result.parsed || {}).length);
}

// Debug das variáveis críticas
console.log("🔍 SUPABASE_URL:", process.env.SUPABASE_URL ? "Definido" : "NÃO DEFINIDO");
console.log("🔍 VITE_SUPABASE_URL:", process.env.VITE_SUPABASE_URL ? "Definido" : "NÃO DEFINIDO");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de autenticação simulado (para desenvolvimento)
// Em produção, isso deve ser substituído por autenticação real via Supabase
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
      streetsNeighborhoods: '/api/streets-neighborhoods'
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  const base = process.env.API_BASE_URL || `http://${process.env.HOST || '0.0.0.0'}:${PORT}`;
  console.log(`📍 Health check: ${base}/health`);
  console.log(`🗺️  Streets API: ${base}/api/streets-neighborhoods`);
});

export default app;
