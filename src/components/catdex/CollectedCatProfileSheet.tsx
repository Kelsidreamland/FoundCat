import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getCareStatusLabels,
  getCatBreedLabel,
  getCatColorLabel,
  getPersonalityLabels,
} from '../../lib/catInfoDisplay';
import { formatCatCardNumberForItem } from '../../lib/catdexDeck';
import { hasReadableLocationName } from '../../lib/locationDisplay';
import type { ScrapbookItem } from '../../store/useScrapbookStore';

interface CollectedCatProfileSheetProps {
  item: ScrapbookItem | null;
  language: 'zh' | 'en';
  onClose: () => void;
}

const getProfileCopy = (language: 'zh' | 'en') => ({
  title: language === 'zh' ? '貓咪個人檔案' : 'Cat Profile',
  catTalkLabel: language === 'zh' ? '貓咪回話' : 'Cat says',
  personality: language === 'zh' ? '牠給人的感覺' : 'Vibe',
  features: language === 'zh' ? '特徵' : 'Features',
  spot: language === 'zh' ? '喜歡出沒' : 'Favorite spot',
  care: language === 'zh' ? '照護狀態' : 'Care notes',
  place: language === 'zh' ? '出沒城市' : 'Area',
  unknownPlace: language === 'zh' ? '某個可愛街角' : 'A cute corner',
  defaultName: language === 'zh' ? '剛收藏的貓咪' : 'Saved cat',
  close: language === 'zh' ? '繼續看貓' : 'Keep swiping',
  openCatdex: language === 'zh' ? '查看我的貓卡' : 'View My Cat Cards',
  saved: language === 'zh' ? '已收藏' : 'Saved',
  noDetails: language === 'zh' ? '牠還很神秘，等下一位貓奴補充。' : 'Still mysterious. More notes can be added later.',
});

const getCatSpeech = (item: ScrapbookItem, language: 'zh' | 'en') => {
  const tags = item.personalityTags ?? [];

  if (tags.includes('friendly') || tags.includes('clingy')) {
    return language === 'zh' ? '喵，謝謝你收藏我。下次見面可以慢慢眨眼。' : 'Meow, thanks for saving me. Slow blink when we meet.';
  }
  if (tags.includes('foodie')) {
    return language === 'zh' ? '喵，我先聲明，我只是剛好也喜歡點心。' : 'Meow. For the record, I simply appreciate snacks.';
  }
  if (tags.includes('shy') || tags.includes('alert')) {
    return language === 'zh' ? '喵，我會先躲一下，但我有看到你收藏我。' : 'Meow. I may hide first, but I noticed you saved me.';
  }
  if (tags.includes('aloof') || tags.includes('indifferent')) {
    return language === 'zh' ? '喵，我同意被收藏，但不保證立刻理你。' : 'Meow. You may save me, but attention is not guaranteed.';
  }

  return language === 'zh' ? '喵，謝謝你收藏我。' : 'Meow, thanks for saving me.';
};

const getBroadPlaceLabel = (item: ScrapbookItem, language: 'zh' | 'en') => {
  const name = item.location?.name?.trim();
  if (hasReadableLocationName(name)) return name!;
  return getProfileCopy(language).unknownPlace;
};

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">{title}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function ProfileChips({ labels }: { labels: string[] }) {
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

