import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, FileCheck, Edit2, Save } from 'lucide-react';
import { AdminSubTab } from '../types';
import { SectionErrorBoundary } from './SectionErrorBoundary';
import { BaseModal } from './BaseModal';
import { CustomInput } from './CustomInput';
import { CustomSelect } from './CustomSelect';
import { useNotification } from '../contexts/NotificationContext';

// Admin Sub-Components
import { AdminDashboard } from './AdminDashboard';
import { AdminStores } from './AdminStores';
import { AdminNotifications } from './AdminNotifications';
import { AdminShopManagement } from './AdminShopManagement';
import { AdminClaims } from './AdminClaims';
import { AdminApiKeysUnified } from './AdminApiKeysUnified';
import { AdminInfinitePayConfig } from './AdminInfinitePayConfig';
import { AdminFees } from './AdminFees';
import { AdminPWASettings } from './AdminPWASettings';
import { AdminRatings } from './AdminRatings';
import { SecurityManagement } from './SecurityManagement';
import { AdminBlacklist } from './AdminBlacklist';
import { AdminReferrals } from './AdminReferrals';
import { AdminInstitutionalContent } from './AdminInstitutionalContent';
import { AdminPlatformNews } from './AdminPlatformNews';
import { AdminBetaNews } from './AdminBetaNews';
import { AdminStoreFinance } from './AdminStoreFinance';
import { AdminStoreOrders } from './AdminStoreOrders';
import { AdminWalletControl } from './AdminWalletControl';
import { AdminMaintenance } from './AdminMaintenance';
import { AdminPartnerLevels } from './AdminPartnerLevels';
import { AdminPayouts } from './AdminPayouts';
import { AdminLoanConfig } from './AdminLoanConfig';
import { AdminInvestments } from './AdminInvestments';
import { AdminSlides } from './AdminSlides';
import { AdminCityBanners } from './AdminCityBanners';
import { AdminTips } from './AdminTips';
import { AdminScoreConfig } from './AdminScoreConfig';
import { AdminPaymentGateways } from './AdminPaymentGateways';
import { AdminMercadoPagoConfig } from './AdminMercadoPagoConfig';
import { AdminPixConfig } from './AdminPixConfig';
import { AdminBaseCatalog } from './AdminBaseCatalog';
import { AdminStoreCategories } from './AdminStoreCategories';
import { AdminMediation } from './AdminMediation';
import { AdminStoreRatings } from './AdminStoreRatings';
import { AdminBonusCampaigns } from './AdminBonusCampaigns';
import { AdminDeliveryBreaks } from './AdminDeliveryBreaks';
import { AdminFixedDrivers } from './AdminFixedDrivers';

// Imports com caminhos específicos corrigidos
import { MapaLocalizacao } from '../pages/admin/MapaLocalizacao';
import { AdminImageGallery } from './Admin/AdminImageGallery';
import { CitiesAndDistricts } from '../pages/admin/CitiesAndDistricts';
import { StreetRequestsAdmin } from '../src/pages/StreetRequestsAdmin';

// --- REAL MODULES ---

const getRoleLabel = (role: string) => {
    switch (role?.toLowerCase()) {
        case 'admin': return 'Administrador';
        case 'store_partner': return 'Loja / Parceiro';
        case 'super_store_partner': return 'Franquia / Super Loja';
        case 'delivery_person': return 'Motoboy';
        case 'delivery_partner': return 'Entregador de Frota';
        case 'collaborator': return 'Colaborador';
        case 'user': return 'Cliente (Comum)';
        default: return role || '-';
    }
};

