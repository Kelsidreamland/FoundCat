import { Camera } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * What a brand-new visitor sees in the middle of Home when there are no world cats to
 * browse (none yet, cloud off, or it failed to load): the one action that matters.
 */
export default function FirstCatHero({
  language,
  onRetry,
}: {
  language: 'zh' | 'en';
  /** Shown as a quiet secondary link only when the world cats genuinely failed to load. */
  onRetry?: () => void;
}) {
  return (
    <section
      data-testid="first-cat-hero"
      className="flex min-h-[min(420px,calc(100dvh-230px))] flex-col items-center justify-center rounded-[24px] border-2 border-[#1d1714] bg-[#fffdf7] px-6 py-8 text-center shadow-[7px_8px_0_#1d1714]"
    >
      <div className="grid h-20 w-20 rotate-[-4deg] place-items-center rounded-[18px] border-2 border-[#1d1714] bg-[#d9ecff] text-[#2f5fb3] shadow-[4px_4px_0_rgba(29,23,20,0.85)]">
        <Camera size={34} strokeWidth={2.2} aria-hidden="true" />
      </div>
      <h2 className="font-cat-display mt-6 text-2xl font-bold leading-snug text-[#1d1714]">
        {language === 'zh' ? '在轉角遇到貓了嗎？' : 'Met a cat around the corner?'}
      </h2>
      <p className="mt-2 max-w-[16rem] text-sm font-bold leading-6 text-[#6d5f52]">
        {language === 'zh'
          ? '拍下牠、記下在哪裡遇到，就是你的第一張貓卡。'
          : 'Snap it and note where you met. That is your first cat card.'}
      </p>
      <Link
        to="/create"
        className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-[#1d1714] bg-[#2f5fb3] px-6 text-base font-black text-white shadow-[3px_3px_0_#1d1714] transition-transform active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
      >
        <Camera size={18} strokeWidth={2.6} aria-hidden="true" />
        {language === 'zh' ? '拍下我的第一隻貓' : 'Snap my first cat'}
      </Link>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 min-h-9 text-xs font-bold text-[#7a6a5b] underline underline-offset-4"
        >
          {language === 'zh' ? '重新載入大家遇見的貓' : 'Reload cats others have met'}
        </button>
      ) : null}
    </section>
  );
}
