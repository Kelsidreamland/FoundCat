import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, MapPin, X } from 'lucide-react';
import {
  getCareStatusLabels,
  getPersonalityLabels,
} from '../../lib/catInfoDisplay';
import { formatCatCardNumberForItem } from '../../lib/catdexDeck';
import { getReadableLocationName } from '../../lib/locationDisplay';
import type { ScrapbookItem } from '../../store/useScrapbookStore';

export interface WorldCatProfileSheetProps {
  item: ScrapbookItem | null;
  language: 'zh' | 'en';
  isSaved: boolean;
  onClose: () => void;
  onSave: (item: ScrapbookItem) => void;
  onFind: (item: ScrapbookItem) => void;
}

const copyFor = (language: 'zh' | 'en') => ({
  title: language === 'zh' ? '世界貓咪檔案' : 'World Cat Profile',
  close: language === 'zh' ? '關閉世界貓咪檔案' : 'Close world cat profile',
  defaultName: language === 'zh' ? '神秘貓咪' : 'Mystery cat',
  vibe: language === 'zh' ? '牠給人的感覺' : 'Vibe',
  features: language === 'zh' ? '特徵' : 'Features',
  spot: language === 'zh' ? '偶遇線索' : 'Spot clues',
  care: language === 'zh' ? '照護狀態' : 'Care status',
  mystery: language === 'zh' ? '這隻貓還很神秘' : 'This cat is still mysterious',
  find: language === 'zh' ? '去找這隻喵' : 'Go find this cat',
  save: language === 'zh' ? '收藏' : 'Save',
  saved: language === 'zh' ? '已收藏' : 'Saved',
  photoAlt: language === 'zh' ? '世界貓咪照片' : 'World cat photo',
});

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function ChipList({ labels }: { labels: string[] }) {
  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-[#221915]/14 bg-[#fff2cf] px-3 py-1.5 text-[12px] font-black leading-none text-[#221915]"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export default function WorldCatProfileSheet({
  item,
  language,
  isSaved,
  onClose,
  onSave,
  onFind,
}: WorldCatProfileSheetProps) {
  const copy = copyFor(language);
  const title = item?.catName?.trim() || copy.defaultName;
  const image = item?.heroImageData || item?.imageData;
  const personalityLabels = item ? getPersonalityLabels(item.personalityTags, language) : [];
  const careLabels = item ? getCareStatusLabels(item.careStatusTags, language) : [];
  const featureNote = item?.catFeatureNote?.trim();
  const spotNote = item?.spotNote?.trim();
  const hasProfileDetails = Boolean(
    personalityLabels.length > 0 ||
    featureNote ||
    spotNote ||
    careLabels.length > 0
  );

  return (
    <AnimatePresence>
      {item ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[270] flex items-end justify-center bg-[#221915]/38 px-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-[2px] sm:items-center"
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={`${title} ${copy.title}`}
            className="relative max-h-[min(88dvh,680px)] w-full max-w-sm overflow-y-auto rounded-[28px] border-2 border-[#221915] bg-[#fffdf2] p-4 text-[#1d1714] shadow-[8px_9px_0_rgba(29,23,20,0.84)]"
            initial={{ opacity: 0, y: 28, rotate: -0.8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, rotate: -0.35, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
                  {copy.title}
                </p>
                <h2 className="mt-1 truncate text-2xl font-black leading-none text-[#1d1714]">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={copy.close}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#221915] bg-[#fffaf0] text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-[96px_1fr] items-end gap-3">
              <div className="relative aspect-square overflow-hidden rounded-[20px] border-2 border-[#221915] bg-[#f7c948] shadow-[4px_4px_0_rgba(47,95,179,0.20)]">
                {image ? (
                  <img
                    src={image}
                    alt={copy.photoAlt}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-3xl font-black">?</div>
                )}
              </div>
              <div className="min-w-0 rounded-[20px] border border-[#221915]/14 bg-[#fff8e7] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
                  {formatCatCardNumberForItem(item)}
                </p>
                <p className="mt-1 inline-flex max-w-full items-center gap-1.5 truncate text-sm font-black leading-5 text-[#1d1714]">
                  <MapPin size={14} className="shrink-0" strokeWidth={2.5} />
                  <span className="truncate">{getReadableLocationName(item, language)}</span>
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {personalityLabels.length > 0 ? (
                <DetailSection title={copy.vibe}>
                  <ChipList labels={personalityLabels} />
                </DetailSection>
              ) : null}

              {featureNote ? (
                <DetailSection title={copy.features}>
                  <p className="rounded-[16px] border border-[#221915]/12 bg-white/64 px-3 py-2 text-sm font-bold leading-6 text-[#3d312a]">
                    {featureNote}
                  </p>
                </DetailSection>
              ) : null}

              {spotNote ? (
                <DetailSection title={copy.spot}>
                  <p className="rounded-[16px] border border-[#221915]/12 bg-white/64 px-3 py-2 text-sm font-bold leading-6 text-[#3d312a]">
                    {spotNote}
                  </p>
                </DetailSection>
              ) : null}

              {careLabels.length > 0 ? (
                <DetailSection title={copy.care}>
                  <ChipList labels={careLabels} />
                </DetailSection>
              ) : null}

              {!hasProfileDetails ? (
                <p className="rounded-[16px] border border-[#221915]/12 bg-[#fff8e7] px-3 py-2 text-sm font-bold leading-6 text-[#6d5f52]">
                  {copy.mystery}
                </p>
              ) : null}
            </div>

            <div className="sticky bottom-0 -mx-4 mt-5 grid grid-cols-[1fr_auto] gap-2 border-t border-[#221915]/10 bg-[#fffdf2]/96 px-4 pt-3 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => onFind(item)}
                className="rounded-[18px] border-2 border-[#221915] bg-[#2f5fb3] px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0_rgba(29,23,20,0.86)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                {copy.find}
              </button>
              <button
                type="button"
                onClick={() => onSave(item)}
                className="inline-flex items-center justify-center gap-1.5 rounded-[18px] border-2 border-[#221915] bg-[#fff2cf] px-4 py-3 text-sm font-black text-[#1d1714] shadow-[3px_3px_0_rgba(29,23,20,0.86)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                <Bookmark size={15} fill={isSaved ? '#f7c948' : 'none'} strokeWidth={2.5} />
                {isSaved ? copy.saved : copy.save}
              </button>
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
