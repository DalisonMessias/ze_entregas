import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WhatsappMessage } from './types';
import { Download, Check, CheckCheck } from 'lucide-react';
import ImageLightbox from './ImageLightbox';

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
      setTimeout(() => setIsLoadingMore(false), 1000);
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

      default:
        return <p className="text-sm break-words">{message.content}</p>;
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
          {/* Avatar para mensagens recebidas */}
          {!message.is_from_me && (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
              {getInitials(message.sender_id)}
            </div>
          )}

          <div
            className={`max-w-[85%] sm:max-w-[70%] shadow-sm px-2 py-1.5 relative ${message.is_from_me
              ? 'bg-[#d9fdd3] text-[#111B21] rounded-lg rounded-tr-none'
              : 'bg-white text-[#111B21] border border-gray-100 rounded-lg rounded-tl-none'
              }`}
          >
            {/* Seta do Balão */}
            <div className={`absolute top-0 w-0 h-0 border-8 border-transparent ${message.is_from_me
              ? 'right-[-7px] border-t-[#d9fdd3] border-r-0'
              : 'left-[-7px] border-t-white border-l-0'
              }`} />
            {/* Nome do remetente em mensagens de grupos que não são minhas */}
            {!message.is_from_me && message.conversation_id.includes('@g.us') && (
              <p className="text-[10px] font-bold text-blue-600 mb-1 opacity-90">
                {message.sender_id.split('@')[0]}
              </p>
            )}

            {renderMediaContent(message)}

            <div className={`flex items-center gap-1 mt-0.5 justify-end`}>
              <p className="text-[10px] text-[#667781] tabular-nums">
                {new Date(message.message_timestamp).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
              {message.is_from_me && (
                <span className="flex items-center">
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
