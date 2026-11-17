import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFetchWithTimeout, createSupabaseClient, resetSupabaseClientForTests } from './supabaseClient';

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
      global: {
        fetch: expect.any(Function),
      },
    });
  });
});

describe('createFetchWithTimeout', () => {
  it('aborts requests that take longer than the timeout', async () => {
    vi.useFakeTimers();
    const baseFetch = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
    }));

    const request = createFetchWithTimeout(1000, baseFetch as typeof fetch)('https://example.supabase.co/rest/v1/x');
    const assertion = expect(request).rejects.toMatchObject({ name: 'TimeoutError' });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    vi.useRealTimers();
  });

  it('passes fast responses through and respects a caller abort signal', async () => {
    const response = new Response('ok');
    const baseFetch = vi.fn(async () => response);
    const fetchWithTimeout = createFetchWithTimeout(1000, baseFetch as typeof fetch);

    await expect(fetchWithTimeout('https://example.com')).resolves.toBe(response);

    const caller = new AbortController();
    caller.abort();
    await fetchWithTimeout('https://example.com', { signal: caller.signal });
    const forwarded = (baseFetch.mock.calls.at(-1) as unknown as [string, RequestInit])[1].signal;
    expect(forwarded?.aborted).toBe(true);
  });
});
