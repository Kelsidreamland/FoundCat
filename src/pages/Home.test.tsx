import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shareCatCardPoster } from '../lib/sharePoster';
import { useAuthStore } from '../store/useAuthStore';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import Home from './Home';

vi.mock('../lib/sharePoster', () => ({
  shareCatCardPoster: vi.fn(async () => 'shared-file'),
}));

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: 'cat-1',
  type: 'sticker',
  imageData: 'data:image/png;base64,cutout-cat',
  heroImageData: 'data:image/png;base64,base-photo',
  catdexNumber: 28,
  date: new Date().toISOString(),
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  ...overrides,
});

describe('Home page', () => {
  beforeEach(() => {
    vi.mocked(shareCatCardPoster).mockClear();
    useScrapbookStore.setState({
      items: [],
      isLoading: false,
      language: 'zh',
      targetDate: null,
      catdexDisplayName: '我的轉角貓圖鑑',
    });
    useAuthStore.setState({
      session: null,
      user: null,
      isConfigured: false,
      isLoading: false,
      error: null,
      unsubscribeAuthState: null,
      signInWithEmail: vi.fn(async () => undefined),
      signOut: vi.fn(async () => undefined),
    });
  });

  afterEach(() => cleanup());

  it('shows product title with English subtitle and language toggle', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: '轉角遇到貓' })).toBeInTheDocument();
    expect(screen.getAllByText('FOUND CAT').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('Corner Cat Stickerbook')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to English' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '大家的地圖' })).toHaveAttribute('href', '/map?mode=public');
    expect(screen.getByRole('link', { name: '捐贈' })).toHaveAttribute(
      'href',
      'https://api.payuni.com.tw/api/uop/receive_info/2/3/NPPA226028039/mgYrU0DqoPbb6vatwL86Z'
    );
  });

  it('renders collected cats as swipe cards instead of the latest-cat hero', () => {
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'cat-29',
          catdexNumber: 29,
          location: { lat: 25, lng: 121, name: '巷口咖啡店' },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText('No.029')).toBeInTheDocument();
    expect(screen.getByText('巷口咖啡店')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '分享這張貓卡海報' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '備份我的貓咪地圖' })).toBeInTheDocument();
    expect(screen.getByText('1 隻貓目前保存在這台裝置')).toBeInTheDocument();
    expect(screen.queryByText('最新遇見')).not.toBeInTheDocument();
  });

  it('shares the active cat as a poster instead of plain text', async () => {
    const user = userEvent.setup();
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'cat-29',
          catdexNumber: 29,
          location: { lat: 25, lng: 121, name: '巷口咖啡店' },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '分享這張貓卡海報' }));

    await waitFor(() => {
      expect(shareCatCardPoster).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cat-29', catdexNumber: 29 }),
        'zh'
      );
    });
  });

  it('shows the card deck empty state when no cats have been added', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByText('還沒有貓卡')).toBeInTheDocument();
  });

  it('moves the cat card deck closer to the visual center without over-reserving bottom space', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('main')).toHaveClass('pt-[clamp(2rem,9vh,5rem)]');
    expect(screen.getByRole('main')).toHaveClass('mb-[calc(4.75rem+env(safe-area-inset-bottom))]');
  });
});