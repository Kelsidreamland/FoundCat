import { Heart, Sparkles } from 'lucide-react';
import {
  getCareStatusLabels,
  getCatBreedLabel,
  getCatColorLabel,
  getPersonalityLabels,
} from '../../lib/catInfoDisplay';
import { formatCatCardNumberForItem } from '../../lib/catdexDeck';
import { hasReadableLocationName } from '../../lib/locationDisplay';
import type { ScrapbookItem } from '../../store/useScrapbookStore';

export type CatProfileSummaryVariant = 'full' | 'compact';

interface CatProfileSummaryProps {
  item: ScrapbookItem;
  language: 'zh' | 'en';
  variant?: CatProfileSummaryVariant;
  showNumber?: boolean;
  showPlace?: boolean;
  showSavedBadge?: boolean;
}

export const getCatProfileCopy = (language: 'zh' | 'en') => ({
  title: language === 'zh' ? '貓咪個人檔案' : 'Cat Profile',
  catTalkLabel: language === 'zh' ? '貓咪回話' : 'Cat says',
  personality: language === 'zh' ? '感覺' : 'Vibe',
  look: language === 'zh' ? '外型' : 'Look',
  features: language === 'zh' ? '特徵' : 'Features',
  spot: language === 'zh' ? '偶遇線索' : 'Spot clues',
  care: language === 'zh' ? '照護' : 'Care',
  place: language === 'zh' ? '城市' : 'Area',
  known: language === 'zh' ? '目前知道' : 'Known so far',
  nextStep: language === 'zh' ? '下一步' : 'Next step',
  cluePlaceholder: language === 'zh' ? '線索' : 'Clues',
  unknownPlace: language === 'zh' ? '某個可愛街角' : 'A cute corner',
  defaultName: language === 'zh' ? '神秘貓咪' : 'Mystery cat',
  close: language === 'zh' ? '繼續看貓' : 'Keep swiping',
  openCatdex: language === 'zh' ? '查看我的貓卡' : 'View My Cat Cards',
  saved: language === 'zh' ? '已收藏' : 'Saved',
  mysterySpeech: language === 'zh' ? '這隻貓還很神秘。' : 'This cat is still mysterious.',
  knownFact: language === 'zh' ? '牠曾經在這裡出現。' : 'This cat was seen here.',
  nextStepCopy: language === 'zh' ? '去地圖看看牠在哪裡。' : 'Open the map to find this cat.',
  fillLater: language === 'zh' ? '等你補充' : 'Add later',
});

export const getCatSpeech = (item: ScrapbookItem, language: 'zh' | 'en') => {
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

  return getCatProfileCopy(language).mysterySpeech;
};

export const getBroadPlaceLabel = (item: ScrapbookItem, language: 'zh' | 'en') => {
  const name = item.location?.name?.trim();
  if (hasReadableLocationName(name)) return name!;
  return getCatProfileCopy(language).unknownPlace;
};

