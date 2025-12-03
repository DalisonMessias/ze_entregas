
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Search, MoreVertical, Edit, UserX, Trash2, Loader2, UserCheck, UserCog, Send, ListOrdered, Settings, Package, Power, PowerOff, X, CheckCircle, AlertTriangle, CreditCard, QrCode, Barcode, Plus, Grid, Tag, Headphones, MessageSquare, Phone, Key, Bot, Wallet, Smartphone, Upload, RefreshCw, Banknote, MapPin, Link2, FileCheck, FileX, ShieldCheck, ShieldOff, Star, Ban, Bell, Megaphone, Newspaper, FileText, ShoppingBag, Eye, Store } from 'lucide-react';
import * as cloud from '../services/cloud';
import { ManagedUser, UserRole, UserStatus, GlobalNotification, Product, AdminOrder, ShopSettings, Category, Claim, PartnerFeeSettings, PWASettings, PWAIcon, PayoutSettings, City, CityRequest, PartnerDocument, PartnerProfile, PartnerLevelBenefit, BlacklistEntry, PlatformNews, AdminWalletUser, FraudAlert, IdentityVerification } from '../types';
import { Button } from './Button';
import { CustomSelect } from './CustomSelect';
import { AsaasWebhookManagement } from './AsaasWebhookManagement';
import { AdminDashboard } from './AdminDashboard';
import { AdminWalletControl } from './AdminWalletControl';
import { AdminReferrals } from './AdminReferrals';

// --- HELPER COMPONENTS ---
const LoadingState = () => <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500"/></div>;

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

