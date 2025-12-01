
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Loader2, Trash2, Phone, Bike, Search, X } from 'lucide-react';
import { Button } from './Button';
import * as cloud from '../services/cloud';
import { StoreDeliveryPartner, ManagedUser, PartnerFeeSettings } from '../types';
import { Skeleton } from './Skeleton';

const TeamSkeleton = () => (
    <div className="space-y-4">
        {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <Skeleton variant="circular" className="w-12 h-12" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                <Skeleton variant="circular" className="w-8 h-8" />
            </div>
        ))}
    </div>
);

export const StoreTeam: React.FC = () => {
    const [partners, setPartners] = useState<StoreDeliveryPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    
    // Add Partner States
    const [searchCode, setSearchCode] = useState('');
    const [foundPartner, setFoundPartner] = useState<ManagedUser | null>(null);
    const [searching, setSearching] = useState(false);
    const [associating, setAssociating] = useState(false);
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [p, f] = await Promise.all([
                cloud.getStoreAssociatedPartners(),
                cloud.adminGetFeeSettings()
            ]);
            setPartners(p);
            setFees(f);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchCode || searchCode.length < 6) return alert("Código inválido (mínimo 6 caracteres).");
        setSearching(true);
        setFoundPartner(null);
        try {
            const partner = await cloud.findPartnerByCode(searchCode);
            if (partner) {
                setFoundPartner(partner);
            } else {
                alert("Entregador não encontrado com este código.");
            }
        } catch (e) {
            console.error(e);
            alert("Erro ao buscar.");
        } finally {
            setSearching(false);
        }
    };

    const handleAssociate = async () => {
        if (!foundPartner || !fees) return;
        
        if (!confirm(`Confirmar associação? Será debitada uma taxa de R$ ${fees.association_fee?.toFixed(2)} da sua carteira.`)) return;

        setAssociating(true);
        try {
            await cloud.associatePartnerToStore(foundPartner.id, fees.association_fee || 0);
            alert("Entregador associado com sucesso!");
            setShowAddModal(false);
            setSearchCode('');
            setFoundPartner(null);
            loadData();
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setAssociating(false);
        }
    };

    const handleRemove = async (id: string) => {
        if(!confirm("Tem certeza que deseja desvincular este entregador?")) return;
        try {
            await cloud.removePartnerAssociation(id);
            alert("Entregador desvinculado.");
            loadData();
        } catch (e: any) {
            alert("Erro ao remover: " + e.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-brand-600"/> Meus Entregadores
                </h1>
                <Button onClick={() => setShowAddModal(true)}>
                    <UserPlus className="w-4 h-4 mr-2"/> Associar Novo
                </Button>
            </div>

            {loading ? (
                <TeamSkeleton />
            ) : partners.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                    <p className="text-gray-400 font-medium">Nenhum entregador associado.</p>
                    <p className="text-xs text-gray-400 mt-1">Clique em "Associar Novo" para começar.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {partners.map(p => (
                        <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                    <Bike className="w-6 h-6 text-gray-500"/>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{p.partner_name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <Phone className="w-3 h-3"/> {p.partner_phone}
                                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                        {p.partner_vehicle}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => handleRemove(p.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full">
                                <Trash2 className="w-4 h-4"/>
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setShowAddModal(false)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg dark:text-white">Associar Entregador</h3>
                            <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5"/></button>
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Código do Entregador"
                                value={searchCode}
                                onChange={e => setSearchCode(e.target.value.toUpperCase())}
                                className="flex-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 outline-none focus:ring-2 focus:ring-brand-500 dark:text-white uppercase font-mono"
                            />
                            <Button onClick={handleSearch} disabled={searching} className="px-4">
                                {searching ? <Loader2 className="animate-spin w-5 h-5"/> : <Search className="w-5 h-5"/>}
                            </Button>
                        </div>

                        {foundPartner && (
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 animate-in fade-in space-y-3">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                        <Bike className="w-6 h-6 text-blue-600"/>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">{foundPartner.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{foundPartner.phone_number} • {foundPartner.vehicle_type}</p>
                                    </div>
                                </div>
                                 {fees?.association_fee && fees.association_fee > 0 && (
                                    <p className="text-xs text-center text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 p-2 rounded">
                                        Taxa de associação: <strong>R$ {fees.association_fee.toFixed(2)}</strong> (cobrado uma única vez do saldo da loja).
                                    </p>
                                )}
                                <Button fullWidth onClick={handleAssociate} disabled={associating}>
                                    {associating ? <Loader2 className="animate-spin"/> : 'Confirmar Associação'}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
