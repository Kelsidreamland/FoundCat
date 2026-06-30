import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ScrapbookItem } from '../../store/useScrapbookStore';
import CatProfileSummary, { getCatProfileCopy } from './CatProfileSummary';
import { getCatInfoCopy } from '../../lib/catInfoDisplay';

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: overrides.id ?? 'cat-empty-profile',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
  catdexNumber: overrides.catdexNumber ?? 1,
  date: overrides.date ?? '2026-06-25T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location,
  catName: overrides.catName,
  catFeatureNote: overrides.catFeatureNote,
  catBreed: overrides.catBreed,
  catColor: overrides.catColor,
  personalityTags: overrides.personalityTags,
  spotNote: overrides.spotNote,
  careStatusTags: overrides.careStatusTags,
});

describe('CatProfileSummary', () => {
  it('shows the mysterious empty-state copy only once for sparse cat profiles', () => {
    render(
      <CatProfileSummary
        item={makeItem()}
        language="zh"
        showPlace={false}
      />
    );

    expect(screen.getByText('貓咪個人檔案')).toBeInTheDocument();
    expect(screen.getAllByText('牠還很神秘，等下一位貓奴補充。')).toHaveLength(1);
  });

  it('labels spot notes as encounter clues in Chinese profiles', () => {
    render(
      <CatProfileSummary
        item={makeItem({ spotNote: '傍晚常在咖啡店門口紙箱睡覺' })}
        language="zh"
        showPlace={false}
      />
    );

    expect(screen.getByText('偶遇線索')).toBeInTheDocument();
    expect(screen.queryByText('喜歡出沒')).not.toBeInTheDocument();
  });

  it('returns encounter clue copy for Chinese spot fields', () => {
    expect(getCatInfoCopy('zh').spotNote).toBe('偶遇線索');
    expect(getCatInfoCopy('zh').spotHeading).toBe('偶遇線索');
    expect(getCatProfileCopy('zh').spot).toBe('偶遇線索');
  });
});
