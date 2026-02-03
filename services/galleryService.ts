import * as cloud from './cloud';

/**
 * Serviço para gerenciamento manual da galeria de imagens.
 */

export const saveGalleryImage = async (data: {
    product_name: string;
    category: string;
    image_url: string;
    is_ai_generated: boolean;
}) => {
    const sb = cloud.getClient();
    if (!sb) throw new Error('Supabase client not initialized');

    const { error } = await sb.from('product_images_gallery').insert({
        product_name: data.product_name,
        category: data.category,
        image_url: data.image_url,
        is_ai_generated: data.is_ai_generated,
        subtitle: 'Imagem meramente ilustrativa',
    });

    if (error) throw error;
};

export const getGalleryImages = async () => {
    const sb = cloud.getClient();
    if (!sb) return [];

    const { data, error } = await sb
        .from('product_images_gallery')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao buscar galeria:', error);
        return [];
    }
    return data || [];
};

export const uploadGalleryImage = async (file: File): Promise<string> => {
    const sb = cloud.getClient();
    if (!sb) throw new Error('Supabase client not initialized');

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `product_images/${fileName}`;

    const { error: uploadError } = await sb.storage.from('gallery').upload(filePath, file);

    if (uploadError) {
        console.error('Erro no upload:', uploadError);
        throw uploadError;
    }

    const { data } = sb.storage.from('gallery').getPublicUrl(filePath);

    return data.publicUrl;
};
