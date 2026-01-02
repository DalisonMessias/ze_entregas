import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
vi.mock('../utils/dialogService', () => ({
  useDialog: () => ({
    alert: async () => {},
    confirm: async () => true,
    prompt: async () => ''
  })
}))
import { AdminPanel } from '../AdminPanel'
import { AdminApiKeysUnified } from '../AdminApiKeysUnified'

vi.mock('../../services/cloud', () => ({
  getShopSettings: vi.fn().mockResolvedValue({ id: 'shop' }),
  adminGetAsaasWebhookSettings: vi.fn().mockResolvedValue({ webhook_secret: 'secret', active_events: [] }),
  adminGetAsaasWebhookLogs: vi.fn().mockResolvedValue([]),
  getWebhookUrl: vi.fn().mockReturnValue('https://example.com/webhook')
}))
vi.mock('../../utils/dialogService', () => ({
  useDialog: () => ({
    alert: async () => {},
    confirm: async () => true,
    prompt: async () => ''
  })
}))

describe('Admin navigation routes', () => {
  it('renders Asaas config when activeSubTab=asaas_webhook', async () => {
    render(<AdminPanel activeSubTab={'asaas_webhook'} />)
    await waitFor(() => {
      expect(screen.getByText('Integração Asaas')).toBeInTheDocument()
    })
  })

  it('AdminApiKeysUnified does not render Asaas sections', async () => {
    render(<AdminApiKeysUnified />)
    await waitFor(() => {
      expect(screen.queryByText('Asaas (Pagamentos)')).not.toBeInTheDocument()
      expect(screen.queryByText('Webhook Asaas')).not.toBeInTheDocument()
    })
  })
})
