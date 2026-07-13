import { Link, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { getPaperNavPress } from '../../lib/uiMotion';

const iconClass = 'h-8 w-8 overflow-visible';
const iconProps = {
  fill: 'none',
  stroke: '#221915',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  strokeWidth: 3.2,
};

function CatCardsIcon() {
  return (
    <svg
      aria-hidden="true"
      data-brand-icon="cat-cards"
      data-icon-detail="simple"
      data-testid="brand-icon-cat-cards"
      viewBox="0 0 64 64"
      className={iconClass}
      {...iconProps}
    >
      <path d="M18 13h27c5 0 8 3 8 8v30H25c-4 0-7-3-7-7V13Z" fill="#FFFDF2" />
      <path d="M11 20h28c5 0 8 3 8 8v27H18c-4 0-7-3-7-7V20Z" fill="#D9ECFF" />
      <path d="M18 29h22v16H18z" fill="#FFFDF2" strokeWidth="2.4" />
      <path d="M23 35c3-3 9-3 12 0 1.6 1.7 1.6 4.1 0 5.8-3 3-9 3-12 0-1.6-1.7-1.6-4.1 0-5.8Z" fill="#2F5FB3" />
      <path d="M39 55h8l-8-8v8Z" fill="#F7C948" />
    </svg>
  );
}

function CatCaptureIcon() {
  return (
    <svg
      aria-hidden="true"
      data-brand-icon="camera"
      data-icon-detail="simple"
      data-testid="brand-icon-camera"
      viewBox="0 0 64 64"
      className="h-10 w-10 overflow-visible"
      {...iconProps}
    >
      <path d="M13 25h11l4-6h10l4 6h9c4 0 7 3 7 7v17c0 4-3 7-7 7H13c-4 0-7-3-7-7V32c0-4 3-7 7-7Z" fill="#FFFDF2" />
      <path d="M18 33h28v15H18z" fill="#2F5FB3" />
      <circle cx="38" cy="40.5" r="7.5" fill="#F7C948" />
      <circle cx="38" cy="40.5" r="3.2" fill="#FFFDF2" />
      <path d="M16 25h7" />
    </svg>
  );
}

function CatMapIcon() {
  return (
    <svg
      aria-hidden="true"
      data-brand-icon="map"
      data-testid="brand-icon-map"
      viewBox="0 0 64 64"
      className={iconClass}
      {...iconProps}
    >
      <path d="M13 15h38v34H13z" fill="#FFFDF2" />
      <path d="M19 44 34 33l17 9M13 29l16-9 22 14" stroke="#8FA7D6" strokeWidth="2.2" />
      <path d="M42 49l9-9v9h-9Z" fill="#F7C948" />
      <path d="M39 18c0 8-9 18-9 18s-9-10-9-18a9 9 0 1 1 18 0Z" fill="#2F5FB3" />
      <path d="M30 15.5c2.8 0 4.7 1.9 5.7 3.7-1 1.8-2.9 3.7-5.7 3.7s-4.7-1.9-5.7-3.7c1-1.8 2.9-3.7 5.7-3.7Z" fill="#FFFDF2" strokeWidth="2.2" />
    </svg>
  );
}

interface CatActionNavProps {
  labels?: {
    nav?: string;
    myCatCards?: string;
    capture?: string;
    map?: string;
  };
}

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
  const isCatCardsActive = location.pathname === '/catdex';
  const isMyMapActive = location.pathname === '/map';
  const isCaptureActive = location.pathname === '/create';
  const sideLinkClass = (isActive: boolean) => [
    'relative flex h-[52px] w-[52px] items-center justify-center rounded-[18px] border text-[#221915] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]',
    isActive
      ? 'border-[#221915]/40 bg-[#fff2cf] shadow-[0_9px_0_rgba(34,25,21,0.16),0_12px_26px_rgba(47,95,179,0.18)] -translate-y-0.5'
      : 'border-[#221915]/20 bg-[#fffdf2] shadow-[0_8px_24px_rgba(34,25,21,0.12)]',
  ].join(' ');
  const captureLinkClass = (isActive: boolean) => [
    'flex h-[66px] w-[66px] -translate-y-3 items-center justify-center rounded-[23px] border text-[#fffdf2] transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]',
    isActive
      ? 'border-[#221915]/45 bg-[#1f4fa4] shadow-[0_16px_0_rgba(34,25,21,0.16),0_18px_34px_rgba(47,95,179,0.44)]'
      : 'border-[#221915]/25 bg-[#2f5fb3] shadow-[0_14px_28px_rgba(47,95,179,0.38)]',
  ].join(' ');

  return (
    <nav
      aria-label={navLabels.nav}
      className="pointer-events-none absolute inset-x-0 bottom-[calc(0.55rem+env(safe-area-inset-bottom))] z-50 flex h-[76px] items-center justify-center px-3"
    >
      <div className="pointer-events-auto grid h-[76px] w-[246px] max-w-[calc(100%-24px)] grid-cols-[50px_66px_50px] items-center justify-center gap-4 rounded-[26px] border border-[#221915]/20 bg-[#fffaf0]/92 px-3 shadow-[0_18px_40px_rgba(34,25,21,0.18)] backdrop-blur-xl">
        <Link
          to="/catdex"
          aria-label={navLabels.myCatCards}
          aria-current={isCatCardsActive ? 'page' : undefined}
          data-motion-role="side-action"
          data-motion-reduced={prefersReducedMotion ? 'true' : 'false'}
          className={sideLinkClass(isCatCardsActive)}
        >
          <motion.span
            className="flex h-full w-full items-center justify-center"
            whileTap={getPaperNavPress(prefersReducedMotion, 'side')}
            transition={{ duration: 0.12 }}
          >
            <CatCardsIcon />
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
            className="flex h-full w-full items-center justify-center"
            whileTap={getPaperNavPress(prefersReducedMotion, 'capture')}
            transition={{ duration: 0.12 }}
          >
            <CatCaptureIcon />
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
            className="flex h-full w-full items-center justify-center"
            whileTap={getPaperNavPress(prefersReducedMotion, 'side')}
            transition={{ duration: 0.12 }}
          >
            <CatMapIcon />
          </motion.span>
        </Link>
      </div>
    </nav>
  );
}
