
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
import { zeAssistantService } from './zeAssistantService.js';

type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'WAITING_QR';

/**
 * Representa uma instância individual do WhatsApp para uma loja.
 */
export class WhatsappInstance extends EventEmitter {
  private sock: WASocket | undefined;
  private status: ConnectionStatus = 'DISCONNECTED';
  private qrCode: string | undefined;
  private storeId: string;
  private isConnecting = false;
  private groupCache = new Map<string, string>(); // Cache para nomes de grupos

  constructor(storeId: string) {
    super();
    this.storeId = storeId;
    this.initialize();
  }

  private async initialize() {
    try {
      console.log(`[Loja ${this.storeId}] Iniciando o serviço de WhatsApp...`);
      this.status = 'CONNECTING';
      this.emit('status.change', this.status);
      await this.connectToWhatsApp();
    } catch (error) {
      console.error(`[Loja ${this.storeId}] Falha crítica na inicialização do WhatsApp:`, error);
      this.status = 'DISCONNECTED';
      this.emit('status.change', this.status);
      this.updateDatabaseStatus();
    }
  }

  private async updateDatabaseStatus(extraData: any = {}) {
    try {
      if (Object.keys(extraData).length > 0) {
        console.log(`[Loja ${this.storeId}] 📝 Atualizando banco com dados extras:`, JSON.stringify(extraData));
      }
      await supabaseAdmin.from('chat_sessions').upsert({
        store_id: this.storeId,
        status: this.status,
        updated_at: new Date(),
        ...extraData
      }, { onConflict: 'store_id' });
    } catch (error) {
      console.error(`[Loja ${this.storeId}] Erro ao atualizar status no banco:`, error);
    }
  }

  public getStatus() {
    return { status: this.status, qrCode: this.qrCode };
  }

  private getMyJid() {
    return this.sock?.user?.id.split(':')[0] + '@s.whatsapp.net';
  }

  private async connectToWhatsApp() {
    if (this.isConnecting) {
      console.log(`[Loja ${this.storeId}] ⏳ Já existe uma tentativa de conexão em curso. Ignorando...`);
      return;
    }

    try {
      this.isConnecting = true;
      console.log(`[Loja ${this.storeId}] 📡 Conectando ao banco de dados para buscar sessão...`);
      const { state, saveCreds } = await useDatabaseAuth(this.storeId);
      console.log(`[Loja ${this.storeId}] ✅ Estado de autenticação carregado.`);

      const { version, isLatest } = await fetchLatestBaileysVersion();
      console.log(`[Loja ${this.storeId}] 📡 Usando versão do WA v${version.join('.')}, isLatest: ${isLatest}`);

      // Se um sock já existir (por uma conexão antiga parcial), limpa antes de criar novo
      if (this.sock) {
        try { (this.sock as any).end(undefined); } catch (e) { }
        this.sock = undefined;
      }

      this.sock = makeWASocket({
        version,
        printQRInTerminal: false,
        browser: Browsers.macOS('Desktop'),
        auth: state,
        logger: pino({ level: 'error' }),
        syncFullHistory: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
      });

      this.setupEventHandlers();
      this.sock.ev.on('creds.update', saveCreds);

    } catch (error: any) {
      console.error(`[Loja ${this.storeId}] ❌ Erro ao conectar com o WhatsApp:`, error.message || error);
      this.status = 'DISCONNECTED';
      this.emit('status.change', this.status);
      this.updateDatabaseStatus();
    } finally {
      this.isConnecting = false;
    }
  }
  private setupEventHandlers() {
    if (!this.sock) return;

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log(`[Loja ${this.storeId}] ✨ Novo QR Code gerado.`);
        this.status = 'WAITING_QR';
        this.qrCode = qr;
        this.emit('qr.update', qr);
        this.emit('status.change', this.status);
        this.updateDatabaseStatus();
      }

