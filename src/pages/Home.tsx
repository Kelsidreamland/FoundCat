import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CatActionNav from '../components/catdex/CatActionNav';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import CatCardDeck from '../components/catdex/CatCardDeck';
import CollectedCatProfileSheet from '../components/catdex/CollectedCatProfileSheet';
import WorldCatProfileSheet from '../components/catdex/WorldCatProfileSheet';
import CloudBackupPrompt from '../components/cloud/CloudBackupPrompt';
import { loadPublicCatCards } from '../lib/cloudPublicCats';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { translations } from '../translations';

const DONATION_URL = 'https://api.payuni.com.tw/api/uop/receive_info/2/3/NPPA226028039/mgYrU0DqoPbb6vatwL86Z';
const FIRST_WORLD_SAVE_GUIDANCE_KEY = 'found-cat-first-world-save-guidance-seen';
const WORLD_SAVE_CONTRIBUTION_PROMPT_KEY = 'found-cat-world-save-contribution-prompt-seen';

const paperTexture = {
  backgroundImage: [
    'linear-gradient(105deg, rgba(47,95,179,0.055) 0 1px, transparent 1px 100%)',
    'linear-gradient(0deg, rgba(17,17,17,0.04) 0 1px, transparent 1px 100%)',
    'repeating-linear-gradient(96deg, rgba(0,0,0,0.022) 0 1px, transparent 1px 11px)',
    'linear-gradient(135deg, rgba(255,255,255,0.58), transparent 38%)',
  ].join(', '),
  backgroundSize: '28px 28px, 100% 18px, 100% 100%, 100% 100%',
};

function LoadingStamp({ text }: { text: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#f7eedc]" style={paperTexture}>
      <div className="relative h-44 w-36 rotate-[-3deg] border-2 border-black bg-[#fffdf2] shadow-[7px_7px_0_rgba(0,0,0,0.82)]">
        <div className="absolute left-4 top-4 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#2f5fb3] text-3xl font-black text-[#2f5fb3]">
          〒
        </div>
        <div className="absolute inset-x-5 bottom-8 border-y-2 border-black py-3 text-center text-xs font-black uppercase tracking-[0.22em] text-black">
          {text}
        </div>
      </div>
    </div>
  );
}

function HomeDeckLoading({ language }: { language: 'zh' | 'en' }) {
  return (
    <div className="flex h-[min(390px,calc(100dvh-240px))] min-h-[320px] items-center justify-center rounded-[24px] border-2 border-[#1d1714] bg-[#fffdf7] p-6 text-center shadow-[7px_8px_0_#1d1714]">
      <div className="relative max-w-[15rem]">
        <div className="mx-auto mb-4 grid h-14 w-14 rotate-[-4deg] place-items-center rounded-[18px] border-2 border-[#1d1714] bg-[#f7c948] text-2xl shadow-[4px_4px_0_rgba(47,95,179,0.28)]">
          〒
        </div>
        <p className="text-lg font-black leading-7 text-[#1d1714]">
          {language === 'zh' ? '正在載入大家遇見的貓' : 'Loading cats people found'}
        </p>
      </div>
    </div>
  );
}

type PublicDeckStatus = 'loading' | 'ready' | 'failed';

function isCollectedWorldCopy(publicItem: ScrapbookItem, localItem: ScrapbookItem) {
  if (localItem.collectedFromPublicId && localItem.collectedFromPublicId === publicItem.id) return true;
  return Boolean(
    localItem.collectedFromPublicId &&
    localItem.publicNumber &&
    publicItem.publicNumber &&
    localItem.publicNumber === publicItem.publicNumber
  );
}

function alreadyHasPublicCat(publicItem: ScrapbookItem, localItem: ScrapbookItem) {
  if (isCollectedWorldCopy(publicItem, localItem)) return true;
  if (localItem.id === publicItem.id) return true;
  return Boolean(
    localItem.isPublic &&
    localItem.publicNumber &&
    publicItem.publicNumber &&
    localItem.publicNumber === publicItem.publicNumber
  );
}

function hasLocalStorageFlag(key: string) {
  try {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(key) === 'true';
  } catch {
    return true;
  }
}

function rememberLocalStorageFlag(key: string) {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, 'true');
  } catch {
    // Storage availability should not block saving a cat.
  }
}

function getWorldCatMapPath(item: ScrapbookItem) {
  return `/map?mode=public&cat=${encodeURIComponent(item.collectedFromPublicId ?? item.id)}`;
}

function countSavedWorldCats(items: ScrapbookItem[]) {
  return items.filter((item) => Boolean(item.collectedFromPublicId)).length;
}

type SavePrompt =
  | { kind: 'first-world-save'; item: ScrapbookItem }
  | { kind: 'contribution' };

