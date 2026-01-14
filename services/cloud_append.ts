
// --- STORE DELIVERY SETTINGS (CUSTOM) ---

export const getStoreDeliverySettings = async (): Promise<StoreDeliverySettings | null> => {
    const sb = getClient();
    if (!sb) return null;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return null;

    const { data, error } = await sb
        .from('store_delivery_settings')
        .select('*')
        .eq('store_id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') { // Ignore not found error
        console.error("Error fetching delivery settings:", error);
    }

    return data;
};

export const updateStoreDeliverySettings = async (settings: Partial<StoreDeliverySettings>) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    // First check if exists, if not create
    const { data: existing } = await sb.from('store_delivery_settings').select('id').eq('store_id', user.id).single();

    if (existing) {
        await sb.from('store_delivery_settings').update(settings).eq('store_id', user.id);
    } else {
        await sb.from('store_delivery_settings').insert({ ...settings, store_id: user.id });
    }
};

export const getStoreNeighborhoodFees = async (): Promise<StoreNeighborhoodFee[]> => {
    const sb = getClient();
    if (!sb) return [];
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return [];

    const { data, error } = await sb
        .from('store_neighborhood_fees')
        .select('*')
        .eq('store_id', user.id)
        .order('neighborhood_name', { ascending: true });

    if (error) {
        console.error("Error fetching neighborhood fees:", error);
        return [];
    }
    return data || [];
};

export const upsertStoreNeighborhoodFee = async (fee: Partial<StoreNeighborhoodFee>) => {
    const sb = getClient();
    if (!sb) return;
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const payload = { ...fee, store_id: user.id };
    // If id is present, it will update, otherwise insert. 
    // However, we want to allow upsert by neighborhood_name too if possible, but ID is safer if editing.
    // If adding new, ID is undefined.

    const { error } = await sb.from('store_neighborhood_fees').upsert(payload);
    if (error) throw error;
};

export const deleteStoreNeighborhoodFee = async (id: string) => {
    const sb = getClient();
    if (!sb) return;
    const { error } = await sb.from('store_neighborhood_fees').delete().eq('id', id);
    if (error) throw error;
};
