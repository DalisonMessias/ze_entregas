import { Request, Response } from 'express';
import whatsappService from '../services/whatsappService.js';
import { supabaseAdmin } from '../services/supabaseClient.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Estender o tipo Request do Express para incluir a propriedade file do multer
declare global {
    namespace Express {
        interface Request {
            file?: Multer.File;
        }
    }
}

// Configuração do multer para upload de arquivos em memória
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(process.cwd(), 'uploads', 'whatsapp');

        // Criar diretório se não existir
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 16 * 1024 * 1024, // Limite de 16MB
    },
    fileFilter: function (req, file, cb) {
        // Validar tipos de arquivo
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4',
            'video/mp4', 'video/mpeg', 'video/webm',
            'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não suportado'));
        }
    }
});

// Middleware de upload
export const uploadMiddleware = upload.single('media');

/**
 * Envia uma imagem via WhatsApp
 */
export const sendImage = async (req: Request, res: Response) => {
    try {
        const { to, caption } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'O campo "to" é obrigatório.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
        }

        // Ler o arquivo
        const imageBuffer = fs.readFileSync(req.file.path);

        // Enviar via WhatsApp
        await whatsappService.sendImage(to, imageBuffer, caption);

        // Remover arquivo temporário
        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: 'Imagem enviada com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao enviar imagem:', error);

        // Limpar arquivo se houver erro
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Envia um áudio via WhatsApp
 */
export const sendAudio = async (req: Request, res: Response) => {
    try {
        const { to } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'O campo "to" é obrigatório.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
        }

        const audioBuffer = fs.readFileSync(req.file.path);

        await whatsappService.sendAudio(to, audioBuffer);

        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: 'Áudio enviado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao enviar áudio:', error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Envia um vídeo via WhatsApp
 */
export const sendVideo = async (req: Request, res: Response) => {
    try {
        const { to, caption } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'O campo "to" é obrigatório.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
        }

        const videoBuffer = fs.readFileSync(req.file.path);

        await whatsappService.sendVideo(to, videoBuffer, caption);

        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: 'Vídeo enviado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao enviar vídeo:', error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Envia um documento via WhatsApp
 */
export const sendDocument = async (req: Request, res: Response) => {
    try {
        const { to } = req.body;

        if (!to) {
            return res.status(400).json({ error: 'O campo "to" é obrigatório.' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Nenhum arquivo foi enviado.' });
        }

        const documentBuffer = fs.readFileSync(req.file.path);

        await whatsappService.sendDocument(
            to,
            documentBuffer,
            req.file.originalname,
            req.file.mimetype
        );

        fs.unlinkSync(req.file.path);

        res.status(200).json({ success: true, message: 'Documento enviado com sucesso.' });
    } catch (error: any) {
        console.error('Erro ao enviar documento:', error);

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ success: false, message: error.message });
    }
};
