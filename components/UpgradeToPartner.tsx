import React, { useState } from 'react';
import { Truck, Store, ArrowRight, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import * as cloud from '../services/cloud';
import { ActiveTab } from '../types/navigation';

export const UpgradeToPartner: React.FC<{ onNavigate: (tab: ActiveTab) => void }> = ({ onNavigate }) => {
    const [loading, setLoading] = useState(false);
    const { confirm, alert } = useDialog();

    const handleUpgrade = async (type: 'delivery_partner' | 'store_partner') => {
        const title = type === 'delivery_partner' ? 'Confirmar Adesão de Entregador' : 'Confirmar Adesão de Loja';
        const message = type === 'delivery_partner' ? 
            'Tem certeza que deseja transformar sua conta comum em uma conta de Entregador (Motoboy)?' :
            'Tem certeza que deseja converter sua conta comum para uma Conta de Loja Parceira?';

        if (!await confirm({ title, message })) return;

        try {
            setLoading(true);
            const sb = cloud.getClient();
            if (!sb) return;

            // Invocar mudança oficial via Postgres RPC
            const { data, error } = await sb.rpc('upgrade_user_role', { p_new_role: type });
            
            if (error) throw error;

            if (data?.success) {
                await alert({ 
                    title: 'Bem-vindo ao Time! 🎉', 
                    message: 'Sua conta foi atualizada com sucesso no banco de dados! A página será recarregada para liberar seu painel logístico.' 
                });
                window.location.reload();
            } else {
                await alert({ title: 'Aviso', message: data?.message || 'Erro validando seu perfil.' });
            }
        } catch (error: any) {
            console.error(error);
            await alert({ title: 'Falha de Comunicação', message: 'Houve um bloqueio ao conversar com os servidores. Recarregue a página.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-6 pb-24 animate-in fade-in slide-in-from-bottom-4 pt-10">
            <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-brand-600 to-brand-900 p-8 md:p-12 text-white shadow-xl shadow-brand-500/20 mb-8 border border-brand-500/30">
                <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 pointer-events-none">
                    <Sparkles className="w-64 h-64" />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <span className="text-xs font-black tracking-widest uppercase bg-white/20 px-3 py-1 rounded-full mb-4 inline-block">Passaporte Liberado</span>
                    <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight">Evolua sua Jornada Logística!</h1>
                    <p className="text-brand-100 text-lg md:text-xl font-medium mb-6">Você está a um passo de desbloquear o verdadeiro poder do Zé Entregas. Escolha sua modalidade e transforme de imediato sua conta comum em um painel completo para fazer negócios e dinheiro na sua mão.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Modalidade Entregador */}
                <div className="bg-white dark:bg-gray-900 rounded-[40px] p-8 md:p-10 border-2 border-gray-100 dark:border-gray-800 shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:border-brand-500 transition-all duration-300 group relative">
                    <div className="w-20 h-20 bg-brand-50 border border-brand-100 dark:bg-brand-900/40 rounded-[28px] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform shadow-inner shadow-brand-500/10">
                        <Truck className="w-10 h-10 text-brand-600" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Sou Entregador</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 leading-relaxed text-base">
                        Ganhe dinheiro rodando com flexibilidade pela cidade. Receba corridas em alta velocidade, acesse o painel de gamificação de metas e tenha uma Carteira Zé completa.
                    </p>
                    
                    <ul className="space-y-4 mb-10 bg-gray-50 dark:bg-gray-800/40 p-6 rounded-3xl">
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Missões com pagamentos via Metas</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Extrato financeiro e Carteira Digital Pessoal</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Livre para rodar no seu próprio cronograma</span>
                        </li>
                    </ul>

                    <Button 
                        disabled={loading}
                        onClick={() => handleUpgrade('delivery_partner')}
                        className="w-full bg-brand-500 hover:bg-brand-600 active:scale-95 text-white shadow-xl shadow-brand-500/30 rounded-2xl h-16 text-lg font-black group-hover:animate-pulse transition-all"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>SERUM UM MOTOBOY ZÉ <ArrowRight className="w-5 h-5 ml-2" /></>}
                    </Button>
                </div>

                {/* Modalidade Loja Parceira */}
                <div className="bg-white dark:bg-gray-900 rounded-[40px] p-8 md:p-10 border-2 border-gray-100 dark:border-gray-800 shadow-lg hover:shadow-2xl hover:-translate-y-1 hover:border-purple-500 transition-all duration-300 group relative">
                    <div className="absolute top-6 right-6 flex items-center justify-center p-2 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 text-[10px] font-black rounded-lg uppercase tracking-widest">
                        Recomendado
                    </div>
                    <div className="w-20 h-20 bg-purple-50 border border-purple-100 dark:bg-purple-900/40 rounded-[28px] flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-6 transition-transform shadow-inner shadow-purple-500/10">
                        <Store className="w-10 h-10 text-purple-600" strokeWidth={2.5} />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3">Sou Lojista</h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium mb-8 leading-relaxed text-base">
                        Automatize toda sua operação conectando as suas vendas diretas na logística expressa. Chame um motoboy em 1 clique e acompanhe no rastreador.
                    </p>
                    
                    <ul className="space-y-4 mb-10 bg-gray-50 dark:bg-gray-800/40 p-6 rounded-3xl">
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Hub completo de disparos de corrida Express</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Relatórios Financeiros e Custo da Frota</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 className="w-6 h-6 text-green-500 shrink-0 mt-0.5" />
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Geração de Cupons e Clube de Assinaturas</span>
                        </li>
                    </ul>

                    <Button 
                        disabled={loading}
                        onClick={() => handleUpgrade('store_partner')}
                        className="w-full bg-purple-600 hover:bg-purple-700 active:scale-95 text-white shadow-xl shadow-purple-500/30 rounded-2xl h-16 text-lg font-black group-hover:animate-pulse transition-all"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>CADASTRAR MEU ESTABELECIMENTO <ArrowRight className="w-5 h-5 ml-2" /></>}
                    </Button>
                </div>
            </div>
            
            <div className="mt-10 px-6 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl text-center text-xs font-bold text-gray-400 flex items-center justify-center gap-2 max-w-2xl mx-auto shadow-sm">
                <AlertCircle className="w-5 h-5 text-gray-300 shrink-0" /> 
                <span>Importante: Realizar o upgrade altera a estrutura visual da sua plataforma. Você passará a concordar operacionalmente com os termos de parceiros para as entregas ativas.</span>
            </div>
        </div>
    );
};
