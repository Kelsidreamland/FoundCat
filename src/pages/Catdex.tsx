import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import CatdexLabel from '../components/catdex/CatdexLabel';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
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

export default function Catdex() {
  const { items, language } = useScrapbookStore();
  const t = translations[language];

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => (a.catdexNumber ?? 0) - (b.catdexNumber ?? 0)),
    [items]
  );

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#fff7e8] text-[#1d1714]" style={paperTexture}>
      <CatBrandHeader
        title={t.appName}
        subtitle={t.appSubtitle}
        showLanguageToggle={false}
        showClose
        closeLabel="關閉回首頁"
      />

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-8 scrollbar-hide">
        <section className="mx-auto mb-5 max-w-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2f5fb3]">
            FOUND CATS ARCHIVE
          </p>
          <h1 className="mt-1 text-3xl font-black leading-none text-[#1d1714]">
            {t.catdex}
          </h1>
        </section>

        {sortedItems.length === 0 ? (
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
          <div className="grid grid-cols-2 gap-4 pb-2">
            {sortedItems.map((item) => (
              <Link
                key={item.id}
                to={`/detail/${item.id}`}
                className="group block border-2 border-black bg-[#fffdf2] p-2 shadow-[6px_6px_0_rgba(0,0,0,0.88)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5fb3] focus-visible:ring-offset-2 focus-visible:ring-offset-cat-bg"
              >
                <div className="flex aspect-square items-center justify-center border-2 border-black bg-cat-card p-2">
                  <img
                    src={item.imageData}
                    alt={`${t.catdex} ${item.catdexNumber ?? ''}`.trim()}
                    className="max-h-full max-w-full object-contain drop-shadow-[0_8px_10px_rgba(0,0,0,0.16)]"
                    draggable={false}
                  />
                </div>
                <div className="mt-3 flex justify-center">
                  <CatdexLabel catdexNumber={item.catdexNumber} label={t.catdexLabel} />
                </div>
                {item.catName?.trim() ? (
                  <p className="mt-2 truncate text-center text-sm font-black text-[#221915]">
                    {item.catName.trim()}
                  </p>
                ) : null}
                {item.location?.name ? (
                  <p className="mt-1 truncate text-center text-[11px] font-bold text-[#76665a]">
                    {item.location.name}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
