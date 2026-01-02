
import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Star, MessageCircle, RefreshCw, Eye, User, X } from 'lucide-react';
import { PartnerRating } from '../types';
import * as cloud from '../services/cloud';
import { Button } from './Button';

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
    const [ratings, setRatings] = useState<PartnerRating[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRating, setSelectedRating] = useState<PartnerRating | null>(null);

    const loadRatings = useCallback(async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetAllRatings();
            setRatings(data);
        } catch (e) {
            console.error("Error loading ratings:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRatings();
    }, [loadRatings]);

    const RatingDetailsModal: React.FC<{ rating: PartnerRating, onClose: () => void }> = ({ rating, onClose }) => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg dark:text-white flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Detalhes da Avaliação</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                    <p><strong>Avaliação:</strong> <RatingStars rating={rating.rating} /></p>
                    <p><strong>Comentário:</strong> {rating.comment || 'Nenhum comentário.'}</p>
                    <p><strong>Direção:</strong> {rating.direction === 'STORE_TO_PARTNER' ? 'Loja -> Entregador' : 'Entregador -> Loja'}</p>
                    <p><strong>Avaliador:</strong> {rating.evaluator_name || rating.evaluator_id}</p>
                    <p><strong>Avaliado:</strong> {rating.evaluated_name || rating.evaluated_id}</p>
                    <p><strong>Data:</strong> {formatDateTime(rating.created_at)}</p>
                </div>
                <Button fullWidth variant="outline" onClick={onClose} className="mt-4">Fechar</Button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-lg dark:text-white">Todas as Avaliações</h3>
                    <button onClick={loadRatings} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
                <div className="overflow-x-auto max-h-96 custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Avaliador</th>
                                <th className="px-4 py-3">Avaliado</th>
                                <th className="px-4 py-3">Nota</th>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-500" /></td></tr>}
                            {!loading && ratings.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhuma avaliação encontrada.</td></tr>}
                            {!loading && ratings.map(rating => (
                                <tr key={rating.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3">
                                        <p className="font-bold dark:text-white">{rating.evaluator_name || 'Usuário'}</p>
                                        <p className="text-xs text-gray-500">{rating.direction === 'STORE_TO_PARTNER' ? 'Loja' : 'Entregador'}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-bold dark:text-white">{rating.evaluated_name || 'Usuário'}</p>
                                        <p className="text-xs text-gray-500">{rating.direction === 'STORE_TO_PARTNER' ? 'Entregador' : 'Loja'}</p>
                                    </td>
                                    <td className="px-4 py-3"><RatingStars rating={rating.rating} /></td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(rating.created_at)}</td>
                                    <td className="px-4 py-3 text-right">
                                        <Button size="sm" variant="outline" onClick={() => setSelectedRating(rating)} className="px-3 py-1.5 text-xs">
                                            <Eye className="w-4 h-4 mr-1"/> Ver
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedRating && <RatingDetailsModal rating={selectedRating} onClose={() => setSelectedRating(null)} />}
        </div>
    );
};