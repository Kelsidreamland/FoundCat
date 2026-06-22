import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import {
  LAUNCH_RESCUE_SUBMITTED_IDS_KEY,
  rescueLocalCatsToPublic,
} from './launchRescuePublicCats';

const insert = vi.fn();
const from = vi.fn(() => ({ insert }));
const getSupabaseClient = vi.fn();

vi.mock('./supabaseClient', () => ({
  getSupabaseClient: () => getSupabaseClient(),
}));

const makeCat = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: 'local-cat-1',
  type: 'sticker',
  imageData: 'data:image/jpeg;base64,cat',
  heroImageData: 'data:image/jpeg;base64,hero',
  catdexNumber: 3,
  date: '2026-06-21T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  catName: '咖啡店小貓',
  personalityTags: ['friendly'],
  careStatusTags: ['fed'],
  location: {
    lat: 13.7563,
    lng: 100.5018,
    name: 'Bangkok Cafe',
    address: 'Bangkok, Thailand',
  },
  ...overrides,
});

describe('rescueLocalCatsToPublic', () => {
  beforeEach(() => {
    window.localStorage.clear();
    getSupabaseClient.mockReset();
    from.mockClear();
    insert.mockReset();
  });

  it('returns cloud_not_configured when Supabase is unavailable', async () => {
    getSupabaseClient.mockResolvedValue(null);

    await expect(rescueLocalCatsToPublic([makeCat()])).resolves.toEqual({
      ok: false,
      reason: 'cloud_not_configured',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('uploads only local cats that have a photo and map coordinates', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    insert.mockResolvedValue({ error: null });

    await expect(rescueLocalCatsToPublic([
      makeCat(),
      makeCat({ id: 'no-location', location: undefined }),
      makeCat({ id: 'no-photo', imageData: '' }),
    ])).resolves.toEqual({
      ok: true,
      uploadedCount: 1,
      skippedCount: 2,
    });

    expect(from).toHaveBeenCalledWith('launch_rescue_cat_cards');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        local_item_id: 'local-cat-1',
        source_fingerprint: 'found-cat-launch-rescue-v1:local-cat-1:2026-06-21T08:00:00.000Z:13.756300:100.501800',
        catdex_number: 3,
        cat_name: '咖啡店小貓',
        image_data: 'data:image/jpeg;base64,cat',
        hero_image_data: 'data:image/jpeg;base64,hero',
        encountered_at: '2026-06-21T08:00:00.000Z',
        location_name: 'Bangkok Cafe',
        lat: 13.7563,
        lng: 100.5018,
        personality_tags: ['friendly'],
        care_status_tags: ['fed'],
      })
    );
  });

  it('marks rescued local ids after a successful upload and does not resend them', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    insert.mockResolvedValue({ error: null });

    await rescueLocalCatsToPublic([makeCat()]);

    expect(JSON.parse(window.localStorage.getItem(LAUNCH_RESCUE_SUBMITTED_IDS_KEY) ?? '[]')).toEqual(['local-cat-1']);

    from.mockClear();
    insert.mockClear();

    await expect(rescueLocalCatsToPublic([makeCat()])).resolves.toEqual({
      ok: true,
      uploadedCount: 0,
      skippedCount: 1,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('treats duplicate rescue rows as already public and marks them locally', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    insert.mockResolvedValue({
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "launch_rescue_cat_cards_source_fingerprint_key"',
      },
    });

    await expect(rescueLocalCatsToPublic([makeCat()])).resolves.toEqual({
      ok: true,
      uploadedCount: 0,
      skippedCount: 0,
    });

    expect(JSON.parse(window.localStorage.getItem(LAUNCH_RESCUE_SUBMITTED_IDS_KEY) ?? '[]')).toEqual(['local-cat-1']);
  });

  it('does not mark local ids when the rescue upload fails', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    insert.mockResolvedValue({ error: { message: 'permission denied' } });

    await expect(rescueLocalCatsToPublic([makeCat()])).resolves.toEqual({
      ok: false,
      reason: 'rescue_failed',
      message: 'permission denied',
    });

    expect(window.localStorage.getItem(LAUNCH_RESCUE_SUBMITTED_IDS_KEY)).toBeNull();
  });
});
