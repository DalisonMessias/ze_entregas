// ==================================================================
// TIPOS DO ZÉ ASSISTENTE - ASSISTENTE VIRTUAL WHATSAPP
// ==================================================================

export type ZeAssistantResponseType = 'AI' | 'RULE' | 'HYBRID' | 'HUMAN';
export type ZeAssistantRuleType = 'SYSTEM' | 'CUSTOM';
export type ZeAssistantOrderType = 'DELIVERY' | 'PICKUP';
export type ZeAssistantContentType = 'PRODUCT' | 'FAQ' | 'POLICY' | 'HOURS' | 'PAYMENT' | 'DELIVERY';

// Configuração do Zé Assistente por loja
export interface ZeAssistantConfig {
    id: string;
    store_id: string;
    is_enabled: boolean;
    ai_enabled: boolean;
    rules_enabled: boolean;
    can_create_orders: boolean;
    can_delivery: boolean;
    can_pickup: boolean;
    greeting_message: string;
    fallback_message: string;
    auto_handoff_on_confusion: boolean;
    max_confusion_attempts: number;
    response_delay_ms: number;
    created_at: string;
    updated_at: string;
}

// Regra fixa do assistente
export interface ZeAssistantRule {
    id: string;
    rule_type: ZeAssistantRuleType;
    store_id: string | null;
    name: string;
    description: string | null;
    trigger_keywords: string[];
    response_template: string;
    priority: number;
    is_active: boolean;
    match_mode: 'exact' | 'contains' | 'starts_with' | 'regex';
    variables: Record<string, any>;
    created_at: string;
    updated_at: string;
}

// Conversa do assistente
export interface ZeAssistantConversation {
    id: string;
    conversation_id: string;
    store_id: string;
    customer_phone: string;
    customer_name: string | null;
    is_assistant_active: boolean;
    handoff_to_human: boolean;
    handoff_at: string | null;
    handoff_reason: string | null;
    context_data: Record<string, any>;
    summary: string | null;
    confusion_count: number;
    last_interaction_at: string;
    created_at: string;
    updated_at: string;
}

// Mensagem processada pelo assistente
export interface ZeAssistantMessage {
    id: string;
    conversation_id: string;
    message_id: string | null;
    message_text: string;
    response_text: string | null;
    response_type: ZeAssistantResponseType;
    confidence_score: number | null;
    rule_id: string | null;
    processing_time_ms: number | null;
    was_successful: boolean;
    error_message: string | null;
    metadata: Record<string, any>;
    created_at: string;
}

// Pedido criado pelo assistente
export interface ZeAssistantOrder {
    id: string;
    conversation_id: string;
    order_id: string | null;
    customer_name: string;
    customer_phone: string;
    customer_address: Record<string, any> | null;
    items: Record<string, any>;
    order_type: ZeAssistantOrderType;
    total_amount: number | null;
    delivery_fee: number | null;
    payment_method: string | null;
    confirmed_by_customer: boolean;
    confirmed_at: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

// Base de conhecimento
export interface ZeAssistantKnowledgeBase {
    id: string;
    store_id: string;
    content_type: ZeAssistantContentType;
    title: string | null;
    content: string;
    structured_data: Record<string, any> | null;
    embeddings: Record<string, any> | null;
    relevance_score: number;
    is_active: boolean;
    last_synced_at: string;
    created_at: string;
    updated_at: string;
}

// Payload para processar mensagem
export interface ProcessMessagePayload {
    storeId: string;
    conversationId: string;
    customerPhone: string;
    customerName?: string;
    messageText: string;
    messageId?: string;
}

// Resposta do processamento de mensagem
export interface ProcessMessageResponse {
    success: boolean;
    responseText: string;
    responseType: ZeAssistantResponseType;
    shouldHandoff: boolean;
    handoffReason?: string;
    confidenceScore?: number;
    metadata?: Record<string, any>;
}

// Contexto de conversa
export interface ConversationContext {
    currentOrder?: {
        items: Array<{ productId: string; quantity: number; name: string; price: number }>;
        customerAddress?: any;
        orderType?: ZeAssistantOrderType;
        paymentMethod?: string;
    };
    lastIntent?: string;
    awaitingConfirmation?: boolean;
    confusionCount: number;
    variables: Record<string, any>;
}
