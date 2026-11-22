/**
 * Server-side helpers for the public world-cat feed.
 *
 * Cat photos are stored as base64 data URLs in the database, so reading the public view
 * directly costs ~350 KB per card on every visit. These helpers split the feed into a
 * small, cacheable metadata list and one cacheable image response per photo, so Vercel's
 * edge cache absorbs repeat visits instead of Supabase.
 */

export type SupabaseEnv = { url: string; key: string };

type Env = Record<string, string | undefined>;

export const readSupabaseEnv = (env: Env): SupabaseEnv | null => {
  const url = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (
    env.SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  return url && key ? { url, key } : null;
};

const META_COLUMNS = [
  'id', 'catdex_number', 'public_number', 'cat_name', 'cat_feature_note', 'encountered_at',
  'location_name', 'location_map_url', 'lat', 'lng', 'personality_tags', 'care_status_tags',
  'updated_at',
];
// Added to the public view by later migrations; older databases reject them, so retry without.
const NEWER_COLUMNS = ['spot_note', 'seen_count'];

export const FEED_CACHE_CONTROL = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600';
export const IMAGE_CACHE_CONTROL = 'public, max-age=31536000, s-maxage=31536000, immutable';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const headers = (env: SupabaseEnv) => ({ apikey: env.key, Authorization: `Bearer ${env.key}` });

type FeedRow = Record<string, unknown> & { id: string; updated_at?: string | null };

export const imageUrlFor = (row: FeedRow, kind: 'card' | 'hero') => {
  const version = row.updated_at ? Date.parse(row.updated_at) || 0 : 0;
  return `/api/cat-image?id=${encodeURIComponent(row.id)}&kind=${kind}&v=${version}`;
};

/** Metadata for the newest 80 public cats, with image URLs instead of inline photos. */
export async function fetchWorldCatFeed(env: SupabaseEnv, fetchImpl: typeof fetch = fetch) {
  const base = `${env.url}/rest/v1/public_cat_cards?order=created_at.desc&limit=80&select=`;
  let response = await fetchImpl(base + [...META_COLUMNS, ...NEWER_COLUMNS].join(','), { headers: headers(env) });
  if (response.status === 400) {
    response = await fetchImpl(base + META_COLUMNS.join(','), { headers: headers(env) });
  }
  if (!response.ok) {
    throw new Error(`Supabase feed failed with HTTP ${response.status}`);
  }
  const rows = (await response.json()) as FeedRow[];
  return rows.map((row) => ({
    ...row,
    image_url: imageUrlFor(row, 'card'),
    hero_image_url: imageUrlFor(row, 'hero'),
  }));
}

export const parseDataUrl = (value: string | null | undefined) => {
  const match = /^data:([\w/+.-]+);base64,(.+)$/s.exec(value ?? '');
  if (!match) return null;
  return { contentType: match[1], bytes: Buffer.from(match[2], 'base64') };
};

/** One cat photo as binary. `hero` falls back to the card image when a cat has no hero photo. */
export async function fetchCatImage(
  env: SupabaseEnv,
  id: string,
  kind: 'card' | 'hero',
  fetchImpl: typeof fetch = fetch,
) {
  if (!UUID.test(id)) return null;
  const columns = kind === 'hero' ? 'hero_image_data,image_data' : 'image_data';
  const response = await fetchImpl(
    `${env.url}/rest/v1/public_cat_cards?select=${columns}&id=eq.${id}&limit=1`,
    { headers: headers(env) },
  );
  if (!response.ok) throw new Error(`Supabase image failed with HTTP ${response.status}`);
  const [row] = (await response.json()) as Array<{ image_data?: string | null; hero_image_data?: string | null }>;
  if (!row) return null;
  return parseDataUrl(kind === 'hero' ? row.hero_image_data || row.image_data : row.image_data);
}
