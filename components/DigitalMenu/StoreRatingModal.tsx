
import React, { useState, useEffect } from 'react';
import { Star, X, CheckCircle, Loader2, LogIn } from 'lucide-react';
import { Button } from '../Button';
import { CustomInput } from '../CustomInput';
import { AuthRequiredModal } from './AuthRequiredModal';
import * as cloud from '../../services/cloud';

interface StoreRatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    storeId: string;
    storeName: string;
    customerName?: string;
}

export const StoreRatingModal: React.FC<StoreRatingModalProps> = ({
    isOpen,
    onClose,
    storeId,
    storeName,
    customerName: initialCustomerName
}) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [comment, setComment] = useState('');
    const [customerName, setCustomerName] = useState(initialCustomerName || '');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { user } = await cloud.getUserWithCache();
            if (user) {
                setIsLoggedIn(true);
                // Get name from profile
                const sb = cloud.getClient();
                if (sb) {
                    const { data: profile } = await sb.from('user_profiles').select('name').eq('id', user.id).single();
                    if (profile?.name) {
                        setCustomerName(profile.name);
                    }
                }
            }
            setCheckingAuth(false);
        };
        if (isOpen) checkAuth();
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (!isLoggedIn) {
            setError('Você precisa estar logado para avaliar a loja.');
            return;
        }

        if (rating === 0) {
            setError('Por favor, selecione uma nota de 1 a 5 estrelas.');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await cloud.submitRating(storeId, rating, comment, customerName);
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 3000);
        } catch (err: any) {
            console.error('Error submitting rating:', err);
            setError('Não foi possível enviar sua avaliação agora. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-in zoom-in-95">

                {success ? (
                    <div className="p-8 text-center flex flex-col items-center">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Avaliação Enviada!</h3>
                        <p className="text-gray-500 dark:text-gray-400">Obrigado por ajudar a {storeName} a melhorar.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white">Avaliar sua Experiência</h3>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {!checkingAuth && !isLoggedIn ? (
                                <div className="text-center py-4">
                                    <AuthRequiredModal
                                        isOpen={true}
                                        onClose={onClose}
                                        title="Avaliação Reservada"
                                        description="Para avaliar as lojas e ajudar a comunidade, você precisa estar conectado à sua conta."
                                    />
                                </div>
                            ) : checkingAuth ? (
                                <div className="py-12 flex flex-col items-center gap-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                                    <p className="text-sm text-gray-500">Verificando acesso...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="text-center">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Como foi pedir na <span className="font-bold text-gray-900 dark:text-white">{storeName}</span>?</p>
                                        <div className="flex items-center justify-center gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    type="button"
                                                    className="p-1 transition-transform active:scale-95"
                                                    onMouseEnter={() => setHover(star)}
                                                    onMouseLeave={() => setHover(0)}
                                                    onClick={() => setRating(star)}
                                                >
                                                    <Star
                                                        className={`w-10 h-10 transition-colors ${(hover || rating) >= star
                                                            ? 'fill-yellow-400 text-yellow-400'
                                                            : 'text-gray-200 dark:text-gray-700'
                                                            }`}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {customerName && (
                                            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mb-1">Avaliando como</p>
                                                <p className="font-bold text-gray-900 dark:text-white">{customerName}</p>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Comentário (Opcional)</label>
                                            <textarea
                                                className="w-full bg-gray-50 dark:bg-gray-800 border-0 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                                                placeholder="Conte mais sobre sua experiência..."
                                                rows={3}
                                                value={comment}
                                                onChange={(e) => setComment(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-start gap-3">
                                            <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                                        </div>
                                    )}

                                    <Button
                                        fullWidth
                                        className="py-4 text-lg rounded-2xl shadow-xl shadow-brand-500/20"
                                        onClick={handleSubmit}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin" /> Enviando...
                                            </div>
                                        ) : (
                                            'Enviar Avaliação'
                                        )}
                                    </Button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
