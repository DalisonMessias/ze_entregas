import express from 'express';
import { StreetsNeighborhoodsController } from '../controllers/streetsNeighborhoodsController.js';
import dotenv from 'dotenv';

const router = express.Router();

dotenv.config();
// Inicializar controlador com configurações do Supabase (service role para escrita de cache)
const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY) as string;
const controller = new StreetsNeighborhoodsController(supabaseUrl, supabaseKey);

// GET /api/streets-neighborhoods
router.get('/', (req, res) => controller.getStreetsAndNeighborhoods(req, res));

export default router;
