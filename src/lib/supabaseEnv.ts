export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

type SupabaseEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
};

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, '');
const firstPresent = (...values: Array<string | undefined>) => values.find((value) => value?.trim())?.trim();

export function getSupabaseConfigFromEnv(env: SupabaseEnv): SupabaseConfig | null {
  const url = firstPresent(
    env.VITE_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_URL
  );
  const anonKey = firstPresent(
    env.VITE_SUPABASE_ANON_KEY,
    env.VITE_SUPABASE_PUBLISHABLE_KEY,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    env.SUPABASE_ANON_KEY,
    env.SUPABASE_PUBLISHABLE_KEY
  );

  if (!url || !anonKey) return null;

  return {
    url: normalizeUrl(url),
    anonKey,
  };
}

export function getSupabaseConfig() {
  return getSupabaseConfigFromEnv(import.meta.env);
}
