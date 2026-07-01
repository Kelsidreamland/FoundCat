import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { getPersonalityLabels } from '../../lib/catInfoDisplay';
import { formatCatCardNumberForItem, getDeckNeighbors, sortCatCards } from '../../lib/catdexDeck';
import { suggestCatName } from '../../lib/catNameGenerator';
import { getReadableLocationName } from '../../lib/locationDisplay';
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
  onOpenCard?: (item: ScrapbookItem) => void;
}

const SWIPE_THRESHOLD = 90;
const SWIPE_VELOCITY_THRESHOLD = 650;
const SWIPE_ANIMATION_MS = 220;
const COLLECT_FEEDBACK_MS = 1400;
const SWIPE_HINT_AUTO_DISMISS_MS = 2400;
const SWIPE_HINT_STORAGE_KEY = 'corner-cat-swipe-hint-seen';
const OPEN_CLICK_DRAG_THRESHOLD = 8;

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
  onOpenCard,
}: CatCardDeckProps) {
  const cards = useMemo(() => sortCatCards(items), [items]);
  const cardSourceSignature = useMemo(() => cards.map((card) => card.id).join('|'), [cards]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(null);
  const [isSwipeHintDismissed, setIsSwipeHintDismissed] = useState(hasSeenSwipeHint);
  const [collectFeedback, setCollectFeedback] = useState<string | null>(null);
  const swipeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipeHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSwipeAnimatingRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextOpenClickRef = useRef(false);
  const { previous, active, next } = getDeckNeighbors(cards, activeIndex);
  const hasMultipleCards = cards.length > 1;
  const showSwipeHint = hasMultipleCards && !isSwipeHintDismissed;

  useEffect(() => {
    return () => {
      if (swipeTimerRef.current) clearTimeout(swipeTimerRef.current);
      if (swipeHintTimerRef.current) clearTimeout(swipeHintTimerRef.current);
      if (collectFeedbackTimerRef.current) clearTimeout(collectFeedbackTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!showSwipeHint) return;

    rememberSwipeHint();
    if (swipeHintTimerRef.current) clearTimeout(swipeHintTimerRef.current);
    swipeHintTimerRef.current = setTimeout(() => {
      setIsSwipeHintDismissed(true);
      swipeHintTimerRef.current = null;
    }, SWIPE_HINT_AUTO_DISMISS_MS);

    return () => {
      if (swipeHintTimerRef.current) {
        clearTimeout(swipeHintTimerRef.current);
        swipeHintTimerRef.current = null;
      }
    };
  }, [showSwipeHint]);

  useEffect(() => {
    if (swipeTimerRef.current) {
      clearTimeout(swipeTimerRef.current);
      swipeTimerRef.current = null;
    }

    const previousActiveId = activeIdRef.current;
    isSwipeAnimatingRef.current = false;
    setSwipeDirection(null);
    setActiveIndex(() => {
      if (!previousActiveId) return 0;
      const nextActiveIndex = cards.findIndex((card) => card.id === previousActiveId);
      return nextActiveIndex >= 0 ? nextActiveIndex : 0;
    });
  }, [cardSourceSignature, cards]);

  useEffect(() => {
    activeIdRef.current = active?.id ?? null;
  }, [active?.id]);

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

    if (Math.abs(info.offset.x) > OPEN_CLICK_DRAG_THRESHOLD || Math.abs(info.offset.y) > OPEN_CLICK_DRAG_THRESHOLD) {
      suppressNextOpenClickRef.current = true;
    }
    if (shouldCollect) move(-1);
    if (shouldGoNext) move(1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowRight') {
      if (!hasMultipleCards) return;
      event.preventDefault();
      move(1);
    }
    if (event.key === 'ArrowLeft') {
      if (!hasMultipleCards) return;
      event.preventDefault();
      move(-1);
    }
    if (onOpenCard && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onOpenCard(active);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLElement>) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!pointerStartRef.current) return;
    const deltaX = event.clientX - pointerStartRef.current.x;
    const deltaY = event.clientY - pointerStartRef.current.y;
    if (Math.hypot(deltaX, deltaY) > OPEN_CLICK_DRAG_THRESHOLD) {
      suppressNextOpenClickRef.current = true;
    }
  };

  const handlePointerUp = () => {
    pointerStartRef.current = null;
  };

  const handleOpenClick = () => {
    if (suppressNextOpenClickRef.current) {
      suppressNextOpenClickRef.current = false;
      return;
    }
    onOpenCard?.(active);
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
  const activeLocation = getReadableLocationName(active, language);
  const activeCatName = active.catName?.trim() || suggestCatName(active, language);
  const activePersonalityLabels = getPersonalityLabels(active.personalityTags, language).slice(0, 2);
  const motionState = swipeDirection === 1
    ? 'leaving-right'
    : swipeDirection === -1
      ? 'leaving-left'
      : 'settled';

  return (
    <section aria-label={language === 'zh' ? '貓咪卡片' : 'Cat cards'}>
      <div className="relative mt-2 h-[min(390px,calc(100dvh-240px))] min-h-[320px]">
        {showSwipeHint ? (
          <div className="absolute right-4 top-4 z-30 flex items-center gap-2 rounded-full border border-[#2f5fb3]/10 bg-[#fffdf7]/62 px-3 py-1.5 text-[10px] font-medium tracking-[0.08em] text-[#8f8173]/70 shadow-[1px_2px_10px_rgba(47,95,179,0.08)] backdrop-blur-md">
            <span>{language === 'zh' ? '左滑收藏，右滑看下一隻' : 'Swipe left to collect, right for next'}</span>
            <button
              type="button"
              onClick={dismissSwipeHint}
              className="grid h-4 w-4 place-items-center rounded-full border border-[#2f5fb3]/10 bg-white/50 text-[#9b8a7a]/70 leading-none"
              aria-label={language === 'zh' ? '關閉左右滑動提示' : 'Close swipe hint'}
            >
              ×
            </button>
          </div>
        ) : null}

        {collectFeedback ? (
          <div
            role="status"
            className="absolute left-1/2 top-[46%] z-40 -translate-x-1/2 -rotate-2 rounded-[12px] border-2 border-[#1d1714] bg-[#fff2cf]/96 px-4 py-2 text-[12px] font-black text-[#1d1714] shadow-[4px_4px_0_rgba(47,95,179,0.22)] backdrop-blur-sm"
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
          data-motion-state={motionState}
          data-swipe-ready={hasMultipleCards ? 'true' : 'false'}
          data-swipe-exit={
            swipeDirection === 1
              ? 'right'
              : swipeDirection === -1
                ? 'left'
                : 'none'
          }
          className="absolute inset-x-[10px] bottom-0 top-0 z-10 flex touch-pan-y cursor-grab select-none flex-col overflow-hidden rounded-[24px] border-2 border-[#1d1714] bg-[#fffdf7] p-3 shadow-[7px_8px_0_#1d1714] active:cursor-grabbing"
          tabIndex={hasMultipleCards || onOpenCard ? 0 : undefined}
          drag={hasMultipleCards && !swipeDirection ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.26}
          onDragEnd={handleDragEnd}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-label={language === 'zh' ? '貓咪卡片，可左右滑動或使用左右方向鍵' : 'Cat card, swipe or use left and right arrow keys'}
          initial={{ x: swipeDirection ? 46 * -swipeDirection : 0, y: 8, rotate: -1.2, scale: 0.985, opacity: 0.78 }}
          animate={{
            x: swipeDirection === 1 ? 460 : swipeDirection === -1 ? -460 : 0,
            y: swipeDirection ? -10 : 0,
            rotate: swipeDirection === 1 ? 14 : swipeDirection === -1 ? -14 : -1.2,
            scale: swipeDirection ? 0.955 : 1,
            opacity: swipeDirection ? 0 : 1,
          }}
          transition={{
            type: swipeDirection ? 'tween' : 'spring',
            duration: swipeDirection ? SWIPE_ANIMATION_MS / 1000 : undefined,
            stiffness: 420,
            damping: 31,
          }}
          whileDrag={{ scale: 1.015, rotate: 0 }}
          onClick={handleOpenClick}
        >
          <div className="h-[52%] min-h-[150px] overflow-hidden rounded-[18px] border-2 border-[#1d1714] bg-[#f9bd4d]">
            <img
              src={activeImage}
              alt={language === 'zh' ? '貓卡照片' : 'Cat card photo'}
              className="h-full w-full object-cover brightness-[0.98] contrast-[1.04] saturate-[0.92]"
              draggable={false}
            />
          </div>

          <p className="mt-[12px] truncate text-[20px] font-black leading-tight text-[#1d1714]">
            {activeCatName}
          </p>

          <div className="mt-2 flex items-end justify-between gap-3">
            <strong className="block text-[38px] font-black leading-[0.9]">
              {formatCatCardNumberForItem(active)}
            </strong>
            <span className="block text-right text-[11px] font-black leading-[1.42] text-[#76665a]">
              <span className="block">{activeLocation}</span>
            </span>
          </div>

          {activePersonalityLabels.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {activePersonalityLabels.map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-[#221915]/12 bg-[#d9ecff]/75 px-2.5 py-1 text-[11px] font-black leading-none text-[#1d1714]"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onShareCard(active);
            }}
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
