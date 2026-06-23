import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import {
  buildCatMapCsv,
  downloadCatMapCsv,
  prepareCatMapCsvExport,
} from './mapExport';

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: overrides.id ?? 'cat-1',
  type: 'sticker',
  imageData: 'data:image/png;base64,cat',
  catdexNumber: overrides.catdexNumber ?? 7,
  catName: overrides.catName,
  date: overrides.date ?? '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location,
  personalityTags: overrides.personalityTags,
  careStatusTags: overrides.careStatusTags,
  spotNote: overrides.spotNote,
});

describe('map export helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a Google My Maps-friendly CSV with coordinates, WKT, and a readable map URL', () => {
    const csv = buildCatMapCsv([
      makeItem({
        id: 'cat-1',
        catdexNumber: 1,
        catName: '放鬆的貓咪',
        location: { lat: 25.033, lng: 121.565, name: '台北 101', address: '台北市信義區' },
        spotNote: '晚上在紅色花園旁邊',
      }),
      makeItem({ id: 'cat-no-location', catdexNumber: 2 }),
    ], {
      title: 'Kevin 的 FOUND CAT 地圖',
      includeMemo: true,
      language: 'zh',
    });

    expect(csv).toContain('Title,Number,Location,Address,Latitude,Longitude,WKT,Date,Memo,Google Maps URL');
    expect(csv).toContain('放鬆的貓咪,No.001,台北 101,台北市信義區,25.033,121.565,POINT(121.565 25.033)');
    expect(csv).toContain('晚上在紅色花園旁邊');
    expect(csv).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(csv).not.toContain('cat-no-location');
  });

  it('exports a saved Google Maps link when the cat card has one', () => {
    const csv = buildCatMapCsv([
      makeItem({
        catName: '短連結貓',
        location: {
          lat: 25.033,
          lng: 121.565,
          name: '貓咪出沒點',
          mapUrl: 'https://maps.app.goo.gl/catspot',
        },
      }),
    ], {
      title: '我的貓咪地圖',
      includeMemo: false,
      language: 'zh',
    });

    expect(csv).toContain('https://maps.app.goo.gl/catspot');
    expect(csv).not.toContain('query=25.033%2C121.565');
  });

  it('keeps memo private unless the user opts into exporting it', () => {
    const csv = buildCatMapCsv([
      makeItem({
        location: { lat: 25.033, lng: 121.565, name: '巷口咖啡店' },
        spotNote: '不要公開',
      }),
    ], {
      title: '我的貓咪地圖',
      includeMemo: false,
      language: 'zh',
    });

    expect(csv).not.toContain('不要公開');
  });

  it('escapes commas, quotes, and line breaks for spreadsheet import', () => {
    const csv = buildCatMapCsv([
      makeItem({
        catName: 'Kevin "Cat"',
        location: { lat: 25.033, lng: 121.565, name: 'Cafe, Corner' },
        spotNote: 'line 1\nline 2',
      }),
    ], {
      title: 'Map',
      includeMemo: true,
      language: 'en',
    });

    expect(csv).toContain('"Kevin ""Cat"""');
    expect(csv).toContain('"Cafe, Corner"');
    expect(csv).toContain('"line 1\nline 2"');
  });

  it('prepares a stable csv filename from the map title', () => {
    const exportFile = prepareCatMapCsvExport({
      title: 'Kevin / FOUND CAT 地圖',
      items: [makeItem({ location: { lat: 25.033, lng: 121.565, name: '台北 101' } })],
      includeMemo: false,
      language: 'zh',
    });

    expect(exportFile.fileName).toBe('found-cat-kevin-found-cat-map.csv');
    expect(exportFile.mimeType).toBe('text/csv;charset=utf-8');
    expect(exportFile.content.startsWith('\uFEFF')).toBe(true);
  });

  it('downloads the prepared csv file in the browser', () => {
    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, 'appendChild');
    const removeChild = vi.spyOn(document.body, 'removeChild');
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cat-map');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      const element = document.createElementNS('http://www.w3.org/1999/xhtml', tagName);
      if (tagName === 'a') {
        Object.defineProperty(element, 'click', { value: click });
      }
      return element as HTMLElement;
    });

    downloadCatMapCsv({
      title: '我的地圖',
      items: [makeItem({ location: { lat: 25.033, lng: 121.565, name: '台北 101' } })],
      includeMemo: false,
      language: 'zh',
    });

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(appendChild).toHaveBeenCalledWith(expect.objectContaining({
      href: 'blob:cat-map',
      download: 'found-cat-my-map.csv',
    }));
    expect(click).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:cat-map');
  });
});
