
import React, { useState, useEffect } from 'react';
import { Shield, Search, Edit2, UserX, Loader2, UserCheck, UserCog, CheckCircle, AlertTriangle, Power, PowerOff, X, MapPin, Phone, ShieldCheck, ShieldOff, Plus, Settings, Banknote, Star } from 'lucide-react';
import {
    getAllUsers,
    adminUpdateUserProfile,
    adminGetPendingPartners,
    adminGetPartnerDetails,
    adminUpdateDocumentStatus,
    adminUpdatePartnerStatus,
    adminGetCities,
    adminGetCityRequests,
    adminAddCity,
    adminUpdateCityStatus,
    adminEditCity,
    adminProcessCityRequest
} from '../services/cloud';
import { ManagedUser, UserRole, UserStatus, PartnerProfile, PartnerDocument, City, CityRequest, AdminSubTab, PartnerLevelBenefit } from '../types';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { useDialog } from '../utils/dialogService';
import { Switch } from './Switch';

// Imported Modules (from Common/HEAD)
import { AdminDashboard } from './AdminDashboard';
import { AdminWalletControl } from './AdminWalletControl';
import { AdminReferrals } from './AdminReferrals';
import { SecurityManagement } from './SecurityManagement';
import { AdminNotifications } from './AdminNotifications';
import { AdminShopManagement } from './AdminShopManagement';
import { SectionErrorBoundary } from './SectionErrorBoundary';
import { AdminClaims } from './AdminClaims';
import { AdminFees } from './AdminFees';
import { AdminPWASettings } from './AdminPWASettings';
import { AdminRatings } from './AdminRatings';
import { AdminBlacklist } from './AdminBlacklist';
import { AdminInstitutionalContent } from './AdminInstitutionalContent';
import { AdminPlatformNews } from './AdminPlatformNews';
import { AdminStoreFinance } from './AdminStoreFinance';
import { AdminInfinitePayConfig } from './AdminInfinitePayConfig';
import { AdminApiKeysUnified } from './AdminApiKeysUnified';
import { AdminAIConfig } from './AdminAIConfig';
import { AdminRoutingConfig } from './AdminRoutingConfig';
import { AdminPartnerLevels } from './AdminPartnerLevels';
import { AdminMaintenance } from './AdminMaintenance';
import { AdminLoanConfig } from './AdminLoanConfig';
import { AdminInvestments } from './AdminInvestments';
import { AdminSlides } from './AdminSlides';
import { AdminPayouts } from './AdminPayouts';
import { AdminTips } from './AdminTips';

// --- HELPERS ---
const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    let value = e.target.value.replace(/\D/g, "");
    if (!value) { setter(""); return; }
    const amount = Number(value) / 100;
    const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    setter(formatted);
};

const getRoleLabel = (role: string) => {
    const map: Record<string, string> = {
        'admin': 'Administrador',
        'store_partner': 'Lojista Parceiro',
        'delivery_partner': 'Entregador Parceiro',
        'delivery_person': 'Entregador (App)'
    };
    return map[role] || role;
};

const getRoleColor = (role: string) => {
    switch (role) {
        case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
        case 'store_partner': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
        case 'delivery_partner': return 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
        default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
};

const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        'active': 'Ativo',
        'banned': 'Banido',
        'pending': 'Pendente',
        'APPROVED': 'Verificado',
        'REJECTED': 'Rejeitado',
        'PENDING_REVIEW': 'Em Análise'
    };
    return map[status] || status;
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'active':
        case 'APPROVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        case 'banned':
        case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        case 'pending':
        case 'PENDING_REVIEW': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
};

