import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
vi.mock('../utils/dialogService', () => ({
  useDialog: () => ({
    alert: async () => { },
    confirm: async () => true,
    prompt: async () => ''
  })
}))
import { AdminPanel } from '../AdminPanel'
import { AdminApiKeysUnified } from '../AdminApiKeysUnified'


describe('AdminNavigation', () => {
  it('renders default dashboard on load', async () => {
    // Basic test to ensure component renders without Asaas
    render(<AdminPanel activeSubTab={'dashboard'} />)
    expect(screen.getByText('Visão Geral')).toBeInTheDocument()
  })
})
