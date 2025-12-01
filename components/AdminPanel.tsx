
import React, { useState, useEffect } from 'react';
import { Shield, Search, Edit, Trash2, Loader2, UserCheck, UserCog, Settings, Package, Power, PowerOff, X, CheckCircle, AlertTriangle, CreditCard, QrCode, Barcode, Plus, Tag, Headphones, MessageCircle, Phone, Key, Bot, Smartphone, RefreshCw, Banknote, Link2, FileCheck, FileX, ShieldCheck, ShieldOff, Star } from 'lucide-react';
import * as cloud from '../services/cloud';
import { ManagedUser, Product, ShopSettings, Category, Claim, PartnerFeeSettings, PWASettings, PayoutSettings, City, CityRequest, PartnerDocument, PartnerProfile, PartnerLevelBenefit, CompanyInfo, AdminSubTab, BlacklistEntry, FraudAlert, PartnerRating, PlatformNews, AdminWalletUser } from '../types';
import { Button } from './Button';
import { AsaasWebhookManagement } from './AsaasWebhookManagement';
import { AdminDashboard } from './AdminDashboard';
import { AdminReferrals } from './AdminReferrals';
import { ChatWindow } from './ChatWindow';
import { AdminWalletControl } from './AdminWalletControl';
import { Switch } from './Switch';

