import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookItem } from '../../store/useScrapbookStore';
import EncounterTimeline from './EncounterTimeline';
import { sortEncounters } from '../../lib/encounters';

const cat = (extra: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: 'cat-1', type: 'sticker', imageData: 'data:image/png;base64,first', date: '2026-10-01T08:00:00.000Z',
  x: 0, y: 0, rotation: 0, scale: 1, zIndex: 1, ...extra,
});

describe('EncounterTimeline', () => {
  afterEach(() => cleanup());

  it('counts the first meeting and lists later ones newest first', () => {
    render(
      <EncounterTimeline
        item={cat({ encounters: [
          { id: 'a', date: '2026-10-05T08:00:00.000Z', note: '在巷口' },
          { id: 'b', date: '2026-11-02T08:00:00.000Z', note: '在屋頂' },
        ] })}
        language="zh"
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('遇見 3 次')).toBeInTheDocument();
    const items = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('在屋頂');
    expect(items[1]).toHaveTextContent('在巷口');
    expect(items[2]).toHaveTextContent('第一次遇見');
  });

  it('records a new encounter with a note and can delete one', () => {
    const onChange = vi.fn();
    const existing = { id: 'a', date: '2026-10-05T08:00:00.000Z' };
    render(<EncounterTimeline item={cat({ encounters: [existing] })} language="zh" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '又遇到牠了' }));
    fireEvent.change(screen.getByPlaceholderText('今天牠在做什麼？（可略過）'), { target: { value: ' 在睡覺 ' } });
    fireEvent.click(screen.getByRole('button', { name: '記下這次相遇' }));
    const saved = onChange.mock.calls[0][0];
    expect(saved).toHaveLength(2);
    expect(saved[1]).toMatchObject({ note: '在睡覺' });
    expect(saved[1].id).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '刪除這次相遇' }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('sorts by date regardless of insertion order', () => {
    expect(sortEncounters([
      { id: 'old', date: '2026-01-01' },
      { id: 'new', date: '2026-06-01' },
    ]).map((e) => e.id)).toEqual(['new', 'old']);
  });
});
