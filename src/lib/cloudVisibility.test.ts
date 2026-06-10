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
        is_public: true,
      }),
    ], {
      onConflict: 'id',
    });
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
