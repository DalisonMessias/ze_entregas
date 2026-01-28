import React from 'react';
import { Truck, Info, X } from 'lucide-react';
import { BaseModal } from '../BaseModal';
import { StoreShippingRule } from '../../types';

interface ShippingRulesModalProps {
    isOpen: boolean;
    onClose: () => void;
    rules: StoreShippingRule[];
}

export const ShippingRulesModal: React.FC<ShippingRulesModalProps> = ({ isOpen, onClose, rules }) => {
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Normas de Entrega"
            icon={<Truck className="w-6 h-6 text-brand-600" />}
        >
            <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex gap-3 text-blue-700 dark:text-blue-300 text-sm">
                    <Info className="w-5 h-5 flex-shrink-0" />
                    <p>Condições especiais de frete oferecidas por esta loja:</p>
                </div>

                <div className="space-y-3">
                    {rules.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">Nenhuma regra específica cadastrada no momento.</p>
                    ) : (
                        rules.map(rule => (
                            <div key={rule.id} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">
                                        {rule.rule_type === 'free_above' ? 'Frete Grátis' : 'Taxa de Entrega'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {rule.rule_type === 'free_above'
                                            ? `Para pedidos acima de R$ ${rule.threshold?.toFixed(2).replace('.', ',')}`
                                            : `Valor fixo de R$ ${rule.value.toFixed(2).replace('.', ',')}`
                                        }
                                    </p>
                                </div>
                                <div className="text-brand-600 font-bold text-sm bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full">
                                    Ativo
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button
                    onClick={onClose}
                    className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                    Entendido
                </button>
            </div>
        </BaseModal>
    );
};
