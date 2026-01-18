import { Router } from 'express';
import * as whatsappController from '../controllers/whatsappController.js';
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
router.get('/status', whatsappController.getStatus);

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
router.post('/send/text', whatsappController.sendTextMessage);

/**
 * @swagger
 * /api/whatsapp/send/audio:
 *   post:
 *     summary: Envia uma mensagem de áudio (PTT)
 *     tags: [WhatsApp]
 */
router.post('/send/audio', upload.single('audio'), whatsappController.sendAudioMessage);

router.get('/conversations', whatsappController.getConversations);

/**
 * @swagger
 * /api/whatsapp/conversations/order:
 *   get:
 *     summary: Obtém a ordem manual das conversas
 *     tags: [WhatsApp]
 */
router.get('/conversations/order', whatsappController.getConversationOrder);

/**
 * @swagger
 * /api/whatsapp/conversations/order:
 *   post:
 *     summary: Salva a ordem manual das conversas
 *     tags: [WhatsApp]
 */
router.post('/conversations/order', whatsappController.saveConversationOrder);

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
router.get('/messages/:conversationId', whatsappController.getMessages);

/**
 * @swagger
 * /api/whatsapp/profile-picture/{jid}:
 *   get:
 *     summary: Busca foto de perfil de um contato
 *     tags: [WhatsApp]
 */
router.get('/profile-picture/:jid', whatsappController.getProfilePicture);

/**
 * @swagger
 * /api/whatsapp/mark-read:
 *   post:
 *     summary: Marca mensagem como lida
 *     tags: [WhatsApp]
 */
router.post('/mark-read', whatsappController.markAsRead);

/**
 * @swagger
 * /api/whatsapp/contacts:
 *   get:
 *     summary: Lista todos os contatos
 *     tags: [WhatsApp]
 */
router.get('/contacts', whatsappController.getContacts);

/**
 * @swagger
 * /api/whatsapp/contacts:
 *   post:
 *     summary: Cria ou atualiza um contato
 *     tags: [WhatsApp]
 */
router.post('/contacts', whatsappController.upsertContact);

/**
 * @swagger
 * /api/whatsapp/contacts/{id}:
 *   delete:
 *     summary: Exclui um contato
 *     tags: [WhatsApp]
 */
router.delete('/contacts/:id', whatsappController.deleteContact);

/**
 * @swagger
 * /api/whatsapp/logout:
 *   post:
 *     summary: Desconecta e limpa a sessão do WhatsApp
 *     tags: [WhatsApp]
 */
router.post('/logout', whatsappController.logout);

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
import * as whatsappMediaController from '../controllers/whatsappMediaController.js';

router.post('/send/image', whatsappMediaController.uploadMiddleware, whatsappMediaController.sendImage);

/**
 * @swagger
 * /api/whatsapp/send/audio:
 *   post:
 *     summary: Envia um áudio
 *     tags: [WhatsApp]
 */
router.post('/send/audio', whatsappMediaController.uploadMiddleware, whatsappMediaController.sendAudio);

/**
 * @swagger
 * /api/whatsapp/send/video:
 *   post:
 *     summary: Envia um vídeo
 *     tags: [WhatsApp]
 */
router.post('/send/video', whatsappMediaController.uploadMiddleware, whatsappMediaController.sendVideo);

/**
 * @swagger
 * /api/whatsapp/send/document:
 *   post:
 *     summary: Envia um documento
 *     tags: [WhatsApp]
 */
router.post('/send/document', whatsappMediaController.uploadMiddleware, whatsappMediaController.sendDocument);

/**
 * @swagger
 * /api/whatsapp/restart:
 *   post:
 *     summary: Reinicia o serviço de WhatsApp (força nova conexão/QR)
 *     tags: [WhatsApp]
 */
router.post('/restart', whatsappController.restartService);

router.post('/restart', whatsappController.restartService);

/**
 * @swagger
 * /api/whatsapp/conversations/{conversationId}/priority:
 *   patch:
 *     summary: Atualiza a prioridade de uma conversa
 *     tags: [WhatsApp]
 */
router.patch('/conversations/:conversationId/priority', whatsappController.updatePriority);

/**
 * @swagger
 * /api/whatsapp/conversations/{conversationId}:
 *   delete:
 *     summary: Deleta uma conversa sincronizado com o aparelho
 *     tags: [WhatsApp]
 */
router.delete('/conversations/:conversationId', whatsappController.deleteConversation);

export default router;
