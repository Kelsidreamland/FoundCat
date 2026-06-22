import type { ScrapbookItem } from '../store/useScrapbookStore';

export const sortCatCards = <T extends Pick<ScrapbookItem, 'catdexNumber' | 'date'>>(items: T[]) => {
  return [...items].sort((a, b) => {
    const aNumber = a.catdexNumber ?? Number.POSITIVE_INFINITY;
    const bNumber = b.catdexNumber ?? Number.POSITIVE_INFINITY;
    if (aNumber !== bNumber) return aNumber - bNumber;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
};

export const getDeckNeighbors = <T>(items: T[], activeIndex: number) => {
  if (items.length === 0) {
    return { previous: null, active: null, next: null };
  }

  const normalizedIndex = ((activeIndex % items.length) + items.length) % items.length;
  const previousIndex = (normalizedIndex - 1 + items.length) % items.length;
  const nextIndex = (normalizedIndex + 1) % items.length;

  return {
    previous: items[previousIndex],
    active: items[normalizedIndex],
    next: items[nextIndex],
  };
};

export const formatCatCardNumber = (catdexNumber: number | undefined) => {
  if (!catdexNumber || catdexNumber < 1) return 'No.---';
  return `No.${String(catdexNumber).padStart(3, '0')}`;
};

export const formatPublicCatCardNumber = (publicNumber: number | undefined) => {
  if (!publicNumber || publicNumber < 1) return 'W----';
  return `W-${String(publicNumber).padStart(3, '0')}`;
};

export const formatCatCardNumberForItem = (
  item: Pick<ScrapbookItem, 'catdexNumber' | 'publicNumber' | 'isPublic' | 'collectedFromPublicId'>
) => {
  if ((item.isPublic || item.collectedFromPublicId) && item.publicNumber) return formatPublicCatCardNumber(item.publicNumber);
  return formatCatCardNumber(item.catdexNumber);
};

export const buildSingleCatShareText = (item: ScrapbookItem, language: 'zh' | 'en') => {
  const number = formatCatCardNumberForItem(item);
  const locationName = item.location?.name;
  const address = item.location?.address;

  if (language === 'en') {
    return [
      `FOUND CAT ${number}`,
      locationName ? `Found near ${locationName}` : 'A cat I found.',
      address,
    ].filter(Boolean).join('\n');
  }

  return [
    `轉角遇到貓 ${number}`,
    locationName ? `在 ${locationName} 遇見` : '我遇見的一隻貓',
    address,
  ].filter(Boolean).join('\n');
};
