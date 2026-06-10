import { describe, expect, it } from 'vitest';
import {
  formatCatdexNumber,
  getLatestItem,
  getNextCatdexNumber,
  getTodayItems,
  normalizeCatdexNumbers,
} from './catdex';
import type { ScrapbookItem } from '../store/useScrapbookStore';

const makeItem = (overrides: Partial<ScrapbookItem>): ScrapbookItem => ({
  id: overrides.id ?? 'item',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
  date: overrides.date ?? '2026-05-05T12:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  ...overrides,
});

describe('catdex helpers', () => {
  it('formats numbers with three digits', () => {
    expect(formatCatdexNumber(1)).toBe('FOUND CAT 001');
    expect(formatCatdexNumber(28)).toBe('FOUND CAT 028');
    expect(formatCatdexNumber(1204)).toBe('FOUND CAT 1204');
  });

  it('assigns stable missing numbers after existing max', () => {
    const normalized = normalizeCatdexNumbers([
      makeItem({ id: 'a', catdexNumber: 7 }),
      makeItem({ id: 'b' }),
      makeItem({ id: 'c' }),
    ]);

    expect(normalized.map((item) => item.catdexNumber)).toEqual([7, 8, 9]);
  });

  it('does not change existing catdex numbers during normalization', () => {
    const normalized = normalizeCatdexNumbers([
      makeItem({ id: 'a', catdexNumber: 12 }),
      makeItem({ id: 'b', catdexNumber: 2 }),
    ]);

    expect(normalized.map((item) => item.catdexNumber)).toEqual([12, 2]);
  });

  it('computes the next number from existing items', () => {
    expect(getNextCatdexNumber([
      makeItem({ id: 'a', catdexNumber: 3 }),
      makeItem({ id: 'b', catdexNumber: 12 }),
    ])).toBe(13);
  });

  it('finds the newest item by date', () => {
    const latest = getLatestItem([
      makeItem({ id: 'old', date: '2026-05-01T12:00:00.000Z' }),
      makeItem({ id: 'new', date: '2026-05-05T12:00:00.000Z' }),
    ]);

    expect(latest?.id).toBe('new');
  });

  it('returns only items from the selected local date', () => {
    const selectedDate = new Date(2026, 4, 5, 20);

    const result = getTodayItems([
      makeItem({ id: 'today', date: new Date(2026, 4, 5, 12).toISOString() }),
      makeItem({ id: 'other', date: new Date(2026, 4, 4, 12).toISOString() }),
    ], selectedDate);

    expect(result.map((item) => item.id)).toEqual(['today']);
  });
});
