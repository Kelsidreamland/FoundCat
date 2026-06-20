import { get } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createLocalRescueBackupPayload,
  parseLocalRescueBackupPayload,
  readLocalRescueBackup,
} from './localRescueBackup';

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
}));

const cat = {
  id: 'cat-1',
  type: 'sticker' as const,
  imageData: 'data:image/png;base64,cat',
  date: '2026-06-18T10:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  catName: '便利店小橘',
};

describe('local rescue backup', () => {
  beforeEach(() => {
    vi.mocked(get).mockReset();
  });

  it('reads the local cat cards and scrapbook metadata from IndexedDB', async () => {
    vi.mocked(get).mockImplementation(async (key: IDBValidKey) => {
      if (key === 'scrapbook_items') return [cat];
      if (key === 'scrapbook_language') return 'zh';
      if (key === 'scrapbook_catdex_display_name') return 'Kevin 的貓咪地圖';
      return undefined;
    });

    const backup = await readLocalRescueBackup();

    expect(backup.kind).toBe('found-cat-local-rescue');
    expect(backup.itemCount).toBe(1);
    expect(backup.items).toEqual([cat]);
    expect(backup.language).toBe('zh');
    expect(backup.catdexDisplayName).toBe('Kevin 的貓咪地圖');
  });

  it('serializes and parses a rescue backup without dropping cat-card data', async () => {
    const payload = createLocalRescueBackupPayload({
      kind: 'found-cat-local-rescue',
      version: 1,
      exportedAt: '2026-06-20T00:00:00.000Z',
      appVersion: 'test',
      itemCount: 1,
      items: [cat],
      language: 'zh',
      catdexDisplayName: 'Kevin 的貓咪地圖',
    });

    const parsed = parseLocalRescueBackupPayload(payload);

    expect(parsed.items).toEqual([cat]);
    expect(parsed.itemCount).toBe(1);
    expect(parsed.catdexDisplayName).toBe('Kevin 的貓咪地圖');
  });

  it('rejects text that is not a Found Cat rescue backup', () => {
    expect(() => parseLocalRescueBackupPayload('{"items":[]}')).toThrow(
      'Invalid Found Cat rescue backup'
    );
  });
});