      if (connection === 'close') {
        const error = lastDisconnect?.error as Boom;
        const statusCode = error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        console.log(`[Loja ${this.storeId}] 📡 Conexão fechada. Status: ${statusCode}`);
        this.status = 'DISCONNECTED';
        this.emit('status.change', this.status);
        this.updateDatabaseStatus();

        if (shouldReconnect) {
          this.connectToWhatsApp();
        } else {
          console.log(`[Loja ${this.storeId}] 🚪 Logout detectado. Limpando sessão...`);
          await clearDatabaseSession(this.storeId);
          this.connectToWhatsApp();
        }
      } else if (connection === 'open') {
        console.log(`[Loja ${this.storeId}] ✅ WhatsApp conectado com sucesso!`);
        this.status = 'CONNECTED';
        this.qrCode = undefined;
        this.emit('status.change', this.status);
        await this.updateDatabaseStatus();
        this.emit('connection.open');
        console.log(`[Loja ${this.storeId}] 📡 Aguardando eventos de histórico (messaging-history.set)...`);
      }
    });

    this.sock.ev.on('messages.upsert', (m) => {
      m.messages.forEach(async (message) => {
        if (message.key.remoteJid === 'status@broadcast') return;
        await this.handleNewMessage(message);
        this.emit('messages.upsert', message);
      });
    });

    this.sock.ev.on('messages.update', async (updates) => {
      for (const { key, update } of updates) {
        if (update.status) {
          const statusMap: Record<number, string> = {
            1: 'sent',       // SERVER_ACK
            2: 'delivered',  // DELIVERY_ACK
            3: 'read',       // READ
            4: 'read',       // PLAYED (para áudio, tratamos como lido)
          };

          const status = statusMap[update.status];
          if (status) {
            console.log(`[Loja ${this.storeId}] 📌 Atualizando status da msg ${key.id}: ${status}`);
            try {
              await supabaseAdmin
                .from('chat_messages')
                .update({ status })
                .eq('store_id', this.storeId)
                .eq('message_id', key.id);

              // Opcional: emitir evento para o frontend atualizar em tempo real via WebSocket
              this.emit('message.status.update', { messageId: key.id, status });
            } catch (error) {
              console.error(`[Loja ${this.storeId}] Erro ao atualizar status da mensagem:`, error);
            }
          }
        }
      }
    });

    this.sock.ev.on('contacts.upsert', async (contacts) => {
      for (const contact of contacts) {
        try {
          if (contact.name || contact.notify) {
            await supabaseAdmin.from('chat_contacts').upsert({
              store_id: this.storeId,
              phone_number: contact.id.split('@')[0],
              name: contact.name || contact.notify || contact.id.split('@')[0],
              updated_at: new Date()
            }, { onConflict: 'store_id,phone_number' });
          }
        } catch (error) {
          console.error(`[Loja ${this.storeId}] Erro ao sincronizar contato:`, error);
        }
      }
    });

    // Eventos de Conversa (Real-time sync do aparelho)
    this.sock.ev.on('chats.upsert', async (newChats) => {
      const individualChats = newChats.filter(c => !c.id.includes('@g.us') && c.id !== 'status@broadcast');
      if (individualChats.length === 0) return;

      console.log(`[Loja ${this.storeId}] 🆕 ${individualChats.length} novas conversas individuais detectadas no aparelho.`);
      const batch = individualChats.map(chat => ({
        store_id: this.storeId,
        conversation_id: chat.id,
        phone_number: chat.id.split('@')[0].split(':')[0].replace(/\D/g, ''),
        contact_name: chat.name || chat.id.split('@')[0],
        unread_count: chat.unreadCount || 0,
        last_message_timestamp: chat.conversationTimestamp ? new Date(Number(chat.conversationTimestamp) * 1000) : new Date(),
      }));

      await supabaseAdmin.from('chat_conversations').upsert(batch, { onConflict: 'store_id,conversation_id' });
    });

    this.sock.ev.on('chats.update', async (updates) => {
      for (const update of updates) {
        if (update.id?.includes('@g.us') || update.id === 'status@broadcast') continue;

        const data: any = {};
        if (update.name) data.contact_name = update.name;
        if (update.unreadCount !== undefined) data.unread_count = update.unreadCount;
        if (update.conversationTimestamp) data.last_message_timestamp = new Date(Number(update.conversationTimestamp) * 1000);

        if (Object.keys(data).length > 0) {
          await supabaseAdmin.from('chat_conversations')
            .update(data)
            .eq('store_id', this.storeId)
            .eq('conversation_id', update.id);
        }
      }
    });

    this.sock.ev.on('chats.delete', async (deletions) => {
      for (const id of deletions) {
        await supabaseAdmin.from('chat_conversations')
          .delete()
          .eq('store_id', this.storeId)
          .eq('conversation_id', id);
      }
    });

    // Sincronização de histórico
    this.sock.ev.on('messaging-history.set', async (history) => {
      const { chats, messages, isLatest } = history;
      console.log(`[Loja ${this.storeId}] 📚 Histórico bruto recebido: ${chats?.length || 0} chats, ${messages?.length || 0} msgs. isLatest: ${isLatest}`);

      // 1. Bulk Upsert de Conversas
      const conversationBatch = chats.filter(c => !c.id.includes('@g.us') && c.id !== 'status@broadcast').map(chat => {
        const phoneNumber = chat.id.split('@')[0].split(':')[0].replace(/\D/g, '');

        // Tentar encontrar a última mensagem deste chat no pacote de histórico para preencher o last_message_content
        const chatMessages = messages.filter(m => m.key.remoteJid === chat.id);
        const lastMsg = chatMessages.length > 0 ? chatMessages[chatMessages.length - 1] : null;

        let lastContent = '';
        if (lastMsg) {
          const type = getContentType(lastMsg.message!);
          if (type === 'conversation') lastContent = lastMsg.message!.conversation!;
          else if (type === 'extendedTextMessage') lastContent = lastMsg.message!.extendedTextMessage!.text!;
          else lastContent = `[${type?.replace('Message', '') || 'Mídia'}]`;
        }

        return {
          store_id: this.storeId,
          conversation_id: chat.id,
          phone_number: phoneNumber,
          contact_name: chat.name || chat.id.split('@')[0],
          unread_count: chat.unreadCount || 0,
          last_message_timestamp: chat.conversationTimestamp ? new Date(Number(chat.conversationTimestamp) * 1000) : new Date(),
          last_message_content: lastContent.substring(0, 500)
        };
      });

      if (conversationBatch.length > 0) {
        console.log(`[Loja ${this.storeId}] 💾 Gravando ${conversationBatch.length} conversas históricas...`);
        try {
          const CHUNK_SIZE = 100;
          for (let i = 0; i < conversationBatch.length; i += CHUNK_SIZE) {
            const chunk = conversationBatch.slice(i, i + CHUNK_SIZE);
            const { error } = await supabaseAdmin.from('chat_conversations').upsert(chunk, { onConflict: 'store_id,conversation_id' });
            if (error) console.error(`[Loja ${this.storeId}] ❌ Erro ao upsert lote de conversas:`, error.message);
          }
          console.log(`[Loja ${this.storeId}] ✅ ${conversationBatch.length} conversas históricas processadas.`);
        } catch (e) {
          console.error(`[Loja ${this.storeId}] Erro ao salvar conversas históricas:`, e);
        }
      }

      // 2. Processamento em Lote de Mensagens
      const messageBatch: any[] = [];
      for (const message of messages) {
        if (message.key.remoteJid === 'status@broadcast') continue;

        try {
          const rawJid = message.key.remoteJid!;
          const conversationId = rawJid.includes('@g.us')
            ? rawJid
            : rawJid.split('@')[0].split(':')[0] + '@s.whatsapp.net';

          const isFromMe = message.key.fromMe || false;
          const messageType = getContentType(message.message!);
          let content = '';

          // Lógica expandida para evitar "[Mídia]" genérico
          if (messageType === 'conversation') content = message.message!.conversation!;
          else if (messageType === 'extendedTextMessage') content = message.message!.extendedTextMessage!.text!;
          else if (messageType === 'imageMessage') content = message.message!.imageMessage!.caption || '[Imagem]';
          else if (messageType === 'videoMessage') content = message.message!.videoMessage!.caption || '[Vídeo]';
          else if (messageType === 'audioMessage') content = '[Áudio]';
          else if (messageType === 'documentMessage') content = `[Documento: ${message.message!.documentMessage!.fileName || 'doc'}]`;
          else if (messageType === 'contactMessage') content = `[Contato: ${message.message!.contactMessage!.displayName || 'vCard'}]`;
          else if (messageType === 'locationMessage') content = `[Localização]`;
          else if (messageType === 'liveLocationMessage') content = `[Localização em tempo real]`;
          else if (messageType === 'stickerMessage') content = '[Figurinha]';
          else if (message.message?.buttonsMessage) content = message.message.buttonsMessage.contentText || '[Botão]';
          else if (message.message?.templateMessage) content = message.message.templateMessage.hydratedTemplate?.hydratedContentText || '[Template]';
          else if (message.message?.listMessage) content = message.message.listMessage.description || '[Lista]';
          else if (message.message?.viewOnceMessageV2?.message?.imageMessage) content = message.message.viewOnceMessageV2.message.imageMessage.caption || '[Imagem Única]';
          else if (message.message?.pollCreationMessage) content = message.message.pollCreationMessage.name || '[Enquete]';
          else content = `[${messageType?.replace('Message', '') || 'Mídia'}]`;

          const senderJid = isFromMe ? this.getMyJid() : (message.key.participant || rawJid);

          messageBatch.push({
            store_id: this.storeId,
            message_id: message.key.id,
            conversation_id: conversationId,
            sender_id: senderJid,
            content: content,
            is_from_me: isFromMe,
            status: isFromMe ? 'read' : 'received',
            message_timestamp: new Date(Number(message.messageTimestamp) * 1000),
            media_url: null,
            media_type: messageType?.replace('Message', '').toLowerCase(),
          });
        } catch (err) { }
      }

      if (messageBatch.length > 0) {
        console.log(`[Loja ${this.storeId}] 💾 Gravando ${messageBatch.length} mensagens do histórico...`);
        const CHUNK_SIZE = 100;
        for (let i = 0; i < messageBatch.length; i += CHUNK_SIZE) {
          const chunk = messageBatch.slice(i, i + CHUNK_SIZE);
          const { error } = await supabaseAdmin.from('chat_messages').upsert(chunk, { onConflict: 'store_id,message_id' });
          if (error) console.error(`[Loja ${this.storeId}] ❌ Erro ao upsert lote de mensagens:`, error.message);
        }
        console.log(`[Loja ${this.storeId}] ✅ Sincronização inicial de mensagens concluída.`);

        // Atualiza a data da sincronização completa
        await this.updateDatabaseStatus({ last_full_sync_at: new Date() });
      }
    });
  }

  private async handleNewMessage(message: WAMessage, attendantId?: string) {
    try {
      const rawJid = message.key.remoteJid!;
      if (rawJid.includes('@g.us') || rawJid === 'status@broadcast') {
        return; // Filtro de Privacidade: Ignorar Grupos e Status
      }

      const conversationId = rawJid.split('@')[0].split(':')[0] + '@s.whatsapp.net';

      const isFromMe = message.key.fromMe!;
      const messageType = getContentType(message.message!);
      let content = '';
      let mediaUrl: string | null = null;
      let mediaType: string | null = null;

      // ... Lógica de extração de conteúdo e mídia (igual original, mas com context da loja) ...
      if (messageType === 'conversation') content = message.message!.conversation!;
      else if (messageType === 'extendedTextMessage') content = message.message!.extendedTextMessage!.text!;
      else if (messageType === 'imageMessage') {
        content = message.message!.imageMessage!.caption || '[Imagem]';
        mediaType = 'image';
        try {
          const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger: console as any, reuploadRequest: this.sock!.updateMediaMessage });
          mediaUrl = await saveMediaToStorage(buffer as Buffer, 'image', 'jpg');
        } catch (e) { }
      }
      else if (messageType === 'videoMessage') {
        content = message.message!.videoMessage!.caption || '[Vídeo]';
        mediaType = 'video';
        try {
          const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger: console as any, reuploadRequest: this.sock!.updateMediaMessage });
          mediaUrl = await saveMediaToStorage(buffer as Buffer, 'video', 'mp4');
        } catch (e) { }
      }
      else if (messageType === 'audioMessage') {
        content = '[Áudio]';
        mediaType = 'audio';
        try {
          const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger: console as any, reuploadRequest: this.sock!.updateMediaMessage });
          mediaUrl = await saveMediaToStorage(buffer as Buffer, 'audio', 'mp3');
        } catch (e) { }
      }
      else if (messageType === 'documentMessage') {
        const fileName = message.message!.documentMessage!.fileName || 'documento';
        content = `[Documento: ${fileName}]`;
        mediaType = 'document';
        try {
          const buffer = await downloadMediaMessage(message, 'buffer', {}, { logger: console as any, reuploadRequest: this.sock!.updateMediaMessage });
          mediaUrl = await saveMediaToStorage(buffer as Buffer, 'document', fileName.split('.').pop() || 'pdf');
        } catch (e) { }
      }
      else if (messageType === 'contactMessage') {
        content = `[Contato: ${message.message!.contactMessage!.displayName || 'vCard'}]`;
        mediaType = 'vcard';
      }
      else if (messageType === 'locationMessage') {
        content = '[Localização]';
        mediaType = 'location';
      }
      else if (messageType === 'stickerMessage') {
        content = '[Figurinha]';
        mediaType = 'sticker';
      }
      else content = `[${messageType?.replace('Message', '') || 'Mídia'}]`;

      let contactName = message.pushName || conversationId.split('@')[0];
      const phoneNumber = conversationId.split('@')[0].split(':')[0].replace(/\D/g, '');

      // 1. Atualiza conversa (onConflict: store_id,conversation_id para evitar colisões)
      const conversationUpsert = {
        store_id: this.storeId,
        conversation_id: conversationId,
        phone_number: phoneNumber,
        contact_name: contactName,
        last_message_content: content.substring(0, 500),
        last_message_timestamp: new Date(Number(message.messageTimestamp) * 1000),
      };

      await supabaseAdmin.from('chat_conversations').upsert(conversationUpsert, { onConflict: 'store_id,conversation_id' });

      // 2. Insere mensagem
      const senderJid = isFromMe ? this.getMyJid() : (message.key.participant || conversationId);
      await supabaseAdmin.from('chat_messages').upsert({
        store_id: this.storeId,
        message_id: message.key.id,
        conversation_id: conversationId,
        attendant_id: attendantId,
        sender_id: senderJid,
        content: content,
        is_from_me: isFromMe,
        status: isFromMe ? 'sent' : 'received',
        message_timestamp: new Date(Number(message.messageTimestamp) * 1000),
        media_url: mediaUrl,
        media_type: mediaType,
      }, { onConflict: 'store_id,message_id' });

      // 3. Processar com Zé Assistente se mensagem for recebida (não enviada por nós)
      if (!isFromMe && content && !content.startsWith('[')) {
        await this.processWithZeAssistant(conversationId, phoneNumber, contactName, content, message.key.id);
      }

    } catch (error) {
      console.error(`[Loja ${this.storeId}] Erro ao salvar mensagem no banco:`, error);
    }
  }

  private async getJid(to: string): Promise<string> {
    if (!this.sock || this.status !== 'CONNECTED') throw new Error('WhatsApp não está conectado.');
    if (to.includes('@s.whatsapp.net') || to.includes('@g.us')) return to;
    const [result] = await this.sock.onWhatsApp(to);
    if (!result?.exists) throw new Error(`Número "${to}" não existe no WhatsApp.`);
    return result.jid;
  }

  public async sendMessage(to: string, text: string, attendantId?: string) {
    const jid = await this.getJid(to);
    const sentMessage = await this.sock!.sendMessage(jid, { text });
    await this.handleNewMessage({
      ...sentMessage,
      key: { ...sentMessage.key, remoteJid: jid, fromMe: true },
      message: { conversation: text },
      messageTimestamp: Math.floor(Date.now() / 1000)
    } as any, attendantId);
  }

  public async sendImage(to: string, imageBuffer: Buffer, caption?: string, attendantId?: string) {
    const jid = await this.getJid(to);
    const sentMessage = await this.sock!.sendMessage(jid, { image: imageBuffer, caption: caption || '' });
    await this.handleNewMessage(sentMessage as any, attendantId);
  }

  public async sendAudio(to: string, audioBuffer: Buffer, attendantId?: string) {
    const jid = await this.getJid(to);
    const sentMessage = await this.sock!.sendMessage(jid, { audio: audioBuffer, mimetype: 'audio/mp4', ptt: true });
    await this.handleNewMessage(sentMessage as any, attendantId);
  }

  public async sendVideo(to: string, videoBuffer: Buffer, caption?: string, attendantId?: string) {
    const jid = await this.getJid(to);
    const sentMessage = await this.sock!.sendMessage(jid, { video: videoBuffer, caption: caption || '' });
    await this.handleNewMessage(sentMessage as any, attendantId);
  }

  public async sendDocument(to: string, documentBuffer: Buffer, fileName: string, mimetype: string, attendantId?: string) {
    const jid = await this.getJid(to);
    const sentMessage = await this.sock!.sendMessage(jid, {
      document: documentBuffer,
      fileName: fileName,
      mimetype: mimetype
    });
    await this.handleNewMessage(sentMessage as any, attendantId);
  }

  public async getProfilePicture(jid: string): Promise<string | null> {
    if (this.status !== 'CONNECTED' || !this.sock) {
      // Retorna null silenciosamente se desconectado, em vez de deixar estourar erro
      return null;
    }
    try {
      // Pequeno timeout ou validação extra pode ser útil aqui, mas o try/catch resolve
      return await this.sock.profilePictureUrl(jid, 'image') || null;
    } catch (e: any) {
      // Erros comuns do Baileys ao buscar foto (ex: privacidade, 401, 404) não devem quebrar o servidor
      if (e?.message?.includes('not-authorized') || e?.data === 401 || e?.data === 404) {
        return null;
      }
      console.warn(`[Loja ${this.storeId}] Falha segura ao buscar foto de ${jid}:`, e.message);
      return null;
    }
  }

  public async markMessageAsRead(conversationId: string, messageId: string) {
    if (this.status !== 'CONNECTED' || !this.sock) return;
    try {
      await this.sock.readMessages([{ remoteJid: conversationId, id: messageId, fromMe: false }]);
    } catch (e) { }
  }

  public async processWithZeAssistant(conversationId: string, customerPhone: string | null, customerName: string, messageText: string, messageId?: string): Promise<void> {
    // Declarado aqui para o TS, implementado via prototype abaixo
  }

  public async deleteChat(conversationId: string) {
    if (this.status !== 'CONNECTED' || !this.sock) throw new Error('WhatsApp não está conectado.');

    try {
      // 1. Deletar no aparelho (WhatsApp)
      const baseJid = conversationId.includes('@g.us')
        ? conversationId
        : conversationId.split('@')[0].split(':')[0] + '@s.whatsapp.net';

      console.log(`[Loja ${this.storeId}] 🗑️ Tentando deletar chat: ${baseJid} (Original: ${conversationId})`);

      try {
        // Buscar a última mensagem no banco para ter uma chave completa (id, fromMe)
        // O Baileys exige uma chave completa para o delete no chatModify
        const { data: lastMsg } = await supabaseAdmin
          .from('chat_messages')
          .select('message_id, is_from_me')
          .eq('store_id', this.storeId)
          .eq('conversation_id', conversationId)
          .order('message_timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        const lastMessages = lastMsg ? [{
          key: {
            remoteJid: baseJid,
            fromMe: lastMsg.is_from_me,
            id: lastMsg.message_id
          },
          messageTimestamp: Math.floor(Date.now() / 1000) // Opcional, mas ajuda
        }] : [{
          // Fallback: Se não houver msg no banco, tentamos uma chave genérica
          // O Baileys pode precisar de PELO MENOS uma chave para o 'delete: true'
          key: {
            remoteJid: baseJid,
            fromMe: true,
            id: 'CLEANUP-' + Date.now()
          }
        }];

        await this.sock.chatModify({ delete: true, lastMessages }, baseJid);
      } catch (e: any) {
        console.warn(`[Loja ${this.storeId}] Falha no chatModify:`, e.message);
        // Tenta um fallback sem mensagens se falhar
        try {
          await this.sock.chatModify({ delete: true, lastMessages: [] }, baseJid);
        } catch (innerError: any) {
          console.error(`[Loja ${this.storeId}] Falha total ao deletar chat no WhatsApp:`, innerError.message);
        }
      }

      // 2. Deletar no banco (Supabase)
      // Removemos tanto o ID original quanto o normalizado para limpar quaisquer resquícios
      await supabaseAdmin.from('chat_messages').delete()
        .eq('store_id', this.storeId)
        .or(`conversation_id.eq.${conversationId},conversation_id.eq.${baseJid}`);

      await supabaseAdmin.from('chat_conversations').delete()
        .eq('store_id', this.storeId)
        .or(`conversation_id.eq.${conversationId},conversation_id.eq.${baseJid}`);

      console.log(`[Loja ${this.storeId}] ✅ Chat deletado.`);
    } catch (error: any) {
      console.error(`[Loja ${this.storeId}] Erro ao deletar conversa:`, error.message);
      throw error;
    }
  }

  async disconnect() {
    console.log(`[Loja ${this.storeId}] 🚪 Desconectando e limpando sessão...`);
    this.isConnecting = false; // Interrompe qualquer tentativa pendente

    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (e: any) {
        console.log(`[Loja ${this.storeId}] Erro ao deslogar do socket:`, e.message);
      }
      try {
        (this.sock as any).end(undefined);
      } catch (e) { }
      this.sock = undefined;
    }

    await clearDatabaseSession(this.storeId);

    this.status = 'DISCONNECTED';
    this.qrCode = undefined;
    this.emit('status.change', this.status);
    this.updateDatabaseStatus();
    console.log(`[Loja ${this.storeId}] ✅ Instância desconectada com sucesso.`);
  }

  async reconnect() {
    console.log(`[Loja ${this.storeId}] 🔄 Tentando reconectar usando sessão existente...`);
    this.isConnecting = false;

    if (this.sock) {
      try { (this.sock as any).end(undefined); } catch (e) { }
      this.sock = undefined;
    }

    this.status = 'DISCONNECTED';
    this.emit('status.change', this.status);
    this.updateDatabaseStatus();

    // Pequeno delay para garantir limpeza
    setTimeout(() => this.connectToWhatsApp(), 1500);
  }

  async restart() {
    console.log(`[Loja ${this.storeId}] 🔄 Reiniciando instância e limpando sessão...`);
    await this.disconnect();
    setTimeout(() => this.connectToWhatsApp(), 1500);
  }
}

