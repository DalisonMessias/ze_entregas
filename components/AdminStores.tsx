
import React, { useState, useEffect } from 'react';
import {
    Search, Store, Settings, Shield, UserX, UserCheck,
    AlertTriangle, Loader2, X, Edit2, History, Info,
    MapPin, Phone, Mail, FileText, ExternalLink, Calendar
} from 'lucide-react';
import { adminGetStores, adminUpdateStoreStatus, adminGetStatusHistory } from '../services/cloud';
import { ManagedUser } from '../types';
import { Button } from './Button';
import { useDialog } from '../utils/dialogService';
// import { ProductImportExport } from './ProductImportExport'; // Substituído pelo Manager Completo
import { StoreProductManager } from './StoreProductManager';
import { StoreEditModal } from './StoreEditModal';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        case 'blocked': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        case 'suspended': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        case 'pending': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
};

const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        'active': 'Ativa',
        'blocked': 'Bloqueada',
        'suspended': 'Suspensa',
        'pending': 'Pendente',
        'banned': 'Banida'
    };
    return map[status] || status;
};

export const AdminStores: React.FC = () => {
    const [stores, setStores] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedStore, setSelectedStore] = useState<ManagedUser | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    const [nextStatus, setNextStatus] = useState<string>('');
    const [statusReason, setStatusReason] = useState('');
    const [statusHistory, setStatusHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isProductManagerOpen, setIsProductManagerOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const { confirm, alert } = useDialog();

    useEffect(() => {
        loadStores();
    }, []);

    const loadStores = async () => {
        setLoading(true);
        try {
            const data = await adminGetStores();
            setStores(data);
        } catch (error) {
            console.error('Error loading stores:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!selectedStore || !nextStatus || !statusReason.trim()) {
            void alert({ title: 'Atenção', message: 'Por favor, informe o motivo da alteração.' });
            return;
        }

        const ok = await confirm({
            title: 'Confirmar Alteração',
            message: `Deseja realmente alterar o status da loja "${selectedStore.name}" para ${getStatusLabel(nextStatus)}?`
        });

        if (!ok) return;

        try {
            const result = await adminUpdateStoreStatus(
                selectedStore.id,
                selectedStore.status,
                nextStatus,
                statusReason
            );

            if (result.success) {
                setStores(prev => prev.map(s => s.id === selectedStore.id ? { ...s, status: nextStatus as any } : s));
                setIsStatusModalOpen(false);
                setStatusReason('');
                void alert({ title: 'Sucesso', message: 'Status atualizado com sucesso!' });

                // Refresh details if open
                if (selectedStore) {
                    setSelectedStore({ ...selectedStore, status: nextStatus as any });
                }
            } else {
                void alert({ title: 'Erro', message: 'Não foi possível atualizar o status.' });
            }
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const openDetails = async (store: ManagedUser) => {
        setSelectedStore(store);
        setIsDetailsOpen(true);
        setLoadingHistory(true);
        try {
            const history = await adminGetStatusHistory(store.id);
            setStatusHistory(history);
        } catch (error) {
            console.error('Error loading history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const filteredStores = stores.filter(s =>
        (s.name?.toLowerCase().includes(search.toLowerCase())) ||
        (s.id.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header com Busca */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <Store className="w-8 h-8 text-brand-600" />
                        Gerenciamento de Lojas
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">Controle e auditoria de parceiros lojistas.</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou ID..."
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700/50 border-none rounded-2xl focus:ring-2 focus:ring-brand-500 transition-all dark:text-white"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Lista de Lojas */}
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
                    <p className="text-gray-500 font-bold">Carregando lojas...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredStores.map(store => (
                        <div
                            key={store.id}
                            className="group bg-white dark:bg-gray-800 rounded-[32px] p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden"
                            onClick={() => openDetails(store)}
                        >
                            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-3xl opacity-10 transition-colors ${store.status === 'active' ? 'bg-green-500' :
                                store.status === 'blocked' ? 'bg-red-500' : 'bg-yellow-500'
                                }`} />

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-2xl text-brand-600">
                                    <Store className="w-6 h-6" />
                                </div>
                                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${getStatusColor(store.status)}`}>
                                    {getStatusLabel(store.status)}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 line-clamp-1">{store.name || 'Sem Nome'}</h3>
                            <p className="text-gray-400 text-xs font-mono mb-4">ID: {store.id}</p>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <MapPin className="w-4 h-4" />
                                    <span>{store.city || 'Cidade não informada'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                    <Calendar className="w-4 h-4" />
                                    <span>Desde: {new Date(store.created_at).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="flex gap-2 relative z-10">
                                <Button
                                    fullWidth
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDetails(store);
                                    }}
                                    className="rounded-2xl py-3 text-xs font-bold"
                                >
                                    <Info className="w-4 h-4 mr-2" /> Detalhes
                                </Button>
                                <Button
                                    fullWidth
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedStore(store);
                                        setNextStatus(store.status === 'active' ? 'suspended' : 'active');
                                        setIsStatusModalOpen(true);
                                    }}
                                    className={`rounded-2xl py-3 text-xs font-bold ${store.status === 'active' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                >
                                    {store.status === 'active' ? <Shield className="w-4 h-4 mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
                                    {store.status === 'active' ? 'Suspender' : 'Reativar'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filteredStores.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-[32px] border-2 border-dashed border-gray-100 dark:border-gray-700">
                    <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-full mb-4">
                        <Search className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Nenhuma loja encontrada</h3>
                    <p className="text-gray-500 font-medium">Tente ajustar sua busca.</p>
                </div>
            )}

            {/* Modal de Detalhes */}
            {isDetailsOpen && selectedStore && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-[#f8fafc] dark:bg-gray-950 w-full max-w-4xl max-h-[90vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative border border-white/20 dark:border-gray-800">

                        {/* Modal Header */}
                        <div className="p-8 pb-4 flex justify-between items-start bg-white dark:bg-gray-900 border-b dark:border-gray-800">
                            <div className="flex items-center gap-6">
                                <div className="p-5 bg-brand-50 dark:bg-brand-900/30 rounded-3xl text-brand-600">
                                    <Store className="w-10 h-10" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-3xl font-black text-gray-900 dark:text-white">{selectedStore.name}</h2>
                                        <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${getStatusColor(selectedStore.status)}`}>
                                            {getStatusLabel(selectedStore.status)}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-sm font-mono">ID: {selectedStore.id}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsDetailsOpen(false)}
                                className="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">

                            {/* Actions Quick Access */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setNextStatus('active');
                                        setIsStatusModalOpen(true);
                                    }}
                                    disabled={selectedStore.status === 'active'}
                                    className="flex flex-col gap-2 py-6 rounded-3xl border-2 border-green-500/20 hover:bg-green-50 dark:hover:bg-green-900/10 text-green-600 h-auto"
                                >
                                    <UserCheck className="w-6 h-6" />
                                    <span className="font-bold">Ativar</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setNextStatus('suspended');
                                        setIsStatusModalOpen(true);
                                    }}
                                    disabled={selectedStore.status === 'suspended'}
                                    className="flex flex-col gap-2 py-6 rounded-3xl border-2 border-yellow-500/20 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 text-yellow-600 h-auto"
                                >
                                    <Shield className="w-6 h-6" />
                                    <span className="font-bold">Suspender</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setNextStatus('blocked');
                                        setIsStatusModalOpen(true);
                                    }}
                                    disabled={selectedStore.status === 'blocked'}
                                    className="flex flex-col gap-2 py-6 rounded-3xl border-2 border-red-500/20 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 h-auto"
                                >
                                    <UserX className="w-6 h-6" />
                                    <span className="font-bold">Bloquear</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="flex flex-col gap-2 py-6 rounded-3xl border-2 border-gray-500/20 hover:bg-gray-50 dark:hover:bg-gray-900/10 text-gray-600 h-auto"
                                >
                                    <Edit2 className="w-6 h-6" />
                                    <span className="font-bold">Editar Dados</span>
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Información Básica */}
                                <div className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800">
                                    <h4 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-brand-500" />
                                        Informações da Loja
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800">
                                            <span className="text-gray-500 font-bold text-sm">Responsável</span>
                                            <span className="font-black dark:text-white">{selectedStore.name}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800">
                                            <span className="text-gray-500 font-bold text-sm">Telefone</span>
                                            <span className="font-black dark:text-white flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-brand-600" />
                                                {selectedStore.phone_number || 'N/A'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800">
                                            <span className="text-gray-500 font-bold text-sm">Email</span>
                                            <span className="font-black dark:text-white flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-brand-600" />
                                                {selectedStore.email}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800">
                                            <span className="text-gray-500 font-bold text-sm">Documento (CPF/CNPJ)</span>
                                            <span className="font-black dark:text-white">{selectedStore.cpf || selectedStore.store_document || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3">
                                            <span className="text-gray-500 font-bold text-sm">Cidade/UF</span>
                                            <span className="font-black dark:text-white">{selectedStore.city || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Configurações e Finanças */}
                                <div className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800">
                                    <h4 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                        <Settings className="w-5 h-5 text-brand-500" />
                                        Status e Finanças
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800">
                                            <span className="text-gray-500 font-bold text-sm">Saldo em Carteira</span>
                                            <span className="text-xl font-black text-green-600">R$ {(selectedStore.balance || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800">
                                            <span className="text-gray-500 font-bold text-sm">Tempo Prep. (min)</span>
                                            <span className="font-black dark:text-white">{selectedStore.preparation_time_min || 15} - {selectedStore.preparation_time_max || 30}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-3 border-b border-gray-50 dark:border-gray-800">
                                            <span className="text-gray-500 font-bold text-sm">Super Loja</span>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedStore.is_super_store ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
                                                {selectedStore.is_super_store ? 'ATIVADO' : 'DESATIVADO'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-3">
                                            <span className="text-gray-500 font-bold text-sm">Catálogo de Produtos</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-brand-600 font-black hover:bg-brand-50"
                                                onClick={() => setIsProductManagerOpen(true)}
                                            >
                                                <ExternalLink className="w-4 h-4 mr-2" /> Gerenciar Catálogo
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Histórico de Status */}
                            <div className="bg-white dark:bg-gray-900 p-8 rounded-[32px] border border-gray-100 dark:border-gray-800">
                                <h4 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                                    <History className="w-5 h-5 text-brand-500" />
                                    Logs de Segurança e Status
                                </h4>

                                {loadingHistory ? (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="animate-spin text-brand-600" />
                                    </div>
                                ) : statusHistory.length === 0 ? (
                                    <p className="text-center py-10 text-gray-500 font-bold italic">Sem histórico de alterações registrado.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {statusHistory.map(log => (
                                            <div key={log.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50 flex flex-col md:flex-row gap-4 items-start justify-between">
                                                <div className="flex gap-4">
                                                    <div className={`p-3 rounded-2xl mt-1 ${getStatusColor(log.new_status)}`}>
                                                        <Shield className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-black text-sm dark:text-white uppercase tracking-tighter line-through opacity-40">{getStatusLabel(log.old_status)}</span>
                                                            <span className="text-gray-400">→</span>
                                                            <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${getStatusColor(log.new_status)}`}>{getStatusLabel(log.new_status)}</span>
                                                        </div>
                                                        <p className="text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">"{log.reason}"</p>
                                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                                            <span className="flex items-center gap-1">
                                                                <FileText className="w-3 h-3" />
                                                                Admin: {log.admin?.name || 'Sistema'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-xs text-gray-400 font-mono">{new Date(log.created_at).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Gerenciamento de Produtos (Manager) */}
            {isProductManagerOpen && selectedStore && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
                    <div className="bg-[#f8fafc] dark:bg-gray-950 w-full max-w-6xl max-h-[95vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative border border-white/20 dark:border-gray-800">
                        <div className="p-6 border-b flex justify-between items-center bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white">Catálogo da Loja</h3>
                                <p className="text-sm text-gray-500">{selectedStore.name}</p>
                            </div>
                            <button onClick={() => setIsProductManagerOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 bg-gray-50 dark:bg-gray-900/50">
                            <StoreProductManager targetStoreId={selectedStore.id} storeName={selectedStore.name} />
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Edição de Loja */}
            {isEditModalOpen && selectedStore && (
                <StoreEditModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    store={selectedStore}
                    onSave={() => {
                        loadStores(); // Recarrega lista
                        // Atualiza selecionado localmente se necessário, ou deixa o loadStores cuidar
                        // O ideal é atualizar o selectedStore também para refletir imediatamento no modal de fundo
                    }}
                />
            )}

            {/* Modal de Alteração de Status */}
            {isStatusModalOpen && selectedStore && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-white dark:bg-gray-900 w-full max-w-md p-8 rounded-[40px] shadow-2xl space-y-6">
                        <div className="text-center">
                            <div className={`mx-auto w-20 h-20 rounded-3xl mb-6 flex items-center justify-center ${getStatusColor(nextStatus)}`}>
                                <AlertTriangle className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Alterar Status</h3>
                            <p className="text-gray-500 font-medium">
                                Você está alterando o status de <strong className="text-brand-600">{selectedStore.name}</strong> para <strong className="text-brand-600 uppercase">{getStatusLabel(nextStatus)}</strong>.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest pl-2">Motivo da Alteração *</label>
                            <textarea
                                value={statusReason}
                                onChange={e => setStatusReason(e.target.value)}
                                className="w-full p-5 bg-gray-50 dark:bg-gray-800 border-2 border-transparent focus:border-brand-500 rounded-3xl min-h-[120px] dark:text-white font-bold transition-all outline-none"
                                placeholder="Descreva detalhadamente o motivo..."
                                required
                            />
                            <p className="text-[10px] text-gray-400 font-bold px-2">Este motivo ficará registrado para auditoria e será visível no log de segurança.</p>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                fullWidth
                                variant="outline"
                                onClick={() => setIsStatusModalOpen(false)}
                                className="py-4 border-2 rounded-2xl font-bold"
                            >
                                Cancelar
                            </Button>
                            <Button
                                fullWidth
                                onClick={handleUpdateStatus}
                                disabled={!statusReason.trim()}
                                className={`py-4 rounded-2xl font-black shadow-lg ${nextStatus === 'blocked' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30' :
                                    nextStatus === 'suspended' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30' : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'
                                    }`}
                            >
                                Confirmar Alteração
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
