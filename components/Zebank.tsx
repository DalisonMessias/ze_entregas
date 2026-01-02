
import React, { useState, useEffect, useRef } from 'react';
import { Wallet, Calendar, Clock, ChevronRight, TrendingUp, TrendingDown, Eye, EyeOff, Building, ArrowDownLeft, ArrowUpRight, DollarSign, PiggyBank, CreditCard, Send, Lock, Plus, ArrowLeftRight, Download, Filter, Search, CheckCircle, AlertTriangle, X, Store, Trash2, ShoppingBag, LockKeyhole, Unlock, Copy, Siren, Wifi, QrCode as QrIcon, Scan, Smartphone, Sliders, Zap } from 'lucide-react';
import * as cloud from '../services/cloud';
import { Loader2 } from 'lucide-react';
import { Logo } from './Logo';
import { UserRole, ZebankData, ZebankTransaction, ZebankCard, PayoutSummary } from '../types';
import { ExclusiveLock } from './ExclusiveLock';
import { Button } from './Button';
import { Skeleton } from './Skeleton';
import { MerchantPOS } from './MerchantPOS'; // Import MerchantPOS
import { useDialog } from '../utils/dialogService'; // Import useDialog
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';

// Declare globals from CDN scripts
declare const QRious: any;
declare const Html5QrcodeScanner: any;

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (dateString: string) => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Data inválida';
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return 'Data inválida';
    }
};

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

// --- TOAST COMPONENT ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'info', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] px-4 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-5 fade-in duration-300 ${type === 'success' ? 'bg-green-600 text-white' : type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'}`}>
            {type === 'success' && <CheckCircle className="w-4 h-4" />}
            {type === 'error' && <AlertTriangle className="w-4 h-4" />}
            {type === 'info' && <CheckCircle className="w-4 h-4" />}
            <span className="text-sm font-bold">{message}</span>
        </div>
    );
};

// --- QR OVERLAY COMPONENT ---
const CardQROverlay = ({ cardId, onClose }: { cardId: string, onClose: () => void }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const [timeLeft, setTimeLeft] = useState(30);
    const [qrValue, setQrValue] = useState<string>('');
    const [qrError, setQrError] = useState<string | null>(null);
    const [cardHeight, setCardHeight] = useState<number>(0);
    const [cardWidth, setCardWidth] = useState<number>(0);
    const [contentWidth, setContentWidth] = useState<number>(0);
    const [contentHeight, setContentHeight] = useState<number>(0);
    const [qrBoxSize, setQrBoxSize] = useState<number>(0);
    const [computedQrSize, setComputedQrSize] = useState<number>(240);

    // gerar token e iniciar contador
    useEffect(() => {
        const generate = async () => {
            try {
                const token = await cloud.generateCardQRToken(cardId);
                setQrValue(token);
            } catch (e: any) {
                const msg = e?.message || 'Falha ao gerar QR do cartão';
                setQrError(msg);
                console.error('[error] QR Card', msg);
            }
        };
        generate();

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    onClose();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const parentEl = overlayRef.current?.parentElement || null;
        const rect = parentEl ? parentEl.getBoundingClientRect() : { width: 0, height: 0 } as DOMRect;
        const h = rect.height || 0;
        const w = rect.width || 0;
        setCardHeight(h);
        setCardWidth(w);
        const cw = w > 0 ? Math.floor(w * 0.75) : 280;
        const ch = h > 0 ? Math.floor(h * 0.75) : 220;
        setContentWidth(cw);
        setContentHeight(ch);
        const base = Math.floor(Math.min(w, h) * 0.42);
        const box = Math.max(140, Math.min(260, base));
        setQrBoxSize(box);
        setComputedQrSize(box);
        if (box >= h || box >= w) {
            setQrError('Elemento de QR ultrapassa o tamanho permitido');
        }
    }, []);

    // renderizar QR no canvas
    useEffect(() => {
        if (!qrValue || !canvasRef.current) return;
        try {
            if (typeof QRious !== 'undefined') {
                new QRious({
                    element: canvasRef.current,
                    value: qrValue,
                    size: computedQrSize,
                    background: 'white',
                    foreground: 'black',
                    level: 'H'
                });
            } else {
                setQrError('Biblioteca de QR não carregada');
            }
        } catch (e: any) {
            const msg = e?.message || 'Falha ao renderizar QR';
            setQrError(msg);
            console.error('[error] QR Render', msg);
        }
    }, [qrValue, computedQrSize]);

    return (
        <div ref={overlayRef} className="absolute inset-0 bg-white z-30 flex flex-col items-center justify-center p-6 rounded-2xl animate-in fade-in text-gray-900">
            <div className="w-full" style={{ width: contentWidth, height: contentHeight, maxWidth: contentWidth, maxHeight: contentHeight }}>
                <h4 className="text-base font-black mb-3 text-center">QR Code Seguro</h4>
                <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-3 rounded-2xl shadow-lg border border-gray-200 flex items-center justify-center" style={{ width: qrBoxSize, height: qrBoxSize }}>
                        <canvas
                            ref={canvasRef}
                            width={computedQrSize}
                            height={computedQrSize}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', margin: 'auto', display: 'block' }}
                            className="w-44 h-44 md:w-56 md:h-56"
                        />
                    </div>
                    {qrError ? (
                        <p className="text-xs font-bold text-red-600">{qrError}</p>
                    ) : (
                        <p className="text-xs text-gray-500 font-bold">Aponte a câmera para pagar</p>
                    )}
                    <p className="text-xs text-red-500 font-bold animate-pulse">Expira em {timeLeft}s</p>
                    <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">Fechar</Button>
                </div>
            </div>
        </div>
    );
};

