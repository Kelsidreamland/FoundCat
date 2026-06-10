import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrapbookStore } from '../store/useScrapbookStore';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export default function PWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const { language } = useScrapbookStore();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Check if we should show the prompt (e.g., hasn't been dismissed recently)
      const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');
      if (!hasDismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  const texts = {
    zh: {
      title: '安裝轉角遇到貓',
      desc: '把轉角遇到貓加入主畫面，下次遇見貓可以更快打開。',
      install: '加入主畫面',
      close: '關閉安裝提示',
      iconAlt: '轉角遇到貓 App 圖示',
    },
    en: {
      title: 'Install FOUND CAT',
      desc: 'Keep your FOUND CAT collection on the home screen for faster captures.',
      install: 'Add to Home Screen',
      close: 'Close install prompt',
      iconAlt: 'FOUND CAT app icon',
    }
  };

  const t = texts[language === 'zh' ? 'zh' : 'en'];

  return (
    <AnimatePresence>
      {showPrompt && deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="absolute bottom-24 left-4 right-4 z-[200] flex items-start gap-4 rounded-[18px] border-2 border-[#221915] bg-[#FFFDF2] p-4 shadow-[8px_8px_0_rgba(47,95,179,0.22)]"
        >
          <div
            data-testid="pwa-install-icon-frame"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[14px] bg-transparent drop-shadow-[3px_5px_0_rgba(47,95,179,0.18)]"
          >
            <img
              src="/cat-icon-192.png"
              alt={t.iconAlt}
              className="h-14 w-14 object-contain"
              draggable={false}
            />
          </div>
          <div className="min-w-0 flex-1 pr-3">
            <h4 className="mb-1 text-[15px] font-black leading-tight text-[#221915]">{t.title}</h4>
            <p className="mb-3 text-xs font-medium leading-relaxed text-[#5C5148]">
              {t.desc}
            </p>
            <button
              onClick={handleInstall}
              className="w-full rounded-[6px] border-2 border-[#221915] bg-[#2F5FB3] py-2 text-sm font-black text-white shadow-[3px_3px_0_rgba(34,25,21,0.16)] transition-transform active:translate-x-[1px] active:translate-y-[1px]"
            >
              {t.install}
            </button>
          </div>
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#221915] bg-[#FFFDF2] text-[#221915] shadow-[2px_2px_0_rgba(34,25,21,0.12)] transition-transform active:translate-x-[1px] active:translate-y-[1px]"
            aria-label={t.close}
          >
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
