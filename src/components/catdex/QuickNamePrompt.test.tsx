import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookItem } from '../../store/useScrapbookStore';
import QuickNamePrompt from './QuickNamePrompt';
import { getNameSuggestions } from '../../lib/catNameGenerator';

const item: ScrapbookItem = {
  id: 'cat-abc', type: 'sticker', imageData: '', date: '2026-01-01', x: 0, y: 0, rotation: 0, scale: 1, zIndex: 1, catdexNumber: 5,
};

describe('QuickNamePrompt', () => {
  afterEach(() => cleanup());

  it('offers the generated nickname first plus stable friendly ideas', () => {
    const ideas = getNameSuggestions(item, 'zh');
    expect(ideas[0]).toBe('轉角小貓 005');
    expect(ideas.length).toBeGreaterThanOrEqual(2);
    expect(getNameSuggestions(item, 'zh')).toEqual(ideas);
  });

  it('saves a tapped suggestion or a typed name', () => {
    const onSave = vi.fn();
    render(<QuickNamePrompt item={item} language="zh" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: getNameSuggestions(item, 'zh')[1] }));
    expect(onSave).toHaveBeenLastCalledWith(getNameSuggestions(item, 'zh')[1]);

    expect(screen.getByRole('button', { name: '存下名字' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('牠叫什麼名字？'), { target: { value: ' 小白 ' } });
    fireEvent.click(screen.getByRole('button', { name: '存下名字' }));
    expect(onSave).toHaveBeenLastCalledWith('小白');
  });
});
