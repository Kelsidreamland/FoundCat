import { useEffect } from 'react';
import { loadSimplifiedConverter, watchAndConvert } from '../lib/chineseScript';
import { useScrapbookStore } from '../store/useScrapbookStore';

/** Shows the app in Simplified Chinese by converting the rendered Traditional copy. */
export default function ChineseScriptConverter() {
  const language = useScrapbookStore((state) => state.language);
  const script = useScrapbookStore((state) => state.chineseScript);
  const isSimplified = language === 'zh' && script === 'hans';

  useEffect(() => {
    document.documentElement.lang = language === 'en' ? 'en' : isSimplified ? 'zh-Hans' : 'zh-Hant';
  }, [isSimplified, language]);

  useEffect(() => {
    if (!isSimplified) return;
    let stop: (() => void) | undefined;
    let cancelled = false;
    loadSimplifiedConverter()
      .then((convert) => {
        if (!cancelled) stop = watchAndConvert(document.body, convert);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [isSimplified]);

  return null;
}
