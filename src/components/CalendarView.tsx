import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrapbookItem, useScrapbookStore } from '../store/useScrapbookStore';
import { X, Plus, Trash2, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { translations, formatDate } from '../translations';
import { shareCatCardPoster } from '../lib/sharePoster';

export default function CalendarView({ currentDate }: { currentDate: Date }) {
  const navigate = useNavigate();
  const { items, language, setTargetDate, removeItem } = useScrapbookStore();
  const t = translations[language];
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<ScrapbookItem | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      setSelectedDate((e as CustomEvent).detail);
    };
    window.addEventListener('openCalendarDate', handler);
    return () => window.removeEventListener('openCalendarDate', handler);
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const toLocalDateStr = (isoDate: string) => {
    const d = new Date(isoDate);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const itemsByDate = useMemo(() => {
    const grouped: Record<string, typeof items> = {};
    items.forEach(item => {
      const dateStr = toLocalDateStr(item.date);
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(item);
    });
    return grouped;
  }, [items]);

  const todayStr = toLocalDateStr(new Date().toISOString());
  const weekDays = [t.mon, t.tue, t.wed, t.thu, t.fri, t.sat, t.sun];

  return (
    <div className="w-full h-full flex flex-col pt-24 px-4 pb-32 overflow-y-auto">
      {/* Main Calendar Card */}
      <div className="bg-cat-card border border-cat-border-light shadow-cat-whisper rounded-[24px] p-4 sm:p-6 mb-6 shrink-0">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-4">
          {weekDays.map((day, idx) => (
            <div key={idx} className="text-center text-xs font-medium text-cat-text-tertiary">{day}</div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-y-4 gap-x-2">
          {Array.from({ length: startingDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayItems = itemsByDate[dateStr] || [];

            return (
              <button
                key={dayNum}
                onClick={() => setSelectedDate(dateStr)}
                className="relative aspect-square flex flex-col items-center justify-center bg-cat-bg/60 rounded-2xl border border-cat-border-warm/50 shadow-sm overflow-hidden outline-none cursor-pointer hover:ring-2 hover:ring-cat-brand/50 focus-visible:ring-2 focus-visible:ring-cat-brand transition-all active:scale-95"
                aria-label={`View items for ${dateStr}`}
              >
                <span className={`absolute z-0 font-bold text-lg ${dayItems.length > 0 ? 'text-cat-text-tertiary/20' : 'text-cat-text-secondary'}`}>
                  {dayNum}
                </span>

                {dayItems.length > 0 && (
                  <div className="relative w-[74%] h-[74%] flex items-center justify-center z-10">
                    <div className="w-full h-full flex items-center justify-center">
                      {dayItems[0].type === 'stamp' ? (
                        <div
                          className="w-full h-full bg-white p-1 flex flex-col"
                          style={{
                            maskImage: 'radial-gradient(circle at 1.5px 1.5px, transparent 1.5px, black 2px)',
                            maskSize: '5px 5px',
                            maskPosition: '-1.5px -1.5px',
                            WebkitMaskImage: 'radial-gradient(circle at 1.5px 1.5px, transparent 1.5px, black 2px)',
                            WebkitMaskSize: '5px 5px',
                            WebkitMaskPosition: '-1.5px -1.5px',
                            filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.15))',
                            WebkitFilter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.15))',
                          }}
                        >
                          <div className="flex-1 overflow-hidden relative mb-[2px]">
                            <img src={dayItems[0].imageData} alt="Stamp" className="absolute inset-0 w-full h-full object-cover filter contrast-125 saturate-75" />
                          </div>
                          <div className="text-center text-[4px] text-cat-text-tertiary font-bold tracking-widest uppercase opacity-70">
                            {formatDate(new Date(dayItems[0].date), 'en', { year: '2-digit', month: 'short' })}
                          </div>
                        </div>
                      ) : (
                        <img
                          src={dayItems[0].imageData}
                          className="w-full h-full object-contain"
                          style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15)) drop-shadow(0px 1px 2px rgba(0,0,0,0.1))' }}
                          alt="sticker"
                        />
                      )}
                    </div>
                    {dayItems.length > 1 && (
                      <div className="absolute -top-1 -right-1 z-20 bg-cat-brand text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                        {dayItems.length}
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Today Overview */}
      <div className="bg-cat-card border border-cat-border-light shadow-cat-whisper rounded-[24px] p-6 mb-24 shrink-0">
        <h3 className="text-sm font-bold text-cat-text-main mb-4">{t.todayOverview}</h3>
        <div className="flex items-center gap-4 text-cat-text-secondary text-sm">
          {itemsByDate[todayStr]?.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full">
              {itemsByDate[todayStr].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedDate(todayStr)}
                  className="w-12 h-12 shrink-0 cursor-pointer flex items-center justify-center active:scale-90 transition-transform"
                >
                  <img
                    src={item.imageData}
                    className="w-full h-full object-contain"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                    alt="sticker"
                  />
                </button>
              ))}
            </div>
          ) : (
            <span className="opacity-60">{t.noRecordToday}</span>
          )}
        </div>
      </div>

      {/* Date Detail Modal */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-cat-dark/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-cat-card w-full max-w-md max-h-[80vh] rounded-[32px] p-6 shadow-cat-whisper relative overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedDate(null)}
                className="absolute top-6 right-6 text-cat-text-tertiary hover:text-cat-text-main bg-cat-bg rounded-full p-2 transition-colors focus-visible:ring-2 focus-visible:ring-cat-brand outline-none"
                aria-label="Close"
              >
                <X size={20} />
              </button>

              <h3 className="text-2xl font-bold text-cat-text-main mb-6 text-center tracking-widest">
                {formatDate(new Date(selectedDate + 'T00:00:00'), language, { month: 'long', day: 'numeric' })} {t.dailyOf}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {itemsByDate[selectedDate]?.map((item, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={item.id}
                    className="aspect-square bg-cat-bg rounded-2xl flex items-center justify-center p-4 border border-cat-border-light shadow-sm cursor-pointer active:scale-95 transition-transform"
                    onClick={() => setPreviewItem(item)}
                  >
                    {item.type === 'stamp' ? (
                      <div
                        className="w-full h-full bg-white p-2 flex flex-col"
                        style={{
                          maskImage: 'radial-gradient(circle at 2px 2px, transparent 2px, black 2.5px)',
                          maskSize: '6px 6px',
                          maskPosition: '-2px -2px',
                          WebkitMaskImage: 'radial-gradient(circle at 2px 2px, transparent 2px, black 2.5px)',
                          WebkitMaskSize: '6px 6px',
                          WebkitMaskPosition: '-2px -2px',
                          filter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.15))',
                          WebkitFilter: 'drop-shadow(1px 2px 3px rgba(0,0,0,0.15))',
                        }}
                      >
                        <div className="flex-1 overflow-hidden relative mb-1">
                          <img src={item.imageData} alt="Stamp" className="absolute inset-0 w-full h-full object-cover filter contrast-125 saturate-75" />
                        </div>
                        <div className="text-center text-[6px] text-cat-text-tertiary font-bold tracking-widest uppercase opacity-70">
                          {formatDate(new Date(item.date), 'en', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    ) : (
                      <img
                        src={item.imageData}
                        className="w-full h-full object-contain"
                        style={{ filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.15)) drop-shadow(0px 1px 2px rgba(0,0,0,0.1))' }}
                        alt="sticker"
                      />
                    )}
                  </motion.div>
                ))}
              </div>

              {(!itemsByDate[selectedDate] || itemsByDate[selectedDate].length === 0) && (
                <div className="flex flex-col items-center justify-center py-8 text-cat-text-tertiary">
                  <div className="w-16 h-16 mb-4 flex items-center justify-center text-4xl opacity-50">✨</div>
                  <p className="text-sm font-medium tracking-wider">{t.noRecordToday}</p>
                </div>
              )}

              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => { setTargetDate(selectedDate); navigate('/create'); }}
                  className="flex items-center gap-2 bg-cat-text-secondary text-white px-8 py-4 rounded-full hover:opacity-80 transition-colors shadow-lg active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-cat-brand outline-none"
                >
                  <Plus size={20} strokeWidth={2} />
                  <span className="text-[12px] font-bold tracking-[0.15em] uppercase">{t.addRecordBtn || 'ADD RECORD'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticker Preview Modal */}
      <AnimatePresence>
        {previewItem ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-cat-dark/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              className="relative w-full max-w-sm bg-cat-card rounded-[32px] p-6 shadow-cat-whisper border border-cat-border-light"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-4 right-4 text-cat-text-tertiary hover:text-cat-text-main bg-cat-bg rounded-full p-2 transition-colors focus-visible:ring-2 focus-visible:ring-cat-brand outline-none"
                aria-label="Close"
              >
                <X size={20} />
              </button>
              <div className="min-h-[280px] flex items-center justify-center p-4">
                <img
                  src={previewItem.imageData}
                  alt="Selected sticker"
                  className="max-w-full max-h-[44vh] object-contain"
                  style={{ filter: 'drop-shadow(2px 8px 18px rgba(0,0,0,0.18)) drop-shadow(0px 2px 4px rgba(0,0,0,0.12))' }}
                />
              </div>
              <div className="text-center px-4 mb-4">
                <div className="inline-block px-4 py-2 bg-cat-bg rounded-xl border border-cat-border-light shadow-sm">
                  <p className="text-cat-text-secondary text-xs font-bold tracking-widest uppercase">
                    {formatDate(new Date(previewItem.date), language, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => shareCatCardPoster(previewItem, language)}
                  className="flex items-center gap-2 bg-cat-card text-cat-text-main border border-cat-border-light px-5 py-3 rounded-full font-bold tracking-wider shadow-sm hover:bg-cat-bg transition-colors focus-visible:ring-2 focus-visible:ring-cat-brand outline-none"
                >
                  <Share2 size={18} />
                  <span className="text-[12px] uppercase">{t.share}</span>
                </button>
                <button
                  onClick={async () => {
                    if (window.confirm('確定要刪除這個圖鑑嗎？')) {
                      await removeItem(previewItem.id);
                      setPreviewItem(null);
                    }
                  }}
                  className="flex items-center gap-2 bg-cat-text-secondary text-white px-5 py-3 rounded-full font-bold tracking-wider shadow-sm hover:opacity-80 transition-colors focus-visible:ring-2 focus-visible:ring-cat-brand outline-none"
                >
                  <Trash2 size={18} />
                  <span className="text-[12px] uppercase">Delete</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
