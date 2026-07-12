import { Heart, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PostcardCatBrandMark } from '../brand/BrandMarks';

interface CatBrandHeaderProps {
  title: string;
  subtitle: string;
  language?: 'zh' | 'en';
  onToggleLanguage?: () => void;
  toggleLabel?: string;
  showLanguageToggle?: boolean;
  showClose?: boolean;
  closeLabel?: string;
  logoLabel?: string;
  donationUrl?: string;
  donationLabel?: string;
  accessory?: ReactNode;
}

export default function CatBrandHeader({
  title,
  subtitle,
  language,
  onToggleLanguage,
  toggleLabel,
  showLanguageToggle = Boolean(language && onToggleLanguage && toggleLabel),
  showClose = false,
  closeLabel = '關閉回首頁',
  logoLabel = language === 'en' ? 'Return home' : '回到首頁',
  donationUrl,
  donationLabel = '捐贈',
  accessory,
}: CatBrandHeaderProps) {
  return (
    <header className="relative z-20 flex min-h-[76px] flex-wrap items-start justify-between gap-x-3 gap-y-1 px-4 pb-0 pt-2 sm:min-h-[82px] sm:px-5">
      <div className="min-w-0">
        <Link
          to="/"
          aria-label={logoLabel}
          className="block w-[88px] rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3] sm:w-[106px]"
        >
          <PostcardCatBrandMark language={language} className="h-[64px] w-[88px] shrink-0 sm:h-[74px] sm:w-[106px]" />
        </Link>
        <div className="sr-only">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5 pt-1">
        {donationUrl ? (
          <a
            href={donationUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={donationLabel}
            className="inline-flex min-h-10 items-center gap-1 rounded-full border-2 border-[#1d1714]/30 bg-[#fff2cf]/90 px-2.5 text-[0.68rem] font-black tracking-[0.04em] text-[#1d1714] shadow-[2px_2px_0_rgba(247,201,72,0.36)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
          >
            <Heart size={12} strokeWidth={2.8} aria-hidden="true" />
            <span>{donationLabel}</span>
          </a>
        ) : null}
        {showLanguageToggle && language && onToggleLanguage && toggleLabel ? (
          <button
            type="button"
            onClick={onToggleLanguage}
            className="grid h-10 min-w-10 place-items-center rounded-full border-2 border-[#1d1714]/30 bg-[#fffdf7]/80 px-2 text-[0.68rem] font-black tracking-[0.04em] text-[#1d1714] shadow-[2px_2px_0_rgba(47,95,179,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
            aria-label={toggleLabel}
          >
            {language === 'zh' ? 'EN' : '繁'}
          </button>
        ) : null}
        {accessory}
        {showClose ? (
          <Link
            to="/"
            aria-label={closeLabel}
            className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#221915] bg-[#fffdf2] text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
          >
            <X size={19} strokeWidth={2.3} />
          </Link>
        ) : null}
      </div>
    </header>
  );
}
