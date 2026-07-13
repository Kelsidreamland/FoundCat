import QRCode from 'qrcode';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { formatCatCardNumberForItem, sortCatCards } from './catdexDeck';
import { buildMapSharePath, buildMapSharePayload } from './mapShare';

const normalizeAppShareUrl = (value: string | undefined) => {
  const fallback = 'https://found-cat.vercel.app/';
  const candidate = value?.trim() || fallback;
  return candidate.endsWith('/') ? candidate : `${candidate}/`;
};

export const APP_SHARE_URL = normalizeAppShareUrl(import.meta.env.VITE_APP_SHARE_URL);

type Language = 'zh' | 'en';

interface PosterSharePayload {
  blob: Blob;
  fileName: string;
  title: string;
  text: string;
  url: string;
}

interface CatdexPosterInput {
  displayName: string;
  items: ScrapbookItem[];
  language: Language;
}

interface CatMapPosterInput {
  title: string;
  items: ScrapbookItem[];
  language: Language;
  includeMemo: boolean;
}

type SharePosterResult = 'shared-file' | 'shared-text' | 'downloaded' | 'aborted';

const posterWidth = 1080;
const posterHeight = 1350;
const posterDisplayFont = (size: number) => `700 ${size}px "FoundCat Round", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif`;
const posterNumberFont = (size: number) => `700 ${size}px "FoundCat Number", "Arial Rounded MT Bold", system-ui, sans-serif`;

export const ensurePosterFontsReady = async (displayText = '') => {
  if (typeof document === 'undefined' || !document.fonts?.load) return;
  const displaySample = ['轉角遇到貓', displayText.trim()].filter(Boolean).join(' ');
  await Promise.allSettled([
    document.fonts.load('700 48px "FoundCat Round"', displaySample),
    document.fonts.load('700 48px "FoundCat Number"', 'W-029 FOUND CAT'),
  ]);
};

const colors = {
  ink: '#1d1714',
  paper: '#fff7e8',
  card: '#fffdf7',
  honey: '#f7c948',
  coral: '#ef6f5e',
  cobalt: '#2f5fb3',
  pink: '#ffd3dd',
  softBlue: '#d9ecff',
  muted: '#76665a',
};

const isAbortError = (error: unknown) => {
  return error instanceof Error && error.name === 'AbortError';
};

const ensureUrlInText = (text: string, url: string) => {
  return text.includes(url) ? text : `${text}\n${url}`;
};

const drawRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const fillRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasGradient
) => {
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
};

const strokeRoundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeStyle = colors.ink,
  lineWidth = 6
) => {
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
};

const drawText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    font: string;
    color?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  }
) => {
  ctx.font = options.font;
  ctx.fillStyle = options.color ?? colors.ink;
  ctx.textAlign = options.align ?? 'left';
  ctx.textBaseline = options.baseline ?? 'alphabetic';
  ctx.fillText(text, x, y);
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) => {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      return;
    }
    line = candidate;
  });

  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((lineText, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? '...' : '';
    ctx.fillText(`${lineText}${suffix}`, x, y + index * lineHeight);
  });
};

const loadImage = (src: string) => {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('POSTER_IMAGE_LOAD_FAILED'));
    image.src = src;
  });
};

const drawImageCover = async (
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  try {
    const image = await loadImage(src);
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const sourceWidth = width / scale;
    const sourceHeight = height / scale;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    ctx.save();
    drawRoundRect(ctx, x, y, width, height, 44);
    ctx.clip();
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
    ctx.restore();
  } catch {
    fillRoundRect(ctx, x, y, width, height, 34, colors.softBlue);
    drawText(ctx, 'CAT', x + width / 2, y + height / 2, {
      font: '900 72px system-ui, sans-serif',
      color: colors.cobalt,
      align: 'center',
      baseline: 'middle',
    });
  }
};

const drawImageContain = async (
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number
) => {
  try {
    const image = await loadImage(src);
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const targetWidth = image.naturalWidth * scale;
    const targetHeight = image.naturalHeight * scale;
    const targetX = x + (width - targetWidth) / 2;
    const targetY = y + (height - targetHeight) / 2;
    ctx.drawImage(image, targetX, targetY, targetWidth, targetHeight);
  } catch {
    drawText(ctx, 'CAT', x + width / 2, y + height / 2, {
      font: '900 40px system-ui, sans-serif',
      color: colors.cobalt,
      align: 'center',
      baseline: 'middle',
    });
  }
};

const createPosterCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = posterWidth;
  canvas.height = posterHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('POSTER_CANVAS_UNAVAILABLE');
  return { canvas, ctx };
};

const canvasToBlob = (canvas: HTMLCanvasElement) => {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('POSTER_BLOB_FAILED'));
        return;
      }
      resolve(blob);
    }, 'image/png');
  });
};

const drawPosterBackground = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = colors.paper;
  ctx.fillRect(0, 0, posterWidth, posterHeight);

  ctx.strokeStyle = 'rgba(29,23,20,0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x < posterWidth; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, posterHeight);
    ctx.stroke();
  }
  for (let y = 0; y < posterHeight; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(posterWidth, y);
    ctx.stroke();
  }
};

export const createShareQrCodeDataUrl = async (url = APP_SHARE_URL) => {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 220,
    color: {
      dark: colors.ink,
      light: colors.card,
    },
  });
};

const drawQrCode = async (
  ctx: CanvasRenderingContext2D,
  url: string,
  x: number,
  y: number,
  size: number
) => {
  fillRoundRect(ctx, x, y, size, size, 24, colors.card);
  strokeRoundRect(ctx, x, y, size, size, 24, colors.ink, 5);

  try {
    const qrCode = await loadImage(await createShareQrCodeDataUrl(url));
    ctx.drawImage(qrCode, x + 16, y + 16, size - 32, size - 32);
  } catch {
    drawText(ctx, 'QR', x + size / 2, y + size / 2, {
      font: '900 40px system-ui, sans-serif',
      color: colors.cobalt,
      align: 'center',
      baseline: 'middle',
    });
  }
};

const drawBrandFooter = async (ctx: CanvasRenderingContext2D, url = APP_SHARE_URL) => {
  drawText(ctx, '轉角遇到貓', 72, 1238, {
    font: posterDisplayFont(48),
  });
  drawText(ctx, 'FOUND CAT', 72, 1288, {
    font: posterNumberFont(28),
    color: colors.muted,
  });
  await drawQrCode(ctx, url, 836, 1168, 160);
  drawText(ctx, 'SCAN TO OPEN', 754, 1238, {
    font: '900 22px system-ui, sans-serif',
    color: colors.cobalt,
    align: 'right',
  });
  drawText(ctx, 'Web App link', 754, 1276, {
    font: '800 20px system-ui, sans-serif',
    color: colors.cobalt,
    align: 'right',
  });
};

export const buildCatCardPosterShareText = (item: ScrapbookItem, language: Language) => {
  const number = formatCatCardNumberForItem(item);
  const catName = item.catName?.trim();
  const lines = language === 'zh'
    ? [
        `轉角遇到貓 ${number}`,
        catName,
        item.location?.name ? `在 ${item.location.name} 遇見` : '我遇見的一隻貓',
        item.location?.address,
        `直接打開：${APP_SHARE_URL}`,
      ]
    : [
        `FOUND CAT ${number}`,
        catName,
        item.location?.name ? `Found near ${item.location.name}` : 'A cat I found.',
        item.location?.address,
        `Open: ${APP_SHARE_URL}`,
      ];

  return lines.filter(Boolean).join('\n');
};

export const buildCatdexPosterShareText = ({
  displayName,
  count,
  language,
}: {
  displayName: string;
  count: number;
  language: Language;
}) => {
  if (language === 'en') {
    return [
      displayName,
      `Collected ${count} cats`,
      `Open: ${APP_SHARE_URL}`,
    ].join('\n');
  }

  return [
    displayName,
    `已收集 ${count} 隻貓`,
    `直接打開：${APP_SHARE_URL}`,
  ].join('\n');
};

export const buildCatMapPosterShareText = ({
  title,
  count,
  language,
}: {
  title: string;
  count: number;
  language: Language;
}) => {
  if (language === 'en') {
    return [
      title,
      `${count} cat spots`,
      `Open: ${APP_SHARE_URL}`,
    ].join('\n');
  }

  return [
    title,
    `${count} 個貓咪出沒點`,
    `直接打開：${APP_SHARE_URL}`,
  ].join('\n');
};

