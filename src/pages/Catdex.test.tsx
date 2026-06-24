import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import Catdex from './Catdex';

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: overrides.id ?? 'cat-29',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
  catdexNumber: 'catdexNumber' in overrides ? overrides.catdexNumber : 29,
  publicNumber: overrides.publicNumber,
  collectedFromPublicId: overrides.collectedFromPublicId,
  collectedAt: overrides.collectedAt,
  date: overrides.date ?? '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location,
  catName: overrides.catName,
  catFeatureNote: overrides.catFeatureNote,
  personalityTags: overrides.personalityTags,
  spotNote: overrides.spotNote,
  careStatusTags: overrides.careStatusTags,
  catColor: overrides.catColor,
});

describe('Catdex page', () => {
  beforeEach(() => {
    useScrapbookStore.setState({
      items: [],
      isLoading: false,
      language: 'zh',
    });
  });

  afterEach(() => cleanup());

  it('uses the shared moodboard brand header with logo and close navigation', () => {
    render(
      <MemoryRouter>
        <Catdex />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '回到首頁' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '關閉回首頁' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('img', { name: '轉角遇到貓 FOUND CAT Logo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '我的貓卡' })).toBeInTheDocument();
  });

  it('keeps the primary app navigation available from my cat cards', () => {
    render(
      <MemoryRouter initialEntries={['/catdex']}>
        <Catdex />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation', { name: '主要操作' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '我的貓卡' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '拍貓' })).toHaveAttribute('href', '/create');
    expect(screen.getByRole('link', { name: '貓咪地圖' })).toHaveAttribute('href', '/map?mode=public');
  });

  it('shows custom cat names in the archive cards', () => {
    useScrapbookStore.setState({
      items: [
        makeItem({
          catName: '放鬆的貓咪',
          location: { lat: 25, lng: 121, name: '巷口咖啡店' },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Catdex />
      </MemoryRouter>
    );

    expect(screen.getByText('放鬆的貓咪')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '巷口咖啡店' })).toBeInTheDocument();
    expect(screen.getAllByText('巷口咖啡店')).toHaveLength(2);
  });

  it('shows a compact cat info summary in archive cards', () => {
    useScrapbookStore.setState({
      items: [
        makeItem({
          catName: '窗邊小虎',
          location: { lat: 25, lng: 121, name: '巷口咖啡店' },
          catFeatureNote: '左耳白毛，尾巴短短',
          personalityTags: ['friendly'],
          spotNote: '下午常在窗邊睡覺',
          careStatusTags: ['fed'],
          catColor: 'orange-tabby',
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Catdex />
      </MemoryRouter>
    );

    expect(screen.getByText('親人')).toBeInTheDocument();
    expect(screen.getByText('固定餵養')).toBeInTheDocument();
    expect(screen.getByText('橘虎斑')).toBeInTheDocument();
    expect(screen.getByText('特徵：左耳白毛，尾巴短短')).toBeInTheDocument();
    expect(screen.getByText('出沒線索：下午常在窗邊睡覺')).toBeInTheDocument();
  });

  it('groups saved cat cards by place so travelers can scan their collection', () => {
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'cat-taipei-1',
          catdexNumber: 1,
          catName: '巷口小虎',
          location: { lat: 25.033, lng: 121.565, name: '台北信義區' },
        }),
        makeItem({
          id: 'cat-taipei-2',
          catdexNumber: 2,
          catName: '便利商店貓',
          location: { lat: 25.034, lng: 121.566, name: '台北信義區' },
        }),
        makeItem({
          id: 'cat-bangkok-1',
          catdexNumber: 3,
          catName: '曼谷小橘',
          location: { lat: 13.7563, lng: 100.5018, name: 'Bangkok' },
        }),
        makeItem({
          id: 'cat-no-location',
          catdexNumber: 4,
          catName: '還沒標地點的貓',
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Catdex />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: '台北信義區' })).toBeInTheDocument();
    expect(screen.getByText('2 張貓卡')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bangkok' })).toBeInTheDocument();
    expect(screen.getAllByText('1 張貓卡')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: '未記錄地點' })).toBeInTheDocument();
    expect(screen.getByText('巷口小虎')).toBeInTheDocument();
    expect(screen.getByText('便利商店貓')).toBeInTheDocument();
    expect(screen.getByText('曼谷小橘')).toBeInTheDocument();
    expect(screen.getByText('還沒標地點的貓')).toBeInTheDocument();
  });

  it('uses tabs to switch between self-found cat cards and saved world cats', async () => {
    const user = userEvent.setup();
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'local-cat-1',
          catdexNumber: 1,
          publicNumber: 18,
          catName: '我拍到的小虎',
          location: { lat: 25.033, lng: 121.565, name: '台北信義區' },
        }),
        makeItem({
          id: 'saved-world-cat-88',
          catdexNumber: undefined,
          publicNumber: 88,
          collectedFromPublicId: 'public-cat-88',
          catName: '收藏的首爾店長',
          location: { lat: 37.5665, lng: 126.978, name: '首爾咖啡店', address: 'Seoul, South Korea' },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Catdex />
      </MemoryRouter>
    );

    const selfTab = screen.getByRole('button', { name: '我拍到的貓 1' });
    const worldTab = screen.getByRole('button', { name: '收藏的世界貓卡 1' });
    expect(selfTab).toHaveAttribute('aria-pressed', 'true');
    expect(worldTab).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: '我拍到的貓' })).toBeInTheDocument();
    expect(screen.getByText('我的圖鑑編號')).toBeInTheDocument();
    expect(screen.getByText('No.001 起算，只整理自己親自拍到的貓。')).toBeInTheDocument();
    expect(screen.getByText('我拍到的小虎')).toBeInTheDocument();
    expect(screen.getByText('FOUND CAT 001')).toBeInTheDocument();
    expect(screen.queryByText('收藏的首爾店長')).not.toBeInTheDocument();

    await user.click(worldTab);

    expect(selfTab).toHaveAttribute('aria-pressed', 'false');
    expect(worldTab).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: '收藏的世界貓卡' })).toBeInTheDocument();
    expect(screen.getByText('世界地圖編號')).toBeInTheDocument();
    expect(screen.getByText('保留 W-001 編號，不併入自己的 No 編號。')).toBeInTheDocument();
    expect(screen.getByText('收藏的首爾店長')).toBeInTheDocument();
    expect(screen.getByText('W-088')).toBeInTheDocument();
    expect(screen.getByText('收藏自全世界地圖')).toBeInTheDocument();
    expect(screen.queryByText('我拍到的小虎')).not.toBeInTheDocument();
    expect(screen.queryByText('FOUND CAT 088')).not.toBeInTheDocument();
  });

  it('shows a separated empty state for saved world cats instead of mixing them with self-found cards', async () => {
    const user = userEvent.setup();
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'local-cat-1',
          catdexNumber: 1,
          catName: '我拍到的小虎',
          location: { lat: 25.033, lng: 121.565, name: '台北信義區' },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Catdex />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: '收藏的世界貓卡 0' }));

    expect(screen.getByText('還沒有收藏世界貓卡')).toBeInTheDocument();
    expect(screen.getByText('回首頁左滑收藏喜歡的世界貓卡，牠們會保留 W 編號出現在這裡。')).toBeInTheDocument();
    expect(screen.queryByText('我拍到的小虎')).not.toBeInTheDocument();
  });

  it('shows a find-cat group instead of unreadable map URLs', () => {
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'cat-with-short-link',
          catdexNumber: 5,
          catName: '短連結貓',
          location: { lat: 25.033, lng: 121.565, name: 'https://maps.app.goo.gl/abc123' },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Catdex />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: '去找這隻貓' })).toBeInTheDocument();
    expect(screen.getByText('短連結貓')).toBeInTheDocument();
    expect(screen.queryByText('https://maps.app.goo.gl/abc123')).not.toBeInTheDocument();
  });
});
