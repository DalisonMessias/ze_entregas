import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Smartphone, Lock, User, QrCode, CheckCircle, AlertTriangle, X, DollarSign, CreditCard, RefreshCw, Loader2, Scan, PowerOff, ArrowLeft, Copy, Delete, Check, ArrowRight, Building, Bike, ChevronRight, History, Settings, ChevronUp, ChevronDown, Calculator, Percent, ShieldCheck, Wifi, Database, Share2, Ticket, WifiOff, Users, Server, Download, TestTube, BatteryCharging, BatteryFull, BatteryMedium, BatteryLow, BatteryWarning, Signal, ArrowDown, FileText, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { UserTerminal, UserTerminalHistoryItem, PartnerFeeSettings, FinancialStatementItem, ShopSettings, ShopCoupon, SalesSimulation, UserRole, AssociatedStore, Order, PartnerProfile } from '../types';
import { generatePixPayload } from '../utils/pixPayloadGenerator';
import { useMerchantPOS } from '../hooks/useMerchantPOS';
import { generatePaymentQRCode, checkPaymentStatus } from '../services/paymentGateway';
import { Logo } from './Logo';
import { ReceiptModal } from './ReceiptModal';
import html2canvas from 'html2canvas';
import { useDialog } from '../utils/dialogService'; // Import useDialog
import { useDemoMode } from '../hooks/useDemoMode';
import { useNotification } from '../contexts/NotificationContext';
import { useDynamicFont } from '../hooks/useDynamicFont';
import { SummaryReportModal } from './SummaryReportModal';
import { QrCodeLogsModal } from './QrCodeLogsModal';
import { backupService } from '../services/backupService';
import ReactJoyride, { Step as JoyrideStep } from '@list-labs/react-joyride';


// Declare globals from CDN scripts
declare const QRious: any;
declare const Html5QrcodeScanner: any;
declare const Html5Qrcode: any;

export const RenderScanner = ({ onScan }: { onScan: (text: string) => void }) => {
    const [error, setError] = useState<string | null>(null);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const scannerRef = useRef<any>(null);
    const isRunningRef = useRef(false);

    const safeStop = async () => {
        if (!scannerRef.current) return;

        try {
            if (isRunningRef.current) {
                await scannerRef.current.stop();
                isRunningRef.current = false;
            }
        } catch (e: any) {
            // Ignore "not running" errors which are common in this library's race conditions
            console.warn("Scanner stop warning:", e);
        }

        try {
            await scannerRef.current.clear();
        } catch (e) {
            // Ignore clear errors
        }
    };

    const startScanner = async () => {
        setError(null);
        setPermissionDenied(false);

        // Reset state
        await safeStop();

        if (typeof Html5Qrcode === 'undefined') {
            setError("Biblioteca de Scanner não carregada.");
            return;
        }

        try {
            // Create new instance
            const scanner = new Html5Qrcode("qr-reader");
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText: string) => {
                    // Success
                    if (scannerRef.current && isRunningRef.current) {
                        safeStop().then(() => onScan(decodedText));
                    } else {
                        onScan(decodedText);
                    }
                },
                (errorMessage: string) => {
                    // Ignore parse errors
                }
            );

            // Mark as running ONLY after successful start
            isRunningRef.current = true;

        } catch (err: any) {
            console.error("Erro ao iniciar câmera:", err);
            isRunningRef.current = false;
            scannerRef.current = null; // Clear ref to avoid cleanup trying to stop it

            if (err?.name === 'NotAllowedError' || err?.message?.includes('permission')) {
                setPermissionDenied(true);
            } else if (err?.name === 'NotReadableError' || err?.message?.includes('start video source')) {
                setError("Câmera em uso ou indisponível. Feche outros apps que usam a câmera.");
            } else {
                setError(`Erro ao acessar câmera: ${err?.message || 'Desconhecido'}`);
            }
        }
    };

    useEffect(() => {
        // Delay start slightly to ensure DOM is ready and previous instances cleared
        const timer = setTimeout(() => {
            startScanner();
        }, 300);

        return () => {
            clearTimeout(timer);
            // Cleanup on unmount
            if (scannerRef.current) {
                // We can't await in cleanup, but we catch errors
                if (isRunningRef.current) {
                    scannerRef.current.stop().catch((e: any) => console.warn("Cleanup stop error:", e));
                }
                scannerRef.current.clear().catch(() => { });
            }
        };
    }, []);

    const handleRetry = () => {
        startScanner();
    };

    return (
        <div className="w-full mb-6">
            <div id="qr-reader" className="w-full bg-black rounded-2xl overflow-hidden min-h-[300px] relative">
                {(error || permissionDenied) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-gray-900/90 z-10">
                        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                        <h4 className="font-bold text-lg mb-2">
                            {permissionDenied ? 'Acesso à Câmera Negado' : 'Erro na Câmera'}
                        </h4>
                        <p className="text-sm text-gray-300 mb-6">
                            {permissionDenied
                                ? 'Precisamos de acesso à câmera para ler o QR Code. Por favor, verifique as permissões do seu navegador.'
                                : error}
                        </p>
                        <Button
                            onClick={handleRetry}
                            variant="secondary"
                            className="bg-white text-gray-900 hover:bg-gray-100"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Tentar Novamente
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const parseCurrency = (val: string) => {
    if (!val) return 0;
    const digits = val.replace(/\D/g, '');
    return Number(digits) / 100;
};

const CURRENCY_INPUT_MAX_DIGITS = 11;
const PIN_MIN_LENGTH = 4;
const PIN_MAX_LENGTH = 6;

const formatDigitsAsCurrency = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, CURRENCY_INPUT_MAX_DIGITS);
    if (!digits) return '0,00';

    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number(digits) / 100);
};

const sanitizePinInput = (value: string, maxLength = PIN_MAX_LENGTH) => value.replace(/\D/g, '').slice(0, maxLength);

const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};




