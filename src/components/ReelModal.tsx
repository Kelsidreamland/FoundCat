import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { ScrapbookItem, useScrapbookStore } from '../store/useScrapbookStore';
import { Download, Loader2, RotateCcw, Share2, Shuffle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { translations, formatDate } from '../translations';

const foundCatLogoUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 120">
  <rect x="4" y="10" width="300" height="94" rx="18" fill="#fffdf2" stroke="#221915" stroke-width="6"/>
  <rect x="244" y="0" width="54" height="54" rx="14" transform="rotate(9 271 27)" fill="#f7c948" stroke="#221915" stroke-width="5"/>
  <path d="M28 88c28-8 64-10 108-4" fill="none" stroke="#2f5fb3" stroke-width="5" stroke-linecap="round" opacity=".62"/>
  <g transform="translate(32 30)">
    <rect width="58" height="58" rx="15" fill="#d9ecff" stroke="#221915" stroke-width="5"/>
    <path d="M19 27 12 10l18 10 18-10-7 17c5 6 5 18-2 23H21c-7-5-7-17-2-23Z" fill="#fffdf2" stroke="#221915" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="24" cy="34" r="3.5" fill="#221915"/>
    <circle cx="36" cy="34" r="3.5" fill="#221915"/>
    <path d="M28 42h5" stroke="#2f5fb3" stroke-width="4" stroke-linecap="round"/>
  </g>
  <text x="108" y="55" fill="#221915" font-family="Arial, sans-serif" font-size="30" font-weight="900">轉角遇到貓</text>
  <text x="110" y="82" fill="#2f5fb3" font-family="Arial, sans-serif" font-size="18" font-weight="900" letter-spacing="4">FOUND CAT</text>
</svg>
`)}`;

interface ReelModalProps {
  items: ScrapbookItem[];
  onClose: () => void;
}

type Step = 'layout' | 'render' | 'done';

type LayoutItem = {
  x: number;
  y: number;
  r: number;
  s: number;
};

type LayoutNormalized = {
  id: string;
  cx: number;
  cy: number;
  r: number;
  s: number;
};

const PREVIEW_ITEM_SIZE = 72;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

async function loadImage(url: string) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = url;
  await new Promise<void>((resolve) => {
    img.onload = () => resolve();
    img.onerror = () => resolve();
  });
  return img;
}

