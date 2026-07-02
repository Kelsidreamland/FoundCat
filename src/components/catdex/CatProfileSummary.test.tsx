import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
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
  afterEach(() => cleanup());

  it('shows a compact mystery profile when users only saved a photo and location', () => {
    render(
      <CatProfileSummary
        item={makeItem({ location: { lat: 25.033, lng: 121.565, name: '東京' } })}
        language="zh"
      />
    );

    expect(screen.getByText('貓咪個人檔案')).toBeInTheDocument();
    expect(screen.getByText('這隻貓還很神秘。')).toBeInTheDocument();
    expect(screen.getByText('目前知道')).toBeInTheDocument();
    expect(screen.getByText('牠曾經在這裡出現。')).toBeInTheDocument();
    expect(screen.getByText('下一步')).toBeInTheDocument();
    expect(screen.getByText('去地圖看看牠在哪裡。')).toBeInTheDocument();
    expect(screen.getByText('感覺')).toBeInTheDocument();
    expect(screen.getByText('線索')).toBeInTheDocument();
    expect(screen.getAllByText('等你補充')).toHaveLength(2);
    expect(screen.queryByText('牠還很神秘，等下一位貓奴補充。')).not.toBeInTheDocument();
  });

  it('uses short profile labels for filled cat details', () => {
    render(
      <CatProfileSummary
        item={makeItem({
          personalityTags: ['friendly'],
          spotNote: '早上在咖啡店門口',
          catFeatureNote: '橘白色，尾巴末端有白點',
          careStatusTags: ['fed'],
        })}
        language="zh"
        showPlace={false}
      />
    );

    expect(screen.getByText('感覺')).toBeInTheDocument();
    expect(screen.getByText('偶遇線索')).toBeInTheDocument();
    expect(screen.getByText('特徵')).toBeInTheDocument();
    expect(screen.getByText('照護')).toBeInTheDocument();
    expect(screen.queryByText('牠給人的感覺')).not.toBeInTheDocument();
    expect(screen.queryByText('外型小檔案')).not.toBeInTheDocument();
    expect(screen.queryByText('喜歡出沒')).not.toBeInTheDocument();
  });

  it('returns encounter clue copy for Chinese spot fields', () => {
    expect(getCatInfoCopy('zh').spotNote).toBe('偶遇線索');
    expect(getCatInfoCopy('zh').spotHeading).toBe('偶遇線索');
    expect(getCatProfileCopy('zh').spot).toBe('偶遇線索');
  });
});
