import { useCallback } from 'react';
import { DISPLAY_LANGUAGE_TOGGLE, getDisplayLanguage, NEXT_DISPLAY_LANGUAGE } from '../lib/chineseScript';
import { useScrapbookStore } from '../store/useScrapbookStore';

/** One button cycling 繁 → EN → 简. Leaving 简 reloads so converted text returns to Traditional. */
export function useLanguageToggle() {
  const language = useScrapbookStore((state) => state.language);
  const script = useScrapbookStore((state) => state.chineseScript);
  const setLanguage = useScrapbookStore((state) => state.setLanguage);
  const setChineseScript = useScrapbookStore((state) => state.setChineseScript);
  const current = getDisplayLanguage(language, script);
  const next = NEXT_DISPLAY_LANGUAGE[current];

  const toggle = useCallback(async () => {
    if (next === 'en') {
      await setLanguage('en');
    } else {
      await setChineseScript(next === 'zh-hans' ? 'hans' : 'hant');
      await setLanguage('zh');
    }
    if (current === 'zh-hans') window.location.reload();
  }, [current, next, setChineseScript, setLanguage]);

  return { toggle, ...DISPLAY_LANGUAGE_TOGGLE[next] };
}
