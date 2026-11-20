import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from './supabaseClient';

const DEVICE_ID_KEY = 'found-cat-device-id';
const SEEN_CATS_KEY = 'found-cat-seen-cats';

export type ReportReason = 'inappropriate' | 'not_a_cat' | 'privacy' | 'spam' | 'other';
export const REPORT_REASONS: ReportReason[] = ['inappropriate', 'privacy', 'not_a_cat', 'spam', 'other'];

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Anonymous per-browser id so one person counts once per cat; no account needed. */
export const getDeviceId = () => {
  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const created = uuidv4();
    window.localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch {
    return uuidv4();
  }
};

export const hasMarkedSeen = (catId: string) => readJson<string[]>(SEEN_CATS_KEY, []).includes(catId);

const rememberSeen = (catId: string) => {
  try {
    const seen = new Set(readJson<string[]>(SEEN_CATS_KEY, []));
    seen.add(catId);
    window.localStorage.setItem(SEEN_CATS_KEY, JSON.stringify([...seen]));
  } catch {
    // Best effort; the server ignores duplicates anyway.
  }
};

export type CatSocialResult = { ok: true } | { ok: false; reason: 'cloud_not_configured' | 'failed' };

export async function markCatSeen(catId: string): Promise<CatSocialResult> {
  const client = await getSupabaseClient();
  if (!client) return { ok: false, reason: 'cloud_not_configured' };
  const { error } = await client
    .from('cat_sightings')
    .upsert({ cat_id: catId, device_id: getDeviceId() }, { onConflict: 'cat_id,device_id', ignoreDuplicates: true });
  if (error) return { ok: false, reason: 'failed' };
  rememberSeen(catId);
  return { ok: true };
}

export async function reportCat(catId: string, reason: ReportReason, note?: string): Promise<CatSocialResult> {
  const client = await getSupabaseClient();
  if (!client) return { ok: false, reason: 'cloud_not_configured' };
  const trimmed = note?.trim().slice(0, 300);
  const { error } = await client.from('cat_reports').insert({ cat_id: catId, reason, note: trimmed || null });
  return error ? { ok: false, reason: 'failed' } : { ok: true };
}
