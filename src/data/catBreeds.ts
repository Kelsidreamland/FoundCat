export const CAT_BREEDS = [
  { id: 'domestic-shorthair', zh: '米克斯短毛', en: 'Domestic Shorthair' },
  { id: 'domestic-longhair', zh: '米克斯長毛', en: 'Domestic Longhair' },
  { id: 'persian', zh: '波斯貓', en: 'Persian' },
  { id: 'maine-coon', zh: '緬因貓', en: 'Maine Coon' },
  { id: 'siamese', zh: '暹羅貓', en: 'Siamese' },
  { id: 'british-shorthair', zh: '英國短毛貓', en: 'British Shorthair' },
  { id: 'ragdoll', zh: '布偶貓', en: 'Ragdoll' },
  { id: 'bengal', zh: '孟加拉貓', en: 'Bengal' },
  { id: 'sphynx', zh: '斯芬克斯貓', en: 'Sphynx' },
  { id: 'scottish-fold', zh: '蘇格蘭摺耳貓', en: 'Scottish Fold' },
  { id: 'american-shorthair', zh: '美國短毛貓', en: 'American Shorthair' },
  { id: 'tabby', zh: '虎斑貓', en: 'Tabby' },
  { id: 'calico', zh: '三色貓', en: 'Calico' },
  { id: 'tuxedo', zh: '賓士貓', en: 'Tuxedo' },
  { id: 'orange-cat', zh: '橘貓', en: 'Orange Cat' },
  { id: 'black-cat', zh: '黑貓', en: 'Black Cat' },
  { id: 'white-cat', zh: '白貓', en: 'White Cat' },
  { id: 'unknown', zh: '不確定', en: 'Unknown' },
] as const;

export type CatBreedId = (typeof CAT_BREEDS)[number]['id'];
