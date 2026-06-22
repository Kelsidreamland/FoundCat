import { describe, expect, it } from 'vitest';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import {
  buildSingleCatShareText,
  formatCatCardNumberForItem,
  formatPublicCatCardNumber,
  getDeckNeighbors,
  sortCatCards,
} from './catdexDeck';

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
  publicNumber: overrides.publicNumber,
  isPublic: overrides.isPublic,
  collectedFromPublicId: overrides.collectedFromPublicId,
});

describe('catdex deck helpers', () => {
  it('sorts cat cards by stable catdex number, newest unnumbered cards last', () => {
    const cards = sortCatCards([
      makeItem({ id: 'cat-10', catdexNumber: 10 }),
      makeItem({ id: 'cat-2', catdexNumber: 2 }),
      makeItem({ id: 'cat-new', catdexNumber: undefined, date: '2026-05-12T08:00:00.000Z' }),
    ]);

    expect(cards.map((card) => card.id)).toEqual(['cat-2', 'cat-10', 'cat-new']);
  });

  it('sorts public and collected world cards by their public W-number', () => {
    const cards = sortCatCards([
      makeItem({
        id: 'public-cat-20',
        catdexNumber: 2,
        publicNumber: 20,
        isPublic: true,
      }),
      makeItem({
        id: 'public-cat-3',
        catdexNumber: 99,
        publicNumber: 3,
        isPublic: true,
      }),
      makeItem({
        id: 'saved-public-cat-8',
        catdexNumber: undefined,
        publicNumber: 8,
        collectedFromPublicId: 'public-cat-8',
      }),
    ]);

    expect(cards.map((card) => card.id)).toEqual(['public-cat-3', 'saved-public-cat-8', 'public-cat-20']);
  });

  it('returns circular previous and next deck neighbors', () => {
    const cards = [
      makeItem({ id: 'cat-1', catdexNumber: 1 }),
      makeItem({ id: 'cat-2', catdexNumber: 2 }),
      makeItem({ id: 'cat-3', catdexNumber: 3 }),
    ];

    expect(getDeckNeighbors(cards, 0)).toEqual({
      previous: cards[2],
      active: cards[0],
      next: cards[1],
    });
  });

  it('builds Traditional Chinese single-card share text with address', () => {
    const text = buildSingleCatShareText(
      makeItem({
        catdexNumber: 29,
        location: {
          lat: 25.033,
          lng: 121.565,
          name: '巷口咖啡店',
          address: '台北市信義區',
        },
      }),
      'zh'
    );

    expect(text).toContain('轉角遇到貓');
    expect(text).toContain('No.029');
    expect(text).toContain('巷口咖啡店');
    expect(text).toContain('台北市信義區');
  });

  it('formats private and public cat card numbers separately', () => {
    expect(formatCatCardNumberForItem(makeItem({ catdexNumber: 4 }))).toBe('No.004');
    expect(formatPublicCatCardNumber(1)).toBe('W-001');
    expect(formatCatCardNumberForItem(makeItem({
      catdexNumber: 4,
      publicNumber: 1,
      isPublic: true,
    }))).toBe('W-001');
    expect(formatCatCardNumberForItem(makeItem({
      catdexNumber: undefined,
      publicNumber: 88,
      collectedFromPublicId: 'public-cat-88',
    }))).toBe('W-088');
  });
});
