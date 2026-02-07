
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Star, MessageCircle, RefreshCw, Eye, User, X, FileText, CheckCircle, AlertTriangle, Trash2, Edit2, Download } from 'lucide-react';
import { PartnerRating, RatingChangeRequest } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';
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

export const AdminRatings: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'ratings' | 'requests'>('ratings');
    const [ratings, setRatings] = useState<PartnerRating[]>([]);
    const [requests, setRequests] = useState<RatingChangeRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRating, setSelectedRating] = useState<PartnerRating | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<RatingChangeRequest | null>(null);
    const { alert, confirm, prompt } = useDialog();

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (activeTab === 'ratings') {
                const data = await cloud.adminGetAllRatings();
                setRatings(data);
            } else {
                const data = await cloud.getAllRatingRequests();
                setRequests(data);
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

    const handleProcessRequest = async (request: RatingChangeRequest, action: 'APPROVE' | 'REJECT') => {
        if (action === 'REJECT') {
            const reason = await prompt({
                title: 'Rejeitar Solicitação',
                message: 'Informe o motivo da recusa:',
                confirmButtonText: 'Rejeitar',
                placeholder: 'Motivo...'
            });
            if (!reason) return;

            try {
                await cloud.updateRatingRequestStatus(request.id, 'REJECTED', reason);
                await alert('Solicitação rejeitada com sucesso.');
                loadData();
                setSelectedRequest(null);
            } catch (e) {
                console.error(e);
                await alert('Erro ao rejeitar solicitação.');
            }
        } else { // APPROVE
            if (!await confirm('Tem certeza que deseja APROVAR e EXECUTAR esta solicitação? A ação é irreversível.')) return;

            try {
                // Executar ações
                for (const type of request.request_types) {
                    if (type === 'DELETE_RATING') {
                        await cloud.executeRatingRequestAction(request.id, 'DELETE');
                    } else if (type === 'EDIT_COMMENT') {
                        await cloud.executeRatingRequestAction(request.id, 'EDIT', { newComment: request.new_comment });
                    }
                }

                // Atualizar status
                await cloud.updateRatingRequestStatus(request.id, 'COMPLETED');
                await alert('Solicitação aprovada e executada com sucesso.');
                loadData();
                setSelectedRequest(null);
            } catch (e) {
                console.error(e);
                await alert('Erro ao executar solicitação. Verifique se a avaliação ainda existe.');
            }
        }
    };

    const RatingDetailsModal: React.FC<{ rating: PartnerRating, onClose: () => void }> = ({ rating, onClose }) => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Detalhes da Avaliação</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                    <div><strong>Avaliação:</strong> <RatingStars rating={rating.rating} /></div>
                    <p><strong>Comentário:</strong> {rating.comment || 'Nenhum comentário.'}</p>
                    <p><strong>Direção:</strong> {rating.direction === 'STORE_TO_PARTNER' ? 'Loja -> Entregador' : 'Entregador -> Loja'}</p>
                    <p><strong>Avaliador:</strong> {rating.evaluator_name || rating.evaluator_id}</p>
                    <p><strong>Avaliado:</strong> {rating.evaluated_name || rating.evaluated_id}</p>
                    <p><strong>Data:</strong> {formatDateTime(rating.created_at)}</p>
                </div>
                <div className="flex gap-2 mt-4">
                    {rating.evaluated_city_slug && rating.evaluated_slug && (
                        <Button fullWidth variant="outline" onClick={() => window.open(`/${rating.evaluated_city_slug}/${rating.evaluated_slug}/produtos`, '_blank')}>
                            Ver Loja
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
                        <span className="text-gray-500">Taxa Paga:</span>
                        <span className="font-bold">R$ {request.fee_charged.toFixed(2)}</span>
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

                    {request.new_comment && (
                        <div>
                            <strong className="text-sm block text-gray-500">Novo Comentário Desejado:</strong>
                            <p className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 p-2 rounded text-sm border border-blue-100 dark:border-blue-800">{request.new_comment}</p>
                        </div>
                    )}

                    {request.rating && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <strong className="text-sm block text-gray-500 mb-2">Avaliação Original:</strong>
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm italic opacity-75">
                                "{request.rating.comment}" <br />
                                <span className="text-xs not-italic mt-1 block">Nota: {request.rating.rating} | {formatDateTime(request.rating.created_at)}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex gap-2 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button fullWidth variant="outline" onClick={() => generateRatingRequestPDF(request)}>
                        <Download className="w-4 h-4 mr-2" /> Baixar PDF
                    </Button>

                    {request.status === 'OPEN' || request.status === 'IN_ANALYSIS' ? (
                        <>
                            <Button fullWidth variant="danger" onClick={() => handleProcessRequest(request, 'REJECT')}>Rejeitar</Button>
                            <Button fullWidth variant="success" onClick={() => handleProcessRequest(request, 'APPROVE')}>Aprovar e Executar</Button>
                        </>
                    ) : (
                        <div className="w-full flex justify-end">
                            <Button fullWidth onClick={onClose}>Fechar</Button>
                        </div>
                    )}
                </div>
                {request.status !== 'OPEN' && request.status !== 'IN_ANALYSIS' && (
                    <div className="mt-2 text-center text-sm text-gray-500">
                        Finalizada em {formatDateTime(request.updated_at || '')}
                        {request.admin_notes && <p className="mt-1 text-red-500">Obs Admin: {request.admin_notes}</p>}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-4 border-b border-gray-200 dark:border-gray-700 pb-1">
                <button
                    onClick={() => setActiveTab('ratings')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'ratings' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    Todas as Avaliações
                    {activeTab === 'ratings' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t-full" />}
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`pb-2 px-4 text-sm font-medium transition-colors relative ${activeTab === 'requests' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
                >
                    Solicitações / Protocolos
                    {activeTab === 'requests' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-t-full" />}
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">
                        {activeTab === 'ratings' ? 'Todas as Avaliações' : 'Solicitações de Alteração'}
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
                                    <th className="px-4 py-3">Avaliador</th>
                                    <th className="px-4 py-3">Avaliado</th>
                                    <th className="px-4 py-3">Nota</th>
                                    <th className="px-4 py-3">Data</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            ) : (
                                <tr>
                                    <th className="px-4 py-3">Protocolo</th>
                                    <th className="px-4 py-3">Loja</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3">Status</th>
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
                                        <p className="font-bold dark:text-white">{rating.evaluator_name || rating.evaluator_id}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-500">{rating.evaluated_name || rating.evaluated_id}</td>
                                    <td className="px-4 py-3"><RatingStars rating={rating.rating} /></td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(rating.created_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Button size="sm" variant="outline" onClick={() => setSelectedRating(rating)}>
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}

                            {!loading && activeTab === 'requests' && requests.map(req => (
                                <tr key={req.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 font-mono font-bold text-gray-600 dark:text-gray-300">{req.protocol}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{req.store?.store_name || 'Loja Desconhecida'}</td>
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
            {selectedRequest && <RequestDetailsModal request={selectedRequest} onClose={() => setSelectedRequest(null)} />}
        </div>
    );
};