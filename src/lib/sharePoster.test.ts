import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import {
  APP_SHARE_URL,
  buildCatCardPosterShareText,
  buildCatdexPosterShareText,
  buildCatMapPosterShareText,
  createShareQrCodeDataUrl,
  prepareCatMapPosterShare,
  prepareSingleCatPosterShare,
  sharePosterBlob,
} from './sharePoster';

const makeItem = (overrides: Partial<ScrapbookItem>): ScrapbookItem => ({
  id: overrides.id ?? 'cat-1',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
  catdexNumber: overrides.catdexNumber,
  catName: overrides.catName,
  date: overrides.date ?? '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location,
  spotNote: overrides.spotNote,
});

describe('share poster helpers', () => {
  const originalNavigator = {
    share: navigator.share,
    canShare: navigator.canShare,
    clipboard: navigator.clipboard,
  };

  beforeEach(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn(async () => undefined),
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => true),
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: originalNavigator.share,
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: originalNavigator.canShare,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalNavigator.clipboard,
    });
    vi.restoreAllMocks();
  });

  it('builds single-card share text with the app link', () => {
    const text = buildCatCardPosterShareText(
      makeItem({
        catdexNumber: 29,
        catName: '放鬆的貓咪',
        location: {
          lat: 25.033,
          lng: 121.565,
          name: '巷口咖啡店',
          address: '台北市信義區',
        },
      }),
      'zh'
    );

    expect(text).toContain('轉角遇到貓 No.029');
    expect(text).toContain('放鬆的貓咪');
    expect(text).toContain('巷口咖啡店');
    expect(text).toContain('台北市信義區');
    expect(text).toContain(APP_SHARE_URL);
  });

  it('builds English single-card share text with FOUND CAT', () => {
    const text = buildCatCardPosterShareText(
      makeItem({
        catdexNumber: 29,
        location: { lat: 25.033, lng: 121.565, name: 'Taipei 101' },
      }),
      'en'
    );

    expect(text).toContain('FOUND CAT No.029');
    expect(text).not.toContain('Corner Cat Stickerbook');
  });

  it('builds catdex share text with the full collection count and app link', () => {
    const text = buildCatdexPosterShareText({
      displayName: '小美的貓咪圖鑑',
      count: 12,
      language: 'zh',
    });

    expect(text).toContain('小美的貓咪圖鑑');
    expect(text).toContain('已收集 12 隻貓');
    expect(text).toContain(APP_SHARE_URL);
  });

  it('uses the FOUND CAT production share URL by default', () => {
    expect(APP_SHARE_URL).toBe('https://found-cat.vercel.app/');
  });

  it('builds cat map share text with mapped cat count and app link', () => {
    const text = buildCatMapPosterShareText({
      title: 'My FOUND CAT Map',
      count: 3,
      language: 'en',
    });

    expect(text).toContain('My FOUND CAT Map');
    expect(text).toContain('3 cat spots');
    expect(text).toContain(APP_SHARE_URL);
  });

  it('creates a scannable QR code data URL for poster links', async () => {
    const qrCode = await createShareQrCodeDataUrl(APP_SHARE_URL);

    expect(qrCode).toMatch(/^data:image\/png;base64,/);
  });

  it('prepares a single-cat poster share with the provided QR target URL', async () => {
    const OriginalImage = window.Image;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    const context = {
      beginPath: vi.fn(),
      closePath: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      stroke: vi.fn(),
      measureText: vi.fn(() => ({ width: 120 })),
      fillStyle: '',
      font: '',
      lineWidth: 0,
      shadowBlur: 0,
      shadowColor: '',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      strokeStyle: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
    };

    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin = '';
      naturalWidth = 100;
      naturalHeight = 100;

      set src(_value: string) {
        window.setTimeout(() => this.onerror?.(), 0);
      }
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => context),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => {
        callback(new Blob(['poster'], { type: 'image/png' }));
      }),
    });

    try {
      const item = makeItem({
        catdexNumber: 29,
        location: { lat: 25.033, lng: 121.565, name: '台北 101' },
      });

      const result = await prepareSingleCatPosterShare({
        item,
        language: 'zh',
        shareUrl: `${APP_SHARE_URL}s/c?data=abc123`,
      });

      expect(result.fileName).toBe('found-cat-no-029.png');
      expect(result.title).toBe('轉角遇到貓 / FOUND CAT');
      expect(result.url).toBe(`${APP_SHARE_URL}s/c?data=abc123`);
      expect(result.text).toContain('轉角遇到貓 No.029');
    } finally {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: originalGetContext,
      });
      Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        configurable: true,
        value: originalToBlob,
      });
      vi.stubGlobal('Image', OriginalImage);
    }
  });

  it('prepares a cat map poster share for the /s/map route', async () => {
    const OriginalImage = window.Image;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    const context = {
      beginPath: vi.fn(),
      closePath: vi.fn(),
      clip: vi.fn(),
      drawImage: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      restore: vi.fn(),
      save: vi.fn(),
      stroke: vi.fn(),
      measureText: vi.fn(() => ({ width: 120 })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillStyle: '',
      font: '',
      lineWidth: 0,
      shadowBlur: 0,
      shadowColor: '',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      strokeStyle: '',
      textAlign: 'left',
      textBaseline: 'alphabetic',
    };

    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin = '';
      naturalWidth = 100;
      naturalHeight = 100;

      set src(_value: string) {
        window.setTimeout(() => this.onerror?.(), 0);
      }
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => context),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => {
        callback(new Blob(['poster'], { type: 'image/png' }));
      }),
    });

    try {
      const result = await prepareCatMapPosterShare({
        title: 'Kevin 的貓咪地圖',
        items: [
          makeItem({
            id: 'cat-1',
            catdexNumber: 1,
            location: { lat: 25.033, lng: 121.565, name: '台北 101' },
          }),
        ],
        language: 'zh',
        includeMemo: false,
      });

      expect(result.fileName).toBe('found-cat-map.png');
      expect(result.title).toBe('轉角遇到貓 / FOUND CAT');
      expect(result.url).toMatch(/^https:\/\/found-cat\.vercel\.app\/s\/map\?data=/);
      expect(result.text).toContain('Kevin 的貓咪地圖');
    } finally {
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: originalGetContext,
      });
      Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        configurable: true,
        value: originalToBlob,
      });
      vi.stubGlobal('Image', OriginalImage);
    }
  });

  it('shares poster files with text and url when the browser supports file sharing', async () => {
    const blob = new Blob(['poster'], { type: 'image/png' });

    const result = await sharePosterBlob({
      blob,
      fileName: 'corner-cat-card.png',
      title: '轉角遇到貓',
      text: '分享貓卡',
      url: APP_SHARE_URL,
    });

    expect(result).toBe('shared-file');
    expect(navigator.canShare).toHaveBeenCalledWith({
      files: [expect.any(File)],
    });
    expect(navigator.share).toHaveBeenCalledWith({
      files: [expect.any(File)],
      title: '轉角遇到貓',
      text: `分享貓卡\n${APP_SHARE_URL}`,
      url: APP_SHARE_URL,
    });
  });

  it('downloads the poster and shares text when file sharing is unsupported', async () => {
    const blob = new Blob(['poster'], { type: 'image/png' });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:poster');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const writeText = vi.fn(async () => undefined);

    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn(() => false),
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const result = await sharePosterBlob({
      blob,
      fileName: 'corner-cat-card.png',
      title: '轉角遇到貓',
      text: '分享貓卡',
      url: APP_SHARE_URL,
    });

    expect(result).toBe('shared-text');
    expect(writeText).toHaveBeenCalledWith(`分享貓卡\n${APP_SHARE_URL}`);
    expect(createObjectUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:poster');
    expect(navigator.share).toHaveBeenCalledWith({
      title: '轉角遇到貓',
      text: `分享貓卡\n${APP_SHARE_URL}`,
      url: APP_SHARE_URL,
    });
  });
});