/**
 * Gerenciador de Instâncias do WhatsApp.
 */
class WhatsappServiceManager extends EventEmitter {
  private instances: Map<string, WhatsappInstance> = new Map();

  public getInstance(storeId: string): WhatsappInstance {
    let instance = this.instances.get(storeId);
    if (!instance) {
      instance = new WhatsappInstance(storeId);

      // Re-emitir eventos individuais no manager incluindo o storeId
      instance.on('status.change', (status) => this.emit('status.change', { storeId, status }));
      instance.on('qr.update', (qr) => this.emit('qr.update', { storeId, qr }));
      instance.on('messages.upsert', (msg) => this.emit('messages.upsert', { storeId, msg }));
      instance.on('message.status.update', (data) => this.emit('message.status.update', { storeId, ...data }));

      this.instances.set(storeId, instance);
    }
    return instance;
  }

  // Métodos facilitadores que usam a instância padrão ou fornecida
  public async sendMessage(to: string, text: string, storeId: string, attendantId?: string) {
    const instance = this.getInstance(storeId);
    return instance.sendMessage(to, text, attendantId);
  }

  public async sendImage(to: string, imageBuffer: Buffer, caption: string | undefined, storeId: string, attendantId?: string) {
    const instance = this.getInstance(storeId);
    return instance.sendImage(to, imageBuffer, caption, attendantId);
  }

