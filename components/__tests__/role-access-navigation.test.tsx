import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'

vi.mock('../../services/cloud', () => ({
  getUserRole: vi.fn().mockResolvedValue('delivery_person'),
  getClient: vi.fn(() => null),
  getMyPartnerProfile: vi.fn().mockResolvedValue(null),
  getMaintenanceSettings: vi.fn().mockResolvedValue({ is_active: false }),
  getNotifications: vi.fn().mockResolvedValue([]),
  markNotificationRead: vi.fn().mockResolvedValue(undefined)
}))

import * as cloud from '../../services/cloud'


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

vi.mock('../../utils/dialogService', () => ({
  useDialog: () => ({
    alert: async () => { },
    confirm: async () => true,
    prompt: async () => ''
  })
}))

import { App } from '../App'
vi.mock('../AdminPanel', () => ({ AdminPanel: () => (<div>Dashboard BI</div>) }))

describe('Role-based menu visibility', () => {
  it('store_partner sees store features and not partner-only items', async () => {
    ; (cloud.getUserRole as any).mockResolvedValue('store_partner')
    render(<App userId={'u1'} userRole={'store_partner'} />)
    fireEvent.click(document.getElementById('header-menu-button')!)

    expect(await screen.findByText('Painel')).toBeInTheDocument()
    expect(screen.getByText('Solicitar Entrega')).toBeInTheDocument()
    expect(screen.getByText('Histórico de Pedidos')).toBeInTheDocument()
    expect(screen.getByText('ZéPay Corporativo')).toBeInTheDocument()

    expect(screen.queryByText('Painel de Corridas')).not.toBeInTheDocument()
    expect(screen.queryByText('Lojas Vinculadas')).not.toBeInTheDocument()
  })

  it('delivery_partner sees partner features and not store-only items', async () => {
    ; (cloud.getUserRole as any).mockResolvedValue('delivery_partner')
    render(<App userId={'u2'} userRole={'delivery_partner'} />)
    fireEvent.click(document.getElementById('header-menu-button')!)

    expect(await screen.findByText('Painel Diário')).toBeInTheDocument()
    expect(screen.getByText('Painel de Corridas')).toBeInTheDocument()
    expect(screen.getByText('Zebank')).toBeInTheDocument()

    expect(screen.queryByText('Solicitar Entrega')).not.toBeInTheDocument()
    expect(screen.queryByText('ZéPay Corporativo')).not.toBeInTheDocument()
  })

  it('delivery_person sees partner pages and driver tools subset', async () => {
    ; (cloud.getUserRole as any).mockResolvedValue('delivery_person')
    render(<App userId={'u3'} userRole={'delivery_person'} />)
    fireEvent.click(document.getElementById('header-menu-button')!)

    await screen.findByText('Loja de Peças')
    expect(screen.getByText('Ferramentas de Rota')).toBeInTheDocument()
    expect(screen.getByText('Relatórios Pessoais')).toBeInTheDocument()
    expect(screen.getByText('Painel de Corridas')).toBeInTheDocument()
    expect(screen.getByText('Zebank')).toBeInTheDocument()

    expect(screen.queryByText('Solicitar Entrega')).not.toBeInTheDocument()
  })

  it('admin sees admin dashboard option', async () => {
    ; (cloud.getUserRole as any).mockResolvedValue('admin')
    render(<App userId={'u4'} userRole={'admin'} />)
    fireEvent.click(document.getElementById('header-menu-button')!)
    expect(await screen.findByText('Dashboard BI')).toBeInTheDocument()
  })

  it('updates visible features when role changes after backend update', async () => {
    const getUserRoleMock = cloud.getUserRole as any

    getUserRoleMock.mockResolvedValueOnce('delivery_partner')
    render(<App userId={'u5'} userRole={'delivery_partner'} />)
    fireEvent.click(document.getElementById('header-menu-button')!)

    await screen.findByText('Painel Diário')
    expect(screen.queryByText('Dashboard BI')).not.toBeInTheDocument()

    getUserRoleMock.mockResolvedValueOnce('admin')
    window.dispatchEvent(new Event('refreshUserRole'))

    await waitFor(async () => {
      fireEvent.click(document.getElementById('header-menu-button')!)
      expect(screen.getByText('Dashboard BI')).toBeInTheDocument()
    })
  })
})
