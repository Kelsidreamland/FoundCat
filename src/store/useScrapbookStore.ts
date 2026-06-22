import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import { v4 as uuidv4 } from 'uuid';
import { getNextCatdexNumber, normalizeCatdexNumbers } from '../lib/catdex';

export type ScrapbookItemType = 'sticker' | 'stamp';
export type CatPersonalityTag = 'friendly' | 'shy' | 'indifferent' | 'aloof' | 'foodie' | 'clingy' | 'alert';
export type CatCareStatusTag = 'tnr' | 'collar' | 'owned' | 'fed' | 'injured' | 'unknown';

export interface ScrapbookItem {
  id: string;
  type: ScrapbookItemType;
  imageData: string; // Base64 or Blob URL
  heroImageData?: string;
  catdexNumber?: number;
  publicNumber?: number;
  date: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  zIndex: number;
  location?: {
    lat: number;
    lng: number;
    name: string;
    address?: string;
    placeId?: string;
  };
  catName?: string;
  catBreed?: string;
  catColor?: string;
  personalityTags?: CatPersonalityTag[];
  spotNote?: string;
  careStatusTags?: CatCareStatusTag[];
  isPublic?: boolean;
  collectedFromPublicId?: string;
  collectedAt?: string;
}

interface ScrapbookState {
  items: ScrapbookItem[];
  isLoading: boolean;
  language: 'zh' | 'en';
  catdexDisplayName: string;
  targetDate: string | null;
  loadItems: () => Promise<void>;
  addItem: (item: Omit<ScrapbookItem, 'id' | 'zIndex'>) => Promise<ScrapbookItem>;
  updateItem: (id: string, updates: Partial<ScrapbookItem>) => Promise<void>;
  mergeRestoredItems: (items: ScrapbookItem[]) => Promise<number>;
  removeItem: (id: string) => Promise<void>;
  bringToFront: (id: string) => Promise<void>;
  setLanguage: (lang: 'zh' | 'en') => Promise<void>;
  setCatdexDisplayName: (name: string) => Promise<void>;
  setTargetDate: (date: string | null) => void;
}

export const STORAGE_KEY = 'scrapbook_items';
export const LANG_STORAGE_KEY = 'scrapbook_language';
export const CATDEX_NAME_STORAGE_KEY = 'scrapbook_catdex_display_name';
const DEFAULT_CATDEX_DISPLAY_NAME = '我的轉角貓地圖';

export const useScrapbookStore = create<ScrapbookState>((setStore, getStore) => ({
  items: [],
  isLoading: true,
  language: 'zh',
  catdexDisplayName: DEFAULT_CATDEX_DISPLAY_NAME,
  targetDate: null,

  setTargetDate: (date) => setStore({ targetDate: date }),

  loadItems: async () => {
    try {
      const stored = await get<ScrapbookItem[]>(STORAGE_KEY);
      const storedLang = await get<'zh' | 'en'>(LANG_STORAGE_KEY);
      const storedName = await get<string>(CATDEX_NAME_STORAGE_KEY);
      const catdexDisplayName = storedName?.trim() || DEFAULT_CATDEX_DISPLAY_NAME;
      
      if (stored) {
        const normalizedItems = normalizeCatdexNumbers(stored);
        const changed = normalizedItems.some((item, index) => item !== stored[index]);
        if (changed) {
          await set(STORAGE_KEY, normalizedItems);
        }
        setStore({ items: normalizedItems, isLoading: false, language: storedLang || 'zh', catdexDisplayName });
      } else {
        setStore({ items: [], isLoading: false, language: storedLang || 'zh', catdexDisplayName });
      }
    } catch (error) {
      console.error('Failed to load items from IndexedDB', error);
      setStore({ items: [], isLoading: false, catdexDisplayName: DEFAULT_CATDEX_DISPLAY_NAME });
    }
  },

  addItem: async (item) => {
    const currentItems = getStore().items;
    const maxZIndex = currentItems.reduce((max, i) => Math.max(max, i.zIndex), 0);
    
    const newItem: ScrapbookItem = {
      ...item,
      id: uuidv4(),
      catdexNumber: item.collectedFromPublicId
        ? item.catdexNumber
        : item.catdexNumber ?? getNextCatdexNumber(currentItems),
      zIndex: maxZIndex + 1,
    };
    
    const newItems = [...currentItems, newItem];
    setStore({ items: newItems });
    await set(STORAGE_KEY, newItems);
    return newItem;
  },

  updateItem: async (id, updates) => {
    const currentItems = getStore().items;
    const newItems = currentItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    setStore({ items: newItems });
    await set(STORAGE_KEY, newItems);
  },

  mergeRestoredItems: async (restoredItems) => {
    const currentItems = getStore().items;
    const existingIds = new Set(currentItems.map((item) => item.id));
    const maxZIndex = currentItems.reduce((max, item) => Math.max(max, item.zIndex), 0);
    const newRestoredItems = restoredItems
      .filter((item) => !existingIds.has(item.id))
      .map((item, index) => ({
        ...item,
        zIndex: maxZIndex + index + 1,
      }));
    const newItems = [...currentItems, ...newRestoredItems];

    setStore({ items: newItems });
    await set(STORAGE_KEY, newItems);
    return newRestoredItems.length;
  },

  removeItem: async (id) => {
    const currentItems = getStore().items;
    const newItems = currentItems.filter(item => item.id !== id);
    setStore({ items: newItems });
    await set(STORAGE_KEY, newItems);
  },

  bringToFront: async (id) => {
    const currentItems = getStore().items;
    const maxZIndex = currentItems.reduce((max, i) => Math.max(max, i.zIndex), 0);
    const newItems = currentItems.map(item => 
      item.id === id ? { ...item, zIndex: maxZIndex + 1 } : item
    );
    setStore({ items: newItems });
    await set(STORAGE_KEY, newItems);
  },

  setLanguage: async (lang: 'zh' | 'en') => {
    setStore({ language: lang });
    await set(LANG_STORAGE_KEY, lang);
  },

  setCatdexDisplayName: async (name: string) => {
    const trimmedName = name.trim() || DEFAULT_CATDEX_DISPLAY_NAME;
    setStore({ catdexDisplayName: trimmedName });
    await set(CATDEX_NAME_STORAGE_KEY, trimmedName);
  },
}));
