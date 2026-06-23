import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPublicCatCards } from '../lib/cloudPublicCats';
import { shareCatCardPoster } from '../lib/sharePoster';
import { useAuthStore } from '../store/useAuthStore';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import Home from './Home';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(async () => undefined),
}));

vi.mock('../lib/cloudPublicCats', () => ({
  loadPublicCatCards: vi.fn(async () => ({
    ok: true,
    items: [],
  })),
}));

vi.mock('../lib/sharePoster', () => ({
  shareCatCardPoster: vi.fn(async () => 'shared-file'),
}));

const createDeferredPublicCards = () => {
  let resolve!: (value: Awaited<ReturnType<typeof loadPublicCatCards>>) => void;
  const promise = new Promise<Awaited<ReturnType<typeof loadPublicCatCards>>>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
};

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: 'cat-1',
  type: 'sticker',
  imageData: 'data:image/png;base64,cutout-cat',
  heroImageData: 'data:image/png;base64,base-photo',
  catdexNumber: 'catdexNumber' in overrides ? overrides.catdexNumber : 28,
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
    vi.mocked(loadPublicCatCards).mockClear();
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: true,
      items: [],
    });
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

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

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
    expect(screen.getByRole('link', { name: '我的貓卡' })).toHaveAttribute('href', '/catdex');
    expect(screen.getByRole('link', { name: '捐贈' })).toHaveAttribute(
      'href',
      'https://api.payuni.com.tw/api/uop/receive_info/2/3/NPPA226028039/mgYrU0DqoPbb6vatwL86Z'
    );
  });

  it('does not flash stale local cat cards while the world deck is still loading', () => {
    const deferred = createDeferredPublicCards();
    vi.mocked(loadPublicCatCards).mockReturnValue(deferred.promise);
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

    expect(screen.getByText('正在載入大家遇見的貓')).toBeInTheDocument();
    expect(screen.queryByText('No.029')).not.toBeInTheDocument();
    expect(screen.queryByText('巷口咖啡店')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '備份' })).toBeInTheDocument();
    expect(screen.queryByText('1 隻貓目前保存在這台裝置')).not.toBeInTheDocument();
    expect(screen.queryByText('最新遇見')).not.toBeInTheDocument();
  });

  it('renders the cloud login dialog outside the main stacking layer so bottom navigation cannot cover it', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      isConfigured: true,
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '備份' }));

    const dialog = screen.getByRole('dialog', { name: '備份我的貓咪地圖' });
    expect(screen.getByRole('main')).not.toContainElement(dialog);
  });

  it('shares the active cat as a poster instead of plain text', async () => {
    const user = userEvent.setup();
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: true,
      items: [
        makeItem({
          id: 'cat-29',
          catdexNumber: 29,
          catName: '巷口店長',
          location: { lat: 25, lng: 121, name: '巷口咖啡店' },
          isPublic: true,
        }),
      ],
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(await screen.findByText('巷口店長')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '分享這張貓卡海報' }));

    await waitFor(() => {
      expect(shareCatCardPoster).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cat-29', catdexNumber: 29 }),
        'zh'
      );
    });
  });

  it('shows the card deck empty state when no public cats have been added', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(await screen.findByText('全世界地圖等第一批貓點')).toBeInTheDocument();
    expect(screen.getByText('先拍下你遇到的貓，公開後朋友就能在地圖上找到牠。')).toBeInTheDocument();
  });

  it('loads public cat cards as the default home deck', async () => {
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: true,
      items: [
        makeItem({
          id: 'public-cat-88',
          catdexNumber: 88,
          catName: '首爾店長貓',
          location: { lat: 37.5665, lng: 126.978, name: '首爾咖啡店' },
          isPublic: true,
        }),
      ],
    });
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'local-cat-29',
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

    expect(await screen.findByText('首爾店長貓')).toBeInTheDocument();
    expect(screen.queryByText('大家遇見的貓')).not.toBeInTheDocument();
    expect(screen.queryByText('全世界貓卡')).not.toBeInTheDocument();
    expect(screen.getByText('首爾咖啡店')).toBeInTheDocument();
    expect(screen.queryByText('巷口咖啡店')).not.toBeInTheDocument();
  });

  it('falls back to local cat cards when public cards cannot load', async () => {
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: false,
      reason: 'cloud_not_configured',
    });
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'local-cat-29',
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

    expect(await screen.findByText('巷口咖啡店')).toBeInTheDocument();
    expect(screen.queryByText('我的貓卡')).not.toBeInTheDocument();
    expect(loadPublicCatCards).toHaveBeenCalledTimes(1);
  });

  it('keeps the home deck on the public empty state when the world feed loads with no cats', async () => {
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: true,
      items: [],
    });
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'local-cat-29',
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

    expect(await screen.findByText('全世界地圖等第一批貓點')).toBeInTheDocument();
    expect(screen.queryByText('大家遇見的貓')).not.toBeInTheDocument();
    expect(screen.queryByText('全世界貓卡')).not.toBeInTheDocument();
    expect(screen.queryByText('巷口咖啡店')).not.toBeInTheDocument();
  });

  it('collects a public cat card into the local deck when the deck asks to collect it', async () => {
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: true,
      items: [
        makeItem({
          id: 'public-cat-88',
          catdexNumber: 88,
          publicNumber: 88,
          catName: '首爾店長貓',
          catFeatureNote: '左耳白毛，尾巴短短',
          personalityTags: ['friendly'],
          spotNote: '下午常在窗邊睡覺',
          careStatusTags: ['fed'],
          location: { lat: 37.5665, lng: 126.978, name: '首爾咖啡店' },
          isPublic: true,
        }),
        makeItem({
          id: 'public-cat-89',
          catdexNumber: 89,
          publicNumber: 89,
          catName: '曼谷小橘',
          location: { lat: 13.7563, lng: 100.5018, name: '曼谷街角咖啡' },
          isPublic: true,
        }),
      ],
    });

    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await screen.findByText('首爾店長貓');
    vi.useFakeTimers();
    fireEvent.keyDown(screen.getByTestId('active-cat-card'), { key: 'ArrowLeft' });

    expect(screen.getByRole('status')).toHaveTextContent('已收藏到我的貓卡');

    await act(async () => {
      vi.advanceTimersByTime(260);
    });

    expect(useScrapbookStore.getState().items).toEqual([
      expect.objectContaining({
        imageData: 'data:image/png;base64,cutout-cat',
        catName: '首爾店長貓',
        catFeatureNote: '左耳白毛，尾巴短短',
        personalityTags: ['friendly'],
        spotNote: '下午常在窗邊睡覺',
        careStatusTags: ['fed'],
        location: expect.objectContaining({ name: '首爾咖啡店' }),
        publicNumber: 88,
        collectedFromPublicId: 'public-cat-88',
        catdexNumber: undefined,
      }),
    ]);
  });

  it('recognizes an already-collected world cat by its public source id', async () => {
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: true,
      items: [
        makeItem({
          id: 'public-cat-88',
          publicNumber: 88,
          catName: '首爾店長貓',
          imageData: 'data:image/png;base64:changed-public-image',
          location: { lat: 37.5665, lng: 126.978, name: '首爾咖啡店' },
          isPublic: true,
        }),
        makeItem({
          id: 'public-cat-89',
          publicNumber: 89,
          catName: '曼谷小橘',
          imageData: 'data:image/png;base64,bangkok-cat',
          location: { lat: 13.7563, lng: 100.5018, name: '曼谷街角咖啡' },
          isPublic: true,
        }),
      ],
    });
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'local-copy-of-public-cat-88',
          catdexNumber: undefined,
          publicNumber: 88,
          collectedFromPublicId: 'public-cat-88',
          catName: '首爾店長貓',
          imageData: 'data:image/png;base64:old-public-image',
          location: { lat: 37.5665, lng: 126.978, name: '首爾咖啡店' },
          isPublic: false,
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

    expect(await screen.findByText('曼谷小橘')).toBeInTheDocument();
    expect(screen.queryByText('首爾店長貓')).not.toBeInTheDocument();
  });

  it('still shows my published world cats on the default home deck', async () => {
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: true,
      items: [
        makeItem({
          id: 'public-copy-of-my-cat',
          publicNumber: 1,
          catName: '我公開的小橘',
          imageData: 'data:image/png;base64,my-public-cat',
          location: { lat: 13.7563, lng: 100.5018, name: '曼谷街角咖啡' },
          isPublic: true,
        }),
      ],
    });
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'local-original-cat',
          catdexNumber: 1,
          catName: '我公開的小橘',
          imageData: 'data:image/png;base64,my-public-cat',
          location: { lat: 13.7563, lng: 100.5018, name: '曼谷街角咖啡' },
          isPublic: true,
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

    expect(await screen.findByText('我公開的小橘')).toBeInTheDocument();
    expect(screen.queryByText('全世界地圖等第一批貓點')).not.toBeInTheDocument();
  });

  it('does not hide my published cat when the local copy already has the same public number', async () => {
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: true,
      items: [
        makeItem({
          id: 'public-copy-of-my-cat',
          publicNumber: 4,
          catName: '我公開的小橘',
          imageData: 'data:image/png;base64,my-public-cat',
          location: { lat: 13.7563, lng: 100.5018, name: '曼谷街角咖啡' },
          isPublic: true,
        }),
      ],
    });
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'local-original-cat',
          catdexNumber: 4,
          publicNumber: 4,
          catName: '我公開的小橘',
          imageData: 'data:image/png;base64,my-public-cat',
          location: { lat: 13.7563, lng: 100.5018, name: '曼谷街角咖啡' },
          isPublic: true,
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

    expect(await screen.findByText('我公開的小橘')).toBeInTheDocument();
    expect(screen.queryByText('全世界地圖等第一批貓點')).not.toBeInTheDocument();
  });

  it('does not hide public cats just because a local cat has the same photo and place', async () => {
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: true,
      items: [
        makeItem({
          id: 'public-cat-88',
          catdexNumber: 88,
          catName: '首爾店長貓',
          imageData: 'data:image/png;base64,seoul-cat',
          location: { lat: 37.5665, lng: 126.978, name: '首爾咖啡店' },
          isPublic: true,
        }),
        makeItem({
          id: 'public-cat-89',
          catdexNumber: 89,
          catName: '曼谷小橘',
          imageData: 'data:image/png;base64,bangkok-cat',
          location: { lat: 13.7563, lng: 100.5018, name: '曼谷街角咖啡' },
          isPublic: true,
        }),
      ],
    });
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'local-copy-of-public-cat-88',
          catdexNumber: 1,
          catName: '首爾店長貓',
          imageData: 'data:image/png;base64,seoul-cat',
          location: { lat: 37.5665, lng: 126.978, name: '首爾咖啡店' },
          isPublic: false,
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

    expect(await screen.findByText('首爾店長貓')).toBeInTheDocument();
    expect(screen.queryByText('全世界地圖等第一批貓點')).not.toBeInTheDocument();
  });

  it('moves the cat card deck closer to the visual center without over-reserving bottom space', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('main')).toHaveClass('pt-[clamp(0.75rem,4vh,2.25rem)]');
    expect(screen.getByRole('main')).toHaveClass('mb-[calc(4.25rem+env(safe-area-inset-bottom))]');
  });

  it('keeps cloud backup as a compact secondary action instead of a full-width card under the deck', () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: '備份' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '備份我的貓咪地圖' })).not.toBeInTheDocument();
  });
});
