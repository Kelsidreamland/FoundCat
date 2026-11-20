import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OPEN_BACKUP_PANEL_EVENT } from '../../lib/storagePersistence';
import { useAuthStore } from '../../store/useAuthStore';
import type { ScrapbookItem } from '../../store/useScrapbookStore';
import BackupNudge from './BackupNudge';

const cat = (id: string, extra: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id, type: 'sticker', imageData: '', date: '2026-01-01', x: 0, y: 0, rotation: 0, scale: 1, zIndex: 1, ...extra,
});

describe('BackupNudge', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthStore.setState({ user: null, isConfigured: true });
  });
  afterEach(() => cleanup());

  it('stays hidden until the person has three of their own cats', () => {
    render(<BackupNudge items={[cat('a'), cat('b'), cat('c', { collectedFromPublicId: 'w1' })]} language="zh" />);
    expect(screen.queryByTestId('backup-nudge')).not.toBeInTheDocument();
  });

  it('offers sign-in backup after the third cat and remembers dismissal', () => {
    const open = vi.fn();
    window.addEventListener(OPEN_BACKUP_PANEL_EVENT, open);
    const items = [cat('a'), cat('b'), cat('c')];
    const { unmount } = render(<BackupNudge items={items} language="zh" />);

    expect(screen.getByTestId('backup-nudge')).toHaveTextContent('已經記了 3 隻貓');
    fireEvent.click(screen.getByRole('button', { name: '登入備份' }));
    expect(open).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: '關閉備份提醒' }));
    expect(screen.queryByTestId('backup-nudge')).not.toBeInTheDocument();
    unmount();
    render(<BackupNudge items={items} language="zh" />);
    expect(screen.queryByTestId('backup-nudge')).not.toBeInTheDocument();
    window.removeEventListener(OPEN_BACKUP_PANEL_EVENT, open);
  });

  it('does not nag signed-in people', () => {
    useAuthStore.setState({ user: { id: 'u1' } as never });
    render(<BackupNudge items={[cat('a'), cat('b'), cat('c')]} language="zh" />);
    expect(screen.queryByTestId('backup-nudge')).not.toBeInTheDocument();
  });
});