function ProfileSection({
  title,
  children,
  compact = false,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section>
      <p className={`font-cat-display font-bold uppercase text-[#2f5fb3] ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        {title}
      </p>
      <div className={compact ? 'mt-1.5' : 'mt-2'}>{children}</div>
    </section>
  );
}

function ProfileChips({
  labels,
  compact = false,
}: {
  labels: string[];
  compact?: boolean;
}) {
  if (labels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {labels.map((label) => (
        <span
          key={label}
          className={`rounded-full border border-[#221915]/14 bg-[#fff2cf] font-black leading-none text-[#221915] ${
            compact ? 'px-2.5 py-1.5 text-[11px]' : 'px-3 py-1.5 text-[12px]'
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function MysteryProfileState({
  copy,
  compact = false,
}: {
  copy: ReturnType<typeof getCatProfileCopy>;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'space-y-2.5' : 'space-y-3'}>
      <ProfileSection title={copy.known} compact={compact}>
        <p className={`rounded-[16px] border border-[#2f5fb3]/18 bg-[#d9ecff]/52 px-3 py-2 font-bold text-[#3d312a] ${
          compact ? 'text-xs leading-relaxed' : 'text-sm leading-6'
        }`}>
          {copy.knownFact}
        </p>
      </ProfileSection>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[16px] border border-[#221915]/12 bg-white/64 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
            {copy.personality}
          </p>
          <p className="mt-1 text-xs font-black text-[#6d5f52]">{copy.fillLater}</p>
        </div>
        <div className="rounded-[16px] border border-[#221915]/12 bg-white/64 px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
            {copy.cluePlaceholder}
          </p>
          <p className="mt-1 text-xs font-black text-[#6d5f52]">{copy.fillLater}</p>
        </div>
      </div>

      <ProfileSection title={copy.nextStep} compact={compact}>
        <p className={`rounded-[16px] border border-[#221915]/12 bg-[#fff2cf]/78 px-3 py-2 font-bold text-[#3d312a] ${
          compact ? 'text-xs leading-relaxed' : 'text-sm leading-6'
        }`}>
          {copy.nextStepCopy}
        </p>
      </ProfileSection>
    </div>
  );
}

export default function CatProfileSummary({
  item,
  language,
  variant = 'full',
  showNumber = true,
  showPlace = true,
  showSavedBadge = false,
}: CatProfileSummaryProps) {
  const copy = getCatProfileCopy(language);
  const personalityLabels = getPersonalityLabels(item.personalityTags, language);
  const careLabels = getCareStatusLabels(item.careStatusTags, language);
  const colorLabel = getCatColorLabel(item.catColor, language);
  const breedLabel = getCatBreedLabel(item.catBreed, language);
  const factLabels = [colorLabel, breedLabel].filter(Boolean) as string[];
  const hasNotes = Boolean(item.catFeatureNote?.trim() || item.spotNote?.trim());
  const hasAnyProfileDetail = hasNotes || personalityLabels.length > 0 || factLabels.length > 0 || careLabels.length > 0;
  const compact = variant === 'compact';

  return (
    <section
      aria-label={copy.title}
      data-testid="cat-profile-summary"
      className={compact ? 'space-y-3' : 'space-y-4'}
    >
      <div className={`rounded-[18px] border border-[#221915]/14 bg-[#fff8e7] ${compact ? 'p-3' : 'p-3'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
              {copy.title}
            </p>
            <p className={`mt-1 font-black leading-snug text-[#1d1714] ${compact ? 'text-[13px]' : 'text-[14px]'}`}>
              {getCatSpeech(item, language)}
            </p>
          </div>
          {showNumber ? (
            <span className="font-cat-number shrink-0 rounded-full bg-[#2f5fb3] px-3 py-1 text-[11px] font-bold text-white">
              {formatCatCardNumberForItem(item)}
            </span>
          ) : null}
        </div>
        {showSavedBadge ? (
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-black text-[#7a6a5b]">
            <Heart size={12} fill="#f7c948" strokeWidth={2.4} />
            {copy.saved}
          </p>
        ) : null}
      </div>

      {personalityLabels.length > 0 ? (
        <ProfileSection title={copy.personality} compact={compact}>
          <ProfileChips labels={personalityLabels} compact={compact} />
        </ProfileSection>
      ) : null}

      {factLabels.length > 0 ? (
        <ProfileSection title={copy.look} compact={compact}>
          <ProfileChips labels={factLabels} compact={compact} />
        </ProfileSection>
      ) : null}

      {item.catFeatureNote?.trim() ? (
        <ProfileSection title={copy.features} compact={compact}>
          <p className={`rounded-[16px] border border-[#221915]/12 bg-white/64 px-3 py-2 font-bold text-[#3d312a] ${
            compact ? 'text-xs leading-relaxed' : 'text-sm leading-6'
          }`}>
            {item.catFeatureNote.trim()}
          </p>
        </ProfileSection>
      ) : null}

      {item.spotNote?.trim() ? (
        <ProfileSection title={copy.spot} compact={compact}>
          <p className={`rounded-[16px] border border-[#221915]/12 bg-white/64 px-3 py-2 font-bold text-[#3d312a] ${
            compact ? 'text-xs leading-relaxed' : 'text-sm leading-6'
          }`}>
            {item.spotNote.trim()}
          </p>
        </ProfileSection>
      ) : null}

      {careLabels.length > 0 ? (
        <ProfileSection title={copy.care} compact={compact}>
          <ProfileChips labels={careLabels} compact={compact} />
        </ProfileSection>
      ) : null}

      {showPlace ? (
        <ProfileSection title={copy.place} compact={compact}>
          <p className={`inline-flex items-center gap-2 rounded-full border border-[#2f5fb3]/18 bg-[#d9ecff]/70 font-black text-[#1d1714] ${
            compact ? 'px-3 py-1.5 text-xs' : 'px-3 py-2 text-[13px]'
          }`}>
            <Sparkles size={14} strokeWidth={2.4} />
            {getBroadPlaceLabel(item, language)}
          </p>
        </ProfileSection>
      ) : null}

      {!hasAnyProfileDetail ? (
        <MysteryProfileState copy={copy} compact={compact} />
      ) : null}
    </section>
  );
}
