import { describe, expect, it } from 'vitest';
import {
  CAT_MYSTERY_COPY,
  buildGoogleMapsSearchUrl,
  buildSingleCatSharePayload,
  decodeSingleCatSharePayload,
  encodeSingleCatSharePayload,
  getShareTagLabels,
} from './singleCatShare';
import type { ScrapbookItem } from '../store/useScrapbookStore';

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: overrides.id ?? 'cat-1',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
  heroImageData: overrides.heroImageData,
  catdexNumber: overrides.catdexNumber ?? 29,
  catName: overrides.catName,
  date: overrides.date ?? '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location ?? {
    lat: 25.033,
    lng: 121.565,
    name: '台北 101',
    address: '台北市信義區',
  },
  personalityTags: overrides.personalityTags,
  careStatusTags: overrides.careStatusTags,
  spotNote: overrides.spotNote,
});

describe('single cat share helpers', () => {
  it('encodes and decodes a compact single-cat payload with memo opt-in', () => {
    const payload = buildSingleCatSharePayload(makeItem({
      catName: '放鬆的貓咪',
      personalityTags: ['friendly'],
      careStatusTags: ['fed'],
      spotNote: '晚上常在後方紅色花園附近',
      location: {
        lat: 25.033,
        lng: 121.565,
        name: '台北 101',
        address: '台北市信義區',
        mapUrl: 'https://maps.app.goo.gl/catspot',
      },
    }), {
      includeMemo: true,
      language: 'zh',
    });

    const encoded = encodeSingleCatSharePayload(payload);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeSingleCatSharePayload(encoded)).toEqual(payload);
    expect(payload.catName).toBe('放鬆的貓咪');
    expect(payload.locationAddress).toBe('台北市信義區');
    expect(payload.locationMapUrl).toBe('https://maps.app.goo.gl/catspot');
  });

  it('omits memo when memo sharing is not opted in', () => {
    const payload = buildSingleCatSharePayload(makeItem({ spotNote: '不要自動公開' }), {
      includeMemo: false,
      language: 'zh',
    });

    expect(payload.includeMemo).toBe(false);
    expect(payload.memo).toBeUndefined();
  });

  it('returns null for invalid payload data', () => {
    expect(decodeSingleCatSharePayload('not-valid-json')).toBeNull();
  });

  it('builds a Google Maps search URL from a human-readable place when available', () => {
    expect(buildGoogleMapsSearchUrl({
      lat: 25.033,
      lng: 121.565,
      name: '台北 101',
      address: '台北市信義區市府路 45 號',
    })).toBe(
      'https://www.google.com/maps/search/?api=1&query=%E5%8F%B0%E5%8C%97%20101%20%E5%8F%B0%E5%8C%97%E5%B8%82%E4%BF%A1%E7%BE%A9%E5%8D%80%E5%B8%82%E5%BA%9C%E8%B7%AF%2045%20%E8%99%9F'
    );
  });

  it('falls back to coordinates when the place has no readable name', () => {
    expect(buildGoogleMapsSearchUrl({ lat: 25.033, lng: 121.565 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=25.033%2C121.565'
    );
  });

  it('does not use unreadable map links as the Google Maps search query', () => {
    expect(buildGoogleMapsSearchUrl({
      lat: 25.033,
      lng: 121.565,
      name: 'https://maps.app.goo.gl/abc123',
    })).toBe(
      'https://www.google.com/maps/search/?api=1&query=25.033%2C121.565'
    );
  });

  it('uses a saved Google Maps URL directly when the cat card has one', () => {
    expect(buildGoogleMapsSearchUrl({
      lat: 25.033,
      lng: 121.565,
      mapUrl: 'https://maps.app.goo.gl/abc123',
    })).toBe('https://maps.app.goo.gl/abc123');
  });

  it('uses mystery copy when no share tags are present', () => {
    expect(getShareTagLabels({ personalityTags: [], careStatusTags: [] }, 'zh')).toEqual([CAT_MYSTERY_COPY.zh]);
    expect(getShareTagLabels({ personalityTags: [], careStatusTags: [] }, 'en')).toEqual([CAT_MYSTERY_COPY.en]);
  });
});
