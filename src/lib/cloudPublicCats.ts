import type {
  CatCareStatusTag,
  CatPersonalityTag,
  ScrapbookItem,
} from '../store/useScrapbookStore';
import { getSupabaseClient } from './supabaseClient';

type PublicCatCardViewRow = {
  id: string;
  catdex_number: number | null;
  cat_name: string | null;
  image_data: string;
  hero_image_data: string | null;
  encountered_at: string;
  location_name: string | null;
  lat: number;
  lng: number;
  personality_tags: CatPersonalityTag[] | null;
  care_status_tags: CatCareStatusTag[] | null;
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
  date: row.encountered_at,
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  catName: row.cat_name ?? undefined,
  location: {
    lat: row.lat,
    lng: row.lng,
    name: row.location_name ?? 'FOUND CAT',
  },
  personalityTags: row.personality_tags ?? [],
  careStatusTags: row.care_status_tags ?? [],
  isPublic: true,
});

export async function loadPublicCatCards(): Promise<LoadPublicCatCardsResult> {
  const client = await getSupabaseClient();

  if (!client) {
    return {
      ok: false,
      reason: 'cloud_not_configured',
    };
  }

  const { data, error } = await client.from('public_cat_cards').select('*');

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