export const ZebankSkeleton = ({ isNormalDriver }: { isNormalDriver: boolean }) => (
    <div className="space-y-8 animate-in fade-in pb-24 px-4 sm:px-8 md:px-16">
        {isNormalDriver ? (
            <>
                <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-xl text-green-500">
                            <Skeleton className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-64 mt-2" />
                        </div>
                    </div>
                    <Skeleton className="h-12 w-full" />
                </div>

                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 rounded-[32px] shadow-2xl shadow-gray-900/20 relative overflow-hidden">
                    <div className="absolute -right-16 -top-10 opacity-10">
                        <Logo className="h-48 w-auto" variant="full-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-44 mt-2" />
                            </div>
                            <div className="text-right">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-5 w-24 mt-2" />
                            </div>
                        </div>
                        <div className="mt-8 border-t border-white/10 pt-6 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <PiggyBank className="w-4 h-4 text-gray-400" />
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <Skeleton className="h-5 w-20" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600">
                            <Skeleton className="w-5 h-5" />
                        </div>
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
                            <Skeleton className="w-5 h-5" />
                        </div>
                        <Skeleton className="h-3 w-16" />
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 px-2">Extrato Pessoal</h3>
                    <div className="space-y-2">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200" />
                                <div>
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-24 mt-1" />
                                </div>
                            </div>
                            <Skeleton className="h-4 w-16" />
                        </div>
                    </div>
                </div>
            </>
        ) : (
            <>
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 rounded-[32px] shadow-2xl shadow-gray-900/20 relative overflow-hidden">
                    <div className="absolute -right-16 -top-10 opacity-10">
                        <Logo className="h-48 w-auto" variant="full-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-44 mt-2" />
                            </div>
                            <div className="text-right">
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-5 w-24 mt-2" />
                            </div>
                        </div>
                        <div className="mt-8 border-t border-white/10 pt-6 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <PiggyBank className="w-4 h-4 text-gray-400" />
                                <Skeleton className="h-3 w-16" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                            <Skeleton className="h-5 w-20" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="p-3 bg-gray-100 dark:bg-gray-900/30 rounded-full">
                                <Skeleton className="w-5 h-5" />
                            </div>
                            <Skeleton className="h-3 w-16" />
                        </div>
                    ))}
                </div>

                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 px-2">Meus Cartões</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[0, 1].map(i => (
                            <div key={i} className="p-5 rounded-2xl shadow-lg relative overflow-hidden transition-all duration-300 flex flex-col h-auto bg-gray-200">
                                <div className="relative z-20 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <CardChip />
                                            <Logo className="h-5 w-auto" variant="full-white" />
                                        </div>
                                        <VisaLogo />
                                    </div>
                                    <div className="flex-1">
                                        <Skeleton className="h-5 w-40" />
                                    </div>
                                    <div className="flex justify-between items-end text-xs mt-4">
                                        <div>
                                            <Skeleton className="h-3 w-24" />
                                            <Skeleton className="h-3 w-24 mt-1" />
                                        </div>
                                        <div className="flex gap-4 text-right">
                                            <div>
                                                <Skeleton className="h-3 w-16" />
                                                <Skeleton className="h-3 w-16 mt-1" />
                                            </div>
                                            <div>
                                                <Skeleton className="h-3 w-10" />
                                                <Skeleton className="h-3 w-10 mt-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                                    <Skeleton className="h-8 w-full rounded-lg" />
                                    <Skeleton className="h-8 w-full rounded-lg" />
                                    <Skeleton className="h-8 w-12 rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 px-2">Extrato Pessoal</h3>
                    <div className="space-y-2">
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200" />
                                <div>
                                    <Skeleton className="h-4 w-40" />
                                    <Skeleton className="h-3 w-24 mt-1" />
                                </div>
                            </div>
                            <Skeleton className="h-4 w-16" />
                        </div>
                    </div>
                </div>
            </>
        )}
    </div>
);

