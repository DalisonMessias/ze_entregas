
import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Copy, Check, Info, X, Share2, DollarSign, Loader2 } from 'lucide-react';
import { BaseModal } from './BaseModal';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import { generatePixPayload } from '../utils/pixPayloadGenerator';
import { generatePaymentQRCode, checkPaymentStatus } from '../services/paymentGateway';
import { useDialog } from '../utils/dialogService';

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
}

export const PixChargeModal: React.FC<PixChargeModalProps> = ({
    isOpen,
    onClose,
    pixKey,
    pixKeyType,
    storeName,
    storeCity,
    userId,
    onPaymentSuccess
}) => {
    const [step, setStep] = useState<'INPUT' | 'QR'>('INPUT');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [pixPayload, setPixPayload] = useState('');
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(false);
    const [txId, setTxId] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pollingRef = useRef<any>(null);

    const { alert } = useDialog();

    // Reset when modal opens/closes
    useEffect(() => {
        if (!isOpen) {
            setStep('INPUT');
            setAmount('');
            setDescription('');
            setPixPayload('');
            setTxId(null);
            if (pollingRef.current) clearInterval(pollingRef.current);
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
                    const status = await checkPaymentStatus(txId);
                    if (status.status === 'paid') {
                        clearInterval(poll);
                        if (onPaymentSuccess) onPaymentSuccess(status.amount || 0);
                        else await alert({ title: 'Pagamento Confirmado', message: `Recebimento de R$ ${status.amount?.toFixed(2)} confirmado!` });

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

    const handleGenerate = async () => {
        if (!amount) return;
        const amountNum = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        if (amountNum <= 0) return;

        setLoading(true);

        try {
            if (userId) {
                // Gateway mode
                const result = await generatePaymentQRCode(amountNum, {
                    description: description || 'Cobrança App',
                    userId: userId,
                    type: 'wallet_recharge'
                });
                setPixPayload(result.qrCode);
                setTxId(result.txId);
                setStep('QR');
            } else {
                // Static mode
                const payload = generatePixPayload({
                    key: pixKey,
                    keyType: pixKeyType,
                    name: storeName,
                    city: storeCity,
                    amount: amountNum,
                    description: description || 'Cobrança'
                });
                setPixPayload(payload);
                setStep('QR');
            }
        } catch (error: any) {
            await alert({ title: 'Erro', message: error.message || 'Erro ao gerar cobrança.' });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (!pixPayload) return;
        navigator.clipboard.writeText(pixPayload);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = () => {
        const amountNum = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
        const msg = `Olá! Aqui está o código PIX para o pagamento de R$ ${amountNum.toFixed(2).replace('.', ',')}.\n\nCopie e cole no seu app de banco:\n\n${pixPayload}`;
        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const handleManualConfirmation = async () => {
        await alert({ title: 'Pagamento Registrado', message: 'Seu pagamento foi registrado e está aguardando conferência. O saldo será liberado em breve.' });
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={step === 'INPUT' ? "Nova Cobrança PIX" : "Aguardando Pagamento"}
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
                                <p className="text-sm text-blue-800 dark:text-blue-200 font-bold">Gerar QR Code</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                    {userId ? 'O valor cairá automaticamente na sua conta digital.' : 'Gera um QR Code para sua chave cadastrada.'}
                                </p>
                            </div>
                        </div>

                        <CustomInput
                            mask="currency"
                            placeholder="Valor da Cobrança (R$)"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            label="Qual o valor?"
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
                            onClick={handleGenerate}
                            className="text-lg font-bold"
                            disabled={!amount || amount === '0,00' || loading}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><QrCode className="w-5 h-5 mr-2" /> Gerar Cobrança</>}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6 flex flex-col items-center animate-in scale-in-95">
                        <div className="text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total a Pagar</p>
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                                {amount}
                            </h3>
                            {txId && txId.startsWith('MANUAL') ? (
                                <p className="text-xs text-orange-600 font-bold mt-1 bg-orange-100 px-2 py-1 rounded-full">
                                    Verificação Manual Necessária
                                </p>
                            ) : (
                                <p className="text-xs text-green-600 font-bold animate-pulse mt-1">Aguardando confirmação automática...</p>
                            )}
                        </div>

                        <div className="p-4 bg-white rounded-3xl border-4 border-brand-50 shadow-inner flex justify-center items-center min-h-[250px]">
                            <canvas ref={canvasRef} />
                        </div>

                        <div className="w-full space-y-3">
                            {/* ... existing copy paste ... */}
                            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Copia e Cola</p>
                                <textarea
                                    readOnly
                                    value={pixPayload}
                                    className="w-full text-[10px] font-mono text-gray-600 dark:text-gray-300 break-all bg-transparent outline-none resize-none h-12"
                                />
                                <Button
                                    variant="secondary"
                                    onClick={handleCopy}
                                    fullWidth
                                    className="h-10 text-xs"
                                >
                                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                                    {copied ? 'Copiado' : 'Copiar Código'}
                                </Button>
                            </div>

                            {txId && txId.startsWith('MANUAL') && (
                                <div className="bg-yellow-50 p-3 rounded-lg text-xs text-yellow-800 border-l-4 border-yellow-400 mb-2">
                                    <strong>Atenção:</strong> Para este método, é necessário enviar o comprovante ou aguardar a conferência manual.
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                {txId && txId.startsWith('MANUAL') ? (
                                    <Button variant="outline" onClick={handleManualConfirmation}>
                                        <Check className="w-4 h-4 mr-2" />
                                        Já Paguei
                                    </Button>
                                ) : (
                                    <Button variant="outline" onClick={handleShare}>
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Compartilhar
                                    </Button>
                                )}
                                <Button onClick={() => setStep('INPUT')} variant="ghost">
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div >
        </BaseModal >
    );
};
