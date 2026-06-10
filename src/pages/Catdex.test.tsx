import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { useScrapbookStore } from '../store/useScrapbookStore';
import Catdex from './Catdex';

const makeItem = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: overrides.id ?? 'cat-29',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
  catdexNumber: overrides.catdexNumber ?? 29,
  date: overrides.date ?? '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location,
  catName: overrides.catName,
});

describe('Catdex page', () => {
  beforeEach(() => {
    useScrapbookStore.setState({
      items: [],
      isLoading: false,
      language: 'zh',
    });
  });

  afterEach(() => cleanup());

  it('uses the shared moodboard brand header with logo and close navigation', () => {
    render(
      <MemoryRouter>
        <Catdex />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '回到首頁' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '關閉回首頁' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('img', { name: '轉角遇到貓 FOUND CAT Logo' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '我的貓卡' })).toBeInTheDocument();
  });

  it('shows custom cat names in the archive cards', () => {
    useScrapbookStore.setState({
      items: [
        makeItem({
          catName: '放鬆的貓咪',
          location: { lat: 25, lng: 121, name: '巷口咖啡店' },
        }),
      ],
      isLoading: false,
      language: 'zh',
    });

    render(
      <MemoryRouter>
        <Catdex />
      </MemoryRouter>
    );

    expect(screen.getByText('放鬆的貓咪')).toBeInTheDocument();
    expect(screen.getByText('巷口咖啡店')).toBeInTheDocument();
  });
});
