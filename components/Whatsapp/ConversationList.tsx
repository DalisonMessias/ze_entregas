import React from 'react';
import { WhatsappConversation, PriorityLevel } from './types';
import { UserPlus, Star, MessageSquare, Trash2, MoreVertical, GripVertical } from 'lucide-react';


interface ConversationListProps {
  conversations: WhatsappConversation[];
  selectedId?: string;
  onSelectConversation: (conversation: WhatsappConversation) => void;
  profilePictures?: Record<string, string>;
  isManualOrder?: boolean;
  onReorder?: (draggedId: string, targetId: string) => void;
  onUpdatePriority?: (conversationId: string, priority: PriorityLevel) => void;
  onDeleteConversation?: (conversationId: string) => void;
  onSaveContactName?: (conversationId: string, name: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  onSelectConversation,
  profilePictures = {},
  isManualOrder = false,
  onReorder,
  onUpdatePriority,
  onDeleteConversation,
  onSaveContactName
}) => {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getPriorityColor = (priority?: PriorityLevel) => {
    switch (priority) {
      case 'critical': return 'text-red-500 animate-pulse';
      case 'high': return 'text-orange-500';
      case 'normal': return 'text-gray-300 hover:text-gray-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-300 hover:text-gray-400';
    }
  };

  const getPriorityLabel = (priority: PriorityLevel) => {
    switch (priority) {
      case 'critical': return 'Crítica';
      case 'high': return 'Alta';
      case 'normal': return 'Normal';
      case 'low': return 'Baixa';
      default: return '';
    }
  };

  const getPriorityBorder = (priority?: PriorityLevel) => {
    switch (priority) {
      case 'critical': return 'border-l-4 border-l-red-600 shadow-sm bg-red-50/10';
      case 'high': return 'border-l-4 border-l-orange-500';
      case 'normal': return '';
      case 'low': return 'border-l-4 border-l-blue-400';
      default: return '';
    }
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
      <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold flex-shrink-0 text-sm">
        {getInitials(conversation.contact_name || conversation.conversation_id)}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conversation) => {
        const unreadCount = conversation.unread_count || 0;
        const isSelected = selectedId === conversation.conversation_id;
        const isUnknownContact = conversation.contact_name === conversation.conversation_id || (!conversation.contact_name);

        return (
          <div
            key={conversation.conversation_id}
            onClick={() => onSelectConversation(conversation)}
            draggable={isManualOrder}
            onDragStart={(e) => {
              if (!isManualOrder) return;
              setDraggedId(conversation.conversation_id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragOver={(e) => {
              if (!isManualOrder) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(e) => {
              if (!isManualOrder || !draggedId || draggedId === conversation.conversation_id) return;
              onReorder?.(draggedId, conversation.conversation_id);
              setDraggedId(null);
            }}
            className={`p-3 border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 group flex items-center gap-3 relative ${isSelected ? 'bg-[#f0f2f5]' : ''} ${draggedId === conversation.conversation_id ? 'opacity-50 grayscale' : ''} ${getPriorityBorder(conversation.priority)}`}
          >
            {/* Status Indicator Bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${conversation.status === 'open' ? 'bg-brand-600' : conversation.status === 'closed' ? 'bg-gray-400' : 'bg-transparent'}`} />

            <div className="flex items-center gap-3 w-full overflow-hidden">
              {/* Drag Handle (Visible only if isManualOrder is true) */}
              {isManualOrder && (
                <div className="cursor-grab active:cursor-grabbing text-gray-400 p-1 hover:bg-gray-100 rounded">
                  <GripVertical size={16} />
                </div>
              )}

              {renderAvatar(conversation)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h3 className="font-normal text-[#111B21] truncate text-[16px] flex items-center gap-2">
                    {conversation.contact_name || conversation.conversation_id}

                    {/* Tags de Classificação de Cliente */}
                    {conversation.customer_type === 'ze' && (
                      <span className="px-1.5 py-0.5 bg-brand-100 text-brand-600 rounded text-[9px] font-black uppercase tracking-tighter" title="Usuário logado na plataforma">Cliente Zé</span>
                    )}
                    {conversation.customer_type === 'store' && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-black uppercase tracking-tighter" title="Contato salvo na lista da loja">Cliente Loja</span>
                    )}
                    {conversation.customer_type === 'visitor' && (
                      <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px] font-black uppercase tracking-tighter" title="Usuário não identificado (Menu Digital)">Visitante</span>
                    )}
                  </h3>
                  <span className="text-xs text-[#667781] flex-shrink-0 tabular-nums">
                    {conversation.last_message_timestamp ? new Date(conversation.last_message_timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-[#667781] truncate flex-1">
                    {conversation.last_message_content || 'Sem mensagens'}
                  </p>

                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[10px] text-[#667781] tabular-nums font-medium">
                      {conversation.last_message_timestamp ? new Date(conversation.last_message_timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>

                    {/* Botão Salvar Contato (se desconhecido) */}
                    {isUnknownContact && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newName = prompt('Digite o nome para este contato:', conversation.conversation_id.split('@')[0]);
                          if (newName) onSaveContactName?.(conversation.conversation_id, newName);
                        }}
                        className="p-1 text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
                        title="Salvar Nome do Contato"
                      >
                        <UserPlus size={14} />
                      </button>
                    )}

                    {/* Priority Star (Toggle) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle: Se for 'high', volta para 'normal'. Se não for, vira 'high'.
                        onUpdatePriority?.(conversation.conversation_id, conversation.priority === 'high' ? 'normal' : 'high');
                      }}
                      className={`p-1 rounded-full transition-all hover:scale-110 ${getPriorityColor(conversation.priority)}`}
                      title={conversation.priority === 'high' ? 'Remover prioridade' : 'Marcar como importante'}
                    >
                      <Star size={18} fill={(conversation.priority === 'high' || conversation.priority === 'critical') ? 'currentColor' : 'none'} />
                    </button>

                    {/* Unread Badge */}
                    {unreadCount > 0 && (
                      <span className="bg-brand-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                        {unreadCount}
                      </span>
                    )}

                    {/* Add Contact for unknowns */}
                    {isUnknownContact && (
                      <button
                        className="p-1 text-brand-600 hover:bg-gray-100 rounded-full"
                        title="Adicionar contato"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Adicionar contato:', conversation.conversation_id);
                        }}
                      >
                        <UserPlus size={16} />
                      </button>
                    )}
                    {/* Trash Icon for Deletion (Visible on hover) */}
                    <button
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all ml-1"
                      title="Deletar conversa"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation?.(conversation.conversation_id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
