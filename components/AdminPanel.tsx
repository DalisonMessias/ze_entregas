import React from 'react';
import { AdminSubTab } from '../types';
import { SectionErrorBoundary } from './SectionErrorBoundary';

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

// Imports com caminhos específicos corrigidos
import { MapaLocalizacao } from '../pages/admin/MapaLocalizacao';
import { AdminImageGallery } from './Admin/AdminImageGallery';
import { CitiesAndDistricts } from '../pages/admin/CitiesAndDistricts';
import { StreetRequestsAdmin } from '../src/pages/StreetRequestsAdmin';

// --- REAL MODULES ---

const UserManagement: React.FC = () => {
    const [users, setUsers] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [search, setSearch] = React.useState('');

    React.useEffect(() => {
        loadUsers();
    }, []);

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

    if (loading) return <div className="p-10 text-center"><div className="animate-spin w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-4"></div>Carregando usuários...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Todos os Usuários</h2>
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
                                <th className="px-6 py-4">Usuário</th>
                                <th className="px-6 py-4">Contato</th>
                                <th className="px-6 py-4">Perfil</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Cadastro</th>
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
                                                <p className="font-bold text-gray-900 dark:text-white">{user.name || 'Sem nome'}</p>
                                                <p className="text-xs text-gray-400">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{user.phone_number || '-'}</p>
                                        <p className="text-[10px] text-gray-400">{user.cpf || '-'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                            user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                            user.role === 'store_partner' ? 'bg-blue-100 text-blue-600' :
                                            'bg-green-100 text-green-600'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <span className="text-sm dark:text-gray-200">{user.status === 'active' ? 'Ativo' : 'Bloqueado'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-400">
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const PartnerVerification: React.FC = () => {
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

    if (loading) return <div className="p-10 text-center">Carregando solicitações...</div>;

    return (
        <div className="p-6">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Validação de Parceiros</h2>
            {pending.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl text-center shadow-sm">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
                        <FileCheck className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold dark:text-white">Tudo em dia!</h3>
                    <p className="text-gray-500">Nenhuma solicitação pendente de validação.</p>
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
                                <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Pendente</span>
                            </div>
                            <button className="w-full py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors">
                                Analisar Documentos
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

            default: return <div className="p-10 text-center text-gray-500">Selecione uma opção no menu.</div>;
        }
    };

    return (
        <SectionErrorBoundary key={activeSubTab} componentName={`Admin - ${activeSubTab}`}>
            {renderContent()}
        </SectionErrorBoundary>
    );
};