const WhatsAppReceiptModal = ({
    isOpen,
    onClose,
    onSend
}: {
    isOpen: boolean;
    onClose: () => void;
    onSend: (phone: string, message: string) => void;
}) => {
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('Segue o comprovante de pagamento.');
    const dialog = useDialog(); // Use the custom dialog service

    const handlePhoneChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPhone(formatPhoneNumber(event.target.value));
    };

    const handleSendClick = async () => {
        const rawPhone = phone.replace(/\D/g, '');
        if (rawPhone.length < 10) {
            await dialog.alert({ title: "Telefone Inválido", message: "Por favor, insira um número de telefone válido com DDD." });
            return;
        }
        onSend(rawPhone, message);
        onClose();
        // Reset state after sending
        setPhone('');
        setMessage('Segue o comprovante de pagamento.');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-brand-700 dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm transform animate-in zoom-in-95 slide-in-from-bottom-5" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Enviar via WhatsApp</h3>
                        <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-white/10">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-300">Número com DDD</label>
                            <input
                                value={phone}
                                onChange={handlePhoneChange}
                                inputMode="tel"
                                autoFocus
                                placeholder="(11) 99999-9999"
                                className="w-full mt-1 p-3 h-12 bg-gray-50/10 rounded-lg border border-gray-200/20 text-white text-xl font-mono tracking-widest outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-gray-400"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-300">Mensagem</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                rows={2}
                                className="w-full mt-1 p-3 bg-gray-50/10 rounded-lg border border-gray-200/20 outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-white"
                            />
                        </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                        <Button onClick={onClose} variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
                            Cancelar
                        </Button>
                        <Button onClick={handleSendClick} className="w-full bg-green-500 hover:bg-green-600">
                            Enviar
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const FiscalReceipt = React.forwardRef<HTMLDivElement, { payments: PartialPayment[], total: number, terminalId: string }>(({ payments, total, terminalId }, ref) => {
    return (
        <div ref={ref} className="bg-white p-4 font-mono text-black text-sm" style={{ width: '300px' }}>
            <div className="text-center">
                <h3 className="font-bold text-lg">ZÉ ENTREGAS</h3>
                <p>CNPJ: 99.999.999/0001-99</p>
                <p>AV. QUALQUER UMA, 123 - SAO PAULO - SP</p>
                <p>--------------------------------</p>
                <h4 className="font-bold">CUPOM NÃO FISCAL</h4>
                <p>--------------------------------</p>
            </div>
            <div className="my-2">
                {payments.map((p, i) => (
                    <div key={p.id} className="flex justify-between">
                        <span>{p.method || 'N/A'} #{i + 1}</span>
                        <span>{formatCurrency(p.amount)}</span>
                    </div>
                ))}
            </div>
            <p>--------------------------------</p>
            <div className="flex justify-between font-bold text-lg">
                <span>TOTAL</span>
                <span>{formatCurrency(total)}</span>
            </div>
            <p>--------------------------------</p>
            <div className="text-center text-xs mt-2">
                <p>Data: {new Date().toLocaleString('pt-BR')}</p>
                <p>Terminal: {terminalId}</p>
                <p className="mt-2">Obrigado pela preferência!</p>
            </div>
        </div>
    );
});


interface MerchantPOSProps {
    onClose: () => void;
}

type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'ZE_QR' | 'ZE_CODE';

interface PartialPayment {
    id: string;
    amount: number;
    status: 'unpaid' | 'processing' | 'paid' | 'error';
    method?: PaymentMethod;
    paidAt?: string;
    txId?: string;
}

type POSStep = 'loading' | 'activation_intro' | 'activating_animation_1' | 'create_pin' | 'confirm_pin' | 'pin_lock' | 'home' | 'amount' | 'split_config' | 'payment_list' | 'processing' | 'success' | 'error' | 'history' | 'settings' | 'inactive' | 'sales_simulator' | 'choose_sale_type' | 'select_associated_store' | 'select_order_for_store' | 'activating_animation_2';

const InfoRow = ({ label, value, onCopy }: { label: string, value: string | undefined, onCopy?: (value: string) => void }) => (
    <div className="relative">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{label}</label>
        <div className="flex items-center justify-between">
            <span className="font-mono text-sm text-gray-900 dark:text-white break-all">
                {value || 'N/A'}
            </span>
            {onCopy && value && (
                <button
                    onClick={() => onCopy(value)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title={`Copiar ${label}`}
                >
                    <Copy size={14} />
                </button>
            )}
        </div>
    </div>
);

// A new component for the battery icon
const BatteryIcon = ({ level, charging }: { level: number, charging: boolean }) => {
    if (charging) {
        return <BatteryCharging size={16} className="text-green-400" />;
    }
    if (level > 75) {
        return <BatteryFull size={16} />;
    }
    if (level > 25) {
        return <BatteryMedium size={16} />;
    }
    if (level > 10) {
        return <BatteryLow size={16} className="text-yellow-400" />;
    }
    return <BatteryWarning size={16} className="text-red-500" />;
};

const StatusBar = () => {
    const [time, setTime] = useState(new Date());
    const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
    const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000 * 30); // Update every 30s

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        let batteryManager: any;
        const updateBatteryStatus = () => {
            if (batteryManager) {
                setBattery({
                    level: Math.round(batteryManager.level * 100),
                    charging: batteryManager.charging,
                });
            }
        };

        if ('getBattery' in navigator) {
            (navigator as any).getBattery().then((bm: any) => {
                batteryManager = bm;
                updateBatteryStatus();
                bm.addEventListener('levelchange', updateBatteryStatus);
                bm.addEventListener('chargingchange', updateBatteryStatus);
            });
        }

        return () => {
            clearInterval(timer);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (batteryManager) {
                batteryManager.removeEventListener('levelchange', updateBatteryStatus);
                batteryManager.removeEventListener('chargingchange', updateBatteryStatus);
            }
        };
    }, []);

    const formattedTime = time.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="flex justify-between items-center px-4 py-1 text-xs font-bold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800">
            <div>{formattedTime}</div>
            <div className="flex items-center gap-2">
                <Signal size={14} />
                {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                {battery ? (
                    <div className="flex items-center gap-1">
                        <span>{battery.level}%</span>
                        <BatteryIcon level={battery.level} charging={battery.charging} />
                    </div>
                ) : null}
            </div>
        </div>
    );
};



