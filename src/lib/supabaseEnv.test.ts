import { describe, expect, it } from 'vitest';
import { getSupabaseConfigFromEnv } from './supabaseEnv';

describe('getSupabaseConfigFromEnv', () => {
  it('returns null when Supabase env vars are missing', () => {
    expect(getSupabaseConfigFromEnv({})).toBeNull();
  });

  it('returns null when Supabase env vars are blank', () => {
    expect(getSupabaseConfigFromEnv({
      VITE_SUPABASE_URL: '   ',
      VITE_SUPABASE_ANON_KEY: '',
    })).toBeNull();
  });

  it('normalizes configured Supabase env vars', () => {
    expect(getSupabaseConfigFromEnv({
      VITE_SUPABASE_URL: ' https://found-cat.supabase.co/ ',
      VITE_SUPABASE_ANON_KEY: ' anon-key ',
    })).toEqual({
      url: 'https://found-cat.supabase.co',
      anonKey: 'anon-key',
    });
  });

  it('uses the Vite publishable key when the anon key is not present', () => {
    expect(getSupabaseConfigFromEnv({
      VITE_SUPABASE_URL: ' https://found-cat.supabase.co/ ',
      VITE_SUPABASE_PUBLISHABLE_KEY: ' sb_publishable_found_cat ',
    })).toEqual({
      url: 'https://found-cat.supabase.co',
      anonKey: 'sb_publishable_found_cat',
    });
  });

  it('accepts Next-style public Supabase env names as a migration fallback', () => {
    expect(getSupabaseConfigFromEnv({
      NEXT_PUBLIC_SUPABASE_URL: ' https://found-cat.supabase.co/ ',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: ' next-public-anon ',
    })).toEqual({
      url: 'https://found-cat.supabase.co',
      anonKey: 'next-public-anon',
    });
  });
});
