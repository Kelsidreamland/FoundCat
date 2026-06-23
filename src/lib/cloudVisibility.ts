import type { ScrapbookItem } from '../store/useScrapbookStore';
import { isCatFeatureNoteSchemaError, toCloudCatCardUpsert, withoutCatFeatureNote } from './cloudCatCards';
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

  const row = toCloudCatCardUpsert(item, ownerId, { isPublic });
  const options = {
    onConflict: 'id',
  };
  const { error } = await client.from('cat_cards').upsert([row], options);

  if (error && isCatFeatureNoteSchemaError(error)) {
    const { error: fallbackError } = await client.from('cat_cards').upsert([withoutCatFeatureNote(row)], options);

    if (!fallbackError) {
      return {
        ok: true,
        isPublic,
      };
    }

    return {
      ok: false,
      reason: 'visibility_failed',
      message: fallbackError.message,
    };
  }

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