export default function CollectedCatProfileSheet({
  item,
  language,
  onClose,
}: CollectedCatProfileSheetProps) {
  const copy = getProfileCopy(language);
  const title = item?.catName?.trim() || copy.defaultName;
  const image = item?.heroImageData || item?.imageData;
  const personalityLabels = item ? getPersonalityLabels(item.personalityTags, language) : [];
  const careLabels = item ? getCareStatusLabels(item.careStatusTags, language) : [];
  const colorLabel = item ? getCatColorLabel(item.catColor, language) : undefined;
  const breedLabel = item ? getCatBreedLabel(item.catBreed, language) : undefined;
  const factLabels = [colorLabel, breedLabel].filter(Boolean) as string[];
  const hasNotes = Boolean(item?.catFeatureNote?.trim() || item?.spotNote?.trim());
  const dialogLabel = `${title} ${copy.title}`;

  return (
    <AnimatePresence>
      {item ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[280] flex items-end justify-center bg-[#221915]/38 px-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-[2px] sm:items-center"
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={dialogLabel}
            className="relative max-h-[min(86dvh,680px)] w-full max-w-sm overflow-y-auto rounded-[28px] border-2 border-[#221915] bg-[#fffdf2] p-4 text-[#1d1714] shadow-[8px_9px_0_rgba(29,23,20,0.84)]"
            initial={{ opacity: 0, y: 26, rotate: -0.8, scale: 0.98 }}
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

            <div className="mt-4 grid grid-cols-[92px_1fr] gap-3">
              <div className="relative aspect-square overflow-hidden rounded-[20px] border-2 border-[#221915] bg-[#f7c948] shadow-[4px_4px_0_rgba(47,95,179,0.20)]">
                {image ? (
                  <img
                    src={image}
                    alt={language === 'zh' ? '收藏的貓咪照片' : 'Saved cat photo'}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-3xl font-black">?</div>
                )}
              </div>
              <div className="flex min-w-0 flex-col justify-between rounded-[20px] border border-[#221915]/14 bg-[#fff8e7] p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-[#2f5fb3] px-3 py-1 text-[11px] font-black text-white">
                    {formatCatCardNumberForItem(item)}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#7a6a5b]">
                    <Heart size={12} fill="#f7c948" strokeWidth={2.4} />
                    {copy.saved}
                  </span>
                </div>
                <p className="mt-3 text-[14px] font-black leading-5 text-[#1d1714]">
                  {getCatSpeech(item, language)}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <ProfileSection title={copy.personality}>
                {personalityLabels.length > 0 ? (
                  <ProfileChips labels={personalityLabels} />
                ) : (
                  <p className="text-sm font-bold leading-6 text-[#6d5f52]">{copy.noDetails}</p>
                )}
              </ProfileSection>

              {factLabels.length > 0 ? (
                <ProfileSection title={language === 'zh' ? '外型小檔案' : 'Look'}>
                  <ProfileChips labels={factLabels} />
                </ProfileSection>
              ) : null}

              {item.catFeatureNote?.trim() ? (
                <ProfileSection title={copy.features}>
                  <p className="rounded-[18px] border border-[#221915]/12 bg-white/64 px-3 py-2 text-sm font-bold leading-6 text-[#3d312a]">
                    {item.catFeatureNote.trim()}
                  </p>
                </ProfileSection>
              ) : null}

              {item.spotNote?.trim() ? (
                <ProfileSection title={copy.spot}>
                  <p className="rounded-[18px] border border-[#221915]/12 bg-white/64 px-3 py-2 text-sm font-bold leading-6 text-[#3d312a]">
                    {item.spotNote.trim()}
                  </p>
                </ProfileSection>
              ) : null}

              {careLabels.length > 0 ? (
                <ProfileSection title={copy.care}>
                  <ProfileChips labels={careLabels} />
                </ProfileSection>
              ) : null}

              <ProfileSection title={copy.place}>
                <p className="inline-flex items-center gap-2 rounded-full border border-[#2f5fb3]/18 bg-[#d9ecff]/70 px-3 py-2 text-[13px] font-black text-[#1d1714]">
                  <Sparkles size={14} strokeWidth={2.4} />
                  {getBroadPlaceLabel(item, language)}
                </p>
              </ProfileSection>

              {!hasNotes && personalityLabels.length === 0 && factLabels.length === 0 ? (
                <p className="rounded-[18px] border border-[#221915]/12 bg-[#fff8e7] px-3 py-2 text-sm font-bold leading-6 text-[#6d5f52]">
                  {copy.noDetails}
                </p>
              ) : null}
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[18px] border-2 border-[#221915] bg-[#2f5fb3] px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0_rgba(29,23,20,0.86)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                {copy.close}
              </button>
              <Link
                to="/catdex"
                className="rounded-[18px] border-2 border-[#221915] bg-[#fff2cf] px-4 py-3 text-sm font-black text-[#1d1714] shadow-[3px_3px_0_rgba(29,23,20,0.86)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                {copy.openCatdex}
              </Link>
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
