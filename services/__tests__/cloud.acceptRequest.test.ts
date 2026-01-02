import { describe, test, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => {
  const rpc = vi.fn(async (fn: string, args?: any) => {
    if (fn === 'accept_partner_request') {
      return { data: null, error: null } as any;
    }
    return { data: null, error: null } as any;
  });
  const createClient = vi.fn(() => ({ rpc }));
  return { createClient };
});

import { acceptPartnerRequest } from '../cloud';

describe('acceptPartnerRequest RPC', () => {
  test('calls accept_partner_request with p_request_id', async () => {
    const mod = await import('@supabase/supabase-js');
    const client: any = (mod as any).createClient();
    await acceptPartnerRequest('req-123');
    const calls = client.rpc.mock.calls.filter((c: any[]) => c[0] === 'accept_partner_request');
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toEqual({ p_request_id: 'req-123' });
  });
});

