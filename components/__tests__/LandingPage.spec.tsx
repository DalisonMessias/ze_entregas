import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandingPage } from '../LandingPage';
import * as cloud from '../../services/cloud';
import { InstitutionalContent, ShopSettings } from '../../types';

// Mock Lucide icons
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    const Icon = ({ "data-testid": dataTestId, ...props }) => <div data-testid={dataTestId || 'lucide-icon'} {...props} />;
  
    return {
      ...actual,
      Loader2: () => <div data-testid="loader">Loading...</div>,
      AlertTriangle: () => <div data-testid="alert-icon"></div>,
      ChevronDown: (props: any) => <Icon {...props} data-testid="chevron-down" />,
      ChevronsRight: (props: any) => <Icon {...props} data-testid="chevrons-right" />,
      ArrowRight: (props: any) => <Icon {...props} data-testid="arrow-right" />,
      Shield: (props: any) => <Icon {...props} data-testid="shield-icon" />,
      Zap: (props: any) => <Icon {...props} data-testid="zap-icon" />,
      Star: (props: any) => <Icon {...props} data-testid="star-icon" />,
      Instagram: (props: any) => <Icon {...props} data-testid="instagram-icon" />,
      Facebook: (props: any) => <Icon {...props} data-testid="facebook-icon" />,
      Twitter: (props: any) => <Icon {...props} data-testid="twitter-icon" />,
      Linkedin: (props: any) => <Icon {...props} data-testid="linkedin-icon" />,
    };
  });

// Mock child components
vi.mock('../Skeleton', () => ({
  Skeleton: ({ className }: { className: string }) => <div data-testid="skeleton" className={className}></div>
}));

vi.mock('../Logo', () => ({
    Logo: () => <div data-testid="logo">Logo</div>
}));


// Mock cloud services
vi.mock('../../services/cloud');
const mockedCloud = cloud as jest.Mocked<typeof cloud>;

const mockOnLoginClick = vi.fn();
const mockOnSignupClick = vi.fn();

const mockShopSettings: ShopSettings = {
    id: '1',
    shop_name: 'Test Shop',
    social_media: {
        instagram: 'https://instagram.com',
    }
};

const mockContentBlocks: InstitutionalContent[] = [
    {
        id: '1',
        page_key: 'landing',
        title: 'Hero Title',
        description: 'Hero Subtitle',
        slug: 'hero',
        status: 'published',
        is_active: true,
        metadata: {
            blockType: 'hero',
            title: 'Dynamic <span class="text-brand-600">Hero</span>',
            subtitle: 'This is a dynamic subtitle.',
            cta_primary: 'Go',
            cta_secondary: 'Learn More'
        },
    },
    {
        id: '2',
        page_key: 'landing',
        title: 'Features Section',
        description: 'Check out these cool features.',
        slug: 'features',
        status: 'published',
        is_active: true,
        metadata: {
            blockType: 'features',
            features: [
                { icon: 'Zap', title: 'Feature One', desc: 'Description One' },
                { icon: 'Shield', title: 'Feature Two', desc: 'Description Two' },
            ]
        },
    },
    {
        id: '3',
        page_key: 'landing',
        title: 'CTA Section',
        description: 'Sign up now!',
        slug: 'cta',
        status: 'published',
        is_active: true,
        metadata: {
            blockType: 'cta',
            title: 'Join Us',
            subtitle: 'Become a part of our community.',
            cta_primary: 'Login',
            cta_store: 'Register Store',
            cta_partner: 'Register Partner'
        },
    }
];

describe('LandingPage', () => {

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should display a loading skeleton while fetching data', () => {
        mockedCloud.getShopSettings.mockImplementation(() => new Promise(() => {})); // Never resolves
        mockedCloud.getInstitutionalPublic.mockImplementation(() => new Promise(() => {})); // Never resolves

        render(<LandingPage onLoginClick={mockOnLoginClick} onSignupClick={mockOnSignupClick} />);

        expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0);
    });

    it('should display an error message if data fetching fails', async () => {
        const errorMessage = 'Failed to fetch';
        mockedCloud.getShopSettings.mockRejectedValue(new Error(errorMessage));
        mockedCloud.getInstitutionalPublic.mockRejectedValue(new Error(errorMessage));

        render(<LandingPage onLoginClick={mockOnLoginClick} onSignupClick={mockOnSignupClick} />);

        await waitFor(() => {
            expect(screen.getByText('Ocorreu um Erro')).toBeTruthy();
            expect(screen.getByText('Não foi possível carregar o conteúdo da página. Tente novamente mais tarde.')).toBeTruthy();
            expect(screen.getByTestId('alert-icon')).toBeTruthy();
        });
    });

    it('should render content blocks correctly after successful data fetch', async () => {
        mockedCloud.getShopSettings.mockResolvedValue(mockShopSettings);
        mockedCloud.getInstitutionalPublic.mockResolvedValue(mockContentBlocks);

        render(<LandingPage onLoginClick={mockOnLoginClick} onSignupClick={mockOnSignupClick} />);

        // Wait for a piece of content to appear, which indicates loading is complete
        await screen.findByText(/Dynamic/);

        // Wait for the skeletons to disappear
        await waitFor(() => {
            expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
        });
        
        // Assert the rest of the content is also present
        expect(screen.getByText('This is a dynamic subtitle.')).toBeTruthy();
        expect(screen.getByText('Features Section')).toBeTruthy();
        expect(screen.getByText('Feature One')).toBeTruthy();
        expect(screen.getByText('Feature Two')).toBeTruthy();
        expect(screen.getByText('Join Us')).toBeTruthy();
        expect(screen.getByText('Register Store')).toBeTruthy();
    });

    it('should render a default block if blockType is unknown', async () => {
        const defaultBlock: InstitutionalContent[] = [{
            id: '4',
            page_key: 'landing',
            title: 'Default Block Title',
            description: 'Default block description',
            slug: 'default',
            status: 'published',
            is_active: true,
            metadata: { blockType: 'unknown' }
        }];

        mockedCloud.getShopSettings.mockResolvedValue(mockShopSettings);
        mockedCloud.getInstitutionalPublic.mockResolvedValue(defaultBlock);

        render(<LandingPage onLoginClick={mockOnLoginClick} onSignupClick={mockOnSignupClick} />);

        await waitFor(() => {
            expect(screen.getByText('Default Block Title')).toBeTruthy();
            expect(screen.getByText('Default block description')).toBeTruthy();
        });
    });
});