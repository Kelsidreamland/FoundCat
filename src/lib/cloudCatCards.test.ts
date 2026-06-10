import { describe, expect, it } from 'vitest';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import {
  getPublicCloudCatCards,
  toCloudCatCardUpsert,
  toPublicCloudCatCard,
} from './cloudCatCards';

const localCat: ScrapbookItem = {
  id: 'cat-1',
  type: 'sticker',
  imageData: 'data:image/jpeg;base64,cat',
  heroImageData: 'data:image/jpeg;base64,hero',
  catdexNumber: 12,
  date: '2026-06-02T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  catName: '巷口小橘',
  personalityTags: ['friendly', 'foodie'],
  careStatusTags: ['tnr'],
  spotNote: '晚餐時間常在便利店旁邊',
  location: {
    lat: 13.7563,
    lng: 100.5018,
    name: '曼谷街角咖啡',
    address: 'Bangkok, Thailand',
    placeId: 'place-1',
  },
};

describe('cloud cat card mapping', () => {
  it('maps a local cat into a private cloud upsert payload by default', () => {
    expect(toCloudCatCardUpsert(localCat, 'user-1')).toEqual({
      id: 'cat-1',
      owner_id: 'user-1',
      catdex_number: 12,
      cat_name: '巷口小橘',
      image_data: 'data:image/jpeg;base64,cat',
      hero_image_data: 'data:image/jpeg;base64,hero',
      encountered_at: '2026-06-02T08:00:00.000Z',
      location_name: '曼谷街角咖啡',
      location_address: 'Bangkok, Thailand',
      location_place_id: 'place-1',
      lat: 13.7563,
      lng: 100.5018,
      personality_tags: ['friendly', 'foodie'],
      care_status_tags: ['tnr'],
      spot_note: '晚餐時間常在便利店旁邊',
      is_public: false,
    });
  });

  it('can publish a local cat through the cloud payload', () => {
    expect(toCloudCatCardUpsert(localCat, 'user-1', { isPublic: true }).is_public).toBe(true);
  });

  it('preserves local public visibility when backing up a published cat', () => {
    expect(toCloudCatCardUpsert({ ...localCat, isPublic: true }, 'user-1').is_public).toBe(true);
  });

  it('keeps cats without locations private-backup capable but not public-map capable', () => {
    const catWithoutLocation = { ...localCat, location: undefined };

    expect(toCloudCatCardUpsert(catWithoutLocation, 'user-1')).toMatchObject({
      id: 'cat-1',
      owner_id: 'user-1',
      location_name: null,
      lat: null,
      lng: null,
    });
  });

  it('removes private note fields from the public map card', () => {
    const publicCard = toPublicCloudCatCard({
      ...toCloudCatCardUpsert(localCat, 'user-1', { isPublic: true }),
      created_at: '2026-06-02T08:00:00.000Z',
      updated_at: '2026-06-02T08:00:00.000Z',
    });

    expect(publicCard).toEqual({
      id: 'cat-1',
      catdexNumber: 12,
      catName: '巷口小橘',
      imageData: 'data:image/jpeg;base64,cat',
      heroImageData: 'data:image/jpeg;base64,hero',
      encounteredAt: '2026-06-02T08:00:00.000Z',
      locationName: '曼谷街角咖啡',
      lat: 13.7563,
      lng: 100.5018,
      personalityTags: ['friendly', 'foodie'],
      careStatusTags: ['tnr'],
    });
    expect(publicCard).not.toHaveProperty('spotNote');
  });

  it('filters public map cards to published cats with coordinates', () => {
    const privateRow = {
      ...toCloudCatCardUpsert(localCat, 'user-1'),
      created_at: '2026-06-02T08:00:00.000Z',
      updated_at: '2026-06-02T08:00:00.000Z',
    };
    const publicRow = {
      ...toCloudCatCardUpsert(localCat, 'user-1', { isPublic: true }),
      created_at: '2026-06-02T08:00:00.000Z',
      updated_at: '2026-06-02T08:00:00.000Z',
    };
    const publicWithoutLocation = {
      ...toCloudCatCardUpsert({ ...localCat, id: 'cat-2', location: undefined }, 'user-1', { isPublic: true }),
      created_at: '2026-06-02T08:00:00.000Z',
      updated_at: '2026-06-02T08:00:00.000Z',
    };

    expect(getPublicCloudCatCards([privateRow, publicRow, publicWithoutLocation])).toHaveLength(1);
    expect(getPublicCloudCatCards([privateRow, publicRow, publicWithoutLocation])[0].id).toBe('cat-1');
  });
});
