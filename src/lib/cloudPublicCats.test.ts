import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPublicCatCards } from './cloudPublicCats';

const select = vi.fn();
const order = vi.fn();
const limit = vi.fn();
const from = vi.fn(() => ({ select }));
const getSupabaseClient = vi.fn();

vi.mock('./supabaseClient', () => ({
  getSupabaseClient: () => getSupabaseClient(),
}));

describe('loadPublicCatCards', () => {
  beforeEach(() => {
    getSupabaseClient.mockReset();
    from.mockClear();
    select.mockReset();
    order.mockReset();
    limit.mockReset();
    select.mockReturnValue({ order });
    order.mockReturnValue({ limit });
  });

  it('returns cloud_not_configured when Supabase is unavailable', async () => {
    getSupabaseClient.mockResolvedValue(null);

    await expect(loadPublicCatCards()).resolves.toEqual({
      ok: false,
      reason: 'cloud_not_configured',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('loads public cat cards through the limited public view', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    limit.mockResolvedValue({
      data: [
        {
          id: 'public-cat-1',
          catdex_number: 12,
          public_number: 1,
          cat_name: '曼谷小橘',
          image_data: 'data:image/jpeg;base64,cat',
          hero_image_data: null,
          encountered_at: '2026-06-02T08:00:00.000Z',
          location_name: '曼谷街角咖啡',
          lat: 13.7563,
          lng: 100.5018,
          personality_tags: ['friendly'],
          care_status_tags: ['fed'],
        },
      ],
      error: null,
    });

    await expect(loadPublicCatCards()).resolves.toEqual({
      ok: true,
      items: [
        expect.objectContaining({
          id: 'public-cat-1',
          catdexNumber: 12,
          publicNumber: 1,
          catName: '曼谷小橘',
          imageData: 'data:image/jpeg;base64,cat',
          isPublic: true,
          location: {
            lat: 13.7563,
            lng: 100.5018,
            name: '曼谷街角咖啡',
          },
          personalityTags: ['friendly'],
          careStatusTags: ['fed'],
        }),
      ],
    });

    expect(from).toHaveBeenCalledWith('public_cat_cards');
    expect(select).toHaveBeenCalledWith('*');
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(limit).toHaveBeenCalledWith(80);
  });

  it('returns public_load_failed when the public view query fails', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    limit.mockResolvedValue({
      data: null,
      error: { message: 'network failed' },
    });

    await expect(loadPublicCatCards()).resolves.toEqual({
      ok: false,
      reason: 'public_load_failed',
      message: 'network failed',
    });
  });
});
