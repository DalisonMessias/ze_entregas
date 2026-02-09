
import React, { useState, useEffect, useRef } from 'react';
import { Crown, Check, X, AlertCircle, Copy, Wallet, QrCode } from 'lucide-react';
import { Loading } from './Loading';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { PartnerFeeSettings, StoreWallet } from '../types';
import { useDialog } from '../utils/dialogService'; // Import useDialog

declare const QRious: any;

interface SuperStoreModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

export const SuperStoreModal: React.FC<SuperStoreModalProps> = ({ onClose, onSuccess }) => {
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [wallet, setWallet] = useState<StoreWallet | null>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    const [selectedPlan, setSelectedPlan] = useState<'MENSALIDADE' | 'COMISSAO'>('MENSALIDADE');

    // Pix State
    const [showPix, setShowPix] = useState(false);
    const [pixData, setPixData] = useState<{ copyPaste: string, qrCodeBase64?: string } | null>(null);
    const qrCanvasRef = useRef<HTMLCanvasElement>(null);

    const { alert } = useDialog();

    useEffect(() => {
        const loadData = async () => {
            try {
                const [settings, walletData] = await Promise.all([
                    cloud.adminGetFeeSettings(),
                    cloud.getMyWallet()
                ]);
                setFees(settings);
                setWallet(walletData);

                // Se o plano mensal estiver desativado, seleciona comissão por padrão
                if (settings?.super_store_monthly_enabled === false) {
                    setSelectedPlan('COMISSAO');
                }
            } catch (e) {
                setError('Erro ao carregar valores.');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        if (showPix && pixData?.copyPaste && qrCanvasRef.current && typeof QRious !== 'undefined') {
            new QRious({
                element: qrCanvasRef.current,
                value: pixData.copyPaste,
                size: 200,
                level: 'H'
            });
        }
    }, [showPix, pixData]);

    const handleSubscribe = async () => {
        let fee = 0;
        if (selectedPlan === 'MENSALIDADE') {
            fee = fees?.super_store_monthly_fee || 0;
        }

        setProcessing(true);
        setError('');

        try {
            const currentBalance = wallet?.balance_decimal || 0;

            if (selectedPlan === 'MENSALIDADE' && currentBalance < fee) {
                throw new Error("Saldo insuficiente. Por favor, recarregue sua carteira antes de assinar.");
            }

            await cloud.subscribeToSuperStore(fee, selectedPlan);
            await alert({
                title: "Super Lojista Ativado!",
                message: selectedPlan === 'COMISSAO'
                    ? "Parabéns! Você agora é um Super Lojista no plano por Comissão."
                    : "Parabéns! Você agora é um Super Lojista no plano de Mensalidade."
            });
            onSuccess();
            onClose();

        } catch (e: any) {
            setError(e.message || "Erro ao processar assinatura.");
            setProcessing(false);
        }
    };

    const handleCopyPix = async () => {
        if (pixData?.copyPaste) {
            navigator.clipboard.writeText(pixData.copyPaste);
            await alert({ title: "Código Copiado", message: "Código Pix copiado!" });
        }
    };

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const benefits = [
        { title: "Assistente IA (Ze AI)", desc: "Geração automática de catálogo, análises e sugestões inteligentes." },
        { title: "Relatórios Avançados", desc: "Dados financeiros, horários de pico e performance de entregadores." },
        { title: "Regras de Frete", desc: "Configure frete grátis por valor ou distância para fidelizar clientes." },
        { title: "Variações de Produtos", desc: "Suporte a tamanhos (P, M, G), cores e outros atributos." },
        { title: "Taxa Zero em Retiradas", desc: "Isenção total de taxas em pedidos de retirada (Takeaway)." },
        { title: "Cardápio Impresso (PDF)", desc: "Geração automática de cardápio para impressão com QR Code." },
        { title: "Gerentes Adicionais", desc: "Cadastre sua equipe para gerenciar pedidos simultaneamente." }
    ];

    if (loading) return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl">
                <Loading size="lg" />
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl relative my-8">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 rounded-full z-10 transition-colors">
                    <X className="w-5 h-5 text-white" />
                </button>

                {/* Header */}
                <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600 p-8 text-center pt-10 pb-12 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl rotate-12 flex items-center justify-center mx-auto mb-4 shadow-xl border border-white/30">
                            <Crown className="w-10 h-10 text-white -rotate-12" />
                        </div>
                        <h2 className="text-4xl font-black text-white uppercase tracking-tight">Super Lojista</h2>
                        <p className="text-yellow-100 text-base font-medium mt-1">Desbloqueie o potencial máximo da sua loja</p>
                    </div>
                </div>

                <div className="p-8 -mt-6 bg-white dark:bg-gray-800 rounded-t-[32px] relative z-20">

                    {!showPix ? (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">

                            {/* Benefits List */}
                            <div className="md:col-span-12 lg:col-span-5 space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Benefícios Inclusos</h3>
                                <div className="space-y-3">
                                    {benefits.map((b, i) => (
                                        <div key={i} className="flex items-start gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors group">
                                            <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg group-hover:scale-110 transition-transform">
                                                <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm dark:text-white leading-none">{b.title}</p>
                                                <p className="text-[11px] text-gray-500 mt-1 leading-tight">{b.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Plan Selection */}
                            <div className="md:col-span-12 lg:col-span-7 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Escolha seu Plano</h3>

                                    <div className="grid grid-cols-1 gap-3">
                                        {/* Mensalidade */}
                                        {fees?.super_store_monthly_enabled !== false && (
                                            <button
                                                onClick={() => setSelectedPlan('MENSALIDADE')}
                                                className={`p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${selectedPlan === 'MENSALIDADE' ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200'}`}
                                            >
                                                <div className="flex justify-between items-start relative z-10">
                                                    <div>
                                                        <p className="font-black text-gray-900 dark:text-white">PRÉ-PAGO MENSAL</p>
                                                        <p className="text-2xl font-black text-orange-600 dark:text-orange-400 mt-1">
                                                            {formatCurrency(fees?.super_store_monthly_fee || 0)}
                                                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 ml-1">/mês</span>
                                                        </p>
                                                    </div>
                                                    {selectedPlan === 'MENSALIDADE' && <div className="bg-orange-500 p-1 rounded-full"><Check className="w-3 h-3 text-white" /></div>}
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-2 relative z-10">Pague um valor fixo mensal e tenha todos os benefícios sem comissões adicionais.</p>
                                            </button>
                                        )}

                                        {/* Comissão */}
                                        {true && (
                                            <button
                                                onClick={() => setSelectedPlan('COMISSAO')}
                                                className={`p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${selectedPlan === 'COMISSAO' ? 'border-brand-500 bg-brand-50 dark:bg-brand-950/20' : 'border-gray-100 dark:border-gray-700 hover:border-gray-200'}`}
                                            >
                                                <div className="flex justify-between items-start relative z-10">
                                                    <div>
                                                        <p className="font-black text-gray-900 dark:text-white">COMISSÃO POR PEDIDO</p>
                                                        <p className="text-2xl font-black text-brand-600 dark:text-brand-400 mt-1">
                                                            {fees?.super_store_commission_percent}%
                                                            {fees?.super_store_commission_fixed ? ` + ${formatCurrency(fees.super_store_commission_fixed)}` : ''}
                                                            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 ml-1">p/ pedido</span>
                                                        </p>
                                                    </div>
                                                    {selectedPlan === 'COMISSAO' && <div className="bg-brand-500 p-1 rounded-full"><Check className="w-3 h-3 text-white" /></div>}
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-2 relative z-10">Sem custo mensal fixo. Pague apenas uma comissão sobre as vendas realizadas.</p>
                                                <div className="mt-2 py-1 px-2 bg-brand-100 dark:bg-brand-900/30 rounded flex items-center gap-1.5 relative z-10">
                                                    <AlertCircle className="w-3 h-3 text-brand-600 dark:text-brand-400" />
                                                    <span className="text-[9px] font-bold text-brand-700 dark:text-brand-300 uppercase">Pagamento exclusivo via plataforma</span>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {error && (
                                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" /> {error}
                                    </div>
                                )}

                                <div className="mt-6 space-y-4">
                                    {selectedPlan === 'MENSALIDADE' && (
                                        <div className="flex justify-center items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                            <Wallet className="w-4 h-4 text-gray-400" />
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Seu saldo: <strong className="text-gray-900 dark:text-white">{formatCurrency(wallet?.balance_decimal || 0)}</strong></p>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleSubscribe}
                                        disabled={processing}
                                        fullWidth
                                        className={`py-4 text-lg border-none shadow-lg transition-all transform active:scale-95 ${selectedPlan === 'COMISSAO'
                                            ? 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/30'
                                            : 'bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 shadow-orange-500/30'}`}
                                    >
                                        {processing ? <Loading variant="inline" size="md" /> : (
                                            selectedPlan === 'COMISSAO' ? 'Ativar Agora' :
                                                ((wallet?.balance_decimal || 0) < (fees?.super_store_monthly_fee || 0) ? 'Pagar com Pix' : 'Ativar Agora')
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center space-y-6 animate-in fade-in py-4">
                            <h3 className="font-black text-2xl dark:text-white uppercase tracking-tight">Adicionar Saldo</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">Escaneie o QR Code ou copie o código abaixo para carregar sua carteira.</p>

                            <div className="bg-white dark:bg-white p-6 rounded-[32px] inline-block shadow-xl border border-gray-100 ring-8 ring-gray-50 dark:ring-gray-700/50">
                                <canvas ref={qrCanvasRef} className="w-48 h-48" />
                            </div>

                            <div className="bg-brand-50 dark:bg-brand-900/20 text-brand-800 dark:text-brand-300 p-4 rounded-2xl text-[11px] font-bold leading-relaxed border border-brand-100 dark:border-brand-900/50 max-w-md mx-auto">
                                Após o pagamento, o saldo será adicionado instantaneamente. Clique em "Verificar Saldo" para prosseguir.
                            </div>

                            <div className="grid grid-cols-1 gap-3 max-w-sm mx-auto">
                                <Button variant="outline" fullWidth onClick={handleCopyPix} className="rounded-2xl py-3 border-gray-200">
                                    <Copy className="w-4 h-4 mr-2" /> Copiar Código Pix
                                </Button>

                                <Button variant="ghost" fullWidth onClick={() => { setShowPix(false); window.location.reload(); }} className="rounded-2xl py-3 underline">
                                    Já paguei, verificar saldo
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
