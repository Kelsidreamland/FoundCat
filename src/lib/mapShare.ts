import type { CatCareStatusTag, CatPersonalityTag, ScrapbookItem } from '../store/useScrapbookStore';
import { formatCatCardNumberForItem } from './catdexDeck';

export const MAP_SHARE_VERSION = 1;

export interface MapShareCat {
  id: string;
  numberLabel: string;
  catName?: string;
  date: string;
  locationName: string;
  locationAddress?: string;
  lat: number;
  lng: number;
  personalityTags?: CatPersonalityTag[];
  careStatusTags?: CatCareStatusTag[];
  memo?: string;
}

export interface MapSharePayload {
  v: typeof MAP_SHARE_VERSION;
  title: string;
  language: 'zh' | 'en';
  includeMemo: boolean;
  cats: MapShareCat[];
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

export const buildMapSharePayload = (
  items: ScrapbookItem[],
  options: { title: string; includeMemo: boolean; language: 'zh' | 'en' }
): MapSharePayload => {
  const cats = items
    .filter((item) => item.location)
    .map((item): MapShareCat => {
      const location = item.location!;
      const memo = item.spotNote?.trim();
      const catName = item.catName?.trim();
      const locationAddress = location.address?.trim();

      return {
        id: item.id,
        numberLabel: formatCatCardNumberForItem(item),
        catName: catName || undefined,
        date: item.date,
        locationName: location.name,
        locationAddress: locationAddress || undefined,
        lat: location.lat,
        lng: location.lng,
        personalityTags: item.personalityTags,
        careStatusTags: item.careStatusTags,
        memo: options.includeMemo && memo ? memo : undefined,
      };
    });

  return {
    v: MAP_SHARE_VERSION,
    title: options.title.trim() || (options.language === 'zh' ? '我的貓咪地圖' : 'My FOUND CAT Map'),
    language: options.language,
    includeMemo: options.includeMemo,
    cats,
    posterStyleVersion: 1,
  };
};

export const encodeMapSharePayload = (payload: MapSharePayload) => {
  return encodeBase64Url(JSON.stringify(payload));
};

export const decodeMapSharePayload = (data: string | null): MapSharePayload | null => {
  if (!data) return null;

  try {
    const parsed = JSON.parse(decodeBase64Url(data)) as MapSharePayload;
    if (parsed.v !== MAP_SHARE_VERSION) return null;
    if (!parsed.title || !Array.isArray(parsed.cats)) return null;
    const hasValidCats = parsed.cats.every((cat) => (
      cat.id &&
      cat.numberLabel &&
      cat.locationName &&
      typeof cat.lat === 'number' &&
      typeof cat.lng === 'number'
    ));
    return hasValidCats ? parsed : null;
  } catch {
    return null;
  }
};

export const buildMapSharePath = (payload: MapSharePayload) => {
  return `/s/map?data=${encodeMapSharePayload(payload)}`;
};

export const buildMapShareUrl = (payload: MapSharePayload, baseUrl: string) => {
  return new URL(buildMapSharePath(payload), baseUrl).toString();
};
