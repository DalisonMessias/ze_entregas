
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Search, MoreVertical, Edit, UserX, Trash2, Loader2, UserCheck, UserCog, Send, ListOrdered, Settings, Package, Power, PowerOff, X, CheckCircle, AlertTriangle, CreditCard, QrCode, Barcode, Plus, Grid, Tag, Headphones, MessageSquare, Phone, Key, Bot, Wallet, Smartphone, Upload, RefreshCw, Banknote, MapPin, Link2, FileCheck, FileX, ShieldCheck, ShieldOff, Star, FileText, Newspaper, Globe, Palette, User, Filter } from 'lucide-react';
import * as cloud from '../services/cloud';
import { ManagedUser, UserRole, UserStatus, GlobalNotification, Product, AdminOrder, ShopSettings, Category, Claim, PartnerFeeSettings, PWASettings, PWAIcon, PayoutSettings, City, CityRequest, PartnerDocument, PartnerProfile, PartnerLevelBenefit, BlacklistEntry, IdentityVerification, FraudAlert, PlatformNews, PartnerRating } from '../types';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { AsaasWebhookManagement } from './AsaasWebhookManagement';
import { AdminDashboard } from './AdminDashboard';
import { AdminWalletControl } from './AdminWalletControl';
import { AdminReferrals } from './AdminReferrals';
import { Switch } from './Switch';

// --- HELPERS ---
const handleCurrencyMask = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
  let value = e.target.value.replace(/\D/g, "");
  if (!value) { setter(""); return; }
  const amount = Number(value) / 100;
  const formatted = amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  setter(formatted);
};

const parseCurrency = (val: string): number => {
    if (!val) return 0;
    return parseFloat(val.replace(/\./g, '').replace(',', '.'));
};

