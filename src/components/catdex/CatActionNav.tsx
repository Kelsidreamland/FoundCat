import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Camera, Map as MapIcon, PawPrint } from 'lucide-react';
import { getPaperNavPress } from '../../lib/uiMotion';
import { useScrapbookStore } from '../../store/useScrapbookStore';

// Simple single-colour line icons; the captions under them carry the meaning.
const sideIconProps = { size: 24, strokeWidth: 2.2, 'aria-hidden': true as const, 'data-icon-detail': 'simple' };

function CatCardsIcon() {
  return <PawPrint {...sideIconProps} data-brand-icon="cat-cards" data-testid="brand-icon-cat-cards" />;
}

function CatCaptureIcon() {
  return (
    <Camera
      size={28}
      strokeWidth={2.2}
      aria-hidden
      data-icon-detail="simple"
      data-brand-icon="camera"
      data-testid="brand-icon-camera"
    />
  );
}

function CatMapIcon() {
  return <MapIcon {...sideIconProps} data-brand-icon="map" data-testid="brand-icon-map" />;
}

interface CatActionNavProps {
  labels?: {
    nav?: string;
    myCatCards?: string;
    capture?: string;
    map?: string;
  };
}

// Short visible captions; the longer `labels` stay as accessible names.
const captions = {
  zh: { myCatCards: '貓卡', capture: '拍貓', map: '地圖' },
  en: { myCatCards: 'Cards', capture: 'Snap', map: 'Map' },
};

const defaultLabels = {
  nav: '主要操作',
  myCatCards: '我的貓卡',
  capture: '拍貓',
  map: '貓咪地圖',
};

export default function CatActionNav({ labels }: CatActionNavProps) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();
  const navLabels = { ...defaultLabels, ...labels };
  const language = useScrapbookStore((state) => state.language);
  const caption = captions[language] ?? captions.zh;
  const isCatCardsActive = location.pathname === '/catdex';
  const isMyMapActive = location.pathname === '/map';
  const isCaptureActive = location.pathname === '/create';
  const sideLinkClass = (isActive: boolean) => [
    'relative flex h-[56px] w-[56px] items-center justify-center rounded-[18px] border transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]',
    isActive
      ? 'border-[#221915]/40 bg-[#fff2cf] text-[#2f5fb3] shadow-[0_9px_0_rgba(34,25,21,0.16),0_12px_26px_rgba(47,95,179,0.18)] -translate-y-0.5'
      : 'border-[#221915]/20 bg-[#fffdf2] text-[#221915] shadow-[0_8px_24px_rgba(34,25,21,0.12)]',
  ].join(' ');
  const captureLinkClass = (isActive: boolean) => [
    'flex h-[68px] w-[68px] -translate-y-3 items-center justify-center rounded-[23px] border text-[#fffdf2] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]',
    isActive
      ? 'border-[#221915]/45 bg-[#1f4fa4] shadow-[0_16px_0_rgba(34,25,21,0.16),0_18px_34px_rgba(47,95,179,0.44)]'
      : 'border-[#221915]/25 bg-[#2f5fb3] shadow-[0_14px_28px_rgba(47,95,179,0.38)]',
  ].join(' ');

  return (
    <nav
      aria-label={navLabels.nav}
      className="pointer-events-none absolute inset-x-0 bottom-[calc(0.55rem+env(safe-area-inset-bottom))] z-50 flex h-[76px] items-center justify-center px-3"
    >
      <div className="pointer-events-auto grid h-[78px] w-[264px] max-w-[calc(100%-24px)] grid-cols-[56px_68px_56px] items-center justify-center gap-4 rounded-[26px] border border-[#221915]/20 bg-[#fffaf0]/92 px-3 shadow-[0_18px_40px_rgba(34,25,21,0.18)] backdrop-blur-xl">
        <Link
          to="/catdex"
          aria-label={navLabels.myCatCards}
          aria-current={isCatCardsActive ? 'page' : undefined}
          data-motion-role="side-action"
          data-motion-reduced={prefersReducedMotion ? 'true' : 'false'}
          className={sideLinkClass(isCatCardsActive)}
        >
          <motion.span
            className="flex h-full w-full flex-col items-center justify-center gap-0.5"
            whileTap={getPaperNavPress(prefersReducedMotion, 'side')}
            transition={{ duration: 0.12 }}
          >
            <CatCardsIcon />
            <span aria-hidden="true" className="text-[10px] font-black leading-none">{caption.myCatCards}</span>
          </motion.span>
        </Link>

        <Link
          to="/create"
          aria-label={navLabels.capture}
          aria-current={isCaptureActive ? 'page' : undefined}
          data-motion-role="capture-action"
          data-motion-reduced={prefersReducedMotion ? 'true' : 'false'}
          className={captureLinkClass(isCaptureActive)}
        >
          <motion.span
            className="flex h-full w-full flex-col items-center justify-center gap-0.5"
            whileTap={getPaperNavPress(prefersReducedMotion, 'capture')}
            transition={{ duration: 0.12 }}
          >
            <CatCaptureIcon />
            <span aria-hidden="true" className="text-[11px] font-black leading-none">{caption.capture}</span>
          </motion.span>
        </Link>

        <Link
          to="/map?mode=public"
          aria-label={navLabels.map}
          aria-current={isMyMapActive ? 'page' : undefined}
          data-motion-role="side-action"
          data-motion-reduced={prefersReducedMotion ? 'true' : 'false'}
          className={sideLinkClass(isMyMapActive)}
        >
          <motion.span
            className="flex h-full w-full flex-col items-center justify-center gap-0.5"
            whileTap={getPaperNavPress(prefersReducedMotion, 'side')}
            transition={{ duration: 0.12 }}
          >
            <CatMapIcon />
            <span aria-hidden="true" className="text-[10px] font-black leading-none">{caption.map}</span>
          </motion.span>
        </Link>
      </div>
    </nav>
  );
}
