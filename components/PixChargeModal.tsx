
import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Copy, Check, Info, X, Share2, DollarSign, Loader2, ChevronRight, CreditCard } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { generatePixPayload } from '../utils/pixPayloadGenerator';
import { generatePaymentQRCode, checkPaymentStatus, getActiveGateways, estimateFee } from '../services/paymentGateway';
import { useDialog } from '../utils/dialogService';
import type { PaymentGatewayConfig } from '../types';

declare const QRious: any;

interface PixChargeModalProps {
    isOpen: boolean;
    onClose: () => void;
    pixKey: string;
    pixKeyType?: 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
    storeName: string;
    storeCity: string;
    // New Props for Gateway Integration
    userId?: string;
    onPaymentSuccess?: (amount: number) => void;
    customTitle?: string;
}

export const PixChargeModal: React.FC<PixChargeModalProps> = ({
    isOpen,
    onClose,
    pixKey,
    pixKeyType,
    storeName,
    storeCity,
    userId,
    onPaymentSuccess,
    customTitle
}) => {
    const [step, setStep] = useState<'INPUT' | 'GATEWAY' | 'QR'>('INPUT');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [pixPayload, setPixPayload] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [txId, setTxId] = useState<string | null>(null);
    const [activeGateways, setActiveGateways] = useState<PaymentGatewayConfig[]>([]);
    const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pollingRef = useRef<any>(null);

    const { alert, toast } = useDialog();

    // Reset when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStep('INPUT');
            setAmount('');
            setDescription('');
            setPixPayload('');
            setTxId(null);
            setSelectedGateway(null);
            if (pollingRef.current) clearInterval(pollingRef.current);
        } else {
            // Pre-fetch active gateways
            getActiveGateways().then(setActiveGateways);
        }
    }, [isOpen]);

    // Polling Logic
    useEffect(() => {
        if (step === 'QR' && txId) {
            // Se for manual, não faz polling
            if (txId.startsWith('MANUAL')) return;

            const poll = setInterval(async () => {
                if (txId.startsWith('MANUAL')) return; // Added check here
                try {
                    const status = await checkPaymentStatus(txId, selectedGateway || undefined);
                    if (status.status === 'paid') {
                        clearInterval(poll);
                        if (onPaymentSuccess) {
                            onPaymentSuccess(status.amount || 0);
                        } else {
                            toast({
                                message: `Recebimento de R$ ${status.amount?.toFixed(2)} confirmado!`,
                                type: 'success'
                            });
                        }
                        onClose();
                    } else if (status.status === 'failed' || status.status === 'expired') {
                        clearInterval(poll);
                        await alert({ title: 'Pagamento Expirado', message: 'O pagamento expirou ou falhou.' });
                        setStep('INPUT');
                    }
                } catch (e) {
                    // Ignore transient errors
                }
            }, 3000);

            pollingRef.current = poll;

            return () => clearInterval(poll);
        }
    }, [step, txId, onClose, onPaymentSuccess, alert]);

    // Generate QR Code Render
    useEffect(() => {
        if (step === 'QR' && pixPayload && canvasRef.current) {
            const generateQR = () => {
                new QRious({
                    element: canvasRef.current,
                    value: pixPayload,
                    size: 250,
                    level: 'M'
                });
            };

            if (typeof QRious === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js';
                script.async = true;
                script.onload = generateQR;
                document.body.appendChild(script);
            } else {
                generateQR();
            }
        }
    }, [step, pixPayload]);

    const handleGenerate = async (gatewayName?: string) => {
        if (!amount) return;
        const amountNum = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        if (amountNum <= 0) return;

        setLoading(true);

        try {
            // Se userId estiver presente (modo recarga), buscamos gateways ativos obrigatoriamente
            if (userId) {
                // SEMPRE busca os gateways ativos ao clicar para garantir que temos a lista atualizada
                const currentGateways = await getActiveGateways();
                setActiveGateways(currentGateways);

                if (currentGateways.length === 0) {
                    throw new Error('Nenhum método de pagamento disponível no momento.');
                }

                // Se houver MAIS DE UM gateway ativo e o usuário ainda não escolheu um específico, MOSTRA o passo de escolha
                if (currentGateways.length > 1 && !gatewayName) {
                    setStep('GATEWAY');
                    setLoading(false);
                    return;
                }

                // Determina qual gateway usar
                const gatewayToUse = gatewayName || currentGateways[0]?.gateway_name;

                if (!gatewayToUse) {
                    throw new Error('Não foi possível determinar o gateway de pagamento.');
                }

                const result = await generatePaymentQRCode(amountNum, {
                    description: description || 'Recarga de Saldo',
                    userId: userId,
                    type: 'wallet_recharge'
                }, gatewayToUse);

                setPixPayload(result.qrCode);
                setTxId(result.txId);
                setSelectedGateway(result.gatewayUsed);
                setStep('QR');
            } else {
                // Static mode (Venda Direta / Receber PIX sem Gateway)
                const payload = generatePixPayload({
                    key: pixKey,
                    keyType: pixKeyType,
                    name: storeName,
                    city: storeCity,
                    amount: amountNum,
                    description: description || 'Cobrança PIX'
                });
                setPixPayload(payload);
                setStep('QR');
            }
        } catch (error: any) {
            console.error('[PixChargeModal] Erro ao gerar:', error);
            toast({ message: error.message || 'Erro ao gerar cobrança.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!pixPayload) return;
        navigator.clipboard.writeText(pixPayload);
        setCopied(true);
        toast({ message: 'Código PIX copiado!', type: 'success', duration: 2000 });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = () => {
        const amountNum = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        const msg = `Olá! Aqui está o código PIX para o pagamento de R$ ${amountNum.toFixed(2).replace('.', ',')}.\n\nCopie e cole no seu app de banco:\n\n${pixPayload}`;
        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const handleManualConfirmation = async () => {
        toast({
            message: 'Seu pagamento foi registrado e está aguardando conferência.',
            type: 'info'
        });
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={customTitle || (step === 'INPUT' ? "Nova Cobrança PIX" : "Aguardando Pagamento")}
            icon={<QrCode className="w-6 h-6 text-brand-600" />}
        >
            <div className="space-y-6">
                {step === 'INPUT' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-center gap-3">
                            <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-full">
                                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-300" />
                            </div>
                            <div>
                                <p className="text-sm text-blue-800 dark:text-blue-200 font-bold">{userId ? 'Recarregar Saldo' : 'Gerar QR Code'}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                    {userId ? 'O valor cairá automaticamente na sua conta digital.' : 'Gera um QR Code para sua chave cadastrada.'}
                                </p>
                            </div>
                        </div>

                        <CustomInput
                            mask="currency"
                            placeholder={userId ? "Valor da Recarga (R$)" : "Valor da Cobrança (R$)"}
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            label={userId ? "Quanto deseja adicionar?" : "Qual o valor?"}
                            autoFocus
                        />

                        <CustomInput
                            placeholder="Descrição (Opcional)"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            label="Descrição"
                        />

                        <Button
                            fullWidth
                            size="lg"
                            onClick={() => handleGenerate()}
                            className="text-lg font-bold"
                            disabled={!amount || amount === '0,00' || loading}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><QrCode className="w-5 h-5 mr-2" /> {userId ? 'Solicitar Recarga' : 'Gerar Cobrança'}</>}
                        </Button>
                    </div>
                ) : step === 'GATEWAY' ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                        <div className="text-center mb-2">
                            <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">Escolha o método de pagamento</h4>
                            <p className="text-[10px] text-gray-500">Selecione uma das opções disponíveis para concluir sua recarga.</p>
                        </div>

                        <div className="grid gap-3">
                            {activeGateways.map((g) => (
                                <button
                                    key={g.gateway_name}
                                    onClick={() => handleGenerate(g.gateway_name)}
                                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-brand-500 dark:hover:border-brand-500 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white dark:bg-gray-700 p-2 rounded-xl shadow-sm">
                                            {g.gateway_name === 'infinitepay' ? <CreditCard className="w-5 h-5 text-purple-600" /> :
                                                g.gateway_name === 'mercadopago' ? <DollarSign className="w-5 h-5 text-blue-500" /> :
                                                    <QrCode className="w-5 h-5 text-green-500" />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-gray-800 dark:text-white">
                                                {g.gateway_name === 'pix' ? 'PIX Manual' :
                                                    g.gateway_name === 'infinitepay' ? 'InfinitePay' :
                                                        g.gateway_name === 'mercadopago' ? 'Mercado Pago' :
                                                            g.gateway_name}
                                                {g.fees && g.fees.pix > 0 && (
                                                    <span className="ml-2 text-[10px] bg-brand-100 text-brand-700 px-1 rounded">+{g.fees.pix}%</span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-gray-500">
                                                {g.gateway_name === 'infinitepay' ? 'Liberação Instantânea' :
                                                    g.gateway_name === 'mercadopago' ? 'Liberação Automática' :
                                                        'Requer envio de comprovante'}
                                            </p>
                                        </div>
                                    </div>
                                    {amount && (
                                        <div className="text-right mr-2">
                                            <p className="text-xs font-bold text-gray-800 dark:text-white">
                                                R$ {estimateFee(parseFloat(amount.replace(/\./g, '').replace(',', '.')), g).total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-[9px] text-gray-400">Total com taxa</p>
                                        </div>
                                    )}
                                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
                                </button>
                            ))}
                        </div>

                        <Button
                            variant="ghost"
                            fullWidth
                            onClick={() => setStep('INPUT')}
                            className="mt-2"
                        >
                            Voltar
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
                        <div className="text-center space-y-2">
                            <p className="text-[11px] font-bold text-brand-600 dark:text-brand-400 uppercase tracking-[0.2em]">
                                {userId ? 'Adicionar Saldo' : 'Aguardando Pagamento'}
                            </p>
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-400 dark:text-gray-500">Valor total</span>
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                                    {amount}
                                </h3>
                            </div>
                        </div>
                        {txId && txId.startsWith('MANUAL') ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-bold">
                                <Info className="w-3 h-3" />
                                Confirmação Manual
                            </div>
                        ) : (
                            <p className="text-[10px] text-green-600 dark:text-green-400 font-bold animate-pulse">Confirmando automaticamente...</p>
                        )}

                        <div className="relative group">
                            <div className="absolute -inset-4 bg-brand-50 dark:bg-brand-900/10 rounded-[2.5rem] -z-10 blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
                            <div className="p-6 bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl shadow-brand-500/5 border border-brand-50 dark:border-gray-700 flex justify-center items-center">
                                <canvas ref={canvasRef} className="rounded-xl" />
                            </div>
                        </div>

                        <div className="w-full space-y-4">
                            <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Código PIX</p>
                                    <p className="text-[11px] font-mono text-gray-600 dark:text-gray-300 truncate tracking-tight">
                                        {pixPayload}
                                    </p>
                                </div>
                                <button
                                    onClick={handleCopy}
                                    className="p-2.5 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors shadow-sm"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>

                            {txId && txId.startsWith('MANUAL') && (
                                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-2xl border border-yellow-100 dark:border-yellow-900/30 flex gap-3">
                                    <Info className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0" />
                                    <p className="text-[11px] text-yellow-800 dark:text-yellow-200 leading-relaxed">
                                        Para este método, é necessário enviar o comprovante no menu <strong>Suporte</strong> ou aguardar a conferência.
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                {txId && txId.startsWith('MANUAL') ? (
                                    <Button onClick={handleManualConfirmation} size="lg">
                                        <Check className="w-4 h-4 mr-2" />
                                        Já realizei o pagamento
                                    </Button>
                                ) : (
                                    <Button onClick={handleShare} variant="secondary" size="lg">
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Compartilhar Comprovante
                                    </Button>
                                )}

                                <Button onClick={onClose} variant="ghost" size="sm" className="text-gray-400 hover:text-gray-600">
                                    Fechar Janela
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div >
        </BaseModal >
    );
};
