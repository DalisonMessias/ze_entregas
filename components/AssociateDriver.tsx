
import React, { useState, useEffect } from 'react';
import { UserCheck, Copy, Share2, Store, Loader2, Bike, CheckCircle, ArrowRight, X } from 'lucide-react';
import * as cloud from '../services/cloud';
import { PartnerProfile, UserRole } from '../types';
import { Button } from './Button';

interface AssociateDriverProps {
    userRole?: UserRole;
}

export const AssociateDriver: React.FC<AssociateDriverProps> = ({ userRole = 'user' }) => {
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [associatedStores, setAssociatedStores] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Upgrade State
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgrading, setUpgrading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Ensure profile is loaded (and code generated via cloud logic if missing)
                const p = await cloud.getMyPartnerProfile();
                setProfile(p);
                
                const s = await cloud.getPartnerAssociatedStores();
                setAssociatedStores(s);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const copyCode = () => {
        if (profile?.association_code) {
            navigator.clipboard.writeText(profile.association_code);
            alert("Código copiado!");
        }
    };

    const handleShareCode = () => {
        if (!profile?.association_code) return;
        const text = `Olá! Sou entregador do Zé Entregas.\nMeu código de associação é: *${profile.association_code}*\n\nMe adicione na sua equipe para enviarmos pedidos!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleUpgradeToPartner = async () => {
        setUpgrading(true);
        try {
            await cloud.becomeDeliveryPartner();
            // Force reload to update app state and redirect to new role dashboard
            window.location.reload();
        } catch (e: any) {
            alert("Erro ao atualizar perfil: " + e.message);
            setUpgrading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-10">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600"/>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in pb-20 relative">
            <div className="flex items-center gap-2 mb-2">
                <UserCheck className="w-6 h-6 text-brand-600" />
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Entregador Associado</h2>
            </div>

            <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-3xl p-8 text-white shadow-xl text-center relative overflow-hidden">
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
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 px-2 flex items-center gap-2">
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

            {/* Banner Convite para Usuário Normal */}
            {userRole === 'user' && (
                <div 
                    onClick={() => setShowUpgradeModal(true)}
                    className="fixed bottom-20 left-4 right-4 bg-gray-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between cursor-pointer hover:scale-[1.02] transition-transform z-40 border border-gray-700"
                >
                    <div className="flex items-center gap-4">
                        <div className="bg-brand-600 p-3 rounded-full animate-pulse">
                            <Bike className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="font-black text-lg leading-tight">Quer fazer entregas?</p>
                            <p className="text-xs text-gray-400">Comece a ganhar dinheiro hoje.</p>
                        </div>
                    </div>
                    <ArrowRight className="w-6 h-6 text-brand-500" />
                </div>
            )}

            {/* Modal de Conversão */}
            {showUpgradeModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative overflow-hidden">
                        <button 
                            onClick={() => setShowUpgradeModal(false)} 
                            className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>

                        <div className="text-center mb-6 pt-4">
                            <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600">
                                <Bike className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                                Como funciona ser um entregador parceiro
                            </h2>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-600 dark:text-gray-300">Receba solicitações de entrega diretamente no app.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-600 dark:text-gray-300">Tenha acesso à Carteira Digital e saques rápidos.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-600 dark:text-gray-300">Participe do Clube de Benefícios e níveis VIP.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-600 dark:text-gray-300">Total liberdade para aceitar ou recusar corridas.</p>
                            </div>
                        </div>

                        <Button 
                            fullWidth 
                            onClick={handleUpgradeToPartner} 
                            disabled={upgrading}
                            className="py-4 text-lg shadow-xl shadow-brand-500/20"
                        >
                            {upgrading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Quero ser Entregador Parceiro'}
                        </Button>
                        <p className="text-center text-xs text-gray-400 mt-4">Ao confirmar, seu perfil será atualizado imediatamente.</p>
                    </div>
                </div>
            )}
        </div>
    );
};