export default function Home() {
  const navigate = useNavigate();
  const { items, isLoading, language, setLanguage, addItem } = useScrapbookStore();
  const t = translations[language];
  const [publicItems, setPublicItems] = useState<ScrapbookItem[]>([]);
  const [publicDeckStatus, setPublicDeckStatus] = useState<PublicDeckStatus>('loading');
  const [publicReloadKey, setPublicReloadKey] = useState(0);
  const [collectedProfileItem, setCollectedProfileItem] = useState<ScrapbookItem | null>(null);
  const [profileSheetItem, setProfileSheetItem] = useState<ScrapbookItem | null>(null);
  const [savePrompt, setSavePrompt] = useState<SavePrompt | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPublicDeckStatus('loading');

    void loadPublicCatCards().then((result) => {
      if (cancelled) return;

      if (result.ok) {
        setPublicItems(result.items);
        setPublicDeckStatus('ready');
        return;
      }

      setPublicItems([]);
      setPublicDeckStatus('failed');
    });

    return () => {
      cancelled = true;
    };
  }, [publicReloadKey]);

  const isPublicDeck = true;
  const isPublicDeckLoading = publicDeckStatus === 'loading';
  const visiblePublicItems = publicItems.filter(
    (publicItem) => !items.some((localItem) => isCollectedWorldCopy(publicItem, localItem))
  );
  const deckItems = isPublicDeck ? visiblePublicItems : items;
  const hasCollectedAllVisibleWorldCats = publicDeckStatus === 'ready' &&
    publicItems.length > 0 &&
    visiblePublicItems.length === 0;
  const emptyDeckLabel = publicDeckStatus === 'failed'
    ? (language === 'zh'
        ? '全世界貓卡暫時載入失敗\n可以再試一次；你的本機貓卡仍在「我的貓卡」。'
        : 'World cat cards could not load.\nTry again; your local cards are still in My Cat Cards.')
    : hasCollectedAllVisibleWorldCats
      ? (language === 'zh'
          ? '目前的世界貓卡都收藏完了\n晚點再回來，或拍下你遇到的貓，讓世界多一個貓點。'
          : 'You collected all current world cats.\nCheck back later, or add a cat you found to grow the world map.')
    : (language === 'zh'
        ? '全世界地圖等第一批貓點\n先拍下你遇到的貓，公開後朋友就能在地圖上找到牠。'
        : 'The world map is waiting for its first cats.\nCapture a cat you found, then publish it so friends can find the spot.');

  const handleRetryPublicDeck = useCallback(() => {
    setPublicReloadKey((current) => current + 1);
  }, []);

  const handleShareCard = async (item: ScrapbookItem) => {
    const { shareCatCardPoster } = await import('../lib/sharePoster');
    await shareCatCardPoster(item, language);
  };

  const collectPublicCat = useCallback(async (
    item: ScrapbookItem,
    options: { showCollectedProfile: boolean; showSavePrompt: boolean }
  ) => {
    if (!item.isPublic || items.some((localItem) => alreadyHasPublicCat(item, localItem))) return;

    const savedItem = await addItem({
      type: item.type,
      imageData: item.imageData,
      heroImageData: item.heroImageData,
      date: item.date,
      x: item.x,
      y: item.y,
      rotation: item.rotation,
      scale: item.scale,
      location: item.location,
      publicNumber: item.publicNumber,
      collectedFromPublicId: item.id,
      collectedAt: new Date().toISOString(),
      catName: item.catName,
      catFeatureNote: item.catFeatureNote,
      catBreed: item.catBreed,
      catColor: item.catColor,
      personalityTags: item.personalityTags,
      spotNote: item.spotNote,
      careStatusTags: item.careStatusTags,
      isPublic: false,
    });
    if (options.showCollectedProfile) {
      setCollectedProfileItem(savedItem);
    }

    if (!options.showSavePrompt) return;

    const savedWorldCatCount = countSavedWorldCats([...items, savedItem]);
    if (savedWorldCatCount >= 3 && !hasLocalStorageFlag(WORLD_SAVE_CONTRIBUTION_PROMPT_KEY)) {
      rememberLocalStorageFlag(WORLD_SAVE_CONTRIBUTION_PROMPT_KEY);
      setSavePrompt({ kind: 'contribution' });
      return;
    }

    if (!hasLocalStorageFlag(FIRST_WORLD_SAVE_GUIDANCE_KEY)) {
      rememberLocalStorageFlag(FIRST_WORLD_SAVE_GUIDANCE_KEY);
      setSavePrompt({ kind: 'first-world-save', item: savedItem });
    }
  }, [addItem, items]);

  const handleCollectCard = useCallback(async (item: ScrapbookItem) => {
    await collectPublicCat(item, { showCollectedProfile: false, showSavePrompt: true });
  }, [collectPublicCat]);

  const isProfileSheetItemSaved = profileSheetItem
    ? items.some((localItem) => alreadyHasPublicCat(profileSheetItem, localItem))
    : false;

  const handleProfileSave = useCallback(async (item: ScrapbookItem) => {
    await collectPublicCat(item, { showCollectedProfile: false, showSavePrompt: false });
  }, [collectPublicCat]);

  const handleOpenProfileCard = useCallback((item: ScrapbookItem) => {
    setSavePrompt(null);
    setProfileSheetItem(item);
  }, []);

  const goFindWorldCat = useCallback((item: ScrapbookItem) => {
    navigate(getWorldCatMapPath(item));
  }, [navigate]);

  if (isLoading) {
    return <LoadingStamp text={t.loading} />;
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#fff7e8] text-[#1d1714]" style={paperTexture}>
      <div className="pointer-events-none absolute -left-8 top-28 h-20 w-40 rotate-[-18deg] border-y-2 border-[#2f5fb3]/18" />
      <div className="pointer-events-none absolute right-[-2.5rem] top-44 h-24 w-44 rotate-[14deg] border-y-2 border-[#1d1714]/10" />

      <CatBrandHeader
        title={t.appName}
        subtitle={t.appSubtitle}
        language={language}
        onToggleLanguage={() => void setLanguage(language === 'zh' ? 'en' : 'zh')}
        toggleLabel={language === 'zh' ? t.switchToEnglish : t.switchToChinese}
        donationUrl={DONATION_URL}
        donationLabel={t.donate}
        accessory={<CloudBackupPrompt language={language} items={items} autoOpenOnSignedInEmptyDevice variant="compact" />}
      />

      <main className="relative z-10 mb-[calc(4.25rem+env(safe-area-inset-bottom))] min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-[clamp(0.75rem,4vh,2.25rem)]">
        <section className="relative mx-auto max-w-sm">
          {isPublicDeckLoading ? (
            <HomeDeckLoading language={language} />
          ) : (
            <div className="space-y-3">
              <CatCardDeck
                items={deckItems}
                language={language}
                labels={{
                  empty: emptyDeckLabel,
                  previous: language === 'zh' ? '上一張' : 'Previous card',
                  next: language === 'zh' ? '下一張' : 'Next card',
                  shareCard: t.singleCardShare,
                  collectFeedback: language === 'zh' ? '已收藏到我的貓卡' : 'Saved to My Cat Cards',
                }}
                onShareCard={handleShareCard}
                onCollectCard={handleCollectCard}
                onOpenCard={handleOpenProfileCard}
              />
              {publicDeckStatus === 'failed' ? (
                <button
                  type="button"
                  onClick={handleRetryPublicDeck}
                  className="mx-auto flex min-h-10 items-center justify-center rounded-[16px] border-2 border-[#1d1714] bg-[#f7c948] px-4 py-2 text-xs font-black text-[#1d1714] shadow-[3px_3px_0_rgba(29,23,20,0.82)] transition-transform active:translate-x-[1px] active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
                >
                  {language === 'zh' ? '重新載入世界貓卡' : 'Reload world cat cards'}
                </button>
              ) : null}
            </div>
          )}
        </section>
      </main>

      <CatActionNav
        labels={{
          nav: language === 'zh' ? '主要操作' : 'Primary actions',
          myCatCards: t.myCatCards,
          capture: language === 'zh' ? '拍貓' : 'Capture cat',
          map: t.map,
        }}
      />

      {savePrompt ? (
        <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[290] mx-auto max-w-sm rounded-[20px] border-2 border-[#1d1714] bg-[#fffdf2] p-4 text-[#1d1714] shadow-[6px_7px_0_rgba(29,23,20,0.82)]">
          {savePrompt.kind === 'first-world-save' ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-black leading-5">已收藏到我的貓卡</p>
              <Link
                to={getWorldCatMapPath(savePrompt.item)}
                className="shrink-0 rounded-[16px] border-2 border-[#1d1714] bg-[#2f5fb3] px-4 py-2 text-sm font-black text-white shadow-[3px_3px_0_rgba(29,23,20,0.82)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                去找這隻喵
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-black leading-6">你已收藏 3 隻世界貓，要不要也分享一隻你遇到的貓？</p>
              <Link
                to="/create"
                className="inline-flex rounded-[16px] border-2 border-[#1d1714] bg-[#f7c948] px-4 py-2 text-sm font-black text-[#1d1714] shadow-[3px_3px_0_rgba(29,23,20,0.82)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                我也遇到貓貓了！
              </Link>
            </div>
          )}
        </div>
      ) : null}

      <CollectedCatProfileSheet
        item={collectedProfileItem}
        language={language}
        onClose={() => setCollectedProfileItem(null)}
      />

      <WorldCatProfileSheet
        item={profileSheetItem}
        language={language}
        isSaved={isProfileSheetItemSaved}
        onClose={() => setProfileSheetItem(null)}
        onSave={handleProfileSave}
        onFind={goFindWorldCat}
      />
    </div>
  );
}
