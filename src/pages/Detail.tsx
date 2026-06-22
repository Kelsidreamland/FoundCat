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
import { rescueLocalCatsToPublic } from '../lib/launchRescuePublicCats';

type PublicPublishStatus = 'idle' | 'saving' | 'published' | 'error';

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, removeItem, updateItem, language } = useScrapbookStore();
  const t = translations[language];
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [publicPublishStatus, setPublicPublishStatus] = useState<PublicPublishStatus>('idle');

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

  const handleOneTapPublicPublish = async () => {
    if (!item.location) {
      setShowLocationPicker(true);
      return;
    }

    setPublicPublishStatus('saving');
    const result = await rescueLocalCatsToPublic([item]);

    if (!result.ok) {
      setPublicPublishStatus('error');
      return;
    }

    await updateItem(item.id, { isPublic: true });
    setPublicPublishStatus('published');
  };

  const publishCopy = {
    action: language === 'zh' ? '一鍵公開到全世界地圖' : 'Publish to World Map',
    saving: language === 'zh' ? '公開中...' : 'Publishing...',
    published: language === 'zh' ? '已公開到全世界地圖' : 'Published to the World Map',
    publishedHint: language === 'zh'
      ? '這張貓卡已進入公開貓咪地圖。'
      : 'This cat card is now on the public cat map.',
    error: language === 'zh'
      ? '公開失敗。請確認資料庫救援 SQL 已執行，再試一次。'
      : 'Publish failed. Please confirm the rescue SQL has run, then try again.',
    missingLocation: language === 'zh'
      ? '需要先加入遇見地點，才能公開到地圖。'
      : 'Add an encounter location before publishing to the map.',
    hint: language === 'zh'
      ? '臨時救援功能：不需登入，直接把這張貓卡放進公開地圖。'
      : 'Temporary rescue: publish this card without signing in.',
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

      <div className="flex-1 min-h-0 overflow-y-auto px-8 pb-8 pt-4 scrollbar-hide">
        <div className="flex min-h-full flex-col items-center justify-center">
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

          <div className="w-full rounded-[20px] border-2 border-[#221915]/12 bg-[#fffdf2]/92 p-3 text-left shadow-[5px_5px_0_rgba(47,95,179,0.14)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
              {language === 'zh' ? '貼文公開' : 'Public post'}
            </p>
            <p className="mt-1 text-xs font-bold leading-relaxed text-[#6b5b50]">
              {item.location ? publishCopy.hint : publishCopy.missingLocation}
            </p>
            <button
              type="button"
              onClick={() => void handleOneTapPublicPublish()}
              disabled={publicPublishStatus === 'saving' || item.isPublic}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border-2 border-[#221915] bg-[#f7c948] px-4 py-2 text-sm font-black text-[#221915] shadow-[4px_4px_0_rgba(47,95,179,0.18)] transition-transform active:translate-x-[1px] active:translate-y-[1px] disabled:cursor-default disabled:bg-[#fff2cf] disabled:text-[#6b5b50]"
              aria-label={item.isPublic ? publishCopy.published : publishCopy.action}
            >
              <MapPin size={16} className="text-[#2f5fb3]" />
              <span>
                {publicPublishStatus === 'saving'
                  ? publishCopy.saving
                  : item.isPublic
                    ? publishCopy.published
                    : publishCopy.action}
              </span>
            </button>
            {(publicPublishStatus === 'published' || item.isPublic) ? (
              <p className="mt-2 text-xs font-black leading-relaxed text-[#2f5fb3]">{publishCopy.publishedHint}</p>
            ) : null}
            {publicPublishStatus === 'error' ? (
              <p className="mt-2 text-xs font-black leading-relaxed text-[#9f3a2f]">{publishCopy.error}</p>
            ) : null}
          </div>
        </motion.div>
        </div>
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
