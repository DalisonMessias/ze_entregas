import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';

interface ImageUploadProps {
    currentImageUrl?: string;
    onImageUploaded: (url: string) => void;
    bucketName?: string; // Defaults to 'public-files' or generic if not specified
    folderPath?: string;
    label?: string;
    description?: string;
    className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
    currentImageUrl,
    onImageUploaded,
    bucketName = 'public-files',
    folderPath = 'uploads',
    label = 'Imagem',
    description = 'Recomendado: JPG, PNG ou WEBP.',
    className = ''
}) => {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;



        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            setError('Formato não suportado. Use JPG, PNG, WEBP ou GIF.');
            return;
        }

        setError(null);
        setUploading(true);

        // Optimistic preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        try {
            const publicUrl = await cloud.uploadGenericImage(file, bucketName, folderPath);
            onImageUploaded(publicUrl);
        } catch (err: any) {
            // console.error('Upload failed:', err);
            setError('Falha no upload. Tente novamente.');
            setPreview(currentImageUrl || null); // Revert preview
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemove = () => {
        setPreview(null);
        onImageUploaded('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-gray-500 uppercase">{label}</label>
                {error && <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {error}</span>}
            </div>

            <div
                className={`relative group border-2 border-dashed rounded-xl overflow-hidden transition-all ${preview
                    ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
                    : 'border-gray-300 dark:border-gray-600 hover:border-brand-400 bg-gray-50 dark:bg-gray-700/50'
                    }`}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                />

                {preview ? (
                    <div className="relative aspect-[16/6] w-full">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-cover transition-opacity duration-300"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="p-2 bg-white/90 rounded-full hover:bg-white text-gray-700 hover:text-brand-600 shadow-sm transition-transform hover:scale-105"
                                title="Alterar imagem"
                            >
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={handleRemove}
                                className="p-2 bg-white/90 rounded-full hover:bg-white text-red-500 hover:text-red-600 shadow-sm transition-transform hover:scale-105"
                                title="Remover imagem"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="p-8 flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-brand-500 transition-colors"
                    >
                        {uploading ? (
                            <Loader2 className="w-10 h-10 animate-spin mb-3 text-brand-500" />
                        ) : (
                            <div className="p-4 bg-white dark:bg-gray-600 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                        )}
                        <span className="text-sm font-bold">{uploading ? 'Enviando...' : 'Clique para enviar imagem'}</span>
                        <span className="text-[10px] mt-1 opacity-70">{description}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
