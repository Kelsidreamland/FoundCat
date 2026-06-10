import { Suspense, lazy, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrapbookStore } from '../store/useScrapbookStore';
import Cropper from 'react-easy-crop';
import { Camera, Image as ImageIcon, Check, X, Undo2, Loader2, Crop, ZoomIn, ZoomOut, MapPin, Plus, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations } from '../translations';
import LocationPicker from '../components/LocationPicker';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import { imageBlobToHeroDataUrl } from '../lib/imageData';
import { buildStickerDraft } from '../lib/createStickerDraft';

type PixelCrop = { x: number; y: number; width: number; height: number };

const SingleCatPosterPreviewModal = lazy(() => import('../components/share/SingleCatPosterPreviewModal'));

const resizeBlobToMaxSize = async (blob: Blob, maxWidthOrHeight: number): Promise<Blob> => {
  if (maxWidthOrHeight <= 0) return blob;

  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image load failed'));
    });

    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (!srcW || !srcH) return blob;

    const scale = Math.min(1, maxWidthOrHeight / Math.max(srcW, srcH));
    const dstW = Math.max(1, Math.round(srcW * scale));
    const dstH = Math.max(1, Math.round(srcH * scale));
    if (dstW === srcW && dstH === srcH) return blob;

    const canvas = document.createElement('canvas');
    canvas.width = dstW;
    canvas.height = dstH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(img, 0, 0, dstW, dstH);

    const out = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9);
    });

    return out ?? blob;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const getCroppedImg = async (imageSrc: string, pixelCrop: PixelCrop): Promise<Blob> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Image load failed'));
  });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      0.92
    );
  });
};

const createHeroImageData = async (blob: Blob): Promise<string | undefined> => {
  try {
    return await imageBlobToHeroDataUrl(blob);
  } catch (error) {
    console.warn('Hero image generation failed; saving sticker without hero image', error);
    return undefined;
  }
};

const blobToDataUrl = async (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
  reader.readAsDataURL(blob);
});

