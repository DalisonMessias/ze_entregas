import express from 'express';
import { StreetsNeighborhoodsController } from '../controllers/streetsNeighborhoodsController.js';
import dotenv from 'dotenv';

const router = express.Router();

dotenv.config();
const controller = new StreetsNeighborhoodsController();

// GET /api/streets-neighborhoods
router.get('/', (req, res) => controller.getStreetsAndNeighborhoods(req, res));

export default router;
