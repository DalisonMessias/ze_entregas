
import React, { useState, useEffect } from 'react';
import { Share2, Users, Gift, Copy, ArrowRight, Loader2, Award, Zap } from 'lucide-react';
import * as cloud from '../services/cloud';
import { ReferralData, ReferralHistoryItem, UserRole } from '../types';
import { Button } from './Button';

interface ReferralProgramProps {
    userRole: UserRole;
    onClose: () => void;
}

export const ReferralProgram: React.FC<ReferralProgramProps> = ({ userRole, onClose }) => {
    const [data, setData] = useState<ReferralData | null>(null);
    const [history, setHistory] = useState<ReferralHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Redeem Form
    const [referralCodeInput, setReferralCodeInput] = useState('');
    const [redeeming, setRedeeming] = useState(false);

    useEffect(() => {
        loadReferralData();
    }, []);

    const loadReferralData = async () => {
        setLoading(true);
        try {
            const [referralData, referralHistory] = await Promise.all([
                cloud.getReferralData(),
                cloud.getReferralHistory()
            ]);
            setData(referralData);
            setHistory(referralHistory);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyCode = () => {
        if (data?.my_code) {
            navigator.clipboard.writeText(data.my_code);
            alert("Código copiado!");
        }
    };

    const handleShare = () => {
        if (!data?.my_code) return;
        const msg = userRole === 'store_partner' 
            ? `Ei, lojista! Use meu código *${data.my_code}* no Zé Entregas e ganhe descontos nas taxas de entrega! 🚀`
            : `Fala parceiro! Use meu código *${data.my_code}* no Zé Entregas e ganhe prioridade no app! 🏍️💨`;
            
        const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        window.open(url, '_blank');
    };

    const handleRedeem = async () => {
        if (!referralCodeInput.trim()) return;
        setRedeeming(true);
        try {
            await cloud.redeemReferralCode(referralCodeInput);
            alert("Código resgatado! Você ganhou benefícios exclusivos.");
            loadReferralData(); // Refresh to see active status
            setReferralCodeInput('');
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setRedeeming(false);
        }
    };

    const formatDate = (date?: string) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('pt-BR');
    };

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-brand-600"/></div>;

    return (
        <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10">
            {/* Header */}
            <div className="bg-brand-600 p-6 pt-12 pb-24 relative overflow-hidden">
                <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/20 text-white rounded-full hover:bg-black/30 transition-colors z-20">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                </button>
                
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Gift className="w-48 h-48 text-white rotate-12" />
                </div>

                <div className="relative z-10 text-center text-white">
                    <h2 className="text-3xl font-black mb-2">Indique e Ganhe</h2>
                    <p className="text-brand-100 font-medium">
                        {userRole === 'store_partner' 
                            ? 'Indique lojas e ganhe 50% de desconto nas taxas!' 
                            : 'Indique parceiros e ganhe prioridade nas corridas!'}
                    </p>
                </div>
            </div>

            <div className="flex-1 bg-gray-50 dark:bg-gray-900 -mt-10 rounded-t-[32px] overflow-y-auto relative z-20">
                <div className="p-6 space-y-6">
                    
                    {/* Status Card */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl -mt-16 text-center border border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Seu Código Exclusivo</p>
                        <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-xl border-2 border-dashed border-brand-300 dark:border-brand-700 mb-4 cursor-pointer hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-colors" onClick={handleCopyCode}>
                            <h3 className="text-3xl font-mono font-black text-brand-600 dark:text-brand-400 tracking-widest">{data?.my_code}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" onClick={handleCopyCode}>
                                <Copy className="w-4 h-4 mr-2"/> Copiar
                            </Button>
                            <Button onClick={handleShare}>
                                <Share2 className="w-4 h-4 mr-2"/> WhatsApp
                            </Button>
                        </div>
                    </div>

                    {/* Reward Status */}
                    {data?.is_reward_active ? (
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-2xl flex items-center gap-4 shadow-lg animate-pulse">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <Award className="w-8 h-8 text-white"/>
                            </div>
                            <div>
                                <h4 className="font-bold text-lg">Benefício Ativo!</h4>
                                <p className="text-sm opacity-90">Válido até {formatDate(data.reward_active_until)}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-xl text-gray-400">
                                <Zap className="w-8 h-8"/>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-500 dark:text-gray-400">Sem Benefícios Ativos</h4>
                                <p className="text-xs text-gray-400">Indique alguém para ativar.</p>
                            </div>
                        </div>
                    )}

                    {/* Redeem Section */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Gift className="w-5 h-5 text-purple-500"/> Fui Indicado
                        </h3>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Insira o código aqui" 
                                value={referralCodeInput}
                                onChange={e => setReferralCodeInput(e.target.value.toUpperCase())}
                                className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl outline-none border border-gray-200 dark:border-gray-600 text-center font-mono uppercase"
                            />
                            <Button onClick={handleRedeem} disabled={redeeming || !referralCodeInput} className="bg-purple-600 hover:bg-purple-700">
                                {redeeming ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Resgatar'}
                            </Button>
                        </div>
                    </div>

                    {/* History List */}
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white mb-4 px-2 flex items-center gap-2">
                            <Users className="w-4 h-4" /> Suas Indicações ({history.length})
                        </h3>
                        <div className="space-y-3">
                            {history.length === 0 ? (
                                <p className="text-center text-gray-400 py-8 text-sm">Você ainda não indicou ninguém.</p>
                            ) : (
                                history.map(item => (
                                    <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white text-sm">{item.referred_user_name}</p>
                                            <p className="text-xs text-gray-500">{formatDate(item.created_at)}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${item.status === 'REWARDED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {item.status === 'REWARDED' ? 'Convertido' : 'Pendente'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
