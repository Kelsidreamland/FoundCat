import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getNameSuggestions } from '../../lib/catNameGenerator';
import type { ScrapbookItem } from '../../store/useScrapbookStore';

/**
 * Right after saving, ask once what the cat is called. One tap on a suggestion is enough;
 * skipping keeps the generated nickname.
 */
export default function QuickNamePrompt({
  item,
  language,
  onSave,
}: {
  item: ScrapbookItem;
  language: 'zh' | 'en';
  onSave: (catName: string) => void;
}) {
  const suggestions = useMemo(() => getNameSuggestions(item, language), [item, language]);
  const [name, setName] = useState('');
  const trimmed = name.trim();

  return (
    <form
      data-testid="quick-name-prompt"
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed) onSave(trimmed);
      }}
      className="rounded-[16px] border-2 border-[#221915] bg-[#fffdf2] p-3 shadow-[3px_3px_0_rgba(47,95,179,0.16)]"
    >
      <label htmlFor="quick-cat-name" className="text-sm font-black text-[#221915]">
        {language === 'zh' ? '牠叫什麼名字？' : 'What is this cat called?'}
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="quick-cat-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={suggestions[0]}
          maxLength={24}
          className="min-w-0 flex-1 rounded-[12px] border border-[#221915]/20 bg-white px-3 py-2 text-base text-[#221915] focus:outline-none focus:ring-2 focus:ring-[#2f5fb3]"
        />
        <button
          type="submit"
          disabled={!trimmed}
          aria-label={language === 'zh' ? '存下名字' : 'Save name'}
          className="grid min-h-10 w-11 shrink-0 place-items-center rounded-[12px] border-2 border-[#221915] bg-[#2f5fb3] text-white disabled:opacity-40"
        >
          <Check size={18} strokeWidth={2.8} />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5" aria-label={language === 'zh' ? '名字建議' : 'Name ideas'}>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSave(suggestion)}
            className="min-h-8 rounded-full border border-[#221915]/15 bg-[#fff2cf] px-3 text-xs font-black text-[#221915]"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </form>
  );
}
