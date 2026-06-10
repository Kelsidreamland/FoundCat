import type { ScrapbookItem } from '../store/useScrapbookStore';
import { toCloudCatCardUpsert } from './cloudCatCards';
import { getSupabaseClient } from './supabaseClient';

type SetCloudCatCardVisibilityInput = {
  ownerId: string | null | undefined;
  item: ScrapbookItem;
  isPublic: boolean;
};

export type SetCloudCatCardVisibilityResult =
  | {
      ok: true;
      isPublic: boolean;
    }
  | {
      ok: false;
      reason: 'cloud_not_configured' | 'not_signed_in' | 'visibility_failed';
      message?: string;
    };

export async function setCloudCatCardVisibility({
  ownerId,
  item,
  isPublic,
}: SetCloudCatCardVisibilityInput): Promise<SetCloudCatCardVisibilityResult> {
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

  const { error } = await client.from('cat_cards').upsert([
    toCloudCatCardUpsert(item, ownerId, { isPublic }),
  ], {
    onConflict: 'id',
  });

  if (error) {
    return {
      ok: false,
      reason: 'visibility_failed',
      message: error.message,
    };
  }

  return {
    ok: true,
    isPublic,
  };
}
