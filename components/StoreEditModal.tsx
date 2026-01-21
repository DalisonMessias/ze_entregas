import React, { useState, useEffect } from 'react';
import { ManagedUser } from '../types';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { X, Save, Loader2, Store } from 'lucide-react';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

interface StoreEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    store: ManagedUser;
    onSave: () => void;
}

export const StoreEditModal: React.FC<StoreEditModalProps> = ({ isOpen, onClose, store, onSave }) => {
    const [formData, setFormData] = useState<Partial<ManagedUser>>({});
    const [saving, setSaving] = useState(false);
    const { alert } = useDialog();

    useEffect(() => {
        if (store) {
            setFormData({
                name: store.name,
                phone_number: store.phone_number,
                city: store.city,
                store_document: store.store_document || store.cpf
            });
        }
    }, [store]);

    const handleSave = async () => {
        if (!store.id) return;
        setSaving(true);
        try {
            const result = await cloud.adminUpdateUserProfile(store.id, {
                name: formData.name,
                phone_number: formData.phone_number,
                city: formData.city
                // Document usually shouldn't be changed easily as it affects identity, but can be added if needed
            });

            if (result.success) {
                await alert({ title: 'Sucesso', message: 'Dados da loja atualizados com sucesso!' });
                onSave();
                onClose();
            } else {
                throw new Error('Falha na atualização');
            }
        } catch (error) {
            console.error(error);
            await alert({ title: 'Erro', message: 'Erro ao atualizar dados da loja.' });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-brand-50 dark:bg-brand-900/30 rounded-2xl text-brand-600">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black dark:text-white">Editar Loja</h3>
                            <p className="text-xs text-gray-500">Alterar dados cadastrais básicos</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-4">
                    <CustomInput
                        label="Nome da Loja / Responsável"
                        value={formData.name || ''}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Nome da Loja"
                    />

                    <CustomInput
                        label="Telefone / WhatsApp"
                        mask="phone"
                        value={formData.phone_number || ''}
                        onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                        placeholder="(00) 00000-0000"
                    />

                    <CustomInput
                        label="Cidade"
                        value={formData.city || ''}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Cidade da Loja"
                    />

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Documento (CPF/CNPJ)</label>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 font-mono text-sm">
                            {store.store_document || store.cpf || 'Não informado'}
                            <span className="ml-2 text-xs italic opacity-50">(Apenas leitura)</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3 mt-8">
                    <Button variant="outline" className="flex-1 py-3 rounded-xl" onClick={onClose}>Cancelar</Button>
                    <Button
                        className="flex-1 py-3 rounded-xl shadow-lg shadow-brand-500/20"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                        Salvar Alterações
                    </Button>
                </div>
            </div>
        </div>
    );
};
