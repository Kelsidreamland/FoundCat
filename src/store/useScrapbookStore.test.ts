import { set } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrapbookStore } from './useScrapbookStore';

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
}));

describe('useScrapbookStore catdex display name', () => {
  beforeEach(() => {
    vi.mocked(set).mockClear();
    useScrapbookStore.setState({
      items: [],
      isLoading: false,
      language: 'zh',
      targetDate: null,
    });
  });

  it('starts with the default editable cat map display name', () => {
    expect(useScrapbookStore.getState().catdexDisplayName).toBe('我的轉角貓地圖');
  });

  it('persists a trimmed cat map display name', async () => {
    await useScrapbookStore.getState().setCatdexDisplayName('  小美的貓咪地圖  ');

    expect(useScrapbookStore.getState().catdexDisplayName).toBe('小美的貓咪地圖');
    expect(set).toHaveBeenCalledWith('scrapbook_catdex_display_name', '小美的貓咪地圖');
  });

  it('persists post-capture cat encounter details', async () => {
    useScrapbookStore.setState({
      items: [
        {
          id: 'cat-1',
          type: 'sticker',
          imageData: 'data:image/png;base64,cat',
          date: '2026-05-15T08:00:00.000Z',
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          zIndex: 1,
        },
      ],
    });

    await useScrapbookStore.getState().updateItem('cat-1', {
      personalityTags: ['friendly', 'aloof'],
      spotNote: '公園長椅下方，傍晚常出現',
      careStatusTags: ['tnr', 'fed'],
    });

    expect(useScrapbookStore.getState().items[0]).toMatchObject({
      personalityTags: ['friendly', 'aloof'],
      spotNote: '公園長椅下方，傍晚常出現',
      careStatusTags: ['tnr', 'fed'],
    });
    expect(set).toHaveBeenCalledWith(
      'scrapbook_items',
      expect.arrayContaining([
        expect.objectContaining({
          id: 'cat-1',
          personalityTags: ['friendly', 'aloof'],
          spotNote: '公園長椅下方，傍晚常出現',
          careStatusTags: ['tnr', 'fed'],
        }),
      ])
    );
  });

  it('merges restored cloud cats without overwriting cats already on this device', async () => {
    useScrapbookStore.setState({
      items: [
        {
          id: 'cat-1',
          type: 'sticker',
          imageData: 'data:image/png;base64,local-cat',
          catName: '本機小橘',
          date: '2026-05-15T08:00:00.000Z',
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          zIndex: 3,
        },
      ],
    });

    await useScrapbookStore.getState().mergeRestoredItems([
      {
        id: 'cat-1',
        type: 'sticker',
        imageData: 'data:image/png;base64,cloud-cat',
        catName: '雲端小橘',
        date: '2026-05-15T08:00:00.000Z',
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        zIndex: 1,
      },
      {
        id: 'cat-2',
        type: 'sticker',
        imageData: 'data:image/png;base64,remote-cat',
        catName: '曼谷小橘',
        date: '2026-06-02T08:00:00.000Z',
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        zIndex: 1,
      },
    ]);

    expect(useScrapbookStore.getState().items).toEqual([
      expect.objectContaining({
        id: 'cat-1',
        imageData: 'data:image/png;base64,local-cat',
        catName: '本機小橘',
        zIndex: 3,
      }),
      expect.objectContaining({
        id: 'cat-2',
        catName: '曼谷小橘',
        zIndex: 4,
      }),
    ]);
    expect(set).toHaveBeenCalledWith(
      'scrapbook_items',
      expect.arrayContaining([
        expect.objectContaining({ id: 'cat-1', catName: '本機小橘' }),
        expect.objectContaining({ id: 'cat-2', catName: '曼谷小橘', zIndex: 4 }),
      ])
    );
  });
});