export default function Create() {
  const navigate = useNavigate();
  const { items, addItem, updateItem, language, targetDate, setTargetDate } = useScrapbookStore();
  const t = translations[language];
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewHeroImageData, setPreviewHeroImageData] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [createdStickerId, setCreatedStickerId] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [postCreateItemId, setPostCreateItemId] = useState<string | null>(null);
  const [showPosterPreview, setShowPosterPreview] = useState(false);
  const postCreateItem = postCreateItemId ? items.find((item) => item.id === postCreateItemId) ?? null : null;

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const finishCreateFlow = useCallback(() => {
    const cameFromCalendar = targetDate;
    setTargetDate(null);
    setCreatedStickerId(null);
    setShowLocationPicker(false);
    setPostCreateItemId(null);
    setShowPosterPreview(false);
    navigate(cameFromCalendar ? `/?showCalendar=1&selectedDate=${cameFromCalendar}` : '/');
  }, [navigate, setTargetDate, targetDate]);

  const beginPostCreateFlow = useCallback((stickerId: string) => {
    setCreatedStickerId(stickerId);
    setPostCreateItemId(null);
    setShowPosterPreview(false);
    setImageSrc(null);
    setPreviewImage(null);
    setPreviewHeroImageData(null);
    setPreviewMode(false);
    setShowLocationPicker(true);
  }, []);

  const handleLocationPicked = useCallback(async (location: {
    lat: number;
    lng: number;
    name: string;
    address?: string;
    placeId?: string;
  }) => {
    if (createdStickerId) {
      await updateItem(createdStickerId, { location });
      const catId = createdStickerId;
      setTargetDate(null);
      setCreatedStickerId(null);
      setShowLocationPicker(false);
      setPostCreateItemId(catId);
      setShowPosterPreview(false);
      return;
    }
    finishCreateFlow();
  }, [createdStickerId, finishCreateFlow, setTargetDate, updateItem]);

  const handleLocationSkipped = useCallback(() => {
    finishCreateFlow();
  }, [finishCreateFlow]);

  const handleViewCreatedCatOnMap = useCallback(() => {
    if (!postCreateItemId) return;
    navigate(`/map?cat=${encodeURIComponent(postCreateItemId)}`);
  }, [navigate, postCreateItemId]);

  const handleCreateAnother = useCallback(() => {
    setPostCreateItemId(null);
    setShowPosterPreview(false);
    setCreatedStickerId(null);
    setShowLocationPicker(false);
    setImageSrc(null);
    setPreviewImage(null);
    setPreviewHeroImageData(null);
    setPreviewMode(false);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, []);

  const onCropComplete = useCallback((_croppedArea: PixelCrop, croppedAreaPixels: PixelCrop) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsProcessing(true);
      let file: File | Blob = e.target.files[0];
      
      try {
        const fileName = (file as File).name?.toLowerCase() || '';
        if (file.type === 'image/heic' || file.type === 'image/heif' || fileName.endsWith('.heic') || fileName.endsWith('.heif')) {
          try {
            console.log("Converting HEIC to JPEG...");
            const { default: heic2any } = await import('heic2any');
            const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.8 });
            file = Array.isArray(converted) ? converted[0] : converted;
          } catch (heicError) {
            console.error("HEIC conversion failed:", heicError);
          }
        }

        // 1. Compress the image to a safe size using browser-image-compression
        // This handles EXIF orientation and resizes the image safely without massive memory spikes
        const { default: imageCompression } = await import('browser-image-compression');
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1500,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file as File, options);

        // 2. Use ObjectURL instead of Base64 (FileReader) to avoid Out-Of-Memory (OOM) crashes on mobile browsers
        const objectUrl = URL.createObjectURL(compressedFile);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setPreviewImage(null);
        setPreviewHeroImageData(null);
        setPreviewMode(false);
        setImageSrc(objectUrl);
        setIsProcessing(false);
      } catch (error) {
        console.error("Error processing file, falling back to original:", error);
        
        // Fallback: directly create an ObjectURL from the original file
        try {
          const objectUrl = URL.createObjectURL(file);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setPreviewImage(null);
          setPreviewHeroImageData(null);
          setPreviewMode(false);
          setImageSrc(objectUrl);
        } catch (fallbackError) {
          console.error("Fallback ObjectURL failed:", fallbackError);
          setToastMessage(t.saveFailed || 'Failed to load image');
        }
        setIsProcessing(false);
      }
      
      // Reset input so selecting the same file again works
      e.target.value = '';
    }
  };

  const handleSquareCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const cardBlob = await resizeBlobToMaxSize(croppedBlob, 900);
      const heroImageData = await createHeroImageData(cardBlob);
      const finalImage = await blobToDataUrl(cardBlob);

      setPreviewImage(finalImage);
      setPreviewHeroImageData(heroImageData ?? null);
      setPreviewMode(true);
    } catch (e) {
      console.error('Square crop failed', e);
      setToastMessage(t.saveFailed || 'Save failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!previewImage) return;
    setIsProcessing(true);
    try {
      const createdItem = await addItem(buildStickerDraft({
        imageData: previewImage,
        heroImageData: previewHeroImageData ?? undefined,
        targetDate,
      }));
      beginPostCreateFlow(createdItem.id);
    } catch (e) {
      console.error('Save failed', e);
      setToastMessage(t.saveFailed || 'Save failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const toastOverlay = (
    <AnimatePresence>
      {toastMessage && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          className="absolute top-6 left-4 right-4 z-[200] flex justify-center pointer-events-none"
        >
          <div className="bg-[#1A1A1A] text-white px-6 py-3 rounded-full shadow-lg text-sm font-medium tracking-wider max-w-sm text-center">
            {toastMessage}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const isPostCreateFlow = showLocationPicker || Boolean(postCreateItemId);

  if (!imageSrc && !isPostCreateFlow) {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#F7F2E8]">
        <div
          className="absolute inset-0 opacity-95"
          style={{
            background:
              'linear-gradient(90deg, rgba(34,25,21,0.05) 1px, transparent 1px), linear-gradient(0deg, rgba(34,25,21,0.04) 1px, transparent 1px), radial-gradient(circle at 78% 18%, rgba(47,95,179,0.26) 0%, transparent 28%), radial-gradient(circle at 18% 84%, rgba(238,180,102,0.26) 0%, transparent 26%), #F7F2E8',
            backgroundSize: '30px 30px, 30px 30px, auto, auto, auto',
          }}
        />
        <div className="absolute -right-8 top-24 h-32 w-24 rotate-6 border-2 border-[#2F5FB3]/45 bg-[#FFFDF2]/45" aria-hidden="true" />
        <div className="absolute -left-14 bottom-24 h-28 w-32 -rotate-12 border-2 border-[#221915]/10 bg-[#FFFDF2]/30" aria-hidden="true" />
        {toastOverlay}

        <CatBrandHeader
          title={t.appName}
          subtitle={t.appSubtitle}
          showLanguageToggle={false}
          showClose
          closeLabel="關閉回首頁"
        />

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-3 sm:pt-5">
          <div className="w-full max-w-sm">
            <section className="relative overflow-hidden rounded-[10px] border-2 border-[#221915] bg-[#FFFDF2] shadow-[12px_12px_0_rgba(47,95,179,0.22)]">
              <div className="absolute left-0 right-0 top-0 h-2 bg-[#2F5FB3]" aria-hidden="true" />
              <div className="p-5 pt-6">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-[0.26em] text-[#2F5FB3]">
                      Found Cat Entry
                    </p>
                    <p className="text-[25px] font-black leading-tight text-[#221915]">
                      {t.recordNewPage}
                    </p>
                    <p className="mt-3 max-w-[230px] text-[13px] font-medium leading-relaxed text-[#5C5148]">
                      {t.takeOrSelectPhoto}
                    </p>
                  </div>
                  <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-[6px] border-2 border-dashed border-[#2F5FB3] bg-[#F7F2E8] text-[#2F5FB3]" aria-hidden="true">
                    <Camera size={24} strokeWidth={1.7} />
                  </div>
                </div>

                <div className="relative mb-5 aspect-[16/10] overflow-hidden rounded-[8px] border-2 border-[#221915] bg-[#F1E7D6]" aria-hidden="true">
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,253,242,0.92)_0%,rgba(255,253,242,0.92)_42%,rgba(47,95,179,0.92)_42%,rgba(47,95,179,0.92)_62%,rgba(34,25,21,0.08)_62%)]" />
                  <div className="absolute left-5 top-5 h-20 w-24 -rotate-6 rounded-[8px] border-2 border-[#221915] bg-[#FFFDF2] shadow-[5px_5px_0_rgba(34,25,21,0.12)]" />
                  <img
                    src="/cat-icon-512.png"
                    alt=""
                    className="absolute left-10 top-4 h-28 w-28 -rotate-3 object-contain drop-shadow-[5px_8px_0_rgba(47,95,179,0.16)]"
                    draggable={false}
                  />
                  <div className="absolute bottom-3 right-3 rounded-[4px] border-2 border-[#221915] bg-[#FFFDF2] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#221915]">
                    Found Cat
                  </div>
                </div>

                <div
                  role="group"
                  aria-label={language === 'zh' ? '新增貓咪照片來源' : 'New cat photo source'}
                  className="grid grid-cols-2 gap-3"
                >
                  <label
                    htmlFor="camera-input"
                    className="group flex min-h-[126px] cursor-pointer flex-col justify-between rounded-[8px] border-2 border-[#221915] bg-[#2F5FB3] p-4 text-white shadow-[5px_5px_0_rgba(34,25,21,0.14)] transition-transform active:translate-x-[1px] active:translate-y-[1px] focus-within:ring-2 focus-within:ring-[#3B82F6]/50"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-[8px] border-2 border-[#221915] bg-[#FFFDF2] text-[#221915]">
                      {isProcessing ? <Loader2 size={21} className="animate-spin" /> : <Camera size={21} />}
                    </span>
                    <span className="text-[15px] font-black leading-snug tracking-[0.04em]">
                      {t.openCamera}
                    </span>
                    <input
                      id="camera-input"
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      disabled={isProcessing}
                      aria-label="Take Photo"
                    />
                  </label>

                  <label
                    htmlFor="album-input"
                    className="group flex min-h-[126px] cursor-pointer flex-col justify-between rounded-[8px] border-2 border-[#221915] bg-[#FFFDF2] p-4 text-[#221915] shadow-[5px_5px_0_rgba(47,95,179,0.22)] transition-transform active:translate-x-[1px] active:translate-y-[1px] focus-within:ring-2 focus-within:ring-[#3B82F6]/50"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-[8px] border-2 border-[#221915] bg-[#F1E7D6] text-[#221915]">
                      {isProcessing ? <Loader2 size={21} className="animate-spin" /> : <ImageIcon size={21} />}
                    </span>
                    <span className="text-[15px] font-black leading-snug tracking-[0.04em]">
                      {t.chooseFromAlbum}
                    </span>
                    <input
                      id="album-input"
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="sr-only"
                      disabled={isProcessing}
                      aria-label="Upload from Album"
                    />
                  </label>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    );
  }

  if (!imageSrc && postCreateItemId) {
    return (
      <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#F7F2E8]">
        <div
          className="absolute inset-0 opacity-95"
          style={{
            background:
              'linear-gradient(90deg, rgba(34,25,21,0.05) 1px, transparent 1px), linear-gradient(0deg, rgba(34,25,21,0.04) 1px, transparent 1px), radial-gradient(circle at 82% 16%, rgba(47,95,179,0.24) 0%, transparent 27%), radial-gradient(circle at 14% 86%, rgba(247,201,72,0.32) 0%, transparent 25%), #F7F2E8',
            backgroundSize: '30px 30px, 30px 30px, auto, auto, auto',
          }}
        />
        <div className="absolute -right-10 top-28 h-28 w-24 rotate-6 border-2 border-[#2F5FB3]/35 bg-[#FFFDF2]/45" aria-hidden="true" />
        <div className="absolute -left-12 bottom-28 h-28 w-32 -rotate-12 border-2 border-[#221915]/10 bg-[#FFFDF2]/35" aria-hidden="true" />
        {toastOverlay}

        <CatBrandHeader
          title={t.appName}
          subtitle={t.appSubtitle}
          showLanguageToggle={false}
          showClose
          closeLabel="關閉回首頁"
        />

        <main className="relative z-10 flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-3">
          <section
            aria-live="polite"
            className="w-full max-w-sm overflow-hidden rounded-[14px] border-2 border-[#221915] bg-[#FFFDF2] shadow-[12px_12px_0_rgba(47,95,179,0.22)]"
          >
            <div className="h-2 bg-[#2F5FB3]" aria-hidden="true" />
            <div className="p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.26em] text-[#2F5FB3]">
                    Found Cat Saved
                  </p>
                  <h1 className="text-[25px] font-black leading-tight text-[#221915]">
                    {t.postCreateSavedToMapTitle}
                  </h1>
                  <p className="mt-3 text-[13px] font-bold leading-relaxed text-[#5C5148]">
                    {t.postCreateSuccessSubtitle}
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[8px] border-2 border-[#221915] bg-[#F7C948] text-[#221915] shadow-[4px_4px_0_rgba(47,95,179,0.2)]" aria-hidden="true">
                  <Check size={24} strokeWidth={2.3} />
                </div>
              </div>

              {postCreateItem ? (
                <div className="mb-4 flex items-center gap-3 rounded-[12px] border-2 border-[#221915]/15 bg-[#F7F2E8] p-3">
                  <img
                    src={postCreateItem.imageData}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-[10px] border-2 border-[#221915] object-cover shadow-[3px_3px_0_rgba(34,25,21,0.12)]"
                    draggable={false}
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2F5FB3]">
                      {postCreateItem.location?.name || t.map}
                    </p>
                    <p className="mt-1 text-sm font-black leading-snug text-[#221915]">
                      {postCreateItem.catName?.trim() || t.postCreateDefaultCatName}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleViewCreatedCatOnMap}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border-2 border-[#221915] bg-[#2F5FB3] px-4 py-3 text-sm font-black text-[#FFFDF2] shadow-[4px_4px_0_#221915] transition-all active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2F5FB3]"
                >
                  <MapPin size={18} strokeWidth={2.2} />
                  <span>{t.postCreateViewMapCat}</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowPosterPreview(true)}
                    disabled={!postCreateItem?.location}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-[16px] border-2 border-[#221915] bg-[#FFFDF2] px-3 py-3 text-[12px] font-black text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.18)] transition-all active:translate-y-[1px] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2F5FB3]"
                  >
                    <Share2 size={17} strokeWidth={2.2} />
                    <span className="break-keep text-center leading-tight">{t.postCreateSharePoster}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateAnother}
                    className="flex min-h-12 items-center justify-center gap-2 rounded-[16px] border-2 border-[#221915] bg-[#F7C948] px-3 py-3 text-[12px] font-black text-[#221915] shadow-[3px_3px_0_rgba(34,25,21,0.14)] transition-all active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2F5FB3]"
                  >
                    <Plus size={17} strokeWidth={2.2} />
                    <span className="break-keep text-center leading-tight">{t.postCreateAddAnother}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <AnimatePresence>
          {showPosterPreview && postCreateItem?.location ? (
            <Suspense fallback={null}>
              <SingleCatPosterPreviewModal
                item={postCreateItem}
                language={language}
                onClose={() => setShowPosterPreview(false)}
              />
            </Suspense>
          ) : null}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-[#fff7e8]">
      {toastOverlay}

      {imageSrc ? (
        <>
          {/* Header */}
          <header className="absolute inset-x-0 top-0 z-50 flex h-20 items-center justify-start bg-gradient-to-b from-[#fff7e8]/95 to-transparent px-5 pt-[max(1rem,env(safe-area-inset-top))]">
            <button
              onClick={() => {
                navigate('/');
              }}
              className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#221915] bg-[#fffdf2] text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.18)] transition-colors hover:bg-[#fff2cf] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
              disabled={isProcessing}
              aria-label={t.cancel || 'Cancel'}
            >
              <X size={21} strokeWidth={2.2} />
            </button>
          </header>

          {previewMode ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-20">
              <div className="flex-1 flex items-center justify-center w-full max-w-sm">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 24, stiffness: 260 }}
                  className="relative rounded-[18px] border-2 border-[#221915] bg-[#fffdf2] p-4 shadow-[8px_8px_0_rgba(47,95,179,0.24)]"
                >
                  <img
                    src={previewImage!}
                    alt={t.previewSticker || 'Sticker preview'}
                    className="max-h-[46vh] max-w-full rounded-[12px] object-contain"
                  />
                </motion.div>
              </div>

              <div className="mt-6 flex w-full max-w-sm gap-3 rounded-[22px] border-2 border-[#221915] bg-[#fffdf2]/94 p-3 shadow-[6px_6px_0_rgba(47,95,179,0.2)]">
                <button
                  onClick={() => {
                    setPreviewMode(false);
                    setPreviewImage(null);
                    setPreviewHeroImageData(null);
                  }}
                  disabled={isProcessing}
                  className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[16px] border-2 border-[#221915]/25 bg-[#fffaf0] px-4 py-3 font-black text-[#221915] shadow-[2px_2px_0_rgba(34,25,21,0.1)] transition-all active:translate-y-[1px] disabled:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
                >
                  <Undo2 size={18} strokeWidth={2} />
                  <span className="text-[12px] uppercase tracking-[0.06em]">{t.recrop}</span>
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={isProcessing}
                  className="flex min-h-12 flex-[2] items-center justify-center gap-2 rounded-[16px] border-2 border-[#221915] bg-[#2F5FB3] px-4 py-3 font-black text-[#fffdf2] shadow-[3px_3px_0_#221915] transition-all active:translate-y-[1px] disabled:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
                >
                  {isProcessing ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={18} strokeWidth={2} />
                      <span className="text-[12px] uppercase tracking-[0.06em]">{t.confirmSave}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Cropper Area */}
              <div className="relative flex-1 bg-[#fff7e8]">
                <div
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    background: 'linear-gradient(90deg, rgba(34,25,21,0.05) 1px, transparent 1px), linear-gradient(0deg, rgba(34,25,21,0.04) 1px, transparent 1px), radial-gradient(circle at 72% 22%, rgba(47,95,179,0.16) 0%, transparent 30%), #fff7e8',
                    backgroundSize: '30px 30px, 30px 30px, auto, auto',
                  }}
                />
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                  cropShape="rect"
                  showGrid={false}
                  style={{
                    containerStyle: { background: 'transparent' },
                  }}
                />

                {/* Style Preview Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <AnimatePresence>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="h-[min(100vw,100vh)] w-[min(100vw,100vh)] rounded-[10%] border-[2px] border-dashed border-[#2F5FB3]/45 bg-white/10"
                    />
                  </AnimatePresence>
                </div>
              </div>

              {/* Zoom Slider */}
              <div className="mx-auto flex w-full max-w-sm items-center gap-3 px-6 py-2">
                <ZoomOut size={16} className="shrink-0 text-[#2F5FB3]" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="h-1.5 flex-1 appearance-none rounded-full bg-[#d9ecff] accent-[#2F5FB3] outline-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#221915] [&::-webkit-slider-thumb]:bg-[#2F5FB3] [&::-webkit-slider-thumb]:shadow-md"
                  aria-label="Zoom level"
                />
                <ZoomIn size={16} className="shrink-0 text-[#2F5FB3]" />
              </div>

              {/* Bottom Controls */}
              <div
                data-testid="crop-control-sheet"
                className="z-10 flex flex-col items-center rounded-t-[24px] border-t-2 border-[#221915] bg-[#fffdf2]/94 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_34px_rgba(47,95,179,0.18)] backdrop-blur-xl transition-all duration-300"
              >
                <div className="flex w-full max-w-sm justify-center">
                  <button
                    onClick={handleSquareCrop}
                    disabled={isProcessing}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] border-2 border-[#221915] bg-[#2F5FB3] px-6 py-3 text-[#fffdf2] shadow-[4px_4px_0_#221915] transition-all active:translate-y-[1px] disabled:opacity-80 disabled:active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2f5fb3]"
                    aria-label={t.squareCrop}
                  >
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Crop size={18} strokeWidth={2} />}
                    <span className="text-[12px] font-black uppercase tracking-[0.08em]">{t.squareCrop}</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      ) : null}

      {showLocationPicker ? (
        <LocationPicker
          onPicked={handleLocationPicked}
          onClose={handleLocationSkipped}
          language={language}
        />
      ) : null}
    </div>
  );
}
