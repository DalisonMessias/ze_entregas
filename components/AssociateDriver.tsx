import React, { useState, useEffect } from 'react';
import { UserCheck, Copy, Share2, Store, Loader2, ArrowLeft } from 'lucide-react';
import * as cloud from '../services/cloud';
import { PartnerProfile } from '../types';
import { useDialog } from '../utils/dialogService';

interface AssociateDriverProps {
    onBack?: () => void;
}

export const AssociateDriver: React.FC<AssociateDriverProps> = ({ onBack }) => {
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [associatedStores, setAssociatedStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { alert } = useDialog();

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                // Parallelize data fetching
                const [p, s] = await Promise.all([
                    cloud.getMyPartnerProfile(),
                    cloud.getPartnerAssociatedStores()
                ]);
                
                setProfile(p);
                setAssociatedStores(s);
            } catch (e: any) {
                console.error("Failed to load associated stores:", e);
                setError("Não foi possível carregar as lojas vinculadas. Tente novamente mais tarde.");
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const copyCode = () => {
        if (profile?.association_code) {
            navigator.clipboard.writeText(profile.association_code);
            void alert({ title: 'Código', message: 'Código copiado!' });
        }
    };

    const handleShareCode = () => {
        if (!profile?.association_code) return;
        const text = `Olá! Sou entregador do Zé Entregas.\nMeu código de associação é: *${profile.association_code}*\n\nMe adicione na sua equipe para enviarmos pedidos!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600"/>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-center bg-red-50 dark:bg-red-900/20 rounded-2xl">
                <p className="font-bold text-red-600 dark:text-red-300 mb-2">Ocorreu um Erro</p>
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            {onBack && (
                <button 
                    onClick={onBack} 
                    className="flex items-center text-sm font-bold text-gray-500 hover:text-brand-600 mb-2 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
                </button>
            )}

            <div className="flex items-center gap-2 p-4">
                <UserCheck className="w-6 h-6 text-brand-600" />
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Entregador Associado</h2>
            </div>

            <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl p-8 text-white text-center relative overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <UserCheck className="w-32 h-32 text-white rotate-12" />
                </div>

                <p className="text-brand-100 text-sm font-bold uppercase mb-4 tracking-wider">Seu Código Exclusivo</p>
                
                <div className="bg-white/20 p-4 rounded-2xl mb-6 backdrop-blur-sm border border-white/20 inline-block w-full max-w-xs">
                    <h2 className="text-4xl font-black tracking-widest font-mono">{profile?.association_code || '---'}</h2>
                </div>
                
                <p className="text-sm text-white/90 mb-6 max-w-sm mx-auto leading-relaxed">
                    Envie este código para o lojista. Assim que ele inserir no sistema, vocês estarão conectados para entregas exclusivas.
                </p>
                
                <div className="flex justify-center gap-3">
                    <button onClick={copyCode} className="bg-white text-brand-700 px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-gray-50 transition-colors">
                        <Copy className="w-4 h-4"/> Copiar
                    </button>
                    <button onClick={handleShareCode} className="bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-green-400 transition-colors">
                        <Share2 className="w-4 h-4"/> Enviar no Zap
                    </button>
                </div>
            </div>

            <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 mt-4 px-2 flex items-center gap-2">
                    <Store className="w-4 h-4" /> Lojas Vinculadas
                </h3>
                {associatedStores.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                        <Store className="w-10 h-10 text-gray-300 mx-auto mb-2"/>
                        <p className="text-sm text-gray-400">Você ainda não está vinculado a nenhuma loja.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {associatedStores.map(store => (
                            <div key={store.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{store.store_name}</p>
                                    <p className="text-xs text-gray-500">{store.city}</p>
                                </div>
                                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                                    Ativo
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};