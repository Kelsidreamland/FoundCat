import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shareCatCardPoster } from '../lib/sharePoster';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import Detail from './Detail';

vi.mock('../lib/sharePoster', () => ({
  shareCatCardPoster: vi.fn(async () => 'shared-file'),
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
  catName: overrides.catName,
  catFeatureNote: overrides.catFeatureNote,
  catBreed: overrides.catBreed,
  catColor: overrides.catColor,
  personalityTags: overrides.personalityTags,
  spotNote: overrides.spotNote,
  careStatusTags: overrides.careStatusTags,
  publicNumber: overrides.publicNumber,
  collectedFromPublicId: overrides.collectedFromPublicId,
  collectedAt: overrides.collectedAt,
  privateNote: overrides.privateNote,
});

function CurrentRoute() {
  const location = useLocation();
  return <div data-testid="current-route">{location.pathname}{location.search}</div>;
}

describe('Detail page', () => {
  beforeEach(() => {
    vi.mocked(shareCatCardPoster).mockClear();
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

  it('does not expose the temporary anonymous world-map publish action after launch rescue is complete', () => {
    render(
      <MemoryRouter initialEntries={['/detail/cat-1']}>
        <Routes>
          <Route path="/detail/:id" element={<Detail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.queryByRole('button', { name: '一鍵公開到全世界地圖' })).not.toBeInTheDocument();
    expect(screen.queryByText('貼文公開')).not.toBeInTheDocument();
  });

  it('prioritizes a simple find-cat CTA, personality tags, and notes over address noise', () => {
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'cat-1',
          catName: '巷口店長',
          location: {
            lat: 25.033,
            lng: 121.565,
            name: '巷口咖啡店',
            address: '台北市信義區貓咪路 1 號',
          },
          personalityTags: ['friendly', 'foodie'],
          careStatusTags: ['fed'],
          catFeatureNote: '左耳有一小塊白毛，看到相機會慢慢眨眼',
          spotNote: '傍晚常在門口紙箱睡覺',
          catColor: 'orange-tabby',
          catBreed: 'domestic-shorthair',
          date: '2026-05-11T08:00:00.000Z',
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter initialEntries={['/detail/cat-1']}>
        <Routes>
          <Route path="/detail/:id" element={<Detail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('巷口店長')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '去找這隻喵' })).toBeInTheDocument();
    expect(screen.queryByText('台北市信義區貓咪路 1 號')).not.toBeInTheDocument();
    expect(screen.queryByText('Google Maps')).not.toBeInTheDocument();
    expect(screen.queryByText('出發去找這隻喵')).not.toBeInTheDocument();
    expect(screen.getByText('貓咪個人檔案')).toBeInTheDocument();
    expect(screen.getByText('喵，謝謝你收藏我。下次見面可以慢慢眨眼。')).toBeInTheDocument();
    expect(screen.getByText('牠給人的感覺')).toBeInTheDocument();
    expect(screen.getByText('親人')).toBeInTheDocument();
    expect(screen.getByText('貪吃')).toBeInTheDocument();
    expect(screen.getByText('外型小檔案')).toBeInTheDocument();
    expect(screen.getByText('橘虎斑')).toBeInTheDocument();
    expect(screen.getByText('米克斯短毛')).toBeInTheDocument();
    expect(screen.getByText('特徵')).toBeInTheDocument();
    expect(screen.getByText('偶遇線索')).toBeInTheDocument();
    expect(screen.getByText('照護狀態')).toBeInTheDocument();
    expect(screen.getByText('出沒城市')).toBeInTheDocument();
    expect(screen.getByText('巷口咖啡店')).toBeInTheDocument();
    expect(screen.getByText('固定餵養')).toBeInTheDocument();
    expect(screen.getByText('左耳有一小塊白毛，看到相機會慢慢眨眼')).toBeInTheDocument();
    expect(screen.getByText('傍晚常在門口紙箱睡覺')).toBeInTheDocument();
    expect(screen.queryByText('貓咪毛色: 橘虎斑')).not.toBeInTheDocument();
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument();
  });

  it('does not show raw map URLs as the cat location', () => {
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'cat-1',
          catName: '短連結貓',
          location: {
            lat: 25.033,
            lng: 121.565,
            name: 'https://maps.app.goo.gl/abc123',
            address: 'https://maps.app.goo.gl/abc123',
          },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter initialEntries={['/detail/cat-1']}>
        <Routes>
          <Route path="/detail/:id" element={<Detail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('去找這隻喵')).toBeInTheDocument();
    expect(screen.queryByText('出發去找這隻喵')).not.toBeInTheDocument();
    expect(screen.queryByText('https://maps.app.goo.gl/abc123')).not.toBeInTheDocument();
  });

  it('lets me edit cat info and generate a playful local name', async () => {
    const user = userEvent.setup();
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'cat-1',
          catColor: 'orange-tabby',
          personalityTags: ['foodie'],
          spotNote: '躺在咖啡廳門口等飯',
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter initialEntries={['/detail/cat-1']}>
        <Routes>
          <Route path="/detail/:id" element={<Detail />} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '補充貓咪資訊' }));
    await user.click(screen.getByRole('button', { name: '幫我取名' }));
    await user.type(screen.getByLabelText('特徵描述'), '右眼旁邊有一點深色花紋');
    await user.type(screen.getByLabelText('偶遇線索'), '下雨天會躲在店門口');
    await user.click(screen.getByRole('button', { name: '高冷' }));
    await user.click(screen.getByRole('button', { name: '儲存貓咪資訊' }));

    await waitFor(() => {
      expect(useScrapbookStore.getState().items[0]).toMatchObject({
        catName: '懶散橘貓',
        catFeatureNote: '右眼旁邊有一點深色花紋',
        spotNote: '躺在咖啡廳門口等飯下雨天會躲在店門口',
        personalityTags: ['foodie', 'aloof'],
      });
    });

    expect(screen.getByText('懶散橘貓')).toBeInTheDocument();
    expect(screen.getByText('右眼旁邊有一點深色花紋')).toBeInTheDocument();
  });

  it('lets me edit only my private note for a saved world cat', async () => {
    const user = userEvent.setup();
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'saved-world-cat-88',
          catdexNumber: undefined,
          publicNumber: 88,
          collectedFromPublicId: 'public-cat-88',
          catName: '清邁店長',
          catFeatureNote: '右耳有白毛',
          spotNote: '常在寺廟門口',
          privateNote: '下次去清邁想找牠',
          location: {
            lat: 18.7883,
            lng: 98.9853,
            name: 'Chiang Mai',
          },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter initialEntries={['/detail/saved-world-cat-88']}>
        <Routes>
          <Route path="/detail/:id" element={<Detail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('我的備註')).toBeInTheDocument();
    expect(screen.getByText('下次去清邁想找牠')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '去找這隻喵' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '補充貓咪資訊' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '幫我取名' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '編輯我的備註' }));
    const noteInput = screen.getByLabelText('我的備註');
    await user.clear(noteInput);
    await user.type(noteInput, '想帶罐罐再去看牠');
    await user.click(screen.getByRole('button', { name: '儲存我的備註' }));

    await waitFor(() => {
      expect(useScrapbookStore.getState().items[0]).toMatchObject({
        id: 'saved-world-cat-88',
        privateNote: '想帶罐罐再去看牠',
        catName: '清邁店長',
        catFeatureNote: '右耳有白毛',
        spotNote: '常在寺廟門口',
        collectedFromPublicId: 'public-cat-88',
        publicNumber: 88,
      });
    });
  });

  it('navigates saved world cats back to their public world-map spot', async () => {
    const user = userEvent.setup();
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'saved-world-cat-88',
          catdexNumber: undefined,
          publicNumber: 88,
          collectedFromPublicId: 'public-cat-88',
          catName: '清邁店長',
          location: {
            lat: 18.7883,
            lng: 98.9853,
            name: 'Chiang Mai',
          },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter initialEntries={['/detail/saved-world-cat-88']}>
        <CurrentRoute />
        <Routes>
          <Route path="/detail/:id" element={<Detail />} />
          <Route path="/map" element={<div>Map page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '去找這隻喵' }));

    expect(await screen.findByTestId('current-route')).toHaveTextContent('/map?mode=public&cat=public-cat-88');
  });

  it('keeps self-found cats navigating to my private map spot', async () => {
    const user = userEvent.setup();
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'cat-1',
          catdexNumber: 12,
          catName: '巷口店長',
          location: {
            lat: 25.033,
            lng: 121.565,
            name: '巷口咖啡店',
          },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter initialEntries={['/detail/cat-1']}>
        <CurrentRoute />
        <Routes>
          <Route path="/detail/:id" element={<Detail />} />
          <Route path="/map" element={<div>Map page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '去找這隻喵' }));

    expect(await screen.findByTestId('current-route')).toHaveTextContent('/map?cat=cat-1&mode=mine');
  });

  it('does not expose location editing for a saved world cat without location', () => {
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'saved-world-cat-no-location',
          catdexNumber: undefined,
          publicNumber: 89,
          collectedFromPublicId: 'public-cat-89',
          catName: '沒有地點的世界貓',
          privateNote: '只想記下牠',
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter initialEntries={['/detail/saved-world-cat-no-location']}>
        <Routes>
          <Route path="/detail/:id" element={<Detail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('我的備註')).toBeInTheDocument();
    expect(screen.getByText('只想記下牠')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '補充貓咪資訊' })).not.toBeInTheDocument();
    expect(screen.queryByText('加入遇見地點')).not.toBeInTheDocument();
    expect(screen.queryByText('貼上 Google Maps 連結、搜尋地點或地址，也可以點一下地圖放置地點')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '去找這隻喵' })).not.toBeInTheDocument();
  });
});
