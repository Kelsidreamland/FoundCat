import type { ScrapbookItem } from '../../store/useScrapbookStore';
import CatdexLabel from './CatdexLabel';

interface HeroCatCardProps {
  item: ScrapbookItem | null;
  emptyText?: string;
  imageAlt?: string;
  catdexLabel?: string;
}

export default function HeroCatCard({
  item,
  emptyText = '今天還沒有遇見貓',
  imageAlt = '最新遇見的貓咪',
  catdexLabel,
}: HeroCatCardProps) {
  if (!item) {
    return (
      <div className="relative flex h-[276px] w-full items-center justify-center overflow-hidden rounded-[12px] border-2 border-[#211915] bg-[#fffdf2] p-6 shadow-[8px_8px_0_rgba(47,95,179,0.78)]">
        <div className="absolute left-5 top-5 flex h-16 w-16 rotate-[-10deg] items-center justify-center rounded-full border-2 border-[#2f5fb3] text-3xl font-black text-[#2f5fb3] opacity-80">
          〒
        </div>
        <div className="absolute -bottom-8 -right-7 h-28 w-40 rotate-[-10deg] border-2 border-[#211915]/12 bg-[#d9c6a8]/35" />
        <p className="max-w-[12rem] text-center text-lg font-black leading-7 text-black">
          {emptyText}
        </p>
      </div>
    );
  }

  const heroSrc = item.heroImageData || item.imageData;

  return (
    <figure className="relative h-[292px] w-full rounded-[12px] border-2 border-[#211915] bg-[#fffdf2] p-3 shadow-[8px_8px_0_rgba(47,95,179,0.82)]">
      <div className="absolute left-6 top-6 z-20 flex h-10 w-10 rotate-[-8deg] items-center justify-center border-2 border-[#211915] bg-[#fffdf2]/90 text-xl font-black leading-none text-[#2f5fb3] shadow-[3px_3px_0_rgba(33,25,21,0.78)]">
        〒
      </div>

      <div className="relative h-full overflow-hidden rounded-[8px] border-2 border-[#211915] bg-[#d9c6a8]">
        <img
          data-testid="hero-base-photo"
          src={heroSrc}
          alt={imageAlt}
          className="h-full w-full object-cover brightness-[0.96] contrast-[1.06] saturate-[0.86] sepia-[0.18]"
          draggable={false}
        />
        <div className="pointer-events-none absolute inset-0 bg-[#d9c6a8]/18 mix-blend-multiply" />
        <div className="pointer-events-none absolute inset-3 rounded-[3px] border border-[#fffdf2]/70 mix-blend-screen" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#211915]/34 to-transparent" />
      </div>

      <div
        className="pointer-events-none absolute -right-1 top-12 z-30 h-[210px] w-[70%] rotate-[2deg] bg-[#fffdf2] p-[7px] shadow-[9px_9px_0_rgba(47,95,179,0.72)]"
        style={{
          clipPath: 'polygon(5% 8%, 92% 3%, 98% 22%, 94% 96%, 18% 92%, 2% 78%)',
        }}
      >
        <div
          className="h-full w-full border-2 border-[#211915] bg-white"
          style={{
            clipPath: 'polygon(5% 8%, 92% 3%, 98% 22%, 94% 96%, 18% 92%, 2% 78%)',
          }}
        >
          <img
            data-testid="hero-cutout-sticker"
            src={item.imageData}
            alt=""
            aria-hidden="true"
            className="h-full w-full scale-[1.08] object-contain drop-shadow-[0_5px_0_rgba(33,25,21,0.16)]"
            draggable={false}
          />
        </div>
      </div>

      <div className="absolute bottom-5 right-5 z-40 rotate-[-2deg]">
        <CatdexLabel catdexNumber={item.catdexNumber} label={catdexLabel} />
      </div>
    </figure>
  );
}
