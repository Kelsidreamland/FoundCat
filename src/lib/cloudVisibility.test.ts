import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { setCloudCatCardVisibility } from './cloudVisibility';

const upsert = vi.fn();
const from = vi.fn(() => ({ upsert }));
const getSupabaseClient = vi.fn();

vi.mock('./supabaseClient', () => ({
  getSupabaseClient: () => getSupabaseClient(),
}));

const localCat: ScrapbookItem = {
  id: 'cat-1',
  type: 'sticker',
  imageData: 'data:image/jpeg;base64,cat',
  catdexNumber: 8,
  date: '2026-06-02T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  catName: '巷口小橘',
  catFeatureNote: '左耳白毛，尾巴短短',
  location: {
    lat: 13.7563,
    lng: 100.5018,
    name: '曼谷街角咖啡',
  },
};

describe('setCloudCatCardVisibility', () => {
  beforeEach(() => {
    getSupabaseClient.mockReset();
    from.mockClear();
    upsert.mockReset();
  });

  it('requires a signed-in owner before changing public visibility', async () => {
    getSupabaseClient.mockResolvedValue({ from });

    await expect(setCloudCatCardVisibility({
      ownerId: null,
      item: localCat,
      isPublic: true,
    })).resolves.toEqual({
      ok: false,
      reason: 'not_signed_in',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('returns cloud_not_configured when Supabase is unavailable', async () => {
    getSupabaseClient.mockResolvedValue(null);

    await expect(setCloudCatCardVisibility({
      ownerId: 'user-1',
      item: localCat,
      isPublic: true,
    })).resolves.toEqual({
      ok: false,
      reason: 'cloud_not_configured',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('upserts the cat with the requested public visibility', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    upsert.mockResolvedValue({ error: null });

    await expect(setCloudCatCardVisibility({
      ownerId: 'user-1',
      item: localCat,
      isPublic: true,
    })).resolves.toEqual({
      ok: true,
      isPublic: true,
    });

    expect(from).toHaveBeenCalledWith('cat_cards');
    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'cat-1',
        owner_id: 'user-1',
        cat_feature_note: '左耳白毛，尾巴短短',
        is_public: true,
      }),
    ], {
      onConflict: 'id',
    });
  });

  it('retries visibility updates without cat_feature_note when the cloud schema is not migrated yet', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    upsert
      .mockResolvedValueOnce({ error: { message: "Could not find the 'cat_feature_note' column in the schema cache" } })
      .mockResolvedValueOnce({ error: null });

    await expect(setCloudCatCardVisibility({
      ownerId: 'user-1',
      item: localCat,
      isPublic: true,
    })).resolves.toEqual({
      ok: true,
      isPublic: true,
    });

    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({ cat_feature_note: '左耳白毛，尾巴短短' }),
    ], { onConflict: 'id' });
    expect(upsert).toHaveBeenNthCalledWith(2, [
      expect.not.objectContaining({ cat_feature_note: expect.anything() }),
    ], { onConflict: 'id' });
  });

  it('returns visibility_failed when the cloud upsert fails', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    upsert.mockResolvedValue({ error: { message: 'permission denied' } });

    await expect(setCloudCatCardVisibility({
      ownerId: 'user-1',
      item: localCat,
      isPublic: false,
    })).resolves.toEqual({
      ok: false,
      reason: 'visibility_failed',
      message: 'permission denied',
    });
  });
});