export const createCatCardPosterBlob = async (
  item: ScrapbookItem,
  language: Language,
  shareUrl = APP_SHARE_URL
) => {
  await ensurePosterFontsReady(item.catName);
  const { canvas, ctx } = createPosterCanvas();
  const number = formatCatCardNumberForItem(item);
  const imageSrc = item.heroImageData || item.imageData;
  const catName = item.catName?.trim();
  const locationName = item.location?.name ?? (language === 'zh' ? '未記錄地點' : 'No location');
  const address = item.location?.address
    ?? (item.location ? `${item.location.lat.toFixed(5)}, ${item.location.lng.toFixed(5)}` : APP_SHARE_URL);

  drawPosterBackground(ctx);

  fillRoundRect(ctx, 66, 76, 948, 998, 72, colors.card);
  ctx.save();
  ctx.shadowColor = colors.ink;
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 16;
  ctx.shadowOffsetY = 18;
  strokeRoundRect(ctx, 66, 76, 948, 998, 72);
  ctx.restore();

  fillRoundRect(ctx, 112, 128, 856, 660, 44, colors.honey);
  await drawImageCover(ctx, imageSrc, 112, 128, 856, 660);
  strokeRoundRect(ctx, 112, 128, 856, 660, 44);

  drawText(ctx, number, 112, 878, {
    font: posterNumberFont(92),
  });
  if (catName) {
    drawText(ctx, catName, 112, 946, {
      font: posterDisplayFont(46),
      color: colors.ink,
    });
    drawText(ctx, locationName, 112, 998, {
      font: '900 30px "Noto Sans TC", system-ui, sans-serif',
      color: colors.muted,
    });
    ctx.font = '800 25px "Noto Sans TC", system-ui, sans-serif';
    ctx.fillStyle = colors.muted;
    wrapText(ctx, address, 112, 1040, 760, 32, 2);
  } else {
    drawText(ctx, locationName, 112, 952, {
      font: '900 46px "Noto Sans TC", system-ui, sans-serif',
      color: colors.ink,
    });
    ctx.font = '800 30px "Noto Sans TC", system-ui, sans-serif';
    ctx.fillStyle = colors.muted;
    wrapText(ctx, address, 112, 1002, 760, 38, 2);
  }

  fillRoundRect(ctx, 742, 838, 226, 78, 26, colors.cobalt);
  drawText(ctx, 'CAT CARD', 855, 888, {
    font: posterNumberFont(28),
    color: '#fffdf7',
    align: 'center',
  });

  await drawBrandFooter(ctx, shareUrl);
  return canvasToBlob(canvas);
};

export const createCatdexPosterBlob = async ({
  displayName,
  items,
  language,
}: CatdexPosterInput) => {
  await ensurePosterFontsReady(language === 'zh' ? '分享我的貓咪地圖' : 'Share My Cat Map');
  const { canvas, ctx } = createPosterCanvas();
  const cards = sortCatCards(items).slice(-4).reverse();
  const countLabel = language === 'zh' ? `${items.length} 隻貓` : `${items.length} cats`;

  drawPosterBackground(ctx);

  drawText(ctx, language === 'zh' ? '分享我的貓咪地圖' : 'Share My Cat Map', 72, 142, {
    font: language === 'zh' ? posterDisplayFont(72) : posterNumberFont(72),
  });
  drawText(ctx, displayName, 72, 206, {
    font: '900 34px "Noto Sans TC", system-ui, sans-serif',
    color: colors.muted,
  });

  fillRoundRect(ctx, 72, 270, 936, 648, 68, colors.card);
  strokeRoundRect(ctx, 72, 270, 936, 648, 68);

  const gradient = ctx.createLinearGradient(72, 270, 1008, 918);
  gradient.addColorStop(0, '#ffe6ad');
  gradient.addColorStop(0.46, '#fffdf7');
  gradient.addColorStop(1, colors.pink);
  fillRoundRect(ctx, 92, 290, 896, 608, 54, gradient);

  drawText(ctx, language === 'zh' ? '已收集' : 'Collected', 130, 388, {
    font: '900 40px "Noto Sans TC", system-ui, sans-serif',
  });
  drawText(ctx, countLabel, 130, 520, {
    font: '900 104px "Noto Sans TC", system-ui, sans-serif',
  });

  const positions = [
    { x: 132, y: 604, rotate: -0.05 },
    { x: 360, y: 584, rotate: 0.04 },
    { x: 588, y: 618, rotate: -0.03 },
    { x: 762, y: 560, rotate: 0.05 },
  ];

  for (const [index, position] of positions.entries()) {
    const item = cards[index];
    ctx.save();
    ctx.translate(position.x + 118, position.y + 118);
    ctx.rotate(position.rotate);
    ctx.translate(-118, -118);
    fillRoundRect(ctx, 0, 0, 236, 236, 36, colors.card);
    strokeRoundRect(ctx, 0, 0, 236, 236, 36, colors.ink, 5);
    if (item) {
      await drawImageContain(ctx, item.imageData, 22, 22, 192, 192);
    } else {
      drawText(ctx, 'CAT', 118, 130, {
        font: '900 42px system-ui, sans-serif',
        color: colors.cobalt,
        align: 'center',
        baseline: 'middle',
      });
    }
    ctx.restore();
  }

  fillRoundRect(ctx, 72, 968, 936, 112, 36, colors.honey);
  strokeRoundRect(ctx, 72, 968, 936, 112, 36, colors.ink, 6);
  drawText(ctx, language === 'zh' ? '把一路遇見的貓，傳給朋友看。' : 'Send your collected corner cats to friends.', 128, 1038, {
    font: '900 34px "Noto Sans TC", system-ui, sans-serif',
  });

  await drawBrandFooter(ctx);
  return canvasToBlob(canvas);
};

