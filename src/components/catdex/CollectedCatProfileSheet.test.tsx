import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookItem } from '../../store/useScrapbookStore';
import CollectedCatProfileSheet from './CollectedCatProfileSheet';

const collectedCat: ScrapbookItem = {
  id: 'world-cat-12',
  type: 'sticker',
  imageData: 'data:image/png;base64,cat',
  date: '2026-07-14T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  publicNumber: 12,
  catName: '窗邊小虎',
  personalityTags: ['friendly'],
  location: { lat: 18.7883, lng: 98.9853, name: '泰國 清邁' },
};

describe('CollectedCatProfileSheet', () => {
  afterEach(() => {
    cleanup();
  });

  it('uses the shared paper sheet motion and keeps its actions', () => {
    const onClose = vi.fn();

    render(
      <MemoryRouter>
        <CollectedCatProfileSheet
          item={collectedCat}
          language="zh"
          onClose={onClose}
        />
      </MemoryRouter>
    );

    const dialog = screen.getByRole('dialog', { name: '窗邊小虎 貓咪個人檔案' });
    expect(screen.getByTestId('collected-cat-profile-backdrop')).toHaveAttribute(
      'data-motion-surface',
      'paper-sheet-backdrop'
    );
    expect(dialog).toHaveAttribute('data-motion-surface', 'paper-sheet');
    expect(dialog).toHaveAttribute('data-motion-context', 'collected-cat');
    expect(dialog).toHaveAttribute('data-motion-reduced', 'false');
    expect(screen.getByRole('link', { name: '查看我的貓卡' })).toHaveAttribute('href', '/catdex');

    fireEvent.click(screen.getAllByRole('button', { name: '繼續看貓' })[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
