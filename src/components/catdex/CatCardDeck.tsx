import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { formatCatCardNumberForItem, getDeckNeighbors, sortCatCards } from '../../lib/catdexDeck';
import type { ScrapbookItem } from '../../store/useScrapbookStore';

interface CatCardDeckProps {
  items: ScrapbookItem[];
  language: 'zh' | 'en';
  labels: {
    empty: string;
    previous: string;
    next: string;
    shareCard: string;
    collectFeedback?: string;
  };
  onShareCard: (item: ScrapbookItem) => void;
  onCollectCard?: (item: ScrapbookItem) => void;
}

const dateFormatter = (language: 'zh' | 'en') => {
  return new Intl.DateTimeFormat(language === 'zh' ? 'zh-TW' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const SWIPE_THRESHOLD = 90;
const SWIPE_VELOCITY_THRESHOLD = 650;
const SWIPE_ANIMATION_MS = 220;
const COLLECT_FEEDBACK_MS = 1400;
const SWIPE_HINT_STORAGE_KEY = 'corner-cat-swipe-hint-seen';

type SwipeDirection = -1 | 1;

function hasSeenSwipeHint() {
  try {
    if (typeof window === 'undefined') return true;
    return window.localStorage.getItem(SWIPE_HINT_STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
}

function rememberSwipeHint() {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(SWIPE_HINT_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage errors; the hint can safely remain session-only.
  }
}

export default function CatCardDeck({
  items,
  language,
  labels,
  onShareCard,
  onCollectCard,
}: CatCardDeckProps) {
  const cards = useMemo(() => sortCatCards(items), [items]);
  const cardSourceSignature = useMemo(() => cards.map((card) => card.id).join('|'), [cards]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(null);
  const [isSwipeHintDismissed, setIsSwipeHintDismissed] = useState(hasSeenSwipeHint);
  const [collectFeedback, setCollectFeedback] = useState<string | null>(null);
  const swipeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSwipeAnimatingRef = useRef(false);
  const { previous, active, next } = getDeckNeighbors(cards, activeIndex);
  const formatter = dateFormatter(language);
  const hasMultipleCards = cards.length > 1;
  const showSwipeHint = hasMultipleCards && !isSwipeHintDismissed;

  useEffect(() => {
    return () => {
      if (swipeTimerRef.current) clearTimeout(swipeTimerRef.current);
      if (collectFeedbackTimerRef.current) clearTimeout(collectFeedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (swipeTimerRef.current) {
      clearTimeout(swipeTimerRef.current);
      swipeTimerRef.current = null;
    }

    isSwipeAnimatingRef.current = false;
    setSwipeDirection(null);
    setActiveIndex(0);
  }, [cardSourceSignature]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (cards.length === 0) return 0;
      return Math.min(current, cards.length - 1);
    });
  }, [cards.length]);

  const completeMove = () => {
    setActiveIndex((current) => (cards.length > 0 ? (current + 1) % cards.length : 0));
    setSwipeDirection(null);
    swipeTimerRef.current = null;
    isSwipeAnimatingRef.current = false;
  };

  const dismissSwipeHint = () => {
    rememberSwipeHint();
    setIsSwipeHintDismissed(true);
  };

  const move = (direction: SwipeDirection) => {
    if (cards.length <= 1 || swipeDirection || isSwipeAnimatingRef.current) return;
    isSwipeAnimatingRef.current = true;
    if (showSwipeHint) dismissSwipeHint();
    if (direction === -1 && active) {
      onCollectCard?.(active);
      setCollectFeedback(labels.collectFeedback ?? (language === 'zh' ? '已收藏到我的貓卡' : 'Saved to My Cat Cards'));
      if (collectFeedbackTimerRef.current) clearTimeout(collectFeedbackTimerRef.current);
      collectFeedbackTimerRef.current = setTimeout(() => {
        setCollectFeedback(null);
        collectFeedbackTimerRef.current = null;
      }, COLLECT_FEEDBACK_MS);
    }
    setSwipeDirection(direction);

    if (swipeTimerRef.current) clearTimeout(swipeTimerRef.current);
    swipeTimerRef.current = setTimeout(completeMove, SWIPE_ANIMATION_MS);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldCollect = info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY_THRESHOLD;
    const shouldGoNext = info.offset.x > SWIPE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY_THRESHOLD;

    if (shouldCollect) move(-1);
    if (shouldGoNext) move(1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!hasMultipleCards) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(-1);
    }
  };

  if (!active) {
    const [emptyTitle, ...emptyBodyParts] = labels.empty.split('\n');
    const emptyBody = emptyBodyParts.join('\n').trim();

    return (
      <div className="flex h-[min(390px,calc(100dvh-240px))] min-h-[320px] items-center justify-center rounded-[24px] border-2 border-[#1d1714] bg-[#fffdf7] p-6 text-center shadow-[7px_8px_0_#1d1714]">
        <div className="max-w-[15rem]">
          <p className="text-lg font-black leading-7 text-[#1d1714]">
            {emptyTitle}
          </p>
          {emptyBody ? (
            <p className="mt-3 text-sm font-bold leading-6 text-[#6d5f52]">
              {emptyBody}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const activeImage = active.heroImageData || active.imageData;
  const activeDate = formatter.format(new Date(active.date));
  const activeLocation = active.location?.name ?? (language === 'zh' ? '未記錄地點' : 'No location');
  const activeCatName = active.catName?.trim();

  return (
    <section aria-label={language === 'zh' ? '貓咪卡片' : 'Cat cards'}>
      <div className="relative mt-2 h-[min(390px,calc(100dvh-240px))] min-h-[320px]">
        {showSwipeHint ? (
          <div className="absolute right-4 top-4 z-30 flex items-center gap-2 rounded-full border-2 border-[#1d1714] bg-[#fff2cf]/95 px-3 py-2 text-[11px] font-black text-[#1d1714] shadow-[3px_3px_0_rgba(29,23,20,0.72)] backdrop-blur-sm">
            <span>{language === 'zh' ? '左滑收藏，右滑看下一隻' : 'Swipe left to collect, right for next'}</span>
            <button
              type="button"
              onClick={dismissSwipeHint}
              className="grid h-5 w-5 place-items-center rounded-full border border-[#1d1714]/30 bg-[#fffdf7] leading-none"
              aria-label={language === 'zh' ? '關閉左右滑動提示' : 'Close swipe hint'}
            >
              ×
            </button>
          </div>
        ) : null}

        {collectFeedback ? (
          <div
            role="status"
            className="absolute left-1/2 top-[46%] z-40 -translate-x-1/2 rounded-full border-2 border-[#1d1714] bg-[#fffdf7]/94 px-4 py-2 text-[12px] font-black text-[#1d1714] shadow-[4px_4px_0_rgba(47,95,179,0.25)] backdrop-blur-sm"
          >
            {collectFeedback}
          </div>
        ) : null}

        {hasMultipleCards && next ? (
          <div
            aria-hidden="true"
            className="absolute inset-x-[10px] bottom-0 top-[18px] rotate-[6deg] rounded-[24px] border-2 border-[#1d1714] bg-[#ffe0e7] shadow-[4px_5px_0_rgba(29,23,20,0.25)]"
          />
        ) : null}
        {hasMultipleCards && previous ? (
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-[-2px] right-[22px] top-[10px] rotate-[-5deg] rounded-[24px] border-2 border-[#1d1714] bg-[#d9ecff] shadow-[4px_5px_0_rgba(29,23,20,0.25)]"
          />
        ) : null}

        <motion.article
          key={active.id}
          data-testid="active-cat-card"
          data-swipe-ready={hasMultipleCards ? 'true' : 'false'}
          data-swipe-exit={
            swipeDirection === 1
              ? 'right'
              : swipeDirection === -1
                ? 'left'
                : 'none'
          }
          className="absolute inset-x-[10px] bottom-0 top-0 z-10 flex touch-pan-y cursor-grab select-none flex-col overflow-hidden rounded-[24px] border-2 border-[#1d1714] bg-[#fffdf7] p-3 shadow-[7px_8px_0_#1d1714] active:cursor-grabbing"
          tabIndex={hasMultipleCards ? 0 : undefined}
          drag={hasMultipleCards && !swipeDirection ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.26}
          onDragEnd={handleDragEnd}
          onKeyDown={handleKeyDown}
          aria-label={language === 'zh' ? '貓咪卡片，可左右滑動或使用左右方向鍵' : 'Cat card, swipe or use left and right arrow keys'}
          initial={{ x: swipeDirection ? 50 * -swipeDirection : 0, rotate: -1.5, scale: 0.98, opacity: 0.72 }}
          animate={{
            x: swipeDirection === 1 ? 460 : swipeDirection === -1 ? -460 : 0,
            rotate: swipeDirection === 1 ? 16 : swipeDirection === -1 ? -16 : -1.5,
            scale: swipeDirection ? 0.94 : 1,
            opacity: swipeDirection ? 0 : 1,
          }}
          transition={{
            type: swipeDirection ? 'tween' : 'spring',
            duration: swipeDirection ? SWIPE_ANIMATION_MS / 1000 : undefined,
            stiffness: 360,
            damping: 28,
          }}
          whileDrag={{ scale: 1.015, rotate: 0 }}
        >
          <div className="h-[52%] min-h-[150px] overflow-hidden rounded-[18px] border-2 border-[#1d1714] bg-[#f9bd4d]">
            <img
              src={activeImage}
              alt={language === 'zh' ? '貓卡照片' : 'Cat card photo'}
              className="h-full w-full object-cover brightness-[0.98] contrast-[1.04] saturate-[0.92]"
              draggable={false}
            />
          </div>

          {activeCatName ? (
            <p className="mt-[12px] truncate text-[20px] font-black leading-tight text-[#1d1714]">
              {activeCatName}
            </p>
          ) : null}

          <div className={`${activeCatName ? 'mt-2' : 'mt-[15px]'} flex items-end justify-between gap-3`}>
            <strong className="block text-[38px] font-black leading-[0.9]">
              {formatCatCardNumberForItem(active)}
            </strong>
            <span className="block text-right text-[11px] font-black leading-[1.42] text-[#76665a]">
              <span className="block">{activeLocation}</span>
              <span className="block">{activeDate}</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => onShareCard(active)}
            className="mt-auto flex w-full items-center justify-between gap-2 rounded-[16px] border-2 border-[#1d1714] bg-[#fff2cf] px-3 py-2.5 text-left text-xs font-black text-[#1d1714] shadow-[3px_3px_0_#1d1714] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
            aria-label={labels.shareCard}
          >
            <span>{labels.shareCard}</span>
            <span className="text-[10px] tracking-[0.08em] text-[#2f5fb3]">SEND</span>
          </button>
        </motion.article>
      </div>
    </section>
  );
}
