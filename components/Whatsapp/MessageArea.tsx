import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WhatsappMessage } from './types';
import { Download, Check, CheckCheck, User, MapPin } from 'lucide-react';
import ImageLightbox from './ImageLightbox';
import { PollMessage } from './Messages/PollMessage';
import { ContactMessage } from './Messages/ContactMessage';

interface MessageAreaProps {
  messages: WhatsappMessage[];
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const MessageArea: React.FC<MessageAreaProps> = ({ messages, onLoadMore, hasMore = false }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
        return (
          <svg viewBox="0 0 16 11" width={iconSize} height="11" fill="none" className="text-[#667781]">
            <path d="M1 5L5 9L15 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'delivered':
        return (
          <svg viewBox="0 0 16 11" width={iconSize} height="11" fill="none" className="text-[#667781]">
            <path d="M1 5L5 9L15 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 5L9 9L19 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(-4, 0)" />
          </svg>
        );
      case 'read':
        return (
          <svg viewBox="0 0 16 11" width={iconSize} height="11" fill="none" className="text-[#53bdeb]">
            <path d="M1 5L5 9L15 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 5L9 9L19 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(-4, 0)" />
          </svg>
        );
      case 'pending':
        return <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />;
      default:
        return null;
    }
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

  const renderMediaContent = (message: WhatsappMessage) => {
    const mediaUrl = message.media_url ? `http://localhost:3001${message.media_url}` : null;

    if (!mediaUrl || !message.media_type) {
      return <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>;
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
              <p className="text-sm mt-1 mx-1 break-words whitespace-pre-wrap leading-relaxed">{message.content}</p>
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
            return <PollMessage question={pollData.question} options={pollData.options} allowMultiple={pollData.allowMultiple} />;
          } catch (e) { return <p className="text-sm text-red-500">Erro ao renderizar enquete</p>; }
        }
        // Detect Contact
        if (message.content?.startsWith('CONTACT:')) {
          try {
            const contactData = JSON.parse(message.content.substring(8));
            return <ContactMessage name={contactData.name} phone={contactData.phone} />;
          } catch (e) { return <p className="text-sm text-red-500">Erro ao renderizar contato</p>; }
        }

        return <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>;
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
          className={`flex gap-2 ${message.is_from_me ? 'justify-end' : 'justify-start'}`}
        >
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
              {renderMediaContent(message)}
            </div>

            <div className={`flex justify-end items-end gap-1 px-2 pb-1.5 -mt-1 select-none pointer-events-none float-right ${message.media_type ? 'relative z-10' : ''}`}>
              <span className="text-[11px] text-[#667781] leading-none">
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
