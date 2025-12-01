
import React, { useState } from 'react';
import { Settings, X } from 'lucide-react';
import { Button } from './Button';
import * as storage from '../services/storage';
import { CookiePreferences } from '../types';
import { Switch } from './Switch';

interface ModalProps {
    onClose: () => void;
}

export const CookiePreferencesModal: React.FC<ModalProps> = ({ onClose }) => {
    const [cookiePrefs, setCookiePrefs] = useState<CookiePreferences>(() => storage.getCookiePreferences());

    const handleSaveCookiePrefs = () => {
        storage.saveCookiePreferences(cookiePrefs);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2"><Settings className="w-5 h-5" /> Preferências de Cookies</h3>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"><X/></button>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Gerencie suas preferências. Alguns cookies são essenciais para o funcionamento do app e não podem ser desativados.</p>
                
                <div className="space-y-4 overflow-y-auto pr-2">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <Switch checked={true} onChange={() => {}} disabled={true} label="Cookies Essenciais"/>
                        <p className="text-xs text-gray-400 mt-1 ml-14">Necessários para o funcionamento básico e segurança.</p>
                    </div>
                     <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <Switch checked={cookiePrefs.functionality} onChange={c => setCookiePrefs(p => ({...p, functionality: c}))} label="Funcionalidade"/>
                        <p className="text-xs text-gray-400 mt-1 ml-14">Lembram suas preferências, como tema e idioma.</p>
                    </div>
                     <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <Switch checked={cookiePrefs.analytics} onChange={c => setCookiePrefs(p => ({...p, analytics: c}))} label="Análise"/>
                        <p className="text-xs text-gray-400 mt-1 ml-14">Ajudam a entender como o app é usado (anônimo).</p>
                    </div>
                     <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <Switch checked={cookiePrefs.performance} onChange={c => setCookiePrefs(p => ({...p, performance: c}))} label="Desempenho"/>
                        <p className="text-xs text-gray-400 mt-1 ml-14">Otimizam a velocidade e responsividade do app.</p>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    <Button variant="outline" fullWidth onClick={onClose}>Fechar</Button>
                    <Button fullWidth onClick={handleSaveCookiePrefs}>Salvar Preferências</Button>
                </div>
            </div>
        </div>
    );
};
