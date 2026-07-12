import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookItem } from '../../store/useScrapbookStore';
import { buildGoogleMapsSearchUrl } from '../../lib/singleCatShare';
import SingleCatPosterPreviewModal from './SingleCatPosterPreviewModal';

vi.mock('../../lib/sharePoster', () => ({
  APP_SHARE_URL: 'https://found-cat.vercel.app/',
  prepareSingleCatPosterShare: vi.fn(async () => ({
    blob: new Blob(['poster'], { type: 'image/png' }),
    fileName: 'found-cat-no-029.png',
    title: '轉角遇到貓 / FOUND CAT',
    text: '轉角遇到貓 No.029',
    url: 'https://found-cat.vercel.app/s/c?data=abc',
  })),
  sharePosterBlob: vi.fn(async () => 'shared-file'),
}));

const item: ScrapbookItem = {
  id: 'cat-29',
  type: 'sticker',
  imageData: 'data:image/png;base64,cat',
  catdexNumber: 29,
  date: '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: { lat: 25.033, lng: 121.565, name: '台北 101' },
  catName: '放鬆的貓咪',
  spotNote: '晚上常在後方紅色花園附近',
};

describe('SingleCatPosterPreviewModal', () => {
  beforeEach(() => {
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:poster'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(() => undefined),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('shows a poster preview before sharing', async () => {
    render(<SingleCatPosterPreviewModal item={item} language="zh" onClose={vi.fn()} />);

    expect(await screen.findByRole('dialog', { name: '分享這隻貓' })).toBeInTheDocument();
    expect(screen.getByTestId('single-cat-share-panel')).toHaveClass('overflow-y-auto');
    expect(await screen.findByAltText('單貓分享海報預覽')).toHaveAttribute('src', 'blob:poster');
    expect(screen.getByText('分享頁預覽')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '放鬆的貓咪' })).toBeInTheDocument();
    expect(screen.getByText('台北 101')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '用 Google Maps 打開' })).toHaveAttribute(
      'href',
      buildGoogleMapsSearchUrl({ lat: 25.033, lng: 121.565, name: '台北 101' })
    );
    expect(screen.getByRole('button', { name: '分享海報' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '儲存圖片' })).toBeInTheDocument();
  });

  it('keeps the share preview controls in English mode', async () => {
    render(<SingleCatPosterPreviewModal item={item} language="en" onClose={vi.fn()} />);

    expect(await screen.findByRole('dialog', { name: 'Share this cat' })).toBeInTheDocument();
    expect(screen.getByText('Shared page preview')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Spot memo' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Include the spot memo on the shared page' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Share poster' })).toBeInTheDocument();
    expect(screen.queryByText('分享這隻貓')).not.toBeInTheDocument();
    expect(screen.queryByText('出沒備註')).not.toBeInTheDocument();
  });

  it('uses the saved Google Maps link in the preview when the cat card has one', async () => {
    render(
      <SingleCatPosterPreviewModal
        item={{
          ...item,
          location: {
            ...item.location!,
            mapUrl: 'https://maps.app.goo.gl/catspot',
          },
        }}
        language="zh"
        onClose={vi.fn()}
      />
    );

    expect(await screen.findByRole('link', { name: '用 Google Maps 打開' })).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/catspot'
    );
  });

  it('lets the owner opt in to memo sharing before generating the final poster data', async () => {
    const user = userEvent.setup();
    const { prepareSingleCatPosterShare } = await import('../../lib/sharePoster');

    render(<SingleCatPosterPreviewModal item={item} language="zh" onClose={vi.fn()} />);

    await user.click(await screen.findByRole('checkbox', { name: '在分享頁公開出沒備註' }));

    await waitFor(() => {
      expect(prepareSingleCatPosterShare).toHaveBeenLastCalledWith(
        expect.objectContaining({
          item,
          language: 'zh',
          includeMemo: true,
        })
      );
    });
    expect(screen.getAllByText('晚上常在後方紅色花園附近').length).toBeGreaterThanOrEqual(1);
  });

  it('lets the owner write a memo inside the share preview before opting in', async () => {
    const user = userEvent.setup();
    const { prepareSingleCatPosterShare } = await import('../../lib/sharePoster');

    render(
      <SingleCatPosterPreviewModal
        item={{ ...item, spotNote: undefined }}
        language="zh"
        onClose={vi.fn()}
      />
    );

    const memoSwitch = await screen.findByRole('checkbox', { name: '在分享頁公開出沒備註' });
    expect(memoSwitch).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: '出沒備註' }), '下午常在轉角紙箱睡覺');
    expect(memoSwitch).toBeEnabled();
    await user.click(memoSwitch);

    await waitFor(() => {
      expect(prepareSingleCatPosterShare).toHaveBeenLastCalledWith(
        expect.objectContaining({
          item: expect.objectContaining({ spotNote: '下午常在轉角紙箱睡覺' }),
          includeMemo: true,
        })
      );
    });
    expect(screen.getAllByText('下午常在轉角紙箱睡覺').length).toBeGreaterThanOrEqual(1);
  });

  it('shares the generated poster payload', async () => {
    const user = userEvent.setup();
    const { sharePosterBlob } = await import('../../lib/sharePoster');

    render(<SingleCatPosterPreviewModal item={item} language="zh" onClose={vi.fn()} />);

    await screen.findByAltText('單貓分享海報預覽');
    await user.click(screen.getByRole('button', { name: '分享海報' }));

    await waitFor(() => {
      expect(sharePosterBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: 'found-cat-no-029.png',
          title: '轉角遇到貓 / FOUND CAT',
        })
      );
    });
  });

  it('downloads the generated poster image', async () => {
    const user = userEvent.setup();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    render(<SingleCatPosterPreviewModal item={item} language="zh" onClose={vi.fn()} />);

    await screen.findByAltText('單貓分享海報預覽');
    await user.click(screen.getByRole('button', { name: '儲存圖片' }));

    await waitFor(() => {
      expect(click).toHaveBeenCalledTimes(1);
    });
  });

  it('closes from the preview dialog', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(<SingleCatPosterPreviewModal item={item} language="zh" onClose={onClose} />);

    await user.click(await screen.findByRole('button', { name: '關閉分享預覽' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
