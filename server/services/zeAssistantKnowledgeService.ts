import { supabaseAdmin } from './supabaseClient.js';
import type { ZeAssistantKnowledgeBase, ZeAssistantContentType } from '../../types/zeAssistant.js';

/**
 * Serviço de Base de Conhecimento do Zé Assistente
 * Sincroniza e indexa dados da loja para consulta rápida
 */
export class ZeAssistantKnowledgeService {

    /**
     * Sincroniza produtos da loja na base de conhecimento
     */
    async syncProducts(storeId: string): Promise<void> {
        if (!supabaseAdmin) return;

        try {
            // Buscar produtos ativos da loja
            const { data: products, error: getErr } = await supabaseAdmin
                .from('products')
                .select('id, name, description, price, category_id, categories(name)')
                .eq('store_id', storeId)
                .eq('is_active', true);

            if (getErr) {
                console.error(`[KnowledgeService] ❌ Erro ao buscar produtos:`, getErr.message);
                return;
            }

            if (!products) return;

            // Limpar produtos antigos
            const { error: delErr } = await supabaseAdmin
                .from('ze_assistant_knowledge_base')
                .delete()
                .eq('store_id', storeId)
                .eq('content_type', 'PRODUCT');

            if (delErr) {
                console.error(`[KnowledgeService] ❌ Erro ao limpar conhecimento antigo:`, delErr.message);
            }

            // Inserir produtos atualizados
            const entries = products.map(p => ({
                store_id: storeId,
                content_type: 'PRODUCT' as ZeAssistantContentType,
                title: p.name,
                content: `${p.name} - R$ ${p.price.toFixed(2)}${p.description ? `. ${p.description}` : ''}`,
                structured_data: {
                    productId: p.id,
                    name: p.name,
                    price: p.price,
                    description: p.description,
                    category: (p.categories as any)?.name
                },
                is_active: true
            }));

            if (entries.length > 0) {
                const { error: insErr } = await supabaseAdmin
                    .from('ze_assistant_knowledge_base')
                    .insert(entries);

                if (insErr) {
                    console.error(`[KnowledgeService] ❌ Erro ao inserir na Knowledge Base:`, insErr.message);
                }
            }

            console.log(`Sincronizados ${entries.length} produtos para loja ${storeId}`);

        } catch (error) {
            console.error('Erro ao sincronizar produtos:', error);
        }
    }

    /**
     * Sincroniza informações da loja
     */
    async syncStoreInfo(storeId: string): Promise<void> {
        if (!supabaseAdmin) return;

        try {
            const { data: store, error: storeErr } = await supabaseAdmin
                .from('user_profiles')
                .select('store_name, phone_number, opening_hours, store_address_street, store_address_number, store_address_city, store_address_state')
                .eq('id', storeId)
                .single();

            if (storeErr) {
                console.error(`[KnowledgeService] ❌ Erro ao buscar info da loja:`, storeErr.message);
                return;
            }

            if (!store) return;

            // Remover info antiga
            await supabaseAdmin
                .from('ze_assistant_knowledge_base')
                .delete()
                .eq('store_id', storeId)
                .in('content_type', ['HOURS', 'POLICY']);

            const entries: any[] = [];

            // Horário de funcionamento
            if (store.opening_hours) {
                entries.push({
                    store_id: storeId,
                    content_type: 'HOURS',
                    title: 'Horário de Funcionamento',
                    content: store.opening_hours,
                    structured_data: { hours: store.opening_hours },
                    is_active: true
                });
            }

            // Endereço
            if (store.store_address_street) {
                const address = `${store.store_address_street}, ${store.store_address_number} - ${store.store_address_city}/${store.store_address_state}`;
                entries.push({
                    store_id: storeId,
                    content_type: 'POLICY',
                    title: 'Endereço da Loja',
                    content: address,
                    structured_data: {
                        street: store.store_address_street,
                        number: store.store_address_number,
                        city: store.store_address_city,
                        state: store.store_address_state
                    },
                    is_active: true
                });
            }

            if (entries.length > 0) {
                const { error: insErr } = await supabaseAdmin
                    .from('ze_assistant_knowledge_base')
                    .insert(entries);

                if (insErr) {
                    console.error(`[KnowledgeService] ❌ Erro ao inserir na Knowledge Base:`, insErr.message);
                }
            }

        } catch (error) {
            console.error('Erro ao sincronizar info da loja:', error);
        }
    }

    /**
     * Adiciona FAQ personalizado
     */
    async addFAQ(
        storeId: string,
        question: string,
        answer: string
    ): Promise<ZeAssistantKnowledgeBase | null> {
        if (!supabaseAdmin) return null;

        const { data, error } = await supabaseAdmin
            .from('ze_assistant_knowledge_base')
            .insert({
                store_id: storeId,
                content_type: 'FAQ',
                title: question,
                content: answer,
                structured_data: { question, answer },
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao adicionar FAQ:', error);
            return null;
        }

        return data;
    }

    /**
     * Busca conhecimento relevante
     */
    async searchKnowledge(
        storeId: string,
        query: string,
        contentType?: ZeAssistantContentType
    ): Promise<ZeAssistantKnowledgeBase[]> {
        if (!supabaseAdmin) return [];

        let queryBuilder = supabaseAdmin
            .from('ze_assistant_knowledge_base')
            .select('*')
            .eq('store_id', storeId)
            .eq('is_active', true);

        if (contentType) {
            queryBuilder = queryBuilder.eq('content_type', contentType);
        }

        // Busca textual simples (pode ser melhorada com busca vetorial)
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,content.ilike.%${query}%`);

        const { data } = await queryBuilder.limit(10);

        return data || [];
    }

    /**
     * Atualiza entrada da base de conhecimento
     */
    async updateKnowledge(
        id: string,
        updates: Partial<ZeAssistantKnowledgeBase>
    ): Promise<boolean> {
        if (!supabaseAdmin) return false;

        const { error } = await supabaseAdmin
            .from('ze_assistant_knowledge_base')
            .update(updates)
            .eq('id', id);

        return !error;
    }

    /**
     * Remove entrada da base de conhecimento
     */
    async deleteKnowledge(id: string): Promise<boolean> {
        if (!supabaseAdmin) return false;

        const { error } = await supabaseAdmin
            .from('ze_assistant_knowledge_base')
            .delete()
            .eq('id', id);

        return !error;
    }

    /**
     * Sincronização completa de todos os dados da loja
     */
    async fullSync(storeId: string): Promise<void> {
        console.log(`Iniciando sincronização completa para loja ${storeId}`);

        await this.syncProducts(storeId);
        await this.syncStoreInfo(storeId);

        console.log(`Sincronização completa finalizada para loja ${storeId}`);
    }

    /**
     * Lista toda a base de conhecimento de uma loja
     */
    async listAll(storeId: string): Promise<ZeAssistantKnowledgeBase[]> {
        if (!supabaseAdmin) return [];

        const { data, error: listErr } = await supabaseAdmin
            .from('ze_assistant_knowledge_base')
            .select('*')
            .eq('store_id', storeId)
            .eq('is_active', true)
            .order('content_type')
            .order('created_at', { ascending: false });

        if (listErr) {
            console.error(`[KnowledgeService] ❌ Erro ao listar conhecimento de ${storeId}:`, listErr.message);
        }

        return data || [];
    }
}

export const zeAssistantKnowledgeService = new ZeAssistantKnowledgeService();