const UserManagement: React.FC = () => {
    const { t } = useTranslation();
    const [users, setUsers] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');
    const [editingUser, setEditingUser] = React.useState<any | null>(null);
    const [saving, setSaving] = React.useState(false);
    const { showNotification } = useNotification();

    React.useEffect(() => {
        loadUsers();
    }, []);

    const handleSaveUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        try {
            setSaving(true);
            const updates = {
                name: editingUser.name,
                email: editingUser.email,
                phone_number: editingUser.phone_number,
                cpf: editingUser.cpf,
                role: editingUser.role,
                status: editingUser.status
            };
            const { adminUpdateUserProfile } = await import('../services/cloud');
            const res = await adminUpdateUserProfile(editingUser.id, updates);
            if (res.success) {
                showNotification('Usuário atualizado com sucesso!', 'success');
                setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...updates } : u));
                setEditingUser(null);
            } else {
                showNotification('Erro ao atualizar usuário.', 'error');
            }
        } catch (err) {
            showNotification('Erro interno.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const loadUsers = async () => {
        try {
            setLoading(true);
            const { getAllUsers } = await import('../services/cloud');
            const data = await getAllUsers();
            setUsers(data || []);
        } catch (e) {
            console.error('Erro ao carregar usuários:', e);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone_number?.includes(search)
    );

    if (loading) return <div className="p-10 text-center"><div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-4"></div>{t('admin.loadingUsers')}</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{t('admin.allUsers')}</h2>
                <div className="flex gap-2">
                   <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por nome, email ou tel..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-4 pr-10 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg outline-none text-sm w-64 md:w-80 dark:text-white"
                        />
                   </div>
                   <button onClick={loadUsers} className="p-2 bg-brand-50 text-brand-600 rounded-lg hover:bg-brand-100"><Users className="w-5 h-5" /></button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase">
                            <tr>
                                <th className="px-6 py-4">{t('admin.user')}</th>
                                <th className="px-6 py-4">{t('admin.contact')}</th>
                                <th className="px-6 py-4">{t('admin.profile')}</th>
                                <th className="px-6 py-4">{t('admin.status')}</th>
                                <th className="px-6 py-4">{t('admin.registration')}</th>
                                <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 font-bold">
                                                {user.name?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white line-clamp-1">{user.name}</p>
                                                <p className="text-xs text-gray-400 font-medium">CPF: {user.cpf || '-'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-900 dark:text-white font-medium">{user.phone_number}</p>
                                        <p className="text-xs text-gray-400 font-medium">{user.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full uppercase">
                                            {getRoleLabel(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                                            user.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                            user.status === 'blocked' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                                            user.status === 'suspended' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {user.status === 'active' ? 'Ativo' : user.status === 'blocked' ? 'Bloqueado' : user.status === 'suspended' ? 'Suspenso' : user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => setEditingUser(user)}
                                            className="p-2 text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Edição */}
            <BaseModal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Editar Cadastro de Usuário">
                {editingUser && (
                    <form onSubmit={handleSaveUser} className="space-y-[15px] p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CustomInput
                                label="Nome Completo"
                                value={editingUser.name || ''}
                                onChange={val => setEditingUser({ ...editingUser, name: val })}
                                required
                            />
                            <CustomInput
                                label="Endereço de Email"
                                type="email"
                                value={editingUser.email || ''}
                                onChange={val => setEditingUser({ ...editingUser, email: val })}
                                required
                            />
                            <CustomInput
                                label="Telefone de Contato"
                                value={editingUser.phone_number || ''}
                                onChange={val => setEditingUser({ ...editingUser, phone_number: val })}
                                required
                            />
                            <CustomInput
                                label="Número de CPF"
                                value={editingUser.cpf || ''}
                                onChange={val => setEditingUser({ ...editingUser, cpf: val })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <CustomSelect
                                label="Função (Perfil)"
                                value={editingUser.role || 'user'}
                                onChange={val => setEditingUser({ ...editingUser, role: val })}
                                options={[
                                    { value: 'user', label: 'Cliente (Usuário)' },
                                    { value: 'delivery_person', label: 'Motoboy' },
                                    { value: 'delivery_partner', label: 'Entregador Externo / Outros' },
                                    { value: 'store_partner', label: 'Estabelecimento / Loja' },
                                    { value: 'super_store_partner', label: 'Super Loja / Franquia' },
                                    { value: 'admin', label: 'Administrador Global' },
                                    { value: 'collaborator', label: 'Colaborador Local' },
                                ]}
                            />
                            <CustomSelect
                                label="Situação de Acesso"
                                value={editingUser.status || 'active'}
                                onChange={val => setEditingUser({ ...editingUser, status: val })}
                                options={[
                                    { value: 'active', label: 'Usuário Ativo (Normal)' },
                                    { value: 'blocked', label: 'Bloqueado / Excluído' },
                                    { value: 'pending', label: 'Aguardando Validação' },
                                    { value: 'suspended', label: 'Suspensão de Uso' },
                                ]}
                            />
                        </div>

                        <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 mt-6">
                            <button
                                type="button"
                                onClick={() => setEditingUser(null)}
                                className="px-6 py-2 rounded-xl text-gray-500 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                            >
                                {t('admin.cancelAndClose')}
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 rounded-xl bg-brand-600 text-white font-bold hover:bg-brand-700 flex items-center gap-2 disabled:opacity-50 transition"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                                        <span>{t('admin.processing')}</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>{t('admin.confirmEdit')}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </BaseModal>
        </div>
    );
};

const PartnerVerification: React.FC = () => {
    const { t } = useTranslation();
    const [pending, setPending] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        loadPending();
    }, []);

    const loadPending = async () => {
        try {
            setLoading(true);
            const { getPendingVerifications } = await import('../services/cloud');
            const data = await getPendingVerifications();
            setPending(data || []);
        } catch (e) {
            console.error('Erro ao carregar validações:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">{t('admin.loadingRequests')}</div>;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">{t('admin.partnerValidation')}</h2>
            {pending.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl text-center shadow-sm">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <FileCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold dark:text-white">{t('admin.allUpToDate')}</h3>
                    <p className="text-gray-500">{t('admin.noPendingRequests')}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pending.map(req => (
                        <div key={req.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-orange-100 dark:border-orange-900/30">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="font-bold text-gray-900 dark:text-white">{req.name}</p>
                                    <p className="text-xs text-gray-400">{req.city}</p>
                                </div>
                                <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{t('admin.pending')}</span>
                            </div>
                            <button className="w-full py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors">
                                {t('admin.analyzeDocuments')}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const CityManagement: React.FC = () => <CitiesAndDistricts />;

interface AdminPanelProps {
    activeSubTab: AdminSubTab;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ activeSubTab }) => {
    const { t } = useTranslation();
    const renderContent = () => {
        switch (activeSubTab) {
            case 'dashboard': return <AdminDashboard />;
            case 'users': return <UserManagement />;
            case 'lojas': return <AdminStores />;
            case 'validation': return <PartnerVerification />;
            case 'notifications': return <AdminNotifications />;
            case 'shop': return <AdminShopManagement />;
            case 'support': return <AdminClaims />;
            case 'claims': return <AdminClaims />;
            case 'api_keys': return <AdminApiKeysUnified />;
            case 'infinitepay': return <AdminInfinitePayConfig />;
            case 'fees': return <AdminFees />;
            case 'pwa': return <AdminPWASettings />;
            case 'cities': return <CityManagement />;
            case 'ratings': return <AdminRatings />;
            case 'security': return <SecurityManagement />;
            case 'blacklist': return <AdminBlacklist />;
            case 'referrals': return <AdminReferrals />;
            case 'institutional': return <AdminInstitutionalContent />;
            case 'platform_news': return <AdminPlatformNews />;
            case 'beta_news': return <AdminBetaNews />;
            case 'store_finance': return <AdminStoreFinance />;
            case 'store_orders': return <AdminStoreOrders />;
            case 'wallet_control': return <AdminWalletControl />;
            case 'maintenance': return <AdminMaintenance />;
            case 'levels': return <AdminPartnerLevels />;
            case 'payouts': return <AdminPayouts />;
            case 'loan_config': return <AdminLoanConfig />;
            case 'investments': return <AdminInvestments />;
            case 'slides': return <AdminSlides />;
            case 'city_banners': return <AdminCityBanners />;
            case 'tips': return <AdminTips />;
            case 'score_config': return <AdminScoreConfig />;
            case 'payment_gateways': return <AdminPaymentGateways />;
            case 'mercadopago': return <AdminMercadoPagoConfig />;
            case 'pix_config': return <AdminPixConfig />;
            case 'location_map': return <MapaLocalizacao />;
            case 'base_catalog': return <AdminBaseCatalog />;
            case 'store_categories': return <AdminStoreCategories />;
            case 'image_gallery': return <AdminImageGallery />;
            case 'street_requests': return <StreetRequestsAdmin />;
            case 'mediation': return <AdminMediation />;
            case 'store_ratings': return <AdminStoreRatings />;
            case 'bonuses': return <AdminBonusCampaigns />;
            case 'delivery_breaks': return <AdminDeliveryBreaks />;
            case 'fixed_drivers': return <AdminFixedDrivers />;

            default: return <div className="p-10 text-center text-gray-500">{t('admin.selectOptionMenu')}</div>;
        }
    };

    return (
        <SectionErrorBoundary key={activeSubTab} componentName={`Admin - ${activeSubTab}`}>
            {renderContent()}
        </SectionErrorBoundary>
    );
};
