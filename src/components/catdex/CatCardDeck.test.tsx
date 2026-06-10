import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScrapbookItem } from '../../store/useScrapbookStore';
import CatCardDeck from './CatCardDeck';

const makeItem = (overrides: Partial<ScrapbookItem>): ScrapbookItem => ({
  id: overrides.id ?? 'cat-1',
  type: 'sticker',
  imageData: overrides.imageData ?? 'data:image/png;base64,cat',
  heroImageData: overrides.heroImageData,
  catdexNumber: overrides.catdexNumber,
  date: overrides.date ?? '2026-05-11T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: overrides.location,
  catName: overrides.catName,
});

describe('CatCardDeck', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders the active cat card and single-card share action', () => {
    render(
      <CatCardDeck
        items={[
          makeItem({
            id: 'cat-29',
            catdexNumber: 29,
            location: { lat: 25, lng: 121, name: '巷口咖啡店', address: '台北市信義區' },
          }),
        ]}
        language="zh"
        labels={{
          empty: '還沒有貓卡',
          previous: '上一張',
          next: '下一張',
          shareCard: '分享這張卡與地址',
        }}
        onShareCard={vi.fn()}
      />
    );

    expect(screen.getByText('No.029')).toBeInTheDocument();
    expect(screen.getByText('巷口咖啡店')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '分享這張卡與地址' })).toBeInTheDocument();
  });

  it('uses the custom cat name as the active card title when available', () => {
    render(
      <CatCardDeck
        items={[
          makeItem({
            id: 'cat-29',
            catdexNumber: 29,
            catName: '放鬆的貓咪',
            location: { lat: 25, lng: 121, name: '巷口咖啡店', address: '台北市信義區' },
          }),
        ]}
        language="zh"
        labels={{
          empty: '還沒有貓卡',
          previous: '上一張',
          next: '下一張',
          shareCard: '分享這張卡與地址',
        }}
        onShareCard={vi.fn()}
      />
    );

    expect(screen.getByText('放鬆的貓咪')).toBeInTheDocument();
    expect(screen.getByText('巷口咖啡店')).toBeInTheDocument();
  });

  it('does not render the old bottom arrow controls or swipe caption', () => {
    render(
      <CatCardDeck
        items={[
          makeItem({ id: 'cat-1', catdexNumber: 1 }),
          makeItem({ id: 'cat-2', catdexNumber: 2 }),
        ]}
        language="zh"
        labels={{
          empty: '還沒有貓卡',
          previous: '上一張',
          next: '下一張',
          shareCard: '分享這張卡與地址',
        }}
        onShareCard={vi.fn()}
      />
    );

    expect(screen.queryByRole('button', { name: '上一張' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '下一張' })).not.toBeInTheDocument();
    expect(screen.queryByText('左右滑動')).not.toBeInTheDocument();
  });

  it('shows a dismissible first-use swipe hint for multi-card decks', () => {
    render(
      <CatCardDeck
        items={[
          makeItem({ id: 'cat-1', catdexNumber: 1 }),
          makeItem({ id: 'cat-2', catdexNumber: 2 }),
        ]}
        language="zh"
        labels={{
          empty: '還沒有貓卡',
          previous: '上一張',
          next: '下一張',
          shareCard: '分享這張卡與地址',
        }}
        onShareCard={vi.fn()}
      />
    );

    expect(screen.getByText('左右滑動看更多貓卡')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '關閉左右滑動提示' }));

    expect(screen.queryByText('左右滑動看更多貓卡')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('corner-cat-swipe-hint-seen')).toBe('true');
  });

  it('moves between cards with keyboard arrows as the non-visual fallback', () => {
    vi.useFakeTimers();
    render(
      <CatCardDeck
        items={[
          makeItem({ id: 'cat-1', catdexNumber: 1 }),
          makeItem({ id: 'cat-2', catdexNumber: 2 }),
        ]}
        language="zh"
        labels={{
          empty: '還沒有貓卡',
          previous: '上一張',
          next: '下一張',
          shareCard: '分享這張卡與地址',
        }}
        onShareCard={vi.fn()}
      />
    );

    expect(screen.getByText('No.001')).toBeInTheDocument();
    fireEvent.keyDown(screen.getByTestId('active-cat-card'), { key: 'ArrowRight' });

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.getByText('No.002')).toBeInTheDocument();
  });

  it('animates the active card out before moving to the next card', () => {
    vi.useFakeTimers();
    render(
      <CatCardDeck
        items={[
          makeItem({ id: 'cat-1', catdexNumber: 1 }),
          makeItem({ id: 'cat-2', catdexNumber: 2 }),
        ]}
        language="zh"
        labels={{
          empty: '還沒有貓卡',
          previous: '上一張',
          next: '下一張',
          shareCard: '分享這張卡與地址',
        }}
        onShareCard={vi.fn()}
      />
    );

    fireEvent.keyDown(screen.getByTestId('active-cat-card'), { key: 'ArrowRight' });

    expect(screen.getByTestId('active-cat-card')).toHaveAttribute('data-swipe-exit', 'left');
    expect(screen.getByText('No.001')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.getByText('No.002')).toBeInTheDocument();
  });

  it('marks the active card as a draggable swipe surface', () => {
    render(
      <CatCardDeck
        items={[
          makeItem({ id: 'cat-1', catdexNumber: 1 }),
          makeItem({ id: 'cat-2', catdexNumber: 2 }),
        ]}
        language="zh"
        labels={{
          empty: '還沒有貓卡',
          previous: '上一張',
          next: '下一張',
          shareCard: '分享這張卡與地址',
        }}
        onShareCard={vi.fn()}
      />
    );

    expect(screen.getByTestId('active-cat-card')).toHaveAttribute('data-swipe-ready', 'true');
    expect(screen.getByTestId('active-cat-card')).toHaveClass('cursor-grab');
  });
});
