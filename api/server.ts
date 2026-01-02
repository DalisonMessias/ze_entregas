import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import streetsNeighborhoodsRoutes from './routes/streetsNeighborhoods.js';

dotenv.config();

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
