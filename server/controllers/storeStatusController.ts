import { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabaseClient.js';

/**
 * Retorna o status atual da loja (aberta/fechada)
 */
export const getStoreStatus = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.params;

        const { data, error } = await supabaseAdmin
            .from('user_profiles')
            .select('is_currently_open, full_name, email')
            .eq('id', storeId)
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            isOpen: data.is_currently_open ?? true,
            storeName: data.full_name,
        });
    } catch (error: any) {
        console.error('Erro ao buscar status da loja:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Alterna o status da loja (abrir/fechar)
 */
export const toggleStoreStatus = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.params;
        const { isOpen } = req.body;

        const { error } = await supabaseAdmin
            .from('user_profiles')
            .update({ is_currently_open: isOpen })
            .eq('id', storeId);

        if (error) throw error;

        res.status(200).json({
            success: true,
            isOpen,
            message: isOpen ? 'Loja aberta' : 'Loja fechada'
        });
    } catch (error: any) {
        console.error('Erro ao alternar status da loja:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
