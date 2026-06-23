import type { ScrapbookItem } from '../store/useScrapbookStore';
import { type CloudCatCardRow } from './cloudCatCards';
import { getSupabaseClient } from './supabaseClient';

type RestoreCloudCatCardsInput = {
  ownerId: string | null | undefined;
};

export type RestoreCloudCatCardsResult =
  | {
      ok: true;
      items: ScrapbookItem[];
    }
  | {
      ok: false;
      reason: 'cloud_not_configured' | 'not_signed_in' | 'restore_failed';
      message?: string;
    };

const rowToScrapbookItem = (row: CloudCatCardRow): ScrapbookItem => ({
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
  catFeatureNote: row.cat_feature_note ?? undefined,
  location: row.lat !== null && row.lng !== null
    ? {
        lat: row.lat,
        lng: row.lng,
        name: row.location_name ?? 'FOUND CAT',
        address: row.location_address ?? undefined,
        placeId: row.location_place_id ?? undefined,
      }
    : undefined,
  personalityTags: row.personality_tags,
  spotNote: row.spot_note ?? undefined,
  careStatusTags: row.care_status_tags,
  isPublic: row.is_public,
});

export async function restoreCloudCatCards({
  ownerId,
}: RestoreCloudCatCardsInput): Promise<RestoreCloudCatCardsResult> {
  if (!ownerId) {
    return {
      ok: false,
      reason: 'not_signed_in',
    };
  }

  const client = await getSupabaseClient();

  if (!client) {
    return {
      ok: false,
      reason: 'cloud_not_configured',
    };
  }

  const { data, error } = await client
    .from('cat_cards')
    .select('*')
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false });

  if (error) {
    return {
      ok: false,
      reason: 'restore_failed',
      message: error.message,
    };
  }

  return {
    ok: true,
    items: (data ?? []).map((row) => rowToScrapbookItem(row as CloudCatCardRow)),
  };
}
