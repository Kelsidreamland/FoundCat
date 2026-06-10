import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { backupLocalCatCards } from './cloudBackup';

const upsert = vi.fn();
const from = vi.fn(() => ({ upsert }));
const getSupabaseClient = vi.fn();

vi.mock('./supabaseClient', () => ({
  getSupabaseClient: () => getSupabaseClient(),
}));

const makeCat = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: 'cat-1',
  type: 'sticker',
  imageData: 'data:image/jpeg;base64,cat',
  heroImageData: 'data:image/jpeg;base64,hero',
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
  ...overrides,
});

describe('backupLocalCatCards', () => {
  beforeEach(() => {
    getSupabaseClient.mockReset();
    from.mockClear();
    upsert.mockReset();
  });

  it('returns cloud_not_configured when Supabase is unavailable', async () => {
    getSupabaseClient.mockResolvedValue(null);

    await expect(backupLocalCatCards({ ownerId: 'user-1', items: [makeCat()] })).resolves.toEqual({
      ok: false,
      reason: 'cloud_not_configured',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('returns not_signed_in without an owner id', async () => {
    getSupabaseClient.mockResolvedValue({ from });

    await expect(backupLocalCatCards({ ownerId: null, items: [makeCat()] })).resolves.toEqual({
      ok: false,
      reason: 'not_signed_in',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('does not call Supabase when there are no local cats', async () => {
    getSupabaseClient.mockResolvedValue({ from });

    await expect(backupLocalCatCards({ ownerId: 'user-1', items: [] })).resolves.toEqual({
      ok: true,
      backedUpCount: 0,
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('upserts local cats as private cloud cat rows', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    upsert.mockResolvedValue({ error: null });

    await expect(backupLocalCatCards({ ownerId: 'user-1', items: [makeCat()] })).resolves.toEqual({
      ok: true,
      backedUpCount: 1,
    });

    expect(from).toHaveBeenCalledWith('cat_cards');
    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'cat-1',
        owner_id: 'user-1',
        cat_name: '巷口小橘',
        location_name: '曼谷街角咖啡',
        is_public: false,
      }),
    ], {
      onConflict: 'id',
    });
  });

  it('returns backup_failed when Supabase upsert fails', async () => {
    getSupabaseClient.mockResolvedValue({ from });
    upsert.mockResolvedValue({ error: { message: 'row too large' } });

    await expect(backupLocalCatCards({ ownerId: 'user-1', items: [makeCat()] })).resolves.toEqual({
      ok: false,
      reason: 'backup_failed',
      message: 'row too large',
    });
  });
});
