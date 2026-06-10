import { useState } from 'react';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { CAT_BREEDS, CatBreedId } from '../data/catBreeds';
import { CAT_COLORS, CatColorId } from '../data/catColors';
import { translations } from '../translations';
import { X, Check, Tag, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CatTaggerProps {
  stickerId: string;
  onComplete: () => void;
}

export default function CatTagger({ stickerId, onComplete }: CatTaggerProps) {
  const { updateItem, language } = useScrapbookStore();
  const t = translations[language];
  const [selectedBreed, setSelectedBreed] = useState<CatBreedId | null>(null);
  const [selectedColor, setSelectedColor] = useState<CatColorId | null>(null);
  const [step, setStep] = useState<'breed' | 'color'>('breed');

  const handleSave = async () => {
    await updateItem(stickerId, {
      catBreed: selectedBreed ?? undefined,
      catColor: selectedColor ?? undefined,
    });
    onComplete();
  };

  const handleSkip = () => {
    if (step === 'breed') {
      setStep('color');
    } else {
      onComplete();
    }
  };

  const breedLabel = (b: typeof CAT_BREEDS[number]) => language === 'zh' ? b.zh : b.en;
  const colorLabel = (c: typeof CAT_COLORS[number]) => language === 'zh' ? c.zh : c.en;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] bg-cat-dark/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full max-w-md bg-cat-card rounded-t-[32px] sm:rounded-[32px] p-6 shadow-cat-whisper border border-cat-border-light max-h-[70vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-cat-text-main tracking-wider">
              {step === 'breed' ? (
                <span className="flex items-center gap-2"><Tag size={20} /> {t.catBreed}</span>
              ) : (
                <span className="flex items-center gap-2"><Palette size={20} /> {t.catColor}</span>
              )}
            </h3>
            <button
              onClick={handleSkip}
              className="text-cat-text-tertiary hover:text-cat-text-main bg-cat-bg rounded-full p-2 transition-colors"
              aria-label="Skip"
            >
              <X size={18} />
            </button>
          </div>

          {step === 'breed' ? (
            <div className="flex flex-wrap gap-2 mb-6">
              {CAT_BREEDS.map((breed) => (
                <button
                  key={breed.id}
                  onClick={() => {
                    setSelectedBreed(breed.id === selectedBreed ? null : breed.id);
                    setStep('color');
                  }}
                  className={`px-4 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all active:scale-95 ${
                    selectedBreed === breed.id
                      ? 'bg-cat-brand text-white shadow-cat-whisper'
                      : 'bg-cat-bg text-cat-text-secondary hover:bg-cat-sand border border-cat-border-light'
                  }`}
                >
                  {breedLabel(breed)}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 mb-6">
              {CAT_COLORS.map((color) => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id === selectedColor ? null : color.id)}
                  className={`px-4 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all active:scale-95 ${
                    selectedColor === color.id
                      ? 'bg-cat-brand text-white shadow-cat-whisper'
                      : 'bg-cat-bg text-cat-text-secondary hover:bg-cat-sand border border-cat-border-light'
                  }`}
                >
                  {colorLabel(color)}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 py-3.5 rounded-full text-sm font-bold tracking-wider text-cat-text-tertiary hover:text-cat-text-main bg-cat-bg border border-cat-border-light transition-colors"
            >
              {step === 'breed' ? t.catColor : language === 'zh' ? '跳過' : 'Skip'}
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3.5 rounded-full text-sm font-bold tracking-wider bg-cat-text-main text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <Check size={18} />
              <span>{t.done}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