// --- NEW CARD DESIGN COMPONENTS ---
const getLevelColorClass = (level: string | undefined) => {
    switch (level) {
        case 'BRONZE': return 'bg-gradient-to-br from-amber-800 to-amber-900';
        case 'SILVER': return 'bg-gradient-to-br from-slate-500 to-slate-700';
        case 'GOLD': return 'bg-gradient-to-br from-yellow-500 to-amber-600';
        case 'PLATINUM': return 'bg-gradient-to-br from-gray-800 to-black';
        case 'DIAMOND': return 'bg-gradient-to-br from-sky-500 to-indigo-600';
        default: return 'bg-gray-800';
    }
};

const CardChip = () => (
    <div className="w-12 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-md flex items-center justify-center shadow-inner">
        <div className="w-10 h-6 bg-yellow-500/50 border border-yellow-700/50 rounded-sm"></div>
    </div>
);

const MasterCardLogo = () => (
    <svg viewBox="0 0 40 25" width="40" height="25" className="opacity-80">
        <circle cx="12.5" cy="12.5" r="12.5" fill="#EA001B" />
        <circle cx="27.5" cy="12.5" r="12.5" fill="#F79E1B" fillOpacity="0.8" />
    </svg>
);

const VisaLogo = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="50px" viewBox="0 0 1000 324.43">
        <title>visa-17</title>
        <polygon points="433.5 319.03 351.91 319.03 402.91 5.61 484.51 5.61 433.5 319.03" fill="#fff"></polygon>
        <path d="M283.26,343,205.47,558.55l-9.21-46.43v0L168.81,371.21S165.5,343,130.1,343H1.51L0,348.28s39.34,8.18,85.35,35.84L156.24,656.4h85L371.08,343Z" transform="translate(0 -337.37)" fill="#fff"></path>
        <path d="M925.08,656.4H1000L934.67,343h-65.6c-30.29,0-37.67,23.36-37.67,23.36L709.71,656.4h85l17-46.55H915.51ZM835.29,545.53l42.88-117.29,24.12,117.29Z" transform="translate(0 -337.37)" fill="#fff"></path>
        <path d="M716.09,418.35,727.73,351s-35.93-13.66-73.39-13.66c-40.49,0-136.65,17.71-136.65,103.76,0,81,112.86,82,112.86,124.5s-101.22,34.92-134.63,8.1l-12.14,70.36s36.43,17.71,92.11,17.71S715.59,633,715.59,554.49c0-81.48-113.88-89.07-113.88-124.5S681.17,399.11,716.09,418.35Z" transform="translate(0 -337.37)" fill="#fff"></path>
        <path d="M196.27,512.14,168.81,371.21S165.5,343,130.1,343H1.51L0,348.28s61.81,12.82,121.11,60.81C177.78,455,196.27,512.14,196.27,512.14Z" transform="translate(0 -337.37)" fill="#f6a723"></path>
    </svg>

);


interface ZebankProps {
    userRole: UserRole;
}

