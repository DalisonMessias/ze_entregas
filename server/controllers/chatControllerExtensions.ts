import { Request, Response } from 'express';
import { supabaseAdmin } from '../services/supabaseClient.js';

/**
 * Alterna estado do assistente (Zé) para uma conversa específica.
 */
/**
 * Alterna estado do assistente (Zé) para uma conversa específica.
 */
export const toggleAssistant = async (req: Request, res: Response) => {
    try {
        const { conversationId, storeId, enabled } = req.body;

        // Usar upsert para garantir que o registro exista
        const { error } = await supabaseAdmin
            .from('ze_assistant_conversations')
            .upsert({
                conversation_id: conversationId,
                store_id: storeId,
                handoff_to_human: !enabled,
                updated_at: new Date()
            }, { onConflict: 'conversation_id,store_id' });

        if (error) throw error;

        res.status(200).json({
            success: true,
            assistantEnabled: enabled,
            message: enabled ? 'Zé Assistente ativado' : 'Transferido para atendente humano'
        });
    } catch (error: any) {
        console.error('Erro DETALHADO ao alternar assistente:', JSON.stringify(error, null, 2));
        res.status(500).json({ success: false, message: error.message, details: error });
    }
};

/**
 * Finaliza uma conversa.
 */
export const finalizeConversation = async (req: Request, res: Response) => {
    try {
        const { conversationId } = req.params;
        const { storeId } = req.body;

        // Marcar conversa como finalizada
        const { error } = await supabaseAdmin
            .from('chat_conversations')
            .update({
                status: 'closed',
                closed_at: new Date().toISOString()
            })
            .eq('conversation_id', conversationId)
            .eq('store_id', storeId);

        if (error) throw error;

        res.status(200).json({ success: true, message: 'Conversa finalizada' });
    } catch (error: any) {
        console.error('Erro ao finalizar conversa:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Bloqueia ou desbloqueia um contato.
 */
export const blockContact = async (req: Request, res: Response) => {
    try {
        const { contactId } = req.params;
        const { storeId, blocked } = req.body;

        const { error } = await supabaseAdmin
            .from('chat_contacts')
            .update({ is_blocked: blocked })
            .eq('id', contactId)
            .eq('store_id', storeId);

        if (error) throw error;

        res.status(200).json({
            success: true,
            message: blocked ? 'Contato bloqueado' : 'Contato desbloqueado'
        });
    } catch (error: any) {
        console.error('Erro ao bloquear/desbloquear contato:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Recebe upload de áudio e salva como mensagem.
 */
export const handleAudioUpload = async (req: Request, res: Response) => {
    try {
        const { storeId, visitorId, isFromVisitor } = req.body;
        const audioFile = req.file;

        if (!audioFile) {
            return res.status(400).json({ success: false, message: 'Arquivo de áudio não enviado' });
        }

        // Gerar nome único para o arquivo
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.webm`;
        const filePath = `${storeId}/${fileName}`;

        // Upload para Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('chat-audio')
            .upload(filePath, audioFile.buffer, {
                contentType: 'audio/webm',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // Obter URL pública do áudio
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('chat-audio')
            .getPublicUrl(filePath);

        // Salvar mensagem com URL do áudio
        const messageContent = `AUDIO:${publicUrl}`;

        const { data: messageData, error: messageError } = await supabaseAdmin
            .from('chat_messages')
            .insert({
                store_id: storeId,
                conversation_id: visitorId,
                message_id: `audio_${Date.now()}`,
                content: messageContent,
                message: messageContent,
                sender_id: isFromVisitor ? storeId : storeId,
                sender_type: isFromVisitor ? 'guest' : 'store',
                from_me: !isFromVisitor,
                message_type: 'audio',
                status: 'sent'
            })
            .select()
            .single();

        if (messageError) throw messageError;

        res.status(200).json({
            success: true,
            audioUrl: publicUrl,
            messageId: messageData.message_id
        });
    } catch (error: any) {
        console.error('Erro ao fazer upload de áudio:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
