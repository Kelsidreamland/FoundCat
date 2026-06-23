import { beforeEach, describe, expect, it, vi } from 'vitest';
import { restoreCloudCatCards } from './cloudRestore';

const order = vi.fn();
const eq = vi.fn(() => ({ order }));
const select = vi.fn(() => ({ eq }));
const from = vi.fn(() => ({ select }));
const getSupabaseClient = vi.fn();

vi.mock('./supabaseClient', () => ({
  getSupabaseClient: () => getSupabaseClient(),
}));

describe('restoreCloudCatCards', () => {
  beforeEach(() => {
    getSupabaseClient.mockReset();
    from.mockClear();
    select.mockClear();
    eq.mockClear();
    order.mockReset();
  });

  it('requires a signed-in owner before restoring cloud cats', async () => {
    getSupabaseClient.mockResolvedValue({ from });

    await expect(restoreCloudCatCards({ ownerId: null })).resolves.toEqual({
      ok: false,
      reason: 'not_signed_in',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('returns cloud_not_configured when Supabase is unavailable', async () => {
    getSupabaseClient.mockResolvedValue(null);

    await expect(restoreCloudCatCards({ ownerId: 'user-1' })).resolves.toEqual({
      ok: false,
      reason: 'cloud_not_configured',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('loads owner cat cards from the private backup table', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    order.mockResolvedValue({
      data: [
        {
          id: 'cat-1',
          owner_id: 'user-1',
          catdex_number: 12,
          cat_name: '曼谷小橘',
          cat_feature_note: '左耳白毛，尾巴短短',
          image_data: 'data:image/jpeg;base64,cat',
          hero_image_data: null,
          encountered_at: '2026-06-02T08:00:00.000Z',
          location_name: '曼谷街角咖啡',
          location_address: 'Bangkok',
          location_place_id: 'place-1',
          lat: 13.7563,
          lng: 100.5018,
          personality_tags: ['friendly'],
          care_status_tags: ['fed'],
          spot_note: '每天傍晚在門口',
          is_public: true,
        },
      ],
      error: null,
    });

    await expect(restoreCloudCatCards({ ownerId: 'user-1' })).resolves.toEqual({
      ok: true,
      items: [
        expect.objectContaining({
          id: 'cat-1',
          type: 'sticker',
          catdexNumber: 12,
          catName: '曼谷小橘',
          catFeatureNote: '左耳白毛，尾巴短短',
          imageData: 'data:image/jpeg;base64,cat',
          date: '2026-06-02T08:00:00.000Z',
          location: {
            lat: 13.7563,
            lng: 100.5018,
            name: '曼谷街角咖啡',
            address: 'Bangkok',
            placeId: 'place-1',
          },
          personalityTags: ['friendly'],
          careStatusTags: ['fed'],
          spotNote: '每天傍晚在門口',
          isPublic: true,
        }),
      ],
    });

    expect(from).toHaveBeenCalledWith('cat_cards');
    expect(select).toHaveBeenCalledWith('*');
    expect(eq).toHaveBeenCalledWith('owner_id', 'user-1');
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false });
  });

  it('returns restore_failed when the private backup query fails', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    order.mockResolvedValue({
      data: null,
      error: { message: 'permission denied' },
    });

    await expect(restoreCloudCatCards({ ownerId: 'user-1' })).resolves.toEqual({
      ok: false,
      reason: 'restore_failed',
      message: 'permission denied',
    });
  });
});
