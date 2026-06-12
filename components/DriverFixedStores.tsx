import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Store, Clock, Award, Activity, Banknote, Navigation } from 'lucide-react';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import * as deliveryFixed from '../services/deliveryFixed';
import { Skeleton } from './Skeleton';

interface DriverFixedStore {
    id: string;
    store_id: string;
    store_name: string;
    store_address: string;
    assignment_type: 'EXCLUSIVE' | 'PRIORITY' | 'SHARED';
    status: 'ACTIVE' | 'SUSPENDED';
    start_date: string;
    deliveries_completed: number;
    earnings_generated: number;
}

export const DriverFixedStores = ({ driverId }: { driverId?: string }) => {
    const { t } = useTranslation();
    const [stores, setStores] = useState<DriverFixedStore[]>([]);
    const [loading, setLoading] = useState(true);
    const dialog = useDialog();

    useEffect(() => {
        if (driverId) {
            loadStores();
        }
    }, [driverId]);

    const loadStores = async () => {
        setLoading(true);
        try {
            const data = await deliveryFixed.getFixedAssignments({ driver_id: driverId, status: 'ACTIVE' });
            
            const mappedStores: DriverFixedStore[] = data.map(assignment => ({
                id: assignment.id!,
                store_id: assignment.store_id,
                store_name: assignment.store?.name || 'Loja Desconhecida',
                store_address: 'Endereço da loja', // TODO: Fetch real store address
                assignment_type: assignment.assignment_type,
                status: assignment.status as 'ACTIVE' | 'SUSPENDED',
                start_date: assignment.created_at || new Date().toISOString(),
                deliveries_completed: 0, // TODO: Fetch from statistics
                earnings_generated: 0 // TODO: Fetch from statistics
            }));
            
            setStores(mappedStores);
        } catch (error) {
            console.error('Error loading fixed stores:', error);
            dialog.toast('Erro ao carregar suas lojas vinculadas.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-brand-500 rounded-2xl p-6 text-white flex flex-col md:flex-row items-center gap-6 shadow-lg">
                <div className="bg-white/20 p-4 rounded-full">
                    <Award className="w-10 h-10 text-white" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h2 className="text-2xl font-black mb-2">Minhas Lojas Vinculadas</h2>
                    <p className="text-brand-100">
                        Como entregador fixo, você tem prioridade ou exclusividade nos pedidos destas lojas, garantindo mais previsibilidade de ganhos e menos tempo de espera.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <Skeleton className="h-6 w-1/2 mb-4" />
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        </div>
                    ))
                ) : stores.length === 0 ? (
                    <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Store className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhuma loja vinculada</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                            Você ainda não é entregador fixo de nenhuma loja. Continue prestando um bom serviço para ser convidado!
                        </p>
                    </div>
                ) : (
                    stores.map((store) => (
                        <div key={store.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-brand-200 dark:border-brand-900/30 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-brand-500 text-white text-[10px] font-bold uppercase px-3 py-1 rounded-bl-lg">
                                Você é entregador fixo
                            </div>

                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-xl flex items-center justify-center">
                                    <Store className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">{store.store_name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{store.store_address}</p>
                                    <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400`}>
                                        {store.assignment_type}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                                        <Activity className="w-3 h-3" /> Pedidos Concluídos
                                    </div>
                                    <div className="font-bold text-gray-900 dark:text-white">{store.deliveries_completed}</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1">
                                        <Banknote className="w-3 h-3 text-green-500" /> Ganhos Gerados
                                    </div>
                                    <div className="font-bold text-green-600 dark:text-green-400">
                                        R$ {store.earnings_generated.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                                <Button className="flex-1 flex items-center justify-center gap-2">
                                    <Navigation className="w-4 h-4" /> Rota até a Loja
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
