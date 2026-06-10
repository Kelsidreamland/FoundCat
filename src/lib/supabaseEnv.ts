export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

type SupabaseEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
};

const normalizeUrl = (url: string) => url.trim().replace(/\/+$/, '');

export function getSupabaseConfigFromEnv(env: SupabaseEnv): SupabaseConfig | null {
  const url = env.VITE_SUPABASE_URL?.trim();
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) return null;

  return {
    url: normalizeUrl(url),
    anonKey,
  };
}

export function getSupabaseConfig() {
  return getSupabaseConfigFromEnv(import.meta.env);
}
