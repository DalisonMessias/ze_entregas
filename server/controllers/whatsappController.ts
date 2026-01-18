import { Request, Response } from 'express';
import whatsappService from '../services/whatsappService.js';
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
    // 1. Pega status da memória
    const memoryStatus = whatsappService.getStatus(storeId);

    // 2. Se estiver desconectado em memória, verifica no banco se deveria estar conectado ou se tem sessão
    if (memoryStatus.status === 'DISCONNECTED') {
      const { data: session } = await supabaseAdmin
        .from('whatsapp_sessions')
        .select('status')
        .eq('store_id', storeId)
        .single();

      if (session) {
        // Se existe sessão no banco, mas memória está desconectada, pode estar reiniciando ou falhou
        // Retornamos o status do banco se for mais "ativo" que disconnected, ou mantemos disconnected
        // Mas o frontend precisa saber se TEM sessão para mostrar "Conectar Novamente" vs "Novo QR"
        return res.status(200).json({
          status: memoryStatus.status,
          qrCode: memoryStatus.qrCode,
          hasSession: true,
          databaseStatus: session.status
        });
      }
    }

    res.status(200).json({ ...memoryStatus, hasSession: true }); // Assumimos true se está conectado em memória
  } catch (error: any) {
    res.status(200).json({ status: 'DISCONNECTED', hasSession: false, error: error.message });
  }
};

/**
 * Envia uma mensagem de texto para um destinatário.
 */
export const sendTextMessage = async (req: Request, res: Response) => {
  const { to, text, attendantId } = req.body;

  if (!to || !text) {
    return res.status(400).json({ error: 'Os campos "to" e "text" são obrigatórios.' });
  }

  try {
    const storeId = getStoreId(req);
    await whatsappService.sendMessage(to, text, storeId, attendantId);
    res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao enviar mensagem de texto via API:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Envia uma mensagem de áudio para um destinatário.
 */
export const sendAudioMessage = async (req: Request, res: Response) => {
  const { to, attendantId } = req.body;
  const file = req.file;

  if (!to || !file) {
    return res.status(400).json({ error: 'Os campos "to" e o arquivo de áudio são obrigatórios.' });
  }

  try {
    const storeId = getStoreId(req);
    await whatsappService.sendAudio(to, file.buffer, storeId, attendantId);
    res.status(200).json({ success: true, message: 'Áudio enviado com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao enviar áudio via API:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Busca a lista de todas as conversas salvas no banco de dados para a loja.
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);
    const { data, error } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('*')
      .eq('store_id', storeId)
      .order('last_message_timestamp', { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    // Modificação ROBUSTA: Qualquer erro de banco retorna array vazio e loga o erro, NÃO retorna 500
    // Isso evita travar o frontend se o banco estiver instável ou sem migração
    const safeStoreId = (req.query.storeId as string) || (req.body.storeId as string) || 'unknown';
    console.error(`[Loja ${safeStoreId}] ❌ ERROR_GET_CONVERSATIONS:`, error.message);

    // Retorna 200 com array vazio e meta-informação do erro nos headers ou corpo
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
      .from('whatsapp_conversation_orders')
      .select('conversation_id, position')
      .eq('store_id', storeId)
      .eq('attendant_id', attendantId)
      .order('position', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    // Silencia erros de tabela inexistente
    if (error.message?.includes('does not exist') || error.code?.startsWith('42')) {
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
      .from('whatsapp_conversation_orders')
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
      .from('whatsapp_messages')
      .select('*')
      .eq('store_id', storeId)
      .eq('conversation_id', conversationId)
      .order('message_timestamp', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    console.error(`Erro ao buscar mensagens para a conversa ${conversationId}:`, error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Busca a foto de perfil de um contato usando a instância da loja.
 */
export const getProfilePicture = async (req: Request, res: Response) => {
  try {
    const { jid } = req.params;
    const storeId = getStoreId(req);

    if (!jid) return res.status(400).json({ error: 'JID é obrigatório' });

    const instance = whatsappService.getInstance(storeId);
    const profilePicUrl = await instance.getProfilePicture(jid);

    res.status(200).json({ profilePicUrl });
  } catch (error: any) {
    console.error('Erro ao buscar foto de perfil:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Marca mensagem como lida na instância da loja.
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const { conversationId, messageId } = req.body;
    const storeId = getStoreId(req);

    if (!conversationId || !messageId) {
      return res.status(400).json({ error: 'conversationId e messageId são obrigatórios' });
    }

    const instance = whatsappService.getInstance(storeId);
    await instance.markMessageAsRead(conversationId, messageId);

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Erro ao marcar como lida:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Busca contatos do WhatsApp filtrados por loja.
 */
export const getContacts = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);
    const { data, error } = await supabaseAdmin
      .from('whatsapp_contacts')
      .select('*')
      .eq('store_id', storeId)
      .order('name', { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    console.error('Erro ao buscar contatos:', error);
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
      .from('whatsapp_contacts')
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
      .from('whatsapp_contacts')
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
      .from('whatsapp_sessions')
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
  try {
    const storeId = getStoreId(req);
    const { forceLogout } = req.body;

    const instance = whatsappService.getInstance(storeId);

    if (forceLogout === false) {
      await instance.reconnect();
      res.json({ success: true, message: `Reconectando sessão da loja ${storeId}...` });
    } else {
      await instance.restart();
      res.json({ success: true, message: `Reiniciando serviço da loja ${storeId} (Novo QR)...` });
    }
  } catch (error: any) {
    console.error('[API] Erro ao reiniciar serviço:', error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
};

/**
 * Logout da instância da loja.
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const storeId = getStoreId(req);

    // Tenta fazer o logout da instância
    try {
      await whatsappService.logout(storeId);
    } catch (e) {
      console.warn('Erro ao chamar logout no serviço (pode já estar desconectado):', e);
    }

    // Garante a limpeza no banco
    await clearDatabaseSession(storeId);

    res.json({ success: true, message: 'Logout realizado com sucesso e instância removida.' });
  } catch (error: any) {
    console.error('Erro ao realizar logout:', error);
    // Mesmo com erro, retorna sucesso para o frontend não travar no loading
    res.status(200).json({ success: true, message: 'Logout forçado realizado.', warning: error.message });
  }
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
      .from('whatsapp_conversations')
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

    await whatsappService.deleteConversation(conversationId, storeId);
    res.status(200).json({ success: true, message: 'Conversa deletada com sucesso.' });
  } catch (error: any) {
    console.error('Erro ao deletar conversa via API:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

