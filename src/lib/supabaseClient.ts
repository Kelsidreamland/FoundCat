import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, type SupabaseConfig } from './supabaseEnv';

let supabaseClient: SupabaseClient | null | undefined;

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
