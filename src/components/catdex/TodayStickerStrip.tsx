import type { ScrapbookItem } from '../../store/useScrapbookStore';

interface TodayStickerStripProps {
  items: ScrapbookItem[];
  title?: string;
  emptyText?: string;
  stickerAlt?: string;
  getStickerAlt?: (item: ScrapbookItem, index: number) => string;
}

const rotations = ['-rotate-3', 'rotate-2', '-rotate-1'];
const stickerClips = [
  'polygon(7% 5%, 89% 2%, 97% 24%, 92% 94%, 18% 99%, 2% 76%)',
  'polygon(12% 2%, 98% 9%, 92% 88%, 68% 98%, 4% 91%, 2% 18%)',
  'polygon(4% 12%, 84% 2%, 99% 28%, 89% 98%, 8% 90%, 1% 38%)',
];

export default function TodayStickerStrip({
  items,
  title = '今天的貼紙',
  emptyText = '拍到更多貓後，牠們會在這裡變成剪報貼紙。',
  stickerAlt = '今天遇見的貓咪貼紙',
  getStickerAlt,
}: TodayStickerStripProps) {
  const visibleItems = items.slice(0, 3);

  return (
    <section className="w-full">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[0.78rem] font-black uppercase tracking-[0.12em] text-[#211915]">
          {title}
        </h2>
        <div className="h-px flex-1 bg-[#211915]/20" />
      </div>

      {visibleItems.length === 0 ? (
        <div className="rounded-[10px] border-2 border-dashed border-[#211915]/35 bg-[#fffdf2]/78 px-4 py-5 shadow-[3px_3px_0_rgba(33,25,21,0.12)]">
          <p className="text-sm font-bold leading-6 text-[#6a5f54]">
            {emptyText}
          </p>
        </div>
      ) : (
        <div className="flex h-32 items-center gap-3 overflow-hidden px-1">
          {visibleItems.map((item, index) => (
            <div
              key={item.id}
              className={`h-28 w-24 shrink-0 bg-[#fffdf2] p-[6px] shadow-[4px_6px_0_rgba(47,95,179,0.26)] ${rotations[index]}`}
              style={{
                clipPath: stickerClips[index],
              }}
            >
              <div
                className="h-full w-full border-2 border-[#211915] bg-white"
                style={{
                  clipPath: stickerClips[index],
                }}
              >
                <img
                  src={item.imageData}
                  alt={getStickerAlt?.(item, index) ?? stickerAlt}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
