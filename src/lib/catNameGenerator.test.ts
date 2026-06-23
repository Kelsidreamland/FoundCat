import { describe, expect, it } from 'vitest';
import { suggestCatName } from './catNameGenerator';
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
