import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backupLocalCatCards } from '../../lib/cloudBackup';
import { useAuthStore } from '../../store/useAuthStore';
import type { ScrapbookItem } from '../../store/useScrapbookStore';
import CloudBackupPrompt from './CloudBackupPrompt';

vi.mock('../../lib/cloudBackup', () => ({
  backupLocalCatCards: vi.fn(async () => ({ ok: true, backedUpCount: 1 })),
}));

const localCat: ScrapbookItem = {
  id: 'cat-1',
  type: 'sticker',
  imageData: 'data:image/jpeg;base64,cat',
  date: '2026-06-02T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
};

describe('CloudBackupPrompt', () => {
  beforeEach(() => {
    vi.mocked(backupLocalCatCards).mockClear();
    vi.mocked(backupLocalCatCards).mockResolvedValue({ ok: true, backedUpCount: 1 });
    useAuthStore.setState({
      session: null,
      user: null,
      isConfigured: false,
      isLoading: false,
      error: null,
      unsubscribeAuthState: null,
      signInWithEmail: vi.fn(async () => undefined),
      signOut: vi.fn(async () => undefined),
    });
  });

  afterEach(() => cleanup());

  it('frames login as backing up the cat map, not as a required social login', () => {
    render(<CloudBackupPrompt language="zh" items={[localCat, { ...localCat, id: 'cat-2' }, { ...localCat, id: 'cat-3' }]} />);

    expect(screen.getByRole('button', { name: '備份我的貓咪地圖' })).toBeInTheDocument();
    expect(screen.getByText('3 隻貓目前保存在這台裝置')).toBeInTheDocument();
    expect(screen.queryByText(/加入社群/)).not.toBeInTheDocument();
  });

  it('explains cloud backup is unavailable when Supabase is not configured', async () => {
    const user = userEvent.setup();
    render(<CloudBackupPrompt language="zh" items={[localCat]} />);

    await user.click(screen.getByRole('button', { name: '備份我的貓咪地圖' }));

    expect(screen.getByRole('dialog', { name: '備份我的貓咪地圖' })).toBeInTheDocument();
    expect(screen.getByText('雲端備份尚未啟用')).toBeInTheDocument();
    expect(screen.getByText('現在仍可繼續用本機保存貓卡；設定好雲端後，這裡會開啟 Email 登入與備份。')).toBeInTheDocument();
    expect(screen.getByText('不會影響目前手機裡的貓卡。')).toBeInTheDocument();
  });

  it('sends a magic-link email when cloud auth is configured', async () => {
    const user = userEvent.setup();
    const signInWithEmail = vi.fn(async () => undefined);
    useAuthStore.setState({
      isConfigured: true,
      signInWithEmail,
    });

    render(<CloudBackupPrompt language="zh" items={[localCat, { ...localCat, id: 'cat-2' }]} />);

    await user.click(screen.getByRole('button', { name: '備份我的貓咪地圖' }));
    await user.type(screen.getByLabelText('Email'), ' test@example.com ');
    await user.click(screen.getByRole('button', { name: '寄送登入信' }));

    await waitFor(() => {
      expect(signInWithEmail).toHaveBeenCalledWith('test@example.com');
    });
    expect(screen.getByText('已寄出登入信')).toBeInTheDocument();
  });

  it('shows signed-in backup status and lets users sign out', async () => {
    const user = userEvent.setup();
    const signOut = vi.fn(async () => undefined);
    useAuthStore.setState({
      isConfigured: true,
      user: {
        id: 'user-1',
        email: 'cat@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2026-06-02T00:00:00.000Z',
      },
      signOut,
    });

    render(<CloudBackupPrompt language="zh" items={[localCat, { ...localCat, id: 'cat-2' }, { ...localCat, id: 'cat-3' }, { ...localCat, id: 'cat-4' }]} />);

    expect(screen.getByRole('button', { name: '查看備份狀態' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看備份狀態' }));
    expect(screen.getByText('已登入')).toBeInTheDocument();
    expect(screen.getByText('cat@example.com')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '登出' }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('backs up local cats when signed in', async () => {
    const user = userEvent.setup();
    useAuthStore.setState({
      isConfigured: true,
      user: {
        id: 'user-1',
        email: 'cat@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2026-06-02T00:00:00.000Z',
      },
    });

    render(<CloudBackupPrompt language="zh" items={[localCat, { ...localCat, id: 'cat-2' }]} />);

    await user.click(screen.getByRole('button', { name: '查看備份狀態' }));
    await user.click(screen.getByRole('button', { name: '立即備份' }));

    await waitFor(() => {
      expect(backupLocalCatCards).toHaveBeenCalledWith({
        ownerId: 'user-1',
        items: [localCat, { ...localCat, id: 'cat-2' }],
      });
    });
    expect(screen.getByText('已備份 1 隻貓')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '去我的地圖公開貓點' })).toHaveAttribute('href', '/map');
  });

  it('shows a retryable message when backup fails', async () => {
    const user = userEvent.setup();
    vi.mocked(backupLocalCatCards).mockResolvedValue({ ok: false, reason: 'backup_failed', message: 'row too large' });
    useAuthStore.setState({
      isConfigured: true,
      user: {
        id: 'user-1',
        email: 'cat@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: '2026-06-02T00:00:00.000Z',
      },
    });

    render(<CloudBackupPrompt language="zh" items={[localCat]} />);

    await user.click(screen.getByRole('button', { name: '查看備份狀態' }));
    await user.click(screen.getByRole('button', { name: '立即備份' }));

    expect(await screen.findByText('備份失敗，請稍後再試。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再試一次' })).toBeInTheDocument();
  });
});
