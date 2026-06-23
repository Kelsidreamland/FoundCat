import { useCallback, useEffect, useState } from 'react';
import CatActionNav from '../components/catdex/CatActionNav';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import CatCardDeck from '../components/catdex/CatCardDeck';
import CloudBackupPrompt from '../components/cloud/CloudBackupPrompt';
import { loadPublicCatCards } from '../lib/cloudPublicCats';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { translations } from '../translations';

const DONATION_URL = 'https://api.payuni.com.tw/api/uop/receive_info/2/3/NPPA226028039/mgYrU0DqoPbb6vatwL86Z';

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

function isSameCollectedPublicCat(publicItem: ScrapbookItem, localItem: ScrapbookItem) {
  if (localItem.collectedFromPublicId && localItem.collectedFromPublicId === publicItem.id) return true;
  return Boolean(
    localItem.publicNumber &&
    publicItem.publicNumber &&
    localItem.publicNumber === publicItem.publicNumber
  );
}

export default function Home() {
  const { items, isLoading, language, setLanguage, addItem } = useScrapbookStore();
  const t = translations[language];
  const [publicItems, setPublicItems] = useState<ScrapbookItem[]>([]);
  const [publicDeckStatus, setPublicDeckStatus] = useState<PublicDeckStatus>('loading');

  useEffect(() => {
    let cancelled = false;

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
  }, []);

  const isPublicDeck = publicDeckStatus !== 'failed';
  const isPublicDeckLoading = publicDeckStatus === 'loading';
  const visiblePublicItems = publicItems.filter(
    (publicItem) => !items.some((localItem) => isSameCollectedPublicCat(publicItem, localItem))
  );
  const deckItems = isPublicDeck ? visiblePublicItems : items;
  const emptyDeckLabel = language === 'zh'
    ? '全世界地圖等第一批貓點\n先拍下你遇到的貓，公開後朋友就能在地圖上找到牠。'
    : 'The world map is waiting for its first cats.\nCapture a cat you found, then publish it so friends can find the spot.';

  const handleShareCard = async (item: ScrapbookItem) => {
    const { shareCatCardPoster } = await import('../lib/sharePoster');
    await shareCatCardPoster(item, language);
  };

  const handleCollectCard = useCallback(async (item: ScrapbookItem) => {
    if (!item.isPublic || items.some((localItem) => isSameCollectedPublicCat(item, localItem))) return;

    await addItem({
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
      catBreed: item.catBreed,
      catColor: item.catColor,
      personalityTags: item.personalityTags,
      spotNote: item.spotNote,
      careStatusTags: item.careStatusTags,
      isPublic: false,
    });
  }, [addItem, items]);

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
            />
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
    </div>
  );
}
