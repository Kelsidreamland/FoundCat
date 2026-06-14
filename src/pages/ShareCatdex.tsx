import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Copy, Download, MapPin, Share2 } from 'lucide-react';
import CatActionNav from '../components/catdex/CatActionNav';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import { formatCatCardNumber, sortCatCards } from '../lib/catdexDeck';
import { downloadCatMapCsv } from '../lib/mapExport';
import { buildMapSharePayload, buildMapShareUrl } from '../lib/mapShare';
import { shareCatMapPoster } from '../lib/sharePoster';
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

const getShareCardTitle = (item: ScrapbookItem, language: 'zh' | 'en') => {
  return item.catName?.trim() || item.location?.name || (language === 'zh' ? '未命名貓咪' : 'Unnamed cat');
};

const normalizeMapDisplayName = (value: string | undefined, fallback: string) => {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  if (trimmed === '我的轉角貓圖鑑' || trimmed === 'My FOUND CAT Catdex' || trimmed === 'My Corner Cat Catdex') {
    return fallback;
  }
  return value ?? fallback;
};

export default function ShareCatdex() {
  const {
    items,
    language,
    setLanguage,
    catdexDisplayName,
    setCatdexDisplayName,
  } = useScrapbookStore();
  const t = translations[language];
  const mappedItems = useMemo(() => sortCatCards(items).filter((item) => item.location), [items]);
  const [draftName, setDraftName] = useState(() => normalizeMapDisplayName(catdexDisplayName, t.catdexDisplayName));
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null);
  const [includeMemo, setIncludeMemo] = useState(false);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const effectiveSelectedIds = selectedIds ?? new Set(mappedItems.map((item) => item.id));
  const selectedItems = mappedItems.filter((item) => effectiveSelectedIds.has(item.id));
  const hasMappedCats = mappedItems.length > 0;

  const handleNameBlur = () => {
    void setCatdexDisplayName(draftName);
  };

  useEffect(() => {
    const normalized = normalizeMapDisplayName(catdexDisplayName, t.catdexDisplayName);
    if (normalized !== draftName && (catdexDisplayName === '我的轉角貓圖鑑' || catdexDisplayName === 'My FOUND CAT Catdex' || catdexDisplayName === 'My Corner Cat Catdex')) {
      setDraftName(normalized);
      void setCatdexDisplayName(normalized);
    }
  }, [catdexDisplayName, draftName, setCatdexDisplayName, t.catdexDisplayName]);

  const toggleItem = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current ?? mappedItems.map((item) => item.id));
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      setHasCopiedLink(false);
      return next;
    });
  };

  const handleShare = async () => {
    await shareCatMapPoster({
      title: draftName,
      items: selectedItems,
      language,
      includeMemo,
    });
  };

  const handleExportCsv = () => {
    downloadCatMapCsv({
      title: draftName,
      items: selectedItems,
      language,
      includeMemo,
    });
  };

  const handleCopyMapLink = async () => {
    const payload = buildMapSharePayload(selectedItems, {
      title: draftName,
      language,
      includeMemo,
    });
    const shareUrl = buildMapShareUrl(payload, window.location.origin);
    await navigator.clipboard?.writeText(shareUrl);
    setHasCopiedLink(true);
  };

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#fff7e8] text-[#1d1714]" style={paperTexture}>
      <CatBrandHeader
        title={t.appName}
        subtitle={t.appSubtitle}
        language={language}
        onToggleLanguage={() => void setLanguage(language === 'zh' ? 'en' : 'zh')}
        toggleLabel={language === 'zh' ? t.switchToEnglish : t.switchToChinese}
        showClose
        closeLabel={language === 'zh' ? '關閉回首頁' : 'Close to home'}
      />

      <main className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(6.75rem+env(safe-area-inset-bottom))] sm:pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <section className="mx-auto max-w-sm">
          <div className="mt-2 sm:mt-5">
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#2f5fb3]">FOUND CAT MAP</p>
            <h1 className="mt-1 text-[1.65rem] font-black leading-none text-[#1d1714] sm:text-[1.9rem]">
              {t.shareCatdex}
            </h1>
            <p className="mt-1 max-w-[280px] text-xs font-bold leading-5 text-[#76665a] sm:mt-2">
              {t.shareCatdexSubtitle}
            </p>
          </div>

          <div className="mt-4 rotate-[-1deg] overflow-hidden rounded-[24px] border-2 border-[#1d1714] bg-[linear-gradient(135deg,#d9ecff_0_35%,#fffdf7_36%_63%,#ffe6ad_64%_100%)] p-4 shadow-[8px_9px_0_#1d1714] sm:mt-6 sm:rounded-[28px] sm:p-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[12px] font-black leading-none">{t.catdexCollected}</p>
                <div className="mt-2 flex items-end gap-1">
                  <b className="text-[46px] font-black leading-[0.78]">{items.length}</b>
                  <span className="pb-1 text-[16px] font-black leading-none">{t.catCounter}</span>
                </div>
              </div>
              <div className="rounded-[18px] border-2 border-[#1d1714] bg-[#fffdf7]/82 p-3 shadow-[3px_3px_0_rgba(29,23,20,0.16)]">
                <p className="text-[12px] font-black leading-none">{t.mappedCats}</p>
                <div className="mt-2 flex items-end gap-1">
                  <b className="text-[46px] font-black leading-[0.78] text-[#2f5fb3]">{mappedItems.length}</b>
                  <MapPin size={18} className="mb-0.5 text-[#2f5fb3]" />
                </div>
              </div>
            </div>

            <label className="mt-4 block">
              <span className="sr-only">{language === 'zh' ? '地圖名稱' : 'Map name'}</span>
              <input
                aria-label={language === 'zh' ? '地圖名稱' : 'Map name'}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onBlur={handleNameBlur}
                className="w-full rounded-full border-2 border-[#1d1714]/20 bg-[#fffdf7]/88 px-3 py-2 text-[12px] font-black tracking-[0.04em] text-[#76665a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f5fb3]"
              />
            </label>
          </div>

          {hasMappedCats ? (
            <>
              <div
                role="group"
                aria-label={language === 'zh' ? '貓咪地圖分享動作' : 'Cat map share actions'}
                className="mt-4 rounded-[22px] border-2 border-[#1d1714] bg-[#fffdf7]/92 p-3 shadow-[5px_5px_0_rgba(47,95,179,0.18)] sm:mt-5"
              >
                <button
                  type="button"
                  onClick={handleShare}
                  disabled={selectedItems.length === 0}
                  className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[16px] border-2 border-[#1d1714] bg-[#fff2cf] px-3 py-3 text-left text-sm font-black shadow-[3px_3px_0_#1d1714] transition-transform active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <Share2 size={17} className="shrink-0" />
                    <span className="min-w-0">{t.shareCatdexAction}</span>
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.08em] text-[#2f5fb3]">{t.copyShareLink}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleCopyMapLink()}
                  disabled={selectedItems.length === 0}
                  className="mt-2 flex min-h-[48px] w-full items-center justify-between gap-3 rounded-[15px] border-2 border-[#1d1714]/30 bg-[#d9ecff] px-3 py-2.5 text-left text-[#1d1714] shadow-[2px_2px_0_rgba(47,95,179,0.18)] transition-transform active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
                >
                  <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] font-black leading-tight">
                    {hasCopiedLink ? <Check size={15} className="shrink-0" /> : <Copy size={15} className="shrink-0" />}
                    <span className="min-w-0">{hasCopiedLink ? t.copyCatMapLinkDone : t.copyCatMapLink}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-black uppercase leading-tight tracking-[0.06em] text-[#2f5fb3]">
                    {t.copyCatMapLinkHint}
                  </span>
                </button>
              </div>

              <button
                type="button"
                aria-expanded={isAdvancedOpen}
                aria-controls="cat-map-advanced-tools"
                onClick={() => setIsAdvancedOpen((current) => !current)}
                className="mt-3 flex w-full items-center justify-between gap-3 rounded-[18px] border border-[#1d1714]/16 bg-[#fffdf7]/86 px-3 py-3 text-left text-sm font-black text-[#1d1714] shadow-[2px_2px_0_rgba(47,95,179,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                <span>
                  {language === 'zh' ? '調整公開貓咪與匯出' : 'Adjust shared cats & export'}
                  <span className="mt-1 block text-xs font-bold text-[#76665a]">
                    {selectedItems.length}/{mappedItems.length}
                    {language === 'zh' ? ' 隻會放進分享地圖' : ' cats included'}
                  </span>
                </span>
                <ChevronDown
                  size={20}
                  className={`shrink-0 text-[#2f5fb3] transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {isAdvancedOpen ? (
                <div
                  id="cat-map-advanced-tools"
                  data-testid="shared-cat-selection"
                  className="mt-3 rounded-[22px] border-2 border-[#1d1714] bg-[#fffdf7]/92 p-3 shadow-[5px_5px_0_rgba(47,95,179,0.18)]"
                >
                  <label className="flex items-start gap-3 rounded-[18px] border border-[#1d1714]/12 bg-[#fff7e8] p-3 text-sm font-bold text-[#1d1714]">
                    <input
                      type="checkbox"
                      checked={includeMemo}
                      onChange={(event) => setIncludeMemo(event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block">{t.includeMapMemo}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-[#76665a]">{t.includeMapMemoHint}</span>
                    </span>
                  </label>

                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
                        {language === 'zh' ? '選擇要公開的貓' : 'Choose shared cats'}
                      </p>
                      <p className="mt-1 text-xs font-bold leading-relaxed text-[#76665a]">
                        {language === 'zh' ? '預設分享所有已加入地點的貓。' : 'All mapped cats are selected by default.'}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#f7c948] px-2.5 py-1 text-[11px] font-black text-[#1d1714]">
                      {selectedItems.length}/{mappedItems.length}
                    </span>
                  </div>

                  <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {mappedItems.map((item) => {
                      const checked = effectiveSelectedIds.has(item.id);
                      const title = getShareCardTitle(item, language);
                      return (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 rounded-[16px] border border-[#1d1714]/12 bg-[#fff7e8] p-2.5"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleItem(item.id)}
                            aria-label={`${language === 'zh' ? '選取' : 'Select'} ${title}`}
                            className="h-4 w-4"
                          />
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border-2 border-[#1d1714] bg-[#d9ecff] text-[11px] font-black text-[#2f5fb3]">
                            {formatCatCardNumber(item.catdexNumber)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-[#1d1714]">{title}</p>
                            <p className="truncate text-xs font-bold text-[#76665a]">{item.location?.name}</p>
                          </div>
                          {checked ? <Check size={17} className="text-[#2f5fb3]" /> : null}
                        </label>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={selectedItems.length === 0}
                    className="mt-3 flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[15px] border-2 border-[#1d1714]/24 bg-[#fffaf0] px-3 py-2.5 text-left text-[#1d1714] shadow-[2px_2px_0_rgba(34,25,21,0.1)] transition-transform active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
                  >
                    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] font-black leading-tight">
                      <Download size={15} className="shrink-0" />
                      <span className="min-w-0">{t.exportCatMapCsv}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-black uppercase leading-tight tracking-[0.06em] text-[#76665a]">
                      {t.exportCatMapCsvHint}
                    </span>
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-4 rounded-[22px] border-2 border-[#1d1714] bg-[#fffdf7]/92 p-4 shadow-[5px_5px_0_rgba(47,95,179,0.18)]">
              <p className="text-[12px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
                {language === 'zh' ? '還沒有貓咪地圖點' : 'No cat map spots yet'}
              </p>
              <p className="mt-2 text-sm font-bold leading-relaxed text-[#76665a]">
                {language === 'zh'
                  ? '先記錄一隻貓，並幫牠加上出沒地點，這裡就會變成可以分享給朋友的貓咪地圖。'
                  : 'Capture a cat and add where you found it. This page will become a shareable FOUND CAT map.'}
              </p>
              <Link
                to="/create"
                className="mt-4 inline-flex w-full items-center justify-center rounded-[16px] border-2 border-[#1d1714] bg-[#2f5fb3] px-4 py-3 text-sm font-black text-[#fffdf7] shadow-[3px_3px_0_#1d1714] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                {language === 'zh' ? '記錄貓貓' : 'Capture a cat'}
              </Link>
            </div>
          )}
        </section>
      </main>

      <CatActionNav
        labels={{
          nav: language === 'zh' ? '主要操作' : 'Primary actions',
          shareMap: t.sharedCatMap,
          capture: language === 'zh' ? '拍貓' : 'Capture cat',
          map: t.map,
        }}
      />
    </div>
  );
}