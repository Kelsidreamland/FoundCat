import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shareCatCardPoster } from '../lib/sharePoster';
import { rescueLocalCatsToPublic } from '../lib/launchRescuePublicCats';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import Detail from './Detail';

vi.mock('../lib/sharePoster', () => ({
  shareCatCardPoster: vi.fn(async () => 'shared-file'),
}));

vi.mock('../lib/launchRescuePublicCats', () => ({
  rescueLocalCatsToPublic: vi.fn(async () => ({
    ok: true,
    uploadedCount: 1,
    skippedCount: 0,
  })),
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
}));

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: overrides.id ?? 'cat-1',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
  heroImageData: overrides.heroImageData,
  catdexNumber: overrides.catdexNumber ?? 12,
  date: overrides.date ?? '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location,
});

describe('Detail page', () => {
  beforeEach(() => {
    vi.mocked(shareCatCardPoster).mockClear();
    vi.mocked(rescueLocalCatsToPublic).mockClear();
    vi.mocked(rescueLocalCatsToPublic).mockResolvedValue({
      ok: true,
      uploadedCount: 1,
      skippedCount: 0,
    });
    useScrapbookStore.setState({
      items: [makeItem({ id: 'cat-1', location: { lat: 25.033, lng: 121.565, name: '巷口咖啡店' } })],
      isLoading: false,
      language: 'zh',
    });
  });

  afterEach(() => cleanup());

  it('shares a cat card poster instead of the raw cutout sticker', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/detail/cat-1']}>
        <Routes>
          <Route path="/detail/:id" element={<Detail />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '分享這張貓卡海報' }));

    await waitFor(() => {
      expect(shareCatCardPoster).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cat-1', catdexNumber: 12 }),
        'zh'
      );
    });
  });

  it('lets a logged-out user publish one local cat card to the world map manually', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/detail/cat-1']}>
        <Routes>
          <Route path="/detail/:id" element={<Detail />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '一鍵公開到全世界地圖' }));

    await waitFor(() => {
      expect(rescueLocalCatsToPublic).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'cat-1' }),
      ]);
    });
    expect(useScrapbookStore.getState().items[0].isPublic).toBe(true);
    expect(await screen.findByText('已公開到全世界地圖')).toBeInTheDocument();
  });
});