export const Zebank: React.FC<ZebankProps> = ({ userRole }) => {
    const [data, setData] = useState<ZebankData | null>(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [showMerchantPOS, setShowMerchantPOS] = useState(false); // New state for POS modal

    // Modals state
    const [showP2P, setShowP2P] = useState(false);
    const [showSavings, setShowSavings] = useState(false);
    const [showNewCard, setShowNewCard] = useState(false);
    const [showCardOptions, setShowCardOptions] = useState<ZebankCard | null>(null);
    const [showCardQR, setShowCardQR] = useState<string | null>(null);
    const [showTestConfirm, setShowTestConfirm] = useState<ZebankCard | null>(null);
    const [showLimitModal, setShowLimitModal] = useState<ZebankCard | null>(null);

    // Forms state
    const [p2pForm, setP2pForm] = useState({ code: '', amount: '' });
    const [savingsForm, setSavingsForm] = useState({ action: 'DEPOSIT', amount: '' });
    const [newCardForm, setNewCardForm] = useState({ name: '' });
    const [limitForm, setLimitForm] = useState(100);
    const [processing, setProcessing] = useState(false);
    const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

    const { confirm } = useDialog(); // Use the custom dialog service

    const loadData = async () => {
        try {
            const d = await cloud.getZebankDashboardData();
            setData(d);
        } catch (e: any) {
            const errorMessage = e instanceof Error ? e.message : (typeof e === 'object' && e !== null && 'message' in e && typeof e.message === 'string') ? e.message : 'Um erro desconhecido ocorreu ao carregar o Zebank.';
            setToast({ type: 'error', message: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const isNormalDriver = userRole === 'delivery_person';

    if (loading) return <ZebankSkeleton isNormalDriver={isNormalDriver} />;
    if (!data) return <div>Erro ao carregar dados.</div>;

    const handleP2PTransfer = async () => {
        setProcessing(true);
        try {
            const amount = parseFloat(p2pForm.amount.replace(/\./g, '').replace(',', '.'));
            await cloud.zebankTransferP2P(p2pForm.code.toUpperCase(), amount);
            setToast({ type: 'success', message: 'Transferência enviada!' });
            setShowP2P(false);
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleSavings = async () => {
        setProcessing(true);
        try {
            const amount = parseFloat(savingsForm.amount.replace(/\./g, '').replace(',', '.'));
            await cloud.zebankManageSavings(savingsForm.action as 'DEPOSIT' | 'RETRIEVE', amount);
            setToast({ type: 'success', message: 'Operação realizada!' });
            setShowSavings(false);
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleCreateCard = async () => {
        setProcessing(true);
        try {
            await cloud.zebankCreateVirtualCard(newCardForm.name);
            setToast({ type: 'success', message: 'Cartão criado!' });
            setShowNewCard(false);
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message });
        } finally {
            setProcessing(false);
        }
    };

    const handleToggleCardLock = async (card: ZebankCard) => {
        const newStatus = card.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE';
        try {
            await cloud.zebankToggleCardStatus(card.id, newStatus);
            setToast({ type: 'info', message: `Cartão ${newStatus === 'ACTIVE' ? 'desbloqueado' : 'bloqueado'}.` });
            setShowCardOptions(null);
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message });
        }
    };

    const handleDeleteCard = async (cardId: string) => {
        const result = await confirm({ title: "Excluir Cartão", message: "Tem certeza que deseja excluir este cartão permanentemente?" });
        if (!result) return;
        try {
            await cloud.zebankDeleteCard(cardId);
            setToast({ type: 'info', message: `Cartão excluído.` });
            setShowCardOptions(null);
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message });
        }
    };

    const handleTestCard = async () => {
        if (!showTestConfirm) return;
        setProcessing(true);
        try {
            await cloud.simulateCardTransaction(showTestConfirm.id, 0.50, 'Teste de Validação');
            setToast({ type: 'success', message: 'Cartão validado com sucesso!' });
            setShowTestConfirm(null);
            loadData(); // To refresh transactions list
        } catch (e: any) {
            setToast({ type: 'error', message: e.message || "Falha na simulação." });
        } finally {
            setProcessing(false);
        }
    };

    const handleOpenLimitModal = (card: ZebankCard) => {
        setLimitForm(card.spending_limit_percent || 100);
        setShowLimitModal(card);
        setShowCardOptions(null);
    };

    const handleUpdateLimit = async () => {
        if (!showLimitModal) return;
        setProcessing(true);
        try {
            await cloud.updateCardLimit(showLimitModal.id, limitForm, 'USER');
            setToast({ type: 'success', message: 'Limite atualizado!' });
            setShowLimitModal(null);
            loadData();
        } catch (e: any) {
            setToast({ type: 'error', message: e.message });
        } finally {
            setProcessing(false);
        }
    };

    // Inline invite card placed at the top for normal drivers
    const InviteCard = () => (
        <div className="w-full max-w-lg bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-4 mb-6">
                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-xl text-green-500">
                    <Zap className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">ZeBank</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">A carteira digital ZeBank é um benefício exclusivo para entregadores parceiros.</p>
                </div>
            </div>
            <Button className="mt-6" fullWidth onClick={() => { const evt = new CustomEvent('navigateToTab', { detail: { tab: 'upgrade_to_partner' } }); window.dispatchEvent(evt); }}>
                <Zap className="w-4 h-4 mr-2" /> Torne-se um Parceiro Verificado
            </Button>
        </div>
    );

    if (isNormalDriver) {
        return (
            <div className="space-y-8 animate-in fade-in pb-24 px-4 sm:px-8 md:px-16">
                {/* Invite card at the very top */}
                <InviteCard />
                <div className="bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-1 overflow-x-auto no-scrollbar">
                    <button className="flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap">Visão Geral</button>
                    <button className="flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap">Extrato</button>
                    <button className="flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap">Cartões</button>
                    <button className="flex-1 py-2 px-3 rounded-lg text-xs font-bold whitespace-nowrap">Maquininha</button>
                </div>

                {/* Main Balance Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 rounded-[32px] shadow-2xl shadow-gray-900/20 relative overflow-hidden">
                    <div className="absolute -right-16 -top-10 opacity-10">
                        <Logo className="h-48 w-auto" variant="full-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-gray-400 text-sm font-medium">Saldo em Conta</p>
                                <h2 className="text-4xl font-black">{formatCurrency(data.balance)}</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-gray-400 text-[10px] font-bold uppercase">Código</p>
                                <p className="font-mono text-lg font-bold">{data.my_code}</p>
                            </div>
                        </div>
                        <div className="mt-8 border-t border-white/10 pt-6 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <PiggyBank className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-400">Cofrinho:</span>
                                <span className="font-bold">{formatCurrency((data.cofrinho_balance ?? data.savings_balance) || 0)}</span>
                            </div>
                            <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded">{data.partner_level}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions (only allowed ones) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button onClick={() => setShowP2P(true)} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400"><Send className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Transferir</span>
                    </button>
                    <button onClick={() => setShowSavings(true)} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400"><PiggyBank className="w-5 h-5" /></div>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Depositar no Cofrinho</span>
                    </button>
                </div>

                {/* Recent Transactions */}
                <div>
                    <h3 className="font-bold text-gray-800 dark:text-white mb-4 px-2">Extrato Pessoal</h3>
                    <div className="space-y-2">
                        {data.recent_transactions.length === 0 && <p className="text-center text-sm text-gray-400 py-8">Nenhuma transação recente.</p>}
                        {data.recent_transactions.map(tx => (
                            <div key={tx.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.direction === 'IN' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                        {tx.direction === 'IN' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{tx.description}</p>
                                        <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                                    </div>
                                </div>
                                <span className={`font-bold ${tx.direction === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                    {tx.direction === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Allowed Modals only */}
                {showP2P && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-6">
                            <div className="flex justify-between"><h3 className="font-bold text-lg dark:text-white">Transferir para Parceiro</h3><button onClick={() => setShowP2P(false)}><X /></button></div>
                            <CustomInput type="text" placeholder="Código do Parceiro" value={p2pForm.code} onChange={e => setP2pForm({ ...p2pForm, code: e.target.value })} />
                            <CustomInput mask="currency" placeholder="Valor (R$)" value={p2pForm.amount} onChange={e => setP2pForm({ ...p2pForm, amount: e.target.value })} />
                            <Button fullWidth onClick={handleP2PTransfer} disabled={processing}>{processing ? <Loader2 className="animate-spin" /> : 'Confirmar'}</Button>
                        </div>
                    </div>
                )}
                {showSavings && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-6">
                            <div className="flex justify-between"><h3 className="font-bold text-lg dark:text-white">Cofrinho: Depositar / Resgatar</h3><button onClick={() => setShowSavings(false)}><X /></button></div>
                            <CustomSelect
                                value={savingsForm.action}
                                onChange={val => setSavingsForm({ ...savingsForm, action: val })}
                                options={[
                                    { label: 'Depositar', value: 'DEPOSIT' },
                                    { label: 'Resgatar', value: 'RETRIEVE' }
                                ]}
                            />
                            <CustomInput mask="currency" placeholder="Valor (R$)" value={savingsForm.amount} onChange={e => setSavingsForm({ ...savingsForm, amount: e.target.value })} />
                            <Button fullWidth onClick={handleSavings} disabled={processing}>{processing ? <Loader2 className="animate-spin" /> : 'Confirmar'}</Button>
                            {data && (
                                <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center justify-between">
                                        <span>Rendimento acumulado</span>
                                        <span className="font-bold text-green-600">{formatCurrency((data.cofrinho_accrued_yield ?? 0))}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Próxima liberação de resgate</span>
                                        <span className="font-mono">{data.cofrinho_next_withdrawal_date || '---'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Taxa configurada</span>
                                        <span className="font-mono">{data.cofrinho_rate || '---'}</span>
                                    </div>
                                    <div>
                                        <span className="block">Regras</span>
                                        <span className="block font-mono break-words">{data.cofrinho_rules || '---'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in pb-24 px-4 sm:px-8 md:px-16">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Main Balance Card */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 rounded-[32px] shadow-2xl shadow-gray-900/20 relative overflow-hidden">
                <div className="absolute -right-16 -top-10 opacity-10">
                    <Logo className="h-48 w-auto" variant="full-white" />
                </div>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-400 text-sm font-medium">Saldo em Conta</p>
                            <h2 className="text-4xl font-black">{formatCurrency(data.balance)}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-gray-400 text-[10px] font-bold uppercase">Código</p>
                            <p className="font-mono text-lg font-bold">{data.my_code}</p>
                        </div>
                    </div>

                    <div className="mt-8 border-t border-white/10 pt-6 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <PiggyBank className="w-4 h-4 text-gray-400" />
                            <span className="text-xs text-gray-400">Cofrinho:</span>
                            <span className="font-bold">{formatCurrency((data.cofrinho_balance ?? data.savings_balance) || 0)}</span>
                        </div>
                        <span className="text-xs font-bold bg-white/10 px-2 py-1 rounded">{data.partner_level}</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button onClick={() => setShowP2P(true)} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400"><Send className="w-5 h-5" /></div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Transferir</span>
                </button>
                <button onClick={() => setShowSavings(true)} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400"><PiggyBank className="w-5 h-5" /></div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Depositar no Cofrinho</span>
                </button>
                <button onClick={() => setShowNewCard(true)} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full text-purple-600 dark:text-purple-400"><CreditCard className="w-5 h-5" /></div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Novo Cartão</span>
                </button>
                <button onClick={() => setShowMerchantPOS(true)} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full text-orange-600 dark:text-orange-400"><Smartphone className="w-5 h-5" /></div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Maquininha</span>
                </button>
            </div>

            {/* Cards Section */}
            <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 px-2">Meus Cartões</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.cards?.map((card, index) => {
                        const isBlocked = card.status !== 'ACTIVE';
                        const showQr = showCardQR === card.id;

                        const cardColor = index === 0
                            ? getLevelColorClass(data.partner_level)
                            : 'bg-gradient-to-br from-brand-600 to-brand-800';

                        const CardLogo = index === 0 ? MasterCardLogo : VisaLogo;

                        return (
                            <div key={card.id} className={`p-5 rounded-2xl shadow-lg relative overflow-hidden transition-all duration-300 flex flex-col h-auto ${isBlocked ? 'bg-gray-200' : cardColor}`}>

                                {showQr && <CardQROverlay cardId={card.id} onClose={() => setShowCardQR(null)} />}

                                <div className="relative z-20 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <CardChip />
                                            <Logo className="h-5 w-auto" variant="full-white" />
                                        </div>
                                        <CardLogo />
                                    </div>
                                    <div className="flex-1">
                                        <p className={`font-mono text-xl tracking-widest ${isBlocked ? 'text-gray-500' : 'text-white'}`}>
                                            {showSensitive[card.id] ? card.card_number?.replace(/(\d{4})/g, '$1 ').trim() : `**** **** **** ${card.card_last_four}`}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-end text-xs mt-4">
                                        <div className={`${isBlocked ? 'text-gray-600' : 'text-white'}`}>
                                            <p className="opacity-70 uppercase text-[10px]">Titular</p>
                                            <p className="font-bold uppercase tracking-wider">{card.card_holder}</p>
                                        </div>
                                        <div className="flex gap-4 text-right">
                                            <div className={`${isBlocked ? 'text-gray-600' : 'text-white'}`}>
                                                <p className="opacity-70 uppercase text-[10px]">Validade</p>
                                                <p className="font-bold font-mono tracking-wider">{card.expiration_date}</p>
                                            </div>
                                            <div className={`${isBlocked ? 'text-gray-600' : 'text-white'}`}>
                                                <p className="opacity-70 uppercase text-[10px]">CVV</p>
                                                <p className="font-bold font-mono tracking-wider">{showSensitive[card.id] ? card.cvv : '***'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons outside the main card body */}
                                <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                                    <button onClick={() => setShowSensitive(p => ({ ...p, [card.id]: !p[card.id] }))} className={`flex-1 text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-1 ${isBlocked ? 'bg-gray-300/50 text-gray-700' : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white'}`}>
                                        {showSensitive[card.id] ? <EyeOff size={14} /> : <Eye size={14} />} Ver
                                    </button>
                                    <button onClick={() => setShowCardQR(card.id)} disabled={isBlocked} className={`flex-1 text-xs py-2 rounded-lg font-bold flex items-center justify-center gap-1 ${isBlocked ? 'bg-gray-300/50 text-gray-700 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white'}`}><QrIcon size={14} /> Pagar</button>
                                    <button onClick={() => setShowCardOptions(card)} className={`px-3 py-2 rounded-lg font-bold ${isBlocked ? 'bg-gray-300/50 text-gray-700' : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white'}`}>•••</button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Recent Transactions */}
            <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-4 px-2">Extrato Pessoal</h3>
                <div className="space-y-2">
                    {data.recent_transactions.length === 0 && <p className="text-center text-sm text-gray-400 py-8">Nenhuma transação recente.</p>}
                    {data.recent_transactions.map(tx => (
                        <div key={tx.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.direction === 'IN' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {tx.direction === 'IN' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-gray-900 dark:text-white">{tx.description}</p>
                                    <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                                </div>
                            </div>
                            <span className={`font-bold ${tx.direction === 'IN' ? 'text-green-600' : 'text-red-600'}`}>
                                {tx.direction === 'IN' ? '+' : '-'}{formatCurrency(tx.amount)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* MODALS */}
            {showP2P && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-6">
                        <div className="flex justify-between"><h3 className="font-bold text-lg dark:text-white">Transferir para Parceiro</h3><button onClick={() => setShowP2P(false)}><X /></button></div>
                        <CustomInput type="text" placeholder="Código do Parceiro" value={p2pForm.code} onChange={e => setP2pForm({ ...p2pForm, code: e.target.value })} />
                        <CustomInput mask="currency" placeholder="Valor (R$)" value={p2pForm.amount} onChange={e => setP2pForm({ ...p2pForm, amount: e.target.value })} />
                        <Button fullWidth onClick={handleP2PTransfer} disabled={processing}>{processing ? <Loader2 className="animate-spin" /> : 'Confirmar'}</Button>
                    </div>
                </div>
            )}
            {showSavings && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-6">
                        <div className="flex justify-between"><h3 className="font-bold text-lg dark:text-white">Guardar / Resgatar</h3><button onClick={() => setShowSavings(false)}><X /></button></div>
                        <CustomSelect
                            value={savingsForm.action}
                            onChange={val => setSavingsForm({ ...savingsForm, action: val })}
                            options={[
                                { label: 'Guardar', value: 'DEPOSIT' },
                                { label: 'Resgatar', value: 'RETRIEVE' }
                            ]}
                        />
                        <CustomInput mask="currency" placeholder="Valor (R$)" value={savingsForm.amount} onChange={e => setSavingsForm({ ...savingsForm, amount: e.target.value })} />
                        <Button fullWidth onClick={handleSavings} disabled={processing}>{processing ? <Loader2 className="animate-spin" /> : 'Confirmar'}</Button>
                    </div>
                </div>
            )}
            {showNewCard && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-6">
                        <div className="flex justify-between"><h3 className="font-bold text-lg dark:text-white">Criar Cartão Virtual</h3><button onClick={() => setShowNewCard(false)}><X /></button></div>
                        <CustomInput type="text" placeholder="Nome no Cartão" value={newCardForm.name} onChange={e => setNewCardForm({ name: e.target.value })} />
                        <Button fullWidth onClick={handleCreateCard} disabled={processing}>{processing ? <Loader2 className="animate-spin" /> : 'Gerar Cartão'}</Button>
                    </div>
                </div>
            )}
            {showCardOptions && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl p-4 shadow-2xl space-y-3">
                        <button onClick={() => handleToggleCardLock(showCardOptions)} className="w-full p-3 text-sm font-bold flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">{showCardOptions.status === 'ACTIVE' ? <LockKeyhole size={16} /> : <Unlock size={16} />} {showCardOptions.status === 'ACTIVE' ? 'Bloquear' : 'Desbloquear'}</button>
                        <button onClick={() => handleOpenLimitModal(showCardOptions)} className="w-full p-3 text-sm font-bold flex items-center gap-2 hover:bg-blue-50 text-blue-600 dark:hover:bg-blue-900/20 rounded-lg"><Sliders size={16} /> Ajustar Limite</button>
                        <button onClick={() => { setShowCardOptions(null); setShowTestConfirm(showCardOptions); }} className="w-full p-3 text-sm font-bold flex items-center gap-2 hover:bg-yellow-50 text-yellow-600 dark:hover:bg-yellow-900/20 rounded-lg"><Siren size={16} /> Testar Cartão</button>
                        <button onClick={() => handleDeleteCard(showCardOptions.id)} className="w-full p-3 text-sm font-bold flex items-center gap-2 hover:bg-red-50 text-red-500 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={16} /> Excluir Cartão</button>
                        <Button fullWidth variant="outline" onClick={() => setShowCardOptions(null)} className="mt-2">Fechar</Button>
                    </div>
                </div>
            )}
            {showTestConfirm && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-6 text-center">
                        <Siren className="w-12 h-12 text-yellow-500 mx-auto" />
                        <h3 className="font-bold text-lg dark:text-white">Testar Validação do Cartão?</h3>
                        <p className="text-sm text-gray-500">Uma transação de R$ 0,50 será simulada para o "Teste de Validação". <strong className="dark:text-white">Este valor NÃO será debitado do seu saldo.</strong></p>
                        <div className="flex gap-2">
                            <Button variant="outline" fullWidth onClick={() => setShowTestConfirm(null)}>Cancelar</Button>
                            <Button fullWidth onClick={handleTestCard} disabled={processing} className="bg-yellow-500 hover:bg-yellow-600">
                                {processing ? <Loader2 className="animate-spin" /> : 'Confirmar Teste'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showLimitModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-6">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-lg dark:text-white">Limite do Cartão</h3>
                            <button onClick={() => setShowLimitModal(null)}><X className="w-5 h-5" /></button>
                        </div>

                        <p className="text-sm text-gray-500 mb-4">
                            Defina qual porcentagem do seu saldo atual pode ser usada por este cartão.
                        </p>

                        <div className="space-y-6">
                            <div className="relative pt-6 pb-2">
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={limitForm}
                                    onChange={(e) => setLimitForm(Number(e.target.value))}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-brand-600"
                                />
                                <div className="flex justify-between text-xs text-gray-400 mt-2 font-bold">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl text-center border border-gray-200 dark:border-gray-600">
                                <p className="text-xs text-gray-500 uppercase font-bold mb-1">Limite Atual Calculado</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">
                                    {formatCurrency((data?.balance || 0) * (limitForm / 100))}
                                </p>
                                <p className="text-xs text-brand-600 font-bold mt-1">({limitForm}% do Saldo)</p>
                            </div>

                            <Button fullWidth onClick={handleUpdateLimit} disabled={processing}>
                                {processing ? <Loader2 className="animate-spin" /> : 'Salvar Limite'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showMerchantPOS && <MerchantPOS onClose={() => setShowMerchantPOS(false)} />}
        </div>
    );
};
