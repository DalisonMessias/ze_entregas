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
        const imageUrl = typeof req.body?.imageUrl === 'string' ? req.body.imageUrl : null;
        const closedImageUrl = typeof req.body?.closedImageUrl === 'string' ? req.body.closedImageUrl : null;
        
        const status = await whatsBotService.updateConfig(
            getStoreId(req), 
            customMessage, 
            customClosedMessage, 
            imageUrl,
            closedImageUrl,
            getRequestPublicUrl(req)
        );
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

export const getCampaigns = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const campaigns = await whatsBotService.getCampaigns(getStoreId(req));
        res.status(200).json(campaigns);
    } catch (error: any) {
        console.error('[WhatsBotController] Erro ao buscar campanhas:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao buscar campanhas.' });
    }
};

export const createCampaign = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, message, recipients, imageUrl, linkUrl } = req.body;
        if (!name || !message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
            return res.status(400).json({ success: false, message: 'Dados da campanha inválidos.' });
        }

        const campaign = await whatsBotService.createCampaign(getStoreId(req), name, message, recipients, imageUrl, linkUrl);
        res.status(201).json(campaign);
    } catch (error: any) {
        console.error('[WhatsBotController] Erro ao criar campanha:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao criar campanha.' });
    }
};

export const stopCampaign = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const result = await whatsBotService.stopCampaign(getStoreId(req), id);
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[WhatsBotController] Erro ao parar campanha:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao parar campanha.' });
    }
};

export const deleteCampaign = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const result = await whatsBotService.deleteCampaign(getStoreId(req), id);
        res.status(200).json(result);
    } catch (error: any) {
        console.error('[WhatsBotController] Erro ao deletar campanha:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao deletar campanha.' });
    }
};

export const getAvailableContacts = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const contacts = await whatsBotService.getAvailableContacts(getStoreId(req));
        res.status(200).json(contacts);
    } catch (error: any) {
        console.error('[WhatsBotController] Erro ao buscar contatos:', error);
        res.status(500).json({ success: false, message: error.message || 'Erro ao buscar contatos.' });
    }
};
