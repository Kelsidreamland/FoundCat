export const CAT_COLORS = [
  { id: 'orange-tabby', zh: '橘虎斑', en: 'Orange Tabby' },
  { id: 'brown-tabby', zh: '棕虎斑', en: 'Brown Tabby' },
  { id: 'gray-tabby', zh: '灰虎斑', en: 'Gray Tabby' },
  { id: 'black', zh: '黑色', en: 'Black' },
  { id: 'white', zh: '白色', en: 'White' },
  { id: 'black-white', zh: '黑白', en: 'Black & White' },
  { id: 'calico', zh: '三花', en: 'Calico' },
  { id: 'tortoiseshell', zh: '玳瑁', en: 'Tortoiseshell' },
  { id: 'gray', zh: '灰色', en: 'Gray' },
  { id: 'cream', zh: '奶油色', en: 'Cream' },
  { id: 'ginger', zh: '薑黃色', en: 'Ginger' },
  { id: 'pointed', zh: '重點色', en: 'Pointed' },
  { id: 'unknown', zh: '不確定', en: 'Unknown' },
] as const;

export type CatColorId = (typeof CAT_COLORS)[number]['id'];
