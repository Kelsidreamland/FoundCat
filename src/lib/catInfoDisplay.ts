import { CAT_BREEDS } from '../data/catBreeds';
import { CAT_COLORS } from '../data/catColors';
import type { CatCareStatusTag, CatPersonalityTag, ScrapbookItem } from '../store/useScrapbookStore';

export const CAT_PERSONALITY_LABELS: Record<CatPersonalityTag, { zh: string; en: string }> = {
  friendly: { zh: '親人', en: 'Friendly' },
  shy: { zh: '怕人', en: 'Shy' },
  indifferent: { zh: '不理人', en: 'Keeps distance' },
  aloof: { zh: '高冷', en: 'Aloof' },
  foodie: { zh: '貪吃', en: 'Foodie' },
  clingy: { zh: '撒嬌', en: 'Cuddly' },
  alert: { zh: '警戒中', en: 'Alert' },
};

export const CAT_CARE_STATUS_LABELS: Record<CatCareStatusTag, { zh: string; en: string }> = {
  tnr: { zh: '已剪耳 / TNR', en: 'Ear-tipped / TNR' },
  collar: { zh: '有項圈', en: 'Has collar' },
  owned: { zh: '疑似有人養', en: 'Likely owned' },
  fed: { zh: '固定餵養', en: 'Fed regularly' },
  injured: { zh: '疑似受傷', en: 'May be injured' },
  unknown: { zh: '不確定', en: 'Not sure' },
};

export const getCatInfoCopy = (language: 'zh' | 'en') => ({
  editInfo: language === 'zh' ? '補充貓咪資訊' : 'Add cat info',
  saveInfo: language === 'zh' ? '儲存貓咪資訊' : 'Save cat info',
  saved: language === 'zh' ? '已儲存' : 'Saved',
  suggestName: language === 'zh' ? '幫我取名' : 'Name for me',
  nameLabel: language === 'zh' ? '貓咪名字' : 'Cat name',
  namePlaceholder: language === 'zh'
    ? '例如：懶散橘貓、不想上班的白貓'
    : 'Example: Lazy Orange Cat, Off-duty White Cat',
  featureNote: language === 'zh' ? '特徵描述' : 'Feature note',
  featurePlaceholder: language === 'zh'
    ? '例如：左耳白毛、尾巴短短、看到相機會慢慢眨眼'
    : 'Example: white patch on left ear, short tail, slow blinks at camera',
  spotNote: language === 'zh' ? '偶遇線索' : 'Spot clues',
  spotPlaceholder: language === 'zh'
    ? '例如：傍晚常在咖啡店門口紙箱睡覺'
    : 'Example: sleeps in the box by the cafe entrance in the evening',
  personality: language === 'zh' ? '牠給人的感覺' : 'How this cat feels',
  careStatus: language === 'zh' ? '照護狀態' : 'Care status',
  optionalFacts: language === 'zh' ? '其他資料' : 'Optional facts',
  goFindCat: language === 'zh' ? '去找這隻喵' : 'Go find this cat',
  featureHeading: language === 'zh' ? '特徵' : 'Features',
  spotHeading: language === 'zh' ? '偶遇線索' : 'Spot clues',
  careHeading: language === 'zh' ? '照護' : 'Care',
});

export const getPersonalityLabels = (
  tags: CatPersonalityTag[] | undefined,
  language: 'zh' | 'en'
) => (tags ?? [])
  .map((tag) => CAT_PERSONALITY_LABELS[tag]?.[language])
  .filter(Boolean);

export const getCareStatusLabels = (
  tags: CatCareStatusTag[] | undefined,
  language: 'zh' | 'en'
) => (tags ?? [])
  .map((tag) => CAT_CARE_STATUS_LABELS[tag]?.[language])
  .filter(Boolean);

export const getCatBreedLabel = (breedId: string | undefined, language: 'zh' | 'en') => {
  if (!breedId) return undefined;
  const breed = CAT_BREEDS.find((candidate) => candidate.id === breedId);
  return breed ? breed[language] : breedId;
};

export const getCatColorLabel = (colorId: string | undefined, language: 'zh' | 'en') => {
  if (!colorId) return undefined;
  const color = CAT_COLORS.find((candidate) => candidate.id === colorId);
  return color ? color[language] : colorId;
};

export const getCatOptionalFactLabels = (
  item: Pick<ScrapbookItem, 'catBreed' | 'catColor'>,
  language: 'zh' | 'en',
  labels: { catBreed: string; catColor: string }
) => {
  const breedLabel = getCatBreedLabel(item.catBreed, language);
  const colorLabel = getCatColorLabel(item.catColor, language);

  return [
    breedLabel ? `${labels.catBreed}: ${breedLabel}` : null,
    colorLabel ? `${labels.catColor}: ${colorLabel}` : null,
  ].filter(Boolean) as string[];
};
