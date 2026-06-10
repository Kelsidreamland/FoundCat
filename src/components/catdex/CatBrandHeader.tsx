import { Heart, X } from 'lucide-react';
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
  logoLabel = '回到首頁',
  donationUrl,
  donationLabel = '捐贈',
}: CatBrandHeaderProps) {
  return (
    <header className="relative z-20 flex min-h-[76px] items-start justify-between gap-3 px-5 pb-0 pt-2 sm:min-h-[82px]">
      <div className="min-w-0">
        <Link
          to="/"
          aria-label={logoLabel}
          className="block w-[96px] rounded-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3] sm:w-[106px]"
        >
          <PostcardCatBrandMark className="h-[68px] w-[96px] shrink-0 sm:h-[74px] sm:w-[106px]" />
        </Link>
        <div className="sr-only">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-1">
        {donationUrl ? (
          <a
            href={donationUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={donationLabel}
            className="inline-flex h-8 items-center gap-1 rounded-full border-2 border-[#1d1714]/30 bg-[#fff2cf]/90 px-2.5 text-[0.68rem] font-black tracking-[0.04em] text-[#1d1714] shadow-[2px_2px_0_rgba(247,201,72,0.36)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
          >
            <Heart size={12} strokeWidth={2.8} aria-hidden="true" />
            <span>{donationLabel}</span>
          </a>
        ) : null}
        {showLanguageToggle && language && onToggleLanguage && toggleLabel ? (
          <button
            type="button"
            onClick={onToggleLanguage}
            className="grid h-8 min-w-10 place-items-center rounded-full border-2 border-[#1d1714]/30 bg-[#fffdf7]/80 px-2 text-[0.68rem] font-black tracking-[0.04em] text-[#1d1714] shadow-[2px_2px_0_rgba(47,95,179,0.14)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
            aria-label={toggleLabel}
          >
            {language === 'zh' ? 'EN' : '繁'}
          </button>
        ) : null}
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
