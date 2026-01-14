
import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Plus, Loader2, Copy, ExternalLink, X, AlertTriangle, MapPin, Star, MessageCircle, Crown, ChevronRight, Truck, Send, Users, BarChart3, Megaphone, History, Settings, CreditCard, Headphones, ShoppingBag, Search, FileText, Landmark, UploadCloud, Banknote } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { DataErrorDisplay } from './DataErrorDisplay';
import * as cloud from '../services/cloud';
import { StoreWallet, WalletTransaction, PartnerRequest, PartnerRequestStatus, PartnerFeeSettings } from '../types';
import { LiveTrackingMap } from './LiveTrackingMap';
import { RatingModal } from './RatingModal';
import { ChatWindow } from './ChatWindow';
import { SuperStoreModal } from './SuperStoreModal';
import { Skeleton } from './Skeleton';
import { PromoSlider } from './PromoSlider';
import { useDialog } from '../utils/dialogService';
import { TipOfTheDay } from './TipOfTheDay';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';

declare const QRious: any;

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const getStatusChip = (status: PartnerRequestStatus) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-bold";
    switch (status) {
        case 'PENDING': return <span className={`${baseClasses} bg-yellow-100 text-yellow-700`}>Pendente</span>;
        case 'ACCEPTED':
        case 'IN_TRANSIT': return <span className={`${baseClasses} bg-blue-100 text-blue-700`}>{status === 'ACCEPTED' ? 'Aceito' : 'Em Trânsito'}</span>;
        case 'AWAITING_STORE_DECISION': return <span className={`${baseClasses} bg-orange-100 text-orange-700 animate-pulse`}>Atenção</span>;
        case 'RETURNING': return <span className={`${baseClasses} bg-purple-100 text-purple-700`}>Devolvendo</span>;
        case 'COMPLETED': return <span className={`${baseClasses} bg-green-100 text-green-700`}>Concluído</span>;
        case 'CANCELLED':
        case 'EXPIRED': return <span className={`${baseClasses} bg-red-100 text-red-700`}>{status === 'CANCELLED' ? 'Cancelado' : 'Expirado'}</span>;
        default: return <span className={`${baseClasses} bg-gray-100 text-gray-500`}>{status}</span>;
    }
};

const RechargeModal = ({ onClose, onRecharge }: { onClose: () => void, onRecharge: (amount: number, method: 'PIX') => Promise<any> }) => {
    const [amount, setAmount] = useState('');
    const [processing, setProcessing] = useState(false);
    const [pixDetails, setPixDetails] = useState<{ copyPaste: string } | null>(null);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);
    const { alert } = useDialog();

    useEffect(() => {
        if (pixDetails?.copyPaste && qrCanvasRef.current) {
            new QRious({ element: qrCanvasRef.current, value: pixDetails.copyPaste, size: 200, level: 'H' });
        }
    }, [pixDetails]);

    const handleGeneratePix = async () => {
        const value = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        if (!value || value <= 0) {
            await alert({ title: "Valor Inválido", message: "Valor inválido." });
            return;
        }
        setProcessing(true);
        try {

        } catch (e: any) {
            await alert({ title: "Erro ao Gerar PIX", message: "Erro: " + e.message });
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold text-lg dark:text-white mb-4">Adicionar Saldo</h3>
                {pixDetails ? (
                    <div className="text-center space-y-4">
                        <p className="text-xs text-gray-500">Escaneie ou copie o código para pagar.</p>
                        <canvas ref={qrCanvasRef} className="mx-auto border-4 border-gray-100 rounded-lg" />
                        <div className="relative">
                            <CustomInput readOnly value={pixDetails.copyPaste} className="text-xs truncate" />
                            <button onClick={() => navigator.clipboard.writeText(pixDetails.copyPaste)} className="absolute right-2 top-2 p-1"><Copy className="w-4 h-4" /></button>
                        </div>
                        <p className="text-xs text-green-600 font-bold">Após o pagamento, o saldo será creditado automaticamente.</p>
                        <Button variant="outline" onClick={onClose}>Fechar</Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <CustomInput mask="currency" value={amount} onChange={e => setAmount(e.target.value)} className="font-bold text-xl text-center" placeholder="R$ 0,00" autoFocus />
                        <Button fullWidth onClick={handleGeneratePix} disabled={processing}>{processing ? <Loader2 className="animate-spin" /> : 'Gerar Cobrança PIX'}</Button>
                    </div>
                )}
            </div>
        </div>
    );
};

