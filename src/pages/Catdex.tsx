import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import CatActionNav from '../components/catdex/CatActionNav';
import CatdexLabel from '../components/catdex/CatdexLabel';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import { formatPublicCatCardNumber } from '../lib/catdexDeck';
import { getReadableLocationName, hasReadableLocationName } from '../lib/locationDisplay';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { translations } from '../translations';

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
  return language === 'zh' ? '去找這隻貓' : 'Go find this cat';
};

type CatdexPlaceGroup = {
  name: string;
  items: ScrapbookItem[];
};

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

  const renderCollectionSection = ({
    title,
    eyebrow,
    groups,
    isWorldSaved,
  }: {
    title: string;
    eyebrow: string;
    groups: CatdexPlaceGroup[];
    isWorldSaved: boolean;
  }) => {
    if (groups.length === 0) return null;

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
                  {group.items.map((item) => (
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
                      {item.location ? (
                        <p className="mt-1 truncate text-center text-[11px] font-bold text-[#76665a]">
                          {getReadableLocationName(item, language)}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </section>
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
          <div className="space-y-6 pb-2">
            {renderCollectionSection({
              title: language === 'zh' ? '我拍到的貓' : 'Cats I Found',
              eyebrow: 'MY FOUND CATS',
              groups: selfFoundPlaceGroups,
              isWorldSaved: false,
            })}
            {renderCollectionSection({
              title: language === 'zh' ? '收藏的世界貓卡' : 'Saved World Cats',
              eyebrow: 'SAVED FROM WORLD MAP',
              groups: worldSavedPlaceGroups,
              isWorldSaved: true,
            })}
          </div>
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
