import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Heart, MapPin, Navigation, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  getCareStatusLabels,
  getPersonalityLabels,
} from '../../lib/catInfoDisplay';
import { formatCatCardNumberForItem } from '../../lib/catdexDeck';
import { getReadableLocationName } from '../../lib/locationDisplay';
import { getPaperSheetMotion } from '../../lib/uiMotion';
import type { ScrapbookItem } from '../../store/useScrapbookStore';

export interface WorldCatProfileSheetProps {
  item: ScrapbookItem | null;
  language: 'zh' | 'en';
  isSaved: boolean;
  onClose: () => void;
  onSave: (item: ScrapbookItem) => void | Promise<void>;
  onFind: (item: ScrapbookItem) => void;
}

const copyFor = (language: 'zh' | 'en') => ({
  title: language === 'zh' ? '世界貓咪檔案' : 'World Cat Profile',
  close: language === 'zh' ? '關閉世界貓咪檔案' : 'Close world cat profile',
  defaultName: language === 'zh' ? '神秘貓咪' : 'Mystery cat',
  vibe: language === 'zh' ? '感覺' : 'Vibe',
  features: language === 'zh' ? '特徵' : 'Features',
  spot: language === 'zh' ? '偶遇線索' : 'Spot clues',
  care: language === 'zh' ? '照護' : 'Care',
  known: language === 'zh' ? '目前知道' : 'Known so far',
  nextStep: language === 'zh' ? '下一步' : 'Next step',
  cluePlaceholder: language === 'zh' ? '線索' : 'Clues',
  mystery: language === 'zh' ? '這隻貓還很神秘。' : 'This cat is still mysterious.',
  knownFact: language === 'zh' ? '牠曾經在這裡出現。' : 'This cat was seen here.',
  nextStepCopy: language === 'zh' ? '去地圖看看牠在哪裡。' : 'Open the map to find this cat.',
  fillLater: language === 'zh' ? '等你補充' : 'Add later',
  summary: language === 'zh' ? '檔案摘要' : 'Profile note',
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
      <p className="font-cat-display text-[10px] font-bold uppercase text-[#2f5fb3]">
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

function getProfileSummary(
  copy: ReturnType<typeof copyFor>,
  labels: string[],
  hasProfileDetails: boolean
) {
  if (labels.length > 0) return labels.slice(0, 2).join(' / ');
  if (hasProfileDetails) return copy.knownFact;
  return copy.mystery;
}

function MysteryState({ copy }: { copy: ReturnType<typeof copyFor> }) {
  return (
    <p className="rounded-[18px] border border-[#221915]/12 bg-white/62 px-3 py-2.5 text-sm font-bold leading-6 text-[#6d5f52]">
      {copy.knownFact}
    </p>
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
  const [isSaving, setIsSaving] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const sheetMotion = getPaperSheetMotion(prefersReducedMotion);
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
  const profileSummary = getProfileSummary(copy, personalityLabels, hasProfileDetails);
  const isSaveLocked = isSaved || isSaving;

  useEffect(() => {
    setIsSaving(false);
  }, [item?.id]);

  return (
    <AnimatePresence>
      {item ? (
        <motion.div
          role="presentation"
          data-testid="world-cat-profile-backdrop"
          data-motion-surface="paper-sheet-backdrop"
          className="fixed inset-0 z-[270] flex items-end justify-center bg-[#221915]/38 px-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-[2px] sm:items-center"
          {...sheetMotion.backdrop}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={`${title} ${copy.title}`}
            data-motion-surface="paper-sheet"
            data-motion-context="world-cat"
            data-motion-reduced={prefersReducedMotion ? 'true' : 'false'}
            className="relative max-h-[min(88dvh,680px)] w-full max-w-sm overflow-y-auto rounded-[28px] border-2 border-[#221915] bg-[#fffdf2] p-4 text-[#1d1714] shadow-[8px_9px_0_rgba(29,23,20,0.84)]"
            {...sheetMotion.sheet}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
                  {copy.title}
                </p>
                <h2 className="font-cat-display mt-1 truncate text-2xl font-bold leading-none text-[#1d1714]">
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

            <div className="mt-4">
              <div
                data-testid="world-cat-photo-frame"
                className="relative h-[clamp(190px,36dvh,280px)] overflow-hidden rounded-[24px] border-2 border-[#221915] bg-[#f7c948] shadow-[5px_5px_0_rgba(47,95,179,0.20)]"
              >
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
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-cat-number rounded-full bg-[#2f5fb3] px-3 py-1 text-[11px] font-bold text-white">
                  {formatCatCardNumberForItem(item)}
                </span>
                <span
                  data-testid="world-cat-location-pill"
                  className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-[#2f5fb3]/18 bg-[#d9ecff]/72 px-3 py-1.5 text-xs font-black text-[#1d1714]"
                >
                  <MapPin size={14} className="shrink-0" strokeWidth={2.5} />
                  <span className="truncate">{getReadableLocationName(item, language)}</span>
                </span>
              </div>
            </div>

            <div className="mt-5 space-y-3.5">
              <section
                data-testid="world-cat-profile-summary"
                className="rounded-[18px] border border-[#221915]/12 bg-[#fff8e7] px-3 py-2.5"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
                  {copy.summary}
                </p>
                <p className="mt-1 text-sm font-black leading-6 text-[#1d1714]">
                  {profileSummary}
                </p>
              </section>

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
                <MysteryState copy={copy} />
              ) : null}
            </div>

            <div className="sticky bottom-0 -mx-4 mt-5 flex justify-end gap-2 border-t border-[#221915]/10 bg-[#fffdf2]/96 px-4 pt-3 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => onFind(item)}
                aria-label={copy.find}
                title={copy.find}
                data-testid="world-cat-find-icon-action"
                className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-[#221915] bg-[#2f5fb3] text-white shadow-[3px_3px_0_rgba(29,23,20,0.86)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                <Navigation size={20} fill="currentColor" strokeWidth={2.4} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isSaveLocked) return;
                  setIsSaving(true);
                  void Promise.resolve(onSave(item)).catch(() => {
                    setIsSaving(false);
                  });
                }}
                disabled={isSaveLocked}
                aria-label={isSaved ? copy.saved : copy.save}
                title={isSaved ? copy.saved : copy.save}
                data-testid="world-cat-save-icon-action"
                className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-[#221915] bg-[#fff2cf] text-[#1d1714] shadow-[3px_3px_0_rgba(29,23,20,0.86)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3] disabled:cursor-default disabled:bg-[#fff8e7] disabled:text-[#6d5f52]"
              >
                <Heart size={20} fill={isSaved ? '#f7c948' : 'none'} strokeWidth={2.5} aria-hidden="true" />
              </button>
            </div>
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
