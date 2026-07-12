import { useEffect, useMemo, useState } from 'react';
import { Download, Loader2, MapPin, Navigation, Share2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ScrapbookItem } from '../../store/useScrapbookStore';
import {
  buildGoogleMapsSearchUrl,
  buildSingleCatSharePath,
  buildSingleCatSharePayload,
} from '../../lib/singleCatShare';
import { APP_SHARE_URL, prepareSingleCatPosterShare, sharePosterBlob } from '../../lib/sharePoster';

interface Props {
  item: ScrapbookItem;
  language: 'zh' | 'en';
  onClose: () => void;
}

const absoluteShareUrl = (path: string) => new URL(path, APP_SHARE_URL).toString();

export default function SingleCatPosterPreviewModal({ item, language, onClose }: Props) {
  const [includeMemo, setIncludeMemo] = useState(false);
  const [memoDraft, setMemoDraft] = useState(item.spotNote ?? '');
  const [poster, setPoster] = useState<Awaited<ReturnType<typeof prepareSingleCatPosterShare>> | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const trimmedMemoDraft = memoDraft.trim();
  const hasMemo = Boolean(trimmedMemoDraft);
  const effectiveIncludeMemo = hasMemo && includeMemo;
  const itemWithMemoDraft = useMemo(() => ({
    ...item,
    spotNote: trimmedMemoDraft || undefined,
  }), [item, trimmedMemoDraft]);
  const mapsUrl = item.location
    ? buildGoogleMapsSearchUrl({
        lat: item.location.lat,
        lng: item.location.lng,
        name: item.location.name,
        address: item.location.address,
        mapUrl: item.location.mapUrl,
      })
    : null;
  const previewTitle = item.catName?.trim() || item.location?.name || (language === 'zh' ? '今天遇見的貓' : 'Cat spotted today');
  const previewLocation = item.location?.name?.trim();
  const previewMemo = effectiveIncludeMemo ? trimmedMemoDraft : null;
  const copy = language === 'zh'
    ? {
        dialogTitle: '分享這隻貓',
        close: '關閉分享預覽',
        posterAlt: '單貓分享海報預覽',
        pagePreview: '分享頁預覽',
        memo: '出沒備註',
        memoAria: '出沒備註',
        memoPlaceholder: '例如：下午常在轉角紙箱睡覺',
        includeMemo: '在分享頁公開出沒備註',
        includeMemoHint: '先在上方補一段出沒備註，就能一起放進分享頁。',
        saveImage: '儲存圖片',
        sharePoster: '分享海報',
      }
    : {
        dialogTitle: 'Share this cat',
        close: 'Close share preview',
        posterAlt: 'Single-cat share poster preview',
        pagePreview: 'Shared page preview',
        memo: 'Spot memo',
        memoAria: 'Spot memo',
        memoPlaceholder: 'Example: often naps in the corner box',
        includeMemo: 'Include the spot memo on the shared page',
        includeMemoHint: 'Add a spot memo above before including it in the shared page.',
        saveImage: 'Save image',
        sharePoster: 'Share poster',
      };

  const shareUrl = useMemo(() => {
    const payload = buildSingleCatSharePayload(itemWithMemoDraft, { includeMemo: effectiveIncludeMemo, language });
    return absoluteShareUrl(buildSingleCatSharePath(payload));
  }, [effectiveIncludeMemo, itemWithMemoDraft, language]);

  useEffect(() => {
    setMemoDraft(item.spotNote ?? '');
  }, [item.id, item.spotNote]);

  useEffect(() => {
    if (!hasMemo && includeMemo) {
      setIncludeMemo(false);
    }
  }, [hasMemo, includeMemo]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setPoster(null);
    setPreviewUrl(null);

    void prepareSingleCatPosterShare({ item: itemWithMemoDraft, language, shareUrl, includeMemo: effectiveIncludeMemo }).then((prepared) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(prepared.blob);
      setPoster(prepared);
      setPreviewUrl(objectUrl);
    });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [effectiveIncludeMemo, itemWithMemoDraft, language, shareUrl]);

  const saveImage = () => {
    if (!poster) return;

    const url = URL.createObjectURL(poster.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = poster.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const shareImage = async () => {
    if (!poster) return;

    setIsSharing(true);
    try {
      await sharePosterBlob(poster);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={copy.dialogTitle}
      className="fixed inset-0 z-[320] flex items-end justify-center bg-[#221915]/70 p-4 backdrop-blur-sm sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div
        data-testid="single-cat-share-panel"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded-[24px] border-2 border-[#221915] bg-[#fffdf2] p-4 shadow-[8px_8px_0_rgba(47,95,179,0.28)] overscroll-contain"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-base font-black text-[#221915]">{copy.dialogTitle}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={copy.close}
            className="grid h-10 w-10 place-items-center rounded-full border border-[#221915]/20 bg-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex min-h-[220px] items-center justify-center rounded-[18px] border border-[#221915]/12 bg-white/70">
          {previewUrl ? (
            <img src={previewUrl} alt={copy.posterAlt} className="max-h-[42vh] max-w-full rounded-[14px] object-contain" />
          ) : (
            <Loader2 className="animate-spin text-[#2f5fb3]" />
          )}
        </div>

        <section className="mt-3 rounded-[18px] border border-[#221915]/12 bg-white/82 p-3 shadow-[3px_3px_0_rgba(47,95,179,0.10)]">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">{copy.pagePreview}</p>
          <h3 className="mt-1 break-words text-lg font-black leading-tight text-[#221915]">{previewTitle}</h3>
          {previewLocation ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#fff2cf] px-2.5 py-1 text-xs font-black text-[#221915]">
              <MapPin size={13} className="shrink-0 text-[#2f5fb3]" />
              <span>{previewLocation}</span>
            </p>
          ) : null}
          {previewMemo ? (
            <p className="mt-2 rounded-[12px] border border-[#221915]/10 bg-[#fffdf2] px-3 py-2 text-xs font-bold leading-relaxed text-[#5f5046]">
              {previewMemo}
            </p>
          ) : null}
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[#221915] bg-[#f7c948] px-3 py-2.5 text-sm font-black text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.16)]"
            >
              <Navigation size={15} />
              <span>{language === 'zh' ? '用 Google Maps 打開' : 'Open in Google Maps'}</span>
            </a>
          ) : null}
        </section>

        <label className="mt-3 block rounded-[14px] bg-white/70 p-3 text-sm font-bold text-[#221915]">
            <span className="block">{copy.memo}</span>
          <textarea
            aria-label={copy.memoAria}
            value={memoDraft}
            onChange={(event) => setMemoDraft(event.target.value)}
            placeholder={copy.memoPlaceholder}
            className="mt-2 min-h-[72px] w-full resize-none rounded-[12px] border border-[#221915]/15 bg-[#fffdf2] px-3 py-2 text-base font-semibold leading-relaxed text-[#221915] placeholder:text-[#8b7b6f] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50"
          />
        </label>

        <label className="mt-3 flex items-start gap-2 rounded-[14px] bg-white/70 p-3 text-sm font-bold text-[#221915]">
          <input
            type="checkbox"
            aria-label={copy.includeMemo}
            checked={effectiveIncludeMemo}
            disabled={!hasMemo}
            onChange={(event) => setIncludeMemo(event.target.checked)}
            className="mt-1"
          />
          <span>
            <span className="block">{copy.includeMemo}</span>
            {!hasMemo ? (
              <span className="mt-1 block text-xs leading-relaxed text-[#76665a]">
                {copy.includeMemoHint}
              </span>
            ) : null}
          </span>
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={saveImage}
            disabled={!poster}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[#221915] bg-white px-3 py-3 text-sm font-black text-[#221915] disabled:opacity-50"
          >
            <Download size={16} />
            <span>{copy.saveImage}</span>
          </button>
          <button
            type="button"
            onClick={shareImage}
            disabled={!poster || isSharing}
            className="inline-flex items-center justify-center gap-2 rounded-[14px] border-2 border-[#221915] bg-[#2f5fb3] px-3 py-3 text-sm font-black text-[#fffdf2] disabled:opacity-50"
          >
            {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
            <span>{copy.sharePoster}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