export const createCatMapPosterBlob = async ({
  title,
  items,
  language,
  includeMemo,
  shareUrl = APP_SHARE_URL,
}: CatMapPosterInput & { shareUrl?: string }) => {
  await ensurePosterFontsReady(language === 'zh' ? '分享我的貓咪地圖' : 'Share My Cat Map');
  const { canvas, ctx } = createPosterCanvas();
  const mappedItems = sortCatCards(items).filter((item) => item.location);
  const countLabel = language === 'zh' ? `${mappedItems.length} 個貓咪出沒點` : `${mappedItems.length} cat spots`;
  const previewItems = mappedItems.slice(0, 5);

  drawPosterBackground(ctx);

  drawText(ctx, language === 'zh' ? '分享我的貓咪地圖' : 'Share My Cat Map', 72, 140, {
    font: language === 'zh' ? posterDisplayFont(70) : posterNumberFont(70),
  });
  drawText(ctx, title, 72, 202, {
    font: '900 32px "Noto Sans TC", system-ui, sans-serif',
    color: colors.muted,
  });

  fillRoundRect(ctx, 72, 260, 936, 620, 68, colors.card);
  strokeRoundRect(ctx, 72, 260, 936, 620, 68);

  const gradient = ctx.createLinearGradient(92, 284, 988, 850);
  gradient.addColorStop(0, colors.softBlue);
  gradient.addColorStop(0.48, '#fffdf7');
  gradient.addColorStop(1, '#ffe6ad');
  fillRoundRect(ctx, 96, 284, 888, 572, 52, gradient);

  ctx.strokeStyle = 'rgba(47,95,179,0.36)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(138, 688);
  ctx.bezierCurveTo(286, 560, 396, 764, 550, 642);
  ctx.bezierCurveTo(696, 526, 786, 596, 944, 454);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(29,23,20,0.18)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(166, 380);
  ctx.bezierCurveTo(326, 456, 438, 344, 606, 450);
  ctx.bezierCurveTo(734, 532, 850, 478, 936, 560);
  ctx.stroke();

  previewItems.forEach((item, index) => {
    const x = 172 + (index % 3) * 292 + (index === 4 ? 146 : 0);
    const y = index < 3 ? 394 + (index % 2) * 82 : 650;
    fillRoundRect(ctx, x, y, 126, 104, 28, colors.card);
    strokeRoundRect(ctx, x, y, 126, 104, 28, colors.ink, 5);
    drawText(ctx, formatCatCardNumberForItem(item), x + 63, y + 45, {
      font: posterNumberFont(26),
      color: colors.cobalt,
      align: 'center',
      baseline: 'middle',
    });
    drawText(ctx, '貓', x + 63, y + 80, {
      font: '900 30px "Noto Sans TC", system-ui, sans-serif',
      color: colors.ink,
      align: 'center',
      baseline: 'middle',
    });
  });

  fillRoundRect(ctx, 72, 928, 936, 156, 42, colors.honey);
  strokeRoundRect(ctx, 72, 928, 936, 156, 42, colors.ink, 6);
  drawText(ctx, countLabel, 120, 1004, {
    font: '900 48px "Noto Sans TC", system-ui, sans-serif',
  });
  drawText(ctx, includeMemo
    ? (language === 'zh' ? '分享頁會顯示公開備註' : 'Shared page includes public memos')
    : (language === 'zh' ? '備註預設不公開' : 'Memos stay private by default'),
  120, 1054, {
    font: '900 26px "Noto Sans TC", system-ui, sans-serif',
    color: colors.muted,
  });

  await drawBrandFooter(ctx, shareUrl);
  return canvasToBlob(canvas);
};

