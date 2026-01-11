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

vi.mock('../../services/cloud', () => ({
  getShopSettings: vi.fn().mockResolvedValue({ id: 'shop' })
}))
vi.mock('../../utils/dialogService', () => ({
  useDialog: () => ({
    alert: async () => { },
    confirm: async () => true,
    prompt: async () => ''
  })
}))
  ```
