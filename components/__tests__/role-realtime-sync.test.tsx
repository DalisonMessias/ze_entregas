import React from 'react'
import { render, act } from '@testing-library/react'
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

import { App } from '../App'

describe('Real-time role sync behaviour', () => {
  it('App reacts to role change and navigation permissions update', async () => {
    const { rerender } = render(<App userId={'u1'} userRole={'delivery_person'} />)

    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'wallet' } }))
    await act(async () => {})
    expect(alertSpy).toHaveBeenCalled()

    rerender(<App userId={'u1'} userRole={'store_partner'} />)
    window.dispatchEvent(new CustomEvent('navigateToTab', { detail: { tab: 'wallet' } }))
    await act(async () => {})
    expect(alertSpy).toHaveBeenCalledTimes(1)
  })
})
