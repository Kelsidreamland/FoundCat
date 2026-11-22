import type {
  CatCareStatusTag,
  CatPersonalityTag,
  ScrapbookItem,
} from '../store/useScrapbookStore';
import { getSupabaseClient } from './supabaseClient';

type PublicCatCardViewRow = {
  id: string;
  catdex_number: number | null;
  public_number: number | null;
  cat_name: string | null;
  cat_feature_note: string | null;
  image_data: string;
  hero_image_data: string | null;
  encountered_at: string;
  location_name: string | null;
  location_map_url: string | null;
  lat: number;
  lng: number;
  personality_tags: CatPersonalityTag[] | null;
  care_status_tags: CatCareStatusTag[] | null;
  spot_note: string | null;
  seen_count?: number | null;
};

export type LoadPublicCatCardsResult =
  | {
      ok: true;
      items: ScrapbookItem[];
    }
  | {
      ok: false;
      reason: 'cloud_not_configured' | 'public_load_failed';
      message?: string;
    };

const publicRowToScrapbookItem = (row: PublicCatCardViewRow): ScrapbookItem => ({
  id: row.id,
  type: 'sticker',
  imageData: row.image_data,
  heroImageData: row.hero_image_data ?? undefined,
  catdexNumber: row.catdex_number ?? undefined,
  publicNumber: row.public_number ?? undefined,
  date: row.encountered_at,
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  catName: row.cat_name ?? undefined,
  catFeatureNote: row.cat_feature_note ?? undefined,
  location: {
    lat: row.lat,
    lng: row.lng,
    name: row.location_name ?? 'FOUND CAT',
    mapUrl: row.location_map_url ?? undefined,
  },
  personalityTags: row.personality_tags ?? [],
  careStatusTags: row.care_status_tags ?? [],
  spotNote: row.spot_note ?? undefined,
  // Absent until the 2026-11-20 migration runs; callers hide sighting/report actions then.
  seenCount: typeof row.seen_count === 'number' ? row.seen_count : undefined,
  isPublic: true,
});

type ApiWorldCatRow = Omit<PublicCatCardViewRow, 'image_data' | 'hero_image_data'> & {
  image_url: string;
  hero_image_url: string;
};

/**
 * Preferred source: the site's own /api/world-cats, which returns metadata with photo URLs
 * and is cached at the edge. Returns null where that API does not exist (local dev, other
 * hosts) so callers fall back to reading Supabase directly.
 */
async function loadFromWorldCatApi(): Promise<LoadPublicCatCardsResult | null> {
  try {
    const response = await fetch('/api/world-cats', { headers: { Accept: 'application/json' } });
    const isJson = response.headers.get('content-type')?.includes('application/json');
    if (!isJson) return null;
    if (response.status === 503) return { ok: false, reason: 'cloud_not_configured' };
    if (!response.ok) return null;
    const rows = (await response.json()) as ApiWorldCatRow[];
    return {
      ok: true,
      items: rows.map((row) => publicRowToScrapbookItem({
        ...row,
        image_data: row.image_url,
        hero_image_data: row.hero_image_url,
      })),
    };
  } catch {
    return null;
  }
}

export async function loadPublicCatCards(): Promise<LoadPublicCatCardsResult> {
  const fromApi = await loadFromWorldCatApi();
  if (fromApi) return fromApi;

  const client = await getSupabaseClient();

  if (!client) {
    return {
      ok: false,
      reason: 'cloud_not_configured',
    };
  }

  const { data, error } = await client
    .from('public_cat_cards')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(80);

  if (error) {
    return {
      ok: false,
      reason: 'public_load_failed',
      message: error.message,
    };
  }

  return {
    ok: true,
    items: (data ?? []).map((row) => publicRowToScrapbookItem(row as PublicCatCardViewRow)),
  };
}
