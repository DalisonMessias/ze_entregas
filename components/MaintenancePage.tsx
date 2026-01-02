
import React from 'react';
import { Wrench, Clock, Info } from 'lucide-react';
import { MaintenanceSettings } from '../types';
import { Logo } from './Logo';

interface MaintenancePageProps {
    settings: MaintenanceSettings;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ settings }) => {
    // Format times for display
    const formatTime = (timeStr: string) => {
        if (!timeStr) return '--:--';
        // Handle ISO or simple time
        if (timeStr.includes('T')) {
            return new Date(timeStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
        return timeStr;
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-[32px] p-8 shadow-2xl text-center border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ed2b05 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
                        <Wrench className="w-10 h-10 text-orange-600 dark:text-orange-400" />
                    </div>

                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Estamos em Manutenção</h1>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
                        {settings.message || "Estamos realizando melhorias no sistema para oferecer um serviço ainda melhor."}
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl w-full border border-gray-100 dark:border-gray-700 mb-8">
                        <div className="flex items-center justify-between text-sm mb-2">
                            <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4"/> Início:
                            </span>
                            <span className="font-bold text-gray-900 dark:text-white">{formatTime(settings.start_time)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                                <Clock className="w-4 h-4"/> Previsão de Retorno:
                            </span>
                            <span className="font-bold text-green-600 dark:text-green-400">{formatTime(settings.end_time)}</span>
                        </div>
                    </div>

                    <Logo className="h-6 w-auto text-gray-400 dark:text-gray-600" />
                </div>
            </div>
            
            <div className="mt-8 text-center text-xs text-gray-400 max-w-sm">
                <Info className="w-3 h-3 inline mr-1" />
                Agradecemos a compreensão. O sistema voltará automaticamente assim que a manutenção for concluída.
            </div>
        </div>
    );
};