import { describe, expect, it } from 'vitest';
import {
  getPaperNavPress,
  getPaperSheetMotion,
  paperMotion,
} from './uiMotion';

describe('paper motion presets', () => {
  it('uses the approved restrained timing and paper spring', () => {
    expect(paperMotion.duration).toEqual({
      instant: 0.12,
      quick: 0.18,
      standard: 0.24,
    });
    expect(paperMotion.spring).toMatchObject({
      stiffness: 420,
      damping: 34,
      mass: 0.72,
    });
  });

  it('keeps the paper rotation and short entrance in normal motion', () => {
    const preset = getPaperSheetMotion(false);

    expect(preset.sheet.initial).toMatchObject({
      opacity: 0,
      y: 26,
      rotate: -0.8,
      scale: 0.98,
    });
    expect(preset.sheet.animate).toMatchObject({
      opacity: 1,
      y: 0,
      rotate: -0.35,
      scale: 1,
    });
  });

  it('removes decorative transforms when reduced motion is active', () => {
    const preset = getPaperSheetMotion(true);

    expect(preset.sheet.initial).toEqual({ opacity: 0 });
    expect(preset.sheet.animate).toEqual({ opacity: 1 });
    expect(getPaperNavPress(true, 'side')).toEqual({});
    expect(getPaperNavPress(true, 'capture')).toEqual({});
  });

  it('keeps tactile press movement within the approved limits', () => {
    expect(getPaperNavPress(false, 'side')).toEqual({ y: 2, scale: 0.96 });
    expect(getPaperNavPress(false, 'capture')).toEqual({ y: 2, scale: 0.97 });
  });
});
