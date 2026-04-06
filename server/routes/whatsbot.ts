import { Router } from 'express';
import { getStatus, start, stop, updateConfig, logout, getCampaigns, createCampaign, stopCampaign, deleteCampaign, getAvailableContacts } from '../controllers/whatsBotController.js';
import { requireSuperStoreAuth } from '../middleware/supabaseAuth.js';

const router = Router();

router.use(requireSuperStoreAuth);

router.get('/status', getStatus);
router.put('/config', updateConfig);
router.post('/start', start);
router.post('/stop', stop);
router.post('/logout', logout);

// Rotas de Campanhas
router.get('/campaigns', getCampaigns);
router.post('/campaigns', createCampaign);
router.post('/campaigns/:id/stop', stopCampaign);
router.delete('/campaigns/:id', deleteCampaign);
router.get('/contacts', getAvailableContacts);

export default router;
