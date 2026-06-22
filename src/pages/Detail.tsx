import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CatCareStatusTag, CatPersonalityTag } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { Undo2, Trash2, Share2, MapPin } from 'lucide-react';
import { translations } from '../translations';
import { motion } from 'framer-motion';
import { CAT_BREEDS } from '../data/catBreeds';
import { CAT_COLORS } from '../data/catColors';
import LocationPicker from '../components/LocationPicker';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import { shareCatCardPoster } from '../lib/sharePoster';

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

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, removeItem, updateItem, language } = useScrapbookStore();
  const t = translations[language];
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const item = items.find(i => i.id === id);
  const breedMeta = item?.catBreed ? CAT_BREEDS.find((breed) => breed.id === item.catBreed) : undefined;
  const colorMeta = item?.catColor ? CAT_COLORS.find((color) => color.id === item.catColor) : undefined;
  const breedLabel = breedMeta ? (language === 'zh' ? breedMeta.zh : breedMeta.en) : item?.catBreed;
  const colorLabel = colorMeta ? (language === 'zh' ? colorMeta.zh : colorMeta.en) : item?.catColor;

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
  const hasCatDetails = personalityLabels.length > 0 || careLabels.length > 0 || Boolean(item.spotNote?.trim()) || Boolean(breedLabel || colorLabel);

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
              {item.spotNote?.trim() ? (
                <p className="mt-3 rounded-[16px] border border-[#221915]/10 bg-[#fffdf2] px-3 py-2 text-sm font-bold leading-6 text-[#4d4038]">
                  {item.spotNote.trim()}
                </p>
              ) : null}
            </div>
          ) : null}

          {item.location ? (
            <button
              onClick={() => navigate('/map')}
              className="w-full bg-cat-card rounded-2xl shadow-cat-whisper border border-cat-border-light p-4 text-left hover:bg-cat-bg transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-cat-bg border border-cat-border-light flex items-center justify-center shrink-0">
                  <MapPin size={18} className="text-cat-brand" />
                </div>
                <div className="min-w-0">
                  <p className="text-cat-text-main font-bold text-sm">{item.location.name}</p>
                  {item.location.address ? (
                    <p className="text-cat-text-tertiary text-xs mt-1 break-words">{item.location.address}</p>
                  ) : null}
                  <p className="mt-2 text-xs font-black text-[#2f5fb3]">
                    {language === 'zh' ? '出發去找這隻貓' : 'Go find this cat'}
                  </p>
                </div>
              </div>
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
