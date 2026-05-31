import React, { useState, useEffect } from 'react';
import { Lock, Crown, ChevronRight, Zap, Loader2, Check, CheckCircle } from 'lucide-react';
import { UserRole } from '../types';
import * as cloud from '../services/cloud';
import { SuperStoreModal } from './SuperStoreModal';
import { Skeleton } from './Skeleton';
import { Button } from './Button';

interface ExclusiveLockProps {
    title: string;
    description: string;
    features?: string[];
    onAction?: () => void;
    actionLabel?: string;
}

export const ExclusiveLock: React.FC<ExclusiveLockProps> = ({ title, description, features, onAction, actionLabel }) => {
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const role = await cloud.getUserRole();
                setUserRole(role);

                if (role === 'store_partner') {
                    const profile = await cloud.getMyPartnerProfile();
                    setIsSuperStore(profile?.is_super_store || false);
                }
            } catch (error) {
                // console.error("Error fetching user data for lock screen:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUserData();
    }, []);

    const handleNavigateToPartner = () => {
        if (onAction) {
            onAction();
            return;
        }
        if (window.location.pathname.includes('/gestor') || window.location.pathname.includes('/loja/gestor')) {
            window.open(`${window.location.origin}/loja/planos`, '_blank');
        } else {
            const event = new CustomEvent('navigateToTab', { detail: { tab: 'upgrade_to_partner' } });
            window.dispatchEvent(event);
        }
    };

    const handleUpgradeClick = () => {
        setShowUpgradeModal(true);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-4 min-h-[60vh]">
                <Skeleton className="h-48 w-full max-w-lg rounded-3xl" />
            </div>
        );
    }

    // Renderiza o bloqueio com features customizadas se fornecidas
    if (features && features.length > 0) {
        return (
            <div className="flex flex-col items-center justify-center p-4 min-h-[60vh]">
                <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-gray-100 dark:border-gray-700 text-center">
                    <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-600 dark:text-brand-400">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h3 className="font-black text-2xl text-gray-900 dark:text-white mb-3">{title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed">{description}</p>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 mb-8 text-left space-y-3">
                        {features.map((feature, i) => (
                            <div key={i} className="flex items-start gap-3">
                                <div className="mt-1 bg-green-100 dark:bg-green-900/30 p-1 rounded-full text-green-600 dark:text-green-400">
                                    <Check className="w-3 h-3" />
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{feature}</span>
                            </div>
                        ))}
                    </div>

                    <Button size="lg" fullWidth onClick={handleNavigateToPartner} className="shadow-brand-glow">
                        {actionLabel || 'Liberar Acesso Agora'} <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                </div>
            </div>
        );
    }

    // Renderiza o bloqueio para lojista normal (Legacy)
    if (userRole === 'store_partner' && !isSuperStore) {
        return (
            <>
                <div className="flex flex-col items-center justify-center p-4 min-h-[60vh]">
                    <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-xl text-yellow-500">
                                <Crown className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">{title}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
                            </div>
                        </div>
                        <Button size="sm" fullWidth onClick={handleUpgradeClick} className="mt-4">
                            <Crown className="w-4 h-4 mr-2" /> Virar SuperLojista
                        </Button>
                    </div>
                </div>
                {showUpgradeModal && <SuperStoreModal onClose={() => setShowUpgradeModal(false)} onSuccess={() => window.location.reload()} />}
            </>
        );
    }

    // Renderiza o bloqueio para entregador normal (Novo Design)
    if (userRole === 'delivery_person') {
        return (
            <div className="flex flex-col items-center justify-center p-4 min-h-[70vh] animate-in fade-in duration-700">
                <div className="w-full max-w-xl bg-white dark:bg-gray-800 p-8 md:p-12 rounded-[48px] shadow-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Zap className="w-64 h-64 rotate-12" />
                    </div>

                    <div className="relative z-10 text-center">
                        <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/30 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                            <Zap className="w-10 h-10 text-brand-500 animate-bounce-slow" />
                        </div>

                        <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">
                            {title || "Funcionalidade Restrita"}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed font-medium">
                            {description || "Para acessar esta e outras ferramentas exclusivas, você precisa se tornar um Parceiro Verificado."}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10 text-left">
                            {[
                                { title: "Mais Pedidos", desc: "Prioridade na fila de chamadas." },
                                { title: "Ganhos Extras", desc: "Acesso a bônus de performance." }
                            ].map((b, i) => (
                                <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-100 dark:border-gray-700">
                                    <div className="p-2 bg-brand-50 dark:bg-brand-900/40 rounded-xl text-brand-500">
                                        <CheckCircle className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-xs text-gray-900 dark:text-white">{b.title}</h4>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            variant="primary"
                            className="w-full h-16 !rounded-3xl font-black text-lg shadow-xl shadow-brand-500/20 transform transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={handleNavigateToPartner}
                        >
                            <Zap className="w-5 h-5 mr-3" /> Quero ser Parceiro
                        </Button>

                        <p className="mt-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest">Verificação rápida em até 24h</p>
                    </div>
                </div>
            </div>
        );
    }

    // Para outros casos (incluindo usuários não afetados), não renderiza nada.
    // O componente pai é responsável por mostrar o conteúdo real em vez deste bloqueio.
    return null;
};
