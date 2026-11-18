import { RefreshCw } from 'lucide-react';

/** Fired by the version footer; PWAUpdatePrompt listens and runs a manual update check. */
export const CHECK_FOR_UPDATES_EVENT = 'found-cat-check-for-updates';

/**
 * Quiet in-flow version line with a manual update check. It sits at the end of a
 * scrolling page instead of floating over content.
 */
export default function VersionFooter({ language }: { language: 'zh' | 'en' }) {
  const label = language === 'zh' ? '檢查更新' : 'Check for updates';

  return (
    <div className="mx-auto mt-8 flex max-w-sm justify-center pb-2">
      <button
        type="button"
        data-testid="version-footer"
        onClick={() => window.dispatchEvent(new Event(CHECK_FOR_UPDATES_EVENT))}
        aria-label={`v${__APP_VERSION__}，${label}`}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-bold text-[#7a6a5b] transition-colors hover:text-[#221915]"
      >
        <span className="font-cat-number">v{__APP_VERSION__}</span>
        <span aria-hidden="true">·</span>
        <RefreshCw size={11} strokeWidth={2.6} aria-hidden="true" />
        <span>{label}</span>
      </button>
    </div>
  );
}
