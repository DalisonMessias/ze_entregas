
import makeWASocket, {
  DisconnectReason,
  WAMessage,
  WASocket,
  proto,
  isJidGroup,
  getContentType,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  Browsers,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import { EventEmitter } from 'events';
import { useDatabaseAuth, clearDatabaseSession } from './useDatabaseAuth.js';
import { supabaseAdmin } from './supabaseClient.js';
import { saveMediaToStorage } from '../utils/mediaStorage.js';

type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'WAITING_QR';

class WhatsappService extends EventEmitter {
  private sock: WASocket | undefined;
  private status: ConnectionStatus = 'DISCONNECTED';
  private qrCode: string | undefined;

  constructor() {
    super();
    this.initialize();
  }

  private async initialize() {
    try {
      console.log('Iniciando o serviço de WhatsApp...');
      this.status = 'CONNECTING';
      this.emit('status.change', this.status);
      await this.connectToWhatsApp();
    } catch (error) {
      console.error('Falha crítica na inicialização do WhatsApp:', error);
      this.status = 'DISCONNECTED';
      this.emit('status.change', this.status);
    }
  }

  public getStatus() {
    return { status: this.status, qrCode: this.qrCode };
  }

  private getMyJid() {
    return this.sock?.user?.id.split(':')[0] + '@s.whatsapp.net';
  }

  private async connectToWhatsApp() {
    try {
      console.log('📡 Conectando ao banco de dados para buscar sessão...');
      const { state, saveCreds } = await useDatabaseAuth();
      console.log('✅ Estado de autenticação carregado.');

      console.log('⚡ Iniciando instância do WASocket (Baileys)...');

      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`📡 Usando versão do WA v${version.join('.')}, isLatest: ${isLatest}`);

      this.sock = makeWASocket({
        version,
        printQRInTerminal: false,
        auth: state,
        logger: pino({ level: 'warn' }),
        browser: Browsers.macOS('Desktop'),
        syncFullHistory: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
      });

      console.log('✅ Instância WASocket criada com sucesso.');

      console.log('🔗 Configurando ouvintes de eventos do WhatsApp...');
      this.setupEventHandlers();
      this.sock.ev.on('creds.update', saveCreds);
      console.log('✅ Ouvintes de eventos configurados.');

    } catch (error: any) {
      console.error('❌ Erro ao conectar com o WhatsApp / Banco de Dados:', error.message || error);
      this.status = 'DISCONNECTED';
      this.emit('status.change', this.status);

      console.log('🔄 Tentando reconectar em 5 segundos...');
      setTimeout(() => this.connectToWhatsApp(), 5000);
    }
  }

  private setupEventHandlers() {
    if (!this.sock) return;

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      console.log('🔄 Atualização de Conexão Baileys:', { connection, qr: !!qr });

      if (lastDisconnect?.error) {
        console.error('❌ Erro detalhado de desconexão Baileys:', lastDisconnect.error);
      }

      if (qr) {
        console.log('✨ Novo QR Code gerado pelo Baileys.');
        this.status = 'WAITING_QR';
        this.qrCode = qr;
        this.emit('qr.update', qr);
        this.emit('status.change', this.status);
      }
      if (connection === 'close') {
        const error = lastDisconnect?.error as Boom;
        const statusCode = error?.output?.statusCode;
        console.log(`📡 Conexão fechada. Status Code: ${statusCode}`);

        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        this.status = 'DISCONNECTED';
        this.emit('status.change', this.status);

        if (shouldReconnect) {
          console.log('🔄 Tentando reconectar automaticamente...');
          this.connectToWhatsApp();
        } else {
          console.log('🚪 Desconectado (Logged Out). Limpando sessão...');
          await clearDatabaseSession();
          this.connectToWhatsApp();
        }
      } else if (connection === 'open') {
        this.status = 'CONNECTED';
        this.qrCode = undefined;
        this.emit('status.change', this.status);
        this.emit('connection.open');
      }
    });

    this.sock.ev.on('messages.upsert', (m) => {
      m.messages.forEach(async (message) => {
        // Ignora atualizações de status, mas ACEITA 'notify' (novas) e 'append' (histórico)
        if (message.key.remoteJid === 'status@broadcast') {
          return;
        }
        await this.handleNewMessage(message);
        this.emit('messages.upsert', message);
      });
    });

    // Sincronização de histórico inicial (Baileys v5+)
    this.sock.ev.on('messaging-history.set', async (history) => {
      console.log(`📜 Histórico recebido: ${history.chats.length} chats, ${history.messages.length} mensagens.`);

      const { chats, messages } = history;

      // 1. Sincroniza Chats
      for (const chat of chats) {
        try {
          const conversationId = chat.id;
          if (conversationId === 'status@broadcast') continue;

          let contactName = chat.name || conversationId.split('@')[0];

          await supabaseAdmin.from('whatsapp_conversations').upsert({
            conversation_id: conversationId,
            contact_name: contactName,
            unread_count: chat.unreadCount || 0,
            last_message_timestamp: chat.conversationTimestamp ? new Date(Number(chat.conversationTimestamp) * 1000) : new Date(),
            updated_at: new Date()
          });
        } catch (error) {
          console.error('Erro no sync de chat (history):', error);
        }
      }

      // 2. Sincroniza Mensagens
      for (const message of messages) {
        try {
          if (message.key.remoteJid === 'status@broadcast') continue;
          await this.handleNewMessage(message);
        } catch (error) {
          console.error('Erro no sync de mensagem (history):', error);
        }
      }

      console.log('✅ Sincronização de histórico concluída.');
    });

    this.sock.ev.on('contacts.upsert', async (contacts) => {
      console.log(`👥 Sincronizando ${contacts.length} contatos com o banco...`);
      for (const contact of contacts) {
        try {
          // Apenas sincroniza se tiver nome
          if (contact.name || contact.notify) {
            await supabaseAdmin.from('whatsapp_contacts').upsert({
              phone_number: contact.id.split('@')[0],
              name: contact.name || contact.notify || contact.id.split('@')[0],
              updated_at: new Date()
            }, { onConflict: 'phone_number' }); // Ajuste: conflito por número se store_id for nulo
          }
        } catch (error) {
          console.error('Erro ao sincronizar contato:', error);
        }
      }
    });

    // Novo Listener: Sincroniza a lista de conversas (Chats) do aparelho
    this.sock.ev.on('chats.upsert', async (chats) => {
      console.log(`💬 Sincronizando ${chats.length} conversas (chats) do aparelho...`);
      for (const chat of chats) {
        try {
          const conversationId = chat.id;
          if (conversationId === 'status@broadcast') continue;

          // Tenta obter nome do contato/grupo se não vier no chat
          let contactName = chat.name || conversationId.split('@')[0];

          await supabaseAdmin.from('whatsapp_conversations').upsert({
            conversation_id: conversationId,
            contact_name: contactName,
            unread_count: chat.unreadCount || 0,
            last_message_timestamp: chat.conversationTimestamp ? new Date(Number(chat.conversationTimestamp) * 1000) : new Date(),
            // Não sobrescrever conteúdo se não tiver informação nova, para não apagar previews
            updated_at: new Date()
          });
        } catch (error) {
          console.error('Erro ao sincronizar chat:', error);
        }
      }
    });
  }

  private async handleNewMessage(message: WAMessage) {
    try {
      const conversationId = message.key.remoteJid!;
      const isFromMe = message.key.fromMe!;
      const isGroup = isJidGroup(conversationId);

      // Extrai o tipo de mensagem
      const messageType = getContentType(message.message!);
      let content = '';
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      // Processar mensagens de texto
      if (messageType === 'conversation') {
        content = message.message!.conversation!;
      } else if (messageType === 'extendedTextMessage') {
        content = message.message!.extendedTextMessage!.text!;
      }
      // Processar mídias (já implementado)
      else if (messageType === 'imageMessage') {
        content = message.message!.imageMessage!.caption || '[Imagem]';
        mediaType = 'image';
        try {
          const buffer = await downloadMediaMessage(message, 'buffer', {}, {
            logger: console as any,
            reuploadRequest: this.sock!.updateMediaMessage
          });
          mediaUrl = await saveMediaToStorage(buffer as Buffer, 'image', 'jpg');
        } catch (error) {
          console.error('Erro ao fazer download da imagem:', error);
        }
      }
      else if (messageType === 'videoMessage') {
        content = message.message!.videoMessage!.caption || '[Vídeo]';
        mediaType = 'video';
        try {
          const buffer = await downloadMediaMessage(message, 'buffer', {}, {
            logger: console as any,
            reuploadRequest: this.sock!.updateMediaMessage
          });
          mediaUrl = await saveMediaToStorage(buffer as Buffer, 'video', 'mp4');
        } catch (error) {
          console.error('Erro ao fazer download do vídeo:', error);
        }
      }
      else if (messageType === 'audioMessage') {
        content = '[Áudio]';
        mediaType = 'audio';
        try {
          const buffer = await downloadMediaMessage(message, 'buffer', {}, {
            logger: console as any,
            reuploadRequest: this.sock!.updateMediaMessage
          });
          mediaUrl = await saveMediaToStorage(buffer as Buffer, 'audio', 'mp3');
        } catch (error) {
          console.error('Erro ao fazer download do áudio:', error);
        }
      }
      else if (messageType === 'documentMessage') {
        const fileName = message.message!.documentMessage!.fileName || 'documento';
        content = `[Documento: ${fileName}]`;
        mediaType = 'document';
        try {
          const buffer = await downloadMediaMessage(message, 'buffer', {}, {
            logger: console as any,
            reuploadRequest: this.sock!.updateMediaMessage
          });
          const ext = fileName.split('.').pop() || 'pdf';
          mediaUrl = await saveMediaToStorage(buffer as Buffer, 'document', ext);
        } catch (error) {
          console.error('Erro ao fazer download do documento:', error);
        }
      }
      else {
        content = `[${messageType?.replace('Message', '') || 'Mídia'}]`;
      }

      // Definir o nome do contato/grupo
      let contactName = message.pushName || conversationId.split('@')[0];

      if (isGroup) {
        try {
          // Tentar buscar da tabela de conversas primeiro
          const { data: existingConv } = await supabaseAdmin
            .from('whatsapp_conversations')
            .select('contact_name')
            .eq('conversation_id', conversationId)
            .single();

          if (existingConv?.contact_name && existingConv.contact_name !== conversationId.split('@')[0]) {
            contactName = existingConv.contact_name;
          } else if (this.sock) {
            // Se não tem nome amigável, buscar metadados do grupo
            const metadata = await this.sock.groupMetadata(conversationId);
            contactName = metadata.subject;
          }
        } catch (error) {
          console.log(`Não foi possível obter metadados do grupo ${conversationId}, usando ID.`);
        }
      }

      // 1. Garante que a conversa exista e a atualiza
      const { error: convError } = await supabaseAdmin.from('whatsapp_conversations').upsert({
        conversation_id: conversationId,
        contact_name: contactName,
        last_message_content: content,
        last_message_timestamp: new Date(Number(message.messageTimestamp) * 1000),
      });

      if (convError) throw convError;

      // 2. Insere ou atualiza a mensagem (Upsert prevent duplicates)
      // Para grupos, sender_id deve ser o participante
      const senderJid = isFromMe ? this.getMyJid() : (message.key.participant || conversationId);

      const { error: msgError } = await supabaseAdmin.from('whatsapp_messages').upsert({
        message_id: message.key.id,
        conversation_id: conversationId,
        sender_id: senderJid,
        content: content,
        is_from_me: isFromMe,
        status: isFromMe ? 'sent' : 'received',
        message_timestamp: new Date(Number(message.messageTimestamp) * 1000),
        media_url: mediaUrl,
        media_type: mediaType,
      }, { onConflict: 'message_id' }); // Garante unicidade pelo ID da mensagem

      if (msgError) throw msgError;

    } catch (error) {
      console.error('Erro ao salvar mensagem no banco de dados:', error);
    }
  }

  private async getJid(to: string): Promise<string> {
    if (!this.sock || this.status !== 'CONNECTED') {
      throw new Error('WhatsApp não está conectado.');
    }

    // Se já for um JID completo (individual ou grupo), retorna ele
    if (to.includes('@s.whatsapp.net') || to.includes('@g.us')) {
      return to;
    }

    // Se for apenas o número, resolve via onWhatsApp
    const [result] = await this.sock.onWhatsApp(to);
    if (!result?.exists) {
      throw new Error(`Número "${to}" não existe no WhatsApp.`);
    }

    return result.jid;
  }

  public async sendMessage(to: string, text: string) {
    const jid = await this.getJid(to);
    const sentMessage = await this.sock!.sendMessage(jid, { text });

    // Salva a mensagem enviada no banco de dados
    await this.handleNewMessage({
      ...sentMessage,
      key: {
        ...sentMessage.key,
        remoteJid: jid,
        fromMe: true,
      },
      message: { conversation: text },
    });
  }

  public async sendImage(to: string, imageBuffer: Buffer, caption?: string) {
    const jid = await this.getJid(to);
    await this.sock!.sendMessage(jid, {
      image: imageBuffer,
      caption: caption || '',
    });
  }

  public async sendAudio(to: string, audioBuffer: Buffer) {
    const jid = await this.getJid(to);
    await this.sock!.sendMessage(jid, {
      audio: audioBuffer,
      mimetype: 'audio/mp4',
      ptt: true,
    });
  }

  public async sendVideo(to: string, videoBuffer: Buffer, caption?: string) {
    const jid = await this.getJid(to);
    await this.sock!.sendMessage(jid, {
      video: videoBuffer,
      caption: caption || '',
    });
  }

  public async sendDocument(to: string, documentBuffer: Buffer, fileName: string, mimetype: string) {
    const jid = await this.getJid(to);
    await this.sock!.sendMessage(jid, {
      document: documentBuffer,
      fileName: fileName,
      mimetype: mimetype,
    });
  }

  public async getProfilePicture(jid: string): Promise<string | null> {
    if (this.status !== 'CONNECTED' || !this.sock) {
      return null;
    }

    try {
      const profilePicUrl = await this.sock.profilePictureUrl(jid, 'image');
      return profilePicUrl || null;
    } catch (error) {
      console.log(`Sem foto de perfil para ${jid}`);
      return null;
    }
  }

  public async markMessageAsRead(conversationId: string, messageId: string) {
    if (this.status !== 'CONNECTED' || !this.sock) {
      return;
    }

    try {
      await this.sock.readMessages([{ remoteJid: conversationId, id: messageId, fromMe: false }]);
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
    }
  }

  // Método para desconectar e limpar sessão
  async disconnect() {
    console.log('🚪 Desconectando WhatsApp por solicitação do usuário...');
    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e) {
        console.warn('⚠️ Erro ao realizar logout no Baileys:', e);
      }
      try {
        (this.sock as any).end(undefined);
      } catch (e) {
        console.warn('⚠️ Erro ao encerrar socket:', e);
      }
      this.sock = undefined;
    }

    await clearDatabaseSession();
    this.status = 'DISCONNECTED';
    this.qrCode = undefined;
    this.emit('status.change', this.status);
    this.emit('qr.update', undefined);

    // Não reconecta automaticamente após logout explícito
    // Apenas reinicia o processo de "espera" para uma nova conexão futura se solicitado
    // Mas aqui o objetivo é deixar desconectado até o usuário pedir "Conectar" (que chama restart)
  }

  async restart() {
    console.log('🔄 Reiniciando serviço de WhatsApp por solicitação manual...');

    // 1. Limpa ouvintes para evitar vazamento de memória e chamadas duplicadas
    if (this.sock && this.sock.ev) {
      try {
        this.sock.ev.removeAllListeners('connection.update');
        this.sock.ev.removeAllListeners('creds.update');
        this.sock.ev.removeAllListeners('messages.upsert');
        this.sock.ev.removeAllListeners('contacts.upsert');
      } catch (e) {
        console.warn('⚠️ Erro ao remover ouvintes durante restart:', e);
      }
    }

    // 2. Tenta fechar a conexão de forma limpa, mas sem travar o processo
    if (this.sock) {
      try {
        // Encerra a conexão sem esperar logout total do servidor WA (que pode falhar se já estiver offline)
        (this.sock as any).end(undefined);
      } catch (e) {
        console.warn('⚠️ Erro ao terminar conexão Baileys:', e);
      }
      this.sock = undefined;
    }

    // 3. Limpa sessão no banco e estados locais
    try {
      await clearDatabaseSession();
    } catch (e) {
      console.error('❌ Erro ao limpar sessão no banco durante restart:', e);
    }

    this.status = 'DISCONNECTED';
    this.qrCode = undefined;
    this.emit('status.change', this.status);
    this.emit('qr.update', undefined);

    // 4. Inicia nova conexão após um pequeno delay para garantir que o socket antigo liberou recursos
    console.log('🚀 Iniciando nova conexão limpa...');
    setTimeout(() => {
      this.connectToWhatsApp().catch(err => {
        console.error('❌ Falha ao reconectar após restart:', err);
      });
    }, 1000);
  }
}

// Singleton para garantir uma única instância do serviço
const whatsappService = new WhatsappService();
export default whatsappService;
