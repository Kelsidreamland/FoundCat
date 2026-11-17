import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, type SupabaseConfig } from './supabaseEnv';

let supabaseClient: SupabaseClient | null | undefined;

/**
 * Cross-border links (e.g. from mainland China) can stall instead of failing.
 * Abort slow Supabase requests so the UI falls back instead of spinning forever.
 */
export const SUPABASE_REQUEST_TIMEOUT_MS = 15_000;

export function createFetchWithTimeout(
  timeoutMs: number,
  baseFetch: typeof fetch = (input, init) => fetch(input, init),
): typeof fetch {
  return (input: RequestInfo | URL, init: RequestInit = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), timeoutMs);
    const upstreamSignal = init.signal;
    const onUpstreamAbort = () => controller.abort(upstreamSignal?.reason);

    if (upstreamSignal?.aborted) {
      controller.abort(upstreamSignal.reason);
    } else {
      upstreamSignal?.addEventListener('abort', onUpstreamAbort, { once: true });
    }

    return baseFetch(input, { ...init, signal: controller.signal }).finally(() => {
      clearTimeout(timer);
      upstreamSignal?.removeEventListener('abort', onUpstreamAbort);
    });
  };
}

export async function createSupabaseClient(config: SupabaseConfig | null) {
  if (!config) return null;

  if (!supabaseClient) {
    const { createClient } = await import('@supabase/supabase-js');

    supabaseClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: {
        fetch: createFetchWithTimeout(SUPABASE_REQUEST_TIMEOUT_MS),
      },
    });
  }

  return supabaseClient;
}

export function getSupabaseClient() {
  return createSupabaseClient(getSupabaseConfig());
}

export function isSupabaseConfigured() {
  return getSupabaseConfig() !== null;
}

export function resetSupabaseClientForTests() {
  supabaseClient = undefined;
}
