import { get } from 'idb-keyval';
import {
  CATDEX_NAME_STORAGE_KEY,
  LANG_STORAGE_KEY,
  STORAGE_KEY,
  type ScrapbookItem,
} from '../store/useScrapbookStore';

export type LocalRescueBackup = {
  kind: 'found-cat-local-rescue';
  version: 1;
  exportedAt: string;
  appVersion: string;
  itemCount: number;
  items: ScrapbookItem[];
  language?: 'zh' | 'en';
  catdexDisplayName?: string;
};

function getRuntimeAppVersion() {
  try {
    return __APP_VERSION__;
  } catch {
    return 'unknown';
  }
}

function isScrapbookItemArray(value: unknown): value is ScrapbookItem[] {
  return Array.isArray(value);
}

function isLanguage(value: unknown): value is 'zh' | 'en' {
  return value === 'zh' || value === 'en';
}

export async function readLocalRescueBackup(): Promise<LocalRescueBackup> {
  const [itemsValue, languageValue, catdexDisplayNameValue] = await Promise.all([
    get<unknown>(STORAGE_KEY),
    get<unknown>(LANG_STORAGE_KEY),
    get<unknown>(CATDEX_NAME_STORAGE_KEY),
  ]);
  const items = isScrapbookItemArray(itemsValue) ? itemsValue : [];

  return {
    kind: 'found-cat-local-rescue',
    version: 1,
    exportedAt: new Date().toISOString(),
    appVersion: getRuntimeAppVersion(),
    itemCount: items.length,
    items,
    language: isLanguage(languageValue) ? languageValue : undefined,
    catdexDisplayName: typeof catdexDisplayNameValue === 'string'
      ? catdexDisplayNameValue
      : undefined,
  };
}

export function createLocalRescueBackupPayload(backup: LocalRescueBackup) {
  return JSON.stringify(backup, null, 2);
}

export function parseLocalRescueBackupPayload(payload: string): LocalRescueBackup {
  const parsed = JSON.parse(payload) as Partial<LocalRescueBackup>;

  if (
    parsed.kind !== 'found-cat-local-rescue' ||
    parsed.version !== 1 ||
    !isScrapbookItemArray(parsed.items)
  ) {
    throw new Error('Invalid Found Cat rescue backup');
  }

  return {
    kind: 'found-cat-local-rescue',
    version: 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    appVersion: typeof parsed.appVersion === 'string' ? parsed.appVersion : 'unknown',
    itemCount: parsed.items.length,
    items: parsed.items,
    language: isLanguage(parsed.language) ? parsed.language : undefined,
    catdexDisplayName: typeof parsed.catdexDisplayName === 'string'
      ? parsed.catdexDisplayName
      : undefined,
  };
}

export function createLocalRescueBackupFilename(date = new Date()) {
  const stamp = date.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return `found-cat-local-backup-${stamp}.json`;
}
