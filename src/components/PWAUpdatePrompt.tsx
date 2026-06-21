import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { translations } from '../translations';

const UPDATE_CHECK_INTERVAL_MS = 60 * 1000;
const STATUS_MESSAGE_DURATION_MS = 3000;
const PWA_RELOAD_STORAGE_KEY = 'found-cat-pwa-reloaded-for-update';

export default function PWAUpdatePrompt() {
  const { language } = useScrapbookStore();
  const t = translations[language];
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | undefined>();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const needRefreshRef = useRef(false);
  const shouldReloadAfterControllerChangeRef = useRef(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onNeedRefresh: () => {
      shouldReloadAfterControllerChangeRef.current = true;
    },
    onRegisteredSW: (_swUrl, swRegistration) => {
      setRegistration(swRegistration);
    },
    onRegisterError: (error) => {
      console.error('Service worker registration failed', error);
    },
  });

  useEffect(() => {
    needRefreshRef.current = needRefresh;
    if (needRefresh) {
      shouldReloadAfterControllerChangeRef.current = true;
    }
  }, [needRefresh]);

  useEffect(() => {
    const reloadOnceForFreshServiceWorker = () => {
      if (!shouldReloadAfterControllerChangeRef.current) return;

      try {
        if (window.sessionStorage.getItem(PWA_RELOAD_STORAGE_KEY) === 'true') return;
        window.sessionStorage.setItem(PWA_RELOAD_STORAGE_KEY, 'true');
      } catch {
        // If sessionStorage is unavailable, still prefer one refresh over leaving a stale app shell.
      }

      window.location.reload();
    };

    const handleControllerChange = () => reloadOnceForFreshServiceWorker();
    navigator.serviceWorker?.addEventListener('controllerchange', handleControllerChange);
    window.addEventListener('found-cat-sw-controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker?.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('found-cat-sw-controllerchange', handleControllerChange);
    };
  }, []);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = window.setTimeout(() => setStatusMessage(null), STATUS_MESSAGE_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [statusMessage]);

  const checkForUpdates = useCallback(async (manual = false) => {
    if (!registration) return;

    if (manual) {
      setIsChecking(true);
      setStatusMessage(t.checkingUpdates);
    }

    try {
      await registration.update();

      if (manual) {
        window.setTimeout(() => {
          if (!needRefreshRef.current) {
            setStatusMessage(t.latestVersion);
          }
          setIsChecking(false);
        }, 1200);
      }
    } catch (error) {
      console.error('Service worker update check failed', error);

      if (manual) {
        setStatusMessage(t.updateCheckFailed);
        setIsChecking(false);
      }
    }
  }, [registration, t.checkingUpdates, t.latestVersion, t.updateCheckFailed]);

  useEffect(() => {
    if (!registration) return;

    void checkForUpdates();

    const intervalId = window.setInterval(() => {
      void checkForUpdates();
    }, UPDATE_CHECK_INTERVAL_MS);

    const handleUpdateTrigger = () => {
      void checkForUpdates();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void checkForUpdates();
      }
    };

    window.addEventListener('focus', handleUpdateTrigger);
    window.addEventListener('online', handleUpdateTrigger);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleUpdateTrigger);
      window.removeEventListener('online', handleUpdateTrigger);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [registration, checkForUpdates]);

  const buildTimeText = useMemo(() => {
    const buildDate = new Date(__BUILD_TIME__);

    if (Number.isNaN(buildDate.getTime())) {
      return '';
    }

    return buildDate.toLocaleString(language === 'zh' ? 'zh-TW' : 'en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [language]);

  const versionText = useMemo(() => {
    return `${t.versionLabel} v${__APP_VERSION__}${buildTimeText ? ` · ${buildTimeText}` : ''}`;
  }, [buildTimeText, t.versionLabel]);
  const closeUpdateLabel = language === 'zh' ? '關閉更新提示' : 'Close update prompt';

  return (
    <>
      <AnimatePresence>
        {needRefresh ? (
          <motion.div
            data-testid="pwa-update-card"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-4 right-4 z-[220] flex items-start gap-4 rounded-[18px] border-2 border-[#221915] bg-[#fffdf2] p-4 text-[#221915] shadow-[8px_8px_0_rgba(47,95,179,0.22)] sm:left-auto sm:right-4 sm:w-80"
          >
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] bg-transparent drop-shadow-[3px_5px_0_rgba(47,95,179,0.18)]">
              <img
                src="/cat-icon-192.png"
                alt={language === 'zh' ? '轉角遇到貓 App 圖示' : 'FOUND CAT app icon'}
                className="h-14 w-14 object-contain"
                draggable={false}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#2f5fb3]">FOUND CAT</p>
              <h4 className="mb-1 text-sm font-black text-[#221915]">{versionText}</h4>
              <p className="mb-3 text-xs font-bold leading-relaxed text-[#5c5148]">
                {t.newVersionReady}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => void updateServiceWorker(true)}
                  className="flex-1 rounded-[10px] border-2 border-[#221915] bg-[#2f5fb3] py-2 text-sm font-black text-white shadow-[3px_3px_0_rgba(34,25,21,0.16)] transition-transform active:translate-x-[1px] active:translate-y-[1px]"
                >
                  {t.updateNow}
                </button>
                <button
                  onClick={() => setNeedRefresh(false)}
                  className="rounded-[10px] border-2 border-[#221915] bg-[#fff2cf] px-4 py-2 text-sm font-black shadow-[3px_3px_0_rgba(34,25,21,0.12)] transition-transform active:translate-x-[1px] active:translate-y-[1px]"
                >
                  {t.later}
                </button>
              </div>
            </div>

            <button
              onClick={() => setNeedRefresh(false)}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#221915] bg-[#fffdf2] text-[#221915] shadow-[2px_2px_0_rgba(34,25,21,0.12)] transition-transform active:translate-x-[1px] active:translate-y-[1px]"
              aria-label={closeUpdateLabel}
            >
              <X size={16} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        data-testid="version-check-chip"
        className="version-check-chip fixed right-4 top-[calc(env(safe-area-inset-top)+3.05rem)] z-[60] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2"
      >
        <button
          type="button"
          onClick={() => void checkForUpdates(true)}
          disabled={isChecking || !registration}
          aria-label={language === 'zh' ? `${versionText}，檢查更新` : `${versionText}, check for updates`}
          className="rounded-full border border-[#221915]/15 bg-[#fffdf2]/88 px-3 py-1.5 text-[10px] font-black tracking-[0.06em] text-[#5c5148] shadow-[2px_2px_0_rgba(47,95,179,0.12)] backdrop-blur disabled:opacity-55"
        >
          {versionText}
        </button>

        <AnimatePresence>
          {statusMessage && !needRefresh ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="max-w-[15rem] rounded-[12px] border border-[#221915]/12 bg-[#fffdf2] px-3 py-2 text-right text-[11px] font-bold leading-4 text-[#5c5148] shadow-[3px_3px_0_rgba(47,95,179,0.12)]"
            >
              {statusMessage}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

    </>
  );
}