// --- TOAST COMPONENT ---
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-24 right-4 z-[100] px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right-10 fade-in duration-300 border ${type === 'success' ? 'bg-white border-green-100 dark:bg-gray-800 dark:border-green-900' : 'bg-white border-red-100 dark:bg-gray-800 dark:border-red-900'}`}>
            <div className={`p-2 rounded-full ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
                <h4 className={`font-bold text-sm ${type === 'success' ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                    {type === 'success' ? 'Sucesso' : 'Erro'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>
            </div>
            <button onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
    );
};

// --- USER MANAGEMENT MODULE ---
const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Edit State
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        phone: '',
        cpf: '',
        city: '',
        email: '',
        role: '' as UserRole,
        status: '' as UserStatus,
        verification_status: '',
        partner_level: '',
        is_super_store: false
    });
    const [isSaving, setIsSaving] = useState(false);

    // Filter states
    const [roleFilter, setRoleFilter] = useState<string>('ALL');

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await getAllUsers();
            setUsers(data);
        } catch (e) {
            console.error(e);
            setToast({ type: 'error', message: 'Erro ao carregar usuários.' });
        } finally { setLoading(false); }
    };

    const handleEditClick = (user: ManagedUser) => {
        setSelectedUser(user);
        setEditForm({
            name: user.name || '',
            phone: user.phone_number || '',
            cpf: user.cpf || '',
            city: user.city || '',
            email: user.email || '',
            role: user.role,
            status: user.status,
            verification_status: user.verification_status || 'NOT_SUBMITTED',
            partner_level: user.partner_level || 'BRONZE',
            is_super_store: user.is_super_store || false
        });
    };

    const handleSaveUser = async () => {
        if (!selectedUser) return;
        setIsSaving(true);
        try {
            const rawPhone = (editForm.phone || '').replace(/\D/g, '');
            const rawCpf = (editForm.cpf || '').replace(/\D/g, '');

            const updates = {
                role: editForm.role,
                status: editForm.status,
                name: editForm.name,
                phone_number: rawPhone,
                cpf: rawCpf,
                city: editForm.city,
                verification_status: editForm.verification_status,
                partner_level: editForm.partner_level,
                is_super_store: editForm.is_super_store
            };

            await adminUpdateUserProfile(selectedUser.id, updates);
            setToast({ type: 'success', message: "Dados do usuário atualizados com sucesso!" });
            setSelectedUser(null);
            loadUsers();
        } catch (e: any) {
            setToast({ type: 'error', message: "Erro ao salvar: " + e.message });
        } finally {
            setIsSaving(false);
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (u.email || '').toLowerCase().includes(search.toLowerCase());
        const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-6 animate-in fade-in">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="relative flex-1 w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-brand-500 dark:text-white transition-all"
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1">
                    <button onClick={() => setRoleFilter('ALL')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${roleFilter === 'ALL' ? 'bg-brand-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Todos</button>
                    <button onClick={() => setRoleFilter('store_partner')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${roleFilter === 'store_partner' ? 'bg-brand-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Lojistas</button>
                    <button onClick={() => setRoleFilter('delivery_partner')} className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${roleFilter === 'delivery_partner' ? 'bg-brand-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Parceiros</button>
                </div>
            </div>

            {/* Users List (Cards) */}
            <div className="grid grid-cols-1 gap-3">
                {loading ? (
                    <div className="text-center p-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600" /></div>
                ) : filteredUsers.length === 0 ? (
                    <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-2xl text-gray-400 border border-dashed border-gray-200 dark:border-gray-700">
                        <UserX className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        Nenhum usuário encontrado.
                    </div>
                ) : (
                    filteredUsers.map(user => (
                        <div key={user.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-brand-200 dark:hover:border-brand-900 hover:shadow-md">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-600">
                                    <UserCheck className="w-6 h-6 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-900 dark:text-white truncate">{user.name || 'Sem Nome'}</h4>
                                        {user.is_super_store && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-yellow-200">SUPER</span>}
                                        {user.verification_status === 'APPROVED' && <ShieldCheck className="w-3 h-3 text-green-500" />}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                        {user.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {user.city}</span>}
                                        {user.phone_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.phone_number}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-row md:flex-col lg:flex-row items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gray-100 dark:border-gray-700 pt-3 md:pt-0">
                                <div className="flex gap-2">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getRoleColor(user.role)}`}>
                                        {getRoleLabel(user.role)}
                                    </span>
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getStatusColor(user.status)}`}>
                                        {getStatusLabel(user.status)}
                                    </span>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => handleEditClick(user)} className="whitespace-nowrap h-8 text-xs">
                                    <Edit2 className="w-3 h-3 mr-1.5" /> Editar
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Edit Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setSelectedUser(null)}>
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                            <div>
                                <h3 className="font-black text-xl dark:text-white flex items-center gap-2">
                                    <UserCog className="w-6 h-6 text-brand-600" /> Editar Usuário
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">ID: {selectedUser.id}</p>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-white"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="overflow-y-auto pr-2 custom-scrollbar space-y-5">
                            {/* Personal Info */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Dados Pessoais</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Email (Apenas visualização)</label>
                                        <input type="text" value={editForm.email} disabled className="w-full p-3 bg-gray-100 dark:bg-gray-700/50 border-none rounded-xl text-gray-500 cursor-not-allowed" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Telefone</label>
                                        <input
                                            type="text"
                                            value={editForm.phone}
                                            onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">CPF</label>
                                        <input
                                            type="text"
                                            value={editForm.cpf}
                                            onChange={e => setEditForm(prev => ({ ...prev, cpf: e.target.value }))}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Cidade</label>
                                        <input
                                            type="text"
                                            value={editForm.city}
                                            onChange={e => setEditForm(prev => ({ ...prev, city: e.target.value }))}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* System Info */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Dados do Sistema</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Função</label>
                                        <CustomSelect
                                            value={editForm.role}
                                            onChange={val => setEditForm(prev => ({ ...prev, role: val as UserRole }))}
                                            options={[
                                                { label: 'Administrador', value: 'admin' },
                                                { label: 'Lojista Parceiro', value: 'store_partner' },
                                                { label: 'Entregador Parceiro', value: 'delivery_partner' },
                                                { label: 'Entregador (App)', value: 'delivery_person' }
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Status da Conta</label>
                                        <CustomSelect
                                            value={editForm.status}
                                            onChange={val => setEditForm(prev => ({ ...prev, status: val as UserStatus }))}
                                            options={[
                                                { label: 'Ativo', value: 'active' },
                                                { label: 'Banido', value: 'banned' },
                                                { label: 'Pendente', value: 'pending' }
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Status Verificação</label>
                                        <CustomSelect
                                            value={editForm.verification_status}
                                            onChange={val => setEditForm(prev => ({ ...prev, verification_status: val }))}
                                            options={[
                                                { label: 'Não Enviado', value: 'NOT_SUBMITTED' },
                                                { label: 'Em Análise', value: 'PENDING_REVIEW' },
                                                { label: 'Aprovado', value: 'APPROVED' },
                                                { label: 'Rejeitado', value: 'REJECTED' }
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Nível de Parceiro</label>
                                        <CustomSelect
                                            value={editForm.partner_level}
                                            onChange={val => setEditForm(prev => ({ ...prev, partner_level: val }))}
                                            options={[
                                                { label: 'BRONZE', value: 'BRONZE' },
                                                { label: 'SILVER', value: 'SILVER' },
                                                { label: 'GOLD', value: 'GOLD' },
                                                { label: 'PLATINUM', value: 'PLATINUM' },
                                                { label: 'DIAMOND', value: 'DIAMOND' }
                                            ]}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Super Lojista</label>
                                        <Switch
                                            checked={editForm.is_super_store}
                                            onChange={val => setEditForm(prev => ({ ...prev, is_super_store: val }))}
                                            label="Ativar Super Lojista"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex-shrink-0">
                            <Button fullWidth onClick={handleSaveUser} disabled={isSaving}>
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- PARTNER VERIFICATION MODULE ---
const PartnerVerification: React.FC = () => {
    const [partners, setPartners] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState<ManagedUser | null>(null);
    const [partnerDetails, setPartnerDetails] = useState<{ profile: PartnerProfile, documents: PartnerDocument[] } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const { prompt, confirm: dialogConfirm } = useDialog();

    useEffect(() => {
        loadPendingPartners();
    }, []);

    const loadPendingPartners = async () => {
        setLoading(true);
        try {
            const data = await adminGetPendingPartners();
            setPartners(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openPartnerDetails = async (partner: ManagedUser) => {
        setSelectedPartner(partner);
        setDetailLoading(true);
        try {
            const details = await adminGetPartnerDetails(partner.id);
            setPartnerDetails(details);
        } catch (e) { console.error(e); } finally { setDetailLoading(false); }
    };

    const handleUpdateDocStatus = async (docId: string, status: 'APPROVED' | 'REJECTED') => {
        let notes = '';
        if (status === 'REJECTED') {
            const result = await prompt({ title: 'Motivo da rejeição', message: 'Motivo da rejeição (opcional):', placeholder: '' });
            if (result === null) return; // User cancelled prompt
            notes = result;
        }

        try {
            await adminUpdateDocumentStatus(docId, status, notes || '');
            // Refresh details
            if (selectedPartner) openPartnerDetails(selectedPartner);
            setToast({ type: 'success', message: "Documento atualizado!" });
        } catch (e: any) { setToast({ type: 'error', message: "Erro: " + e.message }); }
    };

    const handleUpdatePartnerStatus = async (userId: string, status: 'APPROVED' | 'REJECTED' | 'BLOCKED') => {
        const ok = await dialogConfirm({ title: 'Confirmar alteração', message: `Tem certeza que deseja alterar o status deste parceiro para ${status}?` });
        if (!ok) return;
        try {
            await adminUpdatePartnerStatus(userId, status);
            setToast({ type: 'success', message: "Status do parceiro atualizado!" });
            if (selectedPartner) openPartnerDetails(selectedPartner); // Refresh
            loadPendingPartners(); // Refresh list in case status changes
        } catch (e: any) { setToast({ type: 'error', message: "Erro: " + e.message }); }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                        <tr>
                            <th className="px-4 py-3">Parceiro</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Data</th>
                            <th className="px-4 py-3"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && <tr><td colSpan={4} className="text-center p-6"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>}
                        {!loading && partners.map(p => (
                            <tr key={p.id} className="border-b dark:border-gray-700">
                                <td className="px-4 py-3 font-bold dark:text-white">{p.name || p.email}</td>
                                <td className="px-4 py-3"><span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">{p.verification_status}</span></td>
                                <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3 text-right"><Button onClick={() => openPartnerDetails(p)} className="py-1 px-3 text-xs">Analisar</Button></td>
                            </tr>
                        ))}
                        {!loading && partners.length === 0 && <tr><td colSpan={4} className="text-center p-6 text-gray-500">Nenhum parceiro pendente.</td></tr>}
                    </tbody>
                </table>
            </div>
            {selectedPartner && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSelectedPartner(null)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl max-h-[90vh] rounded-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                            <h3 className="font-bold dark:text-white">Análise: {selectedPartner.name}</h3>
                            <button onClick={() => setSelectedPartner(null)}><X /></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            {detailLoading ? <Loader2 className="animate-spin mx-auto" /> : (
                                <>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2">
                                        <p><strong>Veículo:</strong> {partnerDetails?.profile.vehicle_type}</p>
                                        <p><strong>Placa:</strong> {partnerDetails?.profile.vehicle_plate || 'N/A'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleUpdatePartnerStatus(selectedPartner.id, 'APPROVED')} variant="success"><ShieldCheck className="w-4 h-4 mr-2" /> Aprovar Cadastro</Button>
                                        <Button onClick={() => handleUpdatePartnerStatus(selectedPartner.id, 'BLOCKED')} variant="danger"><ShieldOff className="w-4 h-4 mr-2" /> Bloquear Parceiro</Button>
                                    </div>
                                    {partnerDetails?.documents.map(doc => (
                                        <div key={doc.id} className="p-3 border dark:border-gray-700 rounded-lg flex items-center justify-between">
                                            <div>
                                                <p className="font-bold text-sm dark:text-white">{doc.document_type}</p>
                                                <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline">Ver anexo</a>
                                                {doc.admin_notes && <p className="text-xs text-red-500 italic">Obs: {doc.admin_notes}</p>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${doc.status === 'APPROVED' ? 'bg-green-100 text-green-600' : doc.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{doc.status}</span>
                                                <button onClick={() => handleUpdateDocStatus(doc.id, 'APPROVED')} className="p-2 bg-green-100 hover:bg-green-200 rounded"><CheckCircle className="w-4 h-4 text-green-600" /></button>
                                                <button onClick={() => handleUpdateDocStatus(doc.id, 'REJECTED')} className="p-2 bg-red-100 hover:bg-red-200 rounded"><X className="w-4 h-4 text-red-600" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- CITY MANAGEMENT MODULE ---
const CityManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'cities' | 'requests'>('cities');
    const [cities, setCities] = useState<City[]>([]);
    const [requests, setRequests] = useState<CityRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Add City Form
    const [newName, setNewName] = useState('');
    const [newState, setNewState] = useState('');

    // Edit City Modal
    const [editingCity, setEditingCity] = useState<City | null>(null);
    const [editName, setEditName] = useState('');
    const [editState, setEditState] = useState('');
    const { confirm: dialogConfirm } = useDialog();

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'cities') {
                const data = await adminGetCities();
                setCities(data);
            } else {
                const data = await adminGetCityRequests();
                setRequests(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCity = async () => {
        if (!newName || !newState) return setToast({ type: 'error', message: "Preencha nome e estado." });
        try {
            await adminAddCity(newName, newState);
            setNewName('');
            setNewState('');
            loadData();
            setToast({ type: 'success', message: "Cidade adicionada com sucesso!" });
        } catch (e: any) {
            setToast({ type: 'error', message: "Erro: " + e.message });
        }
    };

    const handleToggleStatus = async (city: City) => {
        const action = city.is_active ? "desativar" : "ativar";
        const ok = await dialogConfirm({ title: 'Confirmar ação', message: `Tem certeza que deseja ${action} a cidade ${city.name}?` });
        if (!ok) return;
        try {
            await adminUpdateCityStatus(city.id, !city.is_active);
            loadData();
            setToast({ type: 'success', message: `Cidade ${action === 'ativar' ? 'ativada' : 'desativada'}!` });
        } catch (e: any) {
            setToast({ type: 'error', message: "Erro: " + e.message });
        }
    };

    const openEditModal = (city: City) => {
        setEditingCity(city);
        setEditName(city.name);
        setEditState(city.state);
    };

    const handleSaveChanges = async () => {
        if (!editingCity || !editName || !editState) return;
        try {
            await adminEditCity(editingCity.id, editName, editState);
            setEditingCity(null);
            loadData();
            setToast({ type: 'success', message: "Cidade editada com sucesso!" });
        } catch (e: any) {
            setToast({ type: 'error', message: "Erro ao editar: " + e.message });
        }
    };

    const handleProcessRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            await adminProcessCityRequest(id, status);
            loadData();
            setToast({ type: 'success', message: `Solicitação ${status === 'APPROVED' ? 'aprovada' : 'rejeitada'}!` });
        } catch (e: any) {
            setToast({ type: 'error', message: "Erro: " + e.message });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4 w-fit">
                <button onClick={() => setActiveTab('cities')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'cities' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Cidades Ativas</button>
                <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'requests' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Solicitações</button>
            </div>

            {activeTab === 'cities' && (
                <div className="space-y-6">
                    {/* Add Form */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-3 items-center">
                        <input type="text" placeholder="Cidade" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <input type="text" placeholder="UF" maxLength={2} value={newState} onChange={e => setNewState(e.target.value.toUpperCase())} className="w-20 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <Button onClick={handleAddCity} className="whitespace-nowrap px-4">
                            <Plus className="w-4 h-4 mr-2" /> Adicionar
                        </Button>
                    </div>

                    {/* List */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3">Nome</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cities.map(city => (
                                    <tr key={city.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <td className="px-4 py-3 font-bold dark:text-white">{city.name}</td>
                                        <td className="px-4 py-3">{city.state}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${city.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>
                                                {city.is_active ? 'Ativa' : 'Inativa'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <Button size="sm" variant="outline" onClick={() => openEditModal(city)}><Edit2 className="w-3 h-3" /></Button>
                                            <Button size="sm" variant={city.is_active ? 'danger' : 'success'} onClick={() => handleToggleStatus(city)}>
                                                {city.is_active ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                            <tr>
                                <th className="px-4 py-3">Cidade</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3">Solicitante</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {requests.length === 0 && <tr><td colSpan={5} className="text-center p-6 text-gray-400">Nenhuma solicitação pendente.</td></tr>}
                            {requests.map(req => (
                                <tr key={req.id} className="border-b border-gray-100 dark:border-gray-700">
                                    <td className="px-4 py-3 font-bold dark:text-white">{req.city_name}</td>
                                    <td className="px-4 py-3">{req.state}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500">{req.user_email}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' : req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {req.status === 'PENDING' && (
                                            <div className="flex justify-end gap-2">
                                                <Button size="sm" variant="success" onClick={() => handleProcessRequest(req.id, 'APPROVED')}>Aprovar</Button>
                                                <Button size="sm" variant="danger" onClick={() => handleProcessRequest(req.id, 'REJECTED')}>Rejeitar</Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editingCity && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4">
                        <h3 className="font-bold text-lg dark:text-white">Editar Cidade</h3>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="Nome" />
                        <input type="text" value={editState} onChange={e => setEditState(e.target.value.toUpperCase())} maxLength={2} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" placeholder="UF" />
                        <div className="flex gap-2 justify-end mt-4">
                            <Button variant="outline" onClick={() => setEditingCity(null)}>Cancelar</Button>
                            <Button onClick={handleSaveChanges}>Salvar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};



interface AdminPanelProps {
    activeSubTab: AdminSubTab;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ activeSubTab }) => {
    const renderContent = () => {
        switch (activeSubTab) {
            case 'dashboard': return <AdminDashboard />;
            case 'users': return <UserManagement />;
            case 'validation': return <PartnerVerification />;
            case 'notifications': return <AdminNotifications />;
            case 'shop': return <AdminShopManagement />;
            case 'support': return <AdminClaims />;
            case 'claims': return <AdminClaims />;
            case 'ai_config': return <AdminAIConfig />;
            case 'api_keys': return <AdminApiKeysUnified />;
            case 'infinitepay': return <AdminInfinitePayConfig />;
            case 'fees': return <AdminFees />;
            case 'pwa': return <AdminPWASettings />;
            case 'routing': return <AdminRoutingConfig />;
            case 'cities': return <CityManagement />;
            case 'ratings': return <AdminRatings />;
            case 'security': return <SecurityManagement />;
            case 'blacklist': return <AdminBlacklist />;
            case 'referrals': return <AdminReferrals />;
            case 'institutional': return <AdminInstitutionalContent />;
            case 'platform_news': return <AdminPlatformNews />;
            case 'store_finance': return <AdminStoreFinance />;
            case 'wallet_control': return <AdminWalletControl />;
            case 'maintenance': return <AdminMaintenance />;
            case 'levels': return <AdminPartnerLevels />;
            case 'payouts': return <AdminPayouts />;
            case 'loan_config': return <AdminLoanConfig />;
            case 'investments': return <AdminInvestments />;
            case 'slides': return <AdminSlides />;
            case 'tips': return <AdminTips />;

            default: return <div className="p-10 text-center text-gray-500">Selecione uma opção no menu.</div>;
        }
    };

    return (
        <SectionErrorBoundary key={activeSubTab} componentName={`Admin - ${activeSubTab}`}>
            {renderContent()}
        </SectionErrorBoundary>
    );
};
