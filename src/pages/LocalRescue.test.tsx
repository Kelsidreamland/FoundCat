import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { get, set } from 'idb-keyval';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LocalRescue from './LocalRescue';
import { createLocalRescueBackupPayload } from '../lib/localRescueBackup';
import { useScrapbookStore } from '../store/useScrapbookStore';

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
}));

const localCat = {
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

const restoredCat = {
  ...localCat,
  id: 'cat-2',
  catName: '巷口小黑',
  zIndex: 2,
};

describe('LocalRescue page', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.mocked(get).mockReset();
    vi.mocked(set).mockClear();
    useScrapbookStore.setState({
      items: [],
      isLoading: false,
      language: 'zh',
      catdexDisplayName: '我的轉角貓地圖',
      targetDate: null,
    });
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(async () => undefined),
      },
    });
  });

  it('shows the number of local cats found in this app container', async () => {
    vi.mocked(get).mockImplementation(async (key: IDBValidKey) => {
      if (key === 'scrapbook_items') return [localCat, restoredCat];
      if (key === 'scrapbook_language') return 'zh';
      if (key === 'scrapbook_catdex_display_name') return 'Kevin 的貓咪地圖';
      return undefined;
    });

    render(
      <MemoryRouter>
        <LocalRescue />
      </MemoryRouter>
    );

    expect(await screen.findByText('找到 2 張本機貓卡')).toBeInTheDocument();
    expect(screen.getByText('便利店小橘')).toBeInTheDocument();
    expect(screen.getByText('巷口小黑')).toBeInTheDocument();
  });

  it('copies a JSON backup payload to the clipboard', async () => {
    vi.mocked(get).mockImplementation(async (key: IDBValidKey) => {
      if (key === 'scrapbook_items') return [localCat];
      return undefined;
    });

    render(
      <MemoryRouter>
        <LocalRescue />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: '複製備份文字' }));

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('"kind": "found-cat-local-rescue"')
    );
    expect(await screen.findByText('已複製備份文字')).toBeInTheDocument();
  });

  it('merges an imported rescue backup without replacing existing local cats', async () => {
    vi.mocked(get).mockImplementation(async (key: IDBValidKey) => {
      if (key === 'scrapbook_items') return [localCat];
      return undefined;
    });
    useScrapbookStore.setState({
      items: [localCat],
      isLoading: false,
      language: 'zh',
      catdexDisplayName: '我的轉角貓地圖',
      targetDate: null,
    });
    const payload = createLocalRescueBackupPayload({
      kind: 'found-cat-local-rescue',
      version: 1,
      exportedAt: '2026-06-20T00:00:00.000Z',
      appVersion: 'test',
      itemCount: 2,
      items: [localCat, restoredCat],
      language: 'zh',
      catdexDisplayName: 'Kevin 的貓咪地圖',
    });

    render(
      <MemoryRouter>
        <LocalRescue />
      </MemoryRouter>
    );

    fireEvent.change(await screen.findByLabelText('貼上備份 JSON'), {
      target: { value: payload },
    });
    fireEvent.click(screen.getByRole('button', { name: '合併匯入備份' }));

    await waitFor(() => {
      expect(set).toHaveBeenCalledWith(
        'scrapbook_items',
        expect.arrayContaining([
          expect.objectContaining({ id: 'cat-1', catName: '便利店小橘' }),
          expect.objectContaining({ id: 'cat-2', catName: '巷口小黑' }),
        ])
      );
    });
    expect(useScrapbookStore.getState().items).toHaveLength(2);
    expect(screen.getByText('已合併 1 張貓卡，沒有覆蓋原本資料')).toBeInTheDocument();
  });
});
