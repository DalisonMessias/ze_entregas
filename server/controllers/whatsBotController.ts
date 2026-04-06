import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/supabaseAuth.js';
import { whatsBotService } from '../services/whatsBotService.js';

const getStoreId = (req: AuthenticatedRequest) => {
    if (!req.user?.id) {
        throw new Error('Usuário autenticado não encontrado na requisição.');
    }

    return req.user.id;
};

const getRequestPublicUrl = (req: AuthenticatedRequest) => {
    const origin = req.headers.origin;
    if (origin && typeof origin === 'string') return origin;

    const referer = req.headers.referer;
    if (referer && typeof referer === 'string') {
        const url = new URL(referer);
        return `${url.protocol}//${url.host}`;
    }

    return null;
};

export const getStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const status = await whatsBotService.getStatus(getStoreId(req), getRequestPublicUrl(req));
        res.status(200).json(status);
    } catch (error: any) {
        console.error('[WhatsBotController] Erro ao buscar status:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao buscar status do WhatsBot.' });
    }
};

export const updateConfig = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const customMessage = typeof req.body?.customMessage === 'string' ? req.body.customMessage : '';
        const customClosedMessage = typeof req.body?.customClosedMessage === 'string' ? req.body.customClosedMessage : '';
        const status = await whatsBotService.updateConfig(getStoreId(req), customMessage, customClosedMessage, getRequestPublicUrl(req));
        res.status(200).json(status);
    } catch (error: any) {
        console.error('[WhatsBotController] Erro ao salvar configuração:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao salvar configuração do WhatsBot.' });
    }
};

export const start = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const status = await whatsBotService.start(getStoreId(req), getRequestPublicUrl(req));
        res.status(200).json(status);
    } catch (error: any) {
        console.error('[WhatsBotController] Erro ao ligar bot:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao ligar o WhatsBot.' });
    }
};

export const stop = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Usa whatsBotService.stop() (completo) que grava enabled=false no banco
        const status = await whatsBotService.stop(getStoreId(req), getRequestPublicUrl(req));
        res.status(200).json(status);
    } catch (error: any) {
        console.error('[WhatsBotController] Erro ao desligar bot:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao desligar o WhatsBot.' });
    }
};

export const logout = async (req: AuthenticatedRequest, res: Response) => {
    const storeId = getStoreId(req);
    if (!storeId) {
        return res.status(401).json({ success: false, message: 'Usuário não autenticado.' });
    }

    try {
        const status = await whatsBotService.logoutWhatsBot(storeId, getRequestPublicUrl(req));
        res.json(status);
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message || 'Erro ao deslogar do WhatsBot.' });
    }
};
