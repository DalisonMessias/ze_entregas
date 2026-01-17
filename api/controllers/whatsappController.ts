import { Request, Response } from 'express';
import whatsappService from '../services/whatsappService.js';
import { supabaseAdmin } from '../services/supabaseClient.js';

/**
 * Retorna o status atual da conexão com o WhatsApp.
 */
export const getStatus = (req: Request, res: Response) => {
  const status = whatsappService.getStatus();
  res.status(200).json(status);
};

/**
 * Envia uma mensagem de texto para um destinatário.
 */
export const sendTextMessage = async (req: Request, res: Response) => {
  const { to, text } = req.body; // 'to' deve ser o número com DDI, ex: 5511999998888

  if (!to || !text) {
    return res.status(400).json({ error: 'Os campos "to" e "text" são obrigatórios.' });
  }

  try {
    // A lógica de adicionar "@s.whatsapp.net" e validar o número já está no service
    await whatsappService.sendMessage(to, text);
    res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao enviar mensagem de texto via API:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Busca a lista de todas as conversas salvas no banco de dados.
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('*')
      .order('last_message_timestamp', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (error: any) {
    console.error('❌ ERRO AO BUSCAR CONVERSAS:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      details: error.details || error.hint || 'Verifique se as tabelas do WhatsApp foram criadas no Supabase seguindo o arquivo supabase_global.sql.'
    });
  }
};

/**
 * Busca o histórico de mensagens de uma conversa específica.
 */
export const getMessages = async (req: Request, res: Response) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(400).json({ error: 'O ID da conversa ("conversationId") é obrigatório na URL.' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('message_timestamp', { ascending: true });

    if (error) {
      throw error;
    }

    res.status(200).json(data);
  } catch (error: any) {
    console.error(`Erro ao buscar mensagens para a conversa ${conversationId}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Busca a foto de perfil de um contato
 */
export const getProfilePicture = async (req: Request, res: Response) => {
  try {
    const { jid } = req.params;

    if (!jid) {
      return res.status(400).json({ error: 'JID é obrigatório' });
    }

    const profilePicUrl = await whatsappService.getProfilePicture(jid);

    res.status(200).json({ profilePicUrl });
  } catch (error: any) {
    console.error('Erro ao buscar foto de perfil:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Marca mensagem como lida
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { conversationId, messageId } = req.body;

    if (!conversationId || !messageId) {
      return res.status(400).json({ error: 'conversationId e messageId são obrigatórios' });
    }

    await whatsappService.markMessageAsRead(conversationId, messageId);

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erro ao marcar como lida:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Busca todos os contatos do WhatsApp.
 */
export const getContacts = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Erro ao buscar contatos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cria ou atualiza um contato.
 */
export const upsertContact = async (req: Request, res: Response) => {
  try {
    const { id, name, phoneNumber, phone_number, email, notes, tags, store_id } = req.body;

    // Normaliza os dados para o formato do banco (snake_case)
    const contactData = {
      id,
      name,
      phone_number: phoneNumber || phone_number, // Aceita ambos
      email,
      notes,
      tags,
      store_id,
      updated_at: new Date()
    };

    // Remove campos undefined para evitar sobrescrever com null se não for intencional
    Object.keys(contactData).forEach(key => (contactData as any)[key] === undefined && delete (contactData as any)[key]);

    const { data, error } = await supabaseAdmin
      .from('whatsapp_contacts')
      .upsert(contactData)
      .select()
      .single();

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Erro ao salvar contato:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Exclui um contato.
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
    console.error('Erro ao excluir contato:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reinicia o serviço de WhatsApp para forçar nova conexão.
 */
export const restartService = async (req: Request, res: Response) => {
  try {
    await whatsappService.restart();
    res.json({ success: true, message: 'Serviço de WhatsApp reiniciando...' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    await whatsappService.disconnect();
    res.json({ success: true, message: 'Logout realizado com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao realizar logout:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
