import { Camera, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

const DISMISS_KEY = 'found-cat-welcome-dismissed';

const readDismissed = () => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * First visit lands on other people's cats. Say in one line what the app is for and
 * point at the one action that matters: recording your own first cat.
 */
export default function WelcomeIntro({ hasOwnCats, language }: { hasOwnCats: boolean; language: 'zh' | 'en' }) {
  const [isDismissed, setIsDismissed] = useState(readDismissed);
  if (hasOwnCats || isDismissed) return null;

  const dismiss = () => {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // Best effort.
    }
  };

  return (
    <div
      role="note"
      data-testid="welcome-intro"
      className="relative mb-3 rounded-[18px] border-2 border-[#221915] bg-[#fffdf2] px-4 py-3 pr-10 text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.22)]"
    >
      <p className="font-cat-display text-base font-bold leading-snug">
        {language === 'zh' ? '在轉角遇到貓了嗎？' : 'Met a cat around the corner?'}
      </p>
      <p className="mt-1 text-xs font-bold leading-5 text-[#5c4f45]">
        {language === 'zh'
          ? '拍下牠、記下在哪裡遇到，就是你的第一張貓卡。下面是大家遇見的貓。'
          : 'Snap it and note where you met. That is your first cat card. Below are cats others have met.'}
      </p>
      <Link
        to="/create"
        className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-[#221915] bg-[#2f5fb3] px-3 text-xs font-black text-white shadow-[2px_2px_0_rgba(34,25,21,0.2)]"
      >
        <Camera size={14} strokeWidth={2.6} aria-hidden="true" />
        {language === 'zh' ? '拍下第一隻貓' : 'Snap your first cat'}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={language === 'zh' ? '關閉說明' : 'Dismiss intro'}
        className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full text-[#6d5f52]"
      >
        <X size={16} />
      </button>
    </div>
  );
}
