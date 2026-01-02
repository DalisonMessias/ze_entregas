
import React, { useState } from 'react';
import { Star, X, Send, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService'; // Import useDialog

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => Promise<void>;
    targetName: string;
    title?: string;
}

export const RatingModal: React.FC<RatingModalProps> = ({ isOpen, onClose, onSubmit, targetName, title = "Avaliar Serviço" }) => {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { alert } = useDialog(); // Use the custom dialog service

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating === 0) {
            await alert({
                title: "Erro na Avaliação",
                message: "Selecione uma nota de 1 a 5 estrelas."
            });
            return;
        }
        setSubmitting(true);
        try {
            await onSubmit(rating, comment);
            onClose();
        } catch (e) {
            console.error(e);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Como foi sua experiência com <strong className="text-gray-800 dark:text-gray-200">{targetName}</strong>?
                    </p>
                </div>

                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            className="transition-transform hover:scale-110 focus:outline-none"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                        >
                            <Star 
                                className={`w-10 h-10 transition-colors ${
                                    star <= (hoverRating || rating) 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'fill-gray-100 text-gray-300 dark:fill-gray-700 dark:text-gray-600'
                                }`} 
                            />
                        </button>
                    ))}
                </div>

                <textarea
                    className="w-full p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:text-white mb-4 resize-none h-24"
                    placeholder="Deixe um comentário (opcional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />

                <Button fullWidth onClick={handleSubmit} disabled={submitting} className="py-4 text-lg shadow-lg shadow-brand-500/20">
                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Enviar Avaliação'}
                </Button>
            </div>
        </div>
    );
};
