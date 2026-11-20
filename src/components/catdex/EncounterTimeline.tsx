import { Camera, Eye, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { imageBlobToHeroDataUrl } from '../../lib/imageData';
import type { CatEncounter, ScrapbookItem } from '../../store/useScrapbookStore';

const ENCOUNTER_PHOTO_MAX_SIZE = 720;

const formatEncounterDate = (date: string, language: 'zh' | 'en') => {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  // Month and day are enough for this year; older meetings get the year too.
  const sameYear = parsed.getFullYear() === new Date().getFullYear();
  return parsed.toLocaleDateString(language === 'zh' ? 'zh-TW' : 'en-US', {
    ...(sameYear ? {} : { year: 'numeric' as const }),
    month: 'short',
    day: 'numeric',
  });
};

const copy = {
  zh: {
    title: '相遇紀錄',
    count: (n: number) => `遇見 ${n} 次`,
    add: '又遇到牠了',
    first: '第一次遇見',
    addPhoto: '加一張照片（可略過）',
    changePhoto: '換一張照片',
    notePlaceholder: '今天牠在做什麼？（可略過）',
    save: '記下這次相遇',
    cancel: '取消',
    remove: '刪除這次相遇',
    photoFailed: '這張照片讀不到，換一張試試。',
  },
  en: {
    title: 'Encounters',
    count: (n: number) => `Met ${n} time${n === 1 ? '' : 's'}`,
    add: 'Met it again',
    first: 'First meeting',
    addPhoto: 'Add a photo (optional)',
    changePhoto: 'Change photo',
    notePlaceholder: 'What was it up to? (optional)',
    save: 'Save this encounter',
    cancel: 'Cancel',
    remove: 'Delete this encounter',
    photoFailed: 'Could not read that photo. Try another one.',
  },
};

/** Sort newest first; encounters added later may carry earlier dates when backfilled. */
export const sortEncounters = (encounters: CatEncounter[] = []) => (
  [...encounters].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
);

export default function EncounterTimeline({
  item,
  language,
  onChange,
}: {
  item: ScrapbookItem;
  language: 'zh' | 'en';
  onChange: (encounters: CatEncounter[]) => void;
}) {
  const t = copy[language];
  const encounters = sortEncounters(item.encounters);
  const [isAdding, setIsAdding] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>();
  const [note, setNote] = useState('');
  const [isReadingPhoto, setIsReadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setIsAdding(false);
    setPhoto(undefined);
    setNote('');
    setPhotoError(false);
  };

  const handlePhoto = async (file: File | undefined) => {
    if (!file) return;
    setIsReadingPhoto(true);
    setPhotoError(false);
    try {
      setPhoto(await imageBlobToHeroDataUrl(file, ENCOUNTER_PHOTO_MAX_SIZE));
    } catch {
      setPhotoError(true);
    } finally {
      setIsReadingPhoto(false);
    }
  };

  const save = () => {
    const encounter: CatEncounter = {
      id: uuidv4(),
      date: new Date().toISOString(),
      ...(photo ? { imageData: photo } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    onChange([...(item.encounters ?? []), encounter]);
    reset();
  };

  const remove = (id: string) => onChange((item.encounters ?? []).filter((encounter) => encounter.id !== id));

  return (
    <section aria-labelledby="encounter-timeline-title" className="rounded-[18px] border-2 border-[#221915] bg-[#fffdf2] p-3 shadow-[4px_4px_0_rgba(47,95,179,0.16)]">
      <div className="flex items-center justify-between gap-2">
        <h2 id="encounter-timeline-title" className="text-base font-black text-[#221915]">
          {t.title}
          <span className="ml-2 text-xs font-bold text-[#6d5f52]">{t.count(encounters.length + 1)}</span>
        </h2>
        {!isAdding ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-[#221915] bg-[#2f5fb3] px-3 text-xs font-black text-white shadow-[2px_2px_0_rgba(34,25,21,0.2)]"
          >
            <Plus size={14} strokeWidth={2.8} aria-hidden="true" />
            {t.add}
          </button>
        ) : null}
      </div>

      {isAdding ? (
        <div className="mt-3 space-y-2 rounded-[14px] border border-[#221915]/15 bg-white p-3" data-testid="encounter-form">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label={t.addPhoto}
            onChange={(event) => void handlePhoto(event.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-11 w-full items-center gap-2 rounded-[12px] border border-dashed border-[#2f5fb3]/50 px-3 text-sm font-bold text-[#2f5fb3]"
          >
            {isReadingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} aria-hidden="true" />}
            {photo ? t.changePhoto : t.addPhoto}
          </button>
          {photo ? <img src={photo} alt="" className="h-28 w-28 rounded-[10px] border border-[#221915]/15 object-cover" /> : null}
          {photoError ? <p className="text-xs font-bold text-[#9f3a2f]">{t.photoFailed}</p> : null}
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={t.notePlaceholder}
            maxLength={140}
            rows={2}
            className="w-full rounded-[12px] border border-[#221915]/20 px-3 py-2 text-base text-[#221915] focus:outline-none focus:ring-2 focus:ring-[#2f5fb3]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={isReadingPhoto}
              className="min-h-11 flex-1 rounded-[12px] border-2 border-[#221915] bg-[#2f5fb3] text-sm font-black text-white disabled:opacity-50"
            >
              {t.save}
            </button>
            <button
              type="button"
              onClick={reset}
              aria-label={t.cancel}
              className="grid min-h-11 w-11 place-items-center rounded-[12px] border border-[#221915]/20 text-[#6d5f52]"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <ol className="mt-3 space-y-2">
        {encounters.map((encounter) => (
          <li key={encounter.id} className="flex items-start gap-3 rounded-[12px] bg-[#fff7e8] p-2">
            {encounter.imageData ? (
              <img src={encounter.imageData} alt="" className="h-14 w-14 shrink-0 rounded-[8px] object-cover" />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-[8px] bg-[#d9ecff] text-[#2f5fb3]" aria-hidden="true">
                <Eye size={18} strokeWidth={2.4} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-[#2f5fb3]">{formatEncounterDate(encounter.date, language)}</p>
              {encounter.note ? <p className="mt-0.5 text-sm font-bold leading-snug text-[#221915]">{encounter.note}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => remove(encounter.id)}
              aria-label={t.remove}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[#9a8d80]"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
        <li className="flex items-start gap-3 rounded-[12px] bg-[#fff7e8] p-2">
          <img src={item.imageData} alt="" className="h-14 w-14 shrink-0 rounded-[8px] object-cover" />
          <div className="min-w-0">
            <p className="text-xs font-black text-[#2f5fb3]">{formatEncounterDate(item.date, language)}</p>
            <p className="mt-0.5 text-sm font-bold text-[#221915]">{t.first}</p>
          </div>
        </li>
      </ol>
    </section>
  );
}
