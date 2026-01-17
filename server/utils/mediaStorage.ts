import path from 'path';
import fs from 'fs';

/**
 * Salva um buffer de mídia no sistema de arquivos
 * @param buffer Buffer da mídia
 * @param mediaType Tipo da mídia (image, video, audio, document)
 * @param extension Extensão do arquivo
 * @returns URL relativa do arquivo salvo
 */
export const saveMediaToStorage = async (
    buffer: Buffer,
    mediaType: string,
    extension: string
): Promise<string> => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'whatsapp', mediaType);

    // Criar diretório se não existir
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    const filePath = path.join(uploadDir, fileName);

    // Salvar arquivo
    fs.writeFileSync(filePath, buffer);

    // Retornar URL relativa
    return `/uploads/whatsapp/${mediaType}/${fileName}`;
};
