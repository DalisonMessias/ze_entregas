import { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabaseClient.js';

export const debugZeStatus = async (req: Request, res: Response) => {
    const { storeId } = req.params;
    const results: any = {
        checks: {},
        config: null,
        error: null
    };

    try {
        // 1. Verificar conexão com banco e tabela Config
        const { data: config, error: configError } = await supabaseAdmin
            .from('ze_assistant_config')
            .select('*')
            .eq('store_id', storeId)
            .single();

        results.checks.configTableValues = config ? 'FOUND' : 'NOT_FOUND';
        results.config = config;

        if (configError) {
            results.checks.configQueryError = configError;
        }

        // 2. Verificar Tabela de Conversas
        const { count, error: convError } = await supabaseAdmin
            .from('ze_assistant_conversations')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId);

        results.checks.conversationsAccess = convError ? 'ERROR' : 'OK';
        results.checks.conversationsCount = count;

        if (convError) results.checks.conversationsError = convError;

        // 3. Verificar Tabela de Regras
        const { count: rulesCount, error: rulesError } = await supabaseAdmin
            .from('ze_assistant_rules')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeId);

        results.checks.rulesAccess = rulesError ? 'ERROR' : 'OK';

        res.status(200).json(results);

    } catch (e: any) {
        results.error = e.message;
        res.status(500).json(results);
    }
};