  public async sendAudio(to: string, audioBuffer: Buffer, storeId: string, attendantId?: string) {
    const instance = this.getInstance(storeId);
    return instance.sendAudio(to, audioBuffer, attendantId);
  }

  public async sendVideo(to: string, videoBuffer: Buffer, caption: string | undefined, storeId: string, attendantId?: string) {
    const instance = this.getInstance(storeId);
    return instance.sendVideo(to, videoBuffer, caption, attendantId);
  }

  public async sendDocument(to: string, documentBuffer: Buffer, fileName: string, mimetype: string, storeId: string, attendantId?: string) {
    const instance = this.getInstance(storeId);
    return instance.sendDocument(to, documentBuffer, fileName, mimetype, attendantId);
  }

  public async deleteConversation(conversationId: string, storeId: string) {
    const instance = this.getInstance(storeId);
    return instance.deleteChat(conversationId);
  }

  public getStatus(storeId: string) {
    return this.getInstance(storeId).getStatus();
  }

  public async logout(storeId: string) {
    console.log(`[Gerenciador] Solicitando logout total para loja ${storeId}`);
    const instance = this.instances.get(storeId);
    if (instance) {
      await instance.disconnect();
      this.instances.delete(storeId);
      console.log(`[Gerenciador] Instância da loja ${storeId} removida do mapa.`);
    } else {
      // Caso não existisse em memória (servidor reiniciou por exemplo), garante limpeza do banco
      await clearDatabaseSession(storeId);
    }
  }

