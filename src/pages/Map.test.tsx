import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPublicCatCards } from '../lib/cloudPublicCats';
import { setCloudCatCardVisibility } from '../lib/cloudVisibility';
import { useAuthStore } from '../store/useAuthStore';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { buildGoogleMapsSearchUrl } from '../lib/singleCatShare';
import Map from './Map';

const mapEaseTo = vi.fn();
const mapFitBounds = vi.fn();

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(async () => undefined),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

vi.mock('../lib/cloudVisibility', () => ({
  setCloudCatCardVisibility: vi.fn(async () => ({ ok: true, isPublic: true })),
}));

vi.mock('../lib/cloudPublicCats', () => ({
  loadPublicCatCards: vi.fn(async () => ({
    ok: true,
    items: [
      {
        id: 'public-cat-1',
        type: 'sticker',
        imageData: 'data:image/png;base64,public-cat',
        heroImageData: undefined,
        catdexNumber: 88,
        date: '2026-06-02T08:00:00.000Z',
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        zIndex: 1,
        catName: '曼谷小橘',
        location: {
          lat: 13.7563,
          lng: 100.5018,
          name: '曼谷街角咖啡',
        },
        personalityTags: ['friendly'],
        careStatusTags: ['fed'],
        isPublic: true,
      },
    ],
  })),
}));

vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(function MapMock(this: {
      addControl: ReturnType<typeof vi.fn>;
      on: ReturnType<typeof vi.fn>;
      easeTo: ReturnType<typeof vi.fn>;
      fitBounds: ReturnType<typeof vi.fn>;
      getZoom: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    }) {
      this.addControl = vi.fn();
      this.on = vi.fn((event: string, callback: () => void) => {
        if (event === 'load') window.setTimeout(callback, 0);
      });
      this.easeTo = mapEaseTo;
      this.fitBounds = mapFitBounds;
      this.getZoom = vi.fn(() => 13);
      this.remove = vi.fn();
    }),
    Marker: vi.fn(function MarkerMock(this: {
      setLngLat: ReturnType<typeof vi.fn>;
      addTo: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    }, { element }: { element: HTMLElement }) {
      this.setLngLat = vi.fn().mockReturnThis();
      this.addTo = vi.fn(() => {
        document.body.appendChild(element);
        return this;
      });
      this.remove = vi.fn(() => element.remove());
    }),
    NavigationControl: vi.fn(),
    LngLatBounds: vi.fn(function BoundsMock(this: {
      extend: ReturnType<typeof vi.fn>;
    }) {
      this.extend = vi.fn();
    }),
  },
}));

vi.mock('../components/share/SingleCatPosterPreviewModal', () => ({
  default: ({ item, onClose }: { item: ScrapbookItem; onClose: () => void }) => (
    <div role="dialog" aria-label="分享這隻貓">
      <p>preview {item.id}</p>
      <button type="button" onClick={onClose}>關閉分享預覽</button>
    </div>
  ),
}));

vi.mock('../components/LocationPicker', () => ({
  default: ({
    initialLocation,
    onPicked,
    onClose,
  }: {
    initialLocation?: ScrapbookItem['location'];
    onPicked: (location: NonNullable<ScrapbookItem['location']>) => void;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label="選擇遇見地點">
      <p>editing {initialLocation?.name}</p>
      <button
        type="button"
        onClick={() => onPicked({
          lat: 25.0478,
          lng: 121.5319,
          name: '新咖啡店',
          address: '台北市中山區',
          placeId: 'new-place',
        })}
      >
        更新測試地點
      </button>
      <button type="button" onClick={onClose}>關閉地點編輯</button>
    </div>
  ),
}));

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: overrides.id ?? 'cat-29',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
  catdexNumber: overrides.catdexNumber ?? 29,
  date: overrides.date ?? '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location ?? {
    lat: 25.033,
    lng: 121.565,
    name: '巷口咖啡店',
    address: '台北市信義區',
  },
  catName: overrides.catName,
  catBreed: overrides.catBreed,
  catColor: overrides.catColor,
  personalityTags: overrides.personalityTags,
  spotNote: overrides.spotNote,
  careStatusTags: overrides.careStatusTags,
});

