import { describe, test, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => {
  const rpc = vi.fn(async (fn: string) => {
    if (fn === 'create_partner_request') {
      const err: any = new Error('RPC schema cache miss');
      return { data: null, error: err } as any;
    }
    return { data: null, error: null } as any;
  });

  let lastCode = '#0003';
  const from = vi.fn((table: string) => {
    if (table === 'partner_requests') {
      return {
        select: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(async () => ({ data: [{ delivery_code: lastCode }], error: null })),
          })),
        })),
        insert: vi.fn((payload: any) => ({
          select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: 'req-1' }, error: null })) }))
        })),
      } as any;
    }
    return { select: vi.fn(async () => ({ data: null, error: null })) } as any;
  });

  const createClient = vi.fn(() => ({ rpc, from, auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'store-1' } } })) } }));
  return { createClient };
});

import { createPartnerRequest } from '../cloud';

describe('createPartnerRequest sequential delivery code fallback', () => {
  test('generates next sequential 4-digit code with # prefix', async () => {
    const res = await createPartnerRequest('A', 'B', 1, 10, 5, null, 'PLATFORM');
    expect(res.deliveryCode).toBe('#0004');
    expect(res.requestId).toBe('req-1');
  });
});
