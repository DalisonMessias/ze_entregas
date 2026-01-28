import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage } from './types';
import { Download, Check, CheckCheck, User, MapPin, Trash2, Edit2, MoreVertical, X, Copy } from 'lucide-react';
import ImageLightbox from './ImageLightbox';
import { PollMessage } from './Messages/PollMessage';
import { ContactMessage } from './Messages/ContactMessage';

interface MessageAreaProps {
  messages: ChatMessage[];
  onLoadMore?: () => void;
  hasMore?: boolean;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
}

const MessageArea: React.FC<MessageAreaProps> = ({ messages, onLoadMore, hasMore = false, onDeleteMessage, onEditMessage }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => setShowOptionsId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detectar scroll no topo para carregar mais mensagens
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current || !onLoadMore || !hasMore || isLoadingMore) return;

    const { scrollTop } = messagesContainerRef.current;

    // Se scrollou até o topo (com margem de 50px)
    if (scrollTop < 50) {
      setIsLoadingMore(true);
      onLoadMore();
      setIsLoadingMore(false);
    }
  }, [onLoadMore, hasMore, isLoadingMore]);

  const getStatusIcon = (status: string) => {
    const iconSize = "16";
    switch (status) {
      case 'sent':
        return <Check size={16} className="text-gray-400" />;
      case 'delivered':
        return <CheckCheck size={16} className="text-gray-400" />;
      case 'read':
        return <CheckCheck size={16} className="text-blue-500" />;
      case 'pending':
        return <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
  };

  const formatWhatsAppStyle = (text: string) => {
    if (!text) return text;

    // 1. Substituir negritos duplos (**texto**) por <b>texto</b>
    let formattedText = text.replace(/\*\*([^\*\n]+)\*\*/g, '<b>$1</b>');

    // 2. Substituir negritos simples (*texto*) por <b>texto</b>
    // O regex garante que o asterisco não seja seguido por um espaço (marcador de lista)
    // e que o conteúdo não seja vazio.
    formattedText = formattedText.replace(/\*([^\*\s\n][^\*\n]*[^\*\s\n]|\S)\*/g, '<b>$1</b>');

    // Manter as quebras de linha
    return formattedText.split('\n').map((line, i) => (
      <React.Fragment key={i}>
        <span dangerouslySetInnerHTML={{ __html: line }} />
        {i < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    // Se for JID ou número, tenta pegar parte do ID
    if (name.includes('@') || /^\d+$/.test(name)) {
      const id = name.split('@')[0];
      return id.substring(0, 2).toUpperCase();
    }
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const renderMediaContent = (message: ChatMessage) => {
    // Detect Poll
    if (message.content?.startsWith('POLL:')) {
      try {
        const pollData = JSON.parse(message.content.substring(5));
        return (
          <PollMessage
            messageId={message.message_id}
            question={pollData.question}
            options={pollData.options}
            allowMultiple={pollData.allowMultiple}
            visitorId={message.is_from_me ? 'admin' : (message as any).sender_id || 'remote'}
            visitorName={message.is_from_me ? 'Administrador' : (message as any).sender_name || 'Cliente'}
          />
        );
      } catch (e) { /* fall through */ }
    }
    // Detect Contact
    if (message.content?.startsWith('CONTACT:')) {
      try {
        const contactData = JSON.parse(message.content.substring(8));
        return <ContactMessage name={contactData.name} phone={contactData.phone} />;
      } catch (e) { /* fall through */ }
    }

    const mediaUrl = message.media_url ? `http://localhost:3001${message.media_url}` : null;

    if (!mediaUrl || !message.media_type) {
      return (
        <div className="text-sm break-words leading-relaxed">
          {formatWhatsAppStyle(message.content)}
        </div>
      );
    }

    switch (message.media_type) {
      case 'image':
        return (
          <div className="p-1">
            <img
              src={mediaUrl}
              alt="Imagem"
              className="rounded-lg cursor-pointer hover:opacity-90 transition-opacity w-full h-auto object-cover max-h-[300px]"
              onClick={() => setLightboxImage(mediaUrl)}
            />
            {message.content !== '[Imagem]' && (
              <div className="text-sm mt-1 mx-1 break-words leading-relaxed">
                {formatWhatsAppStyle(message.content)}
              </div>
            )}
          </div>
        );
      // ... [rest of renderMediaContent similar, but with pre-wrap]

      case 'video':
        return (
          <div>
            <video
              src={mediaUrl}
              controls
              className="max-w-xs rounded-lg"
            />
            {message.content !== '[Vídeo]' && (
              <p className="text-sm mt-2 break-words">{message.content}</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="flex items-center gap-2 min-w-[200px]">
            <audio
              src={mediaUrl}
              controls
              className="w-full"
            />
          </div>
        );

      case 'document':
        return (
          <a
            href={mediaUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors min-w-[200px]"
          >
            <Download size={20} className="text-blue-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.content.replace('[Documento: ', '').replace(']', '')}</p>
              <p className="text-xs text-gray-500">Clique para baixar</p>
            </div>
          </a>
        );

      case 'vcard':
        return (
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 min-w-[220px]">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
              <User size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                {message.content.replace('[Contato: ', '').replace(']', '')}
              </p>
              <p className="text-xs text-gray-500">Contato compartilhado</p>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-2 max-w-[240px]">
            <div className="w-full h-32 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative overflow-hidden group">
              <MapPin size={32} className="text-red-500 absolute z-10" />
              <img
                src={`https://static-maps.yandex.ru/1.x/?lang=pt_BR&ll=-46.633,-23.550&z=15&l=map&size=240,128`}
                alt="Mapa"
                className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform"
              />
              <button className="absolute inset-0 bg-black/5 hover:bg-black/10 transition-colors" />
            </div>
            <p className="text-xs text-blue-600 font-bold flex items-center gap-1">
              Ver localização no mapa
            </p>
          </div>
        );

      case 'sticker':
        return (
          <div className="p-1">
            <img
              src={mediaUrl || 'https://images.unsplash.com/photo-1614680376593-902f74cc0d41?w=200&h=200&fit=crop'}
              alt="Figurinha"
              className="w-32 h-32 object-contain"
            />
          </div>
        );

      default:
        // Detect Poll
        if (message.content?.startsWith('POLL:')) {
          try {
            const pollData = JSON.parse(message.content.substring(5));
            return (
              <PollMessage
                messageId={message.message_id}
                question={pollData.question}
                options={pollData.options}
                allowMultiple={pollData.allowMultiple}
                visitorId={message.is_from_me ? 'admin' : (message as any).sender_id || 'remote'}
                visitorName={message.is_from_me ? 'Administrador' : (message as any).sender_name || 'Cliente'}
              />
            );
          } catch (e) { return <p className="text-sm text-red-500">Erro ao renderizar enquete</p>; }
        }
        // Detect Contact
        if (message.content?.startsWith('CONTACT:')) {
          try {
            const contactData = JSON.parse(message.content.substring(8));
            return <ContactMessage name={contactData.name} phone={contactData.phone} />;
          } catch (e) { return <p className="text-sm text-red-500">Erro ao renderizar contato</p>; }
        }

        return (
          <div className="text-sm break-words leading-relaxed">
            {formatWhatsAppStyle(message.content)}
          </div>
        );
    }
  };

  return (
    <div
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="flex-1 w-full h-full overflow-y-auto p-4 space-y-4 custom-scrollbar"
    >
      {isLoadingMore && (
        <div className="text-center py-2">
          <span className="text-sm text-gray-500">Carregando mensagens antigas...</span>
        </div>
      )}
      {messages.map((message) => (
        <div
          key={message.message_id}
          className={`flex gap-2 ${message.is_from_me ? 'justify-end' : 'justify-start'} group relative`}
        >
          {/* Options Menu (Only for own messages) */}
          {message.is_from_me && !editingMessageId && (
            <div className="absolute top-0 right-0 z-20">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptionsId(showOptionsId === message.message_id ? null : message.message_id);
                }}
                className={`p-1 bg-white shadow hover:bg-gray-50 rounded-full transition-all border border-gray-100 ${showOptionsId === message.message_id ? 'ring-2 ring-brand-500' : ''}`}
              >
                <MoreVertical size={14} className="text-gray-600" />
              </button>

              {showOptionsId === message.message_id && (
                <div className="absolute right-0 bottom-full mb-1 bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[120px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingMessageId(message.message_id); setEditContent(message.content); setShowOptionsId(null); }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit2 size={14} /> Editar
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteMessage?.(message.message_id); setShowOptionsId(null); }}
                    className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Apagar
                  </button>
                </div>
              )}
            </div>
          )}

          <div
            className={`max-w-[65%] sm:max-w-[60%] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] relative text-sm ${message.is_from_me
              ? 'bg-[#d9fdd3] rounded-xl'
              : 'bg-white rounded-xl'
              }`}
          >

            {/* Nome do remetente em grupos */}
            {!message.is_from_me && message.conversation_id.includes('@g.us') && (
              <p className="px-2 pt-1 text-[12px] font-bold text-[#53bdeb] mb-0.5 opacity-90 leading-tight">
                {message.sender_id.split('@')[0]}
              </p>
            )}

            <div className={`px-2 py-1.5 ${message.media_type ? 'pb-1' : ''}`}>
              {editingMessageId === message.message_id ? (
                <div className="min-w-[200px]">
                  <textarea
                    value={editContent}
                    onChange={e => {
                      setEditContent(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                    }}
                    className="w-full p-2 text-sm bg-white border border-green-200 rounded-md focus:outline-none focus:border-green-500 resize-none overflow-hidden"
                    rows={1}
                    autoFocus
                    onFocus={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                    }}
                    onKeyDown={e => {
                      // Ignore IME composition
                      if (e.nativeEvent.isComposing) return;

                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.stopPropagation();
                        if (editContent.trim()) {
                          onEditMessage?.(message.message_id, editContent);
                          setEditingMessageId(null);
                        }
                      }

                      if (e.key === 'Escape') setEditingMessageId(null);
                    }}
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button onClick={() => setEditingMessageId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                    <button onClick={() => { onEditMessage?.(message.message_id, editContent); setEditingMessageId(null); }} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">Salvar</button>
                  </div>
                </div>
              ) : (
                renderMediaContent(message)
              )}
            </div>

            <div className={`flex justify-end items-end gap-1 px-2 pb-1.5 -mt-1 select-none pointer-events-none float-right ${message.media_type ? 'relative z-10' : ''}`}>
              <span className="text-[11px] text-[#667781] leading-none flex items-center gap-1">
                {(message as any).is_edited && <span className="italic text-[10px] opacity-70">Editado</span>}
                {new Date(message.message_timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {message.is_from_me && (
                <span className="flex items-end">
                  {getStatusIcon(message.status || 'sent')}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />

      {lightboxImage && (
        <ImageLightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};

export default MessageArea;
