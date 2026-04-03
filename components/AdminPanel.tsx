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

// --- PLACEHOLDER MODULES (Existing in context) ---
const UserManagement: React.FC = () => <div className="p-10 text-center">Módulo de Usuários (Carregando...)</div>;
const PartnerVerification: React.FC = () => <div className="p-10 text-center">Verificação de Parceiros (Carregando...)</div>;
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
