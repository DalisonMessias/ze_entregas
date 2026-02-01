
import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, Phone, Bike, Search, X } from 'lucide-react';
import { Loading } from './Loading';
import { Button } from './Button';
import { CustomInput } from './CustomInput';
import * as cloud from '../services/cloud';
import { StoreDeliveryPartner, ManagedUser, PartnerFeeSettings } from '../types';
import { Skeleton } from './Skeleton';
import { useDialog } from '../utils/dialogService'; // Import useDialog

import { StoreCollaborators } from './StoreCollaborators';
import { ProfileValidationAlert } from './ProfileValidationAlert';
import { validateStoreProfile } from '../utils/profileValidation';

const TeamSkeleton = () => (
    <div className="space-y-4">
        {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <Skeleton variant="circular" className="w-12 h-12" />
                    <div className="space-y-2">
                        <Skeleton variant="text" className="h-4 w-32" />
                        <Skeleton variant="text" className="h-3 w-24" />
                    </div>
                </div>
                <Skeleton variant="circular" className="w-8 h-8" />
            </div>
        ))}
    </div>
);

// ... existing imports

export const StoreTeam: React.FC = () => {
    const [tab, setTab] = useState<'partners' | 'collaborators'>('partners');

    // ... existing state ... 
    const [partners, setPartners] = useState<StoreDeliveryPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    // Add Partner States
    const [searchCode, setSearchCode] = useState('');
    const [foundPartner, setFoundPartner] = useState<ManagedUser | null>(null);
    const [searching, setSearching] = useState(false);
    const [associating, setAssociating] = useState(false);
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    const [profileValid, setProfileValid] = useState<boolean | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);

    const { alert, confirm } = useDialog();

    useEffect(() => {
        if (tab === 'partners') loadData();
    }, [tab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [p, f, profile] = await Promise.all([
                cloud.getStoreAssociatedPartners(),
                cloud.adminGetFeeSettings(),
                cloud.getMyPartnerProfile()
            ]);
            setPartners(p);
            setFees(f);

            // Validar perfil completo
            const validation = validateStoreProfile(profile);
            setProfileValid(validation.isValid);
            setMissingFields(validation.missingFields);
        } catch (e) {
            // console.error(e);
            setProfileValid(false);
            setMissingFields(['Erro ao carregar perfil']);
        } finally {
            setLoading(false);
        }
    };

    // ... handleSearch, handleAssociate, handleRemove ...
    const handleSearch = async () => {
        if (!searchCode || searchCode.length < 6) {
            await alert({ title: "Código Inválido", message: "Código inválido (mínimo 6 caracteres)." });
            return;
        }
        setSearching(true);
        setFoundPartner(null);
        try {
            const partner = await cloud.findPartnerByCode(searchCode);
            if (partner) {
                setFoundPartner(partner);
            } else {
                await alert({ title: "Entregador não encontrado", message: "Entregador não encontrado com este código." });
            }
        } catch (e) {
            // console.error(e);
            await alert({ title: "Erro na Busca", message: "Erro ao buscar." });
        } finally {
            setSearching(false);
        }
    };

    const handleAssociate = async () => {
        if (!foundPartner || !fees) return;

        const result = await confirm({
            title: "Confirmar Associação",
            message: `Confirmar associação? Será debitada uma taxa de R$ ${fees.association_fee?.toFixed(2)} da sua carteira.`,
            confirmButtonText: "Associar"
        });
        if (!result) return;

        setAssociating(true);
        try {
            await cloud.associatePartnerToStore(foundPartner.id, fees.association_fee || 0);
            await alert({ title: "Sucesso!", message: "Entregador associado com sucesso!" });
            setShowAddModal(false);
            setSearchCode('');
            setFoundPartner(null);
            loadData();
        } catch (e: any) {
            await alert({ title: "Erro na Associação", message: "Erro: " + e.message });
        } finally {
            setAssociating(false);
        }
    };

    const handleRemove = async (id: string) => {
        const result = await confirm({ title: "Confirmar Desvinculação", message: "Tem certeza que deseja desvincular este entregador?" });
        if (!result) return;
        try {
            await cloud.removePartnerAssociation(id);
            await alert({ title: "Sucesso!", message: "Entregador desvinculado." });
            loadData();
        } catch (e: any) {
            await alert({ title: "Erro ao Remover", message: "Erro ao remover: " + e.message });
        }
    };

    // Validação de perfil
    if (profileValid === false) {
        return (
            <ProfileValidationAlert
                onNavigateToSettings={() => window.location.href = '/loja/configuracoes'}
                missingFields={missingFields}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="mb-8">
                <div className="flex gap-8 border-b border-gray-100 dark:border-gray-800 mb-6">
                    <button
                        onClick={() => setTab('partners')}
                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${tab === 'partners' ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Entregadores
                        {tab === 'partners' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 animate-in fade-in zoom-in-x" />}
                    </button>
                    <button
                        onClick={() => setTab('collaborators')}
                        className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${tab === 'collaborators' ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Colaboradores
                        {tab === 'collaborators' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 animate-in fade-in zoom-in-x" />}
                    </button>
                </div>

                <div className="space-y-1">
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white tracking-tight">
                        {tab === 'partners' ? 'Logística e Entregas' : 'Equipe de Atendimento'}
                    </h2>
                    <p className="text-sm font-medium text-gray-400">
                        {tab === 'partners'
                            ? 'Gestão de entregadores associados para operações de delivery.'
                            : 'Gestão de garçons e equipe de produção para pedidos de mesa.'}
                    </p>
                </div>
            </div>

            {tab === 'partners' ? (
                <>
                    <div className="flex justify-between items-center">
                        <div />
                        <Button onClick={() => setShowAddModal(true)}>
                            <UserPlus className="w-4 h-4 mr-2" /> Associar Novo
                        </Button>
                    </div>

                    {loading ? (
                        <TeamSkeleton />
                    ) : partners.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium">Nenhum entregador associado.</p>
                            <p className="text-xs text-gray-400 mt-1">Clique em "Associar Novo" para começar.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {partners.map(p => (
                                <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                                            <Bike className="w-6 h-6 text-gray-500" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">{p.partner_name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                                <Phone className="w-3 h-3" /> {p.partner_phone}
                                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                {p.partner_vehicle}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleRemove(p.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full">
                                        <Trash2 className="w-4 h-4" />
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
                                    <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5" /></button>
                                </div>
                                <div className="flex gap-2">
                                    <CustomInput
                                        type="text"
                                        placeholder="Código do Entregador"
                                        value={searchCode}
                                        onChange={e => setSearchCode(e.target.value.toUpperCase())}
                                        className="flex-1 uppercase font-mono"
                                    />
                                    <Button onClick={handleSearch} disabled={searching} className="px-4">
                                        {searching ? <Loading variant="inline" size="sm" /> : <Search className="w-5 h-5" />}
                                    </Button>
                                </div>

                                {foundPartner && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 animate-in fade-in space-y-3">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                                <Bike className="w-6 h-6 text-blue-600" />
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
                                            {associating ? <Loading variant="inline" size="sm" /> : 'Confirmar Associação'}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <StoreCollaborators />
            )}
        </div>
    );
};
