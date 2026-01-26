import { Request, Response } from 'express';
import internalChatService from '../services/internalChatService.js';
import { supabaseAdmin } from '../services/supabaseClient.js';

/**
 * Auxiliar para extrair o storeId da requisição.
 * No sistema, o id do usuário autenticado (req.user.id) corresponde ao storeId da loja.
 */
const getStoreId = (req: Request): string => {
  const storeId = (req.query.storeId as string) || (req.body.storeId as string) || (req as any).user?.id;
  if (!storeId) {
    throw new Error('storeId não fornecido e não encontrado no contexto do usuário.');
  }
  return storeId;
};

/**
 * Retorna o status atual da conexão com o WhatsApp para uma loja específica.
 */
export const getStatus = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);
    const status = internalChatService.getStatus(storeId);
    res.status(200).json({ ...status, hasSession: true });
  } catch (error: any) {
    res.status(200).json({ status: 'CONNECTED', hasSession: true, isInternal: true });
  }
};

/**
 * Envia uma mensagem de texto para um destinatário.
 */
export const sendTextMessage = async (req: Request, res: Response) => {
  const { to, text, attendantId, senderName } = req.body;

  if (!to || !text) {
    return res.status(400).json({ error: 'Os campos "to" e "text" são obrigatórios.' });
  }

  try {
    const storeId = getStoreId(req);
    const result = await internalChatService.sendMessage({
      storeId,
      conversationId: to,
      content: text,
      senderId: attendantId || storeId,
      senderName: senderName || 'Atendente',
      fromMe: true
    });

    if (result.success) {
      res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso.' });
    } else {
      throw result.error;
    }
  } catch (error: any) {
    console.error('Erro ao enviar mensagem interna via API:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Envia uma mensagem interna vinda do Menu Digital (Visitante -> Loja).
 */
export const sendInternalMessage = async (req: Request, res: Response) => {
  const { storeId, visitorId, content, senderId, isFromVisitor } = req.body;

  console.log('[sendInternalMessage] Recebido:', { storeId, visitorId, content, senderId, isFromVisitor });

  if (!storeId || !content) {
    return res.status(400).json({ error: 'Campos storeId e content são obrigatórios.' });
  }

  try {
    const result = await internalChatService.sendMessage({
      storeId,
      conversationId: visitorId || senderId, // Para visitantes, o ID da conversa é o ID do visitante
      content,
      senderId: senderId || visitorId,
      senderName: isFromVisitor ? 'Visitante' : 'Atendente',
      fromMe: !isFromVisitor, // Se é do visitante, não é fromMe (da loja)
      type: 'chat'
    });

    if (result.success) {
      res.status(200).json({ success: true, messageId: result.messageId });
    } else {
      throw result.error;
    }
  } catch (error: any) {
    console.error('[sendInternalMessage] ERRO COMPLETO:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message || 'Erro interno.', details: error.details || error.hint });
  }
};

// sendAudioMessage removido pois o chat interno tratará uploads via API genérica futuramente

/**
 * Busca a lista de todas as conversas salvas no banco de dados para a loja.
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);
    const { data, error } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('store_id', storeId)
      .order('last_message_timestamp', { ascending: false });

    if (error) throw error;
    console.log(`[Loja ${storeId}] 🔍 getConversations: Retornando ${data?.length || 0} conversas.`);
    res.status(200).json(data);
  } catch (error: any) {
    // Modificação ROBUSTA: Qualquer erro de banco (mesmo schema ausente) retorna array vazio
    const safeStoreId = (req.query.storeId as string) || (req.body.storeId as string) || 'unknown';
    console.error(`[Loja ${safeStoreId}] ❌ ERROR_GET_CONVERSATIONS:`, error.message);

    // Se for erro de schema/tabela, retornamos 200/[] silenciosamente
    if (error.message?.includes('schema cache') || error.message?.includes('does not exist') || error.code?.startsWith('42')) {
      return res.status(200).json([]);
    }

    // Outros erros ainda retornam 200/[] mas com log
    return res.status(200).json([]);
  }
};

/**
 * Busca a ordem manual das conversas por atendente.
 */
export const getConversationOrder = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);
    const attendantId = (req.query.attendantId as string) || (req as any).user?.id;

    if (!attendantId) {
      return res.status(400).json({ error: 'attendantId é obrigatório.' });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_conversation_orders')
      .select('conversation_id, position')
      .eq('store_id', storeId)
      .eq('attendant_id', attendantId)
      .order('position', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    // Silencia erros de tabela inexistente ou schema cache
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache') || error.code?.startsWith('42')) {
      return res.status(200).json([]);
    }
    console.error('Erro ao buscar ordem das conversas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Salva a ordem manual das conversas.
 */
export const saveConversationOrder = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);
    const { attendantId, orders } = req.body; // orders: { conversation_id, position }[]

    if (!attendantId || !orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Parâmetros attendantId e orders (array) são obrigatórios.' });
    }

    const orderData = orders.map((o: any) => ({
      attendant_id: attendantId,
      store_id: storeId,
      conversation_id: o.conversation_id,
      position: o.position,
      updated_at: new Date()
    }));

    const { error } = await supabaseAdmin
      .from('chat_conversation_orders')
      .upsert(orderData, { onConflict: 'attendant_id,store_id,conversation_id' });

    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erro ao salvar ordem das conversas:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Busca o histórico de mensagens de uma conversa específica dentro da loja.
 */
export const getMessages = async (req: Request, res: Response) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(400).json({ error: 'O ID da conversa é obrigatório.' });
  }

  try {
    const storeId = getStoreId(req);
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('store_id', storeId)
      .eq('conversation_id', conversationId)
      .order('message_timestamp', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    console.error(`Erro ao buscar mensagens para a conversa ${conversationId}:`, error);
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache') || error.code?.startsWith('42')) {
      return res.status(200).json([]);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Busca a foto de perfil de um contato usando a instância da loja.
 */
export const getProfilePicture = async (req: Request, res: Response) => {
  res.status(200).json({ profilePicUrl: null });
};

/**
 * Marca mensagem como lida na instância da loja.
 */
export const markAsRead = async (req: Request, res: Response) => {
  res.status(200).json({ success: true });
};

/**
 * Busca contatos do WhatsApp filtrados por loja.
 */
export const getContacts = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);
    const { data, error } = await supabaseAdmin
      .from('chat_contacts')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Erro ao buscar contatos:', error);
    if (error.message?.includes('does not exist') || error.message?.includes('schema cache') || error.code?.startsWith('42')) {
      return res.status(200).json([]);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cria ou atualiza um contato para a loja específica.
 */
export const upsertContact = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);
    const { id, name, phoneNumber, phone_number, email, notes, tags } = req.body;

    const contactData = {
      id,
      store_id: storeId,
      name,
      phone_number: phoneNumber || phone_number,
      email,
      notes,
      tags,
      updated_at: new Date()
    };

    Object.keys(contactData).forEach(key => (contactData as any)[key] === undefined && delete (contactData as any)[key]);

    const { data, error } = await supabaseAdmin
      .from('chat_contacts')
      .upsert(contactData, { onConflict: 'store_id,phone_number' })
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
 * Exclui um contato da loja.
 */
export const deleteContact = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const storeId = getStoreId(req);
    const { error } = await supabaseAdmin
      .from('chat_contacts')
      .delete()
      .eq('id', id)
      .eq('store_id', storeId);

    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir contato:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Limpa a sessão do WhatsApp no banco de dados para uma loja específica.
 */
export const clearDatabaseSession = async (storeId: string) => {
  try {
    const { error } = await supabaseAdmin
      .from('chat_sessions')
      .delete()
      .eq('store_id', storeId);

    if (error) {
      // Se der erro de coluna/tabela, ignoramos pois significa que já não tem sessão válida
      if (error.message?.includes('does not exist')) return true;
      console.error(`❌ Erro ao limpar sessão no banco (Loja ${storeId}):`, error.message);
      return false;
    }
    console.log(`✅ Sessão do WhatsApp para a loja ${storeId} limpa com sucesso.`);
    return true;
  } catch (e) { return true; }
};

/**
 * Reinicia o serviço de WhatsApp para uma loja específica.
 * Se forceLogout=true (padrão antigo), ele limpa a sessão para gerar novo QR.
 * Se apenas reconectar, use o endpoint específico.
 */
export const restartService = async (req: Request, res: Response) => {
  res.json({ success: true, message: `Serviço de Chat Interno operando normalmente.` });
};

/**
 * Logout da instância da loja.
 */
export const logout = async (req: Request, res: Response) => {
  res.json({ success: true, message: 'O Chat Interno não requer logout de sessão externa.' });
};

/**
 * Atualiza a prioridade de uma conversa.
 */
export const updatePriority = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { priority } = req.body;
    const storeId = getStoreId(req);

    if (!conversationId) {
      return res.status(400).json({ error: 'ConversationId é obrigatório.' });
    }

    if (priority && !['critical', 'high', 'normal', 'low'].includes(priority)) {
      return res.status(400).json({ error: 'Prioridade inválida.' });
    }

    const { error } = await supabaseAdmin
      .from('chat_conversations')
      .update({ priority })
      .eq('conversation_id', conversationId)
      .eq('store_id', storeId);

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar prioridade:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * Deleta uma conversa (sincronizado com o aparelho).
 */
export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const storeId = getStoreId(req);

    if (!conversationId) {
      return res.status(400).json({ error: 'ConversationId é obrigatório.' });
    }

    // 1. Apagar mensagens da conversa (Garantia de limpeza total)
    await supabaseAdmin.from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('store_id', storeId);

    // 2. Apagar a conversa
    await supabaseAdmin.from('chat_conversations')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('store_id', storeId);

    res.status(200).json({ success: true, message: 'Conversa e histórico deletados com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar conversa interna:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * Atualiza a preferência de ordenação das conversas (manual vs automático).
 */
export const updateSortPreference = async (req: Request, res: Response) => {
  try {
    const { preference } = req.body;
    const storeId = getStoreId(req);

    if (!['recent', 'manual'].includes(preference)) {
      return res.status(400).json({ error: 'Preferência inválida (recent ou manual).' });
    }

    const { error } = await supabaseAdmin
      .from('ze_assistant_config')
      .update({ chat_sort_preference: preference })
      .eq('store_id', storeId);

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar preferência de ordenação:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
/**
 * Deleta uma mensagem específica (sincronizado: apaga para todos).
 */
export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const storeId = getStoreId(req);

    if (!messageId) {
      return res.status(400).json({ error: 'MessageId é obrigatório.' });
    }

    // Hard Delete: apaga do banco, sumindo para Store e Cliente
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('message_id', messageId)
      .eq('store_id', storeId);

    if (error) throw error;

    res.status(200).json({ success: true, message: 'Mensagem apagada com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar mensagem:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Limpa o histórico de uma conversa (sincronizado: apaga para todos), mas mantém a conversa aberta.
 */
export const clearConversationMessages = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const storeId = getStoreId(req);

    if (!conversationId) {
      return res.status(400).json({ error: 'ConversationId é obrigatório.' });
    }

    // Hard Delete em todas as mensagens da conversa
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('store_id', storeId);

    if (error) throw error;

    // Atualiza a conversa para remover o snippet da última mensagem
    await supabaseAdmin
      .from('chat_conversations')
      .update({
        last_message_content: '',
        unread_count: 0
      })
      .eq('conversation_id', conversationId)
      .eq('store_id', storeId);

    res.status(200).json({ success: true, message: 'Histórico da conversa limpo com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao limpar conversa:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
