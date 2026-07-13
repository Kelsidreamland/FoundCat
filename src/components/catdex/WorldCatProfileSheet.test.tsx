import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookItem } from '../../store/useScrapbookStore';
import WorldCatProfileSheet from './WorldCatProfileSheet';

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: overrides.id ?? 'public-cat-1',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
  heroImageData: overrides.heroImageData,
  publicNumber: overrides.publicNumber,
  catdexNumber: overrides.catdexNumber,
  date: overrides.date ?? '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location,
  catName: overrides.catName,
  catFeatureNote: overrides.catFeatureNote,
  personalityTags: overrides.personalityTags,
  spotNote: overrides.spotNote,
  careStatusTags: overrides.careStatusTags,
  isPublic: overrides.isPublic,
  collectedFromPublicId: overrides.collectedFromPublicId,
});

describe('WorldCatProfileSheet', () => {
  afterEach(() => {
    cleanup();
  });

  it('shows world cat details and keeps save/find actions explicit', () => {
    const item = makeItem({
      id: 'public-cat-1',
      publicNumber: 12,
      catName: '窗邊小虎',
      location: { lat: 18.7883, lng: 98.9853, name: '泰國 清邁', address: '清邁舊城測試路 123 號' },
      personalityTags: ['friendly', 'foodie'],
      catFeatureNote: '左耳有白毛，尾巴短短',
      spotNote: '下午會趴在木窗旁邊看路人',
      careStatusTags: ['fed'],
      isPublic: true,
    });
    const onSave = vi.fn();
    const onFind = vi.fn();

    render(
      <WorldCatProfileSheet
        item={item}
        language="zh"
        isSaved={false}
        onClose={vi.fn()}
        onSave={onSave}
        onFind={onFind}
      />
    );

    const dialog = screen.getByRole('dialog', { name: '窗邊小虎 世界貓咪檔案' });
    expect(screen.getByTestId('world-cat-profile-backdrop')).toHaveAttribute(
      'data-motion-surface',
      'paper-sheet-backdrop'
    );
    expect(dialog).toHaveAttribute('data-motion-surface', 'paper-sheet');
    expect(dialog).toHaveAttribute('data-motion-context', 'world-cat');
    expect(dialog).toHaveAttribute('data-motion-reduced', 'false');
    expect(dialog).toHaveTextContent('窗邊小虎');
    expect(dialog).toHaveTextContent('泰國 清邁');
    expect(dialog).toHaveTextContent('W-012');
    expect(screen.getByText('窗邊小虎')).toHaveClass('font-cat-display');
    expect(screen.getByText('W-012')).toHaveClass('font-cat-number');
    expect(screen.getByText('偶遇線索')).toHaveClass('font-cat-display');
    expect(screen.getByTestId('world-cat-photo-frame')).toHaveClass('h-[clamp(190px,36dvh,280px)]');
    expect(screen.getByTestId('world-cat-profile-summary')).toHaveTextContent('親人');
    expect(screen.getByTestId('world-cat-profile-summary')).toHaveTextContent('貪吃');
    expect(screen.getByTestId('world-cat-location-pill')).toHaveTextContent('泰國 清邁');
    expect(dialog).toHaveTextContent('感覺');
    expect(dialog).toHaveTextContent('親人');
    expect(dialog).toHaveTextContent('貪吃');
    expect(dialog).toHaveTextContent('特徵');
    expect(dialog).toHaveTextContent('左耳有白毛，尾巴短短');
    expect(dialog).toHaveTextContent('偶遇線索');
    expect(dialog).toHaveTextContent('下午會趴在木窗旁邊看路人');
    expect(dialog).toHaveTextContent('照護');
    expect(dialog).toHaveTextContent('固定餵養');
    expect(dialog).not.toHaveTextContent('清邁舊城測試路 123 號');
    expect(screen.getByRole('button', { name: '去找這隻喵' })).toHaveAttribute('title', '去找這隻喵');
    expect(screen.getByRole('button', { name: '收藏' })).toHaveAttribute('title', '收藏');
    expect(screen.getByTestId('world-cat-find-icon-action')).toBeInTheDocument();
    expect(screen.getByTestId('world-cat-save-icon-action')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '去找這隻喵' }));
    expect(onFind).toHaveBeenCalledWith(item);

    fireEvent.click(screen.getByRole('button', { name: '收藏' }));
    expect(onSave).toHaveBeenCalledWith(item);
    expect(screen.getByRole('dialog', { name: '窗邊小虎 世界貓咪檔案' })).toBeInTheDocument();
  });

  it('shows short mystery copy when optional world cat details are missing', () => {
    const onSave = vi.fn();

    render(
      <WorldCatProfileSheet
        item={makeItem({
          id: 'public-cat-2',
          publicNumber: 2,
          location: { lat: 25, lng: 121, name: '台北' },
          isPublic: true,
        })}
        language="zh"
        isSaved
        onClose={vi.fn()}
        onSave={onSave}
        onFind={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog', { name: '神秘貓咪 世界貓咪檔案' });
    expect(dialog).toHaveTextContent('神秘貓咪');
    expect(dialog).toHaveTextContent('台北');
    expect(dialog).toHaveTextContent('W-002');
    expect(screen.getByTestId('world-cat-photo-frame')).toHaveClass('h-[clamp(190px,36dvh,280px)]');
    expect(screen.getByTestId('world-cat-profile-summary')).toHaveTextContent('這隻貓還很神秘。');
    expect(dialog).toHaveTextContent('這隻貓還很神秘。');
    expect(dialog).toHaveTextContent('牠曾經在這裡出現。');
    expect(dialog).not.toHaveTextContent('目前知道');
    expect(dialog).not.toHaveTextContent('等你補充');
    expect(dialog).not.toHaveTextContent('下一步');
    expect(dialog).not.toHaveTextContent('牠給人的感覺');
    expect(dialog).not.toHaveTextContent('特徵');
    expect(dialog).not.toHaveTextContent('照護狀態');
    expect(screen.getByRole('button', { name: '去找這隻喵' })).toHaveAttribute('title', '去找這隻喵');
    expect(screen.getByRole('button', { name: '已收藏' })).toHaveAttribute('title', '已收藏');
    expect(screen.getByTestId('world-cat-find-icon-action')).toBeInTheDocument();
    expect(screen.getByTestId('world-cat-save-icon-action')).toBeInTheDocument();
  });

  it('does not save again after the world cat is already collected', () => {
    const item = makeItem({
      id: 'public-cat-saved',
      publicNumber: 9,
      catName: '已收藏小貓',
      location: { lat: 25, lng: 121, name: '台北' },
      isPublic: true,
    });
    const onSave = vi.fn();

    render(
      <WorldCatProfileSheet
        item={item}
        language="zh"
        isSaved
        onClose={vi.fn()}
        onSave={onSave}
        onFind={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '已收藏' }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('guards against rapid repeated save taps before the saved state refreshes', () => {
    const item = makeItem({
      id: 'public-cat-rapid',
      publicNumber: 10,
      catName: '快手小貓',
      location: { lat: 25, lng: 121, name: '台北' },
      isPublic: true,
    });
    const onSave = vi.fn(() => Promise.resolve());

    render(
      <WorldCatProfileSheet
        item={item}
        language="zh"
        isSaved={false}
        onClose={vi.fn()}
        onSave={onSave}
        onFind={vi.fn()}
      />
    );

    const saveButton = screen.getByRole('button', { name: '收藏' });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('unlocks the save button if saving fails', async () => {
    const item = makeItem({
      id: 'public-cat-retry',
      publicNumber: 11,
      catName: '重試小貓',
      location: { lat: 25, lng: 121, name: '台北' },
      isPublic: true,
    });
    const onSave = vi.fn()
      .mockRejectedValueOnce(new Error('save failed'))
      .mockResolvedValueOnce(undefined);

    render(
      <WorldCatProfileSheet
        item={item}
        language="zh"
        isSaved={false}
        onClose={vi.fn()}
        onSave={onSave}
        onFind={vi.fn()}
      />
    );

    const saveButton = screen.getByRole('button', { name: '收藏' });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });

    fireEvent.click(saveButton);

    expect(onSave).toHaveBeenCalledTimes(2);
  });
});
