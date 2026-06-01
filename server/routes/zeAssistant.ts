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
router.post('/process-message', zeAssistantController.processMessage);

// Regras
router.get('/rules/:storeId', zeAssistantController.getRules);
router.post('/rules/:storeId', zeAssistantController.upsertRule);
router.patch('/rules/:ruleId', zeAssistantController.upsertRule);
router.delete('/rules/:ruleId', zeAssistantController.deleteRule);

// Base de Conhecimento
router.get('/knowledge/:storeId', zeAssistantController.getKnowledge);
router.post('/knowledge/:storeId', zeAssistantController.addKnowledge);
router.delete('/knowledge/:id', zeAssistantController.deleteKnowledge);
router.post('/knowledge/:storeId/sync', zeAssistantController.syncKnowledge);

// Conversas e Histórico
router.get('/conversations/:storeId', zeAssistantController.getConversations);
router.patch('/conversations/:storeId/:conversationId/toggle-assistant', zeAssistantController.toggleAssistant);

// Quick Replies
router.get('/quick-replies/:storeId', zeAssistantController.getQuickReplies);
router.post('/quick-replies', zeAssistantController.upsertQuickReply);
router.delete('/quick-replies/:id', zeAssistantController.deleteQuickReply);

export default router;

