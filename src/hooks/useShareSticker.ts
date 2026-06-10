import { translations } from '../translations';
import { useScrapbookStore } from '../store/useScrapbookStore';

/**
 * Creates a canvas with the sticker composited on a warm background.
 * This ensures LINE/WhatsApp display a colored background instead of white.
 */
const compositeStickerImage = async (imageData: string): Promise<Blob> => {
  const response = await fetch(imageData);
  const blob = await response.blob();
  const img = new Image();
  img.src = URL.createObjectURL(blob);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });

  // Use a warm, cozy background matching the app theme
  const bgColor = '#F5F4ED';
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(img.src);

  return new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b!), 'image/png');
  });
};

/**
 * Share a sticker image to messaging apps using the Web Share API.
 * Falls back to direct download if Web Share API is not supported.
 */
export const useShareSticker = () => {
  const { language } = useScrapbookStore();
  const t = translations[language];

  const share = async (imageData: string) => {
    try {
      const blob = await compositeStickerImage(imageData);
      const file = new File([blob], `corner-cat-sticker-${Date.now()}.png`, {
        type: 'image/png',
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t.reelShareTitle || '轉角遇到貓 Sticker',
        });
      } else {
        // Fallback: download directly
        downloadImage(imageData);
      }
    } catch (err) {
      const error = err as Error;
      if (error.name === 'AbortError') return;
      downloadImage(imageData);
    }
  };

  const downloadImage = (imageData: string) => {
    const a = document.createElement('a');
    a.href = imageData;
    a.download = `corner-cat-sticker-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return { share };
};