// --- USER MANAGEMENT MODULE ---
const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    
    // Edit User Modal State
    const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [savingUser, setSavingUser] = useState(false);

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        setLoading(true);
        try { const data = await cloud.getAllUsers(); setUsers(data); } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleEditUser = (user: ManagedUser) => {
        setEditingUser(user);
        setEditForm({
            name: user.name || '',
            email: user.email || '',
            phone_number: user.phone_number || '',
            cpf: user.cpf || '',
            city: user.city || '',
            role: user.role,
            status: user.status,
            password: '' // Only for updates
        });
    };

    const handleSaveUser = async () => {
        if (!editingUser) return;
        setSavingUser(true);
        try {
            await cloud.adminUpdateUserProfile(editingUser.id, editForm);
            alert("Usuário atualizado com sucesso!");
            setEditingUser(null);
            loadUsers();
        } catch (e: any) {
            alert("Erro ao atualizar: " + e.message);
        } finally {
            setSavingUser(false);
        }
    };

    const filtered = users.filter(u => (u.name || '').toLowerCase().includes(search.toLowerCase()) || (u.email || '').toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="font-bold text-lg dark:text-white flex items-center gap-2"><UserCog className="w-5 h-5 text-brand-600"/> Gerenciar Usuários</h2>
                <div className="flex gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm outline-none border border-gray-200 dark:border-gray-600 dark:text-white" />
                    </div>
                    <button onClick={loadUsers} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 transition-colors"><RefreshCw className="w-4 h-4 text-gray-500"/></button>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                            <tr><th className="px-4 py-3">Nome/Email</th><th className="px-4 py-3">Função</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
                        </thead>
                        <tbody>
                            {loading ? <tr><td colSpan={4}><LoadingState /></td></tr> : filtered.map(u => (
                                <tr key={u.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3"><p className="font-bold dark:text-white">{u.name || 'Sem nome'}</p><p className="text-xs text-gray-500">{u.email}</p></td>
                                    <td className="px-4 py-3"><span className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{u.role}</span></td>
                                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{u.status}</span></td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => handleEditUser(u)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in" onClick={() => setEditingUser(null)}>
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900 rounded-t-2xl">
                            <h3 className="font-bold text-lg dark:text-white flex items-center gap-2">
                                <Edit className="w-5 h-5 text-brand-600"/> Editar Perfil
                            </h3>
                            <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-4">
                            {/* ... Fields ... */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Nome Completo</label>
                                    <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Email (Login)</label>
                                    <input type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Função (Role)</label>
                                    <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                                        <option value="admin">Admin</option>
                                        <option value="store_partner">Lojista</option>
                                        <option value="delivery_partner">Entregador Parceiro</option>
                                        <option value="delivery_person">Entregador (Comum)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1 block">Status da Conta</label>
                                    <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm">
                                        <option value="active">Ativo</option>
                                        <option value="banned">Banido / Suspenso</option>
                                        <option value="pending">Pendente</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl flex gap-3">
                            <Button variant="outline" fullWidth onClick={() => setEditingUser(null)}>Cancelar</Button>
                            <Button fullWidth onClick={handleSaveUser} disabled={savingUser}>
                                {savingUser ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Salvar Alterações'}
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
        if (status === 'REJECTED' && notes === null) return; // User cancelled prompt

        try {
            await cloud.adminUpdateDocumentStatus(docId, status, notes || '');
            // Refresh details
            if (selectedPartner) openPartnerDetails(selectedPartner);
        } catch (e: any) { alert("Erro: " + e.message); }
    };
    
    const handleUpdatePartnerStatus = async (userId: string, status: 'APPROVED' | 'REJECTED' | 'BLOCKED') => {
        if (!confirm(`Tem certeza que deseja alterar o status deste parceiro para ${status}?`)) return;
        try {
            await cloud.adminUpdatePartnerStatus(userId, status);
            alert("Status do parceiro atualizado!");
            if (selectedPartner) openPartnerDetails(selectedPartner); // Refresh
            loadPendingPartners(); // Refresh list in case status changes
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
    
    // Add City Form
    const [newName, setNewName] = useState('');
    const [newState, setNewState] = useState('');

    // Edit City Modal
    const [editingCity, setEditingCity] = useState<City | null>(null);
    const [editName, setEditName] = useState('');
    const [editState, setEditState] = useState('');

    useEffect(() => {
        loadData();
    }, [activeTab]);

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
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCity = async () => {
        if (!newName || !newState) return alert("Preencha nome e estado.");
        try {
            await cloud.adminAddCity(newName, newState);
            setNewName('');
            setNewState('');
            loadData();
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    const handleToggleStatus = async (city: City) => {
        const action = city.is_active ? "desativar" : "ativar";
        if (!confirm(`Tem certeza que deseja ${action} a cidade ${city.name}?`)) return;
        try {
            await cloud.adminUpdateCityStatus(city.id, !city.is_active);
            loadData();
        } catch (e: any) {
            alert("Erro: " + e.message);
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
            await cloud.adminEditCity(editingCity.id, editName, editState);
            setEditingCity(null);
            loadData();
        } catch (e: any) {
            alert("Erro ao editar: " + e.message);
        }
    };

    const handleProcessRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        try {
            await cloud.adminProcessCityRequest(id, status);
            loadData();
        } catch (e: any) {
            alert("Erro: " + e.message);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
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
                            <Plus className="w-4 h-4 mr-2"/> Adicionar
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
                                        <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                                            <button onClick={() => openEditModal(city)} className="text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2 rounded">
                                                <Edit className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => handleToggleStatus(city)} className={`${city.is_active ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'} p-2 rounded`}>
                                                {city.is_active ? <PowerOff className="w-4 h-4"/> : <Power className="w-4 h-4"/>}
                                            </button>
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
                            <div>
                                <div className="font-bold text-lg dark:text-white">{req.city_name} - {req.state}</div>
                                <div className="text-xs text-gray-500">{req.user_email || 'Anônimo'} • {req.status}</div>
                            </div>
                            {req.status === 'PENDING' && (
                                <div className="flex gap-2">
                                    <button onClick={() => handleProcessRequest(req.id, 'APPROVED')} className="bg-green-100 text-green-600 p-2 rounded hover:bg-green-200"><CheckCircle className="w-5 h-5"/></button>
                                    <button onClick={() => handleProcessRequest(req.id, 'REJECTED')} className="bg-red-100 text-red-600 p-2 rounded hover:bg-red-200"><X className="w-5 h-5"/></button>
                                </div>
                            )}
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
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setEditingCity(null)} fullWidth>Cancelar</Button>
                            <Button onClick={handleSaveChanges} fullWidth>Salvar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- PAYOUTS MANAGEMENT MODULE ---
const PayoutsManagement: React.FC = () => {
    const [settings, setSettings] = useState<PayoutSettings | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const s = await cloud.adminGetPayoutSettings();
            setSettings(s);
            const h = await cloud.adminGetPayoutHistory();
            setHistory(h || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await cloud.adminUpdatePayoutSettings(settings);
            alert("Configurações de repasse atualizadas!");
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Loader2 className="w-8 h-8 animate-spin mx-auto my-10 text-brand-500"/>;

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Configuration Card */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-gray-500"/> Regras de Repasse
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Dia do Repasse Semanal</label>
                        <select 
                            value={settings?.weekday} 
                            onChange={e => setSettings(prev => prev ? {...prev, weekday: parseInt(e.target.value)} : null)}
                            className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"
                        >
                            <option value="1">Segunda-feira</option>
                            <option value="2">Terça-feira</option>
                            <option value="3">Quarta-feira</option>
                            <option value="4">Quinta-feira</option>
                            <option value="5">Sexta-feira</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Horário (Ex: 10:00)</label>
                        <input 
                            type="time" 
                            value={settings?.hour} 
                            onChange={e => setSettings(prev => prev ? {...prev, hour: e.target.value} : null)}
                            className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Limite Saque Emergencial (%)</label>
                        <input 
                            type="number" 
                            value={settings?.emergency_percentage} 
                            onChange={e => setSettings(prev => prev ? {...prev, emergency_percentage: parseInt(e.target.value)} : null)}
                            className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Cooldown (Horas entre saques)</label>
                        <input 
                            type="number" 
                            value={settings?.emergency_cooldown_hours} 
                            onChange={e => setSettings(prev => prev ? {...prev, emergency_cooldown_hours: parseInt(e.target.value)} : null)}
                            className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"
                        />
                    </div>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                    <input 
                        type="checkbox" 
                        checked={settings?.emergency_enabled} 
                        onChange={e => setSettings(prev => prev ? {...prev, emergency_enabled: e.target.checked} : null)}
                        className="w-5 h-5 rounded text-brand-600"
                    />
                    <span className="text-sm font-bold dark:text-white">Permitir Saque Emergencial</span>
                </div>

                <Button onClick={handleSaveSettings} disabled={saving} fullWidth>
                    {saving ? 'Salvando...' : 'Salvar Regras'}
                </Button>
            </div>

            {/* History Table */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-green-500"/> Histórico de Repasses
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-4 py-3">Parceiro</th>
                                <th className="px-4 py-3">Valor</th>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3">Data</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(h => (
                                <tr key={h.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-4 py-3 font-medium dark:text-white">{h.partner_email}</td>
                                    <td className="px-4 py-3 font-bold text-green-600">
                                        {formatCurrency(h.amount)}
                                    </td>
                                    <td className="px-4 py-3">
                                        {h.is_emergency 
                                            ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">EMERGÊNCIA</span> 
                                            : <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">SEMANAL</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3">{h.status}</td>
                                    <td className="px-4 py-3 text-gray-500">{new Date(h.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhum registro encontrado.</td>
                                </tr>
                            )}
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

    useEffect(() => {
        loadLevels();
    }, []);

    const loadLevels = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetPartnerLevels();
            setLevels(data);
        } catch (e) {
            console.error(e);
            alert("Erro ao carregar níveis.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = (levelName: string, field: keyof PartnerLevelBenefit, value: string) => {
        setLevels(prev =>
            prev.map(l => {
                if (l.level === levelName) {
                    // Check field type before parsing
                    if (field === 'display_name' || field === 'level') {
                        return { ...l, [field]: value };
                    } else {
                        return { ...l, [field]: parseFloat(value) || 0 };
                    }
                }
                return l;
            })
        );
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await Promise.all(levels.map(level => cloud.adminUpdatePartnerLevel(level)));
            alert("Níveis de parceiro salvos com sucesso!");
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Gerenciar Níveis de Parceiro</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Defina os critérios e benefícios para cada nível. O sistema reclassificará os parceiros automaticamente com base nestas regras (diariamente).</p>
                <div className="space-y-4">
                    {levels.map(level => (
                        <div key={level.level} className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                            <h4 className="font-bold text-md text-brand-600 dark:text-brand-400 mb-3">{level.level}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-1 md:col-span-2">
                                     <label className="text-xs font-bold text-gray-500">Nome de Exibição (Divertido)</label>
                                     <input type="text" value={level.display_name} onChange={e => handleUpdate(level.level, 'display_name', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm mt-1" />
                                </div>
                                <div className="col-span-1 md:col-span-2"><p className="text-xs font-bold text-gray-400 uppercase">Critérios para atingir</p></div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Mínimo de Entregas</label>
                                    <input type="number" value={level.min_deliveries} onChange={e => handleUpdate(level.level, 'min_deliveries', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Avaliação Média Mínima (0-5)</label>
                                    <input type="number" step="0.1" value={level.min_rating} onChange={e => handleUpdate(level.level, 'min_rating', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm mt-1" />
                                </div>
                                <div className="col-span-1 md:col-span-2 mt-2"><p className="text-xs font-bold text-gray-400 uppercase">Benefícios</p></div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Desconto Lojista (%)</label>
                                    <input type="number" step="0.1" value={level.store_discount_percent} onChange={e => handleUpdate(level.level, 'store_discount_percent', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm mt-1" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500">Redução Taxa de Serviço (%)</label>
                                    <input type="number" step="0.1" value={level.service_fee_reduction_percent} onChange={e => handleUpdate(level.level, 'service_fee_reduction_percent', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm mt-1" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <Button onClick={handleSave} disabled={saving} className="w-full mt-6">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Salvar Alterações'}
                </Button>
            </div>
        </div>
    );
};

// --- GLOBAL FEES ---
const GlobalFeesManagement: React.FC = () => {
    const [settings, setSettings] = useState<PartnerFeeSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const s = await cloud.adminGetFeeSettings();
                setSettings(s);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        if (!settings) return;
        setSaving(true);
        try {
            await cloud.adminUpdateFeeSettings(settings);
            alert("Taxas globais atualizadas com sucesso!");
        } catch (e: any) {
            alert("Erro ao salvar: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <LoadingState />;

    return (
        <div className="space-y-6 animate-in fade-in">
             <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-green-500"/> Taxas e Custos da Plataforma
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-gray-500">Taxa Fixa por Pedido</label>
                        <input type="number" value={settings?.global_tax_fixed} onChange={e => setSettings(s => s ? {...s, global_tax_fixed: parseFloat(e.target.value)} : null)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    </div>
                    {/* ... other inputs could be added here ... */}
                </div>
                <Button onClick={handleSave} disabled={saving} fullWidth className="mt-6">Salvar</Button>
            </div>
        </div>
    );
};

// --- SUPPORT MODULE ---
const AdminSupportModule: React.FC = () => {
    const [claims, setClaims] = useState<Claim[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
    const [response, setResponse] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetSupportClaims('all');
            setClaims(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleReply = async () => {
        if (!selectedClaim || !response) return;
        setSaving(true);
        try {
            await cloud.adminUpdateClaim(selectedClaim.id, response, 'resolved');
            alert("Resposta enviada!");
            setSelectedClaim(null);
            setResponse('');
            load();
        } catch (e: any) { alert("Erro: " + e.message); } finally { setSaving(false); }
    };

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                        <tr><th>Usuário</th><th>Assunto</th><th>Status</th><th>Data</th><th>Ação</th></tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={5}><LoadingState /></td></tr> : claims.map(c => (
                            <tr key={c.id} className="border-b dark:border-gray-700">
                                <td className="px-4 py-3">{c.user_email}</td>
                                <td className="px-4 py-3 font-bold">{c.type}</td>
                                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs ${c.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>{c.status}</span></td>
                                <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-3">
                                    <Button size="sm" variant="outline" onClick={() => { setSelectedClaim(c); setResponse(c.admin_response || ''); }}>Ver</Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedClaim && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-xl">
                        <h3 className="font-bold mb-2">Chamado: {selectedClaim.type}</h3>
                        <p className="text-sm bg-gray-100 dark:bg-gray-700 p-3 rounded-lg mb-4">{selectedClaim.description}</p>
                        <textarea className="w-full p-3 border rounded-lg dark:bg-gray-700" placeholder="Sua resposta..." rows={4} value={response} onChange={e => setResponse(e.target.value)} />
                        <div className="flex gap-2 mt-4">
                            <Button fullWidth onClick={handleReply} disabled={saving}>{saving ? <Loader2 className="animate-spin"/> : 'Responder e Resolver'}</Button>
                            <Button variant="outline" onClick={() => setSelectedClaim(null)}>Fechar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- BLACKLIST MODULE ---
const AdminBlacklistModule: React.FC = () => {
    const [list, setList] = useState<BlacklistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEntry, setNewEntry] = useState({ email: '', phone: '', reason: '' });

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetBlacklist();
            setList(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleAdd = async () => {
        if (!newEntry.reason) return alert("Motivo obrigatório");
        try {
            await cloud.adminAddToBlacklist({ 
                email: newEntry.email || undefined, 
                phone_number: newEntry.phone || undefined, 
                reason: newEntry.reason,
                status: 'active'
            });
            setNewEntry({ email: '', phone: '', reason: '' });
            load();
        } catch (e: any) { alert("Erro: " + e.message); }
    };

    const handleRemove = async (id: string) => {
        if (!confirm("Remover da blacklist?")) return;
        try { await cloud.adminRemoveFromBlacklist(id); load(); } catch (e: any) { alert("Erro: " + e.message); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Ban className="w-5 h-5 text-red-500"/> Adicionar à Lista Negra</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="text" placeholder="Email" value={newEntry.email} onChange={e => setNewEntry({...newEntry, email: e.target.value})} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="text" placeholder="Telefone" value={newEntry.phone} onChange={e => setNewEntry({...newEntry, phone: e.target.value})} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="text" placeholder="Motivo" value={newEntry.reason} onChange={e => setNewEntry({...newEntry, reason: e.target.value})} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <Button onClick={handleAdd} className="mt-3 w-full bg-red-600 hover:bg-red-700">Banir Usuário</Button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                        <tr><th>Email</th><th>Telefone</th><th>Motivo</th><th>Ação</th></tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={4}><LoadingState /></td></tr> : list.map(item => (
                            <tr key={item.id} className="border-b dark:border-gray-700">
                                <td className="px-4 py-3">{item.email || '-'}</td>
                                <td className="px-4 py-3">{item.phone_number || '-'}</td>
                                <td className="px-4 py-3 text-red-500">{item.reason}</td>
                                <td className="px-4 py-3"><button onClick={() => handleRemove(item.id)} className="text-blue-500 hover:underline">Remover</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- NOTIFICATIONS MODULE ---
const AdminNotificationsModule: React.FC = () => {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!title || !message) return;
        setSending(true);
        try {
            await cloud.adminSendGlobalNotification(title, message);
            alert("Notificação enviada para todos os usuários!");
            setTitle('');
            setMessage('');
        } catch (e: any) { alert("Erro: " + e.message); } finally { setSending(false); }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 max-w-2xl mx-auto">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Bell className="w-5 h-5 text-blue-500"/> Enviar Push Global</h3>
            <p className="text-sm text-gray-500 mb-6">Esta mensagem aparecerá para todos os usuários do app.</p>
            
            <div className="space-y-4">
                <input type="text" placeholder="Título da Notificação" value={title} onChange={e => setTitle(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <textarea placeholder="Mensagem" rows={4} value={message} onChange={e => setMessage(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none" />
                <Button onClick={handleSend} disabled={sending} fullWidth>
                    {sending ? <Loader2 className="animate-spin"/> : <><Send className="w-4 h-4 mr-2"/> Enviar Agora</>}
                </Button>
            </div>
        </div>
    );
};

// --- NEWS MODULE ---
const AdminNewsModule: React.FC = () => {
    const [news, setNews] = useState<PlatformNews[]>([]);
    const [form, setForm] = useState({ title: '', description: '', icon_name: 'Bell' });
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const data = await cloud.adminGetPlatformNews();
            setNews(data);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleAdd = async () => {
        if (!form.title) return;
        try {
            await cloud.adminAddPlatformNews({ ...form, is_active: true });
            setForm({ title: '', description: '', icon_name: 'Bell' });
            load();
        } catch (e: any) { alert("Erro: " + e.message); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Deletar?")) return;
        try { await cloud.adminDeletePlatformNews(id); load(); } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Newspaper className="w-5 h-5 text-purple-500"/> Adicionar Novidade</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Título" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="text" placeholder="Ícone (ex: Bell, Star)" value={form.icon_name} onChange={e => setForm({...form, icon_name: e.target.value})} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <textarea placeholder="Descrição" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="col-span-2 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={2} />
                </div>
                <Button onClick={handleAdd} className="mt-4 w-full">Publicar</Button>
            </div>

            <div className="grid gap-4">
                {news.map(n => (
                    <div key={n.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div>
                            <h4 className="font-bold dark:text-white">{n.title}</h4>
                            <p className="text-sm text-gray-500">{n.description}</p>
                        </div>
                        <button onClick={() => handleDelete(n.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4"/></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- RATINGS MODULE ---
const AdminRatingsModule: React.FC = () => {
    const [ratings, setRatings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await cloud.adminGetAllRatings();
                setRatings(data);
            } catch (e) { console.error(e); } finally { setLoading(false); }
        };
        load();
    }, []);

    return (
        <div className="space-y-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                        <tr><th>Avaliador</th><th>Avaliado</th><th>Nota</th><th>Comentário</th><th>Data</th></tr>
                    </thead>
                    <tbody>
                        {loading ? <tr><td colSpan={5}><LoadingState /></td></tr> : ratings.map(r => (
                            <tr key={r.id} className="border-b dark:border-gray-700">
                                <td className="px-4 py-3 font-bold">{r.evaluator_name}</td>
                                <td className="px-4 py-3">{r.evaluated_name}</td>
                                <td className="px-4 py-3 flex text-yellow-500">{[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}</td>
                                <td className="px-4 py-3 italic text-gray-500">{r.comment}</td>
                                <td className="px-4 py-3 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- ADMIN SHOP MODULE (Products/Categories) ---
const AdminShopModule: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    
    // New Product Form
    const [prodForm, setProdForm] = useState({ name: '', price: '', category_id: '' });
    
    // New Category Form
    const [catName, setCatName] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await cloud.getShopData();
            setProducts(data.products);
            setCategories(data.categories);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleAddProduct = async () => {
        if (!prodForm.name || !prodForm.price) return;
        try {
            await cloud.adminAddProduct({
                name: prodForm.name,
                price: parseFloat(prodForm.price),
                category_id: prodForm.category_id || undefined,
                is_active: true
            });
            setProdForm({ name: '', price: '', category_id: '' });
            loadData();
        } catch (e: any) { alert("Erro: " + e.message); }
    };

    const handleAddCategory = async () => {
        if (!catName) return;
        try {
            await cloud.adminAddCategory(catName);
            setCatName('');
            loadData();
        } catch (e: any) { alert("Erro: " + e.message); }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("Deletar produto?")) return;
        try { await cloud.adminDeleteProduct(id); loadData(); } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* Categories */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Tag className="w-5 h-5"/> Categorias</h3>
                <div className="flex gap-2 mb-4">
                    <input type="text" placeholder="Nova Categoria" value={catName} onChange={e => setCatName(e.target.value)} className="flex-1 p-2 border rounded dark:bg-gray-700" />
                    <Button onClick={handleAddCategory}>Adicionar</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                        <span key={c.id} className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-sm font-bold">{c.name}</span>
                    ))}
                </div>
            </div>

            {/* Products */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold mb-4 flex items-center gap-2"><ShoppingBag className="w-5 h-5"/> Produtos</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    <input type="text" placeholder="Nome do Produto" value={prodForm.name} onChange={e => setProdForm({...prodForm, name: e.target.value})} className="p-2 border rounded dark:bg-gray-700" />
                    <input type="number" placeholder="Preço (R$)" value={prodForm.price} onChange={e => setProdForm({...prodForm, price: e.target.value})} className="p-2 border rounded dark:bg-gray-700" />
                    <select value={prodForm.category_id} onChange={e => setProdForm({...prodForm, category_id: e.target.value})} className="p-2 border rounded dark:bg-gray-700">
                        <option value="">Sem Categoria</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <Button onClick={handleAddProduct} className="md:col-span-3">Adicionar Produto</Button>
                </div>

                <div className="space-y-2">
                    {products.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div>
                                <p className="font-bold dark:text-white">{p.name}</p>
                                <p className="text-xs text-gray-500">{formatCurrency(p.price)}</p>
                            </div>
                            <button onClick={() => handleDeleteProduct(p.id)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- SECURITY MODULE ---
const AdminSecurity: React.FC = () => {
    const [alerts, setAlerts] = useState<FraudAlert[]>([]);
    const [verifications, setVerifications] = useState<IdentityVerification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        try {
            const [a, v] = await Promise.all([cloud.adminGetFraudAlerts(), cloud.adminGetIdentityVerifications()]);
            setAlerts(a);
            setVerifications(v);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleVerify = async (id: string, status: string) => {
        try { await cloud.adminUpdateIdentityVerification(id, status); load(); } catch(e: any) { alert(e.message); }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Identity Verifications */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><UserCheck className="w-5 h-5 text-blue-500"/> Verificações de Identidade</h3>
                <div className="space-y-3">
                    {verifications.map(v => (
                        <div key={v.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <img src={v.photo_url} className="w-10 h-10 rounded-full object-cover" />
                                <div>
                                    <p className="font-bold text-sm">ID: {v.user_id.substring(0,8)}</p>
                                    <p className="text-xs text-gray-500">{v.status}</p>
                                </div>
                            </div>
                            {v.status === 'PENDING' && (
                                <div className="flex gap-2">
                                    <Button size="sm" variant="success" onClick={() => handleVerify(v.id, 'VERIFIED')}>Aprovar</Button>
                                    <Button size="sm" variant="danger" onClick={() => handleVerify(v.id, 'REJECTED')}>Rejeitar</Button>
                                </div>
                            )}
                        </div>
                    ))}
                    {verifications.length === 0 && <p className="text-gray-400 text-center text-sm">Nenhuma verificação pendente.</p>}
                </div>
            </div>

            {/* Fraud Alerts */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-red-500"/> Alertas de Fraude</h3>
                <div className="space-y-2">
                    {alerts.map(a => (
                        <div key={a.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex justify-between items-center">
                            <div>
                                <p className="font-bold text-red-700 dark:text-red-300">{a.type}</p>
                                <p className="text-xs text-red-600">{a.description}</p>
                            </div>
                            <span className="text-xs font-bold bg-white px-2 py-1 rounded">{a.status}</span>
                        </div>
                    ))}
                    {alerts.length === 0 && <p className="text-gray-400 text-center text-sm">Nenhum alerta de fraude.</p>}
                </div>
            </div>
        </div>
    );
};

// --- AI CONFIG MODULE ---
const AdminAIConfig: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cloud.getShopSettings().then(s => {
            if (s?.google_gemini_api_key) setApiKey(s.google_gemini_api_key);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        try {
            await cloud.adminUpdateShopSettings({ google_gemini_api_key: apiKey });
            alert("Chave de API salva!");
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Bot className="w-5 h-5 text-brand-500"/> Configuração de IA (Gemini)</h3>
            <p className="text-sm text-gray-500 mb-4">Insira a chave de API do Google Gemini para habilitar o Assistente Zé.</p>
            <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="password" 
                    value={apiKey} 
                    onChange={e => setApiKey(e.target.value)} 
                    className="w-full pl-10 p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 mb-4 font-mono text-sm" 
                    placeholder="AIzaSy..."
                />
            </div>
            <Button onClick={handleSave} disabled={loading}>Salvar Chave</Button>
        </div>
    );
};

// --- PWA SETTINGS MODULE ---
const AdminPWASettings: React.FC = () => {
    const [settings, setSettings] = useState<PWASettings>({ name: 'Zé Entregas', short_name: 'Zé', theme_color: '#ed2b05', background_color: '#ffffff', description: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cloud.adminGetPWASettings().then(s => {
            if (s && s.name) setSettings(s);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        try {
            await cloud.adminUpdatePWASettings(settings);
            alert("Configurações PWA salvas!");
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Smartphone className="w-5 h-5 text-purple-500"/> Configuração do App (PWA)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="text" placeholder="Nome do App" value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="p-2 border rounded dark:bg-gray-700" />
                <input type="text" placeholder="Nome Curto (Ícone)" value={settings.short_name} onChange={e => setSettings({...settings, short_name: e.target.value})} className="p-2 border rounded dark:bg-gray-700" />
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold">Cor Tema:</label>
                    <input type="color" value={settings.theme_color} onChange={e => setSettings({...settings, theme_color: e.target.value})} className="h-10 w-20 p-1 rounded" />
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-xs font-bold">Cor Fundo:</label>
                    <input type="color" value={settings.background_color} onChange={e => setSettings({...settings, background_color: e.target.value})} className="h-10 w-20 p-1 rounded" />
                </div>
            </div>
            <Button onClick={handleSave} disabled={loading}>Atualizar Manifesto</Button>
        </div>
    );
};

// --- INSTITUTIONAL MODULE ---
const AdminInstitutional: React.FC = () => {
    const [info, setInfo] = useState<any>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        cloud.getShopSettings().then(s => {
            if (s?.company_info) setInfo(s.company_info);
            setLoading(false);
        });
    }, []);

    const handleSave = async () => {
        try {
            await cloud.adminUpdateShopSettings({ company_info: info });
            alert("Informações institucionais salvas!");
        } catch (e: any) { alert(e.message); }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-gray-500"/> Textos Institucionais</h3>
            
            <div>
                <label className="block text-xs font-bold mb-1">Sobre Nós</label>
                <textarea rows={4} className="w-full p-2 border rounded dark:bg-gray-700" value={info.about_text || ''} onChange={e => setInfo({...info, about_text: e.target.value})} />
            </div>
            
            <div>
                <label className="block text-xs font-bold mb-1">Texto Carreiras</label>
                <textarea rows={3} className="w-full p-2 border rounded dark:bg-gray-700" value={info.careers_text || ''} onChange={e => setInfo({...info, careers_text: e.target.value})} />
                <input type="email" placeholder="Email Carreiras" className="w-full p-2 border rounded mt-2 dark:bg-gray-700" value={info.careers_email || ''} onChange={e => setInfo({...info, careers_email: e.target.value})} />
            </div>

            <Button onClick={handleSave} disabled={loading}>Salvar Conteúdo</Button>
        </div>
    );
};

// --- MAIN ADMIN PANEL ---
export const AdminPanel: React.FC<{ activeSubTab: 'dashboard' | 'users' | 'validation' | 'notifications' | 'shop' | 'support' | 'ai_config' | 'fees' | 'pwa' | 'payouts' | 'cities' | 'asaas_webhook' | 'levels' | 'ratings' | 'security' | 'blacklist' | 'referrals' | 'institutional' | 'platform_news' | 'store_finance' | 'wallet_control' | 'claims' }> = ({ activeSubTab }) => {
  const [activeTab, setActiveTab] = useState(activeSubTab);
  
  useEffect(() => {
    setActiveTab(activeSubTab);
  }, [activeSubTab]);

  return (
    <div className="space-y-4 pb-16">
      {activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'validation' && <PartnerVerification />}
      
      {/* Shop Module */}
      {activeTab === 'shop' && <AdminShopModule />}
      
      {activeTab === 'fees' && <GlobalFeesManagement />}
      {activeTab === 'payouts' && <PayoutsManagement />}
      {activeTab === 'cities' && <CityManagement />}
      {activeTab === 'asaas_webhook' && <AsaasWebhookManagement />}
      {activeTab === 'levels' && <PartnerLevelsManagement />}
      
      {/* Wallet Control (Handles 'store_finance' too via mapping if needed, or direct) */}
      {(activeTab === 'wallet_control' || activeTab === 'store_finance') && <AdminWalletControl />}
      
      {activeTab === 'referrals' && <AdminReferrals />}
      
      {/* Content Modules */}
      {activeTab === 'support' && <AdminSupportModule />}
      {activeTab === 'claims' && <AdminSupportModule />} 
      {activeTab === 'blacklist' && <AdminBlacklistModule />}
      {activeTab === 'notifications' && <AdminNotificationsModule />}
      {activeTab === 'platform_news' && <AdminNewsModule />}
      {activeTab === 'ratings' && <AdminRatingsModule />}

      {/* Previously "Under Construction" Modules - NOW IMPLEMENTED */}
      {activeTab === 'ai_config' && <AdminAIConfig />}
      {activeTab === 'pwa' && <AdminPWASettings />}
      {activeTab === 'security' && <AdminSecurity />}
      {activeTab === 'institutional' && <AdminInstitutional />}
    </div>
  );
};