// --- SHOP MANAGEMENT MODULE ---
const ShopManagement: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'settings'>('products');
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [shopSettings, setShopSettings] = useState<ShopSettings | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [p, c, s] = await Promise.all([
                cloud.adminGetProducts(),
                cloud.adminGetCategories(),
                cloud.getShopSettings()
            ]);
            setProducts(p);
            setCategories(c);
            setShopSettings(s || { id: true, is_shop_enabled: false });
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleSaveProduct = async () => {
        if (!editingProduct?.name || !editingProduct?.price) return alert("Nome e preço são obrigatórios.");
        setIsSaving(true);
        try {
            if (editingProduct.id) await cloud.adminUpdateProduct(editingProduct.id, editingProduct);
            else await cloud.adminAddProduct(editingProduct);
            setEditingProduct(null);
            loadData();
        } catch (e: any) { alert("Erro ao salvar produto: " + e.message); } finally { setIsSaving(false); }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!confirm("Deletar produto?")) return;
        try { await cloud.adminDeleteProduct(id); loadData(); } catch (e: any) { alert("Erro ao deletar: " + e.message); }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try { await cloud.adminAddCategory(newCategoryName); setNewCategoryName(''); loadData(); } catch (e: any) { alert("Erro: " + e.message); }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Deletar categoria?")) return;
        try { await cloud.adminDeleteCategory(id); loadData(); } catch (e: any) { alert("Erro: " + e.message); }
    };

    const handleSaveSettings = async () => {
        if (!shopSettings) return;
        setIsSaving(true);
        try { await cloud.adminUpdateShopSettings(shopSettings); alert("Configurações salvas!"); } catch (e: any) { alert("Erro: " + e.message); } finally { setIsSaving(false); }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                <button onClick={() => setActiveTab('products')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'products' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Produtos</button>
                <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'categories' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Categorias</button>
                <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'settings' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Configurações</button>
            </div>

            {activeTab === 'products' && (
                <div className="space-y-4">
                    <div className="flex justify-end"><Button onClick={() => setEditingProduct({ is_active: true })}><Plus className="w-4 h-4 mr-2"/> Novo Produto</Button></div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-3">Nome</th>
                                    <th className="px-4 py-3">Preço</th>
                                    <th className="px-4 py-3">Estoque</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map(p => (
                                    <tr key={p.id} className="border-b dark:border-gray-700">
                                        <td className="px-4 py-3 font-bold dark:text-white">{p.name}</td>
                                        <td className="px-4 py-3">R$ {p.price.toFixed(2)}</td>
                                        <td className="px-4 py-3">{p.stock_quantity ?? '-'}</td>
                                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-bold ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.is_active ? 'Ativo' : 'Inativo'}</span></td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-2"><button onClick={() => setEditingProduct(p)} className="p-2 text-blue-500"><Edit className="w-4 h-4"/></button><button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-red-500"><Trash2 className="w-4 h-4"/></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'categories' && (
                <div className="space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-2"><input type="text" placeholder="Nova Categoria" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"/><Button onClick={handleAddCategory}>Adicionar</Button></div>
                    <div className="space-y-2">{categories.map(c => (<div key={c.id} className="flex justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700"><span className="font-bold dark:text-white">{c.name}</span><button onClick={() => handleDeleteCategory(c.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button></div>))}</div>
                </div>
            )}

            {activeTab === 'settings' && shopSettings && (
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"><div><h4 className="font-bold dark:text-white">Status da Loja</h4><p className="text-xs text-gray-500">Defina se a loja está aberta.</p></div><Switch checked={shopSettings.is_shop_enabled || false} onChange={c => setShopSettings({...shopSettings, is_shop_enabled: c})} /></div>
                    <Button onClick={handleSaveSettings} disabled={isSaving} fullWidth>{isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Salvar Configurações'}</Button>
                </div>
            )}

            {editingProduct && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-lg dark:text-white">{editingProduct.id ? 'Editar Produto' : 'Novo Produto'}</h3><button onClick={() => setEditingProduct(null)}><X className="w-5 h-5"/></button></div>
                        <input type="text" placeholder="Nome" value={editingProduct.name || ''} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <input type="number" step="0.01" placeholder="Preço" value={editingProduct.price || ''} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        <div className="flex gap-3 pt-4"><Button variant="outline" onClick={() => setEditingProduct(null)} fullWidth>Cancelar</Button><Button onClick={handleSaveProduct} disabled={isSaving} fullWidth>{isSaving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Salvar'}</Button></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const PartnerVerification: React.FC = () => {
    const [partners, setPartners] = useState<ManagedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPartner, setSelectedPartner] = useState<ManagedUser | null>(null);
    const [partnerDetails, setPartnerDetails] = useState<{ profile: PartnerProfile, documents: PartnerDocument[] } | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);

    useEffect(() => { loadPendingPartners(); }, []);

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
                        <tr><th className="px-4 py-3">Parceiro</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Data</th><th className="px-4 py-3"></th></tr>
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
                        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center"><h3 className="font-bold dark:text-white">Análise: {selectedPartner.name}</h3><button onClick={() => setSelectedPartner(null)}><X /></button></div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            {detailLoading ? <Loader2 className="animate-spin mx-auto"/> : (
                                <>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-2"><p><strong>Veículo:</strong> {partnerDetails?.profile.vehicle_type}</p><p><strong>Placa:</strong> {partnerDetails?.profile.vehicle_plate || 'N/A'}</p></div>
                                    <div className="flex gap-2"><Button onClick={() => handleUpdatePartnerStatus(selectedPartner.id, 'APPROVED')} variant="success"><ShieldCheck className="w-4 h-4 mr-2"/> Aprovar Cadastro</Button><Button onClick={() => handleUpdatePartnerStatus(selectedPartner.id, 'BLOCKED')} variant="danger"><ShieldOff className="w-4 h-4 mr-2"/> Bloquear Parceiro</Button></div>
                                    {partnerDetails?.documents.map(doc => (
                                        <div key={doc.id} className="p-3 border dark:border-gray-700 rounded-lg flex items-center justify-between"><div><p className="font-bold text-sm dark:text-white">{doc.document_type}</p><a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline">Ver anexo</a>{doc.admin_notes && <p className="text-xs text-red-500 italic">Obs: {doc.admin_notes}</p>}</div><div className="flex items-center gap-2"><span className={`text-xs font-bold px-2 py-1 rounded-full ${doc.status === 'APPROVED' ? 'bg-green-100 text-green-600' : doc.status === 'REJECTED' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>{doc.status}</span><button onClick={() => handleUpdateDocStatus(doc.id, 'APPROVED')} className="p-2 bg-green-100 hover:bg-green-200 rounded"><FileCheck className="w-4 h-4 text-green-600"/></button><button onClick={() => handleUpdateDocStatus(doc.id, 'REJECTED')} className="p-2 bg-red-100 hover:bg-red-200 rounded"><FileX className="w-4 h-4 text-red-600"/></button></div></div>
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
        try { await cloud.adminAddCity(newName, newState); setNewName(''); setNewState(''); loadData(); } catch (e: any) { alert("Erro: " + e.message); }
    };

    const handleToggleStatus = async (city: City) => {
        if (!confirm(`Tem certeza que deseja ${city.is_active ? "desativar" : "ativar"} a cidade ${city.name}?`)) return;
        try { await cloud.adminUpdateCityStatus(city.id, !city.is_active); loadData(); } catch (e: any) { alert("Erro: " + e.message); }
    };

    const openEditModal = (city: City) => { setEditingCity(city); setEditName(city.name); setEditState(city.state); };
    const handleSaveChanges = async () => { if (!editingCity || !editName || !editState) return; try { await cloud.adminEditCity(editingCity.id, editName, editState); setEditingCity(null); loadData(); } catch (e: any) { alert("Erro ao editar: " + e.message); } };
    const handleProcessRequest = async (id: string, status: 'APPROVED' | 'REJECTED') => { try { await cloud.adminProcessCityRequest(id, status); loadData(); } catch (e: any) { alert("Erro: " + e.message); } };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-4 w-fit">
                <button onClick={() => setActiveTab('cities')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'cities' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Cidades Ativas</button>
                <button onClick={() => setActiveTab('requests')} className={`px-4 py-2 rounded-lg text-sm font-bold ${activeTab === 'requests' ? 'bg-white dark:bg-gray-700 shadow text-brand-600' : 'text-gray-500'}`}>Solicitações</button>
            </div>
            {activeTab === 'cities' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex gap-3 items-center"><input type="text" placeholder="Cidade" value={newName} onChange={e => setNewName(e.target.value)} className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /><input type="text" placeholder="UF" maxLength={2} value={newState} onChange={e => setNewState(e.target.value.toUpperCase())} className="w-20 p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /><Button onClick={handleAddCity} className="whitespace-nowrap px-4"><Plus className="w-4 h-4 mr-2"/> Adicionar</Button></div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <table className="w-full text-sm text-left"><thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody>{cities.map(city => (<tr key={city.id} className="border-b border-gray-100 dark:border-gray-700 last:border-0"><td className="px-4 py-3 font-bold dark:text-white">{city.name}</td><td className="px-4 py-3">{city.state}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-bold ${city.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300'}`}>{city.is_active ? 'Ativa' : 'Inativa'}</span></td><td className="px-4 py-3 text-right flex items-center justify-end gap-2"><button onClick={() => openEditModal(city)} className="text-blue-500 hover:bg-blue-50 p-2 rounded"><Edit className="w-4 h-4"/></button><button onClick={() => handleToggleStatus(city)} className={`${city.is_active ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'} p-2 rounded`}>{city.is_active ? <PowerOff className="w-4 h-4"/> : <Power className="w-4 h-4"/>}</button></td></tr>))}</tbody></table>
                    </div>
                </div>
            )}
            {activeTab === 'requests' && (
                <div className="space-y-4">
                    {requests.length === 0 && <p className="text-gray-400 text-center">Nenhuma solicitação pendente.</p>}
                    {requests.map(req => (<div key={req.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 flex justify-between items-center"><div><div className="font-bold text-lg dark:text-white">{req.city_name} - {req.state}</div><div className="text-xs text-gray-500">{req.user_email || 'Anônimo'} • {req.status}</div></div>{req.status === 'PENDING' && (<div className="flex gap-2"><button onClick={() => handleProcessRequest(req.id, 'APPROVED')} className="bg-green-100 text-green-600 p-2 rounded hover:bg-green-200"><CheckCircle className="w-5 h-5"/></button><button onClick={() => handleProcessRequest(req.id, 'REJECTED')} className="bg-red-100 text-red-600 p-2 rounded hover:bg-red-200"><X className="w-5 h-5"/></button></div>)}</div>))}
                </div>
            )}
            {editingCity && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-xl p-6 space-y-4"><h3 className="font-bold dark:text-white">Editar Cidade</h3><input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /><input type="text" value={editState} onChange={e => setEditState(e.target.value.toUpperCase())} maxLength={2} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600" /><div className="flex gap-3"><Button variant="outline" onClick={() => setEditingCity(null)} fullWidth>Cancelar</Button><Button onClick={handleSaveChanges} fullWidth>Salvar</Button></div></div></div>
            )}
        </div>
    );
};

const PayoutsManagement: React.FC = () => {
    const [settings, setSettings] = useState<PayoutSettings | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadData(); }, []);
    const loadData = async () => { setLoading(true); try { const s = await cloud.adminGetPayoutSettings(); setSettings(s); const h = await cloud.adminGetPayoutHistory(); setHistory(h || []); } catch (e) { console.error(e); } finally { setLoading(false); } };
    const handleSaveSettings = async () => { if (!settings) return; setSaving(true); try { await cloud.adminUpdatePayoutSettings(settings); alert("Configurações de repasse atualizadas!"); } catch (e: any) { alert("Erro: " + e.message); } finally { setSaving(false); } };

    if (loading) return <Loader2 className="w-8 h-8 animate-spin mx-auto my-10 text-brand-500"/>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700"><h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><Settings className="w-5 h-5 text-gray-500"/> Regras de Repasse</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"><div><label className="text-xs font-bold text-gray-500 uppercase">Dia da Semana (1-7)</label><select value={settings?.weekday} onChange={e => setSettings(prev => prev ? {...prev, weekday: parseInt(e.target.value)} : null)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"><option value="1">Segunda-feira</option><option value="2">Terça-feira</option><option value="3">Quarta-feira</option><option value="4">Quinta-feira</option><option value="5">Sexta-feira</option></select></div><div><label className="text-xs font-bold text-gray-500 uppercase">Horário (Ex: 10:00)</label><input type="time" value={settings?.hour} onChange={e => setSettings(prev => prev ? {...prev, hour: e.target.value} : null)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"/></div><div><label className="text-xs font-bold text-gray-500 uppercase">Limite Saque Emergencial (%)</label><input type="number" value={settings?.emergency_percentage} onChange={e => setSettings(prev => prev ? {...prev, emergency_percentage: parseInt(e.target.value)} : null)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"/></div><div><label className="text-xs font-bold text-gray-500 uppercase">Cooldown (Horas)</label><input type="number" value={settings?.emergency_cooldown_hours} onChange={e => setSettings(prev => prev ? {...prev, emergency_cooldown_hours: parseInt(e.target.value)} : null)} className="w-full p-2 bg-gray-50 dark:bg-gray-700 rounded-lg mt-1"/></div></div><div className="flex items-center gap-2 mb-4"><input type="checkbox" checked={settings?.emergency_enabled} onChange={e => setSettings(prev => prev ? {...prev, emergency_enabled: e.target.checked} : null)} className="w-5 h-5 rounded text-brand-600"/><span className="text-sm font-bold dark:text-white">Permitir Saque Emergencial</span></div><Button onClick={handleSaveSettings} disabled={saving} fullWidth>{saving ? 'Salvando...' : 'Salvar Regras'}</Button></div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700"><h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><Banknote className="w-5 h-5 text-green-500"/> Histórico de Repasses</h3><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-700"><tr><th className="px-4 py-3">Parceiro</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Data</th></tr></thead><tbody>{history.map(h => (<tr key={h.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-4 py-3 font-medium dark:text-white">{h.partner_email}</td><td className="px-4 py-3 font-bold text-green-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(h.amount)}</td><td className="px-4 py-3">{h.is_emergency ? <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold">EMERGÊNCIA</span> : <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">SEMANAL</span>}</td><td className="px-4 py-3">{h.status}</td><td className="px-4 py-3 text-gray-500">{new Date(h.created_at).toLocaleDateString()}</td></tr>))}</tbody></table></div></div>
        </div>
    );
};

const PartnerLevelsManagement: React.FC = () => {
    const [levels, setLevels] = useState<PartnerLevelBenefit[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => { loadLevels(); }, []);
    const loadLevels = async () => { setLoading(true); try { const data = await cloud.adminGetPartnerLevels(); setLevels(data); } catch (e) { console.error(e); alert("Erro ao carregar níveis."); } finally { setLoading(false); } };
    const handleUpdate = (levelName: string, field: keyof PartnerLevelBenefit, value: string) => { setLevels(prev => prev.map(l => { if (l.level === levelName) { if (field === 'display_name' || field === 'level') { return { ...l, [field]: value }; } else { return { ...l, [field]: parseFloat(value) || 0 }; } } return l; })); };
    const handleSave = async () => { setSaving(true); try { await Promise.all(levels.map(level => cloud.adminUpdatePartnerLevel(level))); alert("Níveis de parceiro salvos com sucesso!"); } catch (e: any) { alert("Erro ao salvar: " + e.message); } finally { setSaving(false); } };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <h3 className="font-bold text-lg dark:text-white mb-4 flex items-center gap-2"><Star className="w-5 h-5 text-yellow-400" /> Gerenciar Níveis</h3>
                <div className="space-y-4">
                    {levels.map(level => (
                        <div key={level.level} className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-700/30">
                            <h4 className="font-bold text-md text-brand-600 dark:text-brand-400 mb-3">{level.level}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-1 md:col-span-2"><label className="text-xs font-bold text-gray-500">Nome de Exibição</label><input type="text" value={level.display_name} onChange={e => handleUpdate(level.level, 'display_name', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border rounded-lg text-sm mt-1" /></div>
                                <div><label className="text-xs font-bold text-gray-500">Mínimo Entregas</label><input type="number" value={level.min_deliveries} onChange={e => handleUpdate(level.level, 'min_deliveries', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border rounded-lg text-sm mt-1" /></div>
                                <div><label className="text-xs font-bold text-gray-500">Mínimo Avaliação</label><input type="number" step="0.1" value={level.min_rating} onChange={e => handleUpdate(level.level, 'min_rating', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border rounded-lg text-sm mt-1" /></div>
                                <div><label className="text-xs font-bold text-gray-500">Desconto Lojista (%)</label><input type="number" step="0.1" value={level.store_discount_percent} onChange={e => handleUpdate(level.level, 'store_discount_percent', e.target.value)} className="w-full p-2 bg-white dark:bg-gray-700 border rounded-lg text-sm mt-1" /></div>
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

const FeesManagement: React.FC = () => {
    const [fees, setFees] = useState<PartnerFeeSettings | null>(null);
    useEffect(() => { cloud.adminGetFeeSettings().then(setFees); }, []);
    const save = async () => { if(fees) { await cloud.adminUpdateFeeSettings(fees); alert('Taxas atualizadas'); } };
    if (!fees) return <Loader2 className="animate-spin"/>;
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700 space-y-4">
            <h3 className="font-bold dark:text-white">Taxas Globais</h3>
            <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs">Taxa Fixa (R$)</label><input type="number" value={fees.global_tax_fixed} onChange={e => setFees({...fees, global_tax_fixed: +e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/></div>
                <div><label className="text-xs">Taxa Variável (%)</label><input type="number" value={fees.global_tax_percent} onChange={e => setFees({...fees, global_tax_percent: +e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/></div>
                <div><label className="text-xs">Valor Base Entrega</label><input type="number" value={fees.base_delivery_value} onChange={e => setFees({...fees, base_delivery_value: +e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/></div>
                <div><label className="text-xs">KM Base</label><input type="number" value={fees.base_delivery_km} onChange={e => setFees({...fees, base_delivery_km: +e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/></div>
            </div>
            <Button onClick={save} fullWidth>Salvar Taxas</Button>
        </div>
    );
};

const UserManagement: React.FC = () => {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [search, setSearch] = useState('');
    useEffect(() => { cloud.getAllUsers().then(setUsers); }, []);
    const filtered = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
    const handleRoleChange = async (id: string, role: string) => { await cloud.updateUserRole(id, role); alert('Papel atualizado'); };
    return (
        <div className="space-y-4">
            <input placeholder="Buscar usuário..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 border rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:text-white"/>
            <div className="space-y-2">
                {filtered.slice(0, 50).map(u => (
                    <div key={u.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 flex justify-between items-center">
                        <div><p className="font-bold dark:text-white">{u.name || 'Sem nome'}</p><p className="text-xs text-gray-500">{u.email} • {u.role}</p></div>
                        <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:text-white"><option value="USER">User</option><option value="STORE_PARTNER">Store</option><option value="DELIVERY_PARTNER">Driver</option><option value="ADMIN">Admin</option></select>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BlacklistManagement: React.FC = () => {
    const [list, setList] = useState<BlacklistEntry[]>([]);
    const [newEntry, setNewEntry] = useState({ email: '', phone: '', reason: '' });
    useEffect(() => { cloud.adminGetBlacklist().then(setList); }, []);
    const add = async () => { if (!newEntry.reason) return; await cloud.adminAddToBlacklist(newEntry.email, newEntry.phone, newEntry.reason); setNewEntry({ email: '', phone: '', reason: '' }); setList(await cloud.adminGetBlacklist()); };
    const remove = async (id: string) => { await cloud.adminRemoveFromBlacklist(id); setList(await cloud.adminGetBlacklist()); };
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border dark:border-gray-700 space-y-3">
                <h4 className="font-bold dark:text-white">Adicionar à Lista Negra</h4>
                <input placeholder="Email" value={newEntry.email} onChange={e => setNewEntry({...newEntry, email: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/>
                <input placeholder="Telefone" value={newEntry.phone} onChange={e => setNewEntry({...newEntry, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/>
                <input placeholder="Motivo" value={newEntry.reason} onChange={e => setNewEntry({...newEntry, reason: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/>
                <Button onClick={add} fullWidth variant="danger">Bloquear</Button>
            </div>
            <div className="space-y-2">{list.map(l => (<div key={l.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex justify-between items-center"><div><p className="font-bold text-red-700 dark:text-red-300">{l.email || l.phone_number}</p><p className="text-xs text-red-600">{l.reason}</p></div><button onClick={() => remove(l.id)}><Trash2 className="w-4 h-4 text-red-500"/></button></div>))}</div>
        </div>
    );
};

const SecurityMonitor: React.FC = () => {
    const [alerts, setAlerts] = useState<FraudAlert[]>([]);
    useEffect(() => { cloud.adminGetFraudAlerts().then(setAlerts); }, []);
    return (
        <div className="space-y-3">
            {alerts.length === 0 && <p className="text-center text-gray-500">Nenhum alerta de segurança.</p>}
            {alerts.map(a => (<div key={a.id} className="p-4 bg-white dark:bg-gray-800 border-l-4 border-red-500 rounded-r-xl shadow-sm"><p className="font-bold text-red-600">{a.type}</p><p className="text-sm dark:text-white">{a.description}</p><p className="text-xs text-gray-500 mt-1">{a.user_email} • {new Date(a.created_at).toLocaleString()}</p></div>))}
        </div>
    );
};

const RatingMonitor: React.FC = () => {
    const [ratings, setRatings] = useState<PartnerRating[]>([]);
    useEffect(() => { cloud.adminGetAllRatings().then(setRatings); }, []);
    return (
        <div className="space-y-3">
            {ratings.map(r => (<div key={r.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700"><div className="flex justify-between"><span className="font-bold dark:text-white">{r.evaluator_name} -> {r.evaluated_name}</span><span className="text-yellow-500 font-bold flex items-center gap-1"><Star className="w-3 h-3 fill-current"/> {r.rating}</span></div>{r.comment && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">"{r.comment}"</p>}</div>))}
        </div>
    );
};

const ClaimsManagement: React.FC = () => {
    const [claims, setClaims] = useState<Claim[]>([]);
    useEffect(() => { cloud.adminGetClaims().then(setClaims); }, []);
    const resolve = async (id: string) => { const resp = prompt("Resposta:"); if (resp) { await cloud.adminResolveClaim(id, resp); setClaims(await cloud.adminGetClaims()); } };
    return (
        <div className="space-y-3">
            {claims.map(c => (<div key={c.id} className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700"><div className="flex justify-between"><span className="font-bold dark:text-white">{c.type}</span><span className={`text-xs px-2 py-1 rounded ${c.status === 'open' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{c.status}</span></div><p className="text-sm mt-2 dark:text-gray-300">{c.description}</p><p className="text-xs text-gray-500 mt-1">{c.user_email}</p>{c.status === 'open' && <Button size="sm" onClick={() => resolve(c.id)} className="mt-2">Responder</Button>}</div>))}
        </div>
    );
};

const NewsManagement: React.FC = () => {
    const [news, setNews] = useState<PlatformNews[]>([]);
    const [form, setForm] = useState({ title: '', description: '', icon_name: 'Bell' });
    useEffect(() => { cloud.adminGetPlatformNews().then(setNews); }, []);
    const add = async () => { await cloud.adminUpsertPlatformNews({ ...form, is_active: true }); setNews(await cloud.adminGetPlatformNews()); setForm({ title: '', description: '', icon_name: 'Bell' }); };
    const remove = async (id: string) => { await cloud.adminDeletePlatformNews(id); setNews(await cloud.adminGetPlatformNews()); };
    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl space-y-3 border dark:border-gray-700"><input placeholder="Título" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/><textarea placeholder="Descrição" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/><Button onClick={add} fullWidth>Publicar Novidade</Button></div>
            <div className="space-y-2">{news.map(n => (<div key={n.id} className="p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg flex justify-between"><div><p className="font-bold dark:text-white">{n.title}</p><p className="text-sm text-gray-500">{n.description}</p></div><button onClick={() => remove(n.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button></div>))}</div>
        </div>
    );
};

const SupportThreads: React.FC = () => {
    const [threads, setThreads] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [chatOpen, setChatOpen] = useState(false);
    useEffect(() => { cloud.adminGetSupportThreads().then(setThreads); }, []);
    const openChat = (userId: string) => { setSelectedUser(userId); setChatOpen(true); };
    return (
        <div className="space-y-2">
            {threads.map(t => (<div key={t.userId} onClick={() => openChat(t.userId)} className="p-4 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"><p className="font-bold dark:text-white">{t.userName} <span className="text-xs font-normal text-gray-500">({t.userRole})</span></p><p className="text-sm text-gray-600 dark:text-gray-300 truncate">{t.lastMessage}</p><p className="text-xs text-gray-400 mt-1">{new Date(t.lastDate).toLocaleString()}</p></div>))}
            {chatOpen && selectedUser && <ChatWindow type="SUPPORT" onClose={() => setChatOpen(false)} title="Suporte ao Usuário" adminTargetUserId={selectedUser}/>}
        </div>
    );
};

const InstitutionalManagement: React.FC = () => {
    const [info, setInfo] = useState<CompanyInfo>({});
    useEffect(() => { cloud.getShopSettings().then(s => setInfo(s?.company_info || {})); }, []);
    const save = async () => { await cloud.adminUpdateShopSettings({ company_info: info }); alert('Salvo!'); };
    return (
        <div className="space-y-4 bg-white dark:bg-gray-800 p-6 rounded-xl border dark:border-gray-700">
            <h3 className="font-bold dark:text-white">Dados Institucionais</h3>
            <textarea placeholder="Sobre Nós" value={info.about_text || ''} onChange={e => setInfo({...info, about_text: e.target.value})} className="w-full p-2 border rounded h-24 dark:bg-gray-700"/>
            <input placeholder="Email Contato" value={info.contact_support_email || ''} onChange={e => setInfo({...info, contact_support_email: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700"/>
            <Button onClick={save} fullWidth>Salvar Informações</Button>
        </div>
    );
};

const AIConfig: React.FC = () => {
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const settings = await cloud.getShopSettings();
                if (settings?.google_gemini_api_key) {
                    setApiKey(settings.google_gemini_api_key);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await cloud.adminUpdateShopSettings({ google_gemini_api_key: apiKey });
            alert("Configurações de IA salvas no banco de dados!");
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold dark:text-white flex items-center gap-2"><Bot className="w-5 h-5 text-purple-500"/> Inteligência Artificial</h3>
                <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold rounded-full">Gemini Powered</div>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/10 rounded-xl border border-purple-100 dark:border-purple-800/30 mb-4">
                <p className="text-sm text-purple-800 dark:text-purple-300">
                    O <strong>Chat Assistente</strong> utiliza a API do Google Gemini para responder dúvidas dos usuários. 
                    A chave abaixo é armazenada de forma segura no banco de dados.
                </p>
            </div>

            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Google Gemini API Key</label>
                <div className="relative">
                    <input 
                        type={isVisible ? "text" : "password"} 
                        value={apiKey} 
                        onChange={e => setApiKey(e.target.value)} 
                        className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-sm pr-10"
                        placeholder="sk-..."
                    />
                    <button 
                        onClick={() => setIsVisible(!isVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <Key className="w-4 h-4"/>
                    </button>
                </div>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">Obtenha sua chave no Google AI Studio.</p>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button onClick={handleSave} disabled={saving} fullWidth className="bg-purple-600 hover:bg-purple-700 text-white">
                    {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Salvar Chave de API'}
                </Button>
            </div>
        </div>
    );
};

const PWASettingsPanel: React.FC = () => {
    const [settings, setSettings] = useState<PWASettings>({
        display_name: 'Zé Entregas',
        short_name: 'Zé',
        theme_color: '#ed2b05',
        background_color: '#f9fafb',
        start_url: '/',
        orientation: 'portrait',
        language: 'pt-BR',
        app_version: 1
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await cloud.adminGetPWASettings();
                if (data) setSettings(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await cloud.adminUpdatePWASettings(settings);
            alert("Configurações do PWA atualizadas!");
        } catch (e: any) {
            alert("Erro: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-500" /></div>;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 animate-in fade-in space-y-4">
            <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2"><Smartphone className="w-5 h-5 text-green-500"/> Configuração do App (PWA)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Nome do App</label><input type="text" value={settings.display_name} onChange={e => setSettings({...settings, display_name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Nome Curto (Ícone)</label><input type="text" value={settings.short_name} onChange={e => setSettings({...settings, short_name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"/></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Cor do Tema (Hex)</label><div className="flex gap-2"><input type="color" value={settings.theme_color} onChange={e => setSettings({...settings, theme_color: e.target.value})} className="h-10 w-10 p-0 border-0 rounded"/><input type="text" value={settings.theme_color} onChange={e => setSettings({...settings, theme_color: e.target.value})} className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase"/></div></div>
                <div><label className="block text-xs font-bold text-gray-500 mb-1">Cor de Fundo (Hex)</label><div className="flex gap-2"><input type="color" value={settings.background_color} onChange={e => setSettings({...settings, background_color: e.target.value})} className="h-10 w-10 p-0 border-0 rounded"/><input type="text" value={settings.background_color} onChange={e => setSettings({...settings, background_color: e.target.value})} className="flex-1 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white uppercase"/></div></div>
            </div>
            <Button onClick={handleSave} disabled={saving} fullWidth>{saving ? <Loader2 className="w-5 h-5 animate-spin"/> : 'Publicar Alterações'}</Button>
        </div>
    );
};

export const AdminPanel: React.FC<{ activeSubTab: AdminSubTab }> = ({ activeSubTab }) => {
  const [activeTab, setActiveTab] = useState(activeSubTab);
  
  useEffect(() => {
    setActiveTab(activeSubTab);
  }, [activeSubTab]);

  return (
    <div className="space-y-4 pb-16">
      {activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'ai_config' && <AIConfig />}
      {activeTab === 'shop' && <ShopManagement />}
      {activeTab === 'support' && <SupportThreads />}
      {activeTab === 'claims' && <ClaimsManagement />}
      {activeTab === 'fees' && <FeesManagement />}
      {activeTab === 'pwa' && <PWASettingsPanel />}
      {activeTab === 'payouts' && <PayoutsManagement />}
      {activeTab === 'cities' && <CityManagement />}
      {activeTab === 'asaas_webhook' && <AsaasWebhookManagement />}
      {activeTab === 'levels' && <PartnerLevelsManagement />}
      {activeTab === 'ratings' && <RatingMonitor />}
      {activeTab === 'security' && <SecurityMonitor />}
      {activeTab === 'blacklist' && <BlacklistManagement />}
      {activeTab === 'referrals' && <AdminReferrals />}
      {activeTab === 'institutional' && <InstitutionalManagement />}
      {activeTab === 'platform_news' && <NewsManagement />}
      {activeTab === 'store_finance' && <div className="text-center text-gray-500">Financeiro Lojista (Use Controle de Saldo)</div>}
      {activeTab === 'wallet_control' && <AdminWalletControl />}
      {activeTab === 'users' && <UserManagement />}
      {activeTab === 'validation' && <PartnerVerification />}
      {activeTab === 'notifications' && <div className="text-center text-gray-500">Gestão de Notificações (Em Breve)</div>}
    </div>
  );
};
