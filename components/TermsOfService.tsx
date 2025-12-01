import React from 'react';
import { FileText, X } from 'lucide-react';

interface ModalProps {
    onClose: () => void;
}

export const TermsOfService: React.FC<ModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 sm:p-10 animate-in zoom-in-95 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <h3 className="font-bold text-2xl dark:text-white flex items-center gap-3">
                        <FileText className="w-7 h-7 text-brand-500" /> Termos de Uso
                    </h3>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X/></button>
                </div>
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-4 text-gray-600 dark:text-gray-300 overflow-y-auto pr-4">
                    <h4 className="font-bold text-base text-gray-900 dark:text-white">1. Aceitação dos Termos</h4>
                    <p>Ao acessar e usar o aplicativo Zé Entregas, você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis. Se você não concorda com algum destes termos, está proibido de usar ou acessar este site.</p>
                    
                    <h4 className="font-bold text-base text-gray-900 dark:text-white">2. Uso da Licença</h4>
                    <p>É concedida permissão para baixar temporariamente uma cópia dos materiais (informações ou software) no aplicativo Zé Entregas, apenas para visualização transitória pessoal e não comercial. Esta é a concessão de uma licença, não uma transferência de título...</p>
                    
                    <h4 className="font-bold text-base text-gray-900 dark:text-white">3. Isenção de Responsabilidade</h4>
                    <p>Os materiais no aplicativo Zé Entregas são fornecidos 'como estão'. O Zé Entregas não oferece garantias, expressas ou implícitas, e, por este meio, isenta e nega todas as outras garantias...</p>
                    
                    <p className="italic text-xs text-gray-400">Este é um documento de exemplo. Consulte um profissional jurídico para criar seus próprios termos de serviço.</p>
                </div>
            </div>
        </div>
    );
};