// Tradução de Enums para UI
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
    switch(role) {
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
    switch(status) {
        case 'active':
        case 'APPROVED': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
        case 'banned': 
        case 'REJECTED': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
        case 'pending':
        case 'PENDING_REVIEW': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
        default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
};

// --- USER MANAGEMENT MODULE ---
const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
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
            const data = await cloud.getAllUsers();
            setUsers(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
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
            // Mapeamento correto para as colunas do banco de dados (user_profiles)
            const updates = {
                role: editForm.role,
                status: editForm.status,
                name: editForm.name,
                phone_number: editForm.phone,
                cpf: editForm.cpf,
                city: editForm.city,
                verification_status: editForm.verification_status,
                partner_level: editForm.partner_level,
                is_super_store: editForm.is_super_store
                // Email geralmente não se altera aqui pois está ligado ao Auth, mas poderia ser adicionado se necessário
            };

            await cloud.adminUpdateUserProfile(selectedUser.id, updates);
            alert("Dados do usuário atualizados com sucesso!");
            setSelectedUser(null);
            loadUsers();
        } catch (e: any) { 
            alert("Erro ao salvar: " + e.message); 
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
                    <div className="text-center p-10"><Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600"/></div>
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
                                    {user.avatar_url ? (
                                        <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-6 h-6 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-gray-900 dark:text-white truncate">{user.name || 'Sem Nome'}</h4>
                                        {user.is_super_store && <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded font-bold border border-yellow-200">SUPER</span>}
                                        {user.verification_status === 'APPROVED' && <ShieldCheck className="w-3 h-3 text-green-500" />}
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                        {user.city && <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {user.city}</span>}
                                        {user.phone_number && <span className="flex items-center gap-1"><Phone className="w-3 h-3"/> {user.phone_number}</span>}
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
                                    <Edit className="w-3 h-3 mr-1.5" /> Editar
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
                                    <UserCog className="w-6 h-6 text-brand-600"/> Editar Usuário
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">ID: {selectedUser.id}</p>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500 hover:text-gray-700 dark:hover:text-white"><X className="w-5 h-5"/></button>
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
                                            onChange={e => setEditForm(prev => ({...prev, name: e.target.value}))}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Email (Apenas visualização)</label>
                                        <input 
                                            type="text" 
                                            value={editForm.email} 
                                            disabled
                                            className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-transparent rounded-xl text-sm text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Telefone</label>
                                        <input 
                                            type="text" 
                                            value={editForm.phone} 
                                            onChange={e => setEditForm(prev => ({...prev, phone: e.target.value}))}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">CPF</label>
                                        <input 
                                            type="text" 
                                            value={editForm.cpf} 
                                            onChange={e => setEditForm(prev => ({...prev, cpf: e.target.value}))}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">Cidade</label>
                                        <input 
                                            type="text" 
                                            value={editForm.city} 
                                            onChange={e => setEditForm(prev => ({...prev, city: e.target.value}))}
                                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
                                            placeholder="Ex: São Paulo - SP"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* System Settings */}
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Permissões e Acesso</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <CustomSelect 
                                            label="Função no Sistema (Role)" 
                                            value={editForm.role} 
                                            onChange={val => setEditForm(prev => ({...prev, role: val as UserRole}))} 
                                            options={[
                                                {label: 'Administrador', value: 'admin'}, 
                                                {label: 'Lojista Parceiro', value: 'store_partner'}, 
                                                {label: 'Entregador Parceiro (Moto/Carro)', value: 'delivery_partner'}, 
                                                {label: 'Entregador (App Padrão)', value: 'delivery_person'}
                                            ]} 
                                        />
                                    </div>
                                    <div>
                                        <CustomSelect 
                                            label="Status da Conta" 
                                            value={editForm.status} 
                                            onChange={val => setEditForm(prev => ({...prev, status: val as UserStatus}))} 
                                            options={[
                                                {label: 'Ativo', value: 'active'}, 
                                                {label: 'Banido / Suspenso', value: 'banned'}, 
                                                {label: 'Pendente', value: 'pending'}
                                            ]} 
                                        />
                                    </div>
                                    <div>
                                        <CustomSelect 
                                            label="Status de Verificação" 
                                            value={editForm.verification_status} 
                                            onChange={val => setEditForm(prev => ({...prev, verification_status: val}))} 
                                            options={[
                                                {label: 'Aprovado', value: 'APPROVED'}, 
                                                {label: 'Em Análise', value: 'PENDING_REVIEW'}, 
                                                {label: 'Rejeitado', value: 'REJECTED'},
                                                {label: 'Não Enviado', value: 'NOT_SUBMITTED'}
                                            ]} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Partner Specifics */}
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Configurações Avançadas</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <CustomSelect 
                                            label="Nível de Parceiro" 
                                            value={editForm.partner_level} 
                                            onChange={val => setEditForm(prev => ({...prev, partner_level: val}))} 
                                            options={[
                                                {label: 'Bronze (Padrão)', value: 'BRONZE'}, 
                                                {label: 'Prata', value: 'SILVER'}, 
                                                {label: 'Ouro', value: 'GOLD'},
                                                {label: 'Platina', value: 'PLATINUM'},
                                                {label: 'Diamante', value: 'DIAMOND'}
                                            ]} 
                                        />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 mt-5">
                                        <span className="text-sm font-bold dark:text-white">Super Lojista</span>
                                        <Switch 
                                            checked={editForm.is_super_store} 
                                            onChange={(checked) => setEditForm(prev => ({...prev, is_super_store: checked}))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                            <Button variant="outline" onClick={() => setSelectedUser(null)} fullWidth>Cancelar</Button>
                            <Button onClick={handleSaveUser} disabled={isSaving} fullWidth className="bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20">
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- INSTITUTIONAL MANAGEMENT ---
const InstitutionalManagement: React.FC = () => {
    const [info, setInfo] = useState<any>({});
    const [loading, setLoading] = useState(true);
    useEffect(() => { cloud.getShopSettings().then(s => { setInfo(s?.company_info || {}); setLoading(false); }); }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            await cloud.adminUpdateShopSettings({ company_info: info });
            alert("Informações salvas.");
        } catch (e) { alert("Erro ao salvar."); }
        finally { setLoading(false); }
    };

    return (
        <div className="space-y-4">
            <h3 className="font-bold text-lg dark:text-white">Conteúdo Institucional</h3>
            {Object.keys(info).map(key => (
                 <div key={key}>
                    <label className="text-xs font-bold uppercase text-gray-400">{key.replace('_', ' ')}</label>
                    <textarea value={info[key]} onChange={e => setInfo({...info, [key]: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 h-24" />
                </div>
            ))}
            <Button onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</Button>
        </div>
    );
};

// --- PLATFORM NEWS MANAGEMENT ---
const PlatformNewsManagement: React.FC = () => {
    const [news, setNews] = useState<PlatformNews[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { cloud.adminGetPlatformNews().then(data => { setNews(data); setLoading(false); }); }, []);
    // Simple UI to list and delete news items
    return (
        <div className="space-y-4">
            <h3 className="font-bold text-lg dark:text-white">Gerenciar Notícias</h3>
            {loading ? <Loader2 className="animate-spin"/> : news.map(item => (
                <div key={item.id} className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                    <span>{item.title}</span>
                    <Button variant="danger" size="sm" onClick={async () => { await cloud.adminDeletePlatformNews(item.id); setNews(news.filter(n => n.id !== item.id)); }}>Excluir</Button>
                </div>
            ))}
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

    useEffect(() => {
        loadPendingPartners();
    }, []);

    const loadPendingPartners = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetPendingPartners();
            setPartners(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const openPartnerDetails = async (partner: ManagedUser) => {
        setSelectedPartner(partner);
        setDetailLoading(true);
        try {
            const details = await cloud.adminGetPartnerDetails(partner.id);
            setPartnerDetails(details);
        } catch (e) { console.error(e); } finally { setDetailLoading(false); }
    };

    const handleUpdateDocStatus = async (docId: string, status: 'APPROVED' | 'REJECTED') => {
        const notes = status === 'REJECTED' ? prompt("Motivo da rejeição (opcional):") : '';
        if (status === 'REJECTED' && notes === null) return; 

        try {
            await cloud.adminUpdateDocumentStatus(docId, status, notes || '');
            if (selectedPartner) openPartnerDetails(selectedPartner);
        } catch (e: any) { alert("Erro: " + e.message); }
    };
    
    const handleUpdatePartnerStatus = async (userId: string, status: 'APPROVED' | 'REJECTED' | 'BLOCKED') => {
        if (!confirm(`Tem certeza que deseja alterar o status deste parceiro para ${status}?`)) return;
        try {
            await cloud.adminUpdatePartnerStatus(userId, status);
            alert("Status do parceiro atualizado!");
            if (selectedPartner) openPartnerDetails(selectedPartner);
            loadPendingPartners();
        } catch (e: any) { alert("Erro: " + e.message); }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
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
                        <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                            {detailLoading ? <Loader2 className="animate-spin mx-auto"/> : (
                                <>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2">
                                        <p><strong>Veículo:</strong> {partnerDetails?.profile.vehicle_type}</p>
                                        <p><strong>Placa:</strong> {partnerDetails?.profile.vehicle_plate || 'N/A'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={() => handleUpdatePartnerStatus(selectedPartner.id, 'APPROVED')} variant="success"><ShieldCheck className="w-4 h-4 mr-2"/> Aprovar Cadastro</Button>
                                        <Button onClick={() => handleUpdatePartnerStatus(selectedPartner.id, 'BLOCKED')} variant="danger"><ShieldOff className="w-4 h-4 mr-2"/> Bloquear Parceiro</Button>
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
                                                <button onClick={() => handleUpdateDocStatus(doc.id, 'APPROVED')} className="p-2 bg-green-100 hover:bg-green-200 rounded"><FileCheck className="w-4 h-4 text-green-600"/></button>
                                                <button onClick={() => handleUpdateDocStatus(doc.id, 'REJECTED')} className="p-2 bg-red-100 hover:bg-red-200 rounded"><FileX className="w-4 h-4 text-red-600"/></button>
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
    
    const [newName, setNewName] = useState('');
    const [newState, setNewState] = useState('');

    const [editingCity, setEditingCity] = useState<City | null>(null);
    const [editName, setEditName] = useState('');
    const [editState, setEditState] = useState('');

    useEffect(() => { loadData(); }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'cities') {
                const data = await cloud.adminGetCities();
                setCities(data);
            } else {
                const data = await cloud.adminGetCityRequests();
                setRequests(data);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleAddCity = async () => {
        if (!newName || !newState) return alert("Preencha nome e estado.");
        try {
            await cloud.adminAddCity(newName, newState);
            setNewName('');
            setNewState('');
            loadData();
        } catch (e: any) { alert("Erro: " + e.message); }
    };

    const handleToggleStatus = async (city: City) => {
        if (!confirm(`Tem certeza que deseja ${city.is_active ? "desativar" : "ativar"} a cidade ${city.name}?`)) return;
        try {
            await cloud.adminUpdateCityStatus(city.id, !city.is_active);
            loadData();
        } catch (e: any) { alert("Erro: " + e.message); }
    };

    const handleSaveChanges = async () => {
        if (!editingCity || !editName || !editState) return;
        try {
            await cloud.adminEditCity(editingCity.id, editName, editState);
            setEditingCity(null);
            loadData();
        } catch (e: any) { alert("Erro ao editar: " + e.message); }
    };

    const handleProcessRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            await cloud.adminProcessCityRequest(id, status);
            loadData();
        } catch (e: any) { alert("Erro: " + e.message); }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4 w-fit">
                <button onClick={() => setActiveTab('cities')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'cities' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Cidades Ativas</button>
                <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'requests' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Solicitações</button>
            </div>

            {activeTab === 'cities' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-3 items-center">
                        <input type="text" placeholder="Cidade" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <input type="text" placeholder="UF" maxLength={2} value={newState} onChange={e => setNewState(e.target.value.toUpperCase())} className="w-20 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <Button onClick={handleAddCity} className="whitespace-nowrap px-4"><Plus className="w-4 h-4 mr-2"/> Adicionar</Button>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                                <tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
                            </thead>
                            <tbody>
                                {cities.map(city => (
                                    <tr key={city.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0">
                                        <td className="px-4 py-3 font-bold dark:text-white">{city.name}</td>
                                        <td className="px-4 py-3">{city.state}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${city.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{city.is_active ? 'Ativa' : 'Inativa'}</span></td>
                                        <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                                            <button onClick={() => { setEditingCity(city); setEditName(city.name); setEditState(city.state); }} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><Edit className="w-4 h-4"/></button>
                                            <button onClick={() => handleToggleStatus(city)} className={`${city.is_active ? 'text-red-500' : 'text-green-500'} p-2 rounded`}>{city.is_active ? <PowerOff className="w-4 h-4"/> : <Power className="w-4 h-4"/>}</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'requests' && (
                <div className="space-y-4">
                    {requests.length === 0 && <p className="text-gray-400 text-center">Nenhuma solicitação pendente.</p>}
                    {requests.map(req => (
                        <div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                            <div><div className="font-bold text-lg dark:text-white">{req.city_name} - {req.state}</div><div className="text-xs text-gray-500">{req.user_email || 'Anônimo'} • {req.status}</div></div>
                            {req.status === 'PENDING' && <div className="flex gap-2"><button onClick={() => handleProcessRequest(req.id, 'APPROVED')} className="bg-green-100 text-green-600 p-2 rounded"><CheckCircle className="w-5 h-5"/></button><button onClick={() => handleProcessRequest(req.id, 'REJECTED')} className="bg-red-100 text-red-600 p-2 rounded"><X className="w-5 h-5"/></button></div>}
                        </div>
                    ))}
                </div>
            )}

            {editingCity && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl p-6 space-y-4">
                        <h3 className="font-bold dark:text-white">Editar Cidade</h3>
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <input type="text" value={editState} onChange={e => setEditState(e.target.value.toUpperCase())} maxLength={2} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" />
                        <div className="flex gap-3"><Button variant="outline" onClick={() => setEditingCity(null)} fullWidth>Cancelar</Button><Button onClick={handleSaveChanges} fullWidth>Salvar</Button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- PAYOUTS MANAGEMENT MODULE ---
const PayoutsManagement: React.FC = () => {
    const [payoutSettings, setPayoutSettings] = useState<PayoutSettings | null>(null);
    const [feeSettings, setFeeSettings] = useState<PartnerFeeSettings | null>(null);
    
    // Form State Strings for Masking
    const [formState, setFormState] = useState({
        base_delivery_value: '',
        base_delivery_km: '',
        extra_km_value: '',
        additional_stop_fee: '',
        emergency_percentage: '',
        super_store_monthly_fee: '',
        association_fee: ''
    });

    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [pSettings, fSettings] = await Promise.all([
                cloud.adminGetPayoutSettings(),
                cloud.adminGetFeeSettings()
            ]);
            setPayoutSettings(pSettings);
            setFeeSettings(fSettings);
            
            setFormState({
                base_delivery_value: fSettings?.base_delivery_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '',
                base_delivery_km: fSettings?.base_delivery_km?.toString() || '',
                extra_km_value: fSettings?.extra_km_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '',
                additional_stop_fee: fSettings?.additional_stop_fee?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '',
                emergency_percentage: pSettings?.emergency_percentage?.toString() || '',
                super_store_monthly_fee: fSettings?.super_store_monthly_fee?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '',
                association_fee: fSettings?.association_fee?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || ''
            });

            const h = await cloud.adminGetPayoutHistory();
            setHistory(h || []);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleSaveSettings = async () => {
        if (!payoutSettings || !feeSettings) return;
        setSaving(true);
        try {
            const updatedFeeSettings: PartnerFeeSettings = {
                ...feeSettings,
                base_delivery_value: parseCurrency(formState.base_delivery_value),
                base_delivery_km: parseFloat(formState.base_delivery_km) || 0,
                extra_km_value: parseCurrency(formState.extra_km_value),
                additional_stop_fee: parseCurrency(formState.additional_stop_fee),
                super_store_monthly_fee: parseCurrency(formState.super_store_monthly_fee),
                association_fee: parseCurrency(formState.association_fee)
            };

            const updatedPayoutSettings: PayoutSettings = {
                ...payoutSettings,
                emergency_percentage: parseFloat(formState.emergency_percentage) || 0
            };

            await Promise.all([
                cloud.adminUpdatePayoutSettings(updatedPayoutSettings),
                cloud.adminUpdateFeeSettings(updatedFeeSettings)
            ]);
            alert("Configurações atualizadas!");
        } catch (e: any) { alert("Erro: " + e.message); } finally { setSaving(false); }
    };

    const handleFormChange = (field: string, value: string) => {
        setFormState(prev => ({ ...prev, [field]: value }));
    };

    if (loading) return <Loader2 className="w-8 h-8 animate-spin mx-auto my-10 text-brand-500"/>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500"/> Regras Financeiras</h3>
                
                {/* Entregas */}
                <div className="mb-6">
                    <h4 className="text-sm font-bold text-brand-600 mb-3 uppercase">Taxas de Entrega</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Valor Base (R$)</label><input type="tel" value={formState.base_delivery_value} onChange={e => handleCurrencyMask(e, v => handleFormChange('base_delivery_value', v))} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1" /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">KM Base</label><input type="number" value={formState.base_delivery_km} onChange={e => handleFormChange('base_delivery_km', e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1" /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">KM Excedente (R$)</label><input type="tel" value={formState.extra_km_value} onChange={e => handleCurrencyMask(e, v => handleFormChange('extra_km_value', v))} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1" /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Ponto Adicional (R$)</label><input type="tel" value={formState.additional_stop_fee} onChange={e => handleCurrencyMask(e, v => handleFormChange('additional_stop_fee', v))} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1" /></div>
                    </div>
                </div>

                {/* Serviços */}
                <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-bold text-purple-600 mb-3 uppercase">Serviços Extras</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Assinatura Super Lojista (R$)</label><input type="tel" value={formState.super_store_monthly_fee} onChange={e => handleCurrencyMask(e, v => handleFormChange('super_store_monthly_fee', v))} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1" /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Taxa Associação Entregador (R$)</label><input type="tel" value={formState.association_fee} onChange={e => handleCurrencyMask(e, v => handleFormChange('association_fee', v))} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1" /></div>
                    </div>
                </div>

                {/* Repasses */}
                <div className="mb-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-bold text-green-600 mb-3 uppercase">Repasses e Saques</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Dia da Semana (1-7)</label>
                            <select value={payoutSettings?.weekday} onChange={e => setPayoutSettings(prev => prev ? {...prev, weekday: parseInt(e.target.value)} : null)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1">
                                <option value="1">Segunda</option><option value="2">Terça</option><option value="3">Quarta</option><option value="4">Quinta</option><option value="5">Sexta</option>
                            </select>
                        </div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Limite Emergencial (%)</label><input type="number" value={formState.emergency_percentage} onChange={e => handleFormChange('emergency_percentage', e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1" /></div>
                        <div><label className="text-xs font-bold text-gray-500 uppercase">Cooldown (Horas)</label><input type="number" value={payoutSettings?.emergency_cooldown_hours} onChange={e => setPayoutSettings(prev => prev ? {...prev, emergency_cooldown_hours: parseInt(e.target.value)} : null)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1" /></div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <input type="checkbox" checked={payoutSettings?.emergency_enabled} onChange={e => setPayoutSettings(prev => prev ? {...prev, emergency_enabled: e.target.checked} : null)} className="w-5 h-5 rounded text-brand-600" />
                        <span className="text-sm font-bold dark:text-white">Habilitar Saque Emergencial</span>
                    </div>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} fullWidth>{saving ? 'Salvando...' : 'Salvar Regras'}</Button>
            </div>

            {/* History Table */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><Banknote className="w-5 h-5 text-green-500"/> Histórico de Repasses</h3>
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700">
                            <tr><th className="px-4 py-3">Parceiro</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Data</th></tr>
                        </thead>
                        <tbody>
                            {history.map(h => (
                                <tr key={h.id} className="border-b dark:border-gray-700">
                                    <td className="px-4 py-3 font-medium dark:text-white">{h.partner_email}</td>
                                    <td className="px-4 py-3 font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(h.amount)}</td>
                                    <td className="px-4 py-3">{h.is_emergency ? 'Emergência' : 'Semanal'}</td>
                                    <td className="px-4 py-3">{h.status}</td>
                                    <td className="px-4 py-3 text-gray-500">{new Date(h.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {history.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- PARTNER LEVELS MANAGEMENT ---
const PartnerLevelsManagement: React.FC = () => {
    const [levels, setLevels] = useState<PartnerLevelBenefit[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadLevels(); }, []);

    const loadLevels = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetPartnerLevels();
            setLevels(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleUpdate = (levelName: string, field: keyof PartnerLevelBenefit, value: string) => {
        setLevels(prev => prev.map(l => {
            if (l.level === levelName) {
                if (field === 'display_name') return { ...l, [field]: value };
                return { ...l, [field]: parseFloat(value) || 0 };
            }
            return l;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all(levels.map(level => cloud.adminUpdatePartnerLevel(level)));
            alert("Níveis salvos!");
        } catch (e: any) { alert("Erro: " + e.message); } finally { setSaving(false); }
    };

    if (loading) return <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-500"/>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Níveis de Parceiro</h3>
                <div className="space-y-4">
                    {levels.map(level => (
                        <div key={level.level} className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                            <h4 className="font-bold text-md text-brand-600 dark:text-brand-400 mb-3">{level.level}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-1 md:col-span-2"><label className="text-xs font-bold text-gray-500">Nome de Exibição</label><input type="text" value={level.display_name} onChange={e => handleUpdate(level.level, 'display_name', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border rounded-lg text-sm mt-1" /></div>
                                <div><label className="text-xs font-bold text-gray-500">Mínimo Entregas</label><input type="number" value={level.min_deliveries} onChange={e => handleUpdate(level.level, 'min_deliveries', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border rounded-lg text-sm mt-1" /></div>
                                <div><label className="text-xs font-bold text-gray-500">Nota Mínima</label><input type="number" step="0.1" value={level.min_rating} onChange={e => handleUpdate(level.level, 'min_rating', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border rounded-lg text-sm mt-1" /></div>
                                <div><label className="text-xs font-bold text-gray-500">Desconto Loja (%)</label><input type="number" step="0.1" value={level.store_discount_percent} onChange={e => handleUpdate(level.level, 'store_discount_percent', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border rounded-lg text-sm mt-1" /></div>
                                <div><label className="text-xs font-bold text-gray-500">Redução Taxa (%)</label><input type="number" step="0.1" value={level.service_fee_reduction_percent} onChange={e => handleUpdate(level.level, 'service_fee_reduction_percent', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border rounded-lg text-sm mt-1" /></div>
                            </div>
                        </div>
                    ))}
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full mt-6">{saving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Salvar Alterações'}</Button>
            </div>
        </div>
    );
};

// --- MAIN EXPORT ---
export const AdminPanel: React.FC<{ activeSubTab: string }> = ({ activeSubTab }) => {
    // Renderiza o componente correto com base na sub-aba ativa.
    const renderAdminContent = () => {
        switch(activeSubTab) {
            case 'dashboard': return <AdminDashboard />;
            case 'users': return <UserManagement />;
            case 'validation': return <PartnerVerification />;
            case 'payouts':
            case 'fees': return <PayoutsManagement />;
            case 'cities': return <CityManagement />;
            case 'levels': return <PartnerLevelsManagement />;
            case 'asaas_webhook': return <AsaasWebhookManagement />;
            case 'wallet_control': return <AdminWalletControl />;
            case 'referrals': return <AdminReferrals />;
            case 'institutional': return <InstitutionalManagement />;
            case 'platform_news': return <PlatformNewsManagement />;
            
            default:
                return (
                    <div className="text-center p-10 text-gray-500">
                        <h2 className="font-bold text-lg">Módulo "{activeSubTab}"</h2>
                        <p>Este módulo está sendo preparado e será disponibilizado em breve.</p>
                    </div>
                );
        }
    };
    
    return (
        <div className="space-y-4 pb-16">
           {renderAdminContent()}
        </div>
    );
};
