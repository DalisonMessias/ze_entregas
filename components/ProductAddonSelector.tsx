import React, { useState, useEffect } from 'react';
import { StoreAddonGroup, StoreAddonOption, StoreProduct } from '../types';
import { X, Plus, Minus, Check } from 'lucide-react';
import { Button } from './Button';

interface ProductAddonSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    product: StoreProduct;
    addonGroup?: StoreAddonGroup | null;
    onConfirm: (selectedOptions: { optionId: string; optionName: string; optionPrice: number; quantity: number }[]) => void;
    initialAddons?: { optionId: string; optionName: string; optionPrice: number; quantity: number }[];
}

export const ProductAddonSelector: React.FC<ProductAddonSelectorProps> = ({
    isOpen,
    onClose,
    product,
    addonGroup,
    onConfirm,
    initialAddons = []
}) => {
    const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: number }>(() => {
        const initialMap: { [key: string]: number } = {};
        initialAddons.forEach(item => {
            initialMap[item.optionId] = item.quantity;
        });
        return initialMap;
    });

    // Filtra seleções por tipo para validações
    const groupSelectedCount = addonGroup
        ? Object.entries(selectedOptions).filter(([id]) => addonGroup.options.some(opt => opt.id === id)).reduce((sum, [_, qty]) => sum + qty, 0)
        : 0;

    const handleToggleGroupOption = (option: StoreAddonOption) => {
        if (!addonGroup) return;

        if (addonGroup.type === 'SINGLE') {
            const newMap = { ...selectedOptions };
            // Remove outras opções do mesmo grupo se for SINGLE
            addonGroup.options.forEach(opt => {
                if (opt.id !== option.id) delete newMap[opt.id];
            });
            newMap[option.id] = 1;
            setSelectedOptions(newMap);
        } else {
            const currentQty = selectedOptions[option.id] || 0;
            if (currentQty > 0) {
                const newMap = { ...selectedOptions };
                delete newMap[option.id];
                setSelectedOptions(newMap);
            } else {
                if (addonGroup.max > 0 && groupSelectedCount >= addonGroup.max) return;
                setSelectedOptions({ ...selectedOptions, [option.id]: 1 });
            }
        }
    };

    const handleUpdateQuantity = (optionId: string, delta: number, isGroupOption: boolean) => {
        const currentQty = selectedOptions[optionId] || 0;
        const newQty = Math.max(0, currentQty + delta);

        if (newQty > 0) {
            if (delta > 0 && isGroupOption && addonGroup && addonGroup.max > 0 && groupSelectedCount >= addonGroup.max) return;
            setSelectedOptions({ ...selectedOptions, [optionId]: newQty });
        } else {
            const newMap = { ...selectedOptions };
            delete newMap[optionId];
            setSelectedOptions(newMap);
        }
    };

    const handleConfirm = () => {
        // Coletar todas as opções selecionadas (grupo + avulsos)
        const allAvailableOptions = [
            ...(addonGroup?.options || []),
            ...(product.addon_options || [])
        ];

        const result = allAvailableOptions
            .filter(opt => selectedOptions[opt.id] > 0)
            .map(opt => ({
                optionId: opt.id,
                optionName: opt.name,
                optionPrice: opt.price,
                quantity: selectedOptions[opt.id]
            }));

        onConfirm(result);
        onClose();
    };

    const isGroupValid = !addonGroup || (groupSelectedCount >= addonGroup.min && (addonGroup.max === 0 || groupSelectedCount <= addonGroup.max));

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom sm:zoom-in duration-300 border-x border-t sm:border border-gray-100 dark:border-gray-800 flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-black dark:text-white uppercase tracking-tight">
                            Personalizar Item
                        </h3>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                            {product.name}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 pb-6">
                    {/* Seção do Grupo de Adicionais */}
                    {addonGroup && (
                        <div>
                            <div className="mb-4">
                                <h4 className="font-black text-sm uppercase tracking-wider dark:text-white">{addonGroup.name}</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">
                                    {addonGroup.type === 'SINGLE' ? 'Escolha 1' : `Escolha de ${addonGroup.min} a ${addonGroup.max > 0 ? addonGroup.max : 'ilimitado'}`}
                                </p>
                            </div>
                            <div className="space-y-3">
                                {addonGroup.options.map(option => {
                                    const isSelected = !!selectedOptions[option.id];
                                    const quantity = selectedOptions[option.id] || 0;

                                    return (
                                        <div
                                            key={option.id}
                                            onClick={() => addonGroup.type === 'SINGLE' && handleToggleGroupOption(option)}
                                            className={`flex items-center justify-between p-4 rounded-3xl border-2 transition-all cursor-pointer ${isSelected ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10' : 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700'}`}
                                        >
                                            <div className="flex-1" onClick={(e) => {
                                                if (addonGroup.type === 'MULTIPLE') {
                                                    e.stopPropagation();
                                                    handleToggleGroupOption(option);
                                                }
                                            }}>
                                                <p className="font-bold text-gray-900 dark:text-white">{option.name}</p>
                                                <p className="text-sm font-black text-brand-600">
                                                    {option.price === 0 ? 'Grátis' : `+ R$ ${option.price.toFixed(2).replace('.', ',')}`}
                                                </p>
                                            </div>

                                            {addonGroup.type === 'MULTIPLE' ? (
                                                <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(option.id, -1, true); }}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="w-4 text-center font-bold text-sm dark:text-white">{quantity}</span>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(option.id, 1, true); }}
                                                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-brand-500 hover:scale-110 transition-all"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-brand-500 bg-brand-500' : 'border-gray-200 dark:border-gray-700'}`}>
                                                    {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full shadow-sm" />}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Seção de Adicionais Avulsos */}
                    {(product.addon_options || []).length > 0 && (
                        <div>
                            <div className="mb-4">
                                <h4 className="font-black text-sm uppercase tracking-wider dark:text-white">Extras</h4>
                                <p className="text-[10px] text-gray-400 font-bold uppercase">Escolha quanto quiser</p>
                            </div>
                            <div className="space-y-3">
                                {product.addon_options!.map(option => {
                                    const isSelected = !!selectedOptions[option.id];
                                    const quantity = selectedOptions[option.id] || 0;

                                    return (
                                        <div
                                            key={option.id}
                                            className={`flex items-center justify-between p-4 rounded-3xl border-2 transition-all ${isSelected ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-900/10' : 'border-gray-100 dark:border-gray-800'}`}
                                        >
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900 dark:text-white">{option.name}</p>
                                                <p className="text-sm font-black text-brand-600">
                                                    + R$ {option.price.toFixed(2).replace('.', ',')}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-2xl p-1 shadow-sm border border-gray-100 dark:border-gray-700">
                                                <button
                                                    onClick={() => handleUpdateQuantity(option.id, -1, false)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Minus className="w-4 h-4" />
                                                </button>
                                                <span className="w-4 text-center font-bold text-sm dark:text-white">{quantity}</span>
                                                <button
                                                    onClick={() => handleUpdateQuantity(option.id, 1, false)}
                                                    className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-brand-500 hover:scale-110 transition-all"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                    <Button
                        fullWidth
                        size="lg"
                        onClick={handleConfirm}
                        disabled={!isGroupValid}
                        className="rounded-2xl py-4 font-black tracking-tight shadow-xl shadow-brand-500/20"
                    >
                        Confirmar
                    </Button>
                    {!isGroupValid && addonGroup && (
                        <p className="text-[10px] text-center text-red-500 font-bold uppercase tracking-widest mt-3">
                            {groupSelectedCount < addonGroup.min ? `Selecione pelo menos ${addonGroup.min} item(s) do grupo ${addonGroup.name}` : `Máximo de ${addonGroup.max} item(s) no grupo atingido`}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};
