import { Router } from 'express';
import * as zeAssistantController from '../controllers/zeAssistantController.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Zé Assistant
 *   description: API para o assistente inteligente
 */

// Configurações
router.get('/config/:storeId', zeAssistantController.getConfig);
router.patch('/config/:storeId', zeAssistantController.updateConfig);

// Regras
router.get('/rules/:storeId', zeAssistantController.getRules);
router.post('/rules/:storeId', zeAssistantController.createRule);
router.patch('/rules/:ruleId', zeAssistantController.updateRule);
router.delete('/rules/:ruleId', zeAssistantController.deleteRule);

// Base de Conhecimento
router.get('/knowledge/:storeId', zeAssistantController.getKnowledge);
router.post('/knowledge/:storeId', zeAssistantController.addKnowledge);
router.delete('/knowledge/:id', zeAssistantController.deleteKnowledge);
router.post('/knowledge/:storeId/sync', zeAssistantController.syncKnowledge);

// Conversas e Histórico
router.get('/conversations/:storeId', zeAssistantController.getConversations);

export default router;
