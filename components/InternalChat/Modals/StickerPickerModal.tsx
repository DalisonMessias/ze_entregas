import React, { useState, useEffect } from 'react';
import { BaseModal } from '../../BaseModal';
import { Sticker, Loader2, Upload, Trash2 } from 'lucide-react';
import * as cloud from '../../../services/cloud';

interface StickerPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (url: string) => void;
    storeId: string;
    setToast?: (toast: { message: string, type: 'success' | 'error' | 'info' } | null) => void;
}

import { useDialog } from '../../../utils/dialogService';

export const StickerPickerModal: React.FC<StickerPickerModalProps> = ({ isOpen, onClose, onSelect, storeId, setToast }) => {
    const { confirm } = useDialog();
    const [stickers, setStickers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadStickers();
        }
    }, [isOpen]);

    const loadStickers = async () => {
        setLoading(true);
        const data = await cloud.getStoreStickers(storeId);
        setStickers(data || []);
        setLoading(false);
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 500 * 1024) { // 500KB limit for stickers recommendations
            if (setToast) setToast({ message: 'A figurinha deve ter menos de 500KB.', type: 'error' });
            return;
        }

        setUploading(true);
        const url = await cloud.uploadSticker(file, storeId);
        if (url) {
            loadStickers();
        } else {
            if (setToast) setToast({ message: 'Falha no upload.', type: 'error' });
        }
        setUploading(false);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const confirmed = await confirm({ title: 'Excluir Figurinha', message: 'Deseja realmente deletar esta figurinha?' });
        if (confirmed) {
            await cloud.deleteSticker(id);
            loadStickers();
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Figurinhas da Loja"
            icon={<Sticker className="w-6 h-6 text-teal-600" />}
        >
            <div className="space-y-4">
                <input
                    type="file"
                    id="sticker-upload"
                    accept="image/png,image/webp"
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                />

                <label
                    htmlFor="sticker-upload"
                    className={`block w-full border-2 border-dashed border-teal-200 dark:border-teal-900 rounded-xl p-4 text-center cursor-pointer transition-colors hover:bg-teal-50 dark:hover:bg-teal-900/20 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <div className="flex flex-col items-center gap-2 text-teal-600 dark:text-teal-400">
                        {uploading ? <Loader2 className="animate-spin w-6 h-6" /> : <Upload className="w-6 h-6" />}
                        <span className="font-bold text-sm">Adicionar Nova Figurinha</span>
                        <span className="text-xs text-gray-500">Recomendado: 512x512px, WebP ou PNG transparente</span>
                    </div>
                </label>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar p-2">
                    {loading ? (
                        <div className="col-span-4 flex justify-center py-8"><Loader2 className="animate-spin text-teal-500" /></div>
                    ) : stickers.length === 0 ? (
                        <p className="col-span-4 text-center text-gray-400 py-4 text-sm">Nenhuma figurinha na loja.</p>
                    ) : (
                        stickers.map(sticker => (
                            <div key={sticker.id} className="relative group aspect-square bg-gray-50 rounded-lg p-2 border border-gray-100 flex items-center justify-center cursor-pointer hover:border-teal-500 transition-all" onClick={() => { onSelect(sticker.url); onClose(); }}>
                                <img src={sticker.url} alt="Sticker" className="w-full h-full object-contain" />
                                <button
                                    onClick={(e) => handleDelete(e, sticker.id)}
                                    className="absolute -top-2 -right-2 bg-red-100 text-red-500 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </BaseModal>
    );
};
