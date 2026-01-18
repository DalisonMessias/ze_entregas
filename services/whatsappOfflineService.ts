
import { WhatsappConversation, WhatsappMessage } from '../components/Whatsapp/types';

const DB_NAME = 'ze_entregas_whatsapp_offline';
const DB_VERSION = 2;

export class WhatsappOfflineService {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        // console.log('🔹 WhatsappOfflineService Init (v2)');
        if (this.db) return;

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

    private async getStore(name: string, mode: IDBTransactionMode = 'readonly') {
        await this.init();
        const transaction = this.db!.transaction(name, mode);
        return transaction.objectStore(name);
    }

    // Conversas
    async saveConversations(storeId: string, conversations: WhatsappConversation[]) {
        const store = await this.getStore('conversations', 'readwrite');
        let totalUnread = 0;
        for (const conv of conversations) {
            store.put({ ...conv, store_id: storeId });
            totalUnread += (conv.unread_count || 0);
        }
        this.notifyUnreadChange(totalUnread);
    }

    async getUnreadCount(): Promise<number> {
        const db = await this.init(); // Ensure init
        if (!this.db) return 0;
        const transaction = this.db.transaction('conversations', 'readonly');
        const store = transaction.objectStore('conversations');
        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result as WhatsappConversation[];
                const total = all.reduce((acc, curr) => acc + (curr.unread_count || 0), 0);
                resolve(total);
            };
            request.onerror = () => resolve(0);
        });
    }

    private notifyUnreadChange(count: number) {
        if (typeof window !== 'undefined') {
            const event = new CustomEvent('whatsapp_unread_update', { detail: { count } });
            window.dispatchEvent(event);
        }
    }

    async getConversations(storeId: string): Promise<WhatsappConversation[]> {
        const store = await this.getStore('conversations');
        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result as any[];
                resolve(all.filter(c => c.store_id === storeId));
            };
        });
    }

    // Mensagens
    async saveMessages(storeId: string, conversationId: string, messages: WhatsappMessage[]) {
        const store = await this.getStore('messages', 'readwrite');
        for (const msg of messages) {
            store.put({ ...msg, store_id: storeId });
        }
    }

    async getMessages(storeId: string, conversationId: string): Promise<WhatsappMessage[]> {
        const store = await this.getStore('messages');
        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const all = request.result as any[];
                resolve(all.filter(m => m.store_id === storeId && m.conversation_id === conversationId));
            };
        });
    }

    // Fila Offline (Mensagens enviadas enquanto offline)
    async queueMessage(storeId: string, to: string, text: string, attendantId?: string) {
        const store = await this.getStore('pending_sync', 'readwrite');
        const tempId = `offline_${Date.now()}`;
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
        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    }

    async clearPendingItem(tempId: string) {
        const store = await this.getStore('pending_sync', 'readwrite');
        store.delete(tempId);
    }

    // Ordem das Conversas
    async saveConversationOrders(orders: any[]) {
        const store = await this.getStore('conversation_orders', 'readwrite');
        for (const order of orders) {
            store.put(order);
        }
    }

    async getConversationOrders(attendantId: string, storeId: string): Promise<any[]> {
        try {
            const store = await this.getStore('conversation_orders');
            return new Promise((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => {
                    const all = request.result as any[];
                    resolve(all.filter(o => o.attendant_id === attendantId && o.store_id === storeId));
                };
                request.onerror = () => resolve([]);
            });
        } catch (error) {
            console.warn('Erro ao buscar ordens offline (ignorando):', error);
            return [];
        }
    }
}

export const whatsappOfflineService = new WhatsappOfflineService();
