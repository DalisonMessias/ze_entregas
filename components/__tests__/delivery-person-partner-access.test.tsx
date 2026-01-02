import React from 'react'
import { render, screen, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

vi.mock('../../services/cloud', () => ({
  getUserRole: vi.fn().mockResolvedValue('delivery_person'),
  getClient: vi.fn(() => null),
  getMyPartnerProfile: vi.fn().mockResolvedValue(null),
  getMaintenanceSettings: vi.fn().mockResolvedValue({ is_active: false }),
  getNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn().mockResolvedValue(undefined),
  getCurrentShift: vi.fn().mockResolvedValue(null),
  getPartnerFinancialSummary: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../services/notificationService', () => ({
  initNotificationService: vi.fn(),
  stopNotificationService: vi.fn(),
}))

vi.mock('react-joyride', () => ({ STATUS: {}, default: () => null }))
vi.mock('@list-labs/react-joyride', () => ({ default: () => null }))
vi.mock('../Tour/TourContext', () => ({
  useTour: () => ({
    steps: [],
    run: false,
    stepIndex: 0,
    startTour: () => {},
    stopTour: () => {},
    handleJoyrideCallback: () => {},
    isTourRunning: false,
  })
}))
vi.mock('../Tour/Tour', () => ({ default: () => null }))

vi.mock('../../utils/dialogService', () => ({
  useDialog: () => ({
    alert: async () => {},
    confirm: async () => true,
    prompt: async () => ''
  })
}))

import { App } from '../App'

describe('delivery_person access to delivery_partner pages', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.clearAllTimers()
    vi.useRealTimers()
  })
  it('navigates to partner area and sees lock overlay instead of global denial', async () => {
    render(<App userId={'u-lock1'} userRole={'delivery_person'} />)

    await screen.findByText('Painel Diário')
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'partner' } }))

    expect(await screen.findByText('Painel de Corridas')).toBeInTheDocument()
    expect(screen.queryByText('Acesso restrito')).not.toBeInTheDocument()
  }, 10000)

  it('navigates to driver_marketing and sees exclusive lock overlay', async () => {
    render(<App userId={'u-lock2'} userRole={'delivery_person'} />)

    await screen.findByText('Painel Diário')
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'driver_marketing' } }))

    expect(await screen.findByText('Marketing Pessoal')).toBeInTheDocument()
    expect(screen.queryByText('Acesso restrito')).not.toBeInTheDocument()
  }, 10000)
})
