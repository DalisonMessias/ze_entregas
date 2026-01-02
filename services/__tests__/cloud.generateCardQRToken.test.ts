import { describe, test, expect, vi } from 'vitest';

// mock supabase-js to control client behavior
vi.mock('@supabase/supabase-js', () => {
  const calls: { name: string; count: number }[] = [];
  let rpcAttempts = 0;
  const rpc = vi.fn(async (fn: string, args?: any) => {
    calls.push({ name: fn, count: (calls.filter(c => c.name === fn).length + 1) });
    if (fn === 'generate_card_qr_token') {
      // first attempt: simulate schema cache error
      if (rpcAttempts === 0) {
        rpcAttempts++;
        const err: any = new Error('Could not find the function public.generate_card_qr_token(card_id) in the schema cache');
        return { data: null, error: err } as any;
      }
      return { data: 'SERVER_TOKEN', error: null } as any;
    }
    if (fn === 'log_client_error') {
      return { data: null, error: null } as any;
    }
    if (fn === 'verify_terminal_pin') {
      return { data: true, error: null } as any;
    }
    return { data: null, error: null } as any;
  });

  const from = vi.fn((table: string) => ({
    select: vi.fn(() => ({
      limit: vi.fn(async () => ({ data: null, error: null })),
    })),
  }));

  const createClient = vi.fn(() => ({ rpc, from }));
  return { createClient };
});

import { generateCardQRToken } from '../cloud';

describe('generateCardQRToken fallback logic', () => {
  test('warms schema cache then returns server token', async () => {
    const token = await generateCardQRToken('card-1');
    expect(token).toBe('SERVER_TOKEN');
  });

  test('returns fallback token when RPC keeps failing', async () => {
    const mod = await import('@supabase/supabase-js');
    const client: any = (mod as any).createClient();
    client.rpc.mockImplementation(async (fn: string) => {
      if (fn === 'generate_card_qr_token') {
        const err: any = new Error('Could not find the function public.generate_card_qr_token(card_id) in the schema cache');
        return { data: null, error: err };
      }
      return { data: null, error: null };
    });
    const token = await generateCardQRToken('card-2');
    expect(token.startsWith('card-2:')).toBe(true);
  });
});
