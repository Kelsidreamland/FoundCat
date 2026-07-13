import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ScrapbookItem } from '../../store/useScrapbookStore';
import CatProfileSummary, { getCatProfileCopy } from './CatProfileSummary';

interface CollectedCatProfileSheetProps {
  item: ScrapbookItem | null;
  language: 'zh' | 'en';
  onClose: () => void;
}

export default function CollectedCatProfileSheet({
  item,
  language,
  onClose,
}: CollectedCatProfileSheetProps) {
  const copy = getCatProfileCopy(language);
  const title = item?.catName?.trim() || copy.defaultName;
  const image = item?.heroImageData || item?.imageData;
  const dialogLabel = `${title} ${copy.title}`;

  return (
    <AnimatePresence>
      {item ? (
        <div
          role="presentation"
          className="fixed inset-0 z-[280] flex items-end justify-center bg-[#221915]/38 px-3 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-6 backdrop-blur-[2px] sm:items-center"
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={dialogLabel}
            className="relative max-h-[min(86dvh,680px)] w-full max-w-sm overflow-y-auto rounded-[28px] border-2 border-[#221915] bg-[#fffdf2] p-4 text-[#1d1714] shadow-[8px_9px_0_rgba(29,23,20,0.84)]"
            initial={{ opacity: 0, y: 26, rotate: -0.8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, rotate: -0.35, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
                  {copy.title}
                </p>
                <h2 className="font-cat-display mt-1 truncate text-2xl font-bold leading-none text-[#1d1714]">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={copy.close}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#221915] bg-[#fffaf0] text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-[92px_1fr] items-end gap-3">
              <div className="relative aspect-square overflow-hidden rounded-[20px] border-2 border-[#221915] bg-[#f7c948] shadow-[4px_4px_0_rgba(47,95,179,0.20)]">
                {image ? (
                  <img
                    src={image}
                    alt={language === 'zh' ? '收藏的貓咪照片' : 'Saved cat photo'}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center text-3xl font-black">?</div>
                )}
              </div>
              <div className="rounded-[20px] border border-[#221915]/14 bg-[#fff8e7] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
                  {language === 'zh' ? '剛加入我的貓卡' : 'Added to My Cat Cards'}
                </p>
                <p className="mt-1 text-sm font-black leading-5 text-[#1d1714]">
                  {language === 'zh' ? '可以繼續滑，也可以到我的貓卡慢慢看。' : 'Keep swiping or review it in My Cat Cards.'}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <CatProfileSummary item={item} language={language} showSavedBadge />
            </div>

            <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-[18px] border-2 border-[#221915] bg-[#2f5fb3] px-4 py-3 text-sm font-black text-white shadow-[3px_3px_0_rgba(29,23,20,0.86)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                {copy.close}
              </button>
              <Link
                to="/catdex"
                className="rounded-[18px] border-2 border-[#221915] bg-[#fff2cf] px-4 py-3 text-sm font-black text-[#1d1714] shadow-[3px_3px_0_rgba(29,23,20,0.86)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              >
                {copy.openCatdex}
              </Link>
            </div>
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
