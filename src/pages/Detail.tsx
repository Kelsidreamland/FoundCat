import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CatCareStatusTag, CatPersonalityTag } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { Check, MapPin, Navigation, PencilLine, Share2, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { translations } from '../translations';
import { motion } from 'framer-motion';
import { CAT_BREEDS } from '../data/catBreeds';
import { CAT_COLORS } from '../data/catColors';
import LocationPicker from '../components/LocationPicker';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import { shareCatCardPoster } from '../lib/sharePoster';
import { suggestCatName } from '../lib/catNameGenerator';

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

type CatInfoDraft = {
  catName: string;
  catFeatureNote: string;
  spotNote: string;
  personalityTags: CatPersonalityTag[];
  careStatusTags: CatCareStatusTag[];
};

const EMPTY_CAT_INFO_DRAFT: CatInfoDraft = {
  catName: '',
  catFeatureNote: '',
  spotNote: '',
  personalityTags: [],
  careStatusTags: [],
};

const getDetailCopy = (language: 'zh' | 'en') => ({
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
  spotNote: language === 'zh' ? '出沒備註' : 'Spot note',
  spotPlaceholder: language === 'zh'
    ? '例如：傍晚常在咖啡店門口紙箱睡覺'
    : 'Example: sleeps in the box by the cafe entrance in the evening',
  personality: language === 'zh' ? '牠給人的感覺' : 'How this cat feels',
  careStatus: language === 'zh' ? '照護狀態' : 'Care status',
  optionalFacts: language === 'zh' ? '其他資料' : 'Optional facts',
  goFindCat: language === 'zh' ? '去找這隻貓' : 'Go find this cat',
  featureHeading: language === 'zh' ? '特徵' : 'Features',
  spotHeading: language === 'zh' ? '出沒線索' : 'Spot clues',
});

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, removeItem, updateItem, language } = useScrapbookStore();
  const t = translations[language];
  const detailCopy = getDetailCopy(language);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isEditingCatInfo, setIsEditingCatInfo] = useState(false);
  const [catInfoDraft, setCatInfoDraft] = useState<CatInfoDraft>(EMPTY_CAT_INFO_DRAFT);
  const [catInfoSavedMessage, setCatInfoSavedMessage] = useState<string | null>(null);

  const item = items.find(i => i.id === id);
  const breedMeta = item?.catBreed ? CAT_BREEDS.find((breed) => breed.id === item.catBreed) : undefined;
  const colorMeta = item?.catColor ? CAT_COLORS.find((color) => color.id === item.catColor) : undefined;
  const breedLabel = breedMeta ? (language === 'zh' ? breedMeta.zh : breedMeta.en) : item?.catBreed;
  const colorLabel = colorMeta ? (language === 'zh' ? colorMeta.zh : colorMeta.en) : item?.catColor;

  useEffect(() => {
    if (!item) {
      setCatInfoDraft(EMPTY_CAT_INFO_DRAFT);
      setIsEditingCatInfo(false);
      setCatInfoSavedMessage(null);
      return;
    }

    setCatInfoDraft({
      catName: item.catName ?? '',
      catFeatureNote: item.catFeatureNote ?? '',
      spotNote: item.spotNote ?? '',
      personalityTags: item.personalityTags ?? [],
      careStatusTags: item.careStatusTags ?? [],
    });
    setCatInfoSavedMessage(null);
  }, [item?.id]);

  const handleLocationPicked = useCallback(async (location: {
    lat: number;
    lng: number;
    name: string;
    address?: string;
    placeId?: string;
  }) => {
    if (!item) return;

    await updateItem(item.id, { location });
    setShowLocationPicker(false);
  }, [item, updateItem]);

  if (!item) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-cat-bg">
        <p className="text-cat-text-tertiary mb-4">{t.noRecords}</p>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-cat-card rounded-full shadow-sm"
        >
          <Undo2 size={20} />
        </button>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm('確定要刪除這個圖鑑嗎？')) {
      removeItem(item.id);
      navigate('/');
    }
  };
  const personalityLabels = (item.personalityTags ?? [])
    .map((tag) => PERSONALITY_LABELS[tag]?.[language])
    .filter(Boolean);
  const careLabels = (item.careStatusTags ?? [])
    .map((tag) => CARE_LABELS[tag]?.[language])
    .filter(Boolean);
  const hasCatDetails = personalityLabels.length > 0
    || careLabels.length > 0
    || Boolean(item.catFeatureNote?.trim())
    || Boolean(item.spotNote?.trim())
    || Boolean(breedLabel || colorLabel);
  const mapTarget = `/map?cat=${encodeURIComponent(item.id)}&mode=mine`;

  const updateCatInfoDraft = (updater: (draft: CatInfoDraft) => CatInfoDraft) => {
    setCatInfoSavedMessage(null);
    setCatInfoDraft(updater);
  };

  const toggleDraftPersonalityTag = (tag: CatPersonalityTag) => {
    updateCatInfoDraft((draft) => ({
      ...draft,
      personalityTags: draft.personalityTags.includes(tag)
        ? draft.personalityTags.filter((candidate) => candidate !== tag)
        : [...draft.personalityTags, tag],
    }));
  };

  const toggleDraftCareStatusTag = (tag: CatCareStatusTag) => {
    updateCatInfoDraft((draft) => ({
      ...draft,
      careStatusTags: draft.careStatusTags.includes(tag)
        ? draft.careStatusTags.filter((candidate) => candidate !== tag)
        : [...draft.careStatusTags, tag],
    }));
  };

  const handleSuggestCatName = () => {
    const suggestedName = suggestCatName({
      ...item,
      catName: catInfoDraft.catName,
      catFeatureNote: catInfoDraft.catFeatureNote,
      spotNote: catInfoDraft.spotNote,
      personalityTags: catInfoDraft.personalityTags,
      careStatusTags: catInfoDraft.careStatusTags,
    }, language);

    updateCatInfoDraft((draft) => ({
      ...draft,
      catName: suggestedName,
    }));
  };

  const handleSaveCatInfo = async () => {
    const trimmedCatName = catInfoDraft.catName.trim();
    const trimmedFeatureNote = catInfoDraft.catFeatureNote.trim();
    const trimmedSpotNote = catInfoDraft.spotNote.trim();

    await updateItem(item.id, {
      catName: trimmedCatName || undefined,
      catFeatureNote: trimmedFeatureNote || undefined,
      spotNote: trimmedSpotNote || undefined,
      personalityTags: catInfoDraft.personalityTags.length > 0
        ? catInfoDraft.personalityTags
        : undefined,
      careStatusTags: catInfoDraft.careStatusTags.length > 0
        ? catInfoDraft.careStatusTags
        : undefined,
    });
    setCatInfoSavedMessage(detailCopy.saved);
    setIsEditingCatInfo(false);
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-[#fff7e8] overflow-hidden">
      <CatBrandHeader
        title={t.appName}
        subtitle={t.appSubtitle}
        showLanguageToggle={false}
        showClose
        closeLabel="關閉回首頁"
      />

      <div className="absolute right-5 top-[4.3rem] z-30 flex gap-2">
        <button
          onClick={() => shareCatCardPoster(item, language)}
          className="w-10 h-10 bg-[#fffdf2]/90 text-cat-text-secondary rounded-full flex items-center justify-center shadow-cat-whisper border border-cat-border-light hover:bg-cat-sand transition-colors focus-visible:ring-2 focus-visible:ring-cat-brand outline-none"
          aria-label={t.singleCardShare}
          title={t.singleCardShare}
        >
          <Share2 size={20} />
        </button>

        <button
          onClick={handleDelete}
          className="w-10 h-10 bg-[#fffdf2]/90 text-red-500 rounded-full flex items-center justify-center shadow-cat-whisper border border-red-100 hover:bg-red-50 transition-colors focus-visible:ring-2 focus-visible:ring-red-400 outline-none"
          aria-label="Delete item"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-3">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center overflow-hidden rounded-[26px] border-2 border-[#1d1714] bg-[#fffdf2] p-3 shadow-[8px_8px_0_rgba(29,23,20,0.88)]"
        >
          <img
            src={item.heroImageData || item.imageData}
            alt={item.catName?.trim() || (language === 'zh' ? '貓咪照片' : 'Cat photo')}
            className="h-full w-full rounded-[18px] object-cover"
            draggable={false}
          />
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-auto mt-5 w-full max-w-sm space-y-3 text-center"
        >
          {item.catName?.trim() ? (
            <h1 className="text-2xl font-black leading-tight text-[#1d1714]">
              {item.catName.trim()}
            </h1>
          ) : null}

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setIsEditingCatInfo((current) => !current)}
              className="inline-flex items-center gap-2 rounded-full border-2 border-[#221915] bg-[#fffdf2] px-4 py-2 text-sm font-black text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.18)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5fb3]"
            >
              <PencilLine size={16} />
              {detailCopy.editInfo}
            </button>
            {catInfoSavedMessage ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf1ff] px-3 py-2 text-xs font-black text-[#2f5fb3]">
                <Check size={14} />
                {catInfoSavedMessage}
              </span>
            ) : null}
          </div>

          {isEditingCatInfo ? (
            <div className="rounded-[22px] border-2 border-[#221915] bg-[#fffdf2] p-4 text-left shadow-[6px_6px_0_rgba(29,23,20,0.86)]">
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-[#221915]">{detailCopy.nameLabel}</span>
                  <div className="flex gap-2">
                    <input
                      aria-label={detailCopy.nameLabel}
                      value={catInfoDraft.catName}
                      onChange={(event) => updateCatInfoDraft((draft) => ({
                        ...draft,
                        catName: event.target.value,
                      }))}
                      placeholder={detailCopy.namePlaceholder}
                      className="min-w-0 flex-1 rounded-2xl border border-[#221915]/20 bg-white px-3 py-2 text-sm font-bold text-[#221915] outline-none focus:border-[#2f5fb3] focus:ring-2 focus:ring-[#2f5fb3]/20"
                    />
                    <button
                      type="button"
                      onClick={handleSuggestCatName}
                      className="inline-flex shrink-0 items-center gap-1 rounded-2xl border border-[#221915] bg-[#ffe08a] px-3 py-2 text-xs font-black text-[#221915] shadow-[2px_2px_0_rgba(29,23,20,0.8)]"
                    >
                      <Sparkles size={14} />
                      {detailCopy.suggestName}
                    </button>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-[#221915]">{detailCopy.featureNote}</span>
                  <textarea
                    aria-label={detailCopy.featureNote}
                    value={catInfoDraft.catFeatureNote}
                    onChange={(event) => updateCatInfoDraft((draft) => ({
                      ...draft,
                      catFeatureNote: event.target.value,
                    }))}
                    placeholder={detailCopy.featurePlaceholder}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-[#221915]/20 bg-white px-3 py-2 text-sm font-bold leading-6 text-[#221915] outline-none focus:border-[#2f5fb3] focus:ring-2 focus:ring-[#2f5fb3]/20"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-[#221915]">{detailCopy.spotNote}</span>
                  <textarea
                    aria-label={detailCopy.spotNote}
                    value={catInfoDraft.spotNote}
                    onChange={(event) => updateCatInfoDraft((draft) => ({
                      ...draft,
                      spotNote: event.target.value,
                    }))}
                    placeholder={detailCopy.spotPlaceholder}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-[#221915]/20 bg-white px-3 py-2 text-sm font-bold leading-6 text-[#221915] outline-none focus:border-[#2f5fb3] focus:ring-2 focus:ring-[#2f5fb3]/20"
                  />
                </label>

                <div>
                  <p className="mb-2 text-xs font-black text-[#221915]">{detailCopy.personality}</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(PERSONALITY_LABELS) as CatPersonalityTag[]).map((tag) => {
                      const selected = catInfoDraft.personalityTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleDraftPersonalityTag(tag)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors ${
                            selected
                              ? 'border-[#221915] bg-[#ffe08a] text-[#221915]'
                              : 'border-[#221915]/15 bg-white text-[#6d5f52]'
                          }`}
                        >
                          {PERSONALITY_LABELS[tag][language]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-black text-[#221915]">{detailCopy.careStatus}</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(CARE_LABELS) as CatCareStatusTag[]).map((tag) => {
                      const selected = catInfoDraft.careStatusTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleDraftCareStatusTag(tag)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors ${
                            selected
                              ? 'border-[#221915] bg-[#eaf1ff] text-[#18346c]'
                              : 'border-[#221915]/15 bg-white text-[#6d5f52]'
                          }`}
                        >
                          {CARE_LABELS[tag][language]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveCatInfo}
                  className="w-full rounded-2xl border-2 border-[#221915] bg-[#2f5fb3] px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_rgba(29,23,20,0.88)]"
                >
                  {detailCopy.saveInfo}
                </button>
              </div>
            </div>
          ) : null}

          {hasCatDetails ? (
            <div className="bg-cat-card rounded-2xl shadow-cat-whisper border border-cat-border-light p-4 text-left">
              <p className="text-cat-text-tertiary text-xs font-bold tracking-widest uppercase mb-3">
                {t.detail}
              </p>
              <div className="flex flex-wrap gap-2">
                {personalityLabels.map((label) => (
                  <span key={`personality-${label}`} className="px-3 py-1.5 rounded-full bg-[#fff2cf] text-cat-text-main text-sm font-black border border-[#221915]/15">
                    {label}
                  </span>
                ))}
                {careLabels.map((label) => (
                  <span key={`care-${label}`} className="px-3 py-1.5 rounded-full bg-[#eaf1ff] text-cat-text-main text-sm font-black border border-[#2f5fb3]/20">
                    {label}
                  </span>
                ))}
                {breedLabel ? (
                  <span className="px-3 py-1.5 rounded-full bg-cat-bg text-cat-text-main text-sm font-semibold border border-cat-border-light">
                    {t.catBreed}: {breedLabel}
                  </span>
                ) : null}
                {colorLabel ? (
                  <span className="px-3 py-1.5 rounded-full bg-cat-bg text-cat-text-main text-sm font-semibold border border-cat-border-light">
                    {t.catColor}: {colorLabel}
                  </span>
                ) : null}
              </div>
              {item.catFeatureNote?.trim() ? (
                <div className="mt-3 rounded-[16px] border border-[#221915]/10 bg-[#fffdf2] px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
                    {detailCopy.featureHeading}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-[#4d4038]">
                    {item.catFeatureNote.trim()}
                  </p>
                </div>
              ) : null}
              {item.spotNote?.trim() ? (
                <div className="mt-3 rounded-[16px] border border-[#221915]/10 bg-[#fffdf2] px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
                    {detailCopy.spotHeading}
                  </p>
                  <p className="mt-1 text-sm font-bold leading-6 text-[#4d4038]">
                    {item.spotNote.trim()}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {item.location ? (
            <button
              onClick={() => navigate(mapTarget)}
              aria-label={detailCopy.goFindCat}
              className="w-full rounded-[22px] border-2 border-[#221915] bg-[#fffdf2] px-4 py-3 text-center shadow-[5px_5px_0_rgba(47,95,179,0.22)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5fb3]"
            >
              <span className="inline-flex items-center justify-center gap-2 text-sm font-black text-[#18346c]">
                <Navigation size={18} />
                {detailCopy.goFindCat}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setShowLocationPicker(true)}
              className="w-full bg-cat-card rounded-2xl shadow-cat-whisper border border-cat-border-light p-4 text-left hover:bg-cat-bg transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-cat-bg border border-cat-border-light flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-cat-brand" />
                </div>
                <div>
                  <p className="text-cat-text-main font-bold text-sm">{t.addLocation}</p>
                  <p className="text-cat-text-tertiary text-xs mt-1">{t.tapMapHint}</p>
                </div>
              </div>
            </button>
          )}

        </motion.div>
      </div>

      {showLocationPicker ? (
        <LocationPicker
          onPicked={handleLocationPicked}
          onClose={() => setShowLocationPicker(false)}
          language={language}
        />
      ) : null}
    </div>
  );
}
