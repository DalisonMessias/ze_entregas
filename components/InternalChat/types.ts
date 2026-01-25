// Estrutura de dados para uma conversa na lista de conversas
export interface ChatConversation {
  conversation_id: string;
  phone_number?: string | null;
  store_id?: string;
  contact_name: string | null;
  unread_count: number;
  last_message_content: string | null;
  last_message_timestamp: string | null; // ISO String
  profile_pic_url: string | null;
  assigned_to?: string | null; // UUID do atendente
  status: 'pending' | 'open' | 'closed';
  created_at?: string;
  updated_at?: string;
  priority?: PriorityLevel;
  customer_type?: 'ze' | 'store' | 'visitor' | null;
}

export type SortCriteria = 'manual' | 'recent' | 'unread' | 'priority' | 'inprogress' | 'closed';
export type PriorityLevel = 'critical' | 'high' | 'normal' | 'low';

export interface ManualOrder {
  attendant_id: string;
  store_id: string;
  conversation_id: string;
  position: number;
}

// Estrutura de dados para uma única mensagem no chat
export interface ChatMessage {
  message_id: string;
  conversation_id: string;
  store_id?: string;
  attendant_id?: string | null;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  status: 'sent' | 'delivered' | 'read' | 'received' | 'error' | 'pending' | null;
  message_timestamp: string; // ISO String
  is_from_me: boolean;
  created_at?: string;
}

// Estrutura para o status da conexao do Chat vindo do backend
export interface ChatStatus {
  status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'WAITING_QR';
  qrCode?: string;
}

// Estrutura da mensagem recebida via WebSocket
export interface WebSocketMessagePayload {
  type: string;
  payload: any;
}
