import React from 'react'
import { render } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'

const alertSpy = vi.fn()

vi.mock('../../utils/dialogService', () => ({
  useDialog: () => ({
    alert: async (args: any) => { alertSpy(args) },
    confirm: async () => true,
    prompt: async () => ''
  })
}))

vi.mock('../../services/cloud', () => ({
  getUserRole: vi.fn().mockResolvedValue('delivery_person'),
  getClient: vi.fn(() => null),
  getMyPartnerProfile: vi.fn().mockResolvedValue(null)
}))


vi.mock('@list-labs/react-joyride', () => ({ default: () => null }))
vi.mock('../Tour/TourContext', () => ({
  useTour: () => ({
    steps: [],
    run: false,
    stepIndex: 0,
    startTour: () => { },
    stopTour: () => { },
    handleJoyrideCallback: () => { },
    isTourRunning: false,
  })
}))
vi.mock('../Tour/Tour', () => ({ default: () => null }))

import { App } from '../App'

describe('Unauthorized access attempts are blocked and logged', () => {
  it('delivery_person denied when navigating to store wallet', async () => {
    render(<App userId={'u1'} userRole={'delivery_person'} />)
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'wallet' } }))
    await new Promise(r => setTimeout(r, 10))
    expect(alertSpy).toHaveBeenCalled()
  })

  it('store_partner denied when navigating to driver daily_panel', async () => {
    render(<App userId={'u2'} userRole={'store_partner'} />)
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'daily_panel' } }))
    await new Promise(r => setTimeout(r, 10))
    expect(alertSpy).toHaveBeenCalled()
  })
})
