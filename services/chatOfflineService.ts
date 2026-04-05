import { ChatConversation, ChatMessage } from '../components/InternalChat/types';

const DB_NAME = 'ze_entregas_chat_offline';
const DB_VERSION = 2;

export class ChatOfflineService {
    private db: IDBDatabase | null = null;

    private hasIndexedDbSupport(): boolean {
        return typeof indexedDB !== 'undefined';
    }

    async init(): Promise<void> {
        if (this.db || !this.hasIndexedDbSupport()) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('Erro ao abrir IndexedDB:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                if (!db.objectStoreNames.contains('conversations')) {
                    db.createObjectStore('conversations', { keyPath: ['store_id', 'conversation_id'] as any });
                }

                if (!db.objectStoreNames.contains('messages')) {
                    db.createObjectStore('messages', { keyPath: ['store_id', 'message_id'] as any });
                }

                if (!db.objectStoreNames.contains('pending_sync')) {
                    db.createObjectStore('pending_sync', { keyPath: 'temp_id', autoIncrement: true });
                }

                if (!db.objectStoreNames.contains('conversation_orders')) {
                    db.createObjectStore('conversation_orders', { keyPath: ['attendant_id', 'store_id', 'conversation_id'] as any });
                }
            };
        });
    }

    private async getStore(name: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore | null> {
        await this.init();
        if (!this.db) return null;

        const transaction = this.db.transaction(name, mode);
        return transaction.objectStore(name);
    }

    private notifyUnreadChange(count: number) {
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('chat_unread_update', { detail: { count } });
            window.dispatchEvent(event);
        }
    }

    async saveConversations(storeId: string, conversations: ChatConversation[]) {
        const store = await this.getStore('conversations', 'readwrite');
        if (!store) return;

        let totalUnread = 0;
        for (const conv of conversations) {
            store.put({ ...conv, store_id: storeId });
            totalUnread += conv.unread_count || 0;
        }

        this.notifyUnreadChange(totalUnread);
    }

    async getUnreadCount(): Promise<number> {
        if (!this.hasIndexedDbSupport()) return 0;

        await this.init();
        if (!this.db) return 0;

        const transaction = this.db.transaction('conversations', 'readonly');
        const store = transaction.objectStore('conversations');

        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result as ChatConversation[];
                const total = all.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
                resolve(total);
            };
            request.onerror = () => resolve(0);
        });
    }

    async getConversations(storeId: string): Promise<ChatConversation[]> {
        const store = await this.getStore('conversations');
        if (!store) return [];

        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result as Array<ChatConversation & { store_id?: string }>;
                resolve(all.filter((conversation) => conversation.store_id === storeId));
            };
            request.onerror = () => resolve([]);
        });
    }

    async saveMessages(storeId: string, conversationId: string, messages: ChatMessage[]) {
        const store = await this.getStore('messages', 'readwrite');
        if (!store) return;

        for (const msg of messages) {
            store.put({ ...msg, store_id: storeId, conversation_id: conversationId });
        }
    }

    async getMessages(storeId: string, conversationId: string): Promise<ChatMessage[]> {
        const store = await this.getStore('messages');
        if (!store) return [];

        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result as Array<ChatMessage & { store_id?: string; conversation_id?: string }>;
                resolve(all.filter((message) => message.store_id === storeId && message.conversation_id === conversationId));
            };
            request.onerror = () => resolve([]);
        });
    }

    async queueMessage(storeId: string, to: string, text: string, attendantId?: string) {
        const tempId = `offline_${Date.now()}`;
        const store = await this.getStore('pending_sync', 'readwrite');
        if (!store) return tempId;

        store.add({
            temp_id: tempId,
            store_id: storeId,
            to,
            text,
            attendantId,
            type: 'text',
            timestamp: new Date().toISOString()
        });

        return tempId;
    }

    async getPendingSync(): Promise<any[]> {
        const store = await this.getStore('pending_sync');
        if (!store) return [];

        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve([]);
        });
    }

    async clearPendingItem(tempId: string) {
        const store = await this.getStore('pending_sync', 'readwrite');
        if (!store) return;

        store.delete(tempId);
    }

    async saveConversationOrders(orders: any[]) {
        const store = await this.getStore('conversation_orders', 'readwrite');
        if (!store) return;

        for (const order of orders) {
            store.put(order);
        }
    }

    async getConversationOrders(attendantId: string, storeId: string): Promise<any[]> {
        try {
            const store = await this.getStore('conversation_orders');
            if (!store) return [];

            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const all = request.result as any[];
                    resolve(all.filter((order) => order.attendant_id === attendantId && order.store_id === storeId));
                };
                request.onerror = () => resolve([]);
            });
        } catch (error) {
            console.warn('Erro ao buscar ordens offline (ignorando):', error);
            return [];
        }
    }
}

export const chatOfflineService = new ChatOfflineService();
