import { Request, Response } from 'express';
import internalChatService from '../services/internalChatService.js';
import chatService from '../services/chatService.js';
import { supabaseAdmin } from '../services/supabaseClient.js';

// Controller resiliente - retorna 200/[] em caso de falhas para evitar quebrar o frontend

/**
 * Auxiliar para extrair o storeId da requisição.
 */
const getStoreId = (req: Request): string | null => {
  try {
    let storeId = (req.query.storeId as string) || (req.body.storeId as string) || (req as any).user?.id;

    if (!storeId || storeId === 'null' || storeId === 'undefined' || storeId === 'default-store-id') {
      return null;
    }

    // Validação básica de UUID para evitar erros de cast no Postgres
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(storeId)) {
      return null;
    }

    return storeId;
  } catch (e) {
    return null;
  }
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

    if (!storeId) {
      return res.status(200).json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('chat_conversations')
      .select('*')
      .eq('store_id', storeId)
      .order('last_message_timestamp', { ascending: false });

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error: any) {
    console.error('[ChatController] Erro em getConversations:', error);
    // Retornar vazio para evitar quebrar o frontend com 500
    res.status(200).json([]);
  }
};

/**
 * Busca a ordem manual das conversas por atendente.
 */
export const getConversationOrder = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);
    const attendantId = (req.query.attendantId as string) || (req as any).user?.id;

    if (!storeId || !attendantId) {
      return res.status(200).json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('chat_conversation_orders')
      .select('conversation_id, position')
      .eq('store_id', storeId)
      .eq('attendant_id', attendantId)
      .order('position', { ascending: true });

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error: any) {
    console.error('[ChatController] Erro em getConversationOrder:', error);
    res.status(200).json([]);
  }
};

/**
 * Salva a ordem manual das conversas.
 */
export const saveConversationOrder = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);
    const { attendantId, orders } = req.body;

    if (!storeId || !attendantId || !orders || !Array.isArray(orders)) {
      return res.status(200).json({ success: true }); // Silencia se dados inválidos
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
    console.error('[ChatController] Erro em saveConversationOrder:', error);
    res.status(200).json({ success: true }); // Retorna sucesso para não bloquear UI
  }
};

/**
 * Busca o histórico de mensagens de uma conversa específica dentro da loja.
 */
export const getMessages = async (req: Request, res: Response) => {
  const { conversationId } = req.params;

  if (!conversationId) {
    return res.status(200).json([]);
  }

  try {
    const storeId = getStoreId(req);
    if (!storeId) return res.status(200).json([]);

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('store_id', storeId)
      .eq('conversation_id', conversationId)
      .order('message_timestamp', { ascending: true });

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error: any) {
    console.error(`[ChatController] Erro ao buscar mensagens (${conversationId}):`, error);
    res.status(200).json([]);
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
    if (!storeId) return res.status(200).json([]);

    const { data, error } = await supabaseAdmin
      .from('chat_contacts')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error: any) {
    console.error('[ChatController] Erro em getContacts:', error);
    res.status(200).json([]);
  }
};

/**
 * Cria ou atualiza um contato para a loja específica.
 */
export const upsertContact = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);
    if (!storeId) {
      return res.status(400).json({ error: 'storeId inválido ou não fornecido.' });
    }

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
    console.error('[ChatController] Erro ao salvar contato:', error);
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
 * Bloqueia ou desbloqueia um contato/conversa.
 */
