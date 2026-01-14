import React from 'react';
import { X, MapPin, Share2, Copy, Target } from 'lucide-react';
import { Button } from './Button';

interface LocationHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const LocationHelpModal: React.FC<LocationHelpModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl scale-in-center">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold dark:text-white flex items-center gap-2">
                        <MapPin className="w-6 h-6 text-brand-500" />
                        Como usar a Localização?
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">

                    {/* Opção 1: Google Maps */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                            Pelo Google Maps
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-sm space-y-2 text-gray-600 dark:text-gray-300">
                            <p>Abra o local no Google Maps e copie o link de compartilhamento.</p>
                            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                <Share2 className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-blue-500">https://maps.app.goo.gl/...</span>
                            </div>
                        </div>
                    </div>

                    {/* Opção 2: WhatsApp */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">2</span>
                            Pelo WhatsApp
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl text-sm space-y-2 text-gray-600 dark:text-gray-300">
                            <p>Se o cliente mandou a localização atual:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-1">
                                <li>Toque na localização para abrir o mapa.</li>
                                <li>Procure as coordenadas (ex: -12.345, -45.678).</li>
                                <li>Ou copie o link "Ver no Google Maps".</li>
                            </ol>
                        </div>
                    </div>


                    {/* Opção 3: Precisão */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs">3</span>
                            Garanta a Precisão!
                        </h3>
                        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl text-sm space-y-2 text-gray-700 dark:text-gray-300 border border-orange-100 dark:border-orange-800">
                            <div className="flex items-start gap-3">
                                <Target className="w-10 h-10 text-orange-500 shrink-0 mt-1" />
                                <div>
                                    <p className="font-bold text-orange-800 dark:text-orange-200 mb-1">Não use apenas a "Localização Atual"!</p>
                                    <p>O GPS pode errar por alguns metros. Antes de compartilhar:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                                        <li>Abra o mapa em tela cheia.</li>
                                        <li>Dê zoom até ver as casas.</li>
                                        <li><strong>Arraste o pino</strong> exatamente para cima do seu portão ou entrada.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dica Extra */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800">
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 flex gap-2">
                            💡 <strong>Dica:</strong> Basta colar o link ou as coordenadas no campo e clicar em "Calcular". O sistema identifica automaticamente!
                        </p>
                    </div>

                </div>

                <div className="p-6 pt-2">
                    <Button onClick={onClose} className="w-full py-6 text-lg font-bold">
                        Entendi, vamos lá!
                    </Button>
                </div>
            </div>
        </div>
    );
};
