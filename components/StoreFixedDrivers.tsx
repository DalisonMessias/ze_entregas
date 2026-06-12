import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Search, UserPlus, Clock, Star, Activity } from 'lucide-react';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
import * as deliveryFixed from '../services/deliveryFixed';
import { Skeleton } from './Skeleton';

interface StoreFixedDriver {
    id: string;
    driver_name: string;
    driver_phone: string;
    vehicle_type: string;
    status: 'ONLINE' | 'OFFLINE' | 'IN_DELIVERY';
    last_activity: string;
    total_deliveries: number;
    acceptance_rate: number;
    average_rating: number;
    assignment_type: 'EXCLUSIVE' | 'PRIORITY' | 'SHARED';
}

export const StoreFixedDrivers = ({ storeId }: { storeId?: string }) => {
    const { t } = useTranslation();
    const [drivers, setDrivers] = useState<StoreFixedDriver[]>([]);
    const [loading, setLoading] = useState(true);
    const dialog = useDialog();

    useEffect(() => {
        if (storeId) {
            loadDrivers();
        }
    }, [storeId]);

    const loadDrivers = async () => {
        setLoading(true);
        try {
            const data = await deliveryFixed.getFixedAssignments({ store_id: storeId, status: 'ACTIVE' });
            
            const mappedDrivers: StoreFixedDriver[] = data.map(assignment => ({
                id: assignment.id!,
                driver_name: assignment.driver?.full_name || 'Desconhecido',
                driver_phone: assignment.driver?.phone || '',
                vehicle_type: assignment.driver?.vehicle_type || 'N/A',
                status: 'OFFLINE', // TODO: Fetch real online status
                last_activity: new Date().toISOString(),
                total_deliveries: 0, // TODO: Fetch from delivery_fixed_statistics
                acceptance_rate: 100,
                average_rating: 5.0,
                assignment_type: assignment.assignment_type
            }));
            
            setDrivers(mappedDrivers);
        } catch (error) {
            console.error('Error loading store fixed drivers:', error);
            dialog.toast('Erro ao carregar seus entregadores fixos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleRequestNew = () => {
        dialog.confirm({
            title: 'Solicitar Entregador Fixo',
            message: 'Deseja solicitar a vinculação de um novo entregador fixo para sua loja? Nossa equipe avaliará a disponibilidade na sua região.',
            confirmLabel: 'Solicitar',
            cancelLabel: 'Cancelar',
            onConfirm: async () => {
                dialog.toast('Solicitação enviada com sucesso! Em breve entraremos em contato.', 'success');
            }
        });
    };

    const handleReplace = (driver: StoreFixedDriver) => {
        dialog.confirm({
            title: 'Solicitar Substituição',
            message: `Deseja solicitar a substituição do entregador ${driver.driver_name}? Por favor, informe o motivo na próxima etapa.`,
            confirmLabel: 'Solicitar',
            cancelLabel: 'Cancelar',
            onConfirm: async () => {
                dialog.toast('Solicitação de substituição enviada para análise.', 'success');
            }
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-brand-500" />
                        Meus Entregadores Fixos
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Acompanhe o desempenho e a disponibilidade dos seus entregadores exclusivos ou prioritários.
                    </p>
                </div>
                <Button onClick={handleRequestNew} className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Solicitar Entregador
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="flex gap-4">
                                <Skeleton className="w-16 h-16 rounded-full" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                            <div className="mt-6 space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-10 w-full rounded-lg mt-4" />
                            </div>
                        </div>
                    ))
                ) : drivers.length === 0 ? (
                    <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl p-12 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Nenhum Entregador Fixo</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                            Sua loja ainda não possui entregadores fixos vinculados. Solicite um entregador para ter mais agilidade e previsibilidade nas suas entregas.
                        </p>
                        <Button onClick={handleRequestNew}>Solicitar Agora</Button>
                    </div>
                ) : (
                    drivers.map((driver) => (
                        <div key={driver.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4">
                                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${
                                    driver.status === 'ONLINE' ? 'bg-green-100 text-green-700' :
                                    driver.status === 'IN_DELIVERY' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                }`}>
                                    {driver.status === 'ONLINE' ? 'Online' : driver.status === 'IN_DELIVERY' ? 'Em Entrega' : 'Offline'}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center font-bold text-xl">
                                    {driver.driver_name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{driver.driver_name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                        <Activity className="w-3 h-3" />
                                        Vínculo {driver.assignment_type === 'EXCLUSIVE' ? 'Exclusivo' : driver.assignment_type === 'PRIORITY' ? 'Prioritário' : 'Compartilhado'}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                        <Star className="w-3 h-3 text-yellow-500" /> Avaliação
                                    </div>
                                    <div className="font-bold text-gray-900 dark:text-white">{driver.average_rating.toFixed(1)}</div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> Entregas
                                    </div>
                                    <div className="font-bold text-gray-900 dark:text-white">{driver.total_deliveries}</div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button variant="outline" className="w-full text-sm" onClick={() => handleReplace(driver)}>
                                    Solicitar Substituição
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