const WalletSkeleton = () => (
    <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-40 w-full" />
    </div>
);

// Main Component - acts as StoreWalletModule
const StoreWalletModule = ({ onNavigate }: { onNavigate?: (tab: any) => void }) => {
    const [wallet, setWallet] = useState<StoreWallet | null>(null);
    const [requests, setRequests] = useState<PartnerRequest[]>([]);
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [innerTab, setInnerTab] = useState<'requests'>('requests');
    const [showRecharge, setShowRecharge] = useState(false);
    const [showTracking, setShowTracking] = useState<string | null>(null);
    const [ratingRequest, setRatingRequest] = useState<PartnerRequest | null>(null);
    const [showChat, setShowChat] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    // Profile Validation State
    const [profileValid, setProfileValid] = useState<boolean | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    // Shortcuts state
    const [searchShortcut, setSearchShortcut] = useState('');
    const [activeShortcutSection, setActiveShortcutSection] = useState<'principais' | 'frequentes' | 'links'>('principais');
    const [favoriteShortcuts, setFavoriteShortcuts] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem('store_shortcuts_fav');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });
    const [editShortcuts, setEditShortcuts] = useState(false);

    const [loadingWallet, setLoadingWallet] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(true);
    const [errorWallet, setErrorWallet] = useState<string | null>(null);

    const { alert, confirm } = useDialog();

    useEffect(() => {
        try {
            localStorage.setItem('store_shortcuts_fav', JSON.stringify(favoriteShortcuts));
        } catch { }
    }, [favoriteShortcuts]);

    const fetchWallet = async () => {
        setLoadingWallet(true);
        setErrorWallet(null);
        try {
            const data = await cloud.getMyWallet();
            setWallet(data);
        } catch (e) {
            console.error('[StoreWallet] Error fetching wallet:', e);
            setErrorWallet('Falha ao carregar saldo.');
        } finally {
            setLoadingWallet(false);
        }
    };

    const fetchRequests = async () => {
        setLoadingRequests(true);
        try {
            const data = await cloud.getStoreRequests();
            setRequests(data);
        } catch (e) {
            console.error('[StoreWallet] Error fetching requests:', e);
        } finally {
            setLoadingRequests(false);
        }
    };

    const fetchOtherData = async () => {
        try {
            const [feesData, profileData] = await Promise.all([
                cloud.getPublicFeeSettings().catch(() => null),
                cloud.getMyPartnerProfile().catch(() => null)
            ]);
            if (feesData) setFees(feesData);
            if (profileData) {
                setIsSuperStore(profileData?.is_super_store || false);
                // Validar perfil completo
                const validation = validateStoreProfile(profileData);
                setProfileValid(validation.isValid);
                setMissingFields(validation.missingFields);
            } else {
                setProfileValid(false);
                setMissingFields(['Perfil não encontrado']);
            }
        } catch (e) {
            console.error('[StoreWallet] Error fetching common data:', e);
        }
    };

    useEffect(() => {
        fetchWallet();
        fetchRequests();
        fetchOtherData();

        // Setup polling
        const interval = setInterval(() => {
            // Silently refresh requests and wallet
            cloud.getStoreRequests().then(setRequests).catch(console.error);
            cloud.getMyWallet().then(setWallet).catch(console.error);
        }, 15000);
        return () => clearInterval(interval);
    }, []);

    const loadAllData = () => {
        fetchWallet();
        fetchRequests();
        fetchOtherData();
    };

    // const handleRecharge = (amount: number, method: 'PIX') => cloud.createRechargeCharge(amount, method);

    const handleDecision = async (id: string, decision: 'RETURN' | 'DISCARD') => {
        const confirmed = await confirm({
            title: "Confirmar Decisão",
            message: decision === 'RETURN' ? "O item será devolvido à loja?" : "O entregador pode ficar/descartar?"
        });
        if (!confirmed) return;

        try {
            await cloud.storeDecideFailedDelivery(id, decision);
            await alert({ title: "Decisão Registrada", message: "Decisão registrada. O entregador foi notificado." });
            loadAllData();
        } catch (e: any) { await alert({ title: "Erro", message: "Erro: " + e.message }); }
    };

    const handleRatePartner = async (rating: number, comment: string) => {
        if (!ratingRequest) return;
        try {
            await cloud.submitRating(ratingRequest.id, rating, comment, 'STORE_TO_PARTNER');
            await alert({ title: "Avaliação Enviada", message: "Obrigado pela avaliação!" });
            setRatingRequest(null);
            loadAllData();
        } catch (e: any) { await alert({ title: "Erro", message: "Erro: " + e.message }); }
    };

    const handleShareWhatsApp = (req: PartnerRequest) => {
        const text = `📦 *Nova Solicitação de Entrega*\n🆔 Pedido: #${req.id.substring(0, 6)}\n\n📍 *Retirada:* ${req.pickup_address}\n🏁 *Entrega:* ${req.delivery_address}\n💰 *Valor para você:* ${formatCurrency(req.net_value_partner)}\n\nAbra o App Zé Entregas para aceitar!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loadingWallet && !wallet) return <WalletSkeleton />;

    // Validação de perfil - redirecionar para configurações se perfil incompleto
    if (profileValid === false) {
        return (
            <ProfileValidationAlert
                onNavigateToSettings={() => onNavigate && onNavigate('store_settings')}
                missingFields={missingFields}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            {errorWallet && (
                <DataErrorDisplay
                    title="Erro na Carteira"
                    message={errorWallet}
                    onRetry={fetchWallet}
                />
            )}



            {!isSuperStore && fees && (
                <div
                    onClick={() => setShowUpgradeModal(true)}
                    className="relative overflow-hidden bg-gradient-to-r from-yellow-400 to-orange-500 p-4 rounded-2xl shadow-lg cursor-pointer transform hover:scale-[1.01] transition-transform"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <Crown className="w-24 h-24 text-white rotate-12" />
                    </div>
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="text-white">
                            <div className="flex items-center gap-2 mb-1">
                                <Crown className="w-5 h-5 fill-current" />
                                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-lg">Novo</span>
                            </div>
                            <h3 className="font-black text-xl leading-tight">Seja Super Lojista!</h3>
                            <p className="text-xs text-yellow-100 mt-1 max-w-[200px]">
                                Apenas {formatCurrency(fees.super_store_monthly_fee || 0)}/mês. Cancele quando quiser.
                            </p>
                        </div>
                        <div className="bg-white text-orange-600 p-2 rounded-full shadow-md animate-pulse">
                            <ChevronRight className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                <PromoSlider audience="merchants" />
                <TipOfTheDay role="store_partner" />
                {/* Main Balance Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-6 rounded-[32px] shadow-2xl shadow-gray-900/20 relative overflow-hidden">
                    <div className="absolute -right-16 -top-10 opacity-10"><Wallet className="w-48 h-48" /></div>
                    <div className="relative z-10">
                        <p className="text-gray-400 text-sm font-medium">Meu Saldo</p>
                        <h2 className={`text-4xl font-black ${wallet && wallet.balance_decimal < 0 ? 'text-red-400' : 'text-white'}`}>{formatCurrency(wallet?.balance_decimal || 0)}</h2>
                        {wallet && wallet.balance_decimal < 10 && (
                            <div className="mt-2 bg-red-500/80 backdrop-blur-sm text-white text-xs font-bold p-2 rounded-lg flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" /> Saldo baixo. Recarregue para pedir.
                            </div>
                        )}
                        <Button onClick={() => onNavigate && onNavigate('zepay_store')} className="mt-6 bg-white/10 text-white hover:bg-white/20 border-none backdrop-blur-sm">
                            <Plus className="w-4 h-4 mr-2" /> Abrir ZéPay
                        </Button>
                        <div className="flex gap-3 mt-4">
                            {/* Recharge button temporarily hidden due to migration
                            <button onClick={() => setShowRecharge(true)} className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                                <Plus className="w-4 h-4" /> Recarregar
                            </button>
                            */}
                            {/* Transfer button functionality could be clearer, but keeping UI consistent */}
                        </div>
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h3 className="font-bold text-gray-800 dark:text-white text-sm">Ferramentas Rápidas</h3>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
                                <CustomInput
                                    aria-label="Buscar atalhos"
                                    value={searchShortcut}
                                    onChange={(e) => setSearchShortcut(e.target.value)}
                                    placeholder="Buscar..."
                                    className="w-40 md:w-56 pl-9 pr-3 py-2 text-xs"
                                />
                            </div>
                            <button
                                onClick={() => setEditShortcuts((v) => !v)}
                                className={`px-3 py-2 rounded-lg text-xs font-bold border ${editShortcuts ? 'bg-gray-900 text-white border-gray-900' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'}`}
                                aria-pressed={editShortcuts}
                                aria-label="Personalizar atalhos"
                            >
                                {editShortcuts ? 'Concluir' : 'Personalizar'}
                            </button>
                        </div>
                    </div>

                    <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-xl mb-3 flex">
                        <button onClick={() => setActiveShortcutSection('principais')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${activeShortcutSection === 'principais' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Principais</button>
                        <button onClick={() => setActiveShortcutSection('frequentes')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${activeShortcutSection === 'frequentes' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Frequentes</button>
                        <button onClick={() => setActiveShortcutSection('links')} className={`flex-1 py-2 rounded-lg text-xs font-bold ${activeShortcutSection === 'links' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-600 dark:text-gray-300'}`}>Links Rápidos</button>
                    </div>

                    {(() => {
                        const all: Record<string, { id: string; label: string; icon: any; tab: any; color: string }[]> = {
                            principais: [
                                { id: 'solicitar_entrega', label: 'Solicitar Entrega', icon: Truck, tab: 'new_request', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
                                { id: 'gestao_pedidos', label: 'Gestão de Pedidos', icon: History, tab: 'history', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
                                { id: 'relatorios', label: 'Relatórios', icon: BarChart3, tab: 'store_reports', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
                                { id: 'zepay', label: 'ZéPay', icon: CreditCard, tab: 'zepay_store', color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
                            ],
                            frequentes: [
                                { id: 'atualizar_estoque', label: 'Atualizar Estoque', icon: ShoppingBag, tab: 'store_product_import', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
                                { id: 'verificar_vendas', label: 'Verificar Vendas', icon: BarChart3, tab: 'store_reports', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
                                { id: 'responder_mensagens', label: 'Responder Mensagens', icon: MessageCircle, tab: 'support', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' },
                                { id: 'minha_equipe', label: 'Minha Equipe', icon: Users, tab: 'store_team', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
                            ],
                            links: [
                                { id: 'configuracoes', label: 'Configurações', icon: Settings, tab: 'store_settings', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
                                { id: 'suporte', label: 'Suporte', icon: Headphones, tab: 'support', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
                                { id: 'estatisticas', label: 'Estatísticas', icon: BarChart3, tab: 'store_reports', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
                                { id: 'integracoes', label: 'Integrações', icon: Send, tab: 'store_integrations', color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400' },
                                { id: 'loja_pecas', label: 'Loja de Peças', icon: ShoppingBag, tab: 'shop', color: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400' },
                                { id: 'pedidos_internos', label: 'Pedidos Internos', icon: FileText, tab: 'internal_orders', color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' },
                                { id: 'cadastro_manual', label: 'Cadastro Manual', icon: Plus, tab: 'internal_orders', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
                                { id: 'zebank', label: 'ZéBank', icon: Landmark, tab: 'zebank', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
                                { id: 'importar_produtos', label: 'Importar Produtos', icon: UploadCloud, tab: 'store_product_import', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
                                { id: 'painel_financeiro', label: 'Painel Financeiro', icon: Banknote, tab: 'store_finance_panel', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' },
                            ],
                        };

                        const sectionItems = all[activeShortcutSection].filter(i => i.label.toLowerCase().includes(searchShortcut.toLowerCase()));
                        const sorted = [...sectionItems].sort((a, b) => Number(favoriteShortcuts.includes(b.id)) - Number(favoriteShortcuts.includes(a.id)) || a.label.localeCompare(b.label));

                        return (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {sorted.map(item => (
                                    <div key={item.id} className="relative">
                                        {editShortcuts && (
                                            <button
                                                onClick={() => setFavoriteShortcuts(prev => prev.includes(item.id) ? prev.filter(x => x !== item.id) : [...prev, item.id])}
                                                aria-label={favoriteShortcuts.includes(item.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                                                className={`absolute right-2 top-2 z-10 p-1 rounded-full ${favoriteShortcuts.includes(item.id) ? 'bg-yellow-100 text-yellow-700' : 'bg-white/70 dark:bg-gray-800/70 text-gray-500 border border-gray-200 dark:border-gray-700'}`}
                                            >
                                                <Star className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => onNavigate && onNavigate(item.tab)}
                                            aria-label={item.label}
                                            className="flex w-full flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 transition-all hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95"
                                        >
                                            <div className={`p-3 rounded-full ${item.color}`}>
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 text-center">{item.label}</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>

                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                    <button onClick={() => setInnerTab('requests')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${innerTab === 'requests' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500'}`}>Corridas</button>
                </div>

                {innerTab === 'requests' && (
                    <div className="space-y-4">
                        {requests.length === 0 && <div className="text-center p-8 text-gray-400">Nenhum pedido ativo</div>}
                        {requests.map(req => (
                            <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                <div className="flex justify-between items-start mb-3">
                                    {getStatusChip(req.status)}
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(req.total_charged_store)}</p>
                                        <p className="text-xs text-gray-400">{req.distance_km} km</p>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 mb-2 font-mono">#{req.id.substring(0, 8)}</p>
                                <div className="space-y-2 text-sm">
                                    <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-blue-500 mt-0.5" /> <span className="font-bold">De:</span> {req.pickup_address}</p>
                                    <p className="flex items-start gap-2"><MapPin className="w-4 h-4 text-brand-500 mt-0.5" /> <span className="font-bold">Para:</span> {req.delivery_address}</p>
                                    {req.partner && <p className="flex items-start gap-2 pt-2 border-t border-gray-100"><Truck className="w-4 h-4 text-gray-400 mt-0.5" /> <span className="font-bold">Entregador:</span> {req.partner.name}</p>}
                                </div>
                                <div className="flex gap-2 mt-4">
                                    {req.status === 'IN_TRANSIT' && <Button onClick={() => setShowTracking(req.id)} fullWidth size="sm"><MapPin className="w-4 h-4 mr-2" /> Acompanhar</Button>}
                                    {req.status === 'COMPLETED' && !req.rated_by_store && <Button onClick={() => setRatingRequest(req)} fullWidth size="sm"><Star className="w-4 h-4 mr-2" /> Avaliar</Button>}
                                    {req.partner && <Button variant="outline" onClick={() => setShowChat(req.id)} fullWidth size="sm"><MessageCircle className="w-4 h-4 mr-2" /> Chat</Button>}
                                    <Button onClick={() => handleShareWhatsApp(req)} size="sm" className="bg-green-500 hover:bg-green-600 text-white"><MessageCircle className="w-4 h-4" /></Button>
                                </div>
                                {req.status === 'AWAITING_STORE_DECISION' && (
                                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg mt-3">
                                        <p className="text-sm font-bold text-orange-600">Ação Necessária</p>
                                        <p className="text-xs text-orange-500 mb-3">O entregador reportou: <span className="italic">"{req.failure_reason}"</span></p>
                                        <div className="flex gap-2"><Button size="sm" onClick={() => handleDecision(req.id, 'RETURN')}>Pedir Devolução</Button><Button size="sm" variant="danger" onClick={() => handleDecision(req.id, 'DISCARD')}>Dispensar Item</Button></div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showTracking && <LiveTrackingMap requestId={showTracking} onClose={() => setShowTracking(null)} driverName={requests.find(r => r.id === showTracking)?.partner?.name} />}
            {ratingRequest && <RatingModal isOpen={!!ratingRequest} onClose={() => setRatingRequest(null)} onSubmit={handleRatePartner} targetName={ratingRequest.partner?.name || 'Entregador'} title="Avaliar Entregador" />}
            {showChat && <ChatWindow orderId={showChat} type="ORDER" onClose={() => setShowChat(null)} title={requests.find(r => r.id === showChat)?.partner?.name || "Chat"} />}
            {showUpgradeModal && <SuperStoreModal onClose={() => setShowUpgradeModal(false)} onSuccess={() => { setShowUpgradeModal(false); loadAllData(); }} />}
        </div>
    );
};

export default StoreWalletModule;
