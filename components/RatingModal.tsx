import React, { useState } from 'react';
import { Star, X, MessageSquare, ThumbsUp } from 'lucide-react';
import { Button } from './Button';

interface RatingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (rating: number, comment: string) => Promise<void>;
    targetName?: string;
    title?: string;
}

export const RatingModal: React.FC<RatingModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    targetName = "o Entregador",
    title = "Avaliar Serviço"
}) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [hoverRating, setHoverRating] = useState(0);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        if (rating === 0) return;
        setSubmitting(true);
        await onSubmit(rating, comment);
        setSubmitting(false);
        setRating(0);
        setComment('');
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[32px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="text-center mb-6 mt-2">
                    <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500">
                        <ThumbsUp className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">{title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Como foi sua experiência com {targetName}?
                    </p>
                </div>

                <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(star)}
                            className="p-1 transition-transform hover:scale-110 focus:outline-none"
                        >
                            <Star
                                className={`w-8 h-8 ${(hoverRating || rating) >= star
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-gray-300 dark:text-gray-600'
                                    } transition-colors duration-200`}
                            />
                        </button>
                    ))}
                </div>

                <div className="mb-6 relative">
                    <MessageSquare className="w-5 h-5 text-gray-400 absolute top-3 left-3" />
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Escreva um comentário (opcional)..."
                        className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3 pl-10 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400"
                    />
                </div>

                <Button
                    fullWidth
                    onClick={handleSubmit}
                    disabled={submitting || rating === 0}
                    className="py-3 shadow-lg shadow-brand-500/20"
                >
                    {submitting ? 'Enviando...' : 'Enviar Avaliação'}
                </Button>
            </div>
        </div>
    );
};
