import type { ScrapbookItem } from '../store/useScrapbookStore';
import { getSupabaseClient } from './supabaseClient';

const LAUNCH_RESCUE_VERSION = 'found-cat-launch-rescue-v1';

export const LAUNCH_RESCUE_ENABLED = import.meta.env.VITE_ENABLE_LAUNCH_RESCUE !== 'false';
export const LAUNCH_RESCUE_SUBMITTED_IDS_KEY = 'found-cat-launch-rescue-submitted-ids';

type RescueLocalCatsToPublicResult =
  | {
      ok: true;
      uploadedCount: number;
      skippedCount: number;
    }
  | {
      ok: false;
      reason: 'cloud_not_configured' | 'rescue_failed';
      message?: string;
    };

type LaunchRescueCatCardRow = {
  local_item_id: string;
  source_fingerprint: string;
  catdex_number: number | null;
  cat_name: string | null;
  image_data: string;
  hero_image_data: string | null;
  encountered_at: string;
  location_name: string | null;
  lat: number;
  lng: number;
  personality_tags: string[];
  care_status_tags: string[];
};

const emptyToNull = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const hasBrowserStorage = () => typeof window !== 'undefined' && Boolean(window.localStorage);

function readSubmittedIds() {
  if (!hasBrowserStorage()) return new Set<string>();

  try {
    const rawValue = window.localStorage.getItem(LAUNCH_RESCUE_SUBMITTED_IDS_KEY);
    const parsedValue: unknown = rawValue ? JSON.parse(rawValue) : [];
    return new Set(Array.isArray(parsedValue) ? parsedValue.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set<string>();
  }
}

function writeSubmittedIds(ids: Set<string>) {
  if (!hasBrowserStorage()) return;

  window.localStorage.setItem(LAUNCH_RESCUE_SUBMITTED_IDS_KEY, JSON.stringify([...ids].sort()));
}

function hasRescuablePublicLocation(item: ScrapbookItem) {
  return (
    item.imageData.trim().length > 0
    && item.location
    && Number.isFinite(item.location.lat)
    && Number.isFinite(item.location.lng)
  );
}

function buildSourceFingerprint(item: ScrapbookItem) {
  const lat = item.location?.lat ?? 0;
  const lng = item.location?.lng ?? 0;

  return [
    LAUNCH_RESCUE_VERSION,
    item.id,
    item.date,
    lat.toFixed(6),
    lng.toFixed(6),
  ].join(':');
}

function toLaunchRescueRow(item: ScrapbookItem): LaunchRescueCatCardRow {
  if (!item.location) {
    throw new Error('Launch rescue cat card requires a location');
  }

  return {
    local_item_id: item.id,
    source_fingerprint: buildSourceFingerprint(item),
    catdex_number: item.catdexNumber ?? null,
    cat_name: emptyToNull(item.catName),
    image_data: item.imageData,
    hero_image_data: item.heroImageData ?? null,
    encountered_at: item.date,
    location_name: emptyToNull(item.location.name) ?? 'FOUND CAT',
    lat: item.location.lat,
    lng: item.location.lng,
    personality_tags: item.personalityTags ?? [],
    care_status_tags: item.careStatusTags ?? [],
  };
}

export async function rescueLocalCatsToPublic(items: ScrapbookItem[]): Promise<RescueLocalCatsToPublicResult> {
  if (!LAUNCH_RESCUE_ENABLED) {
    return {
      ok: true,
      uploadedCount: 0,
      skippedCount: items.length,
    };
  }

  const submittedIds = readSubmittedIds();
  const candidates = items.filter((item) => hasRescuablePublicLocation(item) && !submittedIds.has(item.id));
  const skippedCount = items.length - candidates.length;

  if (candidates.length === 0) {
    return {
      ok: true,
      uploadedCount: 0,
      skippedCount,
    };
  }

  const client = await getSupabaseClient();

  if (!client) {
    return {
      ok: false,
      reason: 'cloud_not_configured',
    };
  }

  const rows = candidates.map(toLaunchRescueRow);

  try {
    const { error } = await client.from('launch_rescue_cat_cards').upsert(rows, {
      onConflict: 'source_fingerprint',
      ignoreDuplicates: true,
    });

    if (error) {
      return {
        ok: false,
        reason: 'rescue_failed',
        message: error.message,
      };
    }
  } catch (error) {
    return {
      ok: false,
      reason: 'rescue_failed',
      message: error instanceof Error ? error.message : 'Launch rescue upload failed.',
    };
  }

  for (const item of candidates) {
    submittedIds.add(item.id);
  }
  writeSubmittedIds(submittedIds);

  return {
    ok: true,
    uploadedCount: rows.length,
    skippedCount,
  };
}
