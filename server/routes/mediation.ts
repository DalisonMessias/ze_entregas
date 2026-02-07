import express from 'express';
import { processMediationMessage, MediationContext } from '../../services/ai_mediation.js';
import { getClient, getAPIKey } from '../../services/cloud.js';

const router = express.Router();

// POST /api/mediation/run
// Processa uma mensagem e retorna a resposta da IA
router.post('/run', async (req, res) => {
    try {
        const { orderId, userRole, message, storeId } = req.body;

        if (!orderId || !message || !storeId) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        // 1. Buscar API Key via serviço centralizado
        const apiKey = await getAPIKey('google_gemini', storeId);

        if (!apiKey) {
            console.warn(`[Mediation] Missing 'google_gemini' API Key for store ${storeId}`);
            res.status(500).json({ message: 'Gemini API Key not configured for this store or globally.' });
            return;
        }

        // 2. Preparar Contexto
        const context: MediationContext = {
            orderId,
            userRole,
            message,
        };

        // 3. Processar Mediação
        console.log(`[Mediation] Processing message for order ${orderId}`);
        const result = await processMediationMessage(context, apiKey);

        if (result.success) {
            res.status(200).json(result);
        } else {
            console.error(`[Mediation] Failed: ${result.message}`);
            res.status(500).json(result);
        }
    } catch (error: any) {
        console.error('[Mediation] Handler error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// GET /api/mediation/status
// Retorna se a mediação está ativa para um pedido
router.get('/status', async (req, res) => {
    try {
        const { orderId } = req.query;
        if (!orderId) {
            res.status(400).json({ error: 'Order ID required' });
            return;
        }

        const sb = getClient();
        if (!sb) {
            res.status(500).json({ error: 'DB Error' });
            return;
        }

        const { data, error } = await sb
            .from('orders')
            .select('is_mediation_active')
            .eq('id', orderId)
            .single();

        if (error) {
            console.error('[Mediation] Error fetching status:', error);
            res.status(500).json({ error });
            return;
        }

        res.status(200).json({ active: data?.is_mediation_active || false });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/mediation/status
// Ativa ou desativa a mediação
router.post('/status', async (req, res) => {
    try {
        const { orderId, active } = req.body;

        if (!orderId) {
            res.status(400).json({ error: 'Order ID required' });
            return;
        }

        const sb = getClient();
        if (!sb) {
            res.status(500).json({ error: 'Database error' });
            return;
        }

        const { error } = await sb
            .from('orders')
            .update({ is_mediation_active: active })
            .eq('id', orderId);

        if (error) {
            console.error('[Mediation] Error updating status:', error);
            res.status(500).json({ error: 'Failed to update status' });
            return;
        }

        console.log(`[Mediation] Status updated for order ${orderId}: ${active}`);
        res.status(200).json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