describe('Map page', () => {
  beforeEach(() => {
    useScrapbookStore.setState({
      items: [
        makeItem({
          catBreed: 'tabby',
          catColor: 'orange-tabby',
        }),
      ],
      isLoading: false,
      language: 'zh',
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
    vi.mocked(setCloudCatCardVisibility).mockClear();
    vi.mocked(setCloudCatCardVisibility).mockResolvedValue({ ok: true, isPublic: true });
    vi.mocked(loadPublicCatCards).mockClear();
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: true,
      items: [
        makeItem({
          id: 'public-cat-1',
          imageData: 'data:image/png;base64,public-cat',
          catdexNumber: 88,
          catName: '曼谷小橘',
          location: {
            lat: 13.7563,
            lng: 100.5018,
            name: '曼谷街角咖啡',
          },
          personalityTags: ['friendly'],
          careStatusTags: ['fed'],
          isPublic: true,
        }),
      ],
    });
    mapEaseTo.mockClear();
    mapFitBounds.mockClear();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('uses the treasure-map brand mark for the empty map state', async () => {
    useScrapbookStore.setState({
      items: [],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    const mapBrandMark = await screen.findByRole('img', { name: 'AI Moodboard V1 L4 貓咪地圖圖標' });
    expect(mapBrandMark).toBeInTheDocument();
    expect(mapBrandMark).toHaveTextContent('FOUND CAT');
    expect(mapBrandMark).not.toHaveTextContent(/Corner|Stickerbook/i);
    expect(screen.getByText('還沒有地圖記錄')).toBeInTheDocument();
  });

  it('uses the shared moodboard brand header with logo and close navigation', async () => {
    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    expect(await screen.findByRole('link', { name: '回到首頁' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '關閉回首頁' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('img', { name: '轉角遇到貓 FOUND CAT Logo' })).toBeInTheDocument();
  });

  it('guides users from an unconfigured shared map back to cloud backup setup', async () => {
    const user = userEvent.setup();
    vi.mocked(loadPublicCatCards).mockResolvedValue({ ok: false, reason: 'cloud_not_configured' });

    useScrapbookStore.setState({
      items: [],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '大家的地圖' }));

    expect(await screen.findByText('大家的地圖準備中')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '備份我的貓咪地圖' })).toBeInTheDocument();
  });

  it('opens the shared cat map directly from the public map query', async () => {
    render(
      <MemoryRouter initialEntries={['/map?mode=public']}>
        <Map />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: '大家的地圖' })).toHaveAttribute('aria-pressed', 'true');
    expect(loadPublicCatCards).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('button', { name: '曼谷街角咖啡' })).toBeInTheDocument();
  });

  it('pins the MapLibre container with inline geometry so library CSS cannot collapse it', async () => {
    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    const mapContainer = await screen.findByTestId('cat-map-container');
    expect(mapContainer).toHaveStyle({
      position: 'absolute',
      inset: '0px',
      width: '100%',
      height: '100%',
    });
  });

  it('opens an expanded cat detail sheet from a map marker and can enlarge the photo', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '巷口咖啡店' }));

    expect(await screen.findByText('No.029')).toBeInTheDocument();
    expect(screen.getByText('巷口咖啡店')).toBeInTheDocument();
    expect(screen.queryByText('台北市信義區')).not.toBeInTheDocument();
    expect(screen.getByText('虎斑貓 · 橘虎斑')).toBeInTheDocument();
    expect(screen.getByText('2026年5月11日')).toBeInTheDocument();
    expect(screen.queryByLabelText('幫這張貓咪圖鑑卡片取名字')).not.toBeInTheDocument();
    expect(screen.getByTestId('map-cat-detail-sheet')).toHaveStyle({
      maxHeight: 'min(calc(100dvh - 6.75rem - env(safe-area-inset-bottom)), 620px)',
      transformOrigin: 'bottom center',
    });
    expect(screen.getByTestId('map-cat-detail-sheet')).toHaveClass(
      'left-0',
      'right-0',
      'mx-auto',
      'w-[calc(100%_-_1.5rem)]',
      'max-w-sm'
    );
    expect(screen.getByTestId('map-cat-photo-frame')).toHaveClass(
      'h-[clamp(220px,45dvh,360px)]'
    );
    expect(screen.getByTestId('map-card-scroll')).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto');
    expect(screen.getByTestId('map-card-action-row').children).toHaveLength(2);
    expect(screen.getByRole('button', { name: '編輯地點' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '在 Google Maps 打開' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '補充貓咪資訊' })).toBeInTheDocument();

    await waitFor(() => {
      expect(mapEaseTo).toHaveBeenCalledWith(
        expect.objectContaining({ center: [121.565, 25.033], zoom: 15 })
      );
    });

    await user.click(screen.getByRole('button', { name: '放大貓咪照片' }));

    expect(screen.getByRole('dialog', { name: '貓咪照片' })).toBeInTheDocument();
    expect(screen.getByAltText('放大的貓咪照片')).toBeInTheDocument();
  });

  it('groups cats saved at the same place and lets the detail sheet switch between them', async () => {
    const user = userEvent.setup();

    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'cat-29',
          catdexNumber: 29,
          catName: '巷口小虎',
          location: {
            lat: 25.033,
            lng: 121.565,
            name: '巷口咖啡店',
            address: '台北市信義區',
            placeId: 'corner-cafe',
          },
        }),
        makeItem({
          id: 'cat-30',
          catdexNumber: 30,
          catName: '門口賓士',
          imageData: 'data:image/png;base64,cat-30',
          location: {
            lat: 25.033,
            lng: 121.565,
            name: '巷口咖啡店',
            address: '台北市信義區',
            placeId: 'corner-cafe',
          },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '巷口咖啡店，2 隻貓' }));

    expect(await screen.findByText('No.029')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '巷口小虎' })).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '下一隻同地點貓咪' }));

    expect(await screen.findByText('No.030')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '門口賓士' })).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '上一隻同地點貓咪' }));

    expect(await screen.findByText('No.029')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '巷口小虎' })).toBeInTheDocument();
  });

  it('lets mapped cats be updated with post-capture encounter notes and a custom cat name', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '巷口咖啡店' }));
    await user.click(screen.getByRole('button', { name: '補充貓咪資訊' }));
    expect(await screen.findByRole('dialog', { name: '補充這隻貓的線索' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('幫這張貓咪圖鑑卡片取名字'), '放鬆的貓咪');
    await user.click(await screen.findByRole('button', { name: '親人' }));
    await user.click(screen.getByRole('button', { name: '固定餵養' }));
    await user.type(screen.getByLabelText('出沒備註'), '飯店右手邊門口的紙箱');
    await user.click(screen.getByRole('button', { name: '儲存貓咪資訊' }));

    await waitFor(() => {
      expect(useScrapbookStore.getState().items[0]).toMatchObject({
        catName: '放鬆的貓咪',
        personalityTags: ['friendly'],
        careStatusTags: ['fed'],
        spotNote: '飯店右手邊門口的紙箱',
      });
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '補充這隻貓的線索' })).not.toBeInTheDocument();
    });
    expect(screen.getByRole('heading', { name: '放鬆的貓咪' })).toBeInTheDocument();
    expect(screen.getByText('飯店右手邊門口的紙箱')).toBeInTheDocument();
    expect(screen.getByText('親人')).toBeInTheDocument();
    expect(screen.getByText('固定餵養')).toBeInTheDocument();
  });

  it('opens the single-cat poster preview from the map detail card', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '巷口咖啡店' }));
    await user.click(await screen.findByRole('button', { name: '分享這隻貓' }));

    expect(await screen.findByRole('dialog', { name: '分享這隻貓' })).toBeInTheDocument();
    expect(screen.getByText('preview cat-29')).toBeInTheDocument();
  });

  it('links directly from the map detail card to Google Maps navigation', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '巷口咖啡店' }));

    expect(screen.queryByText('25.03300, 121.56500')).not.toBeInTheDocument();
    expect(await screen.findByRole('link', { name: '在 Google Maps 打開' })).toHaveAttribute(
      'href',
      buildGoogleMapsSearchUrl({
        lat: 25.033,
        lng: 121.565,
        name: '巷口咖啡店',
        address: '台北市信義區',
      })
    );
  });

  it('updates a mapped cat location from the map detail card', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '巷口咖啡店' }));
    await user.click(await screen.findByRole('button', { name: '編輯地點' }));

    expect(screen.getByRole('dialog', { name: '選擇遇見地點' })).toBeInTheDocument();
    expect(screen.getByText('editing 巷口咖啡店')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '更新測試地點' }));

    await waitFor(() => {
      expect(useScrapbookStore.getState().items[0].location).toMatchObject({
        lat: 25.0478,
        lng: 121.5319,
        name: '新咖啡店',
        address: '台北市中山區',
        placeId: 'new-place',
      });
    });
  });

  it('lets signed-in users publish and unpublish a mapped cat from the detail card', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      isConfigured: true,
      user: {
        id: 'user-1',
        email: 'cat@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2026-06-02T00:00:00.000Z',
      },
    });

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '巷口咖啡店' }));
    await user.click(await screen.findByRole('button', { name: '公開到大家的地圖' }));

    await waitFor(() => {
      expect(setCloudCatCardVisibility).toHaveBeenCalledWith({
        ownerId: 'user-1',
        item: expect.objectContaining({ id: 'cat-29' }),
        isPublic: true,
      });
    });
    await waitFor(() => {
      expect(useScrapbookStore.getState().items[0].isPublic).toBe(true);
    });
    expect(await screen.findByText('已公開在大家的地圖')).toBeInTheDocument();
    expect(screen.getByText('已同步到大家的地圖，現在可以去看看公開貓點。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '去大家的地圖查看' }));

    await waitFor(() => {
      expect(loadPublicCatCards).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('button', { name: '大家的地圖' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByRole('button', { name: '曼谷街角咖啡' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '我的地圖' }));
    await user.click(await screen.findByRole('button', { name: '巷口咖啡店' }));

    vi.mocked(setCloudCatCardVisibility).mockResolvedValue({ ok: true, isPublic: false });
    await user.click(await screen.findByRole('button', { name: '從大家的地圖移除' }));

    await waitFor(() => {
      expect(setCloudCatCardVisibility).toHaveBeenLastCalledWith({
        ownerId: 'user-1',
        item: expect.objectContaining({ id: 'cat-29' }),
        isPublic: false,
      });
    });
    await waitFor(() => {
      expect(useScrapbookStore.getState().items[0].isPublic).toBe(false);
    });
  });

  it('does not show the publish control to logged-out users', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '巷口咖啡店' }));

    expect(screen.queryByRole('button', { name: '公開到大家的地圖' })).not.toBeInTheDocument();
  });

  it('invites logged-out users to sign in before publishing a local cat to the shared map', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      isConfigured: true,
      user: null,
    });

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '巷口咖啡店' }));

    expect(screen.queryByRole('button', { name: '公開到大家的地圖' })).not.toBeInTheDocument();
    expect(screen.getByText('登入後可以備份，也能把這隻貓公開到大家的地圖。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '備份我的貓咪地圖' })).toBeInTheDocument();
  });

  it('switches between my local map and the public shared map', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: '巷口咖啡店' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '我的地圖' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: '大家的地圖' }));

    await waitFor(() => {
      expect(loadPublicCatCards).toHaveBeenCalledTimes(1);
    });
    expect(await screen.findByRole('button', { name: '曼谷街角咖啡' })).toBeInTheDocument();
    expect(screen.getByText('1 個公開貓點')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '曼谷街角咖啡' }));

    expect(await screen.findByRole('heading', { name: '曼谷小橘' })).toBeInTheDocument();
    expect(screen.getByText('親人')).toBeInTheDocument();
    expect(screen.getByText('固定餵養')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '貓咪詳情' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '編輯地點' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '補充貓咪資訊' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '公開到大家的地圖' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '我的地圖' }));

    expect(await screen.findByRole('button', { name: '巷口咖啡店' })).toBeInTheDocument();
  });

  it('shows a branded public-map empty state when public loading fails', async () => {
    const user = userEvent.setup();
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: false,
      reason: 'public_load_failed',
      message: 'network failed',
    });

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '大家的地圖' }));

    expect(await screen.findByText('大家的地圖暫時載入失敗')).toBeInTheDocument();
    expect(screen.getByText('可能是網路或雲端暫時不穩，可以重新載入或先回到我的地圖。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新載入大家的地圖' })).toBeInTheDocument();
  });

  it('retries the shared map after a public loading failure', async () => {
    const user = userEvent.setup();
    vi.mocked(loadPublicCatCards)
      .mockResolvedValueOnce({
        ok: false,
        reason: 'public_load_failed',
        message: 'network failed',
      })
      .mockResolvedValueOnce({
        ok: true,
        items: [
          makeItem({
            id: 'public-cat-retry',
            imageData: 'data:image/png;base64,public-cat-retry',
            catdexNumber: 89,
            catName: '重試後的小貓',
            location: {
              lat: 13.7563,
              lng: 100.5018,
              name: '重試後咖啡店',
            },
            isPublic: true,
          }),
        ],
      });

    render(
      <MemoryRouter initialEntries={['/map?mode=public']}>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '重新載入大家的地圖' }));

    await waitFor(() => {
      expect(loadPublicCatCards).toHaveBeenCalledTimes(2);
    });
    expect(await screen.findByRole('button', { name: '重試後咖啡店' })).toBeInTheDocument();
  });

  it('guides users to publish the first shared cat when the shared map is empty', async () => {
    const user = userEvent.setup();
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: true,
      items: [],
    });

    render(
      <MemoryRouter initialEntries={['/map?mode=public']}>
        <Map />
      </MemoryRouter>
    );

    expect(await screen.findByText('大家的地圖還沒有貓貓')).toBeInTheDocument();
    expect(screen.getByText('現在還沒有公開貓點。先回到我的地圖，把你遇到的第一隻貓公開出來。')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '回我的地圖公開第一隻貓' }));

    expect(screen.getByRole('button', { name: '我的地圖' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('explains that the shared map is preparing when cloud is not configured yet', async () => {
    const user = userEvent.setup();
    vi.mocked(loadPublicCatCards).mockResolvedValue({
      ok: false,
      reason: 'cloud_not_configured',
    });

    render(
      <MemoryRouter>
        <Map />
      </MemoryRouter>
    );

    await user.click(await screen.findByRole('button', { name: '大家的地圖' }));

    expect(await screen.findByText('大家的地圖準備中')).toBeInTheDocument();
    expect(screen.getByText('雲端地圖還在準備。你仍然可以先把遇到的貓存在我的地圖，之後再公開到大家的地圖。')).toBeInTheDocument();
    expect(screen.queryByText('大家的地圖暫時載入失敗')).not.toBeInTheDocument();
  });

  it('opens the requested cat card from a map deep link', async () => {
    render(
      <MemoryRouter initialEntries={['/map?cat=cat-29']}>
        <Map />
      </MemoryRouter>
    );

    expect(await screen.findByText('No.029')).toBeInTheDocument();
    expect(screen.getByText('巷口咖啡店')).toBeInTheDocument();

    await waitFor(() => {
      expect(mapEaseTo).toHaveBeenCalledWith(
        expect.objectContaining({ center: [121.565, 25.033], zoom: 15 })
      );
    });
  });
});
