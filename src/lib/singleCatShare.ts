import type { CatCareStatusTag, CatPersonalityTag, ScrapbookItem } from '../store/useScrapbookStore';
import { formatCatCardNumber } from './catdexDeck';

export const SINGLE_CAT_SHARE_VERSION = 1;

export const CAT_MYSTERY_COPY = {
  zh: '這隻貓還保持神秘',
  en: 'This cat is still a mystery',
} as const;

const PERSONALITY_LABELS: Record<CatPersonalityTag, { zh: string; en: string }> = {
  friendly: { zh: '親人', en: 'Friendly' },
  shy: { zh: '怕人', en: 'Shy' },
  indifferent: { zh: '不理人', en: 'Keeps distance' },
  aloof: { zh: '高冷', en: 'Aloof' },
  foodie: { zh: '貪吃', en: 'Foodie' },
  clingy: { zh: '撒嬌', en: 'Cuddly' },
  alert: { zh: '警戒中', en: 'Alert' },
};

const CARE_LABELS: Record<CatCareStatusTag, { zh: string; en: string }> = {
  tnr: { zh: '已剪耳 / TNR', en: 'Ear-tipped / TNR' },
  collar: { zh: '有項圈', en: 'Has collar' },
  owned: { zh: '疑似有人養', en: 'Likely owned' },
  fed: { zh: '固定餵養', en: 'Fed regularly' },
  injured: { zh: '疑似受傷', en: 'May be injured' },
  unknown: { zh: '不確定', en: 'Not sure' },
};

export interface SingleCatSharePayload {
  v: typeof SINGLE_CAT_SHARE_VERSION;
  id: string;
  n?: number;
  numberLabel: string;
  catName?: string;
  date: string;
  locationName: string;
  locationAddress?: string;
  lat: number;
  lng: number;
  language: 'zh' | 'en';
  personalityTags?: CatPersonalityTag[];
  careStatusTags?: CatCareStatusTag[];
  includeMemo: boolean;
  memo?: string;
  posterStyleVersion: 1;
}

const encodeBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const decodeBase64Url = (value: string) => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const buildSingleCatSharePayload = (
  item: ScrapbookItem,
  options: { includeMemo: boolean; language: 'zh' | 'en' }
): SingleCatSharePayload => {
  if (!item.location) {
    throw new Error('SINGLE_CAT_SHARE_REQUIRES_LOCATION');
  }

  const memo = item.spotNote?.trim();
  const catName = item.catName?.trim();
  const locationAddress = item.location.address?.trim();

  return {
    v: SINGLE_CAT_SHARE_VERSION,
    id: item.id,
    n: item.catdexNumber,
    numberLabel: formatCatCardNumber(item.catdexNumber),
    catName: catName || undefined,
    date: item.date,
    locationName: item.location.name,
    locationAddress: locationAddress || undefined,
    lat: item.location.lat,
    lng: item.location.lng,
    language: options.language,
    personalityTags: item.personalityTags,
    careStatusTags: item.careStatusTags,
    includeMemo: options.includeMemo,
    memo: options.includeMemo && memo ? memo : undefined,
    posterStyleVersion: 1,
  };
};

export const encodeSingleCatSharePayload = (payload: SingleCatSharePayload) => {
  return encodeBase64Url(JSON.stringify(payload));
};

export const decodeSingleCatSharePayload = (data: string | null): SingleCatSharePayload | null => {
  if (!data) return null;

  try {
    const parsed = JSON.parse(decodeBase64Url(data)) as SingleCatSharePayload;
    if (parsed.v !== SINGLE_CAT_SHARE_VERSION) return null;
    if (!parsed.id || !parsed.locationName || typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const buildSingleCatSharePath = (payload: SingleCatSharePayload) => {
  return `/s/c?data=${encodeSingleCatSharePayload(payload)}`;
};

export const buildGoogleMapsSearchUrl = ({
  lat,
  lng,
  name,
  address,
}: {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
}) => {
  const readablePlace = [name, address]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');
  const query = encodeURIComponent(readablePlace || `${lat},${lng}`);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};

export const getShareTagLabels = (
  payload: Pick<SingleCatSharePayload, 'personalityTags' | 'careStatusTags'>,
  language: 'zh' | 'en'
) => {
  const personality = payload.personalityTags?.map((tag) => PERSONALITY_LABELS[tag]?.[language]).filter(Boolean) ?? [];
  const care = payload.careStatusTags?.map((tag) => CARE_LABELS[tag]?.[language]).filter(Boolean) ?? [];
  const labels = [...personality, ...care];
  return labels.length > 0 ? labels : [CAT_MYSTERY_COPY[language]];
};