const copyText = async (text: string) => {
  await navigator.clipboard?.writeText(text);
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const sharePosterBlob = async ({
  blob,
  fileName,
  title,
  text,
  url,
}: PosterSharePayload): Promise<SharePosterResult> => {
  const file = new File([blob], fileName, { type: blob.type || 'image/png' });
  const shareText = ensureUrlInText(text, url);
  const canShareFile = Boolean(navigator.canShare?.({ files: [file] }));

  if (navigator.share && canShareFile) {
    try {
      await navigator.share({
        files: [file],
        title,
        text: shareText,
        url,
      });
      return 'shared-file';
    } catch (error) {
      if (isAbortError(error)) return 'aborted';
    }
  }

  await copyText(shareText).catch(() => undefined);
  downloadBlob(blob, fileName);

  if (navigator.share) {
    try {
      await navigator.share({ title, text: shareText, url });
      return 'shared-text';
    } catch (error) {
      if (isAbortError(error)) return 'aborted';
    }
  }

  return 'downloaded';
};

export const prepareSingleCatPosterShare = async ({
  item,
  language,
  shareUrl,
}: {
  item: ScrapbookItem;
  language: Language;
  shareUrl: string;
  includeMemo?: boolean;
}) => {
  const blob = await createCatCardPosterBlob(item, language, shareUrl);
  const number = formatCatCardNumberForItem(item).replace('.', '-').toLowerCase();

  return {
    blob,
    fileName: `found-cat-${number}.png`,
    title: '轉角遇到貓 / FOUND CAT',
    text: buildCatCardPosterShareText(item, language).replace(APP_SHARE_URL, shareUrl),
    url: shareUrl,
  };
};

export const shareCatCardPoster = async (item: ScrapbookItem, language: Language) => {
  return sharePosterBlob(await prepareSingleCatPosterShare({
    item,
    language,
    shareUrl: APP_SHARE_URL,
  }));
};

export const prepareCatMapPosterShare = async ({
  title,
  items,
  language,
  includeMemo,
}: CatMapPosterInput) => {
  const payload = buildMapSharePayload(items, { title, includeMemo, language });
  const shareUrl = new URL(buildMapSharePath(payload), APP_SHARE_URL).toString();
  const blob = await createCatMapPosterBlob({ title: payload.title, items, language, includeMemo, shareUrl });

  return {
    blob,
    fileName: 'found-cat-map.png',
    title: '轉角遇到貓 / FOUND CAT',
    text: buildCatMapPosterShareText({ title: payload.title, count: payload.cats.length, language }).replace(APP_SHARE_URL, shareUrl),
    url: shareUrl,
  };
};

export const shareCatMapPoster = async (input: CatMapPosterInput) => {
  return sharePosterBlob(await prepareCatMapPosterShare(input));
};

export const shareCatdexPoster = async ({
  displayName,
  items,
  language,
}: CatdexPosterInput) => {
  const blob = await createCatdexPosterBlob({ displayName, items, language });
  return sharePosterBlob({
    blob,
    fileName: 'found-cat-map.png',
    title: language === 'zh' ? '分享我的貓咪地圖' : 'Share My Cat Map',
    text: buildCatdexPosterShareText({ displayName, count: items.length, language }),
    url: APP_SHARE_URL,
  });
};
