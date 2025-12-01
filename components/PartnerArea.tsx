
import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Navigation, CheckCircle, DollarSign, ToggleLeft, ToggleRight, Wallet, AlertTriangle, History, MapPin, Store, Copy, Play, Pause, Square, Clock, MessageCircle, Map, Gift, UserX, UserCheck, Share2, Wrench, Calculator, Fuel, Share, Image as ImageIcon, ClipboardList } from 'lucide-react';
import { Button } from './Button';
import { PartnerDocumentation } from './PartnerDocumentation';
import * as cloud from '../services/cloud';
import { PartnerRequest, PayoutSummary, PartnerPayment, PartnerProfile, PartnerLevelBenefit, WorkShift } from '../types';
import { OrderHistory } from './OrderHistory';
import { RatingModal } from './RatingModal';
import { FinancialPanel } from './FinancialPanel';
import { SecurityCheckModal } from './SecurityCheckModal';
import { ChatWindow } from './ChatWindow';
import { openNavigation } from '../utils/mapHelpers';
import { ReferralProgram } from './ReferralProgram';
import { Skeleton } from './Skeleton';
import { AssociateDriver } from './AssociateDriver';
import { Maintenance } from './Maintenance';
import { RouteCalculator } from './RouteCalculator';
import { FuelCalculator } from './FuelCalculator';
import { ShareCard } from './ShareCard';
import { PromotionCardGenerator } from './PromotionCardGenerator';
import { DailyDashboard } from './DailyDashboard';

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// --- HELPER PARA TEMPO DECORRIDO ---
const calculateActiveTime = (shift: WorkShift): number => {
    const start = new Date(shift.start_time).getTime();
    const now = new Date().getTime();
    let totalPause = 0;

    if (shift.breaks) {
        shift.breaks.forEach(b => {
            const bStart = new Date(b.start).getTime();
            const bEnd = b.end ? new Date(b.end).getTime() : now;
            totalPause += (bEnd - bStart);
        });
    }

    return Math.max(0, now - start - totalPause);
};

const formatDuration = (ms: number) => {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)));
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const PartnerAreaSkeleton = () => (
    <div className="space-y-6 animate-in fade-in">
        <div className="flex gap-2 overflow-x-auto">
            <Skeleton className="h-10 w-24 flex-shrink-0" />
            <Skeleton className="h-10 w-24 flex-shrink-0" />
            <Skeleton className="h-10 w-24 flex-shrink-0" />
            <Skeleton className="h-10 w-24 flex-shrink-0" />
        </div>
        
        <div className="p-6 rounded-3xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-6">
                <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-48" />
                </div>
                <Skeleton variant="circular" className="h-12 w-12" />
            </div>
            <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>

        <Skeleton className="h-12 w-full rounded-xl" />

        <div className="space-y-4 mt-6">
            <div className="flex items-center gap-2">
                <Skeleton variant="circular" className="h-4 w-4" />
                <Skeleton className="h-6 w-40" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
        </div>
    </div>
);

