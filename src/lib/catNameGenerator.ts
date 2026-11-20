import type { CatPersonalityTag, ScrapbookItem } from '../store/useScrapbookStore';

type Language = 'zh' | 'en';

const padCardNumber = (number?: number) => String(number ?? 1).padStart(3, '0');

// A cat keeps one generated name everywhere: the public W-number once it has one
// (that is the number everyone else sees), otherwise the owner's own card number.
const nameNumber = (item: ScrapbookItem) => item.publicNumber ?? item.catdexNumber;

const includesAny = (value: string, keywords: string[]) => (
  keywords.some((keyword) => value.toLowerCase().includes(keyword.toLowerCase()))
);

const hasPersonality = (item: ScrapbookItem, tag: CatPersonalityTag) => (
  item.personalityTags?.includes(tag) ?? false
);

export const suggestCatName = (item: ScrapbookItem, language: Language) => {
  const color = item.catColor ?? '';
  const notes = [
    item.spotNote,
    item.catFeatureNote,
    item.location?.name,
  ].filter(Boolean).join(' ');
  const isOrange = color === 'orange-tabby' || color === 'ginger' || color === 'orange-cat';
  const isWhite = color === 'white' || color === 'white-cat';
  const isTuxedo = color === 'black-white' || color === 'tuxedo';
  const isCalico = color === 'calico';
  const lazyHint = includesAny(notes, ['躺', '懶', '睡', 'relax', 'sleep', 'lazy']);
  const foodHint = hasPersonality(item, 'foodie') || includesAny(notes, ['飯', '吃', 'food', 'snack']);
  const aloofHint = hasPersonality(item, 'aloof') || hasPersonality(item, 'indifferent');

  if (language === 'en') {
    if (isOrange && lazyHint) return 'Lazy Orange Cat';
    if (isWhite && aloofHint) return 'Off-duty White Cat';
    if (isTuxedo) return 'Little Tuxedo Boss';
    if (isCalico) return 'Patchwork Corner Cat';
    if (foodHint) return 'Snack Watch Cat';
    if (aloofHint) return 'Aloof Shop Cat';
    return `Corner Cat ${padCardNumber(nameNumber(item))}`;
  }

  if (isOrange && lazyHint) return '懶散橘貓';
  if (isWhite && aloofHint) return '不想營業的白貓';
  if (isTuxedo) return '西裝店長';
  if (isCalico) return '花色轉角貓';
  if (foodHint) return '等飯小貓';
  if (aloofHint) return '高冷店長';
  return `轉角小貓 ${padCardNumber(nameNumber(item))}`;
};

/**
 * The name shown as a cat card's title. The cat is the subject, so an unnamed cat gets a
 * generated nickname rather than falling back to the place it was seen.
 */
export const getCatDisplayName = (item: ScrapbookItem, language: Language) => (
  item.catName?.trim() || suggestCatName(item, language)
);

const NAME_POOL = {
  zh: ['小橘', '麻糬', '阿虎', '黑糖', '奶茶', '豆花', '芝麻', '布丁', '饅頭', '咪咪'],
  en: ['Mochi', 'Tiger', 'Pudding', 'Sesame', 'Biscuit', 'Latte', 'Pepper', 'Dumpling'],
};

const hash = (value: string) => [...value].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);

/** One generated nickname plus two friendly names, stable for a given cat. */
export const getNameSuggestions = (item: ScrapbookItem, language: 'zh' | 'en') => {
  const pool = NAME_POOL[language];
  const start = hash(item.id) % pool.length;
  const picks = [suggestCatName(item, language), pool[start], pool[(start + 3) % pool.length]];
  return [...new Set(picks)];
};

