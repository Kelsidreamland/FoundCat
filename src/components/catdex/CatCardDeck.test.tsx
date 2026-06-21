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

    expect(screen.getByText('右滑收藏，左滑看下一隻')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '關閉左右滑動提示' }));

    expect(screen.queryByText('右滑收藏，左滑看下一隻')).not.toBeInTheDocument();
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
    fireEvent.keyDown(screen.getByTestId('active-cat-card'), { key: 'ArrowLeft' });

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

    expect(screen.getByTestId('active-cat-card')).toHaveAttribute('data-swipe-exit', 'right');
    expect(screen.getByText('No.001')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.getByText('No.002')).toBeInTheDocument();
  });

  it('collects the active card on a right swipe and then advances', () => {
    vi.useFakeTimers();
    const onCollectCard = vi.fn();

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
          collectFeedback: '已收藏到我的貓卡',
        }}
        onShareCard={vi.fn()}
        onCollectCard={onCollectCard}
      />
    );

    fireEvent.keyDown(screen.getByTestId('active-cat-card'), { key: 'ArrowRight' });

    expect(onCollectCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'cat-1' }));
    expect(screen.getByRole('status')).toHaveTextContent('已收藏到我的貓卡');
    expect(screen.getByTestId('active-cat-card')).toHaveAttribute('data-swipe-exit', 'right');

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.getByText('No.002')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('ignores duplicate swipe triggers while the current card is animating out', () => {
    vi.useFakeTimers();
    const onCollectCard = vi.fn();

    render(
      <CatCardDeck
        items={[
          makeItem({ id: 'cat-1', catdexNumber: 1 }),
          makeItem({ id: 'cat-2', catdexNumber: 2 }),
          makeItem({ id: 'cat-3', catdexNumber: 3 }),
        ]}
        language="zh"
        labels={{
          empty: '還沒有貓卡',
          previous: '上一張',
          next: '下一張',
          shareCard: '分享這張卡與地址',
          collectFeedback: '已收藏到我的貓卡',
        }}
        onShareCard={vi.fn()}
        onCollectCard={onCollectCard}
      />
    );

    const activeCard = screen.getByTestId('active-cat-card');
    act(() => {
      activeCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      activeCard.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });

    expect(onCollectCard).toHaveBeenCalledTimes(1);
    expect(onCollectCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'cat-1' }));

    act(() => {
      vi.advanceTimersByTime(260);
    });

    expect(screen.getByText('No.002')).toBeInTheDocument();
    expect(screen.queryByText('No.003')).not.toBeInTheDocument();
  });

  it('resets an in-flight swipe when the card source changes underneath the deck', () => {
    vi.useFakeTimers();
    const { rerender } = render(
      <CatCardDeck
        items={[
          makeItem({ id: 'local-cat-1', catdexNumber: 1 }),
          makeItem({ id: 'local-cat-2', catdexNumber: 2 }),
          makeItem({ id: 'local-cat-3', catdexNumber: 3 }),
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

    fireEvent.keyDown(screen.getByTestId('active-cat-card'), { key: 'ArrowLeft' });
    expect(screen.getByTestId('active-cat-card')).toHaveAttribute('data-swipe-exit', 'left');

    rerender(
      <CatCardDeck
        items={[
          makeItem({ id: 'public-cat-9', catdexNumber: 9 }),
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

    expect(screen.getByText('No.009')).toBeInTheDocument();
    expect(screen.getByTestId('active-cat-card')).toHaveAttribute('data-swipe-exit', 'none');
  });

  it('skips without collecting on a left swipe and then advances', () => {
    vi.useFakeTimers();
    const onCollectCard = vi.fn();

    render(
      <CatCardDeck
        items={[
          makeItem({ id: 'cat-1', catdexNumber: 1 }),
          makeItem({ id: 'cat-2', catdexNumber: 2 }),
          makeItem({ id: 'cat-3', catdexNumber: 3 }),
        ]}
        language="zh"
        labels={{
          empty: '還沒有貓卡',
          previous: '上一張',
          next: '下一張',
          shareCard: '分享這張卡與地址',
        }}
        onShareCard={vi.fn()}
        onCollectCard={onCollectCard}
      />
    );

    fireEvent.keyDown(screen.getByTestId('active-cat-card'), { key: 'ArrowLeft' });

    expect(onCollectCard).not.toHaveBeenCalled();
    expect(screen.getByTestId('active-cat-card')).toHaveAttribute('data-swipe-exit', 'left');

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
