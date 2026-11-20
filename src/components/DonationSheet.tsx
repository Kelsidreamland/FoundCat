import { Check, Copy, ExternalLink, Heart, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { CryptoDonation, DonationLanguage, DonationOptions } from '../lib/donation';

const copy = {
  zh: {
    title: '請貓咪喝罐罐',
    subtitle: '轉角遇到貓是免費的個人專案，贊助完全自由，謝謝你。',
    close: '關閉',
    links: '線上付款',
    crypto: '加密貨幣',
    network: '網路',
    copy: '複製地址',
    copied: '已複製',
    networkWarning: '轉帳前請確認幣種和網路一致，選錯網路的款項無法找回。',
    qrAlt: (label: string) => `${label} 收款 QR Code`,
  },
  en: {
    title: 'Buy the cats a treat',
    subtitle: 'FOUND CAT is a free personal project. Donations are entirely optional — thank you.',
    close: 'Close',
    links: 'Pay online',
    crypto: 'Crypto',
    network: 'Network',
    copy: 'Copy address',
    copied: 'Copied',
    networkWarning: 'Double-check the coin and network before sending. Funds sent on the wrong network cannot be recovered.',
    qrAlt: (label: string) => `${label} donation QR code`,
  },
} satisfies Record<DonationLanguage, unknown>;

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older in-app browsers (e.g. some WeChat/LINE builds) lack the async clipboard API.
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand?.('copy') ?? false;
    textarea.remove();
    return ok;
  }
}

function CryptoRow({ entry, language }: { entry: CryptoDonation; language: DonationLanguage }) {
  const t = copy[language];
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(entry.address, { margin: 1, width: 360, color: { dark: '#1d1714', light: '#fffdf7' } }))
      .then((url) => {
        if (!cancelled) setQr(url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [entry.address]);

  const handleCopy = async () => {
    if (await copyText(entry.address)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <li className="rounded-2xl border-2 border-[#1d1714]/20 bg-[#fffdf7] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-black text-[#1d1714]">{entry.label}</p>
        <p className="text-[0.7rem] font-bold text-[#5c4f45]">
          {t.network}: {entry.network}
        </p>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl border border-[#1d1714]/15 bg-white">
          {qr ? <img src={qr} alt={t.qrAlt(`${entry.label} ${entry.network}`)} className="h-full w-full rounded-xl" /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="break-all font-mono text-[0.68rem] leading-snug text-[#1d1714]" data-testid={`crypto-address-${entry.id}`}>
            {entry.address}
          </p>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-full border-2 border-[#1d1714]/30 bg-[#fff2cf] px-3 text-[0.7rem] font-black text-[#1d1714]"
          >
            {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            {copied ? t.copied : t.copy}
          </button>
        </div>
      </div>
    </li>
  );
}

export default function DonationSheet({
  language,
  options,
  onClose,
}: {
  language: DonationLanguage;
  options: DonationOptions;
  onClose: () => void;
}) {
  const t = copy[language];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[#1d1714]/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-sheet-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] border-2 border-[#1d1714] bg-[#fff7e8] px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 text-[#1d1714] shadow-[0_-6px_0_rgba(47,95,179,0.16)] sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="donation-sheet-title" className="flex items-center gap-1.5 text-lg font-black">
              <Heart size={18} strokeWidth={2.6} aria-hidden="true" />
              {t.title}
            </h2>
            <p className="mt-1 text-xs font-bold leading-relaxed text-[#5c4f45]">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-[#1d1714] bg-[#fffdf2]"
          >
            <X size={18} strokeWidth={2.4} />
          </button>
        </div>

        {options.links.length > 0 ? (
          <section className="mt-4">
            <h3 className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#5c4f45]">{t.links}</h3>
            <ul className="mt-2 space-y-2">
              {options.links.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex min-h-11 items-center justify-between rounded-2xl border-2 border-[#1d1714]/20 bg-[#fffdf7] px-4 text-sm font-black"
                  >
                    {link.label[language]}
                    <ExternalLink size={15} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {options.crypto.length > 0 ? (
          <section className="mt-4">
            <h3 className="text-[0.7rem] font-black uppercase tracking-[0.14em] text-[#5c4f45]">{t.crypto}</h3>
            <p className="mt-1 text-[0.7rem] font-bold leading-relaxed text-[#a2412b]">{t.networkWarning}</p>
            <ul className="mt-2 space-y-2">
              {options.crypto.map((entry) => (
                <CryptoRow key={entry.id} entry={entry} language={language} />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
