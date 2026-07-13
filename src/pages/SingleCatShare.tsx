import { Link, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { CalendarDays, Camera, MapPin, Navigation } from 'lucide-react';
import {
  buildGoogleMapsSearchUrl,
  decodeSingleCatSharePayload,
  getShareTagLabels,
} from '../lib/singleCatShare';

const formatShareDate = (date: string, language: 'zh' | 'en') => {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-TW' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(date));
};

export default function SingleCatShare() {
  const [searchParams] = useSearchParams();
  const payload = decodeSingleCatSharePayload(searchParams.get('data'));
  const [languageOverride, setLanguageOverride] = useState<'zh' | 'en' | null>(null);
  const language = languageOverride ?? payload?.language ?? 'zh';

  if (!payload) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#fff7e8] p-6 text-center">
        <div className="max-w-sm rounded-[22px] border-2 border-[#221915] bg-[#fffdf2] p-6 shadow-[8px_8px_0_rgba(47,95,179,0.22)]">
          <p className="text-xl font-black text-[#221915]">這張貓咪分享暫時打不開</p>
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

  const tags = getShareTagLabels(payload, language);
  const mapsUrl = buildGoogleMapsSearchUrl({
    lat: payload.lat,
    lng: payload.lng,
    name: payload.locationName,
    address: payload.locationAddress,
    mapUrl: payload.locationMapUrl,
  });
  const isZh = language === 'zh';
  const title = payload.catName?.trim() || (isZh ? '今天遇見的貓' : 'A cat found nearby');
  const dateLabel = formatShareDate(payload.date, language);
  const addressLabel = payload.locationAddress || `${payload.lat.toFixed(5)}, ${payload.lng.toFixed(5)}`;

  return (
    <div className="absolute inset-0 overflow-y-auto bg-[#f7f2e8] px-5 py-6">
      <main className="mx-auto flex min-h-full max-w-md flex-col items-center pb-6">
        <section className="w-full rounded-[28px] border-2 border-[#221915] bg-[#fffdf2] p-4 shadow-[8px_8px_0_rgba(47,95,179,0.24)]">
          <div className="relative overflow-hidden rounded-[20px] border-2 border-[#221915] bg-[#f7c948] p-5">
            <div className="pointer-events-none absolute -right-10 top-6 h-24 w-44 rotate-[18deg] border-y-2 border-[#2f5fb3]/35" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[18px] font-black leading-none text-[#221915]">
                  {isZh ? '轉角遇到貓' : 'FOUND CAT'}
                </p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.24em] text-[#2f5fb3]">
                  {isZh ? 'FOUND CAT' : 'CAT CARD'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLanguageOverride(isZh ? 'en' : 'zh')}
                title={isZh ? 'Switch to English' : '切換為中文'}
                className="rounded-full border-2 border-[#221915] bg-[#fffdf2] px-3 py-1.5 text-xs font-black text-[#221915] shadow-[2px_2px_0_rgba(47,95,179,0.16)]"
              >
                {isZh ? 'EN' : '中'}
              </button>
            </div>
            <div className="relative mt-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-cat-display text-[30px] font-bold leading-none text-[#221915]">{title}</h1>
                <p className="font-cat-number mt-3 text-[13px] font-bold uppercase text-[#2f5fb3]">{payload.numberLabel}</p>
              </div>
              <div className="grid h-16 w-16 shrink-0 rotate-[-4deg] place-items-center rounded-[18px] border-2 border-[#221915] bg-[#fffdf2] text-3xl shadow-[4px_4px_0_rgba(34,25,21,0.18)]">
                <span aria-hidden="true">貓</span>
              </div>
            </div>

            <div className="relative mt-6 space-y-3 rounded-[18px] border-2 border-[#221915] bg-[#fffdf2] p-4">
              <div className="flex gap-3">
                <MapPin size={18} className="mt-0.5 shrink-0 text-[#2f5fb3]" />
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
                    {isZh ? '出沒地點' : 'Found near'}
                  </p>
                  <p className="mt-1 text-lg font-black leading-tight text-[#221915]">{payload.locationName}</p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-[#76665a]">{addressLabel}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CalendarDays size={18} className="mt-0.5 shrink-0 text-[#2f5fb3]" />
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
                    {isZh ? '遇見日期' : 'Found on'}
                  </p>
                  <p className="mt-1 text-sm font-black text-[#221915]">{dateLabel}</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-[#221915]/15 bg-[#fffdf2] px-3 py-1.5 text-xs font-black text-[#221915]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {payload.includeMemo && payload.memo ? (
            <div className="mt-4 rounded-[18px] border border-[#221915]/12 bg-white/80 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">{isZh ? '備註' : 'Memo'}</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#221915]">{payload.memo}</p>
            </div>
          ) : (
            <div className="mt-4 rounded-[18px] border border-[#221915]/12 bg-white/70 p-4">
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">{isZh ? '備註' : 'Memo'}</p>
              <p className="mt-2 text-sm font-semibold leading-relaxed text-[#76665a]">
                {isZh ? '分享者沒有公開出沒備註。' : 'The finder did not share a memo.'}
              </p>
            </div>
          )}
        </section>

        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[18px] border-2 border-[#221915] bg-[#221915] px-5 py-4 text-base font-black text-[#fffdf2] shadow-[5px_5px_0_rgba(47,95,179,0.22)]"
        >
          <Navigation size={19} />
          <span>{isZh ? '用 Google Maps 打開' : 'Open in Google Maps'}</span>
        </a>
        <p className="mt-2 text-center text-xs font-bold leading-relaxed text-[#76665a]">
          {isZh ? '請溫柔靠近，不打擾貓貓生活。' : 'Approach gently and respect the cat’s space.'}
        </p>

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
