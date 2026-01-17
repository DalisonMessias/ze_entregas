import React from 'react';
import { WhatsappConversation } from './types';
import { UserPlus } from 'lucide-react';

interface ConversationListProps {
  conversations: WhatsappConversation[];
  selectedId?: string;
  onSelectConversation: (conversation: WhatsappConversation) => void;
  profilePictures?: Record<string, string>;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelectConversation,
  profilePictures = {},
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getUnreadCount = (conversation: WhatsappConversation): number => {
    // Implementação futura: contar mensagens não lidas
    return 0;
  };

  const renderAvatar = (conversation: WhatsappConversation) => {
    const profilePic = profilePictures[conversation.conversation_id];

    if (profilePic) {
      return (
        <img
          src={profilePic}
          alt={conversation.contact_name}
          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
        />
      );
    }

    return (
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
        {getInitials(conversation.contact_name)}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        const unreadCount = getUnreadCount(conversation);
        const isUnknownContact = conversation.contact_name === conversation.conversation_id || conversation.contact_name.replace(/\D/g, '') === conversation.conversation_id.replace(/\D/g, '');

        return (
          <div
            key={conversation.conversation_id}
            onClick={() => onSelectConversation(conversation)}
            className={`p-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 group ${selectedId === conversation.conversation_id ? 'bg-[#f0f2f5]' : ''
              }`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              {renderAvatar(conversation)}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h3 className="font-normal text-[#111B21] truncate text-[16px]">
                    {conversation.contact_name}
                  </h3>
                  {conversation.last_message_timestamp && (
                    <span className="text-xs text-[#667781] flex-shrink-0">
                      {new Date(conversation.last_message_timestamp).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-[#667781] truncate">
                    {conversation.last_message_content || 'Sem mensagens'}
                  </p>

                  {/* Badge de Não Lidas */}
                  {unreadCount > 0 && (
                    <span className="bg-[#25D366] text-white text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 min-w-[20px] h-[20px] flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}

                  {/* Botão para adicionar contato (visível apenas no hover se não salvo) */}
                  {isUnknownContact && (
                    <button
                      className="hidden group-hover:flex p-1 text-[#00a884] hover:bg-gray-200 rounded-full"
                      title="Adicionar aos contatos"
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Abrir modal de adicionar contato preenchido
                        console.log('Adicionar contato:', conversation.conversation_id);
                      }}
                    >
                      <UserPlus size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ConversationList;
