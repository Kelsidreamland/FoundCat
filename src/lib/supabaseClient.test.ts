import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseClient, resetSupabaseClientForTests } from './supabaseClient';

const createClient = vi.fn((url: string, anonKey: string, options: unknown) => ({
  auth: {},
  url,
  anonKey,
  options,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (url: string, anonKey: string, options: unknown) => createClient(url, anonKey, options),
}));

describe('createSupabaseClient', () => {
  beforeEach(() => {
    createClient.mockClear();
    resetSupabaseClientForTests();
  });

  it('returns null when config is absent', async () => {
    await expect(createSupabaseClient(null)).resolves.toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('creates a singleton client when config exists', async () => {
    const config = {
      url: 'https://found-cat.supabase.co',
      anonKey: 'anon-key',
    };

    const first = await createSupabaseClient(config);
    const second = await createSupabaseClient(config);

    expect(first).toBe(second);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  });
});
