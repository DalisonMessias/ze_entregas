import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';
import multer from 'multer';

const upload = multer();

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: API para gerenciamento do Chat
 */

/**
 * @swagger
 * /api/chat/status:
 *   get:
 *     summary: Retorna o status da conexão do Chat
 *     tags: [Chat]
 *     responses:
 *       200:
 *         description: O status atual e o QR code, se houver
 */
router.get('/status', chatController.getStatus);

/**
 * @swagger
 * /api/chat/send/text:
 *   post:
 *     summary: Envia uma mensagem de texto
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *                 example: "5511999998888"
 *               text:
 *                 type: string
 *                 example: "Olá, mundo!"
 *     responses:
 *       200:
 *         description: Mensagem enviada com sucesso
 *       400:
 *         description: Parâmetros faltando
 *       500:
 *         description: Erro interno
 */
router.post('/send/text', chatController.sendTextMessage);

/**
 * @swagger
 * /api/chat/internal/send:
 *   post:
 *     summary: Envia mensagem do chat interno (Menu Digital)
 *     tags: [Chat]
 */
router.post('/internal/send', chatController.sendInternalMessage);

// router.post('/send/audio', upload.single('audio'), whatsappController.sendAudioMessage); // Removido: Chat interno usa API genérica

router.get('/conversations', chatController.getConversations);

/**
 * @swagger
 * /api/chat/conversations/order:
 *   get:
 *     summary: Obtém a ordem manual das conversas
 *     tags: [Chat]
 */
router.get('/conversations/order', chatController.getConversationOrder);

/**
 * @swagger
 * /api/chat/conversations/order:
 *   post:
 *     summary: Salva a ordem manual das conversas
 *     tags: [Chat]
 */
router.post('/conversations/order', chatController.saveConversationOrder);

/**
 * @swagger
 * /api/chat/messages/{conversationId}:
 *   get:
 *     summary: Obtém as mensagens de uma conversa específica
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         schema:
 *           type: string
 *         required: true
 *         description: O ID da conversa (JID do contato)
 *     responses:
 *       200:
 *         description: Uma lista de mensagens
 */
router.get('/messages/:conversationId', chatController.getMessages);

/**
 * @swagger
 * /api/chat/profile-picture/{jid}:
 *   get:
 *     summary: Busca foto de perfil de um contato
 *     tags: [Chat]
 */
router.get('/profile-picture/:jid', chatController.getProfilePicture);

/**
 * @swagger
 * /api/chat/mark-read:
 *   post:
 *     summary: Marca mensagem como lida
 *     tags: [Chat]
 */
router.post('/mark-read', chatController.markAsRead);

/**
 * @swagger
 * /api/chat/contacts:
 *   get:
 *     summary: Lista todos os contatos
 *     tags: [Chat]
 */
router.get('/contacts', chatController.getContacts);

/**
 * @swagger
 * /api/chat/contacts:
 *   post:
 *     summary: Cria ou atualiza um contato
 *     tags: [Chat]
 */
router.post('/contacts', chatController.upsertContact);

/**
 * @swagger
 * /api/chat/contacts/{id}:
 *   delete:
 *     summary: Exclui um contato
 *     tags: [Chat]
 */
router.delete('/contacts/:id', chatController.deleteContact);

/**
 * @swagger
 * /api/chat/logout:
 *   post:
 *     summary: Desconecta e limpa a sessão do Chat
 *     tags: [Chat]
 */
router.post('/logout', chatController.logout);

/**
 * @swagger
 * /api/chat/send/image:
 *   post:
 *     summary: Envia uma imagem
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *               caption:
 *                 type: string
 *               media:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagem enviada com sucesso
 */
import * as chatMediaController from '../controllers/chatMediaController.js';

router.post('/send/image', chatMediaController.uploadMiddleware, chatMediaController.sendImage);

/**
 * @swagger
 * /api/chat/send/audio:
 *   post:
 *     summary: Envia um áudio
 *     tags: [Chat]
 */
router.post('/send/audio', chatMediaController.uploadMiddleware, chatMediaController.sendAudio);

/**
 * @swagger
 * /api/chat/send/video:
 *   post:
 *     summary: Envia um vídeo
 *     tags: [Chat]
 */
router.post('/send/video', chatMediaController.uploadMiddleware, chatMediaController.sendVideo);

/**
 * @swagger
 * /api/chat/send/document:
 *   post:
 *     summary: Envia um documento
 *     tags: [Chat]
 */
router.post('/send/document', chatMediaController.uploadMiddleware, chatMediaController.sendDocument);

/**
 * @swagger
 * /api/chat/restart:
 *   post:
 *     summary: Reinicia o serviço de Chat (força nova conexão/QR)
 *     tags: [Chat]
 */
router.post('/restart', chatController.restartService);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/priority:
 *   patch:
 *     summary: Atualiza a prioridade de uma conversa
 *     tags: [Chat]
 */
router.patch('/conversations/:conversationId/priority', chatController.updatePriority);

/**
 * @swagger
 * /api/chat/conversations/sort-preference:
 *   patch:
 *     summary: Atualiza a preferência de ordenação das conversas
 *     tags: [Chat]
 */
router.patch('/conversations/sort-preference', chatController.updateSortPreference);


/**
 * @swagger
 * /api/chat/conversations/{conversationId}:
 *   delete:
 *     summary: Deleta uma conversa sincronizado com o aparelho
 *     tags: [Chat]
 */
router.delete('/conversations/:conversationId', chatController.deleteConversation);

/**
 * @swagger
 * /api/chat/conversations/{conversationId}/messages:
 *   delete:
 *     summary: Limpa todo o histórico de mensagens de uma conversa (Hard Delete)
 *     tags: [Chat]
 */
router.delete('/conversations/:conversationId/messages', chatController.clearConversationMessages);

/**
 * @swagger
 * /api/chat/messages/{messageId}:
 *   delete:
 *     summary: Deleta uma mensagem específica (Hard Delete)
 *     tags: [Chat]
 */
router.delete('/messages/:messageId', chatController.deleteMessage);

export default router;
