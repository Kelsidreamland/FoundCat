import { describe, expect, it } from 'vitest';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import {
  buildMapSharePath,
  buildMapSharePayload,
  buildMapShareUrl,
  decodeMapSharePayload,
  encodeMapSharePayload,
} from './mapShare';

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: overrides.id ?? 'cat-1',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
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

describe('map share helpers', () => {
  it('builds a compact share payload with only cats that have locations', () => {
    const payload = buildMapSharePayload([
      makeItem({
        id: 'cat-1',
        catdexNumber: 1,
        catName: '放鬆的貓咪',
        location: { lat: 25.033, lng: 121.565, name: '台北 101', address: '台北市信義區' },
        personalityTags: ['friendly'],
        careStatusTags: ['fed'],
        spotNote: '晚上在紅色花園旁邊',
      }),
      makeItem({ id: 'cat-no-location', catdexNumber: 2 }),
    ], {
      title: 'Kevin 的 FOUND CAT 地圖',
      includeMemo: true,
      language: 'zh',
    });

    expect(payload.title).toBe('Kevin 的 FOUND CAT 地圖');
    expect(payload.cats).toHaveLength(1);
    expect(payload.cats[0]).toMatchObject({
      id: 'cat-1',
      numberLabel: 'No.001',
      catName: '放鬆的貓咪',
      locationName: '台北 101',
      locationAddress: '台北市信義區',
      memo: '晚上在紅色花園旁邊',
    });
  });

  it('encodes and decodes map share payloads for the /s/map route', () => {
    const payload = buildMapSharePayload([
      makeItem({
        location: { lat: 25.033, lng: 121.565, name: '台北 101' },
        spotNote: '不要公開',
      }),
    ], {
      title: 'My FOUND CAT Map',
      includeMemo: false,
      language: 'en',
    });

    const encoded = encodeMapSharePayload(payload);

    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeMapSharePayload(encoded)).toEqual(payload);
    expect(payload.cats[0].memo).toBeUndefined();
    expect(buildMapSharePath(payload)).toMatch(/^\/s\/map\?data=/);
  });

  it('builds an absolute share URL for copying into chat apps', () => {
    const payload = buildMapSharePayload([
      makeItem({
        id: 'cat-1',
        location: { lat: 25.033, lng: 121.565, name: '台北 101' },
      }),
    ], {
      title: 'Kevin 的 FOUND CAT 地圖',
      includeMemo: false,
      language: 'zh',
    });

    const url = buildMapShareUrl(payload, 'https://found-cat.vercel.app');
    const parsed = new URL(url);

    expect(parsed.origin).toBe('https://found-cat.vercel.app');
    expect(parsed.pathname).toBe('/s/map');
    expect(decodeMapSharePayload(parsed.searchParams.get('data'))).toEqual(payload);
  });

  it('returns null for invalid map share data', () => {
    expect(decodeMapSharePayload('not-valid-json')).toBeNull();
  });
});
