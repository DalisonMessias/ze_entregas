



import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Plus, Loader2, Copy, ExternalLink, X, AlertTriangle, QrCode, MapPin, Star, MessageCircle, Gift, Crown, ChevronRight, Truck, Send, Users, BarChart3, Megaphone, History, Smartphone, Settings, CreditCard, Headphones, ShoppingBag, User, LayoutDashboard, Info, Search, FileText, Landmark, UploadCloud, Banknote } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import type { StoreWallet, WalletTransaction, PartnerRequest, PartnerRequestStatus, PartnerFeeSettings } from '../types';
import { LiveTrackingMap } from './LiveTrackingMap';
import { RatingModal } from './RatingModal';
import { FinancialPanel } from './FinancialPanel';
import { ChatWindow } from './ChatWindow';
import { ReferralProgram } from './ReferralProgram';
import { SuperStoreModal } from './SuperStoreModal';
import { Skeleton } from './Skeleton';
import { MerchantPOS } from './MerchantPOS';
import { ExclusiveLock } from './ExclusiveLock';
import { StoreTeam } from './StoreTeam';
import { StoreReports } from './StoreReports';
import { StoreMarketing } from './StoreMarketing';
import { StoreIntegrations } from './StoreIntegrations';
import { StoreSettings } from './StoreSettings';
import { PromoSlider } from './PromoSlider';
import { useDialog } from '../utils/dialogService'; // Import useDialog

declare const QRious: any;

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) {
        setter("");
        return;
    }
    const amount = Number(value) / 100;
    const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setter(formatted);
};

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
    const { alert } = useDialog(); // Use the custom dialog service

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
            const res = await onRecharge(value, 'PIX');
            if (res.asaas_pix_copy_paste) {
                setPixDetails({ copyPaste: res.asaas_pix_copy_paste });
            }
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

const StoreWalletPanel: React.FC<{ onNavigate?: (tab: any) => void }> = ({ onNavigate }) => {
    const [wallet, setWallet] = useState<StoreWallet | null>(null);
    const [requests, setRequests] = useState<PartnerRequest[]>([]);
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [innerTab, setInnerTab] = useState<'extract' | 'recharge' | 'requests'>('requests'); // Padrão para 'requests'
    const [showRecharge, setShowRecharge] = useState(false);
    const [showTracking, setShowTracking] = useState<string | null>(null);
    const [ratingRequest, setRatingRequest] = useState<PartnerRequest | null>(null);
    const [showChat, setShowChat] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [demoMessage, setDemoMessage] = useState<string | null>(null);

    // New States for Maquininha
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [profileLoading, setProfileLoading] = useState(true);
    const [showMerchantPOS, setShowMerchantPOS] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const { alert } = useDialog(); // Use the custom dialog service

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
    useEffect(() => {
        try {
            localStorage.setItem('store_shortcuts_fav', JSON.stringify(favoriteShortcuts));
        } catch { }
    }, [favoriteShortcuts]);

    const loadAllData = async () => {
        setLoading(true);
        setProfileLoading(true);
        setErrorMessage(null);
        try {
            const [walletData, requestsData, feesData, profileData] = await Promise.all([
                cloud.getMyWallet(),
                cloud.getStoreRequests(),
                cloud.getPublicFeeSettings(),
                cloud.getMyPartnerProfile()
            ]);
            setWallet(walletData);
            setRequests(requestsData);
            setFees(feesData);
            setIsSuperStore(profileData?.is_super_store || false);
        } catch (e) {
            console.error(e);
            const msg = (e && (e as any).message) ? (e as any).message : 'Erro ao carregar dados. Tente novamente.';
            setErrorMessage(msg);
        } finally {
            setLoading(false);
            setProfileLoading(false);
        }
    };

    useEffect(() => {
        loadAllData();
    }, []);

    const handleRecharge = (amount: number, method: 'PIX') => cloud.createRechargeCharge(amount, method);
    const handleDecision = async (id: string, decision: string) => {
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

    return (
        <div className="space-y-6 animate-in fade-in">
            {errorMessage && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm font-bold">
                    {errorMessage}
                </div>
            )}
            {loading ? (
                <WalletSkeleton />
            ) : (
                <div className="space-y-6">
                    <PromoSlider audience="merchants" />
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
                                    { id: 'atualizar_estoque', label: 'Atualizar Estoque', icon: ShoppingBag, tab: 'store_integrations', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
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

                    {/* Maquininha do Zé Section (CTA for SuperStore) */}


                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                        <button onClick={() => setInnerTab('requests')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${innerTab === 'requests' ? 'bg-white dark:bg-gray-600 shadow' : 'text-gray-500'}`}>Corridas</button>
                    </div>



                    {innerTab === 'requests' && (
                        <div className="space-y-4">
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
            )}


            {showTracking && <LiveTrackingMap requestId={showTracking} onClose={() => setShowTracking(null)} driverName={requests.find(r => r.id === showTracking)?.partner?.name} />}
            {ratingRequest && <RatingModal isOpen={!!ratingRequest} onClose={() => setRatingRequest(null)} onSubmit={handleRatePartner} targetName={ratingRequest.partner?.name || 'Entregador'} title="Avaliar Entregador" />}
            {showChat && <ChatWindow orderId={showChat} type="ORDER" onClose={() => setShowChat(null)} title={requests.find(r => r.id === showChat)?.partner?.name || "Chat"} />}

            {showUpgradeModal && <SuperStoreModal onClose={() => setShowUpgradeModal(false)} onSuccess={() => {
                setShowUpgradeModal(false);
                loadAllData();
            }} />}
        </div>
    );
};

// Main Export
export const StoreWalletModule = ({ onNavigate }: { onNavigate: (tab: any) => void }) => {
    const [activeTab, setActiveTab] = useState<'wallet' | 'team' | 'reports' | 'marketing' | 'integrations' | 'settings'>('wallet');

    const renderContent = () => {
        switch (activeTab) {
            case 'wallet': return <StoreWalletPanel onNavigate={onNavigate} />;
            case 'team': return <StoreTeam />;
            case 'reports': return <StoreReports />;
            case 'marketing': return <StoreMarketing />;
            case 'integrations': return <StoreIntegrations />;
            case 'settings': return <StoreSettings />;
            default: return <StoreWalletPanel onNavigate={onNavigate} />;
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-1 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('wallet')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'wallet' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}><LayoutDashboard className="w-4 h-4" /> Painel</button>
                <button onClick={() => setActiveTab('team')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'team' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}><Users className="w-4 h-4" /> Minha Equipe</button>
                <button onClick={() => setActiveTab('reports')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'reports' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}><BarChart3 className="w-4 h-4" /> Relatórios</button>
                <button onClick={() => setActiveTab('marketing')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'marketing' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}><Megaphone className="w-4 h-4" /> Marketing</button>
                <button onClick={() => setActiveTab('integrations')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'integrations' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}><Send className="w-4 h-4" /> Integrações</button>
                <button onClick={() => setActiveTab('settings')} className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${activeTab === 'settings' ? 'bg-gray-100 dark:bg-gray-700' : ''}`}><Settings className="w-4 h-4" /> Ajustes</button>
            </div>
            <div>
                {renderContent()}
            </div>
        </div>
    );
};