export const MerchantPOSDesktop: React.FC<MerchantPOSProps> = ({ onClose }) => {
    const {
        step, setStep,
        terminal, setTerminal,
        amount, setAmount,
        errorMsg, setErrorMsg,
        userRole, partnerProfile,
        processing, setProcessing,
        totalToSplit, setTotalToSplit,
        partialAmounts, setPartialAmounts,
        activePayment, setActivePayment,
        pixCodeData, pixTxId,
        pinEntry, setPinEntry,
        newPin, setNewPin,
        confirmPin, setConfirmPin,
        pinAttempts, lockoutUntil, lockoutCountdown,
        simulatorAmount, setSimulatorAmount,
        feePayer, setFeePayer,
        feeSettings,
        simulationHistory, setSimulationHistory,
        showHistory, setShowHistory,
        simulatorCalculations,
        saleTypeSelection, setSaleTypeSelection,
        associatedStores, setAssociatedStores,
        selectedStore, setSelectedStore,
        storeOpenOrders, setStoreOpenOrders,
        selectedOrder, setSelectedOrder,
        activatingMessageIndex,
        activatingMessages,
        formatCurrency, parseCurrency,
        handleActivateStart,
        confirmPayment,
        loadData,
        handlePinSubmit,
        handleCreatePin,
        handleCreatePinConfirm,
        resetPaymentState,
        initiatePayment,
        dialog,
        isDemoMode,
        toggleDemoMode,
        history, setHistory,
        loadingHistory, setLoadingHistory,
        historyPage, setHistoryPage,
        historyHasMore, setHistoryHasMore,
        couponCode, setCouponCode,
        couponDiscount, setCouponDiscount,
        // New UI States from hook
        errorType, setErrorType,
        isWhatsAppModalOpen, setWhatsAppModalOpen,
        isDeactivateModalOpen, setDeactivateModalOpen,
        showSummaryModal, setShowSummaryModal,
        showLogsModal, setShowLogsModal,
        runTutorial, setRunTutorial,
        handleCopyToClipboard,
        tutorialSteps,
        getMockData,
        setIsPolling, setPixCodeData, setPixTxId,
        isPolling,

        // New central handlers
        handleGoBack,
        handleContinueFromAmount,
        resetFlow
    } = useMerchantPOS();

    // Specific local states
    const [isDesktop, setIsDesktop] = useState(false);
    const [userCodeInput, setUserCodeInput] = useState('');
    const settings = { enableHighContrast: false }; // Default settings if not provided by context

    // Additional local logic
    const amountFontSize = useDynamicFont(amount, 60, 30, 1);

    useEffect(() => {
        setIsDesktop(true);
    }, []);

    // Scrolling refs
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const amountInputRef = useRef<HTMLInputElement>(null);
    const splitAmountInputRef = useRef<HTMLInputElement>(null);
    const simulatorInputRef = useRef<HTMLInputElement>(null);
    const pinInputRef = useRef<HTMLInputElement>(null);
    const [showScrollButtons, setShowScrollButtons] = useState(false);

    const handlePinVerify = () => handlePinSubmit(pinEntry);

    // Ouvinte para teclado físico (Desktop)
    useEffect(() => {
        const handlePhysicalKeyboard = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const key = e.key;
            const code = e.code;

            // Suporte robusto para linha numérica superior (Digit0-9) e Numpad
            if (/^\d$/.test(key)) {
                handleKeypadPress(key);
            } else if (code.startsWith('Digit')) {
                // Extrai o número de 'Digit1', 'Digit2', etc.
                const num = code.replace('Digit', '');
                if (/^\d$/.test(num)) handleKeypadPress(num);
            } else if (code.startsWith('Numpad')) {
                // Extrai o número de 'Numpad1'
                const num = code.replace('Numpad', '');
                if (/^\d$/.test(num)) handleKeypadPress(num);
            } else if (key === 'Backspace' || code === 'Backspace') {
                handleKeypadBackspace();
            } else if (key === 'Delete' || code === 'Delete') {
                handleKeypadClear();
            } else if (key === 'Enter' || code === 'Enter' || code === 'NumpadEnter') {
                if (step === 'amount') handleContinueFromAmount();
                else if (step === 'pin_lock') handlePinVerify();
                else if (step === 'create_pin') handleCreatePin();
                else if (step === 'confirm_pin') handleCreatePinConfirm();
            } else if (key === 'Escape' || code === 'Escape') {
                handleGoBack(onClose);
            }
        };

        window.addEventListener('keydown', handlePhysicalKeyboard);
        return () => window.removeEventListener('keydown', handlePhysicalKeyboard);
    }, [step, amount, pinEntry, newPin, confirmPin, simulatorAmount, showHistory, onClose]);

    // tutorialSteps moved to hook

    useEffect(() => {
        // Try to sync offline data on mount
        cloud.syncOfflineData();

        const handleOnline = () => {
            // console.log('Online detected, syncing...');
            cloud.syncOfflineData();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    // handleScroll moved to local or hook depends on usage
    const handleScroll = (direction: 'up' | 'down') => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                top: direction === 'up' ? -80 : 80,
                behavior: 'smooth',
            });
        }
    };

    // handleScroll moved to local or hook depends on usage
    // Merged local scroll logic

    useEffect(() => {
        const checkScroll = () => {
            if (scrollContainerRef.current) {
                const { scrollHeight, clientHeight } = scrollContainerRef.current;
                setShowScrollButtons(scrollHeight > clientHeight);
            }
        };

        // A short timeout allows the DOM to update before we check the scroll height
        const timer = setTimeout(checkScroll, 50);

        return () => clearTimeout(timer);
    }, [partialAmounts, step]); // Re-check when amounts change or when step changes

    // Define showKeypad logic based on steps where input is needed
    // Modified to NOT show keypad at bottom if it's already shown on side (Desktop + amount step)
    const showKeypad = useMemo(() => {
        const keypadSteps = ['amount', 'pin_lock', 'create_pin', 'confirm_pin', 'sales_simulator'];
        if (!keypadSteps.includes(step)) return false;

        // If desktop and step is 'amount', we show it on the side, not bottom
        if (isDesktop && step === 'amount') return false;

        return true;
    }, [step, isDesktop]);

    // Lockout effects removed (handled by hook)



    const handleSaveSimulation = async () => {
        const saleValue = parseCurrency(simulatorAmount);
        if (saleValue <= 0 || !feeSettings) return;

        try {
            await cloud.saveSalesSimulation({
                sale_value: saleValue,
                fee_payer: feePayer,
                gross_value: simulatorCalculations.rawGross,
                net_value: simulatorCalculations.rawNet,
                fees: simulatorCalculations.rawFees,
            });
            await dialog.alert({ title: 'Sucesso', message: 'Simulação salva com sucesso!' });
            setSimulatorAmount('0,00'); // Reset amount
        } catch (e: any) {
            await dialog.alert({ title: 'Erro ao Salvar', message: 'Falha ao salvar simulação: ' + (e.message || 'Erro desconhecido') });
            await cloud.logClientError('sales_simulator_save', e?.message, {});
        }
    };

    const handleToggleHistory = async () => {
        if (!showHistory) {
            try {
                const historyData = await cloud.getMySalesSimulations();
                setSimulationHistory(historyData);
            } catch (e: any) {
                await dialog.alert({ title: 'Erro no Histórico', message: 'Falha ao buscar histórico de simulações.' });
                await cloud.logClientError('sales_simulator_history', e?.message, {});
            }
        }
        setShowHistory(!showHistory);
    };

    const handleClearSimulationHistory = async () => {
        const isConfirmed = await dialog.confirm({
            title: 'Limpar Histórico',
            message: 'Deseja apagar todo o histórico de simulações? Esta ação não pode ser desfeita.',
            confirmButtonText: 'Limpar'
        });

        if (isConfirmed) {
            try {
                await cloud.clearMySalesSimulations();
                setSimulationHistory([]);
                await dialog.alert({ title: 'Sucesso', message: 'Histórico de simulações limpo!' });
            } catch (e: any) {
                await dialog.alert({ title: 'Erro ao Limpar', message: 'Falha ao limpar o histórico.' });
                await cloud.logClientError('sales_simulator_clear', e?.message, {});
            }
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (splitButtonRef.current && !splitButtonRef.current.contains(event.target as Node)) {
                setIsSplitButtonActive(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // confirmPayment removed (handled by hook)

    const handleScanSuccess = (decodedText: string) => {
        if (activePayment) {
            confirmPayment(activePayment.id, 'ZE_QR', decodedText);
        }
    };

    // Polling do PIX
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (isPolling && pixTxId && activePayment?.method === 'PIX') {
            const check = async () => {
                try {
                    const status = await checkPaymentStatus(pixTxId);
                    if (status.status === 'paid') {
                        setIsPolling(false);
                        setPixCodeData(null);
                        setPixTxId(null);

                        if (activePayment) {
                            const paymentId = activePayment.id;
                            await dialog.alert({ title: 'Pagamento Recebido', message: 'Pagamento recebido com sucesso!' });
                            setPartialAmounts(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'paid' } : p));
                            closePaymentOverlay();
                        }
                    } else if (status.status === 'failed' || status.status === 'expired') {
                        setIsPolling(false);
                        await dialog.alert({ title: 'Pagamento Expirado', message: 'O tempo limite para o pagamento expirou.' });
                    }
                } catch (e) {
                    console.error('Polling error', e);
                }
            };
            interval = setInterval(check, 5000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPolling, pixTxId, activePayment]);


    // Load data
    useEffect(() => {
        if (step === 'loading') {
            loadData();
        }
    }, [step]);

    const handleSendWhatsAppReceipt = async (phone: string, message: string) => {
        const encodedText = encodeURIComponent(message);
        const url = `https://wa.me/55${phone}?text=${encodedText}`;
        window.open(url, '_blank');
        await dialog.alert({ title: 'Sucesso', message: "Abrindo WhatsApp..." });
    };

    const receiptRef = useRef<HTMLDivElement>(null);

    const handleDownloadReceipt = async () => {
        if (!receiptRef.current) return;
        html2canvas(receiptRef.current, { backgroundColor: '#ffffff' }).then(async canvas => {
            const link = document.createElement('a');
            link.download = 'comprovante-ze-entregas.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            await dialog.alert({ title: 'Sucesso', message: "Comprovante baixado!" });
        }).catch(async (err) => {
            await dialog.alert({ title: 'Erro', message: 'Falha ao gerar comprovante' });
            await cloud.logClientError('receipt', 'html2canvas_failed', { error: String(err) });
        });
    };

    // Navigation handlers moved to hook

    // handlePinVerify replaced by hook

    // handleCreatePin replaced by hook

    // handleCreatePinConfirm replaced by hook

    // resetFlow moved to hook

    const handleSplitClick = () => {
        setIsSplitButtonActive(prev => !prev);
        if (parseCurrency(amount) > 0) {
            setTotalToSplit(parseCurrency(amount));
            setPartialAmounts([]);
            setStep('split_config');
            setAmount('0,00'); // Clear amount input after moving to split config
        }
    };

    const remainingToSplit = useMemo(() => {
        const paidAmount = partialAmounts.reduce((sum, p) => sum + p.amount, 0);
        return totalToSplit - paidAmount;
    }, [totalToSplit, partialAmounts]);

    const handleDeletePartialAmount = (id: string) => {
        setPartialAmounts(prev => prev.filter(p => p.id !== id));
    };

    const addPartialAmount = async () => {
        const currentAmount = parseCurrency(amount);
        if (currentAmount <= 0) {
            await dialog.alert({ title: 'Erro', message: 'O valor deve ser maior que zero.' });
            return;
        }
        if (currentAmount > remainingToSplit) {
            await dialog.alert({ title: 'Erro', message: `O valor excede o restante a ser dividido (${formatCurrency(remainingToSplit)}).` });
            return;
        }
        setPartialAmounts(prev => [...prev, { id: crypto.randomUUID(), amount: currentAmount, status: 'unpaid' }]);
        setAmount('0,00'); // Reset amount input
    };

    // Keypad handlers moved to hook

    const closePaymentOverlay = () => {
        setActivePayment(null);
        setPixCodeData(null);
        setPixTxId(null);
        setIsPolling(false);
        setUserCodeInput('');
    };

    // Initiate Payment Action
    // initiatePayment replaced by hook



    const loadHistory = async (reset?: boolean) => {
        if (loadingHistory) return;
        setLoadingHistory(true);
        if (reset) {
            setHistory([]);
            setHistoryPage(1);
        }
        setStep('history');
        try {
            const page = reset ? 1 : historyPage;
            let data: UserTerminalHistoryItem[] = [];

            if (isDemoMode) {
                const mockHist = getMockData('sales_history');
                data = (mockHist as unknown as UserTerminalHistoryItem[]) || [];
                setHistoryHasMore(false);
            } else {
                if (terminal?.id) {
                    data = await cloud.getTerminalHistoryById(terminal.id, page, 20);
                } else {
                    data = [];
                }
                setHistoryHasMore(data.length === 20);
            }

            setHistory(prev => reset ? data : [...prev, ...data]);
            setHistoryPage(page + 1);
        } catch (e: any) {
            await dialog.alert({ title: 'Erro', message: e.message || 'Falha ao carregar histórico' });
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleFinalizeSale = async () => {
        if (!allPaymentsDone) return;
        setProcessing(true);

        if (isDemoMode) {
            await dialog.alert({ title: 'Sucesso', message: 'Venda Demo Registrada!' });
            setStep('success');
            setProcessing(false);
            return;
        }

        try {
            // Lógica Condicional: Parceiro vs Loja
            if (userRole === 'delivery_partner' && !selectedStore) {
                // Venda Avulsa de Entregador Parceiro -> Crédito na Carteira
                await cloud.processPartnerSaleWallet(
                    terminal?.user_id || '',
                    totalToSplit,
                    partialAmounts[0]?.method || 'UNKNOWN', // Assume método principal ou primeiro
                    {
                        is_demo: isDemoMode,
                        payments: partialAmounts,
                        coupon: couponCode
                    }
                );
            } else {
                // Venda de Loja (ou Associado) -> Fluxo Original
                const transaction = {
                    user_id: userRole === 'delivery_partner' ? terminal?.user_id : userRole === 'store_partner' ? terminal?.user_id : undefined, // Fallback robusto
                    amount: totalToSplit,
                    payments: partialAmounts,
                    status: 'COMPLETED',
                    created_at: new Date().toISOString(),
                    payer_name: 'Cliente Final',
                    description: selectedStore ? `Venda Loja: ${selectedStore.name}` : 'Venda Avulsa',
                    terminal_id: terminal?.id,
                    metadata: {
                        is_demo: isDemoMode,
                        coupon: couponCode,
                        store_id: selectedStore?.id,
                        order_id: selectedOrder?.id
                    }
                };
                await cloud.createTerminalTransaction(transaction);
            }

            setStep('success');
        } catch (e: any) {
            if (userRole === 'delivery_partner' && !selectedStore) {
                await dialog.alert({ title: 'Erro de Conexão', message: 'Não foi possível creditar a carteira. Verifique sua conexão.' });
            } else {
                await dialog.alert({ title: 'Erro no Registro', message: 'Erro ao registrar venda. Tentando offline...' });
            }
            if (selectedStore || userRole !== 'delivery_partner') setStep('success');
            else setProcessing(false);
            return;
        } finally {
            if (step === 'success' || (selectedStore || userRole !== 'delivery_partner')) setProcessing(false);
        }
    };

    const openSettings = () => {
        setStep('settings');
    };

    const handleSaveSettings = async () => {
        // Placeholder for future settings
        await dialog.alert({ title: 'Sucesso', message: 'Configurações salvas!' });
        setStep('home');
    };

    const handleDeactivate = async () => {
        setDeactivateModalOpen(true);
    };

    const confirmDeactivation = async () => {
        setDeactivateModalOpen(false);
        try {
            await cloud.deactivateMyTerminal();
            await dialog.alert({ title: 'Sucesso', message: 'Terminal desativado.' });
            setStep('inactive');
        } catch (e: any) {
            await dialog.alert({ title: 'Erro', message: e.message });
        }
    };

    const SubPageHeader: React.FC<{ title: string, onBack: () => void }> = ({ title, onBack }) => (
        <div className="flex justify-between items-center mb-4 p-4 border-b border-gray-100 dark:border-gray-800 absolute top-0 left-0 right-0 bg-white dark:bg-gray-900 z-10">
            <h3 className="font-bold text-lg dark:text-white">{title}</h3>
            <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
                <X className="w-5 h-5" />
            </button>
        </div>
    );

    // --- QR Helper Component ---
    const PaymentQRCode = ({ value }: { value: string }) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        useEffect(() => {
            if (canvasRef.current && value && typeof QRious !== 'undefined') {
                new QRious({
                    element: canvasRef.current,
                    value: value,
                    size: 200,
                    level: 'H'
                });
            }
        }, [value]);
        return <canvas ref={canvasRef} />;
    };

    // --- PAYMENT OVERLAY RENDER ---
    const handleClose = () => {
        setStep('loading');
        onClose();
    };

    const renderPaymentOverlay = () => {
        if (!activePayment) return null;

        return (
            <div className="absolute inset-0 bg-white dark:bg-gray-900 z-20 flex flex-col animate-in slide-in-from-bottom-10">
                <SubPageHeader
                    title={
                        activePayment.method === 'PIX' ? 'Pagamento via PIX' :
                            activePayment.method === 'SCAN' ? 'Ler Cartão/QR' :
                                'Cobrar por Código'
                    }
                    onBack={closePaymentOverlay}
                />

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <h2 className="text-3xl font-black mb-2 dark:text-white">{formatCurrency(activePayment.amount)}</h2>

                    {activePayment.method === 'PIX' && (
                        <>
                            <p className="text-xs text-center text-gray-500 mb-4 px-4 bg-yellow-50 dark:bg-yellow-900/20 py-2 rounded-lg border border-yellow-100 dark:border-yellow-800">
                                Aguarde o cliente realizar o pagamento e clique em confirmar.
                            </p>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 mx-auto">
                                <PaymentQRCode value={pixCodeData || ''} />
                            </div>

                            {/* Botão de Confirmação Manual para Pix Estático */}
                            <div className="w-full px-6 mb-4">
                                <Button
                                    onClick={() => {
                                        dialog.confirm({
                                            title: 'Confirmar Pagamento',
                                            message: 'Você confirma que visualizou o comprovante ou recebeu o valor em sua conta?',
                                            confirmButtonText: 'Sim, Recebi',
                                            cancelButtonText: 'Cancelar'
                                        }).then(confirmed => {
                                            if (confirmed) {
                                                confirmPayment(activePayment.id, 'ZE_QR', 'MANUAL_PIX_CONFIRM');
                                            }
                                        });
                                    }}
                                    fullWidth
                                    className="bg-green-600 hover:bg-green-700 text-white rounded-xl py-4 text-lg shadow-lg shadow-green-500/20"
                                >
                                    <CheckCircle className="w-6 h-6 mr-2" />
                                    Confirmar Recebimento
                                </Button>
                            </div>

                            {/* Código Copia e Cola */}
                            <div className="w-full px-6 mb-2">
                                <div className="text-center">
                                    <p className="text-xs font-bold text-gray-400 uppercase mb-2">Copia e Cola</p>
                                    <div className="flex gap-2">
                                        <input
                                            readOnly
                                            value={pixCodeData || ''}
                                            className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 dark:text-gray-300 truncate"
                                        />
                                        <Button
                                            onClick={() => handleCopyToClipboard(pixCodeData || '', 'Código PIX')}
                                            className="shrink-0"
                                            size="sm"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activePayment.method === 'SCAN' && (
                        <>
                            <p className="text-sm text-gray-500 mb-6">Aponte a câmera para o Cartão Virtual ou QR do cliente.</p>
                            <RenderScanner onScan={handleScanSuccess} />
                            <p className="text-xs text-gray-400">Posicione o código no centro</p>
                        </>
                    )}

                    {activePayment.method === 'USER_CODE' && (
                        <>
                            <p className="text-sm text-gray-500 mb-6">Digite o código do usuário para cobrança direta.</p>
                            <CustomInput
                                type="text"
                                value={userCodeInput}
                                onChange={e => setUserCodeInput(e.target.value.toUpperCase())}
                                placeholder="EX: A1B2C3"
                                className="text-3xl text-center font-mono font-bold border-b-2 border-gray-300 focus:border-brand-500 outline-none bg-transparent dark:text-white uppercase mb-8"
                                autoFocus
                            />
                            <Button
                                onClick={() => confirmPayment(activePayment.id, 'USER_CODE', userCodeInput)}
                                disabled={userCodeInput.length < 3}
                                className="w-full py-4"
                            >
                                Cobrar
                            </Button>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderScreenContent = () => {
        switch (step) {
            case 'loading':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white">
                        <img src="https://raw.githubusercontent.com/DalisonMessias/cdn.rabbit.gg/refs/heads/main/assets/64536456457.svg" alt="Logo" className="w-24 h-24 mb-4" />
                        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                        <p className="text-sm font-bold text-gray-400 mt-4">Inicializando sistema...</p>
                    </div>
                );

            case 'activation_intro':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-gray-900">
                        <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <Smartphone className="w-16 h-16 text-gray-400" />
                        </div>
                        {/* <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">ZéPoint</h2> RE MO VI DO */}
                        <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
                            Vamos ativar sua ZéPoint para começar a receber pagamentos de forma rápida e segura.
                        </p>
                        <Button onClick={handleActivateStart} className="w-full py-4 text-lg shadow-xl shadow-brand-500/20">
                            Ativar Agora
                        </Button>
                    </div>
                );

            case 'inactive':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-gray-900">
                        <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                            <PowerOff className="w-16 h-16 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Terminal Desativado</h2>
                        <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">
                            {errorMsg || 'Este terminal foi desativado ou você não tem permissão para usá-lo.'}
                        </p>
                        {terminal?.terminal_id && (
                            <div className="w-full max-w-xs mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">ID do Terminal</label>
                                <div className="flex items-center gap-2">
                                    <div className="p-2 pl-4 w-full text-left bg-gray-200 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600">
                                        <span className="font-mono text-sm text-gray-900 dark:text-white break-all">
                                            {terminal.terminal_id}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleCopyToClipboard(terminal.terminal_id, 'ID do Terminal')}
                                        className="p-3 bg-gray-200 dark:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                                        title="Copiar ID do Terminal"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                    Use este ID para solicitar a reativação do seu terminal junto ao suporte.
                                </p>
                            </div>
                        )}
                        <Button onClick={onClose} className="absolute bottom-5 right-3 left-3 py-4 text-lg bg-red-600 text-white hover:bg-red-700">
                            <ArrowDown className="w-5 h-5 mr-2" />
                        </Button>
                    </div>
                );

            case 'choose_sale_type':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-gray-900">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-8">De quem é essa venda?</h2>
                        <div className="w-full space-y-4">
                            <Button
                                onClick={() => { setSaleTypeSelection('mine'); setStep('amount'); }}
                                className="w-full py-4 text-lg shadow-xl shadow-brand-500/20"
                            >
                                <Bike className="w-5 h-5 mr-2" /> Minha venda (entregador)
                            </Button>
                            <Button
                                onClick={() => { setSaleTypeSelection('associated_store'); setStep('select_associated_store'); }}
                                variant="outline"
                                className="w-full py-4 text-lg border-brand-500 text-brand-500 hover:bg-brand-50"
                            >
                                <Building className="w-5 h-5 mr-2" /> Venda de um lojista associado
                            </Button>
                        </div>
                    </div>
                );

            case 'select_associated_store':
                const handleStoreSelect = async (store: AssociatedStore) => {
                    setSelectedStore(store);
                    try {
                        const storeTerm = await cloud.getStoreTerminal(store.id);
                        if (storeTerm) {
                            setTerminal(storeTerm);
                            setStep('amount');
                        } else {
                            setErrorMsg('Terminal da loja não encontrado ou inativo.');
                            setErrorType('validation');
                            setStep('error');
                        }
                    } catch (e: any) {
                        setErrorMsg(e?.message || 'Erro ao carregar terminal da loja.');
                        setErrorType('unknown');
                        setStep('error');
                        await cloud.logClientError('pos_select_store', e?.message, { storeId: store.id });
                    }
                };

                return (
                    <div className="flex-1 flex flex-col p-4 pt-20 bg-white dark:bg-gray-900">
                        <SubPageHeader title="Selecione a Loja" onBack={() => setStep('choose_sale_type')} />
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {associatedStores.length === 0 ? (
                                <p className="text-center text-gray-400 mt-10">Nenhuma loja associada encontrada.</p>
                            ) : (
                                associatedStores.map(store => (
                                    <button
                                        key={store.id}
                                        onClick={() => handleStoreSelect(store)}
                                        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <Building className="w-5 h-5 mr-3 text-gray-500" />
                                        <span className="flex-1 text-left font-bold text-gray-900 dark:text-white">{store.name}</span>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                );

            case 'select_order_for_store':
                // Optional: Implement if requested and getStoreOpenOrders is fully utilized
                // For now, selecting a store goes directly to amount
                return (
                    <div className="flex-1 flex flex-col p-4 pt-20 bg-white dark:bg-gray-900">
                        <SubPageHeader title="Selecione o Pedido" onBack={() => setStep('select_associated_store')} />
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {storeOpenOrders.length === 0 ? (
                                <p className="text-center text-gray-400 mt-10">Nenhum pedido em aberto para esta loja.</p>
                            ) : (
                                storeOpenOrders.map(order => (
                                    <button
                                        key={order.id}
                                        onClick={() => { setSelectedOrder(order); setStep('amount'); }}
                                        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    >
                                        <span className="flex-1 text-left font-bold text-gray-900 dark:text-white">Pedido #{order.id.substring(0, 8)}</span>
                                        <span className="font-bold text-brand-600">{formatCurrency(order.total_price)}</span>
                                        <ChevronRight className="w-5 h-5 text-gray-400 ml-2" />
                                    </button>
                                ))
                            )}
                        </div>
                        {storeOpenOrders.length > 0 && (
                            <div className="mt-4">
                                <Button onClick={() => setStep('amount')} className="w-full py-4 text-lg">
                                    Continuar sem vincular pedido
                                </Button>
                            </div>
                        )}
                    </div>
                );


            case 'activating_animation_1':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
                        <div className="relative w-24 h-24 mb-6">
                            <Loader2 className="absolute inset-0 w-24 h-24 animate-spin-slow text-brand-500 opacity-20" />
                            <Wifi className="absolute inset-0 w-12 h-12 m-auto text-brand-500 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Configurando ZéPoint</h2>
                        <p className="text-sm font-bold text-gray-400 mt-4 h-10 flex items-center">
                            {activatingMessages[activatingMessageIndex]}
                        </p>
                    </div>
                );

            case 'activating_animation_2':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center bg-green-600 text-white p-6 text-center">
                        <CheckCircle className="w-24 h-24 text-white mb-6 animate-scale-in" />
                        <h2 className="text-2xl font-black text-white mb-2">PIN Configurado!</h2>
                        <p className="text-sm font-bold text-white opacity-80 mt-4">
                            Seu ZéPoint está pronto para uso.
                        </p>
                    </div>
                );

            case 'create_pin':
            case 'confirm_pin':
            case 'pin_lock':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-900">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-500 mb-4" />
                        <p className="text-gray-500">Acessando PDV...</p>
                    </div>
                );

            case 'home':
                const HomeButton = ({ icon, text, onClick, colorClass }: { icon: React.ReactNode, text: string, onClick: () => void, colorClass: string }) => (
                    <button
                        onClick={onClick}
                        className={`flex flex-col items-center justify-center aspect-square p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:shadow-lg dark:hover:bg-gray-700 transition-all duration-200 ${colorClass}`}
                    >
                        {icon}
                        <span className="text-sm font-bold mt-2 text-center">{text}</span>
                    </button>
                );

                return (
                    <div className="flex-1 flex flex-col justify-start pt-8 p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto custom-scrollbar">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <HomeButton
                                icon={<DollarSign className="w-8 h-8" />}
                                text="Nova Venda"
                                onClick={() => setStep('amount')}
                                colorClass="text-brand-600 dark:text-brand-400"
                            />
                            <HomeButton
                                icon={<Calculator className="w-8 h-8" />}
                                text="Simulador de Vendas"
                                onClick={() => setStep('sales_simulator')}
                                colorClass="text-gray-500 dark:text-gray-400"
                            />
                            <HomeButton
                                icon={<History className="w-8 h-8" />}
                                text="Histórico"
                                onClick={loadHistory}
                                colorClass="text-gray-500 dark:text-gray-400"
                            />
                            <HomeButton
                                icon={<Settings className="w-8 h-8" />}
                                text="Ajustes"
                                onClick={openSettings}
                                colorClass="text-gray-500 dark:text-gray-400"
                            />
                            <HomeButton
                                icon={<FileText className="w-8 h-8" />}
                                text="Relatório Resumo"
                                onClick={() => setShowSummaryModal(true)}
                                colorClass="text-blue-600 dark:text-blue-400"
                            />
                        </div>
                        {/* Botão Sair removido por solicitação do usuário */}
                    </div>
                );

            case 'amount':
                return (
                    <div className="flex-1 flex flex-col justify-center text-center p-4 relative pt-20 bg-white dark:bg-gray-900">
                        <SubPageHeader title="Nova Venda" onBack={handleGoBack} />
                        <div className={`${isDesktop ? 'flex flex-row items-center justify-center gap-12 h-full' : 'flex flex-col'}`}>
                            <div className="flex-1 max-w-md">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor a Cobrar</p>
                                <h1
                                    className="font-black text-gray-900 dark:text-white my-4 tracking-tighter transition-all duration-200"
                                    style={{ fontSize: `${isDesktop ? amountFontSize * 1.5 : amountFontSize}px` }}
                                >
                                    <span className="text-2xl align-baseline mr-1 text-gray-400 font-bold">R$</span>{amount}
                                </h1>
                                <div
                                    ref={splitButtonRef}
                                    className={`mx-auto mt-4 transition-opacity duration-300 ${parseCurrency(amount) > 0 ? 'opacity-100' : 'opacity-0 invisible'}`}
                                    aria-hidden={parseCurrency(amount) <= 0}
                                >
                                    <Button
                                        variant={isSplitButtonActive ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={handleSplitClick}
                                        className={`rounded-xl px-6 ${isSplitButtonActive ? 'bg-red-500 hover:bg-red-600 text-white' : ''}`}
                                    >
                                        <Users className="w-4 h-4 mr-2" /> Dividir Conta
                                    </Button>

                                    {/* Add Continue Button for Desktop here if needed, or rely on Keypad Confirm */}
                                    {isDesktop && parseCurrency(amount) > 0 && (
                                        <div className="mt-8">
                                            <Button
                                                onClick={handleContinueFromAmount}
                                                className="w-full h-14 text-xl bg-green-600 hover:bg-green-700 shadow-xl rounded-xl"
                                            >
                                                Cobrar {formatCurrency(parseCurrency(amount))}
                                                <ArrowRight className="ml-2 w-6 h-6" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Desktop Side Keypad */}
                            {isDesktop && (
                                <div className="w-[350px] shrink-0 animate-in slide-in-from-right-10">
                                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-3xl shadow-inner">
                                        <Keypad
                                            onKeyPress={handleKeypadPress}
                                            onClear={handleKeypadClear}
                                            onBackspace={handleKeypadBackspace}
                                            onConfirm={handleContinueFromAmount} // Enter key confirms
                                            confirmDisabled={parseCurrency(amount) <= 0}
                                            showConfirm={false} // Hide confirm button inside keypad as we have the big one or physical enter
                                        />
                                        <div className="mt-4 text-center">
                                            <p className="text-xs text-gray-400">Use o teclado numérico ou clique acima</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'split_config':
                return (
                    <div className="flex-1 flex flex-col p-4 text-center pt-20 bg-white dark:bg-gray-900">
                        <SubPageHeader title="Dividir Conta" onBack={() => setStep('amount')} />
                        <div className="flex justify-between px-4 mb-4">
                            <p className="text-xs text-gray-400">Total: {formatCurrency(totalToSplit)}</p>
                            {remainingToSplit > 0 &&
                                <p className="text-xs font-bold text-red-500 animate-pulse">Restam: {formatCurrency(remainingToSplit)}</p>
                            }
                        </div>

                        {remainingToSplit > 0 &&
                            <h1 className="text-6xl font-black text-gray-900 dark:text-white my-4 tracking-tighter">
                                <span className="text-2xl align-baseline mr-1 text-gray-400 font-bold">R$</span>{amount}
                            </h1>
                        }

                        <div className="flex-1 relative mb-2">
                            <div ref={scrollContainerRef} className="absolute inset-0 bg-gray-50 dark:bg-gray-800 rounded-2xl p-2 overflow-y-auto custom-scrollbar">
                                {partialAmounts.length === 0 && <p className="text-gray-400 text-xs mt-4">Adicione valores parciais</p>}
                                {partialAmounts.map((p, i) => (
                                    <div key={p.id} className="flex justify-between items-center bg-white dark:bg-gray-700 p-3 rounded-xl mb-2 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold dark:text-white">#{i + 1}</span>
                                            <span className="font-mono font-bold dark:text-white">{formatCurrency(p.amount)}</span>
                                        </div>
                                        <button onClick={() => handleDeletePartialAmount(p.id)} className="p-1 rounded-full text-red-500 hover:bg-red-50/20 dark:hover:bg-red-900/20">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {showScrollButtons && (
                                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-4 z-10">
                                    <button onClick={() => handleScroll('up')} className="p-1.5 rounded-full bg-black/30 dark:bg-white/30 text-white dark:text-black backdrop-blur-sm hover:bg-black/50 dark:hover:bg-white/50 transition-colors">
                                        <ChevronUp className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleScroll('down')} className="p-1.5 rounded-full bg-black/30 dark:bg-white/30 text-white dark:text-black backdrop-blur-sm hover:bg-black/50 dark:hover:bg-white/50 transition-colors">
                                        <ChevronDown className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                );


            case 'payment_list':
                const allPaid = partialAmounts.length > 0 && partialAmounts.every(p => p.status === 'paid');
                return (
                    <div className="flex-1 flex flex-col p-4 pt-20 bg-white dark:bg-gray-900">
                        <SubPageHeader title="Pagamentos" onBack={resetFlow} />
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {partialAmounts.map(p => (
                                <div key={p.id} className={`p-4 rounded-xl border-2 transition-all ${p.status === 'paid' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`font-bold text-lg ${p.status === 'paid' ? 'text-green-700 dark:text-green-300 line-through' : 'dark:text-white'}`}>{formatCurrency(p.amount)}</span>
                                        {p.status === 'paid' ? (
                                            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-lg">
                                                <CheckCircle className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">PAGO</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/30 px-2 py-1 rounded-lg">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                <span className="text-[10px] font-bold">PENDENTE</span>
                                            </div>
                                        )}
                                    </div>

                                    {p.status !== 'paid' && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <button title="Gerar Pix" onClick={() => initiatePayment(p.id, p.amount, 'PIX')} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors flex justify-center"><QrCode className="w-5 h-5" /></button>
                                            <button title="Código Cliente" onClick={() => initiatePayment(p.id, p.amount, 'USER_CODE')} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors flex justify-center"><User className="w-5 h-5" /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <Ticket className="w-5 h-5 text-purple-500" />
                                <CustomInput
                                    type="text"
                                    placeholder="Cupom de Desconto"
                                    value={couponCode}
                                    onChange={e => setCouponCode(e.target.value.toUpperCase())}
                                    className="flex-1 bg-transparent text-sm font-bold outline-none uppercase placeholder:normal-case placeholder:font-medium text-gray-900 dark:text-white placeholder:text-gray-400 border-none p-0"
                                />
                                <button onClick={() => { /* apply coupon logic */ }} className="text-xs font-bold text-purple-600 hover:underline">
                                    Aplicar
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'success':
                const totalPaid = partialAmounts.reduce((sum, p) => p.amount, 0);
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-green-500 text-white animate-in zoom-in">
                        {/* Hidden component for capture */}
                        <div className="absolute -left-[9999px] top-0">
                            <FiscalReceipt
                                ref={receiptRef}
                                payments={partialAmounts}
                                total={totalPaid}
                                terminalId={terminal?.terminal_id || 'N/A'}
                            />
                        </div>

                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-md">
                            <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-black mb-2">Venda Aprovada!</h3>
                        <p className="font-medium opacity-90 mb-8 text-sm">O que deseja fazer agora?</p>

                        <div className="flex flex-col w-full max-w-sm gap-3">
                            <Button
                                onClick={() => setStep('home')} // Reset to home
                                variant="secondary"
                                className="bg-white text-green-600 hover:bg-green-50 w-full py-3 shadow-lg"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Voltar ao Início
                            </Button>

                            <div className="grid grid-cols-2 gap-3">
                                <Button
                                    onClick={handleDownloadReceipt}
                                    variant="outline"
                                    className="bg-transparent border-white/50 text-white hover:bg-white/10 py-3 text-sm h-auto"
                                >
                                    <Download className="w-4 h-4 mr-2" />
                                    Comprovante
                                </Button>
                                <Button
                                    onClick={() => setWhatsAppModalOpen(true)}
                                    variant="outline"
                                    className="bg-transparent border-white/50 text-white hover:bg-white/10 py-3 text-sm h-auto"
                                >
                                    <Share2 className="w-4 h-4 mr-2" />
                                    WhatsApp
                                </Button>
                            </div>
                        </div>
                    </div>
                );

            case 'history':
                return (
                    <div className="flex-1 flex flex-col pt-20 bg-white dark:bg-gray-900">
                        <SubPageHeader title="Histórico de Vendas" onBack={() => setStep('home')} />
                        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 custom-scrollbar">
                            {loadingHistory ? (
                                <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                            ) : history.length === 0 ? (
                                <p className="text-center text-gray-400 mt-10">Nenhuma venda registrada.</p>
                            ) : (
                                history.map(item => (
                                    <div key={item.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50">
                                        <div className="flex justify-between items-center mb-3">
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white">{item.payer_name || 'Cliente'}</p>
                                                <p className="text-xs text-gray-500">{new Date(item.created_at).toLocaleString('pt-BR')}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-green-600">{formatCurrency(item.amount)}</p>
                                                <p className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full inline-block">{item.status}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                                            <button
                                                onClick={async () => {
                                                    const reason = await dialog.prompt({ title: 'Reportar Problema', message: 'Descreva o problema com esta venda:', placeholder: 'Ex: Valor incorreto' });
                                                    if (reason) await dialog.alert({ title: 'Sucesso', message: 'Problema reportado com sucesso.' });
                                                }}
                                                className="p-2 text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1"
                                            >
                                                <AlertTriangle className="w-3 h-3" /> Problema
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const note = await dialog.prompt({ title: 'Adicionar Nota', message: 'Adicionar observação:', placeholder: 'Observações...' });
                                                    if (note) await dialog.alert({ title: 'Sucesso', message: 'Observação salva.' });
                                                }}
                                                className="p-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                                            >
                                                <FileText className="w-3 h-3" /> Nota
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (await dialog.confirm({ title: 'Confirmar Reembolso', message: 'Confirmar reembolso desta venda?', confirmButtonText: 'Reembolsar' })) {
                                                        await dialog.alert({ title: 'Sucesso', message: 'Solicitação de reembolso enviada.' });
                                                    }
                                                }}
                                                className="p-2 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                                            >
                                                <RotateCcw className="w-3 h-3" /> Reembolso
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                            {historyHasMore && !loadingHistory && (
                                <div className="flex justify-center">
                                    <Button onClick={() => loadHistory()} className="px-6">Carregar mais</Button>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'settings':
                return (
                    <div className="flex-1 flex flex-col pt-20 bg-white dark:bg-gray-900 relative">
                        <SubPageHeader title="Sobre o Dispositivo" onBack={() => setStep('home')} />
                        <div className="flex-1 overflow-y-auto px-6 space-y-6 pb-32 custom-scrollbar">
                            <InfoRow label="Nome do Terminal" value={terminal?.label} />
                            <InfoRow
                                label="ID do Terminal"
                                value={terminal?.terminal_id}
                                onCopy={(value) => handleCopyToClipboard(value, 'ID do Terminal')}
                            />
                            <InfoRow
                                label="Número de Série"
                                value={terminal?.id}
                                onCopy={(value) => handleCopyToClipboard(value, 'Número de Série')}
                            />
                            <InfoRow label="Versão do Software" value="Versão 2.2.7 • Build-os" />
                            <InfoRow label="Versão do Firmware" value={`FW-${terminal?.id?.substring(0, 12) || 'N/A'}`} />
                            <InfoRow label="Sistema Operacional" value="ZéPoint OS" />

                            <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-4">
                                <h4 className="font-bold mb-4 dark:text-white">Ferramentas Avançadas</h4>

                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Modo Demonstração</span>
                                    <button
                                        onClick={toggleDemoMode}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${isDemoMode ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${isDemoMode ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            try {
                                                await backupService.createBackup(terminal?.user_id || 'unknown');
                                                await dialog.alert({ title: 'Sucesso', message: 'Backup criado!' });
                                            } catch (e) {
                                                await dialog.alert({ title: 'Erro', message: 'Erro no backup' });
                                            }
                                        }}
                                    >
                                        <Download className="w-4 h-4 mr-2" /> Backup
                                    </Button>
                                    <label className="flex">
                                        <input
                                            type="file"
                                            hidden
                                            accept=".json"
                                            onChange={async (e) => {
                                                if (e.target.files?.[0]) {
                                                    try {
                                                        const res = await backupService.restoreBackup(e.target.files[0]);
                                                        await dialog.alert({ title: 'Sucesso', message: `Restaurado: ${res.count} itens.` });
                                                        window.location.reload(); // Reload to apply
                                                    } catch (err) {
                                                        await dialog.alert({ title: 'Erro', message: 'Falha ao restaurar.' });
                                                    }
                                                }
                                            }}
                                        />
                                        <div className="btn-outline-styles w-full flex items-center justify-center font-semibold border border-gray-200 dark:border-gray-700 rounded-full text-sm py-2 px-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200">
                                            <RefreshCw className="w-4 h-4 mr-2" /> Restaurar
                                        </div>
                                    </label>
                                </div>
                                <div className="mt-4">
                                    <Button
                                        variant="outline"
                                        fullWidth
                                        onClick={() => { setRunTutorial(true); setStep('home'); }}
                                        className="text-blue-600 border-blue-200"
                                    >
                                        <AlertCircle className="w-4 h-4 mr-2" />
                                        Reiniciar Tutorial
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-3">
                            <Button
                                onClick={handleSaveSettings}
                                className="w-full flex justify-center items-center px-6 py-3 rounded-xl text-green-600 font-bold text-sm bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 duration-300 active:scale-95"
                            >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Salvar
                            </Button>
                            <button
                                onClick={handleDeactivate}
                                className="w-full flex justify-center items-center px-6 py-3 rounded-xl text-red-600 font-bold text-sm bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 duration-300 active:scale-95"
                            >
                                <PowerOff className="w-4 h-4 mr-2" />
                                Desativar Terminal
                            </button>
                        </div>
                    </div>
                );

            case 'sales_simulator':
                return (
                    <div className="flex-1 flex flex-col pt-20 bg-white dark:bg-gray-900">
                        <SubPageHeader title="Simulador de Vendas" onBack={() => setStep('home')} />
                        {showHistory ? (
                            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-t-2xl space-y-2 flex-1 overflow-y-auto">
                                <h4 className="font-bold text-sm text-center dark:text-white mb-2">Histórico Recente</h4>
                                {simulationHistory.length === 0 ? (
                                    <p className="text-xs text-center text-gray-400">Nenhuma simulação salva.</p>
                                ) : (
                                    simulationHistory.map(sim => (
                                        <div key={sim.id} className="bg-white dark:bg-gray-700 p-2 rounded-lg text-xs">
                                            <div className="flex justify-between">
                                                <span>Venda: <span className="font-bold">{formatCurrency(sim.sale_value)}</span></span>
                                                <span>Líquido: <span className="font-bold text-green-500">{formatCurrency(sim.net_value)}</span></span>
                                            </div>
                                            <div className="text-gray-400 text-[10px]">
                                                {new Date(sim.created_at).toLocaleString('pt-BR')}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 flex flex-col justify-center text-center px-4">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor da Venda</p>
                                    <h1 className="text-3xl font-black text-gray-900 dark:text-white my-4 tracking-tighter">
                                        <span className="text-2xl align-baseline mr-1 text-gray-400 font-bold">R$</span>{simulatorAmount}
                                    </h1>
                                    <div className="flex items-center justify-center gap-4 my-4">
                                        <span className={`text-sm font-bold ${feePayer === 'seller' ? 'text-brand-500' : 'text-gray-400'}`}>Vendedor</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={feePayer === 'buyer'} onChange={() => setFeePayer(p => p === 'seller' ? 'buyer' : 'seller')} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-600"></div>
                                        </label>
                                        <span className={`text-sm font-bold ${feePayer === 'buyer' ? 'text-brand-500' : 'text-gray-400'}`}>Comprador</span>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-t-2xl space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Valor cobrado do cliente</span>
                                        <span className="font-bold text-gray-800 dark:text-white">{simulatorCalculations.final}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Taxa Zé</span>
                                        <span className="font-bold text-red-500">-{simulatorCalculations.fees}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-lg">
                                        <span className="font-bold text-gray-500 dark:text-gray-300">Você Recebe</span>
                                        <span className="font-extrabold text-green-600 dark:text-green-400">{simulatorCalculations.net}</span>
                                    </div>
                                </div>
                            </>
                        )}                        <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 dark:bg-gray-800/50">
                            {showHistory ? (
                                <Button variant="outline" onClick={handleClearSimulationHistory} disabled={simulationHistory.length === 0} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:border-red-800 dark:text-red-500 dark:hover:bg-red-900/20">
                                    <Delete className="w-4 h-4 mr-2" />
                                    Limpar
                                </Button>
                            ) : (
                                <Button variant="outline" onClick={handleSaveSimulation} disabled={parseCurrency(simulatorAmount) <= 0}>
                                    <Download className="w-4 h-4 mr-2" />
                                    Salvar
                                </Button>
                            )}
                            <Button variant="outline" onClick={handleToggleHistory}>
                                <History className="w-4 h-4 mr-2" />
                                {showHistory ? 'Voltar' : 'Histórico'}
                            </Button>
                        </div>
                    </div>
                );

            case 'error':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-white dark:bg-gray-900">
                        <AlertTriangle className="w-10 h-10 text-red-600 mb-2" />
                        <h3 className="text-xl font-black mb-2 dark:text-white">Ocorreu um erro</h3>
                        <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
                        <div className="text-xs font-bold mb-6 text-gray-400">{errorType}</div>
                        <Button onClick={resetFlow} className="w-full">Voltar</Button>
                    </div>
                );
            default:
                return <div className="p-4 pt-20 text-center text-sm text-gray-400"><SubPageHeader title={step} onBack={resetFlow} />Etapa não implementada: {step}</div>;
        }
    };


    const showFooter = step === 'amount' || step === 'split_config' || step === 'payment_list';

    if (step === 'loading') {
        return (
            <div className="w-full h-screen bg-[#0f172a] overflow-hidden relative flex flex-col p-2">
                {renderScreenContent()}
            </div>
        );
    }

    const allPaymentsDone = partialAmounts.length > 0 && partialAmounts.every(p => p.status === 'paid');

    const isNewPinValid = newPin.length >= 4 && newPin.length <= 6;
    const isConfirmPinValid = confirmPin.length >= 4 && confirmPin.length <= 6 && newPin === confirmPin;
    const isLockedOut = lockoutUntil && new Date() < lockoutUntil;

    return (
        <div className={`w-full h-screen flex flex-col ${settings.enableHighContrast ? 'contrast-150 saturate-0' : ''}`}>
            <div className="flex-1 bg-white dark:bg-gray-900 shadow-inner overflow-hidden relative flex flex-col">
                <div className={`flex-1 flex ${isDesktop ? 'flex-row' : 'flex-col'} overflow-hidden`}>
                    {isDesktop && (
                        <div className="w-80 bg-gray-50 dark:bg-gray-800/50 border-r border-gray-100 dark:border-gray-700 flex flex-col p-6 overflow-y-auto custom-scrollbar">
                            <Logo className="h-8 mb-8" />
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Status do Terminal</h4>
                                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                                <Server className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold dark:text-white">{terminal?.label || 'Terminal Zé'}</p>
                                                <p className="text-[10px] text-green-600 font-bold uppercase">Online</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-gray-400">ID:</span>
                                                <span className="font-mono dark:text-gray-300">{terminal?.terminal_id?.substring(0, 12)}...</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-gray-400">Cargo:</span>
                                                <span className="font-bold dark:text-gray-300 uppercase">{userRole}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {parseCurrency(amount) > 0 && (
                                    <div className="animate-in slide-in-from-left-4">
                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Venda Atual</h4>
                                        <div className="bg-brand-600 p-4 rounded-xl shadow-lg text-white">
                                            <p className="text-[10px] opacity-80 uppercase font-bold">Total Bruto</p>
                                            <p className="text-2xl font-black">{formatCurrency(parseCurrency(amount))}</p>
                                            {selectedStore && (
                                                <div className="mt-2 pt-2 border-t border-white/20">
                                                    <p className="text-[10px] opacity-80 font-bold">Loja: {selectedStore.name}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="mt-auto pt-6">
                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-100 dark:border-yellow-800">
                                        <div className="flex gap-2 items-start">
                                            <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
                                            <p className="text-[10px] text-yellow-800 dark:text-yellow-200 leading-tight">
                                                Certifique-se de conferir o valor antes de prosseguir com a cobrança.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex-1 flex flex-col relative overflow-hidden">
                        {renderScreenContent()}
                    </div>
                </div>
                {renderPaymentOverlay()}
            </div>
            <WhatsAppReceiptModal
                isOpen={isWhatsAppModalOpen}
                onClose={() => setWhatsAppModalOpen(false)}
                onSend={handleSendWhatsAppReceipt}
            />
            {isDeactivateModalOpen && (
                <div className="absolute inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <div className="text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20">
                                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                            </div>
                            <h3 className="mt-4 text-lg font-bold text-gray-900 dark:text-white">Desativar Terminal?</h3>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Tem certeza? A ZéPoint será desativada e apenas um administrador poderá reativá-la.
                            </p>
                        </div>
                        <div className="mt-6 flex gap-3">
                            <Button onClick={() => setDeactivateModalOpen(false)} variant="outline" className="w-full">
                                Cancelar
                            </Button>
                            <Button onClick={confirmDeactivation} className="w-full bg-red-600 text-white hover:bg-red-700">
                                Sim, Desativar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showFooter && (
                <div>
                    {step === 'split_config' && (
                        <div className="p-3 bg-white rounded-lg animate-in slide-in-from-bottom-2 grid grid-cols-2 gap-2 mb-2">
                            <Button onClick={addPartialAmount} className="w-full rounded-lg h-14 text-lg bg-yellow-500 text-gray-900 hover:bg-yellow-600 border-none" disabled={parseCurrency(amount) <= 0}>
                                Adicionar
                            </Button>
                            <Button onClick={() => setStep('payment_list')} className="w-full rounded-lg h-14 text-lg bg-green-500 hover:bg-green-600 shadow-lg" disabled={remainingToSplit > 0}>
                                Pagar
                            </Button>
                        </div>
                    )}
                    {step === 'payment_list' && (
                        <div className="p-3 bg-white rounded-lg animate-in slide-in-from-bottom-2 ">
                            <Button onClick={handleFinalizeSale} disabled={!allPaymentsDone || processing} className="w-full h-14 text-lg bg-green-600 hover:bg-green-600 disabled:bg-green-700 dark:disabled:bg-gray-700 rounded-lg">
                                {processing ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Finalizar Venda'}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Sheet Keypad - Only shown if enabled by logic (ie. Mobile or non-amount steps) */}
            {showKeypad && (
                <div className="animate-in slide-in-from-bottom-10">
                    <Keypad
                        onKeyPress={isLockedOut ? () => { } : handleKeypadPress} // Disable key presses if locked out
                        onClear={isLockedOut ? () => { } : handleKeypadClear} // Disable clear if locked out
                        onBackspace={isLockedOut ? () => { } : handleKeypadBackspace} // Disable backspace if locked out
                        onConfirm={
                            step === 'amount' ? handleContinueFromAmount :
                                step === 'pin_lock' ? handlePinVerify :
                                    step === 'create_pin' ? handleCreatePin :
                                        step === 'confirm_pin' ? handleCreatePinConfirm : // Corrected this line
                                            undefined // Fallback for other steps
                        }
                        confirmDisabled={
                            isLockedOut ||
                            (step === 'amount' && parseCurrency(amount) <= 0) ||
                            (step === 'pin_lock' && pinEntry.length !== (terminal?.pin_code?.length || 4)) ||
                            (step === 'create_pin' && !isNewPinValid) ||
                            (step === 'confirm_pin' && !isConfirmPinValid)
                        }
                        showConfirm={step === 'pin_lock' || step === 'create_pin' || step === 'confirm_pin' || step === 'amount'}
                    />
                </div>
            )}
            <ReactJoyride
                steps={tutorialSteps}
                run={runTutorial}
                continuous
                showSkipButton
                styles={{
                    options: {
                        zIndex: 10000,
                        primaryColor: '#ea1d2c',
                    }
                }}
                callback={(data) => {
                    if (data.status === 'finished' || data.status === 'skipped') {
                        setRunTutorial(false);
                        // Set a flag in localStorage so it doesn't run every time?
                        // localStorage.setItem('tutorial_seen', 'true'); 
                    }
                }}
            />
            {showSummaryModal && (
                <SummaryReportModal
                    onClose={() => setShowSummaryModal(false)}
                    data={history} // Pass real history data
                />
            )}
            {showLogsModal && (
                <QrCodeLogsModal
                    onClose={() => setShowLogsModal(false)}
                />
            )}

        </div>
    );
};
