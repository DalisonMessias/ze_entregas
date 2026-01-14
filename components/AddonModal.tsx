
import React, { useState, useEffect } from 'react';
import { StoreAddonGroup, StoreAddonOption } from '../types';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { X, Plus, Trash2, Save, Loader2, GripVertical } from 'lucide-react';
import * as cloud from '../services/cloud';
import { useDialog } from '../utils/dialogService';

interface AddonModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupToEdit?: StoreAddonGroup;
    onSave?: () => void;
}

export const AddonModal: React.FC<AddonModalProps> = ({ isOpen, onClose, groupToEdit, onSave }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');
    const [min, setMin] = useState(0);
    const [max, setMax] = useState(1);
    const [options, setOptions] = useState<StoreAddonOption[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Internal state for new option
    const [newOptionName, setNewOptionName] = useState('');
    const [newOptionPrice, setNewOptionPrice] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (groupToEdit) {
                setName(groupToEdit.name);
                setType(groupToEdit.type);
                setMin(groupToEdit.min);
                setMax(groupToEdit.max);
                setOptions(groupToEdit.options || []);
            } else {
                // Reset for new group
                setName('');
                setType('SINGLE');
                setMin(0);
                setMax(1);
                setOptions([]);
            }
            setNewOptionName('');
            setNewOptionPrice('');
        }
    }, [isOpen, groupToEdit]);

    const handleAddOption = () => {
        if (!newOptionName.trim()) return;

        const newOption: StoreAddonOption = {
            id: crypto.randomUUID(),
            name: newOptionName.trim(),
            price: Number(newOptionPrice) || 0,
            is_active: true
        };

        setOptions([...options, newOption]);
        setNewOptionName('');
        setNewOptionPrice('');

        // Auto-focus logic can be added here if needed
    };

    const handleRemoveOption = (id: string) => {
        setOptions(options.filter(opt => opt.id !== id));
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        if (options.length === 0) {
            alert("Adicione pelo menos uma opção.");
            return;
        }

        setIsSaving(true);
        try {
            const groupData: Partial<StoreAddonGroup> = {
                name,
                type,
                min,
                max: type === 'SINGLE' ? 1 : max,
                options,
                is_active: true
            };

            if (groupToEdit) {
                await cloud.updateStoreAddonGroup({ ...groupData, id: groupToEdit.id });
            } else {
                await cloud.createStoreAddonGroup(groupData);
            }
            onSave?.();
            onClose();
        } catch (error) {
            console.error("Erro ao salvar grupo:", error);
            alert("Erro ao salvar grupo. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-700 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-black dark:text-white">
                            {groupToEdit ? 'Editar Grupo' : 'Novo Grupo de Adicionais'}
                        </h3>
                        <p className="text-gray-500 text-sm">Configure as opções disponíveis para o cliente</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nome do Grupo</label>
                            <CustomInput
                                placeholder="Ex: Escolha seu Molho, Bordas Recheadas..."
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tipo de Escolha</label>
                            <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1">
                                <button
                                    onClick={() => { setType('SINGLE'); setMax(1); }}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'SINGLE'
                                            ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Única (1)
                                </button>
                                <button
                                    onClick={() => setType('MULTIPLE')}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'MULTIPLE'
                                            ? 'bg-white dark:bg-gray-700 text-brand-600 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                        }`}
                                >
                                    Múltipla
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Mínimo</label>
                                <CustomInput
                                    type="number"
                                    value={min.toString()}
                                    onChange={(e) => setMin(Math.max(0, Number(e.target.value)))}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Máximo</label>
                                <CustomInput
                                    type="number"
                                    value={max.toString()}
                                    onChange={(e) => setMax(Math.max(1, Number(e.target.value)))}
                                    disabled={type === 'SINGLE'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-6">
                        <label className="block text-lg font-bold text-gray-900 dark:text-white mb-4">Opções do Grupo</label>

                        <div className="flex gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <div className="flex-1">
                                <CustomInput
                                    placeholder="Nome da opção (ex: Maionese)"
                                    value={newOptionName}
                                    onChange={(e) => setNewOptionName(e.target.value)}
                                // onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                                />
                            </div>
                            <div className="w-32">
                                <CustomInput
                                    type="number"
                                    placeholder="Preço (0 para grátis)"
                                    value={newOptionPrice}
                                    onChange={(e) => setNewOptionPrice(e.target.value)}
                                // onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                                />
                            </div>
                            <Button
                                onClick={handleAddOption}
                                disabled={!newOptionName.trim()}
                                className="px-4 rounded-xl"
                            >
                                <Plus className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            {options.length === 0 ? (
                                <div className="text-center py-6 text-gray-400 text-sm italic">
                                    Nenhuma opção adicionada ainda.
                                </div>
                            ) : (
                                options.map((opt, index) => (
                                    <div key={opt.id || index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <GripVertical className="w-4 h-4 text-gray-300 cursor-move" />
                                            <span className="font-medium text-gray-700 dark:text-gray-200">{opt.name}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-bold text-brand-600">
                                                {opt.price === 0 ? 'Grátis' : `+ R$ ${Number(opt.price).toFixed(2)}`}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveOption(opt.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 py-4 rounded-xl font-bold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || !name.trim() || options.length === 0}
                            className="flex-[2] py-4 rounded-xl font-bold text-white shadow-xl shadow-brand-500/20"
                        >
                            {isSaving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                            {groupToEdit ? 'Salvar Alterações' : 'Criar Grupo'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
