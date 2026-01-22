import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Smartphone, Lock, User, QrCode, CheckCircle, AlertTriangle, X, DollarSign, CreditCard, RefreshCw, Loader2, Scan, PowerOff, ArrowLeft, Copy, Delete, Check, ArrowRight, Building, Bike, ChevronRight, History, Settings, ChevronUp, ChevronDown, Calculator, Percent, ShieldCheck, Wifi, Database, Share2, Ticket, WifiOff, Users, Server, Download, TestTube, BatteryCharging, BatteryFull, BatteryMedium, BatteryLow, BatteryWarning, Signal, ArrowDown, FileText, AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { UserTerminal, UserTerminalHistoryItem, PartnerFeeSettings, FinancialStatementItem, ShopSettings, ShopCoupon, SalesSimulation, UserRole, AssociatedStore, Order } from '../types';
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

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const parseCurrency = (val: string) => {
    if (!val) return 0;
    const digits = val.replace(/\D/g, '');
    return Number(digits) / 100;
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
    const { alert } = useDialog(); // Use the custom dialog service

    const handleKeypadPress = (key: string) => {
        setPhone(prev => {
            let value = prev.replace(/\D/g, '');
            if (value.length >= 11) return prev;
            value += key;

            value = value.replace(/^(\d{2})/, '($1) ');
            value = value.replace(/(\s\d{5})/, '$1-');
            return value;
        });
    };

    const handleBackspace = () => {
        setPhone(prev => {
            let value = prev.replace(/(\s|-|\(|\))/g, '');
            value = value.slice(0, -1);

            value = value.replace(/^(\d{2})/, '($1) ');
            value = value.replace(/(\s\d{5})/, '$1-');
            return value;
        });
    };

    const handleClear = () => {
        setPhone('');
    };

    const handleSendClick = async () => {
        const rawPhone = phone.replace(/\D/g, '');
        if (rawPhone.length < 10) {
            await alert({ title: "Telefone Inválido", message: "Por favor, insira um número de telefone válido com DDD." });
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
                            <div className="w-full mt-1 p-3 h-12 flex items-center justify-center bg-gray-50/10 rounded-lg border border-gray-200/20 text-white text-2xl font-mono tracking-widest">
                                {phone || <span className="text-gray-400 text-base">(11) 99999-9999</span>}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-300">Mensagem (use o teclado do aparelho)</label>
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
                <Keypad
                    onKeyPress={handleKeypadPress}
                    onBackspace={handleBackspace}
                    onClear={handleClear}
                    showConfirm={false}
                />
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

const Key: React.FC<{ children: React.ReactNode, onClick: () => void, className?: string, disabled?: boolean }> = ({ children, onClick, className = '', disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`h-14 rounded-lg flex items-center justify-center text-2xl font-bold transition-transform duration-100 ease-in-out active:scale-95 ${className}`}
    >
        {children}
    </button>
);

const Keypad: React.FC<{ onKeyPress: (key: string) => void, onConfirm?: () => void, onClear: () => void, onBackspace: () => void, confirmDisabled?: boolean, showConfirm?: boolean }> = ({ onKeyPress, onConfirm, onClear, onBackspace, confirmDisabled, showConfirm = true }) => {
    const baseKeyStyle = "bg-gray-100 text-gray-900 hover:bg-gray-200 border-t border-l border-r border-gray-200 border-b-2 border-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 dark:border-gray-700";

    return (
        <div className="flex flex-col gap-2 p-3 rounded-lg bg-white shadow-xl border-b-2 border-gray-300">
            <div className="grid grid-cols-3 gap-2">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k => (
                    <Key key={k} onClick={() => onKeyPress(k)} className={baseKeyStyle}>{k}</Key>
                ))}
                <Key onClick={() => onKeyPress('*')} className={baseKeyStyle}>*</Key>
                <Key key='0' onClick={() => onKeyPress('0')} className={baseKeyStyle}>0</Key>
                <Key onClick={() => onKeyPress('#')} className={baseKeyStyle}>#</Key>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
                <Key onClick={onClear} className={`bg-yellow-400 text-black hover:bg-yellow-500 rounded-lg border-b-2 border-yellow-600 dark:border-yellow-700`}>
                    <ArrowLeft size={24} />
                </Key>
                <Key onClick={onBackspace} className={`bg-red-600 text-white hover:bg-red-700 rounded-lg border-b-2 border-red-800 dark:border-red-900`}>
                    <X size={24} />
                </Key>

            </div>
            {showConfirm && (
                <Button onClick={onConfirm} disabled={confirmDisabled} className="w-full h-14 mt-2 text-lg bg-green-600 hover:bg-green-700 text-white rounded-lg border-b-2 border-green-800 dark:border-green-900">
                    Confirmar
                </Button>
            )}
        </div>
    );
};

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
    const [isOnline, setIsOnline] = useState(navigator.onLine);

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

export const MerchantPOS: React.FC<MerchantPOSProps> = ({ onClose }) => {
    const [step, setStep] = useState<POSStep>('loading');
    const [terminal, setTerminal] = useState<UserTerminal | null>(null);
    const [amount, setAmount] = useState('0,00');
    const [errorMsg, setErrorMsg] = useState('');
    const [errorType, setErrorType] = useState<'timeout' | 'auth' | 'validation' | 'unknown' | null>(null);
    const [userRole, setUserRole] = useState<UserRole>('delivery_person'); // Default role

    // Simulator State
    const [simulatorAmount, setSimulatorAmount] = useState('0,00');
    const [feePayer, setFeePayer] = useState<'seller' | 'buyer'>('seller');
    const [feeSettings, setFeeSettings] = useState<PartnerFeeSettings | null>(null);
    const [simulationHistory, setSimulationHistory] = useState<SalesSimulation[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // Split State
    const [totalToSplit, setTotalToSplit] = useState(0);
    const [partialAmounts, setPartialAmounts] = useState<PartialPayment[]>([]);

    const { alert, confirm, prompt } = useDialog(); // Prover alert, confirm e prompt

    const [processing, setProcessing] = useState(false);
    const [pinEntry, setPinEntry] = useState('');
    const [newPin, setNewPin] = useState(''); // For creation
    const [confirmPin, setConfirmPin] = useState(''); // For confirmation
    const [pinAttempts, setPinAttempts] = useState(0); // For brute force protection
    const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null); // For lockout timer

    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);

    // New states for sale type selection and associated stores
    const [saleTypeSelection, setSaleTypeSelection] = useState<'mine' | 'associated_store' | null>(null);
    const [associatedStores, setAssociatedStores] = useState<AssociatedStore[]>([]);
    const [selectedStore, setSelectedStore] = useState<AssociatedStore | null>(null);
    const [storeOpenOrders, setStoreOpenOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Simulation Message
    const [simMessage, setSimMessage] = useState('');
    const [pendingOpId, setPendingOpId] = useState<string | null>(null);
    const [activatingMessageIndex, setActivatingMessageIndex] = useState(0); // New state for activation messages

    // New Hooks & State for Features
    const { isDemoMode, toggleDemoMode, getMockData } = useDemoMode();
    const { showNotification, settings } = useNotification();
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const amountFontSize = useDynamicFont(amount, 60, 30, 1); // Dynamic font for amount
    const [runTutorial, setRunTutorial] = useState(false);

    const tutorialSteps: JoyrideStep[] = [
        {
            target: 'body',
            content: 'Bem-vindo ao ZéPoint! Vamos fazer um tour rápido?',
            placement: 'center'
        },
        {
            target: '.nova-venda-btn',
            content: 'Toque aqui para iniciar uma nova venda.'
        },
        {
            target: '.simulador-btn',
            content: 'Use o simulador para calcular taxas antes da venda.'
        },
        {
            target: '.historico-btn',
            content: 'Visualize suas vendas passadas aqui.'
        }
    ];

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

    const handleCopyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(async () => {
            await alert({ title: 'Sucesso', message: `${label} copiado!` });
        }).catch(async (err) => {
            await alert({ title: 'Erro ao Copiar', message: 'Falha ao copiar conteúdo.' });
            await cloud.logClientError('clipboard_copy', String(err), { label });
        });
    };

    const activatingMessages = useMemo(() => [
        'Sincronizando dados...',
        'Verificando conexão...',
        'Atualizando firmware...',
        'Isso pode levar alguns instantes.',
    ], []);

    useEffect(() => {
        if (step === 'activating_animation_1') {
            const interval = setInterval(() => {
                setActivatingMessageIndex(prevIndex => (prevIndex + 1) % activatingMessages.length);
            }, 3000); // Change message every 3 seconds
            return () => clearInterval(interval);
        }
    }, [step, activatingMessages.length]);

    const handleActivateStart = async () => {
        setActivatingMessageIndex(0); // Reset message index on start
        setStep('activating_animation_1'); // Show animation for activation
        try {
            const activatedTerminal = await cloud.activateMyTerminal();
            if (activatedTerminal) {
                setTerminal(activatedTerminal);
                await alert({ title: 'Sucesso', message: 'ZéPoint ativada com sucesso!' });
                // Add a 10-second delay for the animation
                setTimeout(() => {
                    setStep('create_pin');
                }, 10000); // 10000 milliseconds = 10 seconds
            } else {
                await alert({ title: 'Erro na Ativação', message: 'Falha ao ativar ZéPoint: Terminal não retornado.' });
                setStep('inactive');
            }
        } catch (e: any) {
            await alert({ title: 'Erro', message: e.message || 'Falha ao ativar ZéPoint.' });
            setErrorMsg(e.message || 'Erro desconhecido durante a ativação.');
            setErrorType('unknown');
            setStep('error');
            await cloud.logClientError('pos_activate', e?.message, {});
        }
    };

    // History
    const [history, setHistory] = useState<UserTerminalHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyHasMore, setHistoryHasMore] = useState(true);

    // Settings

    // New state for payment modals
    const [activePayment, setActivePayment] = useState<{ id: string, method: 'PIX' | 'SCAN' | 'USER_CODE', amount: number } | null>(null);
    const [pixCodeData, setPixCodeData] = useState<string | null>(null);
    const [pixTxId, setPixTxId] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(false);
    const [userCodeInput, setUserCodeInput] = useState('');
    const [lockoutCountdown, setLockoutCountdown] = useState<number>(0); // New state for lockout countdown

    const [isWhatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
    const [isSplitButtonActive, setIsSplitButtonActive] = useState(false);
    const [isDeactivateModalOpen, setDeactivateModalOpen] = useState(false);
    const splitButtonRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [showScrollButtons, setShowScrollButtons] = useState(false);

    const handleScroll = (direction: 'up' | 'down') => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({
                top: direction === 'up' ? -80 : 80,
                behavior: 'smooth',
            });
        }
    };

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

    // Effect to manage lockout state from localStorage
    useEffect(() => {
        const storedAttempts = localStorage.getItem('pos_pin_attempts');
        if (storedAttempts) {
            setPinAttempts(Number(storedAttempts));
        }

        const storedLockout = localStorage.getItem('pos_lockout_until');
        if (storedLockout) {
            const lockoutDate = new Date(storedLockout);
            if (lockoutDate > new Date()) {
                setLockoutUntil(lockoutDate);
            } else {
                // If lockout time has passed, clear stored values
                localStorage.removeItem('pos_lockout_until');
                localStorage.removeItem('pos_pin_attempts');
                setPinAttempts(0);
                setLockoutUntil(null);
            }
        }
    }, []);

    // Effect for lockout countdown
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (lockoutUntil) {
            interval = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((lockoutUntil.getTime() - new Date().getTime()) / 1000));
                setLockoutCountdown(remaining);
                if (remaining === 0) {
                    setLockoutUntil(null);
                    setPinAttempts(0);
                    localStorage.removeItem('pos_lockout_until');
                    localStorage.removeItem('pos_pin_attempts');
                }
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [lockoutUntil]);


    const simulatorCalculations = useMemo(() => {
        const saleValue = parseCurrency(simulatorAmount);
        if (!feeSettings || saleValue <= 0) {
            return {
                gross: formatCurrency(0),
                fees: formatCurrency(0),
                net: formatCurrency(0),
                final: formatCurrency(0),
                rawGross: 0,
                rawFees: 0,
                rawNet: 0,
            };
        }

        const feePercent = feeSettings.global_tax_percent / 100;
        const feeFixed = feeSettings.global_tax_fixed;
        let gross = 0;
        let fees = 0;
        let net = 0;

        if (feePayer === 'seller') {
            gross = saleValue;
            fees = (gross * feePercent) + feeFixed;
            net = gross - fees;
        } else { // buyer pays
            // The saleValue is what the seller wants to receive (net)
            net = saleValue;
            // Formula to calculate gross amount so that after fees, the net is the intended value
            gross = (net + feeFixed) / (1 - feePercent);
            fees = gross - net;
        }

        const rawGross = gross > 0 ? gross : 0;
        const rawFees = fees > 0 ? fees : 0;
        const rawNet = net > 0 ? net : 0;

        return {
            gross: formatCurrency(rawGross),
            fees: formatCurrency(rawFees),
            net: formatCurrency(rawNet),
            final: formatCurrency(rawGross), // Final value for buyer is always the gross value
            rawGross,
            rawFees,
            rawNet,
        };

    }, [simulatorAmount, feePayer, feeSettings]);

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
            await alert({ title: 'Sucesso', message: 'Simulação salva com sucesso!' });
            setSimulatorAmount('0,00'); // Reset amount
        } catch (e: any) {
            await alert({ title: 'Erro ao Salvar', message: 'Falha ao salvar simulação: ' + (e.message || 'Erro desconhecido') });
            await cloud.logClientError('sales_simulator_save', e?.message, {});
        }
    };

    const handleToggleHistory = async () => {
        if (!showHistory) {
            try {
                const historyData = await cloud.getMySalesSimulations();
                setSimulationHistory(historyData);
            } catch (e: any) {
                await alert({ title: 'Erro no Histórico', message: 'Falha ao buscar histórico de simulações.' });
                await cloud.logClientError('sales_simulator_history', e?.message, {});
            }
        }
        setShowHistory(!showHistory);
    };

    const handleClearSimulationHistory = async () => {
        const isConfirmed = await (confirm as any)({
            title: 'Limpar Histórico',
            message: 'Deseja apagar todo o histórico de simulações? Esta ação não pode ser desfeita.',
            confirmButtonText: 'Limpar'
        });

        if (isConfirmed) {
            try {
                await cloud.clearMySalesSimulations();
                setSimulationHistory([]);
                await alert({ title: 'Sucesso', message: 'Histórico de simulações limpo!' });
            } catch (e: any) {
                await alert({ title: 'Erro ao Limpar', message: 'Falha ao limpar o histórico.' });
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

    const requestCameraPermission = async (): Promise<boolean> => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error: any) {
            console.error('Erro ao solicitar câmera:', error);
            let message = 'Permissão de câmera negada.';
            if (error.name === 'NotAllowedError') message = 'Permissão negada. Habilite a câmera no navegador.';
            else if (error.name === 'NotFoundError') message = 'Nenhuma câmera encontrada.';
            else if (error.name === 'NotReadableError') message = 'Câmera em uso por outro app.';

            await alert({ title: 'Erro de Câmera', message });
            return false;
        }
    };

    const confirmPayment = async (paymentId: string, method: 'PIX' | 'ZE_QR' | 'USER_CODE', payload: string) => {
        if (!terminal) {
            await alert({ title: 'Erro', message: 'Terminal não inicializado.' });
            return;
        }

        try {
            if (method === 'PIX') {
                const result = await generatePaymentQRCode(activePayment?.amount || 0, {
                    terminal_id: terminal.id,
                    type: 'pos_sale'
                });
                setPixCodeData(result.qrCode);
                setPixTxId(result.txId);
                setIsPolling(true);
            } else if (method === 'ZE_QR' || method === 'USER_CODE') {
                // Restaurando lógica original simplificada ou adaptando para processPosPayment
                // Como processPosPayment pede cardId, e payload aqui seria o decodedText (cardId ou userCode)

                await cloud.processPosPayment(
                    payload, // cardId ou userCode
                    activePayment?.amount || 0,
                    userRole,
                    terminal.user_id,
                    undefined, // splitGroupId
                    couponCode || undefined,
                    couponDiscount || 0,
                    selectedStore?.id
                );

                await alert({ title: 'Sucesso', message: 'Pagamento confirmado!' });
                setStep('success');
            }
        } catch (e: any) {
            await alert({ title: 'Erro no Pagamento', message: e.message || 'Falha ao confirmar pagamento.' });
            await cloud.logClientError('pos_confirm_payment', e?.message, {});
        }
    };

    const verifyStatus = async (transactionId: string) => {
        return await checkPaymentStatus(transactionId);
    };

    useEffect(() => {
        let scanner: any = null;

        const initScanner = async () => {
            if (activePayment?.method === 'SCAN' && typeof Html5QrcodeScanner !== 'undefined') {
                const hasPermission = await requestCameraPermission();
                if (!hasPermission) {
                    setActivePayment(null); // Fecha o modal/estado se não tiver permissão
                    return;
                }

                scanner = new Html5QrcodeScanner('qr-reader', { fps: 10, qrbox: 200 });
                const onSuccess = (decodedText: string) => {
                    confirmPayment(activePayment.id, 'ZE_QR', decodedText);
                    scanner.clear();
                };
                const onFailure = () => { };
                scanner.render(onSuccess, onFailure);
            }
        };

        if (activePayment?.method === 'SCAN') {
            initScanner();
        }

        return () => {
            if (scanner) {
                try { scanner.clear(); } catch { }
            }
        };
    }, [activePayment]);

    // Polling do PIX
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (isPolling && pixTxId && activePayment?.method === 'PIX') {
            interval = setInterval(async () => {
                try {
                    const status = await checkPaymentStatus(pixTxId); // Usando a importada direto
                    if (status.status === 'paid') {
                        setIsPolling(false);
                        setPixCodeData(null);
                        setPixTxId(null);
                        await alert({ title: 'Pagamento Recebido', message: 'Pagamento recebido com sucesso!' });
                        // Como confirmPayment agora gera novo QR code se method=PIX, e aqui queremos finalizar...
                        // Mas espere, confirmPayment com 'PIX' GERA o QR code.
                        // Aqui o pagamento JÁ FOI confirmado externamente.
                        // Precisamos apenas ir para sucesso.
                        setStep('success');
                    } else if (status.status === 'failed' || status.status === 'expired') {
                        setIsPolling(false);
                        await alert({ title: 'Pagamento Expirado', message: 'O tempo limite para o pagamento expirou.' });
                    }
                } catch (e) {
                    console.error('Polling error', e);
                }
            }, 5000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isPolling, pixTxId, activePayment]);


    // Load data
    useEffect(() => {
        const load = async () => {
            try {
                // Demo Mode Check
                if (isDemoMode) {
                    const mockTerm = getMockData('terminal');
                    if (mockTerm) {
                        setTerminal(mockTerm as any);
                        setUserRole('store_partner'); // Simulate store partner
                        setStep('amount');
                    }
                    return;
                }

                const [fees, role, stores] = await Promise.all([
                    cloud.getPublicFeeSettings(),
                    cloud.getUserRole(),
                    cloud.getPartnerAssociatedStores()
                ]);

                if (fees) {
                    setFeeSettings(fees);
                }
                setUserRole(role);

                let currentTerminal: UserTerminal | null = null;
                let nextStep: POSStep = 'activation_intro';

                // Step 1: Try to get a personal terminal for eligible roles
                if (role === 'store_partner' || role === 'admin' || role === 'delivery_partner') {
                    currentTerminal = await cloud.getMyTerminal();
                }

                if (currentTerminal) {
                    setTerminal(currentTerminal);
                    if (currentTerminal.status === 'ACTIVE') {
                        if (currentTerminal.pin_code) {
                            nextStep = 'pin_lock';
                        } else {
                            nextStep = 'create_pin';
                        }
                    } else { // currentTerminal is not ACTIVE
                        setErrorMsg('Seu terminal está inativo. Por favor, ative-o ou contate o suporte.');
                        setErrorType('validation');
                        nextStep = 'inactive';
                    }
                } else {
                    // No personal terminal found, now check for delivery_person and associated stores
                    if (role === 'delivery_person') {
                        if (stores && stores.length > 0) {
                            setAssociatedStores(stores);
                            if (stores.length === 1) {
                                setSelectedStore(stores[0]);
                                currentTerminal = await cloud.getStoreTerminal(stores[0].id);
                                if (currentTerminal) {
                                    setTerminal(currentTerminal);
                                    if (currentTerminal.status === 'ACTIVE') {
                                        nextStep = 'amount';
                                    } else {
                                        setErrorMsg('Terminal da loja associada inativo.');
                                        setErrorType('validation');
                                        nextStep = 'inactive';
                                    }
                                } else {
                                    setErrorMsg('Terminal da loja associada não encontrado.');
                                    setErrorType('validation');
                                    nextStep = 'inactive';
                                }
                            } else { // Multiple associated stores for delivery_person
                                nextStep = 'choose_sale_type';
                            }
                        } else { // delivery_person without associated stores
                            setErrorMsg('Entregador normal sem lojas associadas não pode usar a maquininha.');
                            setErrorType('validation');
                            nextStep = 'inactive';
                        }
                    } else if (role === 'delivery_partner' || role === 'store_partner' || role === 'admin') {
                        // For these roles, if no currentTerminal was found, they need to activate/create one.
                        nextStep = 'activation_intro';
                        // Removed setErrorMsg and setErrorType here, as it's an intended flow, not an error.
                    } else {
                        // Fallback for any other unhandled scenario or role
                        setErrorMsg('Não foi possível carregar seu perfil de terminal. Por favor, contate o suporte.');
                        setErrorType('unknown');
                        nextStep = 'inactive';
                    }
                }

                setStep(nextStep);

            } catch (e: any) {
                const msg = e?.message || '';
                let type: 'timeout' | 'auth' | 'validation' | 'unknown' = 'unknown';
                if (msg.toLowerCase().includes('timeout')) type = 'timeout';
                else if (msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('token')) type = 'auth';
                else if (msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('not found')) type = 'validation';
                setErrorMsg('Erro ao carregar dados do terminal.');
                setErrorType(type);
                setStep('error');
                await cloud.logClientError('pos_load', msg, {});
            }
        };

        if (step === 'loading') {
            load();
        }
    }, [step]);

    const handleSendWhatsAppReceipt = async (phone: string, message: string) => {
        const encodedText = encodeURIComponent(message);
        const url = `https://wa.me/55${phone}?text=${encodedText}`;
        window.open(url, '_blank');
        await alert({ title: 'Sucesso', message: "Abrindo WhatsApp..." });
    };

    const receiptRef = useRef<HTMLDivElement>(null);

    const handleDownloadReceipt = async () => {
        if (!receiptRef.current) return;
        html2canvas(receiptRef.current, { backgroundColor: '#ffffff' }).then(async canvas => {
            const link = document.createElement('a');
            link.download = 'comprovante-ze-entregas.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            await alert({ title: 'Sucesso', message: "Comprovante baixado!" });
        }).catch(async (err) => {
            await alert({ title: 'Erro', message: 'Falha ao gerar comprovante' });
            await cloud.logClientError('receipt', 'html2canvas_failed', { error: String(err) });
        });
    };

    const handleGoBack = () => {
        if (step === 'amount') {
            if (saleTypeSelection === 'associated_store') {
                setStep('select_associated_store');
            } else if (saleTypeSelection === 'mine') {
                setStep('home');
            } else { // This might happen if a delivery_person with 1 store goes directly to amount
                setStep('home'); // Or maybe better to re-evaluate the initial state
            }
        } else if (step === 'split_config') {
            setStep('amount');
        } else if (step === 'payment_list') {
            setStep('split_config');
        } else if (step === 'select_associated_store') {
            setStep('choose_sale_type');
        } else if (step === 'select_order_for_store') {
            setStep('select_associated_store');
        } else {
            setStep('home');
        }
    };

    const handlePinVerify = async () => {
        if (lockoutUntil && new Date() < lockoutUntil) {
            await alert({ title: 'Terminal Bloqueado', message: 'Terminal bloqueado. Tente novamente mais tarde.' });
            setPinEntry('');
            return;
        }

        if (pinEntry === terminal?.pin_code) {
            setPinEntry('');
            setPinAttempts(0); // Reset attempts on success
            setLockoutUntil(null); // Clear lockout on success
            localStorage.removeItem('pos_pin_attempts');
            localStorage.removeItem('pos_lockout_until');
            setStep('home');
        } else {
            const newAttempts = pinAttempts + 1;
            setPinAttempts(newAttempts);
            localStorage.setItem('pos_pin_attempts', String(newAttempts));

            if (newAttempts >= 3) { // 3 failed attempts
                const lockoutTime = new Date(new Date().getTime() + 5 * 60 * 1000); // 5 minutes lockout
                setLockoutUntil(lockoutTime);
                localStorage.setItem('pos_lockout_until', lockoutTime.toISOString());
                await alert({ title: 'Erro', message: `PIN incorreto. Terminal bloqueado por 5 minutos.` });
            } else {
                await alert({ title: 'Erro', message: `PIN incorreto. Tentativas restantes: ${3 - newAttempts}.` });
            }
            setPinEntry('');
        }
    };

    const handleCreatePin = async () => {
        // Validation for newPin
        const pinRegex = /^\d{4,6}$/; // 4 to 6 digits numeric
        if (!pinRegex.test(newPin)) {
            await alert({ title: 'PIN Inválido', message: 'PIN deve ter 4 a 6 dígitos numéricos.' });
            return;
        }
        setStep('confirm_pin');
    };

    const handleCreatePinConfirm = async () => {
        if (!terminal) {
            await alert({ title: 'Erro', message: 'Terminal não inicializado ou não encontrado.' });
            setStep('inactive');
            return;
        }

        if (newPin !== confirmPin) {
            await alert({ title: 'Erro', message: 'Os PINs não coincidem. Tente novamente.' });
            setConfirmPin(''); // Clear confirm pin for retry
            return;
        }

        // Final validation before saving
        const pinRegex = /^\d{4,6}$/;
        if (!pinRegex.test(newPin)) {
            await alert({ title: 'PIN Inválido', message: 'PIN inválido. Deve ter 4 a 6 dígitos numéricos.' });
            setNewPin('');
            setConfirmPin('');
            setStep('create_pin');
            return;
        }

        try {
            await cloud.setTerminalPin(newPin, terminal.user_id);
            setTerminal(prev => prev ? { ...prev, pin_code: newPin } : null);
            setNewPin('');
            setConfirmPin('');
            await alert({ title: 'Sucesso', message: 'PIN criado com sucesso!' });
            setStep('activating_animation_2');
            setTimeout(() => {
                setStep('home');
            }, 5000);
        } catch (e: any) {
            await alert({ title: 'Erro', message: e.message || 'Falha ao criar PIN.' });
            await cloud.logClientError('pos_pin_create', e?.message, {});
        }
    };

    const resetFlow = () => {
        setAmount('0,00');
        setTotalToSplit(0);
        setPartialAmounts([]);
        setCouponCode('');
        setCouponDiscount(0);
        setActivePayment(null);
        setSelectedOrder(null); // Clear selected order
        setSelectedStore(null); // Clear selected store
        setSaleTypeSelection(null); // Clear sale type selection

        // Determine next step based on user role and associated stores
        if ((userRole === 'delivery_partner' || userRole === 'delivery_person') && associatedStores.length > 0) {
            if (userRole === 'delivery_person' && associatedStores.length === 1) {
                // If normal delivery person has only one store, pre-select it and go to amount
                setSelectedStore(associatedStores[0]);
                setSaleTypeSelection('associated_store');
                setStep('amount');
            } else {
                setStep('choose_sale_type');
            }
        } else {
            setStep('home');
        }
    };

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
            await alert({ title: 'Erro', message: 'O valor deve ser maior que zero.' });
            return;
        }
        if (currentAmount > remainingToSplit) {
            await alert({ title: 'Erro', message: `O valor excede o restante a ser dividido (${formatCurrency(remainingToSplit)}).` });
            return;
        }
        setPartialAmounts(prev => [...prev, { id: crypto.randomUUID(), amount: currentAmount, status: 'unpaid' }]);
        setAmount('0,00'); // Reset amount input
    };

    const handleKeypadPress = (key: string) => {
        if (step === 'amount' || (step === 'split_config' && isSplitButtonActive)) {
            setAmount(prev => {
                if (!/^\d$/.test(key)) return prev;
                const numStr = prev.replace(/\D/g, '');
                if (numStr.length >= 11) return prev;
                const newNumStr = numStr + key;
                const num = parseInt(newNumStr, 10);
                return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(num / 100);
            });
        } else if (step === 'pin_lock') {
            const pinLen = terminal?.pin_code?.length || 4;
            setPinEntry(prev => (prev.length < pinLen ? prev + key : prev));
        } else if (step === 'create_pin') {
            setNewPin(prev => {
                // Allow only numeric input and limit to 6 digits
                if (!/\d/.test(key) || prev.length >= 6) return prev;
                return prev + key;
            });
        } else if (step === 'confirm_pin') {
            setConfirmPin(prev => {
                // Allow only numeric input and limit to 6 digits
                if (!/\d/.test(key) || prev.length >= 6) return prev;
                return prev + key;
            });
        }
        else if (step === 'sales_simulator' && !showHistory) {
            setSimulatorAmount(prev => {
                if (!/^\d$/.test(key)) return prev;
                const numStr = prev.replace(/\D/g, '');
                if (numStr.length >= 11) return prev;
                const newNumStr = numStr + key;
                const num = parseInt(newNumStr, 10);
                return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(num / 100);
            });
        }
    };

    const handleKeypadClear = () => {
        if (step === 'amount' || (step === 'split_config' && isSplitButtonActive)) {
            setAmount('0,00');
        } else if (step === 'pin_lock') {
            setPinEntry('');
        } else if (step === 'create_pin') {
            setNewPin('');
        } else if (step === 'confirm_pin') {
            setConfirmPin('');
        } else if (step === 'sales_simulator' && !showHistory) {
            setSimulatorAmount('0,00');
        }
    };

    const handleKeypadBackspace = () => {
        if (step === 'amount' || (step === 'split_config' && isSplitButtonActive)) {
            setAmount(prev => {
                let numStr = prev.replace(/\./g, '').replace(',', ''); // "12345"
                if (numStr.length <= 1) return '0,00';
                numStr = numStr.slice(0, -1);
                const num = parseInt(numStr, 10);
                return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num / 100);
            });
        } else if (step === 'pin_lock') {
            setPinEntry(prev => prev.slice(0, -1));
        } else if (step === 'create_pin') {
            setNewPin(prev => prev.slice(0, -1));
        } else if (step === 'confirm_pin') {
            setConfirmPin(prev => prev.slice(0, -1));
        } else if (step === 'sales_simulator' && !showHistory) {
            setSimulatorAmount(prev => {
                let numStr = prev.replace(/\./g, '').replace(',', ''); // "12345"
                if (numStr.length <= 1) return '0,00';
                numStr = numStr.slice(0, -1);
                const num = parseInt(numStr, 10);
                return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num / 100);
            });
        }
    };

    const handleContinueFromAmount = () => {
        const total = parseCurrency(amount);
        if (total <= 0) return;
        setTotalToSplit(total);
        setPartialAmounts([{ id: crypto.randomUUID(), amount: total, status: 'unpaid' }]);
        setStep('payment_list');
    };

    const closePaymentOverlay = () => {
        setActivePayment(null);
        setPixCodeData(null);
        setPixTxId(null);
        setIsPolling(false);
        setUserCodeInput('');
    };

    // Initiate Payment Action
    const initiatePayment = async (paymentId: string, amount: number, method: 'PIX' | 'SCAN' | 'USER_CODE') => {
        setActivePayment({ id: paymentId, method, amount });
        if (method === 'PIX') {
            try {
                // Call real payment gateway
                const result = await generatePaymentQRCode(amount, {
                    description: `Pagamento ZéPoint - Terminal ${terminal?.terminal_id}`,
                    terminal_id: terminal?.id,
                    type: 'pos_sale'
                });
                setPixCodeData(result.qrCode);
                setPixTxId(result.txId);
                setIsPolling(true);
            } catch (e: any) {
                const msg = e?.message || '';
                let type: 'timeout' | 'auth' | 'validation' | 'unknown' = 'unknown';
                if (msg.toLowerCase().includes('timeout')) type = 'timeout';
                else if (msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('token')) type = 'auth';
                else if (msg.toLowerCase().includes('invalid')) type = 'validation';
                setErrorMsg('Falha ao gerar PIX: ' + msg);
                setErrorType(type);
                // Dont go to error step immediately, allow retry
                await alert({ title: 'Erro no PIX', message: 'Falha ao gerar PIX: ' + msg });
                // closePaymentOverlay();
            }
        }
    };



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
                data = await cloud.getMyTerminalHistoryPaged(page, 20);
                setHistoryHasMore(data.length === 20);
            }

            setHistory(prev => reset ? data : [...prev, ...data]);
            setHistoryPage(page + 1);
        } catch (e: any) {
            await alert({ title: 'Erro', message: e.message || 'Falha ao carregar histórico' });
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleFinalizeSale = async () => {
        if (!allPaymentsDone) return;
        setProcessing(true);

        // Construct Payload
        const transaction = {
            user_id: userRole === 'delivery_partner' ? terminal?.user_id : userRole === 'store_partner' ? terminal?.user_id : undefined, // Fallback
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

        if (isDemoMode) {
            // Just proceed to success in demo
            // Maybe add to mock history if needed (already handled by getMockData logic perhaps?)
            await alert({ title: 'Sucesso', message: 'Venda Demo Registrada!' });
            setStep('success');
            setProcessing(false);
            return;
        }

        try {
            await cloud.createTerminalTransaction(transaction);
            setStep('success');
        } catch (e: any) {
            await alert({ title: 'Erro no Registro', message: 'Erro ao registrar venda. Tentando offline...' });
            setStep('success'); // Optimistic success
        } finally {
            setProcessing(false);
        }
    };

    const openSettings = () => {
        setStep('settings');
    };

    const handleSaveSettings = async () => {
        // Placeholder for future settings
        await alert({ title: 'Sucesso', message: 'Configurações salvas!' });
        setStep('home');
    };

    const handleDeactivate = async () => {
        setDeactivateModalOpen(true);
    };

    const confirmDeactivation = async () => {
        setDeactivateModalOpen(false);
        try {
            await cloud.deactivateMyTerminal();
            await alert({ title: 'Sucesso', message: 'Terminal desativado.' });
            setStep('inactive');
        } catch (e: any) {
            await alert({ title: 'Erro', message: e.message });
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
            <div className="absolute inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col animate-in slide-in-from-bottom-10">
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
                            <p className="text-sm text-gray-500 mb-6">Peça para o cliente escanear o QR Code.</p>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
                                <PaymentQRCode value={pixCodeData || ''} />
                            </div>
                            <p className="text-xs text-gray-400">O status será atualizado automaticamente quando o pagamento for confirmado.</p>
                        </>
                    )}

                    {activePayment.method === 'SCAN' && (
                        <>
                            <p className="text-sm text-gray-500 mb-6">Aponte a câmera para o Cartão Virtual ou QR do cliente.</p>
                            <div id="qr-reader" className="w-64 h-64 bg-black rounded-2xl overflow-hidden mb-6"></div>
                            <Button
                                onClick={() => { }}
                                className="w-full py-4" disabled
                            >
                                Aguardando leitura...
                            </Button>
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
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">ZéPoint</h2>
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
                            if (storeTerm.pin_code) {
                                // If the store's terminal has a PIN, require it
                                setStep('pin_lock');
                            } else {
                                // Otherwise, go straight to amount
                                setStep('amount');
                            }
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
                const isNewPinValid = newPin.length >= 4 && newPin.length <= 6;
                return (
                    <div className="flex-1 flex flex-col p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                        <div className="flex-1 flex flex-col justify-center items-center">
                            <Lock className="w-12 h-12 text-brand-600 mb-4" />
                            <h2 className="text-xl font-bold mb-2">Defina seu PIN</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">
                                Crie uma senha numérica de 4 a 6 dígitos para acessar sua ZéPoint.
                            </p>
                            <div className="flex gap-4 mb-2">
                                {Array.from({ length: newPin.length }).map((_, i) => (
                                    <div key={i} className="w-5 h-5 rounded-full bg-black dark:bg-white" />
                                ))}
                                {Array.from({ length: 6 - newPin.length }).map((_, i) => (
                                    <div key={i} className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-700" />
                                ))}
                            </div>
                            {!isNewPinValid && newPin.length > 0 && (
                                <p className="text-red-500 text-xs mt-2">O PIN deve ter entre 4 e 6 dígitos.</p>
                            )}
                        </div>
                    </div>
                );

            case 'confirm_pin':
                const doPinsMatch = newPin === confirmPin;
                const isConfirmPinValid = confirmPin.length >= 4 && confirmPin.length <= 6;
                const confirmPinError = !doPinsMatch && confirmPin.length > 0;

                return (
                    <div className="flex-1 flex flex-col p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                        <div className="flex-1 flex flex-col justify-center items-center">
                            <ShieldCheck className="w-12 h-12 text-brand-600 mb-4" />
                            <h2 className="text-xl font-bold mb-2">Confirme seu PIN</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">
                                Repita o PIN que você acabou de criar para confirmar.
                            </p>
                            <div className="flex gap-4 mb-2">
                                {Array.from({ length: confirmPin.length }).map((_, i) => (
                                    <div key={i} className="w-5 h-5 rounded-full bg-black dark:bg-white" />
                                ))}
                                {Array.from({ length: 6 - confirmPin.length }).map((_, i) => (
                                    <div key={i} className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-700" />
                                ))}
                            </div>
                            {confirmPinError && (
                                <p className="text-red-500 text-xs mt-2">Os PINs não coincidem!</p>
                            )}
                            {!isConfirmPinValid && confirmPin.length > 0 && (
                                <p className="text-red-500 text-xs mt-2">O PIN deve ter entre 4 e 6 dígitos.</p>
                            )}
                        </div>
                    </div>
                );

            case 'pin_lock':
                const isLockedOut = lockoutUntil && new Date() < lockoutUntil;
                const minutes = Math.floor(lockoutCountdown / 60);
                const seconds = lockoutCountdown % 60;
                const lockoutMessage = `Terminal bloqueado. Tente novamente em ${minutes > 0 ? `${minutes}m ` : ''}${seconds}s.`;
                const pinLength = terminal?.pin_code?.length || 4;

                return (
                    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                        <SubPageHeader title="Nova Venda" onBack={onClose} />
                        <div className="flex-1 flex flex-col justify-center items-center p-6">
                            <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4 shadow-inner">
                                {isLockedOut ? <Lock className="w-8 h-8 text-red-600" /> : <Lock className="w-8 h-8 text-brand-600" />}
                            </div>
                            <h3 className="text-xl font-bold mb-6">{isLockedOut ? 'Acesso Bloqueado' : 'ZéPoint Bloqueado'}</h3>
                            {isLockedOut ? (
                                <p className="text-red-500 text-sm mb-8 text-center">{lockoutMessage}</p>
                            ) : (
                                <div className="flex justify-center gap-4 mb-8">
                                    {Array.from({ length: pinLength }).map((_, i) => <div key={i} className={`w-4 h-4 rounded-full border-2 ${i < pinEntry.length ? 'bg-black dark:bg-white border-black dark:border-white' : 'border-gray-300 dark:border-gray-700'}`} />)}
                                </div>
                            )}
                        </div>
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
                    <div className="flex-1 flex flex-col justify-start pt-8 p-4 bg-gray-50 dark:bg-gray-900">
                        <div className="grid grid-cols-2 gap-4">
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
                        <div className="mt-auto p-4"> {/* Footer for home screen */}
                            <button
                                onClick={handleClose}
                                className="w-full flex justify-center items-center px-6 py-3 rounded-xl text-red-600 font-bold text-sm bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 duration-300 active:scale-95"
                            >
                                <PowerOff className="w-4 h-4 mr-2" />
                                Sair
                            </button>
                        </div>
                    </div>
                );

            case 'amount':
                return (
                    <div className="flex-1 flex flex-col justify-center text-center p-4 relative pt-20 bg-white dark:bg-gray-900">
                        <SubPageHeader title="Nova Venda" onBack={handleGoBack} />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Valor a Cobrar</p>
                        <h1
                            className="font-black text-gray-900 dark:text-white my-4 tracking-tighter transition-all duration-200"
                            style={{ fontSize: `${amountFontSize}px` }}
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
                                        <div className="grid grid-cols-3 gap-2">
                                            <button title="Gerar Pix" onClick={() => initiatePayment(p.id, p.amount, 'PIX')} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors flex justify-center"><QrCode className="w-5 h-5" /></button>
                                            <button title="Ler Cartão" onClick={() => initiatePayment(p.id, p.amount, 'SCAN')} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-500 hover:text-brand-600 hover:bg-brand-50 transition-colors flex justify-center"><CreditCard className="w-5 h-5" /></button>
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

                        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 backdrop-blur-md">
                            <CheckCircle className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="text-3xl font-black mb-2">Venda Aprovada!</h3>
                        <p className="font-medium opacity-90 mb-6">O que deseja fazer agora?</p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button
                                onClick={handleDownloadReceipt}
                                variant="outline"
                                className="bg-transparent border-white/50 text-white hover:bg-white/10"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Baixar Comprovante
                            </Button>
                            <Button
                                onClick={() => setWhatsAppModalOpen(true)}
                                variant="outline"
                                className="bg-white/90 border-none text-green-600 hover:bg-white"
                            >
                                <Share2 className="w-4 h-4 mr-2" />
                                Enviar via WhatsApp
                            </Button>
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
                                                    const reason = await prompt({ title: 'Reportar Problema', message: 'Descreva o problema com esta venda:', placeholder: 'Ex: Valor incorreto' });
                                                    if (reason) await alert({ title: 'Sucesso', message: 'Problema reportado com sucesso.' });
                                                }}
                                                className="p-2 text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1"
                                            >
                                                <AlertTriangle className="w-3 h-3" /> Problema
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    const note = await prompt({ title: 'Adicionar Nota', message: 'Adicionar observação:', placeholder: 'Observações...' });
                                                    if (note) await alert({ title: 'Sucesso', message: 'Observação salva.' });
                                                }}
                                                className="p-2 text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                                            >
                                                <FileText className="w-3 h-3" /> Nota
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    if (await (confirm as any)({ title: 'Confirmar Reembolso', message: 'Confirmar reembolso desta venda?', confirmButtonText: 'Reembolsar' })) {
                                                        await alert({ title: 'Sucesso', message: 'Solicitação de reembolso enviada.' });
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
                                                await alert({ title: 'Sucesso', message: 'Backup criado!' });
                                            } catch (e) {
                                                await alert({ title: 'Erro', message: 'Erro no backup' });
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
                                                        await alert({ title: 'Sucesso', message: `Restaurado: ${res.count} itens.` });
                                                        window.location.reload(); // Reload to apply
                                                    } catch (err) {
                                                        await alert({ title: 'Erro', message: 'Falha ao restaurar.' });
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

    const showKeypad = ['amount', 'pin_lock', 'create_pin', 'confirm_pin', 'split_config'].includes(step) || (step === 'sales_simulator' && !showHistory);
    const showFooter = step === 'amount' || step === 'split_config' || step === 'payment_list';

    // Loading Splash
    if (step === 'loading') {
        return (
            <div className="fixed inset-0 bg-gray-100 dark:bg-black/50 z-[200] flex items-center justify-center animate-in fade-in">
                <div className="w-full h-full sm:max-w-sm bg-gray-900 shadow-2xl overflow-hidden relative flex flex-col p-2 ">
                    {renderScreenContent()}
                </div>
            </div>
        );
    }

    const allPaymentsDone = partialAmounts.length > 0 && partialAmounts.every(p => p.status === 'paid');

    const isNewPinValid = newPin.length >= 4 && newPin.length <= 6;
    const isConfirmPinValid = confirmPin.length >= 4 && confirmPin.length <= 6 && newPin === confirmPin;
    const isLockedOut = lockoutUntil && new Date() < lockoutUntil;

    return (
        <div className={`fixed inset-0 bg-black/80 z-[200] flex items-center justify-center animate-in fade-in ${settings.enableHighContrast ? 'contrast-150 saturate-0' : ''}`}>

            <div className="w-full h-full sm:max-w-sm bg-brand-600 shadow-2xl overflow-hidden relative flex flex-col p-2 sm:rounded-xl">

                <img src="https://raw.githubusercontent.com/DalisonMessias/cdn.rabbit.gg/refs/heads/main/assets/64536456457.svg" alt="Logo" className="h-8 mb-2.5" />
                <div className="flex-1 bg-white dark:bg-gray-900 rounded-xl shadow-inner mb-2 overflow-hidden relative flex flex-col">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl flex justify-center items-center p-1">
                        <div className="w-12 h-1.5 bg-gray-700 rounded-full"></div>
                    </div>
                    <StatusBar />
                    {renderScreenContent()}
                    {renderPaymentOverlay()}
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
                </div>

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
        </div>
    );
};

