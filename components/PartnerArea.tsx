import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Navigation, CheckCircle, DollarSign, ToggleLeft, ToggleRight, Wallet, AlertTriangle, History, MapPin, Store, Copy, Play, Pause, Square, Clock, MessageCircle, Map, Gift, UserX, UserCheck, Share2, Sparkles, ChevronRight, Fuel, Calculator, Wrench, Zap, Edit2, Smartphone, Bell, Star, Landmark, User, History as HistoryIcon } from 'lucide-react';
import { Button } from './Button';
import { BaseModal } from './BaseModal';
import { CustomInput } from './CustomInput';
import { PartnerDocumentation } from './PartnerDocumentation';
import * as cloud from '../services/cloud';
import { PartnerRequest, PayoutSummary, PartnerPayment, PartnerProfile, PartnerLevelBenefit, WorkShift, UserRole } from '../types';
import { OrderHistory } from './OrderHistory';
import { RatingModal } from './RatingModal';
import { FinancialPanel } from './FinancialPanel';
import { SecurityCheckModal } from './SecurityCheckModal';
import { ChatWindow } from './ChatWindow';
import { openNavigation } from '../utils/mapHelpers';
import { ReferralProgram } from './ReferralProgram';
import { Skeleton } from './Skeleton';
import { AssociateDriver } from './AssociateDriver';
import { FuelCalculator } from './FuelCalculator';
import { RouteCalculator } from './RouteCalculator';
import { Maintenance } from './Maintenance';
import { ExclusiveLock } from './ExclusiveLock';
import { MerchantPOS } from './MerchantPOS';
import { useDialog } from '../utils/dialogService';
import { NotificationCenter } from './NotificationCenter';
import { useNotification } from '../contexts/NotificationContext';
import { PromoSlider } from './PromoSlider';
import { TipOfTheDay } from './TipOfTheDay';
import { ScorePanel } from './ScorePanel';

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
        <div className="p-6 rounded-3xl transition-all duration-500 bg-gray-100 dark:bg-gray-800">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton variant="text" className="h-6 w-28" />
                    </div>
                    <Skeleton variant="text" className="h-4 w-24" />
                    <Skeleton variant="text" className="h-10 w-40 mt-1" />
                </div>
                <Skeleton variant="circular" className="h-10 w-10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    </div>
);

interface PartnerAreaProps {
    userRole: UserRole;
    onNavigate: (tab: any) => void;
}

