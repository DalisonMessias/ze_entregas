import { Router } from 'express';
import * as chatController from '../controllers/chatController.js';
import multer from 'multer';

const upload = multer();

const router = Router();

/**
 * @swagger
 * tags:
 *   name: WhatsApp
 *   description: API para gerenciamento do WhatsApp
 */

/**
 * @swagger
 * /api/whatsapp/status:
 *   get:
 *     summary: Retorna o status da conexão do WhatsApp
 *     tags: [WhatsApp]
 *     responses:
 *       200:
 *         description: O status atual e o QR code, se houver
 */
router.get('/status', chatController.getStatus);

/**
 * @swagger
 * /api/whatsapp/send/text:
 *   post:
 *     summary: Envia uma mensagem de texto
 *     tags: [WhatsApp]
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
 * /api/whatsapp/chat/internal/send:
 *   post:
 *     summary: Envia mensagem do chat interno (Menu Digital)
 *     tags: [WhatsApp]
 */
/**
 * @swagger
 * /api/whatsapp/chat/internal/send:
 *   post:
 *     summary: Envia mensagem do chat interno (Menu Digital)
 *     tags: [WhatsApp]
 */
router.post('/chat/internal/send', chatController.sendInternalMessage);

// router.post('/send/audio', upload.single('audio'), whatsappController.sendAudioMessage); // Removido: Chat interno usa API genérica

router.get('/conversations', chatController.getConversations);

/**
 * @swagger
 * /api/whatsapp/conversations/order:
 *   get:
 *     summary: Obtém a ordem manual das conversas
 *     tags: [WhatsApp]
 */
router.get('/conversations/order', chatController.getConversationOrder);

/**
 * @swagger
 * /api/whatsapp/conversations/order:
 *   post:
 *     summary: Salva a ordem manual das conversas
 *     tags: [WhatsApp]
 */
router.post('/conversations/order', chatController.saveConversationOrder);

/**
 * @swagger
 * /api/whatsapp/messages/{conversationId}:
 *   get:
 *     summary: Obtém as mensagens de uma conversa específica
 *     tags: [WhatsApp]
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
 * /api/whatsapp/profile-picture/{jid}:
 *   get:
 *     summary: Busca foto de perfil de um contato
 *     tags: [WhatsApp]
 */
router.get('/profile-picture/:jid', chatController.getProfilePicture);

/**
 * @swagger
 * /api/whatsapp/mark-read:
 *   post:
 *     summary: Marca mensagem como lida
 *     tags: [WhatsApp]
 */
router.post('/mark-read', chatController.markAsRead);

/**
 * @swagger
 * /api/whatsapp/contacts:
 *   get:
 *     summary: Lista todos os contatos
 *     tags: [WhatsApp]
 */
router.get('/contacts', chatController.getContacts);

/**
 * @swagger
 * /api/whatsapp/contacts:
 *   post:
 *     summary: Cria ou atualiza um contato
 *     tags: [WhatsApp]
 */
router.post('/contacts', chatController.upsertContact);

/**
 * @swagger
 * /api/whatsapp/contacts/{id}:
 *   delete:
 *     summary: Exclui um contato
 *     tags: [WhatsApp]
 */
router.delete('/contacts/:id', chatController.deleteContact);

/**
 * @swagger
 * /api/whatsapp/logout:
 *   post:
 *     summary: Desconecta e limpa a sessão do WhatsApp
 *     tags: [WhatsApp]
 */
router.post('/logout', chatController.logout);

/**
 * @swagger
 * /api/whatsapp/send/image:
 *   post:
 *     summary: Envia uma imagem
 *     tags: [WhatsApp]
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
 * /api/whatsapp/send/audio:
 *   post:
 *     summary: Envia um áudio
 *     tags: [WhatsApp]
 */
router.post('/send/audio', chatMediaController.uploadMiddleware, chatMediaController.sendAudio);

/**
 * @swagger
 * /api/whatsapp/send/video:
 *   post:
 *     summary: Envia um vídeo
 *     tags: [WhatsApp]
 */
router.post('/send/video', chatMediaController.uploadMiddleware, chatMediaController.sendVideo);

/**
 * @swagger
 * /api/whatsapp/send/document:
 *   post:
 *     summary: Envia um documento
 *     tags: [WhatsApp]
 */
router.post('/send/document', chatMediaController.uploadMiddleware, chatMediaController.sendDocument);

/**
 * @swagger
 * /api/whatsapp/restart:
 *   post:
 *     summary: Reinicia o serviço de WhatsApp (força nova conexão/QR)
 *     tags: [WhatsApp]
 */
router.post('/restart', chatController.restartService);

/**
 * @swagger
 * /api/whatsapp/conversations/{conversationId}/priority:
 *   patch:
 *     summary: Atualiza a prioridade de uma conversa
 *     tags: [WhatsApp]
 */
router.patch('/conversations/:conversationId/priority', chatController.updatePriority);

/**
 * @swagger
 * /api/whatsapp/conversations/sort-preference:
 *   patch:
 *     summary: Atualiza a preferência de ordenação das conversas
 *     tags: [WhatsApp]
 */
router.patch('/conversations/sort-preference', chatController.updateSortPreference);


/**
 * @swagger
 * /api/whatsapp/conversations/{conversationId}:
 *   delete:
 *     summary: Deleta uma conversa sincronizado com o aparelho
 *     tags: [WhatsApp]
 */
router.delete('/conversations/:conversationId', chatController.deleteConversation);

/**
 * @swagger
 * /api/whatsapp/conversations/{conversationId}/messages:
 *   delete:
 *     summary: Limpa todo o histórico de mensagens de uma conversa (Hard Delete)
 *     tags: [WhatsApp]
 */
router.delete('/conversations/:conversationId/messages', chatController.clearConversationMessages);

/**
 * @swagger
 * /api/whatsapp/messages/{messageId}:
 *   delete:
 *     summary: Deleta uma mensagem específica (Hard Delete)
 *     tags: [WhatsApp]
 */
router.delete('/messages/:messageId', chatController.deleteMessage);

export default router;
