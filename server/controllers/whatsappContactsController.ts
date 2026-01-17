import { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabaseClient';

/**
 * Lista todos os contatos salvos de uma loja
 */
export const getAllContacts = async (req: Request, res: Response) => {
    try {
        const { storeId } = req.query;

        if (!storeId) {
            return res.status(400).json({ error: 'storeId é obrigatório' });
        }

        const { data, error } = await supabaseAdmin
            .from('whatsapp_contacts')
            .select('*')
            .eq('store_id', storeId)
            .order('name', { ascending: true });

        if (error) throw error;

        res.status(200).json(data || []);
    } catch (error: any) {
        console.error('Erro ao buscar contatos:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Cria um novo contato
 */
export const createContact = async (req: Request, res: Response) => {
    try {
        const { storeId, name, phoneNumber, email, notes, tags } = req.body;

        if (!storeId || !name || !phoneNumber) {
            return res.status(400).json({ error: 'storeId, name e phoneNumber são obrigatórios' });
        }

        // Formatar telefone removendo caracteres especiais
        const cleanPhone = phoneNumber.replace(/\D/g, '');

        const { data, error } = await supabaseAdmin
            .from('whatsapp_contacts')
            .insert({
                store_id: storeId,
                name,
                phone_number: cleanPhone,
                email,
                notes,
                tags: tags || [],
            })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique violation
                return res.status(409).json({ error: 'Contato já existe para esta loja' });
            }
            throw error;
        }

        res.status(201).json(data);
    } catch (error: any) {
        console.error('Erro ao criar contato:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Atualiza um contato existente
 */
export const updateContact = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, phoneNumber, email, notes, tags } = req.body;

        const updateData: any = {};
        if (name) updateData.name = name;
        if (phoneNumber) updateData.phone_number = phoneNumber.replace(/\D/g, '');
        if (email !== undefined) updateData.email = email;
        if (notes !== undefined) updateData.notes = notes;
        if (tags !== undefined) updateData.tags = tags;

        const { data, error } = await supabaseAdmin
            .from('whatsapp_contacts')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({ error: 'Contato não encontrado' });
        }

        res.status(200).json(data);
    } catch (error: any) {
        console.error('Erro ao atualizar contato:', error);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Deleta um contato
 */
export const deleteContact = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { error } = await supabaseAdmin
            .from('whatsapp_contacts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({ success: true });
    } catch (error: any) {
        console.error('Erro ao deletar contato:', error);
        res.status(500).json({ error: error.message });
    }
};