export const PartnerArea: React.FC<PartnerAreaProps> = ({ userRole, onNavigate }) => {
    const [activeTab, setActiveTab] = useState<'deliveries' | 'financial' | 'history' | 'stores'>('deliveries');
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [requests, setRequests] = useState<PartnerRequest[]>([]);
    const [activeDelivery, setActiveDelivery] = useState<PartnerRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processingAction, setProcessingAction] = useState(false);
    const [showFailureModal, setShowFailureModal] = useState(false);
    const [failureReason, setFailureReason] = useState('');
    const [summary, setSummary] = useState<PayoutSummary | null>(null);
    const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
    const [processingWithdraw, setProcessingWithdraw] = useState(false);

    // Rating State
    const [ratingRequest, setRatingRequest] = useState<PartnerRequest | null>(null);

    // Scroll to Score effect
    useEffect(() => {
        const handleScroll = () => {
            const el = document.getElementById('driver-score-panel');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-brand-500', 'transition-all');
                setTimeout(() => el.classList.remove('ring-2', 'ring-brand-500'), 2000);
            }
        };
        window.addEventListener('scroll_to_score', handleScroll);
        return () => window.removeEventListener('scroll_to_score', handleScroll);
    }, []);
    const [currentShift, setCurrentShift] = useState<WorkShift | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [shiftLoading, setShiftLoading] = useState(false); // No longer for initial load

    // Security Modal
    const [showSecurityCheck, setShowSecurityCheck] = useState(false);

    // Notifications
    const [showNotifications, setShowNotifications] = useState(false);
    const { notifications, showNotification } = useNotification();
    const unreadCount = notifications.filter(n => !n.is_read).length;

    // GPS Modal State
    const [gpsModalOpen, setGpsModalOpen] = useState(false);
    const [selectedAddressForGps, setSelectedAddressForGps] = useState<string | null>(null);
    const previousRequestIds = useRef<Set<string>>(new Set());

    // Chat
    const [showChat, setShowChat] = useState(false);

    // Referral
    const [showReferral, setShowReferral] = useState(false);

    // Upgrade Flow
    const [showUpgradeFlow, setShowUpgradeFlow] = useState(false);

    // Utility Modals
    const [showFuelCalc, setShowFuelCalc] = useState(false);
    const [showRouteCalc, setShowRouteCalc] = useState(false);
    const [showMaintenance, setShowMaintenance] = useState(false);
    const [showMerchantPOS, setShowMerchantPOS] = useState(false);

    // Delivery Code Input
    const [deliveryCodeInput, setDeliveryCodeInput] = useState<string>('');

    // Live Tracking Ref
    const watchIdRef = useRef<number | null>(null);

    const [bankDetails, setBankDetails] = useState<{ pixKey: string, pixType: string } | null>(null);
    const { alert } = useDialog();

    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [p, shift] = await Promise.all([
                    cloud.getMyPartnerProfile(),
                    cloud.getCurrentShift()
                ]);
                setProfile(p);
                setCurrentShift(shift);

                // Fetch bank details (can be done in parallel but depends on profile/user)
                if (p) {
                    const client = cloud.getClient();
                    if (client) {
                        const { data: { user } } = await client.auth.getUser();
                        if (user) {
                            const { data } = await client.from('user_profiles').select('bank_details').eq('id', user.id).single();
                            if (data?.bank_details) {
                                setBankDetails({
                                    pixKey: data.bank_details.pixKey,
                                    pixType: data.bank_details.pixType
                                });
                            }
                        }
                    }
                }
            } catch (e: any) {
                // console.error("Failed to load partner area:", e);
                setError("Não foi possível carregar os dados do painel. Verifique sua conexão e tente novamente.");
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
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
            const nowIso = new Date().toISOString();
            const filtered = available.filter(r => r.status === 'PENDING' && (!('expires_at' in r) || (r as any).expires_at === null || String((r as any).expires_at) > nowIso));

            // Check for NEW requests
            const newItems = filtered.filter(r => !previousRequestIds.current.has(r.id));
            if (newItems.length > 0 && !loading) { // Avoid notifying on initial load if desired, or handle differently
                const hasDirect = newItems.some(r => r.partner_id === profile?.id);
                if (hasDirect) {
                    showNotification("Nova Entrega Direta recebida! Verifique agora.", 'success', { sound: true, vibrate: true });
                } else {
                    showNotification("Nova entrega disponível no radar.", 'info', { sound: true });
                }
            }

            // Update ref
            previousRequestIds.current = new Set(filtered.map(r => r.id));
            setRequests(filtered);
        } catch (e) { /* console.error(e); */ } finally { setLoading(false); }
    };

    useEffect(() => {
        if (activeTab === 'financial') {
            (async () => {
                try {
                    const s = await cloud.getPartnerFinancialSummary();
                    setSummary(s);
                } catch (e) {
                    // console.error(e);
                }
            })();
        }
    }, [activeTab]);

    // Auto refresh requests ONLY if shift is ACTIVE
    useEffect(() => {
        let interval: any;
        if (currentShift?.status === 'ACTIVE' && activeTab === 'deliveries' && profile?.verification_status === 'APPROVED') {
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
                (err) => { /* console.error("Error watching position", err) */ },
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


    const handleAccept = async (req: PartnerRequest) => { setProcessingAction(true); try { await cloud.acceptPartnerRequest(req.id); setActiveDelivery({ ...req, status: 'ACCEPTED' }); setRequests(prev => prev.filter(r => r.id !== req.id)); } catch (e: any) { await alert({ title: "Erro ao Aceitar", message: "Erro: " + e.message }); loadRequests(); } finally { setProcessingAction(false); } };
    const handleConfirmPickup = async () => { if (!activeDelivery) return; setProcessingAction(true); try { await cloud.partnerConfirmPickup(activeDelivery.id); setActiveDelivery(prev => prev ? { ...prev, status: 'IN_TRANSIT' } : null); } catch (e: any) { await alert({ title: "Erro ao Confirmar Coleta", message: "Erro: " + e.message }); } finally { setProcessingAction(false); } };
    const handleConfirmDelivery = async () => { if (!activeDelivery) return; setProcessingAction(true); try { await cloud.partnerConfirmDelivery(activeDelivery.id, deliveryCodeInput); await alert({ title: "Entrega Concluída", message: "Entrega concluída! Valor creditado." }); setRatingRequest(activeDelivery); setActiveDelivery(null); setDeliveryCodeInput(''); loadRequests(); } catch (e: any) { await alert({ title: "Erro ao Finalizar Entrega", message: "Erro: " + e.message }); } finally { setProcessingAction(false); } };
    const handleReportFailure = async () => { if (!activeDelivery || !failureReason) return; setProcessingAction(true); try { await cloud.partnerReportDeliveryFailure(activeDelivery.id, failureReason); setActiveDelivery(prev => prev ? { ...prev, status: 'AWAITING_STORE_DECISION', failure_reason: failureReason } : null); setShowFailureModal(false); } catch (e: any) { await alert({ title: "Erro ao Relatar Falha", message: "Erro: " + e.message }); } finally { setProcessingAction(false); } };
    const handleConfirmReturn = async () => { if (!activeDelivery) return; setProcessingAction(true); try { await cloud.partnerConfirmReturn(activeDelivery.id); await alert({ title: "Devolução Confirmada", message: "Devolução confirmada. Corrida finalizada." }); setActiveDelivery(null); loadRequests(); } catch (e: any) { await alert({ title: "Erro ao Confirmar Devolução", message: "Erro: " + e.message }); } finally { setProcessingAction(false); } };
    const handleCheckDecision = async () => await alert({ title: "Verificar Decisão", message: "Aguarde a notificação ou verifique novamente em instantes." });

    const handleRequestEmergency = async () => {
        if (!bankDetails?.pixKey) {
            await alert({ title: "Erro de PIX", message: "Erro: Chave PIX não encontrada." });
            return;
        }
        await alert({ title: "Indisponível", message: "Saque emergencial indisponível durante migração." });
        setShowWithdrawConfirm(false);
    };

    const handleRateStore = async (rating: number, comment: string) => {
        if (!ratingRequest) return;
        try {
            await cloud.submitRating(ratingRequest.id, rating, comment, 'PARTNER_TO_STORE');
            await alert({ title: "Avaliação Enviada", message: "Obrigado pela avaliação!" });
            setRatingRequest(null);
        } catch (e: any) {
            await alert({ title: "Erro ao Avaliar", message: "Erro: " + e.message });
        }
    };

    const handleWhatsAppContact = () => {
        if (!activeDelivery?.store?.phone_number) return;
        const phone = activeDelivery.store.phone_number.replace(/\D/g, '');
        const message = encodeURIComponent(`Olá! Sou o entregador da sua entrega #${activeDelivery.id.slice(0, 8)}.`);
        window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    };

    // GPS Navigation com alta precisão
    const handleOpenGpsModal = (address: string) => {
        setSelectedAddressForGps(address);
        setGpsModalOpen(true);
    };

    const launchGps = (app: 'waze' | 'google') => {
        if (!selectedAddressForGps) return;

        // Tentar obter localização atual para origem com alta precisão
        if (navigator.geolocation) {
            // Opções para forçar GPS real (não IP geolocation)
            const geoOptions = {
                enableHighAccuracy: true, // Força uso de GPS ao invés de WiFi/IP
                timeout: 10000, // Máximo 10 segundos para obter localização
                maximumAge: 0 // Não usar cache, forçar leitura nova
            };

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude: currentLat, longitude: currentLng } = position.coords;
                    console.log('📍 Localização GPS obtida:', { currentLat, currentLng, accuracy: position.coords.accuracy });

                    if (app === 'waze') {
                        // Waze com origem e destino
                        window.open(`https://waze.com/ul?q=${encodeURIComponent(selectedAddressForGps)}&from=${currentLat},${currentLng}&navigate=yes`, '_blank');
                    } else {
                        // Google Maps com Origem e Destino
                        window.open(`https://www.google.com/maps/dir/?api=1&origin=${currentLat},${currentLng}&destination=${encodeURIComponent(selectedAddressForGps)}&travelmode=driving`, '_blank');
                    }
                    setGpsModalOpen(false);
                },
                (error) => {
                    console.warn("Erro ao obter localização GPS:", error.message, error.code);
                    // Fallback: usar apenas destino se GPS falhar
                    if (app === 'waze') {
                        window.open(`https://waze.com/ul?q=${encodeURIComponent(selectedAddressForGps)}&navigate=yes`, '_blank');
                    } else {
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedAddressForGps)}&travelmode=driving`, '_blank');
                    }
                    setGpsModalOpen(false);
                },
                geoOptions // Aplicar opções de alta precisão
            );
        } else {
            // Fallback sem geolocation support
            if (app === 'waze') {
                window.open(`https://waze.com/ul?q=${encodeURIComponent(selectedAddressForGps)}&navigate=yes`, '_blank');
            } else {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedAddressForGps)}&travelmode=driving`, '_blank');
            }
            setGpsModalOpen(false);
        }
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
        } catch (e: any) { await alert({ title: "Erro ao Iniciar Turno", message: "Erro ao iniciar turno: " + e.message }); }
        setShiftLoading(false);
    };

    const handlePauseShift = async () => {
        if (!currentShift) return;
        setShiftLoading(true);
        try {
            await cloud.pauseWorkShift(currentShift.id);
            setCurrentShift({ ...currentShift, status: 'PAUSED', breaks: [...(currentShift.breaks || []), { start: new Date().toISOString() }] });
        } catch (e: any) { await alert({ title: "Erro ao Pausar Turno", message: "Erro ao pausar: " + e.message }); }
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
            setCurrentShift({ ...currentShift, status: 'ACTIVE', breaks: newBreaks });
        } catch (e: any) { await alert({ title: "Erro ao Retomar Turno", message: "Erro ao retomar: " + e.message }); }
        setShiftLoading(false);
    };

    const handleEndShift = async () => {
        if (!currentShift) return;
        setShiftLoading(true);
        try {
            await cloud.endWorkShift(currentShift.id);
            setCurrentShift(null);
            setRequests([]); // Clear requests
        } catch (e: any) { await alert({ title: "Erro ao Encerrar Turno", message: "Erro ao encerrar: " + e.message }); }
        setShiftLoading(false);
    };

    // --- CONDITIONAL RENDERS ---

    if (loading) return <PartnerAreaSkeleton />;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-center bg-red-50 dark:bg-red-900/20 rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-red-500 mb-2" />
                <p className="font-bold text-red-600 dark:text-red-300 mb-1">Ocorreu um Erro</p>
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-center bg-gray-100 dark:bg-gray-800 rounded-2xl">
                <UserX className="w-8 h-8 text-gray-400 mb-2" />
                <p className="font-bold text-gray-700 dark:text-gray-300">Perfil de Parceiro não Encontrado</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Não foi possível carregar seu perfil de parceiro.</p>
            </div>
        );
    }
    // NOVO: Bloqueio visual para entregadores comuns (sem barrar a navegação)
    if (userRole === 'delivery_person') {
        return (
            <ExclusiveLock
                title="Área do Parceiro"
                description="Esta área é exclusiva para Parceiros de Entrega verificados. Torne-se um parceiro para acessar turnos, entregas oficiais e muito mais."
                features={[
                    "Acesso a turnos de entrega",
                    "Recebimento de entregas oficiais",
                    "Ganhos por entrega e métricas",
                    "Acesso antecipado a novas áreas"
                ]}
                onAction={() => onNavigate('upgrade_to_partner')}
                actionLabel="Quero ser Parceiro"
            />
        );
    }

    // Only block if role is PARTNER and verification is not APPROVED
    if (userRole === 'delivery_partner' && profile?.verification_status !== 'APPROVED') {
        return <PartnerDocumentation profile={profile} onProfileUpdate={setProfile} />;
    }

    // Upgrade Flow
    if (showUpgradeFlow) {
        return (
            <div className="space-y-4">
                <button onClick={() => setShowUpgradeFlow(false)} className="flex items-center text-sm font-bold text-gray-500 hover:text-brand-600 mb-2">
                    <ChevronRight className="w-4 h-4 rotate-180 mr-1" /> Voltar
                </button>
                <PartnerDocumentation profile={profile} onProfileUpdate={setProfile} />
            </div>
        );
    }

    const renderShiftControl = () => {
        if (!currentShift) {
            return (
                <div className="bg-gray-900 dark:bg-gray-800 text-white p-6 rounded-3xl flex flex-col items-center text-center">
                    <div className="mb-4">
                        <h2 className="text-2xl font-black">Você está Offline</h2>
                        <p className="text-gray-400 text-sm">Inicie seu turno para receber entregas.</p>
                    </div>
                    <Button onClick={handleStartShiftClick} disabled={shiftLoading} className="w-full py-4 text-lg bg-green-600 hover:bg-green-500">
                        {shiftLoading ? <Loader2 className="animate-spin" /> : <><Play className="w-5 h-5 mr-2 fill-current" /> Iniciar Turno</>}
                    </Button>
                </div>
            );
        }

        const isPaused = currentShift.status === 'PAUSED';

        return (
            <div className={`p-6 rounded-3xl transition-all duration-500 ${isPaused ? 'bg-yellow-500 text-white' : 'bg-green-600 text-white'}`}>
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
                        <Clock className="w-6 h-6" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {isPaused ? (
                        <Button
                            onClick={handleResumeShift}
                            disabled={shiftLoading}
                            className="!bg-white !text-yellow-600 !hover:bg-white"
                        >
                            {shiftLoading ? <Loader2 className="animate-spin" /> : <><Play className="w-4 h-4 mr-2 fill-current" /> Retomar</>}
                        </Button>
                    ) : (
                        <Button
                            onClick={handlePauseShift}
                            disabled={shiftLoading}
                            className="!bg-white !text-green-600 !hover:bg-white border-none shadow-sm"
                        >
                            {shiftLoading ? <Loader2 className="animate-spin" /> : <><Pause className="w-4 h-4 mr-2 fill-current" /> Pausar</>}
                        </Button>
                    )}

                    <Button
                        onClick={handleEndShift}
                        disabled={shiftLoading}
                        className="!bg-white !text-red-600 !hover:bg-white border-none shadow-sm"
                    >
                        {shiftLoading ? <Loader2 className="animate-spin" /> : <><Square className="w-4 h-4 mr-2 fill-current" /> Encerrar</>}
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-24 animate-in fade-in relative">
            {/* Lock Overlay for Non-Partners */}
            {userRole !== 'delivery_partner' && (
                <div className="absolute inset-0 z-10 bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
                    <ExclusiveLock
                        title="Painel de Corridas"
                        description="Área exclusiva para parceiros verificados. Receba pedidos de lojas, gerencie seus turnos e aumente seus ganhos."
                    />
                </div>
            )}

            <div className="flex justify-between items-center px-1">
                <h1 className="text-xl font-bold dark:text-white">Painel do Parceiro</h1>
                <button
                    onClick={() => setShowNotifications(true)}
                    className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <Bell className="w-6 h-6 text-gray-700 dark:text-gray-300" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
                    )}
                </button>
            </div>

            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl overflow-x-auto no-scrollbar mb-2.5">
                <Button
                    variant="ghost"
                    onClick={() => setActiveTab('deliveries')}
                    className={`flex-1 flex flex-row items-center justify-center gap-2 h-auto py-3 rounded-xl transition-all ${activeTab === 'deliveries' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}`}
                >
                    <MapPin className="w-5 h-5" />
                    <span className="text-[10px] uppercase font-bold">Entregas</span>
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setActiveTab('financial')}
                    className={`flex-1 flex flex-row items-center justify-center gap-2 h-auto py-3 rounded-xl transition-all ${activeTab === 'financial' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}`}
                >
                    <DollarSign className="w-5 h-5" />
                    <span className="text-[10px] uppercase font-bold">Financeiro</span>
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setActiveTab('history')}
                    className={`flex-1 flex flex-row items-center justify-center gap-2 h-auto py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}`}
                >
                    <History className="w-5 h-5" />
                    <span className="text-[10px] uppercase font-bold">Histórico</span>
                </Button>
                <Button
                    variant="ghost"
                    onClick={() => setActiveTab('stores')}
                    className={`flex-1 flex flex-row items-center justify-center gap-2 h-auto py-3 rounded-xl transition-all ${activeTab === 'stores' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}`}
                >
                    <Store className="w-5 h-5" />
                    <span className="text-[10px] uppercase font-bold">Lojas</span>
                </Button>
            </div>

            {activeTab === 'deliveries' && (
                <>
                    <PromoSlider audience={userRole === 'store_partner' ? 'merchants' : 'drivers'} />
                    <ScorePanel />
                    <TipOfTheDay role={userRole} />
                    {renderShiftControl()}

                    {/* Quick Access & Tools Sections for Partners */}
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-sm px-2 mt-6">Acessos Rápidos</h3>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            <Button onClick={() => setActiveTab('financial')} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Ganhos</span>
                            </Button>
                            <Button onClick={() => setActiveTab('history')} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400">
                                    <HistoryIcon className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Histórico</span>
                            </Button>
                            <Button onClick={() => setActiveTab('stores')} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-full text-pink-600 dark:text-pink-400">
                                    <Store className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Minhas Lojas</span>
                            </Button>
                            <Button onClick={() => setShowNotifications(true)} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400">
                                    <Bell className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Avisos</span>
                            </Button>
                            <Button onClick={() => onNavigate('zebank')} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                    <Landmark className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">ZéBank</span>
                            </Button>
                            <Button onClick={() => setShowReferral(true)} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                                    <Gift className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Indicações</span>
                            </Button>
                            <Button onClick={() => onNavigate('score')} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-full text-brand-600 dark:text-brand-400">
                                    <Star className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Meu Score</span>
                            </Button>
                        </div>

                        <h3 className="font-bold text-gray-800 dark:text-white mb-3 text-sm px-2">Ferramentas</h3>
                        <div className="grid grid-cols-4 gap-2">
                            <Button onClick={() => setShowFuelCalc(true)} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400">
                                    <Fuel className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Combustível</span>
                            </Button>
                            <Button onClick={() => setShowRouteCalc(true)} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                                    <Calculator className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Calc. Rota</span>
                            </Button>
                            <Button onClick={() => setShowMaintenance(true)} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
                                    <Wrench className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Manutenção</span>
                            </Button>
                            <Button onClick={() => setShowMerchantPOS(true)} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-full text-teal-600 dark:text-teal-400">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">ZéPoint</span>
                            </Button>
                            <Button onClick={() => onNavigate('profile')} variant="outline" className="flex-col gap-1 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all h-auto">
                                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300">
                                    <User className="w-5 h-5" />
                                </div>
                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300">Perfil</span>
                            </Button>
                        </div>
                    </div>
                    {/* Active Delivery Card */}
                    {activeDelivery && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl  border-2 border-brand-500 animate-in zoom-in-95 mt-6">
                            <div className="flex justify-between items-start mb-4"><span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{activeDelivery.status === 'ACCEPTED' ? 'Vá para Coleta' : activeDelivery.status === 'IN_TRANSIT' ? 'Em Rota' : activeDelivery.status === 'AWAITING_STORE_DECISION' ? 'Aguardando Loja' : activeDelivery.status === 'RETURNING' ? 'Retornando à Loja' : activeDelivery.status}</span><p className="font-black text-xl text-green-600">{formatCurrency(activeDelivery.net_value_partner)}</p></div>
                            <div className="space-y-4 mb-6"><div className="flex items-start gap-3"><div className="mt-1"><MapPin className="w-5 h-5 text-blue-500" /></div><div><p className="text-xs text-gray-400 font-bold uppercase">Coleta</p><p className="font-medium dark:text-white text-sm">{activeDelivery.pickup_address}</p></div></div><div className="flex items-start gap-3"><div className="mt-1"><MapPin className="w-5 h-5 text-brand-500" /></div><div><p className="text-xs text-gray-400 font-bold uppercase">Entrega</p><p className="font-medium dark:text-white text-sm">{activeDelivery.delivery_address}</p></div></div></div>
                            <div className="space-y-3">
                                {activeDelivery.status === 'ACCEPTED' && (
                                    <>
                                        <Button fullWidth onClick={handleConfirmPickup} disabled={processingAction}>{processingAction ? <Loader2 className="animate-spin" /> : 'Cheguei na Coleta'}</Button>
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1" onClick={() => handleOpenGpsModal(activeDelivery.pickup_address)}><Navigation className="w-4 h-4 mr-2" /> GPS</Button>
                                            <Button variant="outline" className="flex-1" onClick={() => setShowChat(true)}><MessageCircle className="w-4 h-4 mr-2" /> Chat</Button>
                                            {activeDelivery.store?.phone_number && (
                                                <Button variant="outline" className="flex-1 text-green-600 border-green-200 bg-green-50" onClick={handleWhatsAppContact}><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp</Button>
                                            )}
                                        </div>
                                    </>
                                )}
                                {activeDelivery.status === 'IN_TRANSIT' && (
                                    <>
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center text-xs text-blue-600 mb-2 font-bold animate-pulse">Sua localização está sendo compartilhada com a loja.</div>
                                        <Button variant="outline" fullWidth onClick={() => handleOpenGpsModal(activeDelivery.delivery_address)}><Navigation className="w-4 h-4 mr-2" /> GPS / Waze / Maps</Button>
                                        <div className="flex gap-2">
                                            <Button variant="outline" className="flex-1" onClick={() => setShowChat(true)}><MessageCircle className="w-4 h-4 mr-2" /> Chat</Button>
                                            {activeDelivery.store?.phone_number && (
                                                <Button variant="outline" className="flex-1 text-green-600 border-green-200 bg-green-50" onClick={handleWhatsAppContact}><MessageCircle className="w-4 h-4 mr-2" /> WhatsApp</Button>
                                            )}
                                        </div>
                                        <CustomInput
                                            type="text"
                                            placeholder="Código de Entrega"
                                            value={deliveryCodeInput}
                                            onChange={e => setDeliveryCodeInput(e.target.value)}
                                            className="mb-3 text-center text-lg font-bold"
                                            maxLength={6}
                                        />
                                        <div className="flex gap-2"><Button fullWidth onClick={handleConfirmDelivery} disabled={processingAction || deliveryCodeInput.length !== 6} variant="success">{processingAction ? <Loader2 className="animate-spin" /> : 'Finalizar Entrega'}</Button><Button onClick={() => setShowFailureModal(true)} variant="danger" className="px-3"><AlertTriangle className="w-5 h-5" /></Button></div>
                                    </>
                                )}
                                {activeDelivery.status === 'AWAITING_STORE_DECISION' && (<div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl"><Loader2 className="w-8 h-8 animate-spin mx-auto text-yellow-600 mb-2" /><p className="text-sm font-bold text-yellow-700">Aguardando decisão da loja...</p><button onClick={handleCheckDecision} className="text-xs text-blue-500 underline mt-2">Verificar</button><button onClick={() => setShowChat(true)} className="text-xs text-brand-600 underline mt-2 block mx-auto">Chat com Loja</button></div>)}
                                {activeDelivery.status === 'RETURNING' && (<><div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl mb-2 text-center"><p className="text-sm font-bold text-red-600">Devolução Solicitada!</p><p className="text-xs text-gray-500">Volte para a coleta.</p></div><Button fullWidth onClick={handleConfirmReturn} disabled={processingAction}>{processingAction ? <Loader2 className="animate-spin" /> : 'Confirmar Devolução'}</Button></>)}
                            </div>
                        </div>
                    )}

                    {/* Available List */}
                    {currentShift?.status === 'ACTIVE' && !activeDelivery && (
                        <div className="mt-6">
                            <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2">
                                <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
                                Disponíveis {loading && <Loader2 className="inline w-4 h-4 animate-spin ml-2" />}
                            </h3>
                            {requests.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center">
                                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                                        <UserX className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma entrega disponível no momento.</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Aguarde, assim que uma loja solicitar, aparecerá aqui automaticamente.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">{requests.map(req => {
                                    const isDirect = req.partner_id === profile?.id;
                                    return (
                                        <div key={req.id} className={`bg-white dark:bg-gray-800 p-5 rounded-2xl border-l-4 ${isDirect ? 'border-purple-500 ring-2 ring-purple-100 dark:ring-purple-900' : 'border-brand-500'}`}>
                                            {isDirect && (
                                                <div className="mb-3">
                                                    <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide border border-purple-200 shadow-sm flex items-center w-fit gap-1">
                                                        <Star className="w-3 h-3 fill-current" /> Entrega Direta (Fixo)
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between mb-4">
                                                <span className={`font-bold text-sm px-2 py-1 rounded ${isDirect ? 'text-purple-700 bg-purple-100' : 'text-green-700 bg-green-100'}`}>{formatCurrency(req.net_value_partner)}</span>
                                                <span className="text-gray-400 text-xs font-bold">{req.distance_km} km</span>
                                            </div>
                                            <div className="space-y-2 mb-4">
                                                <p className="text-sm line-clamp-1"><span className="text-blue-500 font-bold">De:</span> {req.pickup_address}</p>
                                                <p className="text-sm line-clamp-1"><span className="text-brand-500 font-bold">Para:</span> {req.delivery_address}</p>
                                            </div>
                                            <Button fullWidth onClick={() => handleAccept(req)} disabled={processingAction} className={isDirect ? '!bg-purple-600 !hover:bg-purple-500' : ''}>
                                                {processingAction ? <Loader2 className="animate-spin" /> : 'Aceitar'}
                                            </Button>
                                        </div>
                                    );
                                })}</div>
                            )}
                        </div>
                    )}
                </>
            )}
            {activeTab === 'financial' && (
                <div className="space-y-6">
                    {/* Action Button for Emergency Withdraw (Only Partners) */}
                    {userRole === 'delivery_partner' && summary && summary.settings && (
                        <div className="mb-4">
                            <Button onClick={() => setShowWithdrawConfirm(true)} className="w-full bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                                <Wallet className="w-4 h-4" /> Solicitar Saque Emergencial
                            </Button>
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

            {
                showWithdrawConfirm && summary && summary.settings && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6  text-center">
                            <h3 className="text-xl font-bold dark:text-white mb-2">Saque Emergencial</h3>
                            <p className="text-sm text-gray-500 mb-4">{summary.settings.emergency_message}<br />Receba <strong>{formatCurrency(summary.max_emergency_value)}</strong> agora.</p>

                            {!bankDetails?.pixKey ? (
                                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-xs text-red-600 mb-4 font-bold flex flex-col items-center gap-2">
                                    <AlertTriangle className="w-6 h-6" />
                                    Você não possui uma chave PIX cadastrada.
                                    <Button onClick={() => onNavigate('profile')} size="sm" variant="outline" className="w-full mt-2 border-red-200 text-red-600 hover:bg-red-100">
                                        <Edit2 className="w-3 h-3 mr-1" /> Cadastrar no Perfil
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-xs text-green-600 dark:text-green-400 font-bold mb-4 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                                    Enviaremos para o PIX: {bankDetails.pixKey}
                                </p>
                            )}

                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => setShowWithdrawConfirm(false)} fullWidth>Cancelar</Button>
                                <Button onClick={handleRequestEmergency} disabled={processingWithdraw || !bankDetails?.pixKey} fullWidth>
                                    {processingWithdraw ? <Loader2 className="animate-spin" /> : 'Confirmar'}
                                </Button>
                            </div>
                        </div>
                    </div>

                )
            }
            {
                showFailureModal && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl p-6"><h3 className="font-bold dark:text-white mb-4">Relatar Problema</h3><textarea className="w-full p-3 bg-gray-50 dark:bg-gray-700 rounded-xl h-24 mb-4" placeholder="Motivo..." value={failureReason} onChange={e => setFailureReason(e.target.value)} /><div className="flex gap-2"><Button variant="outline" onClick={() => setShowFailureModal(false)} fullWidth>Cancelar</Button><Button onClick={handleReportFailure} disabled={!failureReason} fullWidth>Enviar</Button></div></div></div>
                )
            }

            {
                showSecurityCheck && (
                    <SecurityCheckModal
                        onVerified={handleSecurityVerified}
                        onClose={() => setShowSecurityCheck(false)}
                    />
                )
            }

            {
                ratingRequest && (
                    <RatingModal
                        isOpen={!!ratingRequest}
                        onClose={() => setRatingRequest(null)}
                        onSubmit={handleRateStore}
                        targetName={ratingRequest?.store?.name || 'Loja'}
                        title="Avaliar Loja"
                    />
                )
            }

            {
                showChat && activeDelivery && (
                    <ChatWindow
                        orderId={activeDelivery.id}
                        type="ORDER"
                        onClose={() => setShowChat(false)}
                        title={activeDelivery.store?.name || "Loja"}
                    />
                )
            }

            {
                showReferral && (
                    <ReferralProgram
                        userRole={userRole}
                        onClose={() => setShowReferral(false)}
                    />
                )
            }

            {showFuelCalc && <FuelCalculator onClose={() => setShowFuelCalc(false)} />}
            {showRouteCalc && <RouteCalculator onClose={() => setShowRouteCalc(false)} />}
            {showMaintenance && <Maintenance onClose={() => setShowMaintenance(false)} />}
            {showMerchantPOS && <MerchantPOS onClose={() => setShowMerchantPOS(false)} />}
            {showNotifications && <NotificationCenter onClose={() => setShowNotifications(false)} />}

            {/* GPS Selection Modal */}
            <BaseModal
                isOpen={gpsModalOpen}
                onClose={() => setGpsModalOpen(false)}
                title="Escolha o GPS"
                icon={<Navigation className="w-6 h-6 text-purple-600" />}
            >
                <div className="grid grid-cols-2 gap-4 p-4">
                    <button
                        onClick={() => launchGps('waze')}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-blue-900/30 rounded-2xl border-2 border-transparent hover:border-blue-400 transition-all group"
                    >
                        {/* Waze Icon */}
                        <div className="w-16 h-16 flex items-center justify-center rounded-xl group-hover:scale-110 transition-transform">
                            <img
                                src="/waze-icon.png"
                                alt="Waze"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <span className="font-bold text-gray-700 dark:text-gray-200">Waze</span>
                    </button>

                    <button
                        onClick={() => launchGps('google')}
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 hover:bg-green-50 dark:bg-gray-700 dark:hover:bg-green-900/30 rounded-2xl border-2 border-transparent hover:border-green-500 transition-all group"
                    >
                        {/* Google Maps Icon */}
                        <div className="w-16 h-16 flex items-center justify-center rounded-xl group-hover:scale-110 transition-transform">
                            <img
                                src="/google-maps-icon.png"
                                alt="Google Maps"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <span className="font-bold text-gray-700 dark:text-gray-200">Google Maps</span>
                    </button>
                </div>
            </BaseModal>

        </div >
    );
};
