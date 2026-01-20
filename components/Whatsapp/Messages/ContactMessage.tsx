import React from 'react';
import { User, MessageSquare } from 'lucide-react';

interface ContactMessageProps {
    name: string;
    phone: string;
}

export const ContactMessage: React.FC<ContactMessageProps> = ({ name, phone }) => {
    return (
        <div className="min-w-[280px] bg-[#f0f2f5] dark:bg-gray-700 rounded-lg overflow-hidden border-l-4 border-green-500">
            <div className="p-3 bg-opacity-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-white overflow-hidden">
                    <User size={24} className="text-gray-500 dark:text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">{name}</h3>
                    {/* Não mostramos o número diretamente no card visual do whats geralmente, mas aqui ajuda */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{phone}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2 border-t border-gray-200 dark:border-gray-600 flex items-center justify-center">
                <button className="w-full py-1.5 text-green-600 dark:text-green-400 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors uppercase tracking-wide">
                    Conversar
                </button>
            </div>
        </div>
    );
};
