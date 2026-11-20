import { CloudUpload, X } from 'lucide-react';
import { useState } from 'react';
import { isStandaloneApp, OPEN_BACKUP_PANEL_EVENT } from '../../lib/storagePersistence';
import { useAuthStore } from '../../store/useAuthStore';
import type { ScrapbookItem } from '../../store/useScrapbookStore';

const DISMISS_KEY = 'found-cat-backup-nudge-dismissed';
export const BACKUP_NUDGE_THRESHOLD = 3;

const readDismissed = () => {
  try {
    return window.localStorage.getItem(DISMISS_KEY) === 'true';
  } catch {
    return false;
  }
};

/**
 * Cats are stored only on this device until backed up. Once someone has a few of their
 * own, remind them once how to keep them safe.
 */
export default function BackupNudge({ items, language }: { items: ScrapbookItem[]; language: 'zh' | 'en' }) {
  const user = useAuthStore((state) => state.user);
  const isConfigured = useAuthStore((state) => state.isConfigured);
  const [isDismissed, setIsDismissed] = useState(readDismissed);
  const ownCount = items.filter((item) => !item.collectedFromPublicId).length;

  if (isDismissed || user || ownCount < BACKUP_NUDGE_THRESHOLD) return null;
  const canSignIn = isConfigured;
  if (!canSignIn && isStandaloneApp()) return null;

  const dismiss = () => {
    setIsDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // Best effort; the nudge simply shows again next visit.
    }
  };

  const message = language === 'zh'
    ? canSignIn
      ? `已經記了 ${ownCount} 隻貓！貓卡只存在這支手機裡，登入備份後換手機也不會不見。`
      : `已經記了 ${ownCount} 隻貓！把轉角遇到貓加到主畫面，貓卡比較不會被瀏覽器清掉。`
    : canSignIn
      ? `${ownCount} cats so far! They live only on this phone. Sign in to back them up.`
      : `${ownCount} cats so far! Add FOUND CAT to your home screen so the browser keeps them.`;

  return (
    <div
      role="note"
      data-testid="backup-nudge"
      className="relative mb-3 flex items-start gap-3 rounded-[18px] border-2 border-[#221915] bg-[#fffdf2] px-3 py-3 pr-10 text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.2)]"
    >
      <CloudUpload size={20} strokeWidth={2.4} aria-hidden="true" className="mt-0.5 shrink-0 text-[#2f5fb3]" />
      <div className="min-w-0">
        <p className="text-xs font-bold leading-5">{message}</p>
        {canSignIn ? (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event(OPEN_BACKUP_PANEL_EVENT))}
            className="mt-2 inline-flex min-h-9 items-center rounded-full border-2 border-[#221915] bg-[#2f5fb3] px-3 text-xs font-black text-white shadow-[2px_2px_0_rgba(34,25,21,0.2)]"
          >
            {language === 'zh' ? '登入備份' : 'Sign in to back up'}
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={language === 'zh' ? '關閉備份提醒' : 'Dismiss backup reminder'}
        className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full text-[#6d5f52]"
      >
        <X size={16} />
      </button>
    </div>
  );
}
