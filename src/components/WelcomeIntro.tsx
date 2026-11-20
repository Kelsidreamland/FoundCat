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
      className="mb-2 flex items-center gap-2 rounded-full border-2 border-[#221915] bg-[#fffdf2] py-1 pl-4 pr-1 text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.22)]"
    >
      <p className="min-w-0 flex-1 truncate text-xs font-black">
        {language === 'zh' ? '在轉角遇到貓了嗎？' : 'Met a cat around the corner?'}
      </p>
      <Link
        to="/create"
        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border-2 border-[#221915] bg-[#2f5fb3] px-3 text-xs font-black text-white"
      >
        <Camera size={14} strokeWidth={2.6} aria-hidden="true" />
        {language === 'zh' ? '拍下第一隻貓' : 'Snap your first cat'}
      </Link>
      <button
        type="button"
        onClick={dismiss}
        aria-label={language === 'zh' ? '關閉說明' : 'Dismiss intro'}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#6d5f52]"
      >
        <X size={16} />
      </button>
    </div>
  );
}
