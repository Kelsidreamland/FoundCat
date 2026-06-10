import CatActionNav from '../components/catdex/CatActionNav';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import CatCardDeck from '../components/catdex/CatCardDeck';
import CloudBackupPrompt from '../components/cloud/CloudBackupPrompt';
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

export default function Home() {
  const { items, isLoading, language, setLanguage } = useScrapbookStore();
  const t = translations[language];

  const handleShareCard = async (item: ScrapbookItem) => {
    const { shareCatCardPoster } = await import('../lib/sharePoster');
    await shareCatCardPoster(item, language);
  };

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
      />

      <main className="relative z-10 mb-[calc(4.75rem+env(safe-area-inset-bottom))] min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-[clamp(2rem,9vh,5rem)]">
        <section className="relative mx-auto max-w-sm">
          <CatCardDeck
            items={items}
            language={language}
            labels={{
              empty: language === 'zh' ? '還沒有貓卡' : 'No cat cards yet',
              previous: language === 'zh' ? '上一張' : 'Previous card',
              next: language === 'zh' ? '下一張' : 'Next card',
              shareCard: t.singleCardShare,
            }}
            onShareCard={handleShareCard}
          />
          <CloudBackupPrompt language={language} items={items} />
        </section>
      </main>

      <CatActionNav
        labels={{
          nav: language === 'zh' ? '主要操作' : 'Primary actions',
          shareMap: t.shareCatdex,
          capture: language === 'zh' ? '拍貓' : 'Capture cat',
          map: t.map,
        }}
      />
    </div>
  );
}
