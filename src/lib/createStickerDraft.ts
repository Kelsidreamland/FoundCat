import type { ScrapbookItem } from '../store/useScrapbookStore';

type StickerDraft = Omit<ScrapbookItem, 'id' | 'zIndex'>;

interface BuildStickerDraftOptions {
  imageData: string;
  heroImageData?: string;
  targetDate?: string | null;
  viewportWidth?: number;
  viewportHeight?: number;
  now?: Date;
  random?: () => number;
}

const getStickerDate = (targetDate: string | null | undefined, now: Date) => {
  if (!targetDate) return now.toISOString();

  const [year, month, day] = targetDate.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
};

export const buildStickerDraft = ({
  imageData,
  heroImageData,
  targetDate = null,
  viewportWidth = window.innerWidth,
  viewportHeight = window.innerHeight,
  now = new Date(),
  random = Math.random,
}: BuildStickerDraftOptions): StickerDraft => {
  const containerWidth = Math.min(viewportWidth, 448);

  return {
    type: 'sticker',
    imageData,
    ...(heroImageData ? { heroImageData } : {}),
    date: getStickerDate(targetDate, now),
    x: random() * (containerWidth - 180) + 20,
    y: random() * (viewportHeight - 200) + 100,
    rotation: (random() - 0.5) * 20,
    scale: 1,
  };
};