export default function ReelModal({ items, onClose }: ReelModalProps) {
  const { language } = useScrapbookStore();
  const t = translations[language];
  const [step, setStep] = useState<Step>('layout');
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [progress, setProgress] = useState(0);
  const [layout, setLayout] = useState<Record<string, LayoutItem>>({});
  const [layoutNormalized, setLayoutNormalized] = useState<LayoutNormalized[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  
  // Track pinch gesture state
  const pinchStateRef = useRef({ distance: 0, scaleAtStart: 1, angleAtStart: 0, rotationAtStart: 0 });

  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const animationRef = useRef<number>();

  const itemIdsStr = useMemo(() => items.map(i => i.id).join('|'), [items]);

  const resetLayout = useCallback(() => {
    const el = previewRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxX = Math.max(0, rect.width - PREVIEW_ITEM_SIZE);
    const maxY = Math.max(0, rect.height - PREVIEW_ITEM_SIZE - 120); // Keep stickers away from the bottom logo
    const minY = 40;
    const next: Record<string, LayoutItem> = {};
    for (const item of items) {
      const rxMax = Math.max(0, maxX);
      const ryMax = Math.max(minY, maxY);
      const xMin = Math.min(24, rxMax);
      const yMin = Math.min(minY, ryMax);
      next[item.id] = {
        x: randomBetween(xMin, rxMax),
        y: randomBetween(yMin, ryMax),
        r: randomBetween(-18, 18),
        s: 1,
      };
    }
    setLayout(next);
  }, [items]);

  const shuffleLayout = () => {
    const el = previewRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const maxX = Math.max(0, rect.width - PREVIEW_ITEM_SIZE);
    const maxY = Math.max(0, rect.height - PREVIEW_ITEM_SIZE - 120); // Keep stickers away from the bottom logo
    const minY = 40;
    setLayout(prev => {
      const next: Record<string, LayoutItem> = { ...prev };
      for (const item of items) {
        const current = next[item.id] ?? { x: 0, y: 0, r: 0, s: 1 };
        const rxMax = Math.max(0, maxX);
        const ryMax = Math.max(minY, maxY);
        const xMin = Math.min(18, rxMax);
        const yMin = Math.min(minY, ryMax);
        next[item.id] = {
          ...current,
          x: randomBetween(xMin, rxMax),
          y: randomBetween(yMin, ryMax),
          r: randomBetween(-22, 22),
        };
      }
      return next;
    });
  };

  useEffect(() => {
    if (step !== 'layout') return;
    const t = window.setTimeout(() => {
      resetLayout();
    }, 0);
    return () => window.clearTimeout(t);
  }, [step, itemIdsStr, resetLayout]);

  useEffect(() => {
    let isActive = true;
    if (step !== 'render') return;

    const generateReel = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 1080;
      canvas.height = 1920;

      if (!isActive) return;

      chunksRef.current = [];
      setProgress(0);
      setVideoBlob(null);
      setVideoUrl(null);

      const dateText = formatDate(new Date(), language, { year: 'numeric', month: 'long', day: 'numeric' });
      // Ensure images are preloaded before recording starts
      const logoImgDefault = await loadImage(foundCatLogoUrl);
      const enLogoImg = logoImgDefault;
      const bgImg = await loadImage(
        'data:image/svg+xml;base64,' + btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs><radialGradient id="g1" cx="20%" cy="15%" r="50%"><stop offset="0%" stop-color="rgba(255,190,140,0.5)"/><stop offset="100%" stop-color="#faf6ee"/></radialGradient><radialGradient id="g2" cx="80%" cy="25%" r="50%"><stop offset="0%" stop-color="rgba(255,160,180,0.4)"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="1080" height="1920" fill="#faf6ee"/><rect width="1080" height="1920" fill="url(#g1)"/><rect width="1080" height="1920" fill="url(#g2)"/></svg>`)
      );

      const images = await Promise.all(
        items.map(async (item) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = item.imageData;
          await new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          });
          return { id: item.id, img };
        })
      );

      const byId = new Map(images.map(i => [i.id, i.img]));

      setIsRecording(true);
      try {
        const stream = canvas.captureStream(30);
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          setVideoBlob(blob);
          setVideoUrl(url);
          setIsRecording(false);
          setStep('done');
        };
        mediaRecorder.start();
      } catch {
        setIsRecording(false);
        setStep('layout');
        return;
      }

      const totalFrames = 30 * 6;

      let frame = 0;
      const drawFrame = () => {
        if (!isActive) return;
        if (frame > totalFrames) {
          if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
          return;
        }

        const t = frame / totalFrames;
        setProgress(Math.round(t * 100));

        if (bgImg && bgImg.width) {
          // Draw the beautiful textured background
          ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
        } else {
          ctx.fillStyle = '#FDFBF7';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw elegant grid
        ctx.strokeStyle = 'rgba(140, 122, 107, 0.06)';
        ctx.lineWidth = 2;
        const gridSize = 80;
        for (let i = 0; i < canvas.width; i += gridSize) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
        }
        for (let i = 0; i < canvas.height; i += gridSize) {
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
        }

        ctx.textAlign = 'center';
        
        const logoAspect = 460 / 150;
        const titleW = 360; // Smaller, more elegant size
        const titleH = titleW / logoAspect;
        
        // Select the preloaded logo based on language
        // Add a fallback to the default logo if the English one fails to load
        const currentLogoImg = language === 'en' && enLogoImg.width > 0 ? enLogoImg : logoImgDefault;
        
        const bottomPadding = 240; // Distance from bottom
        const logoY = canvas.height - bottomPadding;

        // Draw the logo with reduced opacity for elegance
        ctx.globalAlpha = 0.7;
        ctx.drawImage(currentLogoImg || logoImgDefault, (canvas.width - titleW) / 2, logoY, titleW, titleH);
        ctx.globalAlpha = 1.0;

        // Draw elegant divider
        const dividerY = logoY + titleH + 45;
        const dividerW = 60;
        ctx.strokeStyle = 'rgba(140, 122, 107, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo((canvas.width - dividerW) / 2, dividerY);
        ctx.lineTo((canvas.width + dividerW) / 2, dividerY);
        ctx.stroke();

        // Draw Date in minimal style
        ctx.font = '500 24px "Noto Sans TC", "M PLUS Rounded 1c", "PingFang TC", sans-serif';
        ctx.fillStyle = 'rgba(140, 122, 107, 0.85)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Use standard canvas spacing if available, otherwise fallback
        const spacedContext = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
        if ('letterSpacing' in spacedContext) {
          spacedContext.letterSpacing = '8px';
        }
        
        // Add spaces manually for environments without letterSpacing support
        const spacedDateText = dateText.split('').join(String.fromCharCode(8202)); 
        ctx.fillText(spacedDateText.toUpperCase(), canvas.width / 2, dividerY + 50);
        
        if ('letterSpacing' in spacedContext) {
          spacedContext.letterSpacing = '0px';
        }
        ctx.textBaseline = 'alphabetic';

        layoutNormalized.forEach((p, index) => {
          const img = byId.get(p.id);
          if (!img) return;

          const appearAt = (index / Math.max(1, layoutNormalized.length)) * 0.55;
          const local = (t - appearAt) / 0.25;
          if (local <= 0) return;
          const k = clamp(local, 0, 1);
          const ease = 1 + Math.pow(k - 1, 3);

          const cx = p.cx * canvas.width;
          const cy = p.cy * canvas.height;
          const rot = (p.r * Math.PI) / 180;

          const base = 280;
          const aspect = img.width / Math.max(1, img.height);
          const w = aspect > 1 ? base : base * aspect;
        const h = aspect > 1 ? base / aspect : base;

        const fly = (1 - k) * 110;

        // Reset context state for each image to prevent clipping path inheritance
        // Ensure no clipping mask is active from roundedRect
        ctx.save();
        ctx.translate(cx, cy + fly);
        ctx.rotate(rot);
        ctx.scale(ease * p.s, ease * p.s);
          ctx.shadowColor = 'rgba(0,0,0,0.14)';
          ctx.shadowBlur = 26;
          ctx.shadowOffsetY = 12;
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
          ctx.restore();
        });

        frame += 1;
        animationRef.current = requestAnimationFrame(drawFrame);
      };

      drawFrame();
    };

    generateReel();

    return () => {
      isActive = false;
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    };
  }, [step, items, layoutNormalized, language]);

  const handleConfirmLayout = () => {
    const el = previewRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);

    const norm: LayoutNormalized[] = items.map((item) => {
      const p = layout[item.id] ?? { x: 0, y: 0, r: 0, s: 1 };
      const cx = (p.x + PREVIEW_ITEM_SIZE / 2) / w;
      const cy = (p.y + PREVIEW_ITEM_SIZE / 2) / h;
      return { id: item.id, cx: clamp(cx, 0, 1), cy: clamp(cy, 0, 1), r: p.r, s: p.s };
    });
    setLayoutNormalized(norm);
    setStep('render');
  };

  const handleShare = async () => {
    if (!videoBlob) return;
    const file = new File([videoBlob], `reel-${Date.now()}.webm`, { type: 'video/webm' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: t.reelShareTitle,
          text: t.reelShareText,
          files: [file],
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      alert(t.browserNotSupportShare);
    }
  };

  const handleBackToLayout = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setIsRecording(false);
    setVideoBlob(null);
    setVideoUrl(null);
    setStep('layout');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#FDFBF7] flex items-center justify-center p-0 sm:p-6">
      <div className="w-full h-[100dvh] sm:h-[90vh] sm:max-h-[90vh] sm:rounded-[32px] sm:max-w-md relative flex flex-col overflow-hidden bg-white shadow-[0_20px_60px_rgba(140,122,107,0.15)] border-x border-[#E8E6DC] sm:border">
        
        {/* Header - Moved outside the video area */}
        <div className="shrink-0 z-50 flex items-center justify-between p-4 bg-white border-b border-[#E8E6DC]">
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F4F1EA] text-[#4A433D] hover:bg-[#E8E6DC] transition-colors focus-visible:ring-2 focus-visible:ring-[#8C7A6B] outline-none" aria-label="Close">
            <X size={18} strokeWidth={1.5} />
          </button>
          <div className="flex flex-col items-center">
            <div className="text-[11px] font-bold tracking-[0.2em] text-[#4A433D] uppercase">FOUND CAT JOURNAL</div>
            <div className="text-[9px] font-medium tracking-widest text-[#8C7A6B]">{formatDate(new Date(), language, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
          </div>
          {step === 'done' ? (
            <button onClick={handleBackToLayout} className="text-[10px] font-bold tracking-wider px-3 py-2 rounded-full bg-[#F4F1EA] text-[#4A433D] hover:bg-[#E8E6DC] transition-colors focus-visible:ring-2 focus-visible:ring-[#8C7A6B] outline-none">
              {t.backToLayout}
            </button>
          ) : (
            <div className="w-9 h-9" /> /* Spacer for centering */
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 relative flex items-center justify-center bg-[#F4F1EA] overflow-hidden p-3 sm:p-6">
          <div className="w-full max-w-full aspect-[9/16] relative bg-[#FDFBF7] shadow-xl mx-auto overflow-hidden ring-1 ring-black/5">
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at 20% 15%, rgba(255,190,140,0.5) 0%, transparent 45%), radial-gradient(ellipse at 80% 25%, rgba(255,160,180,0.4) 0%, transparent 40%), radial-gradient(ellipse at 50% 70%, rgba(240,200,150,0.4) 0%, transparent 50%), #faf6ee',
              }}
            />
            
            <AnimatePresence>
              {step === 'layout' && (
                <motion.div
                  key="layout"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0"
                >
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Subtle aesthetic frame overlay instead of vignette */}
                    <div className="absolute inset-4 border border-[#8C7A6B]/10 rounded-lg pointer-events-none" />
                    
                    <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-4 z-10 pointer-events-none">
                      <img 
                        src={foundCatLogoUrl}
                        alt="轉角遇到貓 FOUND CAT Logo"
                        className="h-8 sm:h-9 object-contain opacity-80" 
                      />
                      <div className="w-8 h-[1px] bg-[#8C7A6B]/20" />
                      <div className="text-center text-[#8C7A6B] font-medium tracking-[0.25em] text-[9px] sm:text-[10px] uppercase opacity-90">
                        {formatDate(new Date(), language, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                    </div>
                  </div>

                  <div ref={previewRef} className="absolute inset-0" onClick={() => setSelectedStickerId(null)}>
                    {items.map((item) => {
                      const p = layout[item.id];
                      if (!p) return null;
                      const isSelected = selectedStickerId === item.id;
                      return (
                        <motion.div
                          key={item.id}
                          drag
                          dragConstraints={previewRef}
                          dragElastic={0.08}
                          dragMomentum={false}
                          onDragStart={() => setSelectedStickerId(item.id)}
                          onDragEnd={(_, info) => {
                            setLayout(prev => {
                              const current = prev[item.id];
                              if (!current) return prev;
                              const el = previewRef.current;
                              if (!el) return prev;
                              const rect = el.getBoundingClientRect();
                              const maxX = rect.width - PREVIEW_ITEM_SIZE;
                              const maxY = rect.height - PREVIEW_ITEM_SIZE;
                              const nx = clamp(current.x + info.offset.x, 0, Math.max(0, maxX));
                              const ny = clamp(current.y + info.offset.y, 0, Math.max(0, maxY));
                              return { ...prev, [item.id]: { ...current, x: nx, y: ny } };
                            });
                          }}
                          onPointerDown={(e) => {
                            e.stopPropagation();
                            setSelectedStickerId(item.id);
                          }}
                          onTap={() => {
                            // Don't stop propagation if we want to allow deselecting
                            setSelectedStickerId(item.id);
                          }}
                          onTouchStart={(e) => {
                            if (e.touches.length === 2 && isSelected) {
                              const dx = e.touches[0].clientX - e.touches[1].clientX;
                              const dy = e.touches[0].clientY - e.touches[1].clientY;
                              const dist = Math.hypot(dx, dy);
                              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                              pinchStateRef.current = { 
                                distance: dist, 
                                scaleAtStart: p.s, 
                                angleAtStart: angle, 
                                rotationAtStart: p.r 
                              };
                            }
                          }}
                          onTouchMove={(e) => {
                            if (e.touches.length === 2 && isSelected) {
                              // Try to prevent default if possible to avoid scrolling/zooming the page
                              if (e.cancelable) e.preventDefault();
                              const dx = e.touches[0].clientX - e.touches[1].clientX;
                              const dy = e.touches[0].clientY - e.touches[1].clientY;
                              const dist = Math.hypot(dx, dy);
                              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                              
                              const scale = pinchStateRef.current.scaleAtStart * (dist / pinchStateRef.current.distance);
                              const rotationDiff = angle - pinchStateRef.current.angleAtStart;
                              const rotation = pinchStateRef.current.rotationAtStart + rotationDiff;
                              
                              setLayout(prev => {
                                const current = prev[item.id];
                                if (!current) return prev;
                                return { ...prev, [item.id]: { ...current, s: clamp(scale, 0.3, 3), r: rotation } };
                              });
                            }
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setLayout(prev => {
                              const current = prev[item.id];
                              if (!current) return prev;
                              return { ...prev, [item.id]: { ...current, r: current.r + 25 } };
                            });
                          }}
                          style={{
                            position: 'absolute',
                            width: PREVIEW_ITEM_SIZE,
                            height: PREVIEW_ITEM_SIZE,
                            left: 0,
                            top: 0,
                            x: p.x,
                            y: p.y,
                            rotate: p.r,
                            scale: p.s,
                            zIndex: isSelected ? 30 : 10,
                          }}
                          className="cursor-grab active:cursor-grabbing touch-none hover:z-20"
                          whileTap={{ scale: p.s * 1.03 }}
                        >
                          {isSelected && (
                            <div className="absolute -inset-2 border-2 border-dashed border-[#8C7A6B]/50 rounded-lg pointer-events-none" />
                          )}
                          <motion.div
                            className="w-full h-full"
                            animate={{
                              y: isSelected ? 0 : [0, -4, 0],
                              rotate: [0, (item.id.charCodeAt(0) % 6) - 3, 0],
                            }}
                            transition={{
                              duration: 4 + (item.id.charCodeAt(0) % 3),
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 1.1, rotate: (item.id.charCodeAt(0) % 20) - 10 }}
                          >
                            <img
                              src={item.imageData}
                              alt="sticker"
                              className="w-full h-full object-contain pointer-events-none"
                              style={{
                                filter: 'drop-shadow(0px 8px 16px rgba(140,122,107,0.25)) drop-shadow(0px 2px 4px rgba(140,122,107,0.15))',
                              }}
                              draggable={false}
                            />
                          </motion.div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {step !== 'layout' && (
                <motion.div
                  key="render"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#FDFBF7]"
                >
                  <canvas ref={canvasRef} className="w-full h-full object-contain" style={{ display: videoUrl ? 'none' : 'block' }} />
                  {videoUrl && (
                    <video src={videoUrl} autoPlay loop muted playsInline className="w-full h-full object-contain" />
                  )}
                  {isRecording && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md text-[#4A433D]">
                      <Loader2 size={40} className="animate-spin mb-6 text-[#8C7A6B]" strokeWidth={1.5} />
                      <div className="text-[13px] font-bold tracking-[0.2em] mb-4 uppercase">{t.generating}</div>
                      <div className="w-48 h-1 bg-[#E8E6DC] rounded-full overflow-hidden">
                        <div className="h-full bg-[#8C7A6B] transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="p-6 bg-white shrink-0 border-t border-[#E8E6DC] shadow-[0_-10px_40px_rgba(140,122,107,0.05)] z-20 relative">
          {step === 'layout' && (
            <div className="flex items-center justify-between gap-3 max-w-sm mx-auto">
              <button onClick={shuffleLayout} className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2 text-[#8C7A6B] hover:text-[#4A433D] transition-colors focus-visible:ring-2 focus-visible:ring-[#8C7A6B] outline-none rounded-xl">
                <Shuffle size={20} strokeWidth={1.5} />
                <span className="text-[10px] font-bold tracking-widest uppercase">{t.shuffle}</span>
              </button>
              <button onClick={resetLayout} className="flex-1 flex flex-col items-center justify-center gap-1.5 py-2 text-[#8C7A6B] hover:text-[#4A433D] transition-colors focus-visible:ring-2 focus-visible:ring-[#8C7A6B] outline-none rounded-xl">
                <RotateCcw size={20} strokeWidth={1.5} />
                <span className="text-[10px] font-bold tracking-widest uppercase">{t.reset}</span>
              </button>
              <button onClick={handleConfirmLayout} className="flex-[2] flex items-center justify-center py-3.5 px-6 rounded-full bg-[#1A1A1A] hover:bg-black transition-colors text-white shadow-lg shadow-black/10 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#8C7A6B] outline-none">
                <span className="text-[11px] font-bold tracking-[0.15em] uppercase">{t.generateVideo}</span>
              </button>
            </div>
          )}

          <AnimatePresence>
            {step === 'done' && videoUrl && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center max-w-sm mx-auto">
                <div className="flex w-full gap-3">
                  <a href={videoUrl} download={`corner-cat-reel-${Date.now()}.webm`} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#F4F1EA] text-[#4A433D] rounded-full hover:bg-[#E8E6DC] transition-all active:scale-[0.98]">
                    <Download size={18} strokeWidth={1.5} />
                    <span className="text-[11px] font-bold tracking-[0.15em] uppercase">{t.saveVideo}</span>
                  </a>
                  <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#1A1A1A] text-white rounded-full shadow-lg shadow-black/10 hover:bg-black transition-all active:scale-[0.98]">
                    <Share2 size={18} strokeWidth={1.5} />
                    <span className="text-[11px] font-bold tracking-[0.15em] uppercase">{t.shareIG}</span>
                  </button>
                </div>
                <p className="text-[#8C7A6B] text-[10px] text-center mt-4 tracking-wider">
                  {t.shareWarning}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