export const PartnerArea: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'requests' | 'manual' | 'finance' | 'history' | 'stores' | 'tools'>('requests');
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [requests, setRequests] = useState<PartnerRequest[]>([]);
    const [activeDelivery, setActiveDelivery] = useState<PartnerRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [processingAction, setProcessingAction] = useState(false);
    const [showFailureModal, setShowFailureModal] = useState(false);
    const [failureReason, setFailureReason] = useState('');
    const [summary, setSummary] = useState<PayoutSummary | null>(null);
    const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
    const [processingWithdraw, setProcessingWithdraw] = useState(false);
    
    // Rating State
    const [ratingRequest, setRatingRequest] = useState<PartnerRequest | null>(null);

    // Shift Logic
    const [currentShift, setCurrentShift] = useState<WorkShift | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [shiftLoading, setShiftLoading] = useState(true);
    
    // Security Modal
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);

    // Chat
    const [showChat, setShowChat] = useState(false);

    // Referral
    const [showReferral, setShowReferral] = useState(false);

    // Tool Modals
    const [openTool, setOpenTool] = useState<'maintenance' | 'route_calc' | 'fuel_calc' | 'share_daily' | 'promo_card' | null>(null);

    // Live Tracking Ref
    const watchIdRef = useRef<number | null>(null);

    useEffect(() => { const l = async () => { try { const p = await cloud.getMyPartnerProfile(); setProfile(p); } catch (e) { console.error(e); } }; l(); }, []);

    // Load Shift on Mount
    useEffect(() => {
        const fetchShift = async () => {
            setShiftLoading(true);
            try {
                const shift = await cloud.getCurrentShift();
                setCurrentShift(shift);
            } catch (e) {
                console.error(e);
            } finally {
                setShiftLoading(false);
            }
        };
        fetchShift();
    }, []);

    // Shift Timer
    useEffect(() => {
        let interval: any;
        if (currentShift && currentShift.status === 'ACTIVE') {
            setElapsedTime(calculateActiveTime(currentShift)); // Init immediately
            interval = setInterval(() => {
                setElapsedTime(calculateActiveTime(currentShift));
            }, 1000);
        } else if (currentShift && currentShift.status === 'PAUSED') {
             setElapsedTime(calculateActiveTime(currentShift)); // Static update
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [currentShift]);

    // Check Requests (Only if ACTIVE shift)
    const loadRequests = async () => {
        if (!currentShift || currentShift.status !== 'ACTIVE' || profile?.verification_status !== 'APPROVED') return;
        setLoading(true);
        try {
            const available = await cloud.getPartnerRequestsAvailable();
            setRequests(available);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => { 
        if (activeTab === 'finance') { 
            (async () => { 
                try { 
                    const s = await cloud.getPartnerFinancialSummary(); 
                    setSummary(s); 
                } catch (e) { 
                    console.error(e); 
                } 
            })(); 
        } 
    }, [activeTab]);
    
    // Auto refresh requests ONLY if shift is ACTIVE
    useEffect(() => { 
        let interval: any; 
        if (currentShift?.status === 'ACTIVE' && activeTab === 'requests' && profile?.verification_status === 'APPROVED') { 
            loadRequests(); 
            interval = setInterval(loadRequests, 10000); 
        } else { 
            setRequests([]); 
        } 
        return () => clearInterval(interval); 
    }, [currentShift?.status, activeTab, profile]);

    // --- LIVE TRACKING LOGIC ---
    useEffect(() => {
        if (activeDelivery && (activeDelivery.status === 'IN_TRANSIT' || activeDelivery.status === 'ACCEPTED')) {
            if (!navigator.geolocation) return;

            // Start watching
            watchIdRef.current = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, heading, speed } = position.coords;
                    
                    cloud.broadcastLocation(activeDelivery.id, {
                        lat: latitude,
                        lng: longitude,
                        heading: heading || 0,
                        speed: speed || 0,
                        status: activeDelivery.status,
                        updated_at: new Date().toISOString()
                    });
                    
                    // Also update DB occasionally for last known location
                    cloud.updateUserLocation(latitude, longitude);
                },
                (err) => console.error("Error watching position", err),
                { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
            );
        } else {
            // Stop watching if not in transit
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        }

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [activeDelivery?.status, activeDelivery?.id]);


    const handleAccept = async (req: PartnerRequest) => { setProcessingAction(true); try { await cloud.acceptPartnerRequest(req.id); setActiveDelivery({...req, status: 'ACCEPTED'}); setRequests(prev => prev.filter(r => r.id !== req.id)); } catch (e: any) { alert("Erro: " + e.message); loadRequests(); } finally { setProcessingAction(false); } };
    const handleConfirmPickup = async () => { if (!activeDelivery) return; setProcessingAction(true); try { await cloud.partnerConfirmPickup(activeDelivery.id); setActiveDelivery(prev => prev ? {...prev, status: 'IN_TRANSIT'} : null); } catch (e: any) { alert("Erro: " + e.message); } finally { setProcessingAction(false); } };
    const handleConfirmDelivery = async () => { if (!activeDelivery) return; setProcessingAction(true); try { await cloud.partnerConfirmDelivery(activeDelivery.id); alert("Entrega concluída! Valor creditado."); setRatingRequest(activeDelivery); setActiveDelivery(null); loadRequests(); } catch (e: any) { alert("Erro: " + e.message); } finally { setProcessingAction(false); } };
    const handleReportFailure = async () => { if (!activeDelivery || !failureReason) return; setProcessingAction(true); try { await cloud.partnerReportDeliveryFailure(activeDelivery.id, failureReason); setActiveDelivery(prev => prev ? {...prev, status: 'AWAITING_STORE_DECISION', failure_reason: failureReason} : null); setShowFailureModal(false); } catch (e: any) { alert("Erro: " + e.message); } finally { setProcessingAction(false); } };
    const handleConfirmReturn = async () => { if (!activeDelivery) return; setProcessingAction(true); try { await cloud.partnerConfirmReturn(activeDelivery.id); alert("Devolução confirmada. Corrida finalizada."); setActiveDelivery(null); loadRequests(); } catch (e: any) { alert("Erro: " + e.message); } finally { setProcessingAction(false); } };
    const handleCheckDecision = () => alert("Aguarde a notificação ou verifique novamente em instantes.");
    const handleRequestEmergency = async () => { setProcessingWithdraw(true); try { await cloud.requestEmergencyPayoutAsaas(); alert(`Sucesso!`); setShowWithdrawConfirm(false); } catch (e: any) { alert("Erro: " + e.message); } finally { setProcessingWithdraw(false); } };

    const handleRateStore = async (rating: number, comment: string) => {
        if (!ratingRequest) return;
        try {
            await cloud.submitRating(ratingRequest.id, rating, comment, 'PARTNER_TO_STORE');
            alert("Obrigado pela avaliação!");
            setRatingRequest(null);
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    const handleWhatsAppContact = () => {
        if (!activeDelivery?.store?.phone_number) return alert("Telefone da loja não disponível.");
        const text = `Olá, sou o entregador do pedido *#${activeDelivery.id.substring(0,6)}*.`;
        window.open(`https://wa.me/55${activeDelivery.store.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    };

    // --- SHIFT HANDLERS ---
    const handleStartShiftClick = () => {
        // Trigger Security Check Modal first
        setShowSecurityCheck(true);
    };

    const handleSecurityVerified = async () => {
        setShowSecurityCheck(false);
        setShiftLoading(true);
        try {
            const shift = await cloud.startWorkShift();
            setCurrentShift(shift);
        } catch (e: any) { alert("Erro ao iniciar turno: " + e.message); }
        setShiftLoading(false);
    };

    const handlePauseShift = async () => {
        if (!currentShift) return;
        setShiftLoading(true);
        try {
            await cloud.pauseWorkShift(currentShift.id);
            setCurrentShift({...currentShift, status: 'PAUSED', breaks: [...(currentShift.breaks || []), { start: new Date().toISOString() }]});
        } catch (e: any) { alert("Erro ao pausar: " + e.message); }
        setShiftLoading(false);
    };

    const handleResumeShift = async () => {
        if (!currentShift) return;
        setShiftLoading(true);
        try {
            await cloud.resumeWorkShift(currentShift.id);
            // Optimistic update for UI speed
            const newBreaks = [...(currentShift.breaks || [])];
            if (newBreaks.length > 0) newBreaks[newBreaks.length - 1].end = new Date().toISOString();
            setCurrentShift({...currentShift, status: 'ACTIVE', breaks: newBreaks});
        } catch (e: any) { alert("Erro ao retomar: " + e.message); }
        setShiftLoading(false);
    };

    const handleEndShift = async () => {
        if (!currentShift) return;
        if (!confirm("Encerrar turno de trabalho? Você ficará offline.")) return;
        setShiftLoading(true);
        try {
            await cloud.endWorkShift(currentShift.id);
            setCurrentShift(null);
            setRequests([]); // Clear requests
        } catch (e: any) { alert("Erro ao encerrar: " + e.message); }
        setShiftLoading(false);
    };

    if (!profile) return <PartnerAreaSkeleton />;
    if (profile?.verification_status !== 'APPROVED') return <PartnerDocumentation profile={profile} onProfileUpdate={setProfile} />;

    const renderShiftControl = () => {
        if (!currentShift) {
            return (
                <div className="bg-gray-900 dark:bg-gray-800 text-white p-6 rounded-3xl shadow-xl flex flex-col items-center text-center">
                    <div className="mb-4">
                        <h2 className="text-2xl font-black">Você está Offline</h2>
                        <p className="text-gray-400 text-sm">Inicie seu turno para receber entregas.</p>
                    </div>
                    <Button onClick={handleStartShiftClick} disabled={shiftLoading} className="w-full py-4 text-lg bg-green-600 hover:bg-green-500 shadow-lg shadow-green-900/50">
                        {shiftLoading ? <Loader2 className="animate-spin"/> : <><Play className="w-5 h-5 mr-2 fill-current"/> Iniciar Turno</>}
                    </Button>
                </div>
            );
        }

        const isPaused = currentShift.status === 'PAUSED';

        return (
            <div className={`p-6 rounded-3xl shadow-xl transition-all duration-500 ${isPaused ? 'bg-yellow-500 text-white' : 'bg-green-600 text-white'}`}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className={`w-3 h-3 rounded-full ${isPaused ? 'bg-white' : 'bg-white animate-pulse'}`}></span>
                            <h2 className="text-xl font-black uppercase tracking-wide">{isPaused ? 'EM PAUSA' : 'EM TURNO'}</h2>
                        </div>
                        <p className="text-white/80 text-xs font-bold">Tempo Ativo</p>
                        <p className="text-4xl font-mono font-black tracking-tighter mt-1">{formatDuration(elapsedTime)}</p>
                    </div>
                    <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                        <Clock className="w-6 h-6"/>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {isPaused ? (
                        <Button onClick={handleResumeShift} disabled={shiftLoading} className="bg-white text-yellow-600 hover:bg-gray-100 border-none">
                            {shiftLoading ? <Loader2 className="animate-spin"/> : <><Play className="w-4 h-4 mr-2 fill-current"/> Retomar</>}
                        </Button>
                    ) : (
                        <Button onClick={handlePauseShift} disabled={shiftLoading} className="bg-white/20 hover:bg-white/30 text-white border-none backdrop-blur-sm">
                            {shiftLoading ? <Loader2 className="animate-spin"/> : <><Pause className="w-4 h-4 mr-2 fill-current"/> Pausar</>}
                        </Button>
                    )}
                    
                    <Button onClick={handleEndShift} disabled={shiftLoading} className="bg-red-500/80 hover:bg-red-500 text-white border-none backdrop-blur-sm">
                        {shiftLoading ? <Loader2 className="animate-spin"/> : <><Square className="w-4 h-4 mr-2 fill-current"/> Encerrar</>}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-24 animate-in fade-in">
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('requests')} className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'requests' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Online</button>
                <button onClick={() => setActiveTab('manual')} className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'manual' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Diário</button>
                <button onClick={() => setActiveTab('finance')} className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'finance' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Financeiro</button>
                <button onClick={() => setActiveTab('history')} className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'history' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Histórico</button>
                <button onClick={() => setActiveTab('stores')} className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'stores' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Lojas</button>
                <button onClick={() => setActiveTab('tools')} className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-bold whitespace-nowrap ${activeTab === 'tools' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Tools</button>
            </div>
            
            {activeTab === 'requests' && (
                <>
                    {renderShiftControl()}

                    <div className="mt-4">
                        <Button 
                            onClick={() => setShowReferral(true)} 
                            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg border-none"
                        >
                            <Gift className="w-5 h-5 mr-2" /> Indique e Ganhe Prioridade
                        </Button>
                    </div>

                    {/* Active Delivery Card - Always show if exists, regardless of shift status (edge case) */}
                    {activeDelivery && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-2xl border-2 border-brand-500 animate-in zoom-in-95 mt-6">
                            <div className="flex justify-between items-start mb-4"><span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{activeDelivery.status === 'ACCEPTED' ? 'Vá para Coleta' : activeDelivery.status === 'IN_TRANSIT' ? 'Em Rota' : activeDelivery.status === 'AWAITING_STORE_DECISION' ? 'Aguardando Loja' : activeDelivery.status === 'RETURNING' ? 'Retornando à Loja' : activeDelivery.status}</span><p className="font-black text-xl text-green-600">{formatCurrency(activeDelivery.net_value_partner)}</p></div>
                            <div className="space-y-4 mb-6"><div className="flex items-start gap-3"><div className="mt-1"><MapPin className="w-5 h-5 text-blue-500"/></div><div><p className="text-xs text-gray-400 font-bold uppercase">Coleta</p><p className="font-medium dark:text-white text-sm">{activeDelivery.pickup_address}</p></div></div><div className="flex items-start gap-3"><div className="mt-1"><MapPin className="w-5 h-5 text-brand-500"/></div><div><p className="text-xs text-gray-400 font-bold uppercase">Entrega</p><p className="font-medium dark:text-white text-sm">{activeDelivery.delivery_address}</p></div></div></div>
                            <div className="space-y-3">
                                {activeDelivery.status === 'ACCEPTED' && (
                                    <>
                                        <Button fullWidth onClick={handleConfirmPickup} disabled={processingAction}>{processingAction ? <Loader2 className="animate-spin"/> : 'Cheguei na Coleta'}</Button>
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1" onClick={() => openNavigation(0, 0, activeDelivery.pickup_address)}><Navigation className="w-4 h-4 mr-2"/> GPS</Button>
                                            <Button variant="outline" className="flex-1" onClick={() => setShowChat(true)}><MessageCircle className="w-4 h-4 mr-2"/> Chat</Button>
                                            {activeDelivery.store?.phone_number && (
                                                <Button variant="outline" className="flex-1 text-green-600 border-green-200 bg-green-50" onClick={handleWhatsAppContact}><MessageCircle className="w-4 h-4 mr-2"/> WhatsApp</Button>
                                            )}
                                        </div>
                                    </>
                                )}
                                {activeDelivery.status === 'IN_TRANSIT' && (
                                    <>
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center text-xs text-blue-600 mb-2 font-bold animate-pulse">Sua localização está sendo compartilhada com a loja.</div>
                                        <Button variant="outline" fullWidth onClick={() => openNavigation(0, 0, activeDelivery.delivery_address)}><Navigation className="w-4 h-4 mr-2"/> GPS / Waze / Maps</Button>
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1" onClick={() => setShowChat(true)}><MessageCircle className="w-4 h-4 mr-2"/> Chat</Button>
                                            {activeDelivery.store?.phone_number && (
                                                <Button variant="outline" className="flex-1 text-green-600 border-green-200 bg-green-50" onClick={handleWhatsAppContact}><MessageCircle className="w-4 h-4 mr-2"/> WhatsApp</Button>
                                            )}
                                        </div>
                                        <div className="flex gap-2"><Button fullWidth onClick={handleConfirmDelivery} disabled={processingAction} variant="success">{processingAction ? <Loader2 className="animate-spin"/> : 'Finalizar Entrega'}</Button><Button onClick={() => setShowFailureModal(true)} variant="danger" className="px-3"><AlertTriangle className="w-5 h-5"/></Button></div>
                                    </>
                                )}
                                {activeDelivery.status === 'AWAITING_STORE_DECISION' && (<div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl"><Loader2 className="w-8 h-8 animate-spin mx-auto text-yellow-600 mb-2"/><p className="text-sm font-bold text-yellow-700">Aguardando decisão da loja...</p><button onClick={handleCheckDecision} className="text-xs text-blue-500 underline mt-2">Verificar</button><button onClick={() => setShowChat(true)} className="text-xs text-brand-600 underline mt-2 block mx-auto">Chat com Loja</button></div>)}
                                {activeDelivery.status === 'RETURNING' && (<><div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mb-2 text-center"><p className="text-sm font-bold text-red-600">Devolução Solicitada!</p><p className="text-xs text-gray-500">Volte para a coleta.</p></div><Button fullWidth onClick={handleConfirmReturn} disabled={processingAction}>{processingAction ? <Loader2 className="animate-spin"/> : 'Confirmar Devolução'}</Button></>)}
                            </div>
                        </div>
                    )}

                    {/* Available List */}
                    {currentShift?.status === 'ACTIVE' && !activeDelivery && (
                        <div className="mt-6">
                            <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2">
                                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                                Disponíveis {loading && <Loader2 className="inline w-4 h-4 animate-spin ml-2"/>}
                            </h3>
                            {requests.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                                        <UserX className="w-8 h-8 text-gray-400"/>
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma entrega disponível.</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Aguarde, assim que uma loja solicitar, aparecerá aqui automaticamente.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">{requests.map(req => (<div key={req.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border-l-4 border-brand-500"><div className="flex justify-between mb-4"><span className="text-green-700 font-bold text-sm bg-green-100 px-2 py-1 rounded">{formatCurrency(req.net_value_partner)}</span><span className="text-gray-400 text-xs font-bold">{req.distance_km} km</span></div><div className="space-y-2 mb-4"><p className="text-sm line-clamp-1"><span className="text-blue-500 font-bold">De:</span> {req.pickup_address}</p><p className="text-sm line-clamp-1"><span className="text-brand-500 font-bold">Para:</span> {req.delivery_address}</p></div><Button fullWidth onClick={() => handleAccept(req)} disabled={processingAction}>{processingAction ? <Loader2 className="animate-spin"/> : 'Aceitar'}</Button></div>))}</div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Manual Entry Tab */}
            {activeTab === 'manual' && (
                <DailyDashboard />
            )}
            
            {activeTab === 'finance' && (
                <div className="space-y-6">
                    {/* Action Button for Emergency Withdraw */}
                    {summary && summary.can_request_emergency && (
                        <div className="mb-4">
                            <button onClick={() => setShowWithdrawConfirm(true)} className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg">
                                <Wallet className="w-4 h-4" /> Solicitar Saque Emergencial
                            </button>
                        </div>
                    )}
                    
                    <FinancialPanel userRole="delivery_partner" />
                </div>
            )}

            {/* NEW HISTORY TAB */}
            {activeTab === 'history' && (
                <OrderHistory userRole="delivery_partner" />
            )}

            {activeTab === 'stores' && (
                <AssociateDriver />
            )}

            {activeTab === 'tools' && (
                <div className="space-y-6">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-gray-500" /> Ferramentas do Dia a Dia
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => setOpenTool('maintenance')} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-3 hover:scale-[1.02] transition-transform">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full">
                                <Wrench className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white text-sm">Manutenção</span>
                        </button>
                        <button onClick={() => setOpenTool('route_calc')} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-3 hover:scale-[1.02] transition-transform">
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full">
                                <Calculator className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white text-sm">Calc. Rota</span>
                        </button>
                        <button onClick={() => setOpenTool('fuel_calc')} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-3 hover:scale-[1.02] transition-transform">
                            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full">
                                <Fuel className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white text-sm">Combustível</span>
                        </button>
                        <button onClick={() => setOpenTool('share_daily')} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-3 hover:scale-[1.02] transition-transform">
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full">
                                <Share className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white text-sm">Resumo do Dia</span>
                        </button>
                        <button onClick={() => setOpenTool('promo_card')} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center gap-3 hover:scale-[1.02] transition-transform col-span-2">
                            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 rounded-full">
                                <ImageIcon className="w-6 h-6" />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white text-sm">Criar Cartão Digital</span>
                        </button>
                    </div>
                </div>
            )}

            {showWithdrawConfirm && summary && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl text-center"><h3 className="text-xl font-bold dark:text-white mb-2">Saque Emergencial</h3><p className="text-sm text-gray-500 mb-4">{summary.settings.emergency_message}<br/>Receba <strong>{formatCurrency(summary.max_emergency_value)}</strong> agora.</p><div className="flex gap-3"><Button variant="outline" onClick={() => setShowWithdrawConfirm(false)} fullWidth>Cancelar</Button><Button onClick={handleRequestEmergency} disabled={processingWithdraw} fullWidth>{processingWithdraw ? <Loader2 className="animate-spin"/> : 'Confirmar'}</Button></div></div></div>
            )}
            {showFailureModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6"><h3 className="font-bold dark:text-white mb-4">Relatar Problema</h3><textarea className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl h-24 mb-4" placeholder="Motivo..." value={failureReason} onChange={e => setFailureReason(e.target.value)} /><div className="flex gap-2"><Button variant="outline" onClick={() => setShowFailureModal(false)} fullWidth>Cancelar</Button><Button onClick={handleReportFailure} disabled={!failureReason} fullWidth>Enviar</Button></div></div></div>
            )}

            {showSecurityCheck && (
                <SecurityCheckModal 
                    onVerified={handleSecurityVerified}
                    onClose={() => setShowSecurityCheck(false)}
                />
            )}

            <RatingModal 
                isOpen={!!ratingRequest}
                onClose={() => setRatingRequest(null)}
                onSubmit={handleRateStore}
                targetName={ratingRequest?.store?.name || 'Loja'}
                title="Avaliar Loja"
            />

            {showChat && activeDelivery && (
                <ChatWindow 
                    orderId={activeDelivery.id} 
                    type="ORDER" 
                    onClose={() => setShowChat(false)} 
                    title={activeDelivery.store?.name || "Loja"} 
                />
            )}

            {showReferral && (
                <ReferralProgram 
                    userRole="delivery_partner" 
                    onClose={() => setShowReferral(false)} 
                />
            )}

            {/* Tool Modals */}
            {openTool === 'maintenance' && <Maintenance onClose={() => setOpenTool(null)} />}
            {openTool === 'route_calc' && <RouteCalculator onClose={() => setOpenTool(null)} />}
            {openTool === 'fuel_calc' && <FuelCalculator onClose={() => setOpenTool(null)} />}
            {openTool === 'share_daily' && <ShareCard data={{ value: 0, count: 0, km: 0, date: new Date().toLocaleDateString() }} onClose={() => setOpenTool(null)} />} {/* Placeholder data, ideally from summary */}
            {openTool === 'promo_card' && (
                <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto">
                    <div className="p-4">
                        <button onClick={() => setOpenTool(null)} className="mb-4 text-blue-500 font-bold">Voltar</button>
                        <PromotionCardGenerator />
                    </div>
                </div>
            )}
        </div>
    );
};
