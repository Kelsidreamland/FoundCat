import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadCatMapCsv } from '../lib/mapExport';
import { decodeMapSharePayload } from '../lib/mapShare';
import { shareCatMapPoster } from '../lib/sharePoster';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import ShareCatdex from './ShareCatdex';

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
}));

vi.mock('../lib/sharePoster', () => ({
  shareCatMapPoster: vi.fn(async () => 'shared-file'),
}));

vi.mock('../lib/mapExport', () => ({
  downloadCatMapCsv: vi.fn(),
}));

const originalSetCatdexDisplayName = useScrapbookStore.getState().setCatdexDisplayName;
const originalClipboard = navigator.clipboard;

const makeItem = (overrides: Partial<ScrapbookItem>): ScrapbookItem => ({
  id: overrides.id ?? 'cat-1',
  type: 'sticker',
  imageData: 'data:image/png;base64,cat',
  catdexNumber: overrides.catdexNumber,
  date: overrides.date ?? '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location,
  spotNote: overrides.spotNote,
});

describe('ShareCatdex page', () => {
  beforeEach(() => {
    vi.mocked(shareCatMapPoster).mockClear();
    vi.mocked(downloadCatMapCsv).mockClear();
    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'cat-1',
          catdexNumber: 1,
          location: { lat: 25.033, lng: 121.565, name: '巷口咖啡店' },
          spotNote: '晚上常在門口',
        }),
        makeItem({
          id: 'cat-29',
          catdexNumber: 29,
          location: { lat: 25.0478, lng: 121.5319, name: '小公園' },
        }),
        makeItem({ id: 'cat-no-location', catdexNumber: 30 }),
      ],
      isLoading: false,
      language: 'zh',
      catdexDisplayName: '我的轉角貓地圖',
      setCatdexDisplayName: vi.fn(),
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
    useScrapbookStore.setState({ setCatdexDisplayName: originalSetCatdexDisplayName });
  });

  it('reframes the page as a bilingual cat map share flow', () => {
    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    const heading = screen.getByRole('heading', { name: '分享我的貓咪地圖' });
    expect(heading).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to English' })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('有地點')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /產生貓咪地圖海報/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /複製貓咪地圖連結/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /調整公開貓咪與匯出/ })).toBeInTheDocument();
  });

  it('reserves mobile safe-area space so share actions are not covered by bottom navigation', () => {
    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    expect(screen.getByRole('main')).toHaveClass('pb-[calc(6.75rem+env(safe-area-inset-bottom))]');
    expect(screen.getByRole('main')).not.toHaveClass('mb-[calc(5.75rem+env(safe-area-inset-bottom))]');
  });

  it('uses one primary poster action with compact direct-link sharing', () => {
    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    const actions = screen.getByRole('group', { name: '貓咪地圖分享動作' });
    expect(within(actions).getByRole('button', { name: /產生貓咪地圖海報/ })).toHaveClass('min-h-[52px]');
    expect(within(actions).getByRole('button', { name: /複製貓咪地圖連結/ })).toHaveClass('min-h-[48px]');
    expect(within(actions).queryByRole('button', { name: /匯出 Google My Maps CSV/ })).not.toBeInTheDocument();
  });

  it('keeps public-cat selection and CSV export behind advanced tools until opened', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    const actions = screen.getByRole('group', { name: '貓咪地圖分享動作' });
    expect(screen.queryByTestId('shared-cat-selection')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /匯出 Google My Maps CSV/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /調整公開貓咪與匯出/ }));

    const selection = screen.getByTestId('shared-cat-selection');
    expect(screen.getByLabelText('選取 巷口咖啡店')).toBeChecked();
    expect(screen.getByLabelText('選取 小公園')).toBeChecked();
    expect(screen.getByRole('button', { name: /匯出 Google My Maps CSV/ })).toBeInTheDocument();

    expect(Boolean(actions.compareDocumentPosition(selection) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
  });

  it('lets users edit the catdex display name', async () => {
    const user = userEvent.setup();
    const setCatdexDisplayName = vi.fn();
    useScrapbookStore.setState({ setCatdexDisplayName });

    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    await user.clear(screen.getByLabelText('地圖名稱'));
    await user.type(screen.getByLabelText('地圖名稱'), '小美的貓咪地圖');
    await user.tab();

    expect(setCatdexDisplayName).toHaveBeenCalledWith('小美的貓咪地圖');
  });

  it('migrates old default catdex names into the map naming system', () => {
    useScrapbookStore.setState({ catdexDisplayName: '我的轉角貓圖鑑' });

    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    expect(screen.getByLabelText('地圖名稱')).toHaveValue('我的轉角貓地圖');
  });

  it('uses a compact empty state instead of disabled share controls when no cats have locations', () => {
    useScrapbookStore.setState({
      items: [makeItem({ id: 'cat-no-location', catdexNumber: 30 })],
    });

    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    expect(screen.getByText('還沒有貓咪地圖點')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '記錄貓貓' })).toHaveAttribute('href', '/create');
    expect(screen.queryByText('選擇要公開的貓')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('公開出沒備註')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /產生貓咪地圖海報/ })).not.toBeInTheDocument();
  });

  it('shares selected mapped cats as a map poster and keeps memo private by default', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /調整公開貓咪與匯出/ }));
    await user.click(screen.getByLabelText('選取 小公園'));
    await user.click(screen.getByRole('button', { name: /產生貓咪地圖海報/ }));

    await waitFor(() => {
      expect(shareCatMapPoster).toHaveBeenCalledWith({
        title: '我的轉角貓地圖',
        items: [expect.objectContaining({ id: 'cat-1' })],
        language: 'zh',
        includeMemo: false,
      });
    });
  });

  it('exports selected mapped cats as a Google My Maps CSV', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /調整公開貓咪與匯出/ }));
    await user.click(screen.getByLabelText('選取 小公園'));
    await user.click(screen.getByRole('button', { name: /匯出 Google My Maps CSV/ }));

    expect(downloadCatMapCsv).toHaveBeenCalledWith({
      title: '我的轉角貓地圖',
      items: [expect.objectContaining({ id: 'cat-1' })],
      language: 'zh',
      includeMemo: false,
    });
  });

  it('copies a direct selected cat map link for manual sharing', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn<(value: string) => Promise<void>>(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /調整公開貓咪與匯出/ }));
    await user.click(screen.getByLabelText('選取 小公園'));
    await user.click(screen.getByRole('button', { name: /複製貓咪地圖連結/ }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/s/map?data='));
    });
    const copiedUrl = new URL(writeText.mock.calls[0][0]);
    const payload = decodeMapSharePayload(copiedUrl.searchParams.get('data'));

    expect(copiedUrl.origin).toBe(window.location.origin);
    expect(payload?.cats.map((cat) => cat.id)).toEqual(['cat-1']);
    expect(payload?.includeMemo).toBe(false);
    expect(screen.getByRole('button', { name: /已複製/ })).toBeInTheDocument();
  });

  it('defaults to selecting mapped cats after records finish loading', async () => {
    const user = userEvent.setup();
    useScrapbookStore.setState({ items: [] });

    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    useScrapbookStore.setState({
      items: [
        makeItem({
          id: 'cat-loaded',
          catdexNumber: 8,
          location: { lat: 25.033, lng: 121.565, name: '載入後的咖啡店' },
        }),
      ],
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /調整公開貓咪與匯出/ })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /調整公開貓咪與匯出/ }));

    expect(screen.getByLabelText('選取 載入後的咖啡店')).toBeChecked();
  });

  it('can switch the share map page into English', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ShareCatdex />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: 'Switch to English' }));

    expect(screen.getByRole('heading', { name: 'Share My Cat Map' })).toBeInTheDocument();
    expect(screen.getByText('Mapped')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generate cat map poster/ })).toBeInTheDocument();
  });
});
