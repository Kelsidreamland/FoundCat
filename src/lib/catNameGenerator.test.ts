import { describe, expect, it } from 'vitest';
import { getCatDisplayName, suggestCatName } from './catNameGenerator';
import type { ScrapbookItem } from '../store/useScrapbookStore';

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: overrides.id ?? 'cat-1',
  type: 'sticker',
  imageData: 'data:image/png;base64,cat',
  catdexNumber: overrides.catdexNumber ?? 3,
  date: '2026-06-23T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  ...overrides,
});

describe('suggestCatName', () => {
  it('uses color and note hints to suggest a playful Chinese name', () => {
    expect(
      suggestCatName(makeItem({
        catColor: 'orange-tabby',
        personalityTags: ['foodie'],
        spotNote: '躺在咖啡廳門口等飯',
      }), 'zh')
    ).toBe('懶散橘貓');
  });

  it('falls back to the cat card number when no visual hints exist', () => {
    expect(suggestCatName(makeItem({ catdexNumber: 8 }), 'zh')).toBe('轉角小貓 008');
    expect(suggestCatName(makeItem({ catdexNumber: 8 }), 'en')).toBe('Corner Cat 008');
  });
});

describe('getCatDisplayName', () => {
  const base = {
    id: 'c', type: 'sticker' as const, imageData: '', date: '2026-01-01', x: 0, y: 0, rotation: 0, scale: 1, zIndex: 1,
    catdexNumber: 7, location: { lat: 25, lng: 121, name: '宋廚菜館' },
  };

  it('uses the cat name when set', () => {
    expect(getCatDisplayName({ ...base, catName: ' 小橘 ' }, 'zh')).toBe('小橘');
  });

  it('falls back to a generated cat nickname instead of the place name', () => {
    expect(getCatDisplayName(base, 'zh')).toBe('轉角小貓 007');
    expect(getCatDisplayName(base, 'en')).toBe('Corner Cat 007');
  });
});
