import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shareCatCardPoster } from '../lib/sharePoster';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import CalendarView from './CalendarView';

vi.mock('../lib/sharePoster', () => ({
  shareCatCardPoster: vi.fn(async () => 'shared-file'),
}));

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: overrides.id ?? 'cat-1',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
  catdexNumber: overrides.catdexNumber ?? 18,
  date: overrides.date ?? '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location,
});

describe('CalendarView', () => {
  beforeEach(() => {
    vi.mocked(shareCatCardPoster).mockClear();
    useScrapbookStore.setState({
      items: [makeItem({ id: 'cat-18' })],
      isLoading: false,
      language: 'zh',
      targetDate: null,
    });
  });

  afterEach(() => cleanup());

  it('shares previewed cats as card posters instead of raw sticker files', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <CalendarView currentDate={new Date('2026-05-01T00:00:00.000Z')} />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'View items for 2026-05-11' }));
    const stickerImages = await screen.findAllByAltText('sticker');
    await user.click(stickerImages[stickerImages.length - 1]);
    await user.click(screen.getByRole('button', { name: '分享' }));

    await waitFor(() => {
      expect(shareCatCardPoster).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cat-18', catdexNumber: 18 }),
        'zh'
      );
    });
  });
});
