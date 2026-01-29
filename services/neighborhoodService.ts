import { getClient } from './cloud';

export interface Neighborhood {
    id: string;
    city_id: string;
    name: string;
    active: boolean;
    created_at?: string;
}

export const neighborhoodService = {
    async getNeighborhoods(cityId: string): Promise<Neighborhood[]> {
        const sb = getClient();
        if (!sb) return [];

        const { data, error } = await sb
            .from('neighborhoods')
            .select('*')
            .eq('city_id', cityId)
            .order('name');

        if (error) {
            console.error('Erro ao listar bairros:', error);
            return [];
        }
        return data as Neighborhood[];
    },

    async createNeighborhood(cityId: string, name: string): Promise<{ success: boolean, message?: string }> {
        const sb = getClient();
        if (!sb) return { success: false, message: 'Client not ready' };

        try {
            const { error } = await sb
                .from('neighborhoods')
                .insert({
                    city_id: cityId,
                    name: name.trim(),
                    active: true
                });

            if (error) {
                if (error.code === '23505') return { success: false, message: 'Bairro já cadastrado nesta cidade.' };
                throw error;
            }
            return { success: true };
        } catch (e: any) {
            console.error('Erro ao criar bairro:', e);
            return { success: false, message: e.message };
        }
    },

    async deleteNeighborhood(id: string): Promise<{ success: boolean, message?: string }> {
        const sb = getClient();
        if (!sb) return { success: false, message: 'Client not ready' };

        const { error } = await sb.from('neighborhoods').delete().eq('id', id);
        if (error) return { success: false, message: error.message };
        return { success: true };
    }
};
