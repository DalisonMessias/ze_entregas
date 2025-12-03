
import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Plus, Loader2, Copy, ExternalLink, X, AlertTriangle, QrCode, MapPin, Star, MessageCircle, Gift, Crown, ChevronRight, Truck, Send, Users, BarChart3, Megaphone, History } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { StoreWallet, WalletTransaction, PartnerRequest, PartnerRequestStatus, PartnerFeeSettings } from '../types';
import { LiveTrackingMap } from './LiveTrackingMap';
import { RatingModal } from './RatingModal';
import { FinancialPanel } from './FinancialPanel';
import { ChatWindow } from './ChatWindow';
import { ReferralProgram } from './ReferralProgram';
import { SuperStoreModal } from './SuperStoreModal';
import { Skeleton } from './Skeleton';

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
        default: return <span className={`${baseClasses} bg-gray-100 text-gray-600`}>{status}</span>;
    }
};

const StoreWalletSkeleton = () => (
    <div className="space-y-6 animate-in fade-in">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
        <div className="space-y-4 mt-6">
            <div className="flex items-center gap-2">
                <Skeleton variant="circular" className="h-4 w-4" />
                <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
    </div>
);

interface StoreWalletModuleProps {
    onNavigate?: (tab: any) => void;
}

export const StoreWalletModule: React.FC<StoreWalletModuleProps> = ({ onNavigate }) => {
    const [wallet, setWallet] = useState<StoreWallet | null>(null);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [myRequests, setMyRequests] = useState<PartnerRequest[]>([]);
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [storeCode, setStoreCode] = useState<string>('');
    
    // Recharge States
    const [showRechargeModal, setShowRechargeModal] = useState(false);
    const [rechargeStep, setRechargeStep] = useState<'amount' | 'payment_details'>('amount');
    const [rechargeAmount, setRechargeAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO'>('PIX');
    const [processingRecharge, setProcessingRecharge] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState<any>(null);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);
    
    // Transfer States
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferCode, setTransferCode] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [processingTransfer, setProcessingTransfer] = useState(false);

    // Decision States
    const [decisionRequest, setDecisionRequest] = useState<PartnerRequest | null>(null);
    const [processingDecision, setProcessingDecision] = useState(false);

    // Live Tracking
    const [trackingRequest, setTrackingRequest] = useState<PartnerRequest | null>(null);

    // Rating
    const [ratingRequest, setRatingRequest] = useState<PartnerRequest | null>(null);

    // Chat
    const [chatRequest, setChatRequest] = useState<PartnerRequest | null>(null);

    // Super Store Modal
    const [showSuperStoreModal, setShowSuperStoreModal] = useState(false);

    useEffect(() => { if (showRechargeModal && rechargeStep === 'payment_details' && paymentDetails?.asaas_pix_copy_paste && qrCanvasRef.current) { new QRious({ element: qrCanvasRef.current, value: paymentDetails.asaas_pix_copy_paste, size: 200, level: 'H' }); } }, [showRechargeModal, rechargeStep, paymentDetails]);
    
    const loadData = async (showLoading: boolean = true) => { 
        if(showLoading) setLoading(true); 
        try { 
            const [w, t, reqs, f, user] = await Promise.all([
                cloud.getMyWallet(), 
                cloud.getWalletTransactions(), 
                cloud.getStoreRequests(),
                cloud.adminGetFeeSettings(),
                cloud.getClient()?.auth.getUser()
            ]); 
            setWallet(w); 
            setTransactions(t); 
            setMyRequests(reqs); 
            setFees(f);
            
            if (user?.data.user) {
                const profile = await cloud.getClient()?.from('user_profiles').select('is_super_store, association_code').eq('id', user.data.user.id).single();
                if (profile?.data) {
                    setIsSuperStore(profile.data.is_super_store);
                    setStoreCode(profile.data.association_code || '---');
                }
            }

        } catch (e) { 
            console.error(e); 
        } finally { 
            if(showLoading) setLoading(false); 
        } 
    };
    
    useEffect(() => { loadData(); const interval = setInterval(() => loadData(false), 30000); return () => clearInterval(interval); }, []);

    const handleCreateRecharge = async (method: 'PIX' | 'BOLETO') => { 
        const amount = parseFloat(rechargeAmount.replace(/\./g, '').replace(',', '.')); 
        if (isNaN(amount) || amount <= 0) return alert("Valor inválido"); 
        setPaymentMethod(method); 
        setProcessingRecharge(true); 
        try { 
            const details = await cloud.createRechargeCharge(amount, method); 
            setPaymentDetails(details); 
            setRechargeStep('payment_details'); 
        } catch(e: any) { 
            alert("Erro: " + e.message); 
        } finally { 
            setProcessingRecharge(false); 
        } 
    };
    
    const resetRecharge = () => { setShowRechargeModal(false); setRechargeStep('amount'); setRechargeAmount(''); setPaymentDetails(null); };
    
    const handleTransfer = async () => {
        if (!transferAmount || !transferCode) return alert("Preencha todos os campos.");
        const val = parseFloat(transferAmount.replace(/\./g, '').replace(',', '.'));
        if (isNaN(val) || val <= 0) return alert("Valor inválido.");
        
        setProcessingTransfer(true);
        try {
            // Using P2P transfer logic but adapted for Store -> Partner
            await cloud.performInternalTransfer(transferCode.toUpperCase(), val, 'STORE');
            alert("Transferência realizada!");
            setShowTransferModal(false);
            setTransferAmount('');
            setTransferCode('');
            loadData(false);
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setProcessingTransfer(false);
        }
    };

    const handleDecision = async (decision: 'RETURN' | 'DISCARD') => { 
        if (!decisionRequest) return; 
        if (!confirm(decision === 'RETURN' ? "O item será devolvido à loja?" : "O entregador pode ficar/descartar?")) return; 
        setProcessingDecision(true); 
        try { 
            await cloud.storeDecideFailedDelivery(decisionRequest.id, decision); 
            alert("Decisão enviada."); 
            setDecisionRequest(null); 
            loadData(false); 
        } catch(e: any) { 
            alert("Erro: " + e.message); 
        } finally { 
            setProcessingDecision(false); 
        } 
    };

    const handleRatePartner = async (rating: number, comment: string) => {
        if (!ratingRequest) return;
        try {
            await cloud.submitRating(ratingRequest.id, rating, comment, 'STORE_TO_PARTNER');
            alert("Avaliação enviada!");
            setRatingRequest(null);
            loadData(false);
        } catch (e: any) {
            alert("Erro ao avaliar: " + e.message);
        }
    };

    const handleShareWhatsApp = (req: PartnerRequest) => {
        const text = `📦 *Nova Solicitação de Entrega*\n🆔 Pedido: #${req.id.substring(0,6)}\n\n📍 *Retirada:* ${req.pickup_address}\n🏁 *Entrega:* ${req.delivery_address}\n💰 *Valor para você:* ${formatCurrency(req.net_value_partner)}\n\nAbra o App Zé Entregas para aceitar!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (loading && !wallet) return <StoreWalletSkeleton />;

    const renderRechargeModal = () => (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                 <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg dark:text-white">Recarregar</h3><button onClick={resetRecharge}><X className="w-5 h-5"/></button></div>
                {rechargeStep === 'amount' ? (
                    <>
                        <input 
                            type="tel" 
                            placeholder="Valor (R$)" 
                            value={rechargeAmount} 
                            onChange={e => handleCurrencyMask(e, setRechargeAmount)} 
                            className="w-full p-4 text-xl font-bold bg-gray-50 dark:bg-gray-700 rounded-xl outline-none mb-4" 
                            autoFocus 
                        />
                        <div className="space-y-3">
                            <Button fullWidth onClick={() => handleCreateRecharge('PIX')} disabled={processingRecharge}>{processingRecharge ? <Loader2 className="animate-spin"/> : 'PIX'}</Button>
                            <Button fullWidth onClick={() => handleCreateRecharge('BOLETO')} variant="outline" disabled={processingRecharge}>{processingRecharge ? <Loader2 className="animate-spin"/> : 'Boleto'}</Button>
                        </div>
                    </>
                ) : (paymentMethod === 'PIX' && paymentDetails ? ( <div className="text-center space-y-4"><p className="text-sm">Escaneie o QR Code:</p><canvas ref={qrCanvasRef} className="mx-auto border rounded-lg"/><Button fullWidth variant="outline" onClick={() => navigator.clipboard.writeText(paymentDetails.asaas_pix_copy_paste)}><Copy className="w-4 h-4 mr-2"/> Copiar Código</Button></div> ) : ( paymentDetails && <a href={paymentDetails.asaas_bank_slip_url} target="_blank" rel="noopener noreferrer" className="block"><Button fullWidth><ExternalLink className="w-4 h-4 mr-2"/> Abrir Boleto</Button></a> ))}
            </div>
        </div>
    );
    
    const renderDecisionModal = () => (
        decisionRequest && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center">
                    <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                    <h3 className="text-lg font-bold dark:text-white">Problema na Entrega</h3>
                    <p className="text-sm text-gray-500 mb-2">Relato: <strong>"{decisionRequest.failure_reason}"</strong></p>
                    <p className="text-xs text-gray-400 mb-6">O que fazer?</p>
                    <div className="space-y-3">
                        <Button fullWidth onClick={() => handleDecision('RETURN')} disabled={processingDecision}>{processingDecision ? <Loader2 className="animate-spin"/> : 'Solicitar Devolução'}</Button>
                        <Button variant="outline" fullWidth onClick={() => handleDecision('DISCARD')} disabled={processingDecision}>{processingDecision ? <Loader2 className="animate-spin"/> : 'Pode Descartar/Ficar'}</Button>
                        <Button variant="ghost" fullWidth onClick={() => setDecisionRequest(null)}>Fechar</Button>
                    </div>
                </div>
            </div>
        )
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Super Store Banner (Dynamic) */}
            {!isSuperStore && fees && (
                <div 
                    onClick={() => setShowSuperStoreModal(true)}
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

            {/* Quick Access Shortcuts - Visible to ALL Store Partners */}
            <div className="grid grid-cols-4 gap-2 mb-2">
                <button onClick={() => onNavigate?.('new_request')} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                        <Truck className="w-5 h-5"/>
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Nova Entrega</span>
                </button>
                
                <button onClick={() => onNavigate?.('history')} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                        <History className="w-5 h-5"/>
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Histórico</span>
                </button>

                <button onClick={() => onNavigate?.('store_team')} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                        <Users className="w-5 h-5"/>
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Equipe</span>
                </button>

                <button onClick={() => onNavigate?.('store_marketing')} className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                        <Megaphone className="w-5 h-5"/>
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Marketing</span>
                </button>
            </div>

            <div className="bg-gradient-to-br from-brand-600 to-brand-700 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                    <Wallet className="w-32 h-32" />
                </div>
                <div className="relative z-10 flex flex-col justify-between gap-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-brand-100 text-sm font-medium">Saldo Disponível</p>
                            <h2 className="text-4xl font-black">{formatCurrency(wallet?.balance_decimal || 0)}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-brand-100 text-[10px] font-bold uppercase opacity-80">Código da Loja</p>
                            <p className="font-mono text-lg font-bold">{storeCode}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowRechargeModal(true)} className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors">
                            <Plus className="w-4 h-4" /> Recarregar
                        </button>
                        <button onClick={() => setShowTransferModal(true)} className="flex-1 bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors border border-white/20">
                            <Send className="w-4 h-4" /> Transferir
                        </button>
                    </div>
                </div>
            </div>

            {/* Active Requests */}
            <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 px-2 flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Corridas Ativas
                </h3>
                {myRequests.length === 0 && <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-xl">Nenhuma corrida ativa no momento.</p>}
                {myRequests.map(req => (
                    <div key={req.id} className="p-4 mb-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <p className="text-xs font-mono text-gray-400">#{req.id.substring(0,6)}</p>
                            <div className="flex gap-2">
                                <button onClick={() => handleShareWhatsApp(req)} className="bg-green-100 text-green-600 p-1.5 rounded-lg hover:bg-green-200" title="Compartilhar no WhatsApp">
                                    <MessageCircle className="w-4 h-4" />
                                </button>
                                {getStatusChip(req.status)}
                            </div>
                        </div>
                        <div className="space-y-1 mb-3">
                            <p className="text-sm dark:text-white line-clamp-1"><span className="text-blue-500 font-bold">De:</span> {req.pickup_address}</p>
                            <p className="text-sm dark:text-white line-clamp-1"><span className="text-brand-500 font-bold">Para:</span> {req.delivery_address}</p>
                        </div>
                        
                        {(req.status === 'ACCEPTED' || req.status === 'IN_TRANSIT') && (
                            <div className="flex gap-2 mt-2">
                                <Button onClick={() => setTrackingRequest(req)} className="flex-1 text-xs py-2">
                                    <MapPin className="w-3 h-3 mr-1"/> Rastrear
                                </Button>
                                <Button onClick={() => setChatRequest(req)} variant="outline" className="flex-1 text-xs py-2">
                                    <MessageCircle className="w-3 h-3 mr-1"/> Chat
                                </Button>
                            </div>
                        )}

                        {req.status === 'AWAITING_STORE_DECISION' && (
                            <Button variant="danger" onClick={() => setDecisionRequest(req)} className="w-full mt-2 text-xs py-2 animate-pulse">
                                <AlertTriangle className="w-3 h-3 mr-1"/> Resolver Problema
                            </Button>
                        )}

                        {req.status === 'COMPLETED' && !req.rated_by_store && (
                            <Button onClick={() => setRatingRequest(req)} variant="outline" className="w-full mt-2 text-xs py-2 border-yellow-400 text-yellow-600">
                                <Star className="w-3 h-3 mr-1 fill-yellow-400"/> Avaliar Entregador
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {/* Financial Summary */}
            <div className="mt-8">
                <FinancialPanel userRole="store_partner" />
            </div>
            
            {showRechargeModal && renderRechargeModal()}
            {renderDecisionModal()}
            
            {/* Transfer Modal */}
            {showTransferModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
                        <button onClick={() => setShowTransferModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        <h3 className="font-bold text-lg dark:text-white mb-6 flex items-center gap-2">Transferência Interna</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Código do Destinatário</label>
                                <input 
                                    type="text" 
                                    value={transferCode}
                                    onChange={e => setTransferCode(e.target.value.toUpperCase())}
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none font-mono uppercase"
                                    placeholder="EX: P12345"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Valor (R$)</label>
                                <input 
                                    type="tel" 
                                    value={transferAmount}
                                    onChange={e => handleCurrencyMask(e, setTransferAmount)}
                                    className="w-full p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none font-black text-xl"
                                    placeholder="0,00"
                                />
                            </div>
                            <Button fullWidth onClick={handleTransfer} disabled={processingTransfer}>
                                {processingTransfer ? <Loader2 className="w-6 h-6 animate-spin"/> : 'Confirmar Transferência'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {trackingRequest && (
                <LiveTrackingMap 
                    requestId={trackingRequest.id} 
                    onClose={() => setTrackingRequest(null)} 
                    driverName={trackingRequest.partner?.name}
                />
            )}

            <RatingModal 
                isOpen={!!ratingRequest}
                onClose={() => setRatingRequest(null)}
                onSubmit={handleRatePartner}
                targetName={ratingRequest?.partner?.name || 'Entregador'}
            />

            {chatRequest && (
                <ChatWindow 
                    orderId={chatRequest.id} 
                    type="ORDER" 
                    onClose={() => setChatRequest(null)} 
                    title={chatRequest.partner?.name || "Entregador"} 
                />
            )}

            {showSuperStoreModal && fees && (
                <SuperStoreModal 
                    onClose={() => setShowSuperStoreModal(false)}
                    onSuccess={() => {
                        setIsSuperStore(true);
                        loadData(); // Refresh data/wallet
                    }}
                />
            )}
        </div>
    );
};
