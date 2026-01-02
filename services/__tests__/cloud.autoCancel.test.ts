import { describe, test, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => {
  const rpc = vi.fn(async (fn: string, args?: any) => {
    return { data: null, error: null } as any;
  });
  const createClient = vi.fn(() => ({ rpc }));
  return { createClient };
});

import { autoCancelUnacceptedRequest } from '../cloud';

describe('autoCancelUnacceptedRequest RPC', () => {
  test('calls auto_cancel_unaccepted_request with p_request_id', async () => {
    const mod = await import('@supabase/supabase-js');
    const client: any = (mod as any).createClient();
    await autoCancelUnacceptedRequest('req-1');
    const calls = client.rpc.mock.calls.filter((c: any[]) => c[0] === 'auto_cancel_unaccepted_request');
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toEqual({ p_request_id: 'req-1' });
  });
});

