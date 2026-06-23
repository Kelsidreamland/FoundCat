import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Camera, MapPin, Navigation } from 'lucide-react';
import { decodeMapSharePayload, type MapShareCat } from '../lib/mapShare';
import { buildGoogleMapsSearchUrl, getShareTagLabels } from '../lib/singleCatShare';

const formatShareDate = (date: string, language: 'zh' | 'en') => {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

const getCatTitle = (cat: MapShareCat, language: 'zh' | 'en') => {
  return cat.catName?.trim() || cat.locationName || (language === 'zh' ? '未命名貓咪' : 'Unnamed cat');
};

const getMarkerStyle = (cat: MapShareCat, cats: MapShareCat[]) => {
  if (cats.length <= 1) return { left: '50%', top: '50%' };

  const lats = cats.map((item) => item.lat);
  const lngs = cats.map((item) => item.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;
  const x = 18 + ((cat.lng - minLng) / lngRange) * 64;
  const y = 18 + (1 - ((cat.lat - minLat) / latRange)) * 56;

  return { left: `${x}%`, top: `${y}%` };
};

export default function SharedCatMap() {
  const [searchParams] = useSearchParams();
  const payload = decodeMapSharePayload(searchParams.get('data'));
  const [languageOverride, setLanguageOverride] = useState<'zh' | 'en' | null>(null);
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const language = languageOverride ?? payload?.language ?? 'zh';
  const isZh = language === 'zh';

  if (!payload) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#fff7e8] p-6 text-center">
        <div className="max-w-sm rounded-[22px] border-2 border-[#221915] bg-[#fffdf2] p-6 shadow-[8px_8px_0_rgba(47,95,179,0.22)]">
          <p className="text-xl font-black text-[#221915]">這份貓咪地圖暫時打不開</p>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-[#76665a]">
            你還是可以從這裡開始記錄今天遇到的貓貓。
          </p>
          <Link
            to="/create"
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-[16px] border-2 border-[#221915] bg-[#2f5fb3] px-5 py-3 text-sm font-black text-[#fffdf2] shadow-[4px_4px_0_rgba(34,25,21,0.18)]"
          >
            <Camera size={17} />
            <span>我也遇到貓貓了！</span>
          </Link>
        </div>
      </div>
    );
  }

  const activeCat = payload.cats.find((cat) => cat.id === activeCatId) ?? payload.cats[0];
  const tags = activeCat ? getShareTagLabels(activeCat, language) : [];
  const mapsUrl = activeCat ? buildGoogleMapsSearchUrl({
    lat: activeCat.lat,
    lng: activeCat.lng,
    name: activeCat.locationName,
    address: activeCat.locationAddress,
    mapUrl: activeCat.locationMapUrl,
  }) : '';

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#f7f2e8] px-5 py-6">
      <main className="mx-auto flex min-h-full max-w-md flex-col pb-6">
        <section className="rounded-[28px] border-2 border-[#221915] bg-[#fffdf2] p-4 shadow-[8px_8px_0_rgba(47,95,179,0.24)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[18px] font-black leading-none text-[#221915]">轉角遇到貓</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#2f5fb3]">FOUND CAT</p>
            </div>
            <button
              type="button"
              onClick={() => setLanguageOverride(isZh ? 'en' : 'zh')}
              className="rounded-full border-2 border-[#221915] bg-[#fff7e8] px-3 py-1.5 text-xs font-black text-[#221915] shadow-[2px_2px_0_rgba(47,95,179,0.16)]"
              title={isZh ? 'Switch to English' : '切換為中文'}
            >
              {isZh ? 'EN' : '中'}
            </button>
          </div>

          <div className="mt-5">
            <h1 className="text-[30px] font-black leading-none text-[#221915]">{payload.title}</h1>
            <p className="mt-3 text-sm font-black text-[#2f5fb3]">
              {isZh ? `${payload.cats.length} 個貓咪出沒點` : `${payload.cats.length} cat spots`}
            </p>
          </div>

          <div className="relative mt-5 h-72 overflow-hidden rounded-[24px] border-2 border-[#221915] bg-[linear-gradient(135deg,#d9ecff_0_36%,#fffdf7_37%_62%,#ffe6ad_63%_100%)]">
            <div className="absolute left-[-12%] top-[58%] h-5 w-[128%] rotate-[-18deg] rounded-full bg-[#2f5fb3]/25" />
            <div className="absolute left-[-10%] top-[34%] h-4 w-[120%] rotate-[18deg] rounded-full bg-[#221915]/10" />
            <div className="absolute left-[18%] top-[-8%] h-[116%] w-4 rotate-[6deg] rounded-full bg-white/48" />
            {payload.cats.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCatId(cat.id)}
                style={getMarkerStyle(cat, payload.cats)}
                className={`absolute grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[18px] border-2 border-[#221915] text-[11px] font-black shadow-[4px_4px_0_rgba(34,25,21,0.18)] transition-transform active:scale-95 ${
                  activeCat?.id === cat.id ? 'bg-[#f7c948] text-[#221915]' : 'bg-[#fffdf2] text-[#2f5fb3]'
                }`}
                aria-label={`${cat.numberLabel} ${getCatTitle(cat, language)}`}
              >
                {cat.numberLabel.replace('No.', '#')}
              </button>
            ))}
          </div>
        </section>

        {activeCat ? (
          <section className="mt-5 rounded-[24px] border-2 border-[#221915] bg-[#fffdf2] p-4 shadow-[6px_6px_0_rgba(47,95,179,0.20)]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#2f5fb3]">{activeCat.numberLabel}</p>
            <h2 className="mt-1 text-2xl font-black leading-tight text-[#221915]">{getCatTitle(activeCat, language)}</h2>
            <div className="mt-3 flex items-start gap-3 rounded-[18px] border border-[#221915]/12 bg-white/80 p-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-[#2f5fb3]" />
              <div className="min-w-0">
                <p className="text-sm font-black text-[#221915]">{activeCat.locationName}</p>
                {activeCat.locationAddress ? (
                  <p className="mt-1 text-xs font-bold leading-relaxed text-[#76665a]">{activeCat.locationAddress}</p>
                ) : null}
                <p className="mt-1 text-xs font-bold text-[#76665a]">{formatShareDate(activeCat.date, language)}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full border border-[#221915]/15 bg-[#fff7e8] px-3 py-1.5 text-xs font-black text-[#221915]">
                  {tag}
                </span>
              ))}
            </div>

            {payload.includeMemo && activeCat.memo ? (
              <div className="mt-4 rounded-[18px] border border-[#221915]/12 bg-white/80 p-3">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">Memo</p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-[#221915]">{activeCat.memo}</p>
              </div>
            ) : null}

            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border-2 border-[#221915] bg-[#221915] px-5 py-4 text-base font-black text-[#fffdf2] shadow-[5px_5px_0_rgba(47,95,179,0.22)]"
            >
              <Navigation size={19} />
              <span>{isZh ? '用 Google Maps 打開' : 'Open in Google Maps'}</span>
            </a>
          </section>
        ) : null}

        <Link
          to="/create"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border-2 border-[#221915] bg-[#f7c948] px-5 py-4 text-base font-black text-[#221915] shadow-[5px_5px_0_rgba(34,25,21,0.16)]"
        >
          <Camera size={19} />
          <span>{isZh ? '我也遇到貓貓了！' : 'I found a cat too!'}</span>
        </Link>
      </main>
    </div>
  );
}
