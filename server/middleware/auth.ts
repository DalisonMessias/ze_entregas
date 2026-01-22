import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin as supabase } from '../services/supabaseClient.js';

export const apiKeyAuth = async (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.header('x-api-key');

    if (!apiKey) {
        return res.status(401).json({ error: 'API Key is missing' });
    }

    try {
        // Buscar a chave no banco de dados
        const { data: keyData, error } = await supabase
            .from('api_keys')
            .select('id, user_id, permissions, is_active, user_profiles(store_name)')
            .eq('key_token', apiKey)
            .single();

        if (error || !keyData) {
            return res.status(403).json({ error: 'Invalid API Key' });
        }

        if (!keyData.is_active) {
            return res.status(403).json({ error: 'API Key is inactive' });
        }

        // Anexar dados do usuário e chave à requisição
        (req as any).user = {
            id: keyData.user_id,
            store_name: Array.isArray(keyData.user_profiles) ? keyData.user_profiles[0]?.store_name : (keyData.user_profiles as any)?.store_name
        };
        (req as any).apiKey = {
            id: keyData.id,
            permissions: keyData.permissions
        };

        // Atualizar último uso (assíncrono, não bloqueia a request)
        supabase.from('api_keys').update({ last_used_at: new Date() }).eq('id', keyData.id).then();

        // Logar requisição (opcional, pode ser feito em outro middleware ou aqui)
        const logData = {
            api_key_id: keyData.id,
            user_id: keyData.user_id,
            endpoint: req.originalUrl,
            method: req.method,
            status_code: 0, // Será atualizado no finish event
            ip_address: req.ip
        };

        // Hook para capturar o status code no final
        res.on('finish', () => {
            supabase.from('api_logs').insert({
                ...logData,
                status_code: res.statusCode,
                duration_ms: 0 // Placeholder, idealmente mediríamos tempo
            }).then();
        });

        next();
    } catch (err) {
        console.error('API Auth Error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};
