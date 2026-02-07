
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Star, RefreshCw, Eye, X, MessageSquare, ShieldCheck, ShieldOff, AlertTriangle, FileText, CheckCircle, Wallet, Download } from 'lucide-react';
import { PartnerRating, PartnerProfile, SystemFee, RatingChangeRequest, PartnerFeeSettings } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';
import { Loading } from './Loading';
import { useDialog } from '../utils/dialogService';
import { generateRatingRequestPDF } from '../utils/ratingPdf';

const formatDateTime = (isoString: string) => new Date(isoString).toLocaleString('pt-BR');

const RatingStars: React.FC<{ rating: number }> = ({ rating }) => (
    <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
            <Star
                key={star}
                className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-300 dark:fill-gray-700 dark:text-gray-600'}`}
            />
        ))}
    </div>
);

export const AdminStoreRatings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'ratings' | 'requests'>('ratings');
    const [ratings, setRatings] = useState<PartnerRating[]>([]);
    const [requests, setRequests] = useState<RatingChangeRequest[]>([]);
    const [profile, setProfile] = useState<PartnerProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingConfig, setUpdatingConfig] = useState(false);
    const [selectedRating, setSelectedRating] = useState<PartnerRating | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<RatingChangeRequest | null>(null);
    const [respondingTo, setRespondingTo] = useState<PartnerRating | null>(null);

    // Request State
    const [requestingChange, setRequestingChange] = useState<PartnerRating | null>(null);
    const [fees, setFees] = useState<SystemFee[]>([]);
    const [globalFees, setGlobalFees] = useState<PartnerFeeSettings | null>(null);
    const [isSuperStore, setIsSuperStore] = useState(false);
    const [walletBalance, setWalletBalance] = useState<number | null>(null);

    const { alert, confirm } = useDialog();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const p = await cloud.getMyPartnerProfile();
            setProfile(p);

            // Check if super store
            const user = await cloud.getMe();
            setIsSuperStore(user?.is_super_store || false);

            if (p?.id) {
                if (activeTab === 'ratings') {
                    // Buscamos as avaliações reais recebidas pela loja
                    const { data } = await cloud.getClient()
                        ?.from('partner_ratings')
                        .select('*, evaluator:user_profiles!evaluator_id(name), is_anonymous')
                        .eq('evaluated_id', p.id)
                        .eq('direction', 'PARTNER_TO_STORE')
                        .order('created_at', { ascending: false }) || { data: [] };

                    // Mapear para o formato PartnerRating
                    const formatted = (data || []).map(r => ({
                        ...r,
                        evaluator_name: r.is_anonymous ? 'Anônimo' : (r.evaluator?.name || 'Cliente')
                    }));
                    setRatings(formatted);
                } else {
                    // Load requests
                    const reqs = await cloud.getStoreRatingRequests(p.id);
                    setRequests(reqs);
                }
            }

            // Load fees
            const [feesData, globalFeesData] = await Promise.all([
                cloud.getSystemFees(),
                cloud.getPartnerFeeSettings()
            ]);
            setFees(feesData);
            setGlobalFees(globalFeesData);

            // Load Wallet
            const wallets = await cloud.getStoreWallets();
            if (wallets && wallets.length > 0) {
                setWalletBalance(wallets[0].balance_decimal); // Assuming one wallet
            }

        } catch (e) {
            console.error("Error loading data:", e);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const toggleCommentsVisibility = async () => {
        if (!profile) return;
        setUpdatingConfig(true);
        try {
            const newValue = !profile.show_comments_on_menu;
            await cloud.updateMyPartnerProfile({ show_comments_on_menu: newValue });
            setProfile({ ...profile, show_comments_on_menu: newValue });
        } catch (e) {
            console.error("Error updating comments visibility:", e);
        } finally {
            setUpdatingConfig(false);
        }
    };

    const RatingDetailsModal: React.FC<{ rating: PartnerRating, onClose: () => void }> = ({ rating, onClose }) => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-400" /> Detalhes da Avaliação
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-2">
                        <p className="text-xs text-gray-500 uppercase font-black">Cliente</p>
                        <p className="font-bold dark:text-white text-lg">{rating.evaluator_name}</p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-2">
                        <p className="text-xs text-gray-500 uppercase font-black">Avaliação</p>
                        <RatingStars rating={rating.rating} />
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-2">
                        <p className="text-xs text-gray-500 uppercase font-black">Comentário</p>
                        <p className="text-gray-700 dark:text-gray-300 italic">
                            "{rating.comment || 'O cliente não deixou um comentário.'}"
                        </p>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500 px-1">
                        <span>Realizada em: {formatDateTime(rating.created_at)}</span>
                    </div>
                </div>
                <div className="flex gap-2 mt-4">
                    {profile?.city_slug && profile?.store_slug && (
                        <Button fullWidth variant="outline" onClick={() => window.open(`/${profile.city_slug}/${profile.store_slug}/produtos`, '_blank')}>
                            Ver no Menu
                        </Button>
                    )}
                    <Button fullWidth variant="outline" onClick={onClose}>Fechar</Button>
                </div>
            </div>
        </div>
    );

    const RequestDetailsModal: React.FC<{ request: RatingChangeRequest, onClose: () => void }> = ({ request, onClose }) => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><FileText className="w-5 h-5 text-brand-500" /> Detalhes da Solicitação</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Protocolo:</span>
                        <span className="font-mono font-bold">{request.protocol}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Status:</span>
                        <span className={`font-bold ${request.status === 'OPEN' ? 'text-yellow-600' : request.status === 'COMPLETED' ? 'text-green-600' : 'text-red-600'}`}>{request.status}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Loja:</span>
                        <span className="font-bold">{request.store?.store_name || 'N/A'}</span>
                    </div>
                </div>

                <div className="space-y-3 mt-4">
                    <h4 className="font-bold text-gray-900 dark:text-white border-b pb-1">Solicitação</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300">
                        {request.request_types.includes('EDIT_COMMENT') && <li>Editar Comentário</li>}
                        {request.request_types.includes('DELETE_RATING') && <li>Excluir Avaliação</li>}
                    </ul>

                    <div>
                        <strong className="text-sm block text-gray-500">Motivo:</strong>
                        <p className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-sm">{request.reason}</p>
                    </div>

                    {request.admin_notes && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-100 dark:border-red-800">
                            <strong className="text-sm block text-red-500">Nota do Admin:</strong>
                            <p className="text-sm text-red-700 dark:text-red-300">{request.admin_notes}</p>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button fullWidth variant="outline" onClick={() => generateRatingRequestPDF(request)}>
                        <Download className="w-4 h-4 mr-2" /> Baixar PDF
                    </Button>
                    <Button fullWidth onClick={onClose}>Fechar</Button>
                </div>
            </div>
        </div>
    );

    const StoreResponseModal: React.FC<{ rating: PartnerRating, onClose: () => void }> = ({ rating, onClose }) => {
        const [response, setResponse] = useState(rating.store_response || '');
        const [saving, setSaving] = useState(false);
        const { alert, confirm } = useDialog();

        const handleSave = async () => {
            if (!response.trim()) return;
            setSaving(true);
            try {
                await cloud.submitStoreResponse(rating.id, response);
                await alert("Resposta enviada com sucesso!");
                loadData();
                onClose();
            } catch (e) {
                console.error("Error saving response:", e);
                window.alert("Erro ao enviar resposta. Verifique o console.");
                await alert("Erro ao enviar resposta. Tente novamente.");
            } finally {
                setSaving(false);
            }
        };

        const handleDelete = async () => {
            const confirmed = await confirm({
                title: 'Remover Resposta',
                message: 'Deseja realmente remover sua resposta?',
                confirmButtonText: 'Sim, remover',
                cancelButtonText: 'Cancelar'
            });
            if (!confirmed) return;

            setSaving(true);
            try {
                await cloud.submitStoreResponse(rating.id, '');
                await alert("Resposta removida com sucesso!");
                loadData();
                onClose();
            } catch (e) {
                console.error(e);
                await alert("Erro ao remover resposta.");
            } finally {
                setSaving(false);
            }
        };

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-brand-500" /> Responder Avaliação
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-2 mb-4">
                        <p className="text-sm italic text-gray-600 dark:text-gray-400">"{rating.comment}"</p>
                        <p className="text-xs text-gray-400 text-right">- {rating.evaluator_name}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Sua Resposta</label>
                        <textarea
                            value={response}
                            onChange={e => setResponse(e.target.value)}
                            className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[100px] dark:bg-gray-700 dark:text-white"
                            placeholder="Escreva uma resposta cordial para o cliente..."
                        />
                    </div>

                    <div className="flex gap-2 justify-end mt-4">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        {rating.store_response && (
                            <Button variant="danger" onClick={handleDelete} disabled={saving}>
                                Excluir
                            </Button>
                        )}
                        <Button onClick={handleSave} disabled={saving || !response.trim()}>
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Resposta'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    };

    const RequestChangeModal: React.FC<{ rating: PartnerRating, onClose: () => void }> = ({ rating, onClose }) => {
        const [selectedTypes, setSelectedTypes] = useState<('EDIT_COMMENT' | 'DELETE_RATING')[]>(['EDIT_COMMENT']);
        const [reason, setReason] = useState('');
        const [newComment, setNewComment] = useState('');
        const [submitting, setSubmitting] = useState(false);
        const { alert, confirm } = useDialog();

        // Toggle function for multiselect
        const toggleType = (type: 'EDIT_COMMENT' | 'DELETE_RATING') => {
            setSelectedTypes(prev => {
                // Prevent deselecting last item if needed, but allow empty for now (validation handles it)
                if (prev.includes(type)) return prev.filter(t => t !== type);
                return [...prev, type];
            });
        };

        // Calculate Cost
        const editFee = fees.find(f => f.key === 'rating_edit_fee')?.value || 0;
        const deleteFee = fees.find(f => f.key === 'rating_delete_fee')?.value || 0;

        let baseCost = 0;
        if (selectedTypes.includes('EDIT_COMMENT')) baseCost += editFee;
        if (selectedTypes.includes('DELETE_RATING')) baseCost += deleteFee;

        let discountValue = 0;
        let discountPercent = 0;
        const comboEnabled = globalFees?.combo_discount_enabled;
        const comboPercent = globalFees?.combo_discount_percent || 0;

        if (comboEnabled && selectedTypes.includes('EDIT_COMMENT') && selectedTypes.includes('DELETE_RATING')) {
            discountPercent = comboPercent;
            discountValue = baseCost * (comboPercent / 100);
        }

        const totalCostCalc = Math.max(0, baseCost - discountValue);
        const finalCost = isSuperStore ? 0 : totalCostCalc;

        const handleSubmit = async () => {
            if (selectedTypes.length === 0) {
                await alert("Selecione pelo menos um tipo de solicitação.");
                return;
            }
            if (!reason.trim()) {
                await alert("O motivo é obrigatório.");
                return;
            }
            if (!isSuperStore && walletBalance !== null && walletBalance < finalCost) {
                await alert("Saldo insuficiente na carteira.");
                return;
            }

            const msg = finalCost > 0
                ? `Confirma a solicitação? Será debitado R$ ${finalCost.toFixed(2)}.`
                : 'Confirma a solicitação? (Sem custo).';

            if (!await confirm(msg)) return;

            setSubmitting(true);
            try {
                const res = await cloud.createRatingRequest(
                    rating.id,
                    selectedTypes,
                    reason,
                    selectedTypes.includes('EDIT_COMMENT') ? newComment : undefined
                );

                if (res.success) {
                    await alert(`Solicitação enviada com sucesso! Protocolo: ${res.protocol}`);
                    onClose();
                    setActiveTab('requests');
                } else {
                    throw new Error(res.message || 'Erro desconhecido');
                }
            } catch (e: any) {
                console.error(e);
                await alert(`Erro ao enviar solicitação: ${e.message}`);
            } finally {
                setSubmitting(false);
            }
        };

        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-brand-500" /> Solicitar Alteração
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Selecione as ações desejadas</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => toggleType('EDIT_COMMENT')}
                                    className={`p-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${selectedTypes.includes('EDIT_COMMENT') ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {selectedTypes.includes('EDIT_COMMENT') && <CheckCircle className="w-4 h-4" />}
                                    Editar Comentário
                                </button>
                                <button
                                    onClick={() => toggleType('DELETE_RATING')}
                                    className={`p-3 rounded-xl border text-sm font-medium transition-colors flex items-center justify-center gap-2 ${selectedTypes.includes('DELETE_RATING') ? 'border-red-500 bg-red-50 text-red-700 font-bold' : 'border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {selectedTypes.includes('DELETE_RATING') && <CheckCircle className="w-4 h-4" />}
                                    Excluir Avaliação
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Motivo</label>
                            <textarea
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[80px] dark:bg-gray-700 dark:text-white"
                                placeholder="Justifique sua solicitação..."
                            />
                        </div>

                        {selectedTypes.includes('EDIT_COMMENT') && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Novo Comentário (Sugerido)</label>
                                <textarea
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl min-h-[80px] dark:bg-gray-700 dark:text-white"
                                    placeholder="Texto que deve substituir o comentário original..."
                                />
                            </div>
                        )}

                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 dark:text-gray-300">Subtotal:</span>
                                <span className="font-medium">R$ {baseCost.toFixed(2)}</span>
                            </div>

                            {discountValue > 0 && (
                                <div className="flex justify-between items-center text-sm text-green-600">
                                    <span className="flex items-center gap-1 font-bold"><AlertTriangle className="w-3 h-3" /> Desconto Combo ({discountPercent}%):</span>
                                    <span className="font-bold">- R$ {discountValue.toFixed(2)}</span>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
                                <span className="text-xs text-gray-500 block uppercase font-bold">Total a Pagar</span>
                                {isSuperStore ? (
                                    <span className="text-green-600 font-bold text-sm">Gratuito (Super Lojista)</span>
                                ) : (
                                    <span className="text-gray-900 dark:text-white font-bold text-lg">R$ {finalCost.toFixed(2)}</span>
                                )}
                            </div>

                            {!isSuperStore && walletBalance !== null && (
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-xs text-gray-500 block uppercase font-bold">Saldo em Carteira</span>
                                    <span className={`font-bold text-sm ${walletBalance >= finalCost ? 'text-green-600' : 'text-red-500'}`}>
                                        R$ {walletBalance.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2 justify-end mt-4">
                        <Button variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button onClick={handleSubmit} disabled={submitting || selectedTypes.length === 0}>
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Solicitação'}
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            {profile && (
                <div className="bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg mb-8">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-black mb-1">Avaliações da Loja</h2>
                            <p className="opacity-90">Gerencie sua reputação e responda aos clientes</p>
                            {isSuperStore && (
                                <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold border border-white/30 backdrop-blur-sm">
                                    🌟 Super Lojista
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1 backdrop-blur-md border border-white/20">
                            <span className="px-3 py-2 text-sm font-medium">Comentários no Cardápio:</span>
                            <button
                                onClick={toggleCommentsVisibility}
                                disabled={updatingConfig}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${profile.show_comments_on_menu ? 'bg-green-400 text-green-900 shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'bg-red-400 text-red-900 shadow-[0_0_15px_rgba(248,113,113,0.5)]'}`}
                            >
                                {updatingConfig ? <Loader2 className="w-4 h-4 animate-spin" /> : (profile.show_comments_on_menu ? 'VISÍVEL' : 'OCULTO')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-1">
                <button
                    onClick={() => setActiveTab('ratings')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'ratings' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    Recebidas
                    {activeTab === 'ratings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'requests' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    Histórico de Solicitações
                    {activeTab === 'requests' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t-full" />}
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">
                        {activeTab === 'ratings' ? 'Últimas Avaliações' : 'Minhas Solicitações'}
                    </h3>
                    <button onClick={loadData} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <div className="overflow-x-auto max-h-96 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                            {activeTab === 'ratings' ? (
                                <tr>
                                    <th className="px-4 py-3">Cliente</th>
                                    <th className="px-4 py-3">Nota</th>
                                    <th className="px-4 py-3">Comentário</th>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-4 py-3">Protocolo</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Custo</th>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            )}
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></td></tr>}

                            {!loading && activeTab === 'ratings' && ratings.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhuma avaliação encontrada.</td></tr>}

                            {!loading && activeTab === 'requests' && requests.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Nenhuma solicitação encontrada.</td></tr>}

                            {!loading && activeTab === 'ratings' && ratings.map(rating => (
                                <tr key={rating.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold dark:text-white">{rating.evaluator_name}</p>
                                        <p className="text-xs text-gray-500">{rating.is_anonymous ? 'Anônimo' : 'Identificado'}</p>
                                    </td>
                                    <td className="px-4 py-3"><RatingStars rating={rating.rating} /></td>
                                    <td className="px-4 py-3">
                                        <p className="truncate max-w-xs dark:text-gray-300">{rating.comment || 'Sem comentário'}</p>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(rating.created_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setSelectedRating(rating)} title="Ver Detalhes">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant={rating.store_response ? 'success' : 'primary'} onClick={() => setRespondingTo(rating)} title="Responder">
                                                <MessageSquare className="w-4 h-4" />
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setRequestingChange(rating)} title="Solicitar Alteração" className="text-orange-600 hover:text-orange-700 border-orange-200 hover:bg-orange-50">
                                                <AlertTriangle className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {!loading && activeTab === 'requests' && requests.map(req => (
                                <tr key={req.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 font-mono font-bold text-gray-600 dark:text-gray-300">{req.protocol}</td>
                                    <td className="px-4 py-3 text-xs">
                                        {req.request_types.includes('DELETE_RATING') && <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 mr-1">Exclusão</span>}
                                        {req.request_types.includes('EDIT_COMMENT') && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700">Edição</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${req.status === 'OPEN' ? 'bg-yellow-100 text-yellow-700' :
                                            req.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                'bg-red-100 text-red-700'
                                            }`}>
                                            {req.status === 'OPEN' ? 'Aberto' : req.status === 'COMPLETED' ? 'Concluído' : req.status === 'REJECTED' ? 'Recusado' : req.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">R$ {req.fee_charged.toFixed(2)}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(req.created_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Button size="sm" variant="outline" onClick={() => setSelectedRequest(req)} className="px-3 py-1.5 text-xs">
                                            <Eye className="w-4 h-4 mr-1" /> Detalhes
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedRating && <RatingDetailsModal rating={selectedRating} onClose={() => setSelectedRating(null)} />}
            {respondingTo && <StoreResponseModal rating={respondingTo} onClose={() => setRespondingTo(null)} />}
            {requestingChange && <RequestChangeModal rating={requestingChange} onClose={() => setRequestingChange(null)} />}
            {selectedRequest && <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
        </div>
    );
};
