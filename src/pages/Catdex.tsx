import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CatActionNav from '../components/catdex/CatActionNav';
import CatdexLabel from '../components/catdex/CatdexLabel';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import { formatPublicCatCardNumber } from '../lib/catdexDeck';
import { getFindCatCta, getReadableLocationName, hasReadableLocationName } from '../lib/locationDisplay';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { translations } from '../translations';
import {
  getCatColorLabel,
  getCatInfoCopy,
  getCareStatusLabels,
  getPersonalityLabels,
} from '../lib/catInfoDisplay';

const paperTexture = {
  backgroundImage: [
    'linear-gradient(105deg, rgba(47,95,179,0.055) 0 1px, transparent 1px 100%)',
    'linear-gradient(0deg, rgba(17,17,17,0.04) 0 1px, transparent 1px 100%)',
    'repeating-linear-gradient(96deg, rgba(0,0,0,0.022) 0 1px, transparent 1px 11px)',
    'linear-gradient(135deg, rgba(255,255,255,0.58), transparent 38%)',
  ].join(', '),
  backgroundSize: '28px 28px, 100% 18px, 100% 100%, 100% 100%',
};

const getPlaceGroupName = (location: ScrapbookItem['location'], language: 'zh' | 'en') => {
  if (!location) return language === 'zh' ? '未記錄地點' : 'No location yet';
  if (hasReadableLocationName(location.name)) return location.name.trim();
  return getFindCatCta(language);
};

type CatdexPlaceGroup = {
  name: string;
  items: ScrapbookItem[];
};

type CatdexCollectionTab = 'self' | 'world';

