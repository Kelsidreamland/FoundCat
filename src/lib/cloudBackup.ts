import type { ScrapbookItem } from '../store/useScrapbookStore';
import { getSupabaseClient } from './supabaseClient';
import { isOptionalCloudColumnSchemaError, toCloudCatCardUpsert, withoutOptionalCloudColumns } from './cloudCatCards';

type BackupLocalCatCardsInput = {
  ownerId: string | null | undefined;
  items: ScrapbookItem[];
};

export type BackupLocalCatCardsResult =
  | {
      ok: true;
      backedUpCount: number;
    }
  | {
      ok: false;
      reason: 'cloud_not_configured' | 'not_signed_in' | 'backup_failed';
      message?: string;
    };

export async function backupLocalCatCards({
  ownerId,
  items,
}: BackupLocalCatCardsInput): Promise<BackupLocalCatCardsResult> {
  if (!ownerId) {
    return {
      ok: false,
      reason: 'not_signed_in',
    };
  }

  if (items.length === 0) {
    return {
      ok: true,
      backedUpCount: 0,
    };
  }

  const client = await getSupabaseClient();

  if (!client) {
    return {
      ok: false,
      reason: 'cloud_not_configured',
    };
  }

  const rows = items.map((item) => toCloudCatCardUpsert(item, ownerId));
  const options = {
    onConflict: 'id',
  };
  const { error } = await client.from('cat_cards').upsert(rows, options);

  if (error && isOptionalCloudColumnSchemaError(error)) {
    const fallbackRows = rows.map(withoutOptionalCloudColumns);
    const { error: fallbackError } = await client.from('cat_cards').upsert(fallbackRows, options);

    if (!fallbackError) {
      return {
        ok: true,
        backedUpCount: rows.length,
      };
    }

    return {
      ok: false,
      reason: 'backup_failed',
      message: fallbackError.message,
    };
  }

  if (error) {
    return {
      ok: false,
      reason: 'backup_failed',
      message: error.message,
    };
  }

  return {
    ok: true,
    backedUpCount: rows.length,
  };
}
