import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CatCareStatusTag, CatPersonalityTag } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { Check, MapPin, Navigation, PencilLine, Share2, Sparkles, Trash2, Undo2 } from 'lucide-react';
import { translations } from '../translations';
import { motion } from 'framer-motion';
import LocationPicker from '../components/LocationPicker';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import CatProfileSummary from '../components/catdex/CatProfileSummary';
import { shareCatCardPoster } from '../lib/sharePoster';
import { suggestCatName } from '../lib/catNameGenerator';
import {
  CAT_CARE_STATUS_LABELS,
  CAT_PERSONALITY_LABELS,
  getCatInfoCopy,
} from '../lib/catInfoDisplay';

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

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, removeItem, updateItem, language } = useScrapbookStore();
  const t = translations[language];
  const detailCopy = getCatInfoCopy(language);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isEditingCatInfo, setIsEditingCatInfo] = useState(false);
  const [catInfoDraft, setCatInfoDraft] = useState<CatInfoDraft>(EMPTY_CAT_INFO_DRAFT);
  const [catInfoSavedMessage, setCatInfoSavedMessage] = useState<string | null>(null);
  const [isEditingPrivateNote, setIsEditingPrivateNote] = useState(false);
  const [privateNoteDraft, setPrivateNoteDraft] = useState('');
  const [privateNoteSavedMessage, setPrivateNoteSavedMessage] = useState<string | null>(null);

  const item = items.find(i => i.id === id);
  const isSavedWorldCat = Boolean(item?.collectedFromPublicId);

  useEffect(() => {
    if (!item) {
      setCatInfoDraft(EMPTY_CAT_INFO_DRAFT);
      setIsEditingCatInfo(false);
      setCatInfoSavedMessage(null);
      setPrivateNoteDraft('');
      setIsEditingPrivateNote(false);
      setPrivateNoteSavedMessage(null);
      return;
    }

    setCatInfoDraft({
      catName: item.catName ?? '',
      catFeatureNote: item.catFeatureNote ?? '',
      spotNote: item.spotNote ?? '',
      personalityTags: item.personalityTags ?? [],
      careStatusTags: item.careStatusTags ?? [],
    });
    setPrivateNoteDraft(item.privateNote ?? '');
    setCatInfoSavedMessage(null);
    setIsEditingPrivateNote(false);
    setPrivateNoteSavedMessage(null);
  }, [item?.id]);

  const handleLocationPicked = useCallback(async (location: {
    lat: number;
    lng: number;
    name: string;
    address?: string;
    placeId?: string;
    mapUrl?: string;
  }) => {
    if (!item || item.collectedFromPublicId) return;

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
    if (window.confirm(language === 'zh' ? '確定要刪除這個圖鑑嗎？' : 'Delete this cat card?')) {
      removeItem(item.id);
      navigate('/');
    }
  };
  const mapTarget = isSavedWorldCat && item.collectedFromPublicId
    ? `/map?mode=public&cat=${encodeURIComponent(item.collectedFromPublicId)}`
    : `/map?cat=${encodeURIComponent(item.id)}&mode=mine`;

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

  const handleSavePrivateNote = async () => {
    const trimmedPrivateNote = privateNoteDraft.trim();

    await updateItem(item.id, {
      privateNote: trimmedPrivateNote || undefined,
    });
    setPrivateNoteSavedMessage(language === 'zh' ? '已儲存' : 'Saved');
    setIsEditingPrivateNote(false);
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-[#fff7e8] overflow-hidden">
      <CatBrandHeader
        title={t.appName}
        subtitle={t.appSubtitle}
        language={language}
        showLanguageToggle={false}
        showClose
        closeLabel={language === 'zh' ? '關閉回首頁' : 'Close and return home'}
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
          aria-label={language === 'zh' ? '刪除貓卡' : 'Delete cat card'}
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
            <h1 className="font-cat-display text-2xl font-bold leading-tight text-[#1d1714]">
              {item.catName.trim()}
            </h1>
          ) : null}

          {!isSavedWorldCat ? (
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
          ) : null}

          {!isSavedWorldCat && isEditingCatInfo ? (
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
                    {(Object.keys(CAT_PERSONALITY_LABELS) as CatPersonalityTag[]).map((tag) => {
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
                          {CAT_PERSONALITY_LABELS[tag][language]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-black text-[#221915]">{detailCopy.careStatus}</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(CAT_CARE_STATUS_LABELS) as CatCareStatusTag[]).map((tag) => {
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
                          {CAT_CARE_STATUS_LABELS[tag][language]}
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

          <div className="rounded-[22px] border border-[#221915]/14 bg-[#fffdf2] p-4 text-left shadow-[5px_5px_0_rgba(47,95,179,0.14)]">
            <CatProfileSummary item={item} language={language} variant="compact" />
          </div>

          {isSavedWorldCat ? (
            <section className="rounded-[22px] border-2 border-[#221915] bg-[#fffdf2] p-4 text-left shadow-[5px_5px_0_rgba(47,95,179,0.18)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-black text-[#1d1714]">{language === 'zh' ? '我的備註' : 'My note'}</h2>
                <button
                  type="button"
                  onClick={() => {
                    setPrivateNoteSavedMessage(null);
                    setIsEditingPrivateNote((current) => !current);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#221915] bg-[#fff2cf] px-3 py-1.5 text-xs font-black text-[#221915] shadow-[2px_2px_0_rgba(29,23,20,0.7)]"
                >
                  <PencilLine size={14} />
                  {language === 'zh' ? '編輯我的備註' : 'Edit my note'}
                </button>
              </div>

              {isEditingPrivateNote ? (
                <div className="mt-3 space-y-3">
                  <label className="block">
                    <span className="sr-only">{language === 'zh' ? '我的備註' : 'My note'}</span>
                    <textarea
                      aria-label={language === 'zh' ? '我的備註' : 'My note'}
                      value={privateNoteDraft}
                      onChange={(event) => {
                        setPrivateNoteSavedMessage(null);
                        setPrivateNoteDraft(event.target.value);
                      }}
                      rows={4}
                      className="w-full resize-none rounded-2xl border border-[#221915]/20 bg-white px-3 py-2 text-sm font-bold leading-6 text-[#221915] outline-none focus:border-[#2f5fb3] focus:ring-2 focus:ring-[#2f5fb3]/20"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleSavePrivateNote}
                    className="w-full rounded-2xl border-2 border-[#221915] bg-[#2f5fb3] px-4 py-3 text-sm font-black text-white shadow-[4px_4px_0_rgba(29,23,20,0.88)]"
                  >
                    {language === 'zh' ? '儲存我的備註' : 'Save my note'}
                  </button>
                </div>
              ) : (
                <p className="mt-3 whitespace-pre-wrap text-sm font-bold leading-6 text-[#4d4038]">
                  {item.privateNote?.trim() || (language === 'zh' ? '還沒有備註' : 'No note yet')}
                </p>
              )}

              {privateNoteSavedMessage ? (
                <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#eaf1ff] px-3 py-2 text-xs font-black text-[#2f5fb3]">
                  <Check size={14} />
                  {privateNoteSavedMessage}
                </p>
              ) : null}
            </section>
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
          ) : !isSavedWorldCat ? (
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
          ) : null}

        </motion.div>
      </div>

      {showLocationPicker && !isSavedWorldCat ? (
        <LocationPicker
          onPicked={handleLocationPicked}
          onClose={() => setShowLocationPicker(false)}
          language={language}
        />
      ) : null}
    </div>
  );
}
