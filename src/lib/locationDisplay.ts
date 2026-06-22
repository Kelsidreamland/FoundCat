import type { ScrapbookItem } from '../store/useScrapbookStore';

const COORDINATE_TEXT_PATTERN = /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/;
const MAP_LINK_TEXT_PATTERN = /^(?:https?:\/\/)?(?:maps\.app\.goo\.gl|goo\.gl\/maps|(?:www\.)?google\.[^/]+\/maps|maps\.google\.[^/]+)/i;

export const hasReadableLocationName = (locationName: string | null | undefined) => {
  const value = locationName?.trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return false;
  if (MAP_LINK_TEXT_PATTERN.test(value)) return false;
  if (COORDINATE_TEXT_PATTERN.test(value)) return false;

  const normalized = value.toLowerCase();
  return ![
    'found cat',
    'cat spot',
    '貓咪出沒點',
    '貓咪地點',
  ].includes(normalized);
};

export const getReadableLocationName = (
  item: Pick<ScrapbookItem, 'location'>,
  language: 'zh' | 'en'
) => {
  if (hasReadableLocationName(item.location?.name)) return item.location!.name.trim();
  if (!item.location) return language === 'zh' ? '未記錄地點' : 'No location';
  return language === 'zh' ? '去找這隻貓' : 'Go find this cat';
};

export const getFindCatCta = (language: 'zh' | 'en') => (
  language === 'zh' ? '出發去找這隻貓' : 'Go find this cat'
);