  public async reconnect(storeId: string) {
    const instance = this.getInstance(storeId);
    await instance.reconnect();
  }

  public async restart(storeId: string) {
    console.log(`[Gerenciador] Solicitando reinício total (Stateless) para loja ${storeId}`);
    const instance = this.instances.get(storeId);
    if (instance) {
      await instance.disconnect();
      this.instances.delete(storeId);
    } else {
      await clearDatabaseSession(storeId);
    }
    // Força a criação de uma nova instância limpa
    this.getInstance(storeId);
  }
}

/**
 * Processa mensagem com Zé Assistente (Método da classe WhatsappInstance)
 */
WhatsappInstance.prototype.processWithZeAssistant = async function (
  conversationId: string,
  customerPhone: string | null,
  customerName: string,
  messageText: string,
  messageId?: string
) {
  try {
    if (!customerPhone) return; // Não processar grupos por enquanto

    // Verificar se conversa está bloqueada por atendente humano
    const { data: conversation } = await supabaseAdmin
      .from('chat_conversations')
      .select('locked_by_agent_id')
      .eq('store_id', this.storeId)
      .eq('conversation_id', conversationId)
      .single();

    // Se atendente humano está respondendo, não processar com assistente
    if (conversation?.locked_by_agent_id) {
      console.log(`[Loja ${this.storeId}] Conversa ${conversationId} bloqueada por atendente humano`);
      return;
    }

    // Processar com Zé Assistente
    const response = await zeAssistantService.processMessage({
      storeId: this.storeId,
      conversationId,
      customerPhone,
      customerName,
      messageText,
      messageId
    });

    // Se assistente gerou resposta, enviar
    if (response.success && response.responseText && !response.shouldHandoff) {
      await this.sendMessage(conversationId, response.responseText);
    }

    // Se deve transferir para humano, não fazer nada (atendente verá a mensagem)
    if (response.shouldHandoff) {
      console.log(`[Loja ${this.storeId}] Zé Assistente transferiu conversa para humano: ${response.handoffReason}`);
    }

  } catch (error) {
    console.error(`[Loja ${this.storeId}] Erro ao processar com Zé Assistente:`, error);
  }
};

const whatsappService = new WhatsappServiceManager();
export default whatsappService;
