import { Router } from 'express';
import * as whatsBotController from '../controllers/whatsBotController.js';
import { requireSuperStoreAuth } from '../middleware/supabaseAuth.js';

const router = Router();

router.use(requireSuperStoreAuth);

router.get('/status', whatsBotController.getStatus);
router.put('/config', whatsBotController.updateConfig);
router.post('/start', whatsBotController.start);
router.post('/stop', whatsBotController.stop);

export default router;
