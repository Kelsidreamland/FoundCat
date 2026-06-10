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
});