const sortByNumberThenDate = (items: ScrapbookItem[]) => {
  return [...items].sort((a, b) => {
    const aNumber = a.collectedFromPublicId
      ? a.publicNumber ?? Number.POSITIVE_INFINITY
      : a.catdexNumber ?? Number.POSITIVE_INFINITY;
    const bNumber = b.collectedFromPublicId
      ? b.publicNumber ?? Number.POSITIVE_INFINITY
      : b.catdexNumber ?? Number.POSITIVE_INFINITY;

    if (aNumber !== bNumber) return aNumber - bNumber;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
};

const buildPlaceGroups = (items: ScrapbookItem[], language: 'zh' | 'en') => {
  const groups: CatdexPlaceGroup[] = [];

  items.forEach((item) => {
    const groupName = getPlaceGroupName(item.location, language);
    const existingGroup = groups.find((group) => group.name === groupName);
    if (existingGroup) {
      existingGroup.items.push(item);
      return;
    }

    groups.push({ name: groupName, items: [item] });
  });

  return groups;
};

export default function Catdex() {
  const { items, language } = useScrapbookStore();
  const t = translations[language];
  const catInfoCopy = getCatInfoCopy(language);
  const [activeCollectionTab, setActiveCollectionTab] = useState<CatdexCollectionTab>('self');

  const selfFoundItems = useMemo(
    () => sortByNumberThenDate(items.filter((item) => !item.collectedFromPublicId)),
    [items]
  );
  const worldSavedItems = useMemo(
    () => sortByNumberThenDate(items.filter((item) => item.collectedFromPublicId)),
    [items]
  );
  const selfFoundPlaceGroups = useMemo(
    () => buildPlaceGroups(selfFoundItems, language),
    [language, selfFoundItems]
  );
  const worldSavedPlaceGroups = useMemo(
    () => buildPlaceGroups(worldSavedItems, language),
    [language, worldSavedItems]
  );

  const formatGroupCount = (count: number) => (
    language === 'zh'
      ? `${count} 張貓卡`
      : `${count} cat ${count === 1 ? 'card' : 'cards'}`
  );

  const renderCollectionSummary = (isWorldSaved: boolean) => (
    <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-3 rounded-[18px] border border-[#221915]/14 bg-[#fffdf2]/80 px-3 py-2 shadow-[2px_3px_0_rgba(47,95,179,0.09)]">
      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
        isWorldSaved
          ? 'bg-[#d9ecff] text-[#2f5fb3]'
          : 'bg-[#fff2cf] text-[#221915]'
      }`}>
        {isWorldSaved
          ? (language === 'zh' ? '世界地圖編號' : 'World map number')
          : (language === 'zh' ? '我的圖鑑編號' : 'My card number')}
      </span>
      <p className="text-xs font-bold leading-5 text-[#6d5f52]">
        {isWorldSaved
          ? (language === 'zh'
              ? '保留 W-001 編號，不併入自己的 No 編號。'
              : 'Keeps W-001 numbers and never merges into your private No. series.')
          : (language === 'zh'
              ? 'No.001 起算，只整理自己親自拍到的貓。'
              : 'Starts at No.001 and only includes cats you photographed yourself.')}
      </p>
    </div>
  );

  const renderCollectionEmptyState = (isWorldSaved: boolean) => (
    <section aria-live="polite" className="rounded-[24px] border-2 border-[#221915] bg-[#fffdf2] p-6 text-center shadow-[7px_8px_0_rgba(29,23,20,0.86)]">
      <div className={`mx-auto mb-4 grid h-16 w-16 rotate-[-4deg] place-items-center border-2 border-[#221915] text-2xl font-black shadow-[4px_4px_0_rgba(29,23,20,0.82)] ${
        isWorldSaved ? 'bg-[#d9ecff] text-[#2f5fb3]' : 'bg-[#fff2cf] text-[#221915]'
      }`}>
        {isWorldSaved ? 'W' : 'No.'}
      </div>
      <p className="text-lg font-black text-[#1d1714]">
        {isWorldSaved
          ? (language === 'zh' ? '還沒有收藏世界貓卡' : 'No saved world cats yet')
          : (language === 'zh' ? '還沒有自己拍到的貓卡' : 'No cats you found yet')}
      </p>
      <p className="mx-auto mt-2 max-w-[17rem] text-sm font-bold leading-6 text-[#6d5f52]">
        {isWorldSaved
          ? (language === 'zh'
              ? '回首頁左滑收藏喜歡的世界貓卡，牠們會保留 W 編號出現在這裡。'
              : 'Go back home and swipe left to save world cats. They will keep their W-numbers here.')
          : (language === 'zh'
              ? '按中間的拍貓按鈕，存下你親自遇見的第一隻貓。'
              : 'Use the center capture button to save the first cat you found yourself.')}
      </p>
    </section>
  );

  const renderCollectionSection = ({
    title,
    eyebrow,
    description,
    groups,
    isWorldSaved,
  }: {
    title: string;
    eyebrow: string;
    description: string;
    groups: CatdexPlaceGroup[];
    isWorldSaved: boolean;
  }) => {
    if (groups.length === 0) return renderCollectionEmptyState(isWorldSaved);

    return (
      <section aria-labelledby={isWorldSaved ? 'world-saved-cats-heading' : 'self-found-cats-heading'}>
        <div className="mb-4 border-b-2 border-[#221915] pb-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
            {eyebrow}
          </p>
          <h2
            id={isWorldSaved ? 'world-saved-cats-heading' : 'self-found-cats-heading'}
            className="mt-1 text-2xl font-black leading-tight text-[#1d1714]"
          >
            {title}
          </h2>
          <p className="mt-1 text-sm font-bold leading-6 text-[#6d5f52]">
            {description}
          </p>
          {renderCollectionSummary(isWorldSaved)}
        </div>

        <div className="space-y-6">
          {groups.map((group, index) => {
            const groupHeadingId = `${isWorldSaved ? 'world-cat-place' : 'self-cat-place'}-${index}`;

            return (
              <section key={`${isWorldSaved ? 'world' : 'self'}-${group.name}`} aria-labelledby={groupHeadingId}>
                <div className="mb-3 flex items-end justify-between gap-3 border-b border-[#221915]/25 pb-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
                      {isWorldSaved ? 'SAVED WORLD PLACE' : 'FOUND CAT PLACE'}
                    </p>
                    <h3
                      id={groupHeadingId}
                      className="mt-1 truncate text-xl font-black leading-tight text-[#1d1714]"
                    >
                      {group.name}
                    </h3>
                  </div>
                  <p className="shrink-0 rounded-full border border-[#221915]/20 bg-[#fffdf2] px-3 py-1 text-[11px] font-black text-[#221915] shadow-[2px_2px_0_rgba(47,95,179,0.12)]">
                    {formatGroupCount(group.items.length)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {group.items.map((item) => {
                    const personalityLabels = getPersonalityLabels(item.personalityTags, language);
                    const careLabels = getCareStatusLabels(item.careStatusTags, language);
                    const colorLabel = getCatColorLabel(item.catColor, language);
                    const summaryLabels = [
                      ...personalityLabels,
                      ...careLabels,
                      colorLabel,
                    ].filter(Boolean).slice(0, 3) as string[];

                    return (
                      <Link
                        key={item.id}
                        to={`/detail/${item.id}`}
                        className="group block border-2 border-black bg-[#fffdf2] p-2 shadow-[6px_6px_0_rgba(0,0,0,0.88)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5fb3] focus-visible:ring-offset-2 focus-visible:ring-offset-cat-bg"
                      >
                        <div className="flex aspect-square items-center justify-center border-2 border-black bg-cat-card p-2">
                          <img
                            src={item.imageData}
                            alt={`${t.catdex} ${isWorldSaved ? formatPublicCatCardNumber(item.publicNumber) : item.catdexNumber ?? ''}`.trim()}
                            className="max-h-full max-w-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.16)]"
                            draggable={false}
                          />
                        </div>
                        <div className="mt-3 flex justify-center">
                          {isWorldSaved ? (
                            <div className="inline-flex min-w-[116px] flex-col border-2 border-black bg-[#fffdf2] px-3 py-2 text-right shadow-[4px_4px_0_rgba(0,0,0,0.88)]">
                              <span className="text-[10px] font-black uppercase leading-none text-black">
                                {formatPublicCatCardNumber(item.publicNumber)}
                              </span>
                              <span className="mt-1 text-[11px] font-bold leading-none text-[#2f5fb3]">
                                WORLD CAT
                              </span>
                            </div>
                          ) : (
                            <CatdexLabel catdexNumber={item.catdexNumber} label={t.catdexLabel} />
                          )}
                        </div>
                        {item.catName?.trim() ? (
                          <p className="mt-2 truncate text-center text-sm font-black text-[#221915]">
                            {item.catName.trim()}
                          </p>
                        ) : null}
                        {summaryLabels.length > 0 ? (
                          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                            {summaryLabels.map((label) => (
                              <span
                                key={label}
                                className="rounded-full border border-[#221915]/12 bg-[#fff2cf] px-2 py-1 text-[10px] font-black text-[#221915]"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {item.catFeatureNote?.trim() ? (
                          <p className="mt-2 line-clamp-2 text-left text-[11px] font-bold leading-5 text-[#4d4038]">
                            {catInfoCopy.featureHeading}：{item.catFeatureNote.trim()}
                          </p>
                        ) : null}
                        {item.spotNote?.trim() ? (
                          <p className="mt-1 line-clamp-2 text-left text-[11px] font-bold leading-5 text-[#6d5f52]">
                            {catInfoCopy.spotHeading}：{item.spotNote.trim()}
                          </p>
                        ) : null}
                        {isWorldSaved ? (
                          <p className="mt-2 text-center text-[11px] font-black text-[#2f5fb3]">
                            {language === 'zh' ? '收藏自全世界地圖' : 'Saved from World Map'}
                          </p>
                        ) : null}
                        {item.location ? (
                          <p className="mt-1 truncate text-center text-[11px] font-bold text-[#76665a]">
                            {getReadableLocationName(item, language)}
                          </p>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    );
  };

  const selfTabLabel = language === 'zh' ? '我拍到的貓' : 'Cats I Found';
  const worldTabLabel = language === 'zh' ? '收藏的世界貓卡' : 'Saved World Cats';
  const activeCollection = activeCollectionTab === 'world'
    ? {
        title: worldTabLabel,
        eyebrow: 'SAVED FROM WORLD MAP',
        description: language === 'zh'
          ? '從全世界地圖收藏回來，保留原本的 W 編號。'
          : 'Cats saved from the World Map, keeping their original W-numbers.',
        groups: worldSavedPlaceGroups,
        isWorldSaved: true,
      }
    : {
        title: selfTabLabel,
        eyebrow: 'MY FOUND CATS',
        description: language === 'zh'
          ? '自己拍到、自己編號的貓咪圖鑑。'
          : 'Cats you photographed yourself, with your own private numbers.',
        groups: selfFoundPlaceGroups,
        isWorldSaved: false,
      };

  const renderCollectionTab = ({
    id,
    label,
    count,
  }: {
    id: CatdexCollectionTab;
    label: string;
    count: number;
  }) => {
    const isActive = activeCollectionTab === id;

    return (
      <button
        type="button"
        onClick={() => setActiveCollectionTab(id)}
        aria-label={`${label} ${count}`}
        aria-pressed={isActive}
        className={`flex min-w-0 flex-1 items-center justify-between gap-2 rounded-[16px] border-2 px-3 py-2 text-left text-xs font-black transition-colors ${
          isActive
            ? 'border-[#221915] bg-[#2f5fb3] text-[#fffdf2] shadow-[3px_3px_0_rgba(29,23,20,0.85)]'
            : 'border-[#221915]/20 bg-[#fffdf2] text-[#6d5f52]'
        }`}
      >
        <span className="truncate">{label}</span>
        <span className={`grid h-6 min-w-6 place-items-center rounded-full px-2 text-[11px] ${
          isActive ? 'bg-[#fffdf2] text-[#2f5fb3]' : 'bg-[#fff2cf] text-[#221915]'
        }`}>
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#fff7e8] text-[#1d1714]" style={paperTexture}>
      <CatBrandHeader
        title={t.appName}
        subtitle={t.appSubtitle}
        showLanguageToggle={false}
        showClose
        closeLabel="關閉回首頁"
      />

      <main className="mb-[calc(4.25rem+env(safe-area-inset-bottom))] min-h-0 flex-1 overflow-y-auto px-5 pb-5 scrollbar-hide">
        <section className="mx-auto mb-5 max-w-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2f5fb3]">
            FOUND CATS ARCHIVE
          </p>
          <h1 className="mt-1 text-3xl font-black leading-none text-[#1d1714]">
            {t.catdex}
          </h1>
          {items.length > 0 ? (
            <div className="mt-4 flex gap-2" aria-label={language === 'zh' ? '貓卡分類' : 'Cat card sections'}>
              {renderCollectionTab({
                id: 'self',
                label: selfTabLabel,
                count: selfFoundItems.length,
              })}
              {renderCollectionTab({
                id: 'world',
                label: worldTabLabel,
                count: worldSavedItems.length,
              })}
            </div>
          ) : null}
        </section>

        {items.length === 0 ? (
          <div className="flex min-h-[360px] items-center justify-center py-8">
            <div className="w-full border-2 border-black bg-[#fffdf2] p-6 text-center shadow-[8px_8px_0_rgba(0,0,0,0.88)]">
              <div className="mx-auto mb-5 flex h-24 w-24 rotate-[-4deg] items-center justify-center border-2 border-black bg-cat-sand text-5xl shadow-[5px_5px_0_rgba(0,0,0,0.88)]">
                ?
              </div>
              <p className="text-lg font-black text-cat-text-main">{t.catdexEmpty}</p>
              <p className="mx-auto mt-2 max-w-[260px] text-sm font-medium leading-6 text-cat-text-secondary">
                {t.catdexEmptyHint}
              </p>
            </div>
          </div>
        ) : (
          <motion.div
            key={activeCollectionTab}
            data-testid="catdex-collection-motion"
            data-motion-surface="catdex-collection"
            data-active-collection={activeCollectionTab}
            className="space-y-6 pb-2"
            initial={{ opacity: 0, y: 8, scale: 0.992 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {renderCollectionSection(activeCollection)}
          </motion.div>
        )}
      </main>

      <CatActionNav
        labels={{
          nav: language === 'zh' ? '主要操作' : 'Primary actions',
          myCatCards: t.myCatCards,
          capture: language === 'zh' ? '拍貓' : 'Capture cat',
          map: t.map,
        }}
      />
    </div>
  );
}
