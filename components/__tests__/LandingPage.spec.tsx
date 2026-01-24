import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LandingPage } from '../LandingPage';
import * as cloud from '../../services/cloud';
import { ShopSettings } from '../../types';

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

describe('LandingPage', () => {

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('should render the component', () => {
        mockedCloud.getShopSettings.mockResolvedValue(mockShopSettings);
        render(<LandingPage onLoginClick={mockOnLoginClick} onSignupClick={mockOnSignupClick} />);
        expect(screen.getByText('Tudo para facilitar seu dia.')).toBeTruthy();
    });
});
