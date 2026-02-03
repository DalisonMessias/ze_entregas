import { useState, useEffect, useMemo } from 'react';
import * as cloud from '../services/cloud';
import { UserTerminal, SalesSimulation, UserRole, AssociatedStore, Order, PartnerProfile, PartnerFeeSettings } from '../types';
import { useDialog } from '../utils/dialogService';
import { useDemoMode } from './useDemoMode';
import { useNotification } from '../contexts/NotificationContext';
import { generatePaymentQRCode, checkPaymentStatus } from '../services/paymentGateway';
import { generatePixPayload } from '../utils/pixPayloadGenerator';

import ReactJoyride, { Step as JoyrideStep } from '@list-labs/react-joyride';

export type POSStep = 'loading' | 'activation_intro' | 'activating_animation_1' | 'create_pin' | 'confirm_pin' | 'pin_lock' | 'home' | 'amount' | 'split_config' | 'payment_list' | 'processing' | 'success' | 'error' | 'history' | 'settings' | 'inactive' | 'sales_simulator' | 'choose_sale_type' | 'select_associated_store' | 'select_order_for_store' | 'activating_animation_2';

export type PaymentMethod = 'PIX' | 'CREDIT_CARD' | 'ZE_QR' | 'ZE_CODE';

export interface PartialPayment {
    id: string;
    amount: number;
    status: 'unpaid' | 'processing' | 'paid' | 'error';
    method?: PaymentMethod;
    paidAt?: string;
    txId?: string;
}

export const useMerchantPOS = () => {
    const dialog = useDialog();
    const { isDemoMode, toggleDemoMode, getMockData } = useDemoMode();
    const { showNotification } = useNotification();

    // Core State
    const [step, setStep] = useState<POSStep>('loading');
    const [terminal, setTerminal] = useState<UserTerminal | null>(null);
    const [amount, setAmount] = useState('0,00');
    const [errorMsg, setErrorMsg] = useState('');
    const [userRole, setUserRole] = useState<UserRole>('delivery_person');
    const [partnerProfile, setPartnerProfile] = useState<PartnerProfile | null>(null);

    // Split & Payments
    const [totalToSplit, setTotalToSplit] = useState(0);
    const [partialAmounts, setPartialAmounts] = useState<PartialPayment[]>([]);
    const [activePayment, setActivePayment] = useState<{ id: string, method: 'PIX' | 'SCAN' | 'USER_CODE', amount: number } | null>(null);
    const [pixCodeData, setPixCodeData] = useState<string | null>(null);
    const [pixTxId, setPixTxId] = useState<string | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    // PIN Security
    const [pinEntry, setPinEntry] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [pinAttempts, setPinAttempts] = useState(0);
    const [lockoutUntil, setLockoutUntil] = useState<Date | null>(null);
    const [lockoutCountdown, setLockoutCountdown] = useState<number>(0);

    // Simulator
    const [simulatorAmount, setSimulatorAmount] = useState('0,00');
    const [feePayer, setFeePayer] = useState<'seller' | 'buyer'>('seller');
    const [feeSettings, setFeeSettings] = useState<PartnerFeeSettings | null>(null);
    const [simulationHistory, setSimulationHistory] = useState<SalesSimulation[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // Associated Stores
    const [saleTypeSelection, setSaleTypeSelection] = useState<'mine' | 'associated_store' | null>(null);
    const [associatedStores, setAssociatedStores] = useState<AssociatedStore[]>([]);
    const [selectedStore, setSelectedStore] = useState<AssociatedStore | null>(null);
    const [storeOpenOrders, setStoreOpenOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Utils
    const [processing, setProcessing] = useState(false);
    const [activatingMessageIndex, setActivatingMessageIndex] = useState(0);

    // Sales History
    const [history, setHistory] = useState<any[]>([]); // Using any[] for now to avoid import issues, should be UserTerminalHistoryItem[]
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyHasMore, setHistoryHasMore] = useState(true);

    // Coupon
    const [couponCode, setCouponCode] = useState('');
    const [couponDiscount, setCouponDiscount] = useState(0);

    // UI States (moved from components)
    const [errorType, setErrorType] = useState<'timeout' | 'auth' | 'validation' | 'unknown' | null>(null);
    const [isWhatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
    const [isSplitButtonActive, setIsSplitButtonActive] = useState(false);
    const [isDeactivateModalOpen, setDeactivateModalOpen] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [runTutorial, setRunTutorial] = useState(false);

    // -- FORMATTERS --
    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    const parseCurrency = (val: string) => {
        if (!val) return 0;
        const digits = val.replace(/\D/g, '');
        return Number(digits) / 100;
    };

    const handleCopyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text).then(() => {
            showNotification(`${label} copiado!`, 'success');
        });
    };

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

    // -- KEYPAD & NAVIGATION HANDLERS --

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
                if (!/\d/.test(key) || prev.length >= 6) return prev;
                return prev + key;
            });
        } else if (step === 'confirm_pin') {
            setConfirmPin(prev => {
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
                let numStr = prev.replace(/\./g, '').replace(',', '');
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
                let numStr = prev.replace(/\./g, '').replace(',', '');
                if (numStr.length <= 1) return '0,00';
                numStr = numStr.slice(0, -1);
                const num = parseInt(numStr, 10);
                return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num / 100);
            });
        }
    };

    const handleGoBack = (onClose?: () => void) => {
        if (step === 'amount') {
            if (saleTypeSelection === 'associated_store') {
                setStep('select_associated_store');
            } else if (saleTypeSelection === 'mine') {
                setStep('home');
            } else {
                setStep('home');
            }
        } else if (step === 'split_config') {
            setStep('amount');
        } else if (step === 'payment_list') {
            setStep('split_config');
        } else if (step === 'select_associated_store') {
            setStep('choose_sale_type');
        } else if (step === 'select_order_for_store') {
            setStep('select_associated_store');
        } else if (step === 'home') {
            if (onClose) onClose();
        } else {
            setStep('home');
        }
    };

    const handleContinueFromAmount = () => {
        const total = parseCurrency(amount);
        if (total <= 0) return;
        setTotalToSplit(total);
        setPartialAmounts([{ id: crypto.randomUUID(), amount: total, status: 'unpaid' }]);
        setStep('payment_list');
    };

    const resetFlow = () => {
        setAmount('0,00');
        setTotalToSplit(0);
        setPartialAmounts([]);
        setCouponCode('');
        setCouponDiscount(0);
        setActivePayment(null);
        setSelectedOrder(null);
        setSelectedStore(null);
        setSaleTypeSelection(null);

        if ((userRole === 'delivery_partner' || userRole === 'delivery_person') && associatedStores.length > 0) {
            if (userRole === 'delivery_person' && associatedStores.length === 1) {
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

    // -- EFFECTS --

    // Polling for PIX Payment Status
    useEffect(() => {
        let interval: NodeJS.Timeout | undefined;
        if (isPolling && pixTxId && activePayment?.method === 'PIX') {
            interval = setInterval(async () => {
                try {
                    const status = await checkPaymentStatus(pixTxId);
                    if (status.status === 'paid') {
                        setIsPolling(false);
                        setPartialAmounts(prev => prev.map(p => p.id === activePayment.id ? { ...p, status: 'paid' } : p));
                        setActivePayment(null);
                        await dialog.alert({ title: 'Pagamento Recebido!', message: 'Recebimento confirmado com sucesso.' });
                    }
                } catch (e) {
                    console.error("Erro no polling:", e);
                }
            }, 3000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [isPolling, pixTxId, activePayment]);

    // Lockout Management
    useEffect(() => {
        const storedAttempts = localStorage.getItem('pos_pin_attempts');
        if (storedAttempts) setPinAttempts(Number(storedAttempts));

        const storedLockout = localStorage.getItem('pos_lockout_until');
        if (storedLockout) {
            const lockoutDate = new Date(storedLockout);
            if (lockoutDate > new Date()) {
                setLockoutUntil(lockoutDate);
            } else {
                localStorage.removeItem('pos_lockout_until');
                localStorage.removeItem('pos_pin_attempts');
                setPinAttempts(0);
                setLockoutUntil(null);
            }
        }
    }, []);

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
        return () => { if (interval) clearInterval(interval); };
    }, [lockoutUntil]);

    const activatingMessages = useMemo(() => [
        'Sincronizando dados...',
        'Verificando conexão...',
        'Atualizando firmware...',
        'Isso pode levar alguns instantes.',
    ], []);

    useEffect(() => {
        if (step === 'activating_animation_1') {
            const interval = setInterval(() => {
                setActivatingMessageIndex(prev => (prev + 1) % activatingMessages.length);
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [step, activatingMessages.length]);


    // -- ACTIONS --

    const handleActivateStart = async () => {
        setActivatingMessageIndex(0);
        setStep('activating_animation_1');
        try {
            const activatedTerminal = await cloud.activateMyTerminal();
            if (activatedTerminal) {
                setTerminal(activatedTerminal);
                await dialog.alert({ title: 'Sucesso', message: 'ZéPoint ativada com sucesso!' });
                setTimeout(() => setStep('home'), 3000);
            } else {
                await dialog.alert({ title: 'Erro', message: 'Falha ao ativar ZéPoint.' });
                setStep('inactive');
            }
        } catch (e: any) {
            setErrorMsg(e.message || 'Erro desconhecido');
            setStep('error');
        }
    };

    const resetPaymentState = () => {
        setActivePayment(null);
        setPixCodeData(null);
        setPixTxId(null);
        setIsPolling(false);
    };

    const initiatePayment = async (paymentId: string, amount: number, method: 'PIX' | 'SCAN' | 'USER_CODE') => {
        setActivePayment({ id: paymentId, method, amount });
        if (method === 'PIX') {
            try {
                let pixData = { key: '', name: '', city: '' };

                if (selectedStore) {
                    if (partnerProfile && partnerProfile.is_super_store) {
                        pixData = {
                            key: partnerProfile.pix_key || partnerProfile.config?.pixdata?.key || '',
                            name: partnerProfile.name,
                            city: partnerProfile.city || ''
                        };
                    } else {
                        const storeFull = await cloud.getStoreById(selectedStore.id);
                        if (storeFull) {
                            pixData = {
                                key: storeFull.pix_key || storeFull.config?.pixdata?.key || '',
                                name: storeFull.name,
                                city: storeFull.city || ''
                            };
                        }
                    }
                } else if (userRole === 'delivery_partner') {
                    // Venda de Entregador Parceiro Avulso -> Pix da Plataforma
                    const platformKey = await cloud.getPlatformPixKey();
                    if (platformKey) {
                        pixData = {
                            key: platformKey,
                            name: 'ZÉ ENTREGAS',
                            city: 'BRASIL'
                        };
                    } else {
                        // Fallback silencioso ou erro
                        console.error("Chave Pix Plataforma não encontrada");
                    }
                } else if (partnerProfile) {
                    pixData = {
                        key: partnerProfile.pix_key || partnerProfile.config?.pixdata?.key || '',
                        name: partnerProfile.name,
                        city: partnerProfile.city || ''
                    };
                }

                if (!pixData.key) {
                    await dialog.alert({ title: 'Dados Pix Incompletos', message: 'Não foi encontrada uma chave Pix configurada.' });
                    return;
                }

                const payload = generatePixPayload({
                    key: pixData.key,
                    name: pixData.name || 'RECEBEDOR',
                    city: pixData.city || 'BRASIL',
                    amount: amount,
                    description: `POS-${terminal?.terminal_id?.slice(0, 4) || 'ZE'}`
                });

                setPixCodeData(payload);
                setPixTxId('STATIC_PIX');
                setIsPolling(false);

            } catch (e: any) {
                const msg = e?.message || '';
                await dialog.alert({ title: 'Erro no PIX', message: 'Falha ao gerar PIX: ' + msg });
            }
        }
    };

    const confirmPayment = async (paymentId: string, method: 'PIX' | 'ZE_QR' | 'USER_CODE', payload: string) => {
        if (!terminal) return dialog.alert({ title: 'Erro', message: 'Terminal não inicializado.' });

        // Manual Confirmation
        if (payload === 'MANUAL_PIX_CONFIRM') {
            setIsPolling(false);
            setPartialAmounts(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'paid' } : p));
            setActivePayment(null);
            return dialog.alert({ title: 'Confirmado', message: 'Pagamento Pix registrado.' });
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
            } else {
                // Modificação: Se for delivery_partner sem loja selecionada, processa na carteira
                if (userRole === 'delivery_partner' && !selectedStore) {
                    await cloud.processPartnerSaleWallet(
                        terminal.user_id,
                        activePayment?.amount || 0,
                        method,
                        {
                            is_demo: isDemoMode,
                            payment_method: method,
                            reference_id: payload,
                            terminal_id: terminal.id
                        }
                    );
                } else {
                    // Fluxo normal (Loja)
                    const transaction = {
                        user_id: terminal.user_id,
                        amount: activePayment?.amount || 0,
                        status: 'COMPLETED',
                        created_at: new Date().toISOString(),
                        payer_name: method === 'USER_CODE' ? `Cliente: ${payload}` : 'Cliente QR',
                        description: method === 'ZE_QR' ? 'Pagamento via QR' : 'Pagamento via Código',
                        terminal_id: terminal.id,
                        metadata: {
                            is_demo: isDemoMode,
                            store_id: selectedStore?.id,
                            payment_method: method,
                            reference_id: payload
                        }
                    };
                    await cloud.createTerminalTransaction(transaction);
                }
                await dialog.alert({ title: 'Sucesso', message: 'Pagamento confirmado!' });
                setPartialAmounts(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'paid' } : p));
                setActivePayment(null);
            }
        } catch (e: any) {
            await dialog.alert({ title: 'Erro', message: e.message || 'Falha ao processar.' });
        }
    };

    const loadData = async () => {
        setProcessing(true);
        try {
            // Check Lockout - Removed per user request
            /*
            if (localStorage.getItem('pos_lockout_until')) {
                setStep('pin_lock');
                setProcessing(false);
                return;
            }
            */

            const [fees, role, stores, profile] = await Promise.all([
                cloud.getPublicFeeSettings(),
                cloud.getUserRole(),
                cloud.getPartnerAssociatedStores(),
                cloud.getMyPartnerProfile()
            ]);

            if (profile) setPartnerProfile(profile);
            if (fees) setFeeSettings(fees);
            setUserRole(role);
            if (stores) setAssociatedStores(stores);

            let currentTerminal: UserTerminal | null = null;
            let nextStep: POSStep = 'activation_intro';

            // Step 1: Try to get a personal terminal for eligible roles
            if (role === 'store_partner' || role === 'admin' || role === 'delivery_partner') {
                currentTerminal = await cloud.getMyTerminal();
            }

            if (currentTerminal) {
                setTerminal(currentTerminal);
                if (currentTerminal.status === 'ACTIVE') {
                    // PIN steps removed per user request - go straight to home
                    nextStep = 'home';
                } else {
                    setErrorMsg('Seu terminal está inativo. Por favor, ative-o ou contate o suporte.');
                    nextStep = 'inactive';
                }
            } else {
                // No personal terminal found, check for delivery_person and associated stores
                if (role === 'delivery_person') {
                    if (stores && stores.length > 0) {
                        if (stores.length === 1) {
                            setSelectedStore(stores[0]);
                            currentTerminal = await cloud.getStoreTerminal(stores[0].id);
                            if (currentTerminal) {
                                setTerminal(currentTerminal);
                                if (currentTerminal.status === 'ACTIVE') {
                                    nextStep = 'amount';
                                } else {
                                    setErrorMsg('Terminal da loja associada inativo.');
                                    nextStep = 'inactive';
                                }
                            } else {
                                setErrorMsg('Terminal da loja associada não encontrado.');
                                nextStep = 'inactive';
                            }
                        } else {
                            nextStep = 'choose_sale_type';
                        }
                    } else {
                        setErrorMsg('Entregador normal sem lojas associadas não pode usar a maquininha.');
                        nextStep = 'inactive';
                    }
                } else if (role === 'delivery_partner' || role === 'store_partner' || role === 'admin') {
                    nextStep = 'activation_intro';
                } else {
                    setErrorMsg('Não foi possível carregar seu perfil de terminal.');
                    nextStep = 'inactive';
                }
            }

            setStep(nextStep);

        } catch (e: any) {
            console.error(e);
            setErrorMsg('Erro ao carregar dados do terminal.');
            setStep('error');
        } finally {
            setProcessing(false);
        }
    };

    const handlePinSubmit = async (pin: string) => {
        if (!terminal) return;
        setProcessing(true);
        try {
            const valid = await cloud.validateTerminalPin(terminal.id, pin);
            if (valid) {
                setStep('home');
                setPinAttempts(0);
                localStorage.removeItem('pos_pin_attempts');
            } else {
                const newAttempts = pinAttempts + 1;
                setPinAttempts(newAttempts);
                localStorage.setItem('pos_pin_attempts', String(newAttempts));
                if (newAttempts >= 5) {
                    const lockTime = new Date(new Date().getTime() + 5 * 60000); // 5 min lock
                    setLockoutUntil(lockTime);
                    localStorage.setItem('pos_lockout_until', lockTime.toISOString());
                    setStep('pin_lock');
                } else {
                    dialog.alert({ title: 'PIN Incorreto', message: `Tentativa ${newAttempts}/5` });
                }
            }
        } catch (e) {
            dialog.alert({ title: 'Erro', message: 'Erro ao validar PIN' });
        } finally {
            setProcessing(false);
            setPinEntry('');
        }
    };

    const handleCreatePin = async () => {
        const pinRegex = /^\d{4,6}$/;
        if (!pinRegex.test(newPin)) {
            await dialog.alert({ title: 'PIN Inválido', message: 'PIN deve ter 4 a 6 dígitos numéricos.' });
            return;
        }
        setStep('confirm_pin');
    };

    const handleCreatePinConfirm = async () => {
        if (!terminal) {
            await dialog.alert({ title: 'Erro', message: 'Terminal não inicializado.' });
            setStep('inactive');
            return;
        }
        if (newPin !== confirmPin) {
            await dialog.alert({ title: 'Erro', message: 'Os PINs não coincidem.' });
            setConfirmPin('');
            return;
        }
        const pinRegex = /^\d{4,6}$/;
        if (!pinRegex.test(newPin)) {
            await dialog.alert({ title: 'PIN Inválido', message: 'PIN inválido.' });
            setNewPin('');
            setConfirmPin('');
            setStep('create_pin');
            return;
        }
        try {
            // Updated to ensure setTerminalPin uses userId correctly from terminal or profile
            await cloud.setTerminalPin(newPin, terminal.user_id);
            setTerminal(prev => prev ? { ...prev, pin_code: newPin } : null);
            setNewPin('');
            setConfirmPin('');
            await dialog.alert({ title: 'Sucesso', message: 'PIN criado!' });
            setStep('home');
        } catch (e: any) {
            await dialog.alert({ title: 'Erro', message: 'Falha ao criar PIN.' });
        }
    };

    // Simulator Logic
    const simulatorCalculations = useMemo(() => {
        const saleValue = parseCurrency(simulatorAmount);
        if (!feeSettings || saleValue <= 0) {
            return { gross: formatCurrency(0), fees: formatCurrency(0), net: formatCurrency(0), final: formatCurrency(0), rawGross: 0, rawFees: 0, rawNet: 0 };
        }
        const feePercent = feeSettings.global_tax_percent / 100;
        const feeFixed = feeSettings.global_tax_fixed;
        let gross = 0, fees = 0, net = 0;

        if (feePayer === 'seller') {
            gross = saleValue;
            fees = (gross * feePercent) + feeFixed;
            net = gross - fees;
        } else {
            net = saleValue;
            gross = (net + feeFixed) / (1 - feePercent);
            fees = gross - net;
        }
        const rawGross = Math.max(0, gross);
        const rawFees = Math.max(0, fees);
        const rawNet = Math.max(0, net);

        return {
            gross: formatCurrency(rawGross),
            fees: formatCurrency(rawFees),
            net: formatCurrency(rawNet),
            final: formatCurrency(rawGross),
            rawGross, rawFees, rawNet
        };
    }, [simulatorAmount, feePayer, feeSettings]);

    return {
        // State
        step, setStep,
        terminal, setTerminal,
        amount, setAmount,
        errorMsg, setErrorMsg,
        userRole, partnerProfile,
        processing, setProcessing,

        // Split/Payments
        totalToSplit, setTotalToSplit,
        partialAmounts, setPartialAmounts,
        activePayment, setActivePayment,
        pixCodeData, pixTxId,

        // PIN
        pinEntry, setPinEntry,
        newPin, setNewPin,
        confirmPin, setConfirmPin,
        pinAttempts, lockoutUntil, lockoutCountdown,

        // Simulator
        simulatorAmount, setSimulatorAmount,
        feePayer, setFeePayer,
        feeSettings,
        simulationHistory, setSimulationHistory,
        showHistory, setShowHistory,
        simulatorCalculations,

        // Associated Stores
        saleTypeSelection, setSaleTypeSelection,
        associatedStores, setAssociatedStores,
        selectedStore, setSelectedStore,
        storeOpenOrders, setStoreOpenOrders,
        selectedOrder, setSelectedOrder,

        // Messaging
        activatingMessageIndex,
        activatingMessages,

        // Methods
        formatCurrency, parseCurrency,
        handleActivateStart,
        confirmPayment,
        loadData,
        handlePinSubmit,
        handleCreatePin,
        handleCreatePinConfirm,
        resetPaymentState,
        initiatePayment,

        // Contexts
        dialog,
        isDemoMode,
        toggleDemoMode,

        // History
        history, setHistory,
        loadingHistory, setLoadingHistory,
        historyPage, setHistoryPage,
        historyHasMore, setHistoryHasMore,

        // Coupon
        couponCode, setCouponCode,
        couponDiscount, setCouponDiscount,

        // UI States
        errorType, setErrorType,
        isWhatsAppModalOpen, setWhatsAppModalOpen,
        isSplitButtonActive, setIsSplitButtonActive,
        isDeactivateModalOpen, setDeactivateModalOpen,
        showSummaryModal, setShowSummaryModal,
        showLogsModal, setShowLogsModal,
        runTutorial, setRunTutorial,

        // Utils & Consts
        handleCopyToClipboard,
        tutorialSteps,
        getMockData,
        setIsPolling, setPixCodeData, setPixTxId,
        isPolling,

        // New Handlers
        handleKeypadPress,
        handleKeypadClear,
        handleKeypadBackspace,
        handleGoBack,
        handleContinueFromAmount,
        resetFlow
    };
};
