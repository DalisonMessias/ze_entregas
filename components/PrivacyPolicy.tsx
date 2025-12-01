import React from 'react';
import { Shield, X } from 'lucide-react';

interface ModalProps {
    onClose: () => void;
}

export const PrivacyPolicy: React.FC<ModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl p-6 sm:p-10 animate-in zoom-in-95 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <h3 className="font-bold text-2xl dark:text-white flex items-center gap-3">
                        <Shield className="w-7 h-7 text-brand-500" /> Política de Privacidade
                    </h3>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X/></button>
                </div>
                <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none space-y-4 text-gray-600 dark:text-gray-300 overflow-y-auto pr-4">
                    <h4 className="font-bold text-base text-gray-900 dark:text-white">Coleta de Informações</h4>
                    <p>Coletamos informações que você nos fornece diretamente ao se cadastrar, como nome, e-mail e telefone. Também coletamos dados de uso do aplicativo para melhorar nossos serviços.</p>
                    
                    <h4 className="font-bold text-base text-gray-900 dark:text-white">Uso das Informações</h4>
                    <p>Usamos suas informações para operar, manter e melhorar nossos serviços, para nos comunicarmos com você e para fins de segurança.</p>
                    
                    <h4 className="font-bold text-base text-gray-900 dark:text-white">Compartilhamento de Informações</h4>
                    <p>Não compartilhamos suas informações pessoais com terceiros, exceto para cumprir a lei ou proteger nossos direitos.</p>

                    <h4 className="font-bold text-base text-gray-900 dark:text-white">Cookies</h4>
                    <p>Utilizamos cookies essenciais para o funcionamento do site e, opcionalmente, cookies para análise e desempenho. Você pode gerenciar suas preferências de cookies a qualquer momento.</p>
                    
                    <p className="italic text-xs text-gray-400">Este é um documento de exemplo. Consulte um profissional jurídico para criar sua própria política de privacidade.</p>
                </div>
            </div>
        </div>
    );
};
