import { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { Undo2, Trash2, Share2, MapPin } from 'lucide-react';
import { translations, formatDate } from '../translations';
import { ScrapbookElement } from '../components/ScrapbookElement';
import { motion } from 'framer-motion';
import { CAT_BREEDS } from '../data/catBreeds';
import { CAT_COLORS } from '../data/catColors';
import LocationPicker from '../components/LocationPicker';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import { shareCatCardPoster } from '../lib/sharePoster';

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

      <div className="flex-1 flex flex-col items-center justify-center p-8 pt-4">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="relative w-full max-w-sm aspect-square flex items-center justify-center"
        >
          <div style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}>
            <ScrapbookElement item={{...item, x: 0, y: 0, rotation: 0, scale: 1}} isPhysicsMode={true} />
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 w-full max-w-sm space-y-3 text-center"
        >
          {(breedLabel || colorLabel) && (
            <div className="bg-cat-card rounded-2xl shadow-cat-whisper border border-cat-border-light p-4 text-left">
              <p className="text-cat-text-tertiary text-xs font-bold tracking-widest uppercase mb-3">
                {t.detail}
              </p>
              <div className="flex flex-wrap gap-2">
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
            </div>
          )}

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

          <div className="inline-block px-6 py-3 bg-cat-card rounded-2xl shadow-cat-whisper border border-cat-border-light">
            <p className="text-cat-text-secondary text-sm font-bold tracking-widest uppercase">
              {formatDate(new Date(item.date), language, { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                weekday: 'long'
              })}
            </p>
          </div>
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
