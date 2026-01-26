import { Request, Response } from 'express';
import chatService from '../services/chatService.js';
import { supabaseAdmin } from '../services/supabaseClient.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Auxiliar para extrair o storeId da requisição.
 */
const getStoreId = (req: Request): string => {
    const storeId = (req.query.storeId as string) || (req.body.storeId as string) || (req as any).user?.id;
    if (!storeId) throw new Error('storeId não fornecido.');
    return storeId;
};

// Configuração do multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'whatsapp');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 16 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4',
            'video/mp4', 'video/mpeg', 'video/webm',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedMimes.includes(file.mimetype)) cb(null, true);
        else cb(new Error('Tipo de arquivo não suportado'));
    }
});

export const uploadMiddleware = upload.single('media');

/**
 * Envia uma imagem via WhatsApp
 */
export const sendImage = async (req: Request, res: Response) => {
    try {
        const { to, caption, attendantId } = req.body;
        const storeId = getStoreId(req);

        if (!to) return res.status(400).json({ error: 'O campo "to" é obrigatório.' });
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });

        const imageBuffer = fs.readFileSync(req.file.path);
        await chatService.sendImage(to, imageBuffer, caption, storeId, attendantId);
        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: 'Imagem enviada com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao enviar imagem:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Envia um áudio via WhatsApp
 */
export const sendAudio = async (req: Request, res: Response) => {
    try {
        const { to, attendantId } = req.body;
        const storeId = getStoreId(req);

        if (!to) return res.status(400).json({ error: 'O campo "to" é obrigatório.' });
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });

        const audioBuffer = fs.readFileSync(req.file.path);
        await chatService.sendAudio(to, audioBuffer, storeId, attendantId);
        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: 'Áudio enviado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao enviar áudio:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Envia um vídeo via WhatsApp
 */
export const sendVideo = async (req: Request, res: Response) => {
    try {
        const { to, caption, attendantId } = req.body;
        const storeId = getStoreId(req);

        if (!to) return res.status(400).json({ error: 'O campo "to" é obrigatório.' });
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });

        const videoBuffer = fs.readFileSync(req.file.path);
        await chatService.sendVideo(to, videoBuffer, caption, storeId, attendantId);
        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: 'Vídeo enviado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao enviar vídeo:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Envia um documento via WhatsApp
 */
export const sendDocument = async (req: Request, res: Response) => {
    try {
        const { to, attendantId } = req.body;
        const storeId = getStoreId(req);

        if (!to) return res.status(400).json({ error: 'O campo "to" é obrigatório.' });
        if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });

        const documentBuffer = fs.readFileSync(req.file.path);
        await chatService.sendDocument(to, documentBuffer, req.file.originalname, req.file.mimetype, storeId, attendantId);
        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: 'Documento enviado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao enviar documento:', error);
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: error.message });
    }
};

