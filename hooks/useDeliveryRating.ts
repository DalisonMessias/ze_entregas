import { useState } from 'react';
import { getClient } from '../services/cloud';
import { useDialog } from '../utils/dialogService';

export const useDeliveryRating = () => {
    const [loading, setLoading] = useState(false);
    const { alert } = useDialog();

    const submitRating = async (orderId: string, driverId: string, rating: number, comment?: string) => {
        setLoading(true);
        const supabase = getClient();
        if (!supabase) {
            await alert({ title: 'Erro', message: 'Sistema indisponível (Cliente Supabase).' });
            return;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { error } = await supabase
                .from('delivery_ratings')
                .insert({
                    order_id: orderId,
                    driver_id: driverId,
                    user_id: user.id,
                    rating,
                    comment,
                    created_at: new Date().toISOString()
                });

            if (error) {
                if (error.code === '23505') { // Unique violation
                    await alert({ title: 'Aviso', message: 'Você já avaliou esta entrega.' });
                } else {
                    throw error;
                }
            } else {
                await alert({ title: 'Sucesso', message: 'Avaliação enviada com sucesso!' });
            }
        } catch (error: any) {
            console.error('Error submitting rating:', error);
            await alert({ title: 'Erro', message: 'Falha ao enviar avaliação.' });
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return { submitRating, loading };
};
