import type { ScrapbookItem } from '../store/useScrapbookStore';

export const formatCatdexNumber = (catdexNumber: number | undefined) => {
  if (!catdexNumber || catdexNumber < 1) return 'FOUND CAT ---';
  return `FOUND CAT ${String(catdexNumber).padStart(3, '0')}`;
};

export const getNextCatdexNumber = (items: Pick<ScrapbookItem, 'catdexNumber'>[]) => {
  const maxNumber = items.reduce((max, item) => {
    return Math.max(max, item.catdexNumber ?? 0);
  }, 0);

  return maxNumber + 1;
};

export const normalizeCatdexNumbers = <T extends ScrapbookItem>(items: T[]): T[] => {
  let nextNumber = getNextCatdexNumber(items);

  return items.map((item) => {
    if (item.catdexNumber && item.catdexNumber > 0) return item;
    const normalized = { ...item, catdexNumber: nextNumber };
    nextNumber += 1;
    return normalized as T;
  });
};

export const getLatestItem = <T extends Pick<ScrapbookItem, 'date'>>(items: T[]) => {
  return [...items].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  })[0] ?? null;
};

export const isSameLocalDay = (a: Date, b: Date) => {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
};

export const getTodayItems = <T extends Pick<ScrapbookItem, 'date'>>(items: T[], now = new Date()) => {
  return items.filter((item) => isSameLocalDay(new Date(item.date), now));
};