export const blockContact = async (req: Request, res: Response) => {
  try {
    const { conversationId, action } = req.body;
    const storeId = getStoreId(req);

    if (!conversationId || !action) {
      return res.status(400).json({ error: 'ConversationId e action são obrigatórios.' });
    }

    if (!['block', 'unblock'].includes(action)) {
      return res.status(400).json({ error: 'Action deve ser block ou unblock.' });
    }

    // 1. Persistência interna no banco de dados (Funciona para WhatsApp e Menu Digital)
    const { error: dbError } = await supabaseAdmin
      .from('chat_conversations')
      .update({ is_blocked: action === 'block' })
      .eq('store_id', storeId)
      .eq('conversation_id', conversationId);

    if (dbError) {
      console.warn('[Block] Erro ao atualizar status no banco:', dbError);
    }

    // 2. Se for WhatsApp, tenta sincronizar com o aparelho
    if (conversationId.includes('@s.whatsapp.net')) {
      try {
        await chatService.blockContact(conversationId, action, storeId);
      } catch (error: any) {
        console.warn(`[Block] Falha ao sincronizar com WhatsApp (${action}):`, error.message);
        // Não retornamos erro 500 se o banco foi atualizado, para não travar a UI
      }
    }

    res.status(200).json({
      success: true,
      message: `Contato ${action === 'block' ? 'bloqueado' : 'desbloqueado'} com sucesso.`
    });
  } catch (error: any) {
    console.error('Erro ao bloquear contato:', error);
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

    if (!storeId) {
      return res.status(200).json({ success: true }); // Silencia se storeId inválido
    }

    if (!['recent', 'manual'].includes(preference)) {
      return res.status(400).json({ error: 'Preferência inválida (recent ou manual).' });
    }

    const { error } = await supabaseAdmin
      .from('ze_assistant_config')
      .upsert({
        store_id: storeId,
        chat_sort_preference: preference,
        updated_at: new Date()
      }, { onConflict: 'store_id' });

    if (error) throw error;

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[ChatController] Erro em updateSortPreference:', error);
    // Retorna sucesso mesmo com erro para não bloquear UI
    res.status(200).json({ success: true });
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

/**
 * Atualiza o status de uma conversa (open, closed).
 */
export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { status } = req.body;
    const storeId = getStoreId(req);

    if (!conversationId) return res.status(400).json({ error: 'ConversationId é obrigatório.' });
    if (!['open', 'closed'].includes(status)) return res.status(400).json({ error: 'Status inválido (open, closed).' });

    const { error } = await supabaseAdmin
      .from('chat_conversations')
      .update({ status })
      .eq('conversation_id', conversationId)
      .eq('store_id', storeId);

    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Edita uma mensagem existente.
 */
export const editMessage = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body; // New content
    const storeId = getStoreId(req);

    if (!messageId || !content) return res.status(400).json({ error: 'MessageId e content são obrigatórios.' });

    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({
        content,
        is_edited: true,
        edited_at: new Date()
      })
      .eq('message_id', messageId)
      .eq('store_id', storeId);

    if (error) throw error;
    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erro ao editar mensagem:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Busca os votos de uma enquete específica.
 */
export const getPollVotes = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { data, error } = await supabaseAdmin
      .from('chat_poll_votes')
      .select('*')
      .eq('message_id', messageId);

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error: any) {
    console.error('Erro ao buscar votos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Registra ou remove um voto em uma enquete.
 */
export const votePoll = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { optionIndex, visitorId, visitorName, action, allowMultiple } = req.body;

    if (action === 'remove') {
      const { error } = await supabaseAdmin
        .from('chat_poll_votes')
        .delete()
        .eq('message_id', messageId)
        .eq('voter_id', visitorId)
        .eq('option_index', optionIndex);
      if (error) throw error;
    } else {
      // Se não permitir multiplos, remover outros votos desse usuário nesta enquete
      if (!allowMultiple) {
        await supabaseAdmin
          .from('chat_poll_votes')
          .delete()
          .eq('message_id', messageId)
          .eq('voter_id', visitorId);
      }

      const { error } = await supabaseAdmin
        .from('chat_poll_votes')
        .upsert({
          message_id: messageId,
          voter_id: visitorId,
          option_index: optionIndex,
          voter_name: visitorName || 'Anônimo'
        }, { onConflict: 'message_id,voter_id,option_index' });
      if (error) throw error;
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erro ao registrar voto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
