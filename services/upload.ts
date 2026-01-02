import { getClient } from './cloud';

export const uploadMarketingAsset = async (file: File): Promise<string> => {
    const sb = getClient();
    if (!sb) throw new Error("Cliente Supabase não inicializado");

    console.log(`[Upload] Iniciando: ${file.name} (${file.size} bytes)`);

    // 1. ler arquivo como ArrayBuffer (seguro contra timeouts de stream)
    let fileBody: ArrayBuffer;
    try {
        fileBody = await file.arrayBuffer();
    } catch (e: any) {
        console.error("Erro ao ler arquivo:", e);
        throw new Error("Falha na leitura do arquivo.");
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    // Nome seguro
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '');
    const filePath = `${safeFileName}`;
    const contentType = file.type || 'application/octet-stream';

    // 2. Upload usando o cliente oficial (agora que o timeout foi aumentado em urlPolicy)
    // O cliente envia o token de usuário automaticamente, resolvendo o erro 403 (RLS)
    let { error: uploadError } = await sb.storage
        .from('marketing-assets')
        .upload(filePath, fileBody, {
            contentType: contentType,
            upsert: false
        });

    let targetBucket = 'marketing-assets';

    if (uploadError) {
        console.warn(`[Upload] Falha primária ('marketing-assets'): ${uploadError.message}. Tentando fallback...`);

        // 3. Fallback para 'avatars'
        const { error: fallbackError } = await sb.storage
            .from('avatars')
            .upload(filePath, fileBody, {
                contentType: contentType,
                upsert: false
            });

        if (fallbackError) {
            console.error(`[Upload] Fallback falhou: ${fallbackError.message}`);
            throw new Error(`Erro no upload: ${uploadError.message} / ${fallbackError.message}`);
        }

        targetBucket = 'avatars';
        console.log(`[Upload] Salvo em fallback: ${targetBucket}`);
    } else {
        console.log(`[Upload] Salvo em primária: ${targetBucket}`);
    }

    const { data: { publicUrl } } = sb.storage
        .from(targetBucket)
        .getPublicUrl(filePath);

    return publicUrl;
};
