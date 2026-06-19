import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { backupLocalCatCards } from '../../lib/cloudBackup';
import { restoreCloudCatCards } from '../../lib/cloudRestore';
import { useAuthStore } from '../../store/useAuthStore';
import { useCloudBackupStatusStore } from '../../store/useCloudBackupStatusStore';
import { useScrapbookStore, type ScrapbookItem } from '../../store/useScrapbookStore';
import CloudBackupPrompt from './CloudBackupPrompt';

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(async () => undefined),
}));

vi.mock('../../lib/cloudBackup', () => ({
  backupLocalCatCards: vi.fn(async () => ({ ok: true, backedUpCount: 1 })),
}));

vi.mock('../../lib/cloudRestore', () => ({
  restoreCloudCatCards: vi.fn(async () => ({ ok: true, items: [] })),
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
    vi.mocked(restoreCloudCatCards).mockClear();
    vi.mocked(restoreCloudCatCards).mockResolvedValue({ ok: true, items: [] });
    useScrapbookStore.setState({
      items: [],
      isLoading: false,
      language: 'zh',
    });
    useAuthStore.setState({
      session: null,
      user: null,
      isConfigured: false,
      isLoading: false,
      error: null,
      errorMessage: null,
      unsubscribeAuthState: null,
      signInWithEmail: vi.fn(async () => undefined),
      signOut: vi.fn(async () => undefined),
    });
    useCloudBackupStatusStore.getState().reset();
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

  it('shows a useful message when the magic-link email cannot be sent', async () => {
    const user = userEvent.setup();
    const signInWithEmail = vi.fn(async () => {
      useAuthStore.setState({
        error: 'sign_in_failed',
        errorMessage: 'Failed to fetch',
      });
    });
    useAuthStore.setState({
      isConfigured: true,
      signInWithEmail,
    });

    render(<CloudBackupPrompt language="zh" items={[localCat]} />);

    await user.click(screen.getByRole('button', { name: '備份我的貓咪地圖' }));
    await user.type(screen.getByLabelText('Email'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: '寄送登入信' }));

    expect(await screen.findByText('登入信寄送失敗：雲端設定或網路無法連線，請稍後再試。')).toBeInTheDocument();
    expect(screen.queryByText('已寄出登入信')).not.toBeInTheDocument();
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
    expect(screen.getByRole('link', { name: '去全世界地圖' })).toHaveAttribute('href', '/map?mode=public');

    await user.click(screen.getByRole('button', { name: '登出' }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('opens restore guidance automatically for signed-in users with no local cats', () => {
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

    render(<CloudBackupPrompt language="zh" items={[]} autoOpenOnSignedInEmptyDevice />);

    expect(screen.getByRole('dialog', { name: '備份我的貓咪地圖' })).toBeInTheDocument();
    expect(screen.getByText('這台裝置目前沒有貓咪；如果你之前備份過，可以先恢復雲端貓咪。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '恢復雲端貓咪' })).toBeInTheDocument();
    expect(screen.getByText('cat@example.com')).toBeInTheDocument();
  });

  it('does not auto-open restore guidance when signed-in users already have local cats', () => {
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

    render(<CloudBackupPrompt language="zh" items={[localCat]} autoOpenOnSignedInEmptyDevice />);

    expect(screen.queryByRole('dialog', { name: '備份我的貓咪地圖' })).not.toBeInTheDocument();
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

  it('shows the latest automatic backup status on the signed-in cloud button', () => {
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

    useCloudBackupStatusStore.getState().markSuccess(1);

    render(<CloudBackupPrompt language="zh" items={[localCat]} />);

    expect(screen.getByText('剛剛已備份 1 隻貓')).toBeInTheDocument();
  });

  it('restores cloud cats into the local device when signed in', async () => {
    const user = userEvent.setup();
    const remoteCat: ScrapbookItem = {
      ...localCat,
      id: 'remote-cat-1',
      catName: '曼谷小橘',
      location: {
        lat: 13.7563,
        lng: 100.5018,
        name: '曼谷街角咖啡',
      },
    };
    vi.mocked(restoreCloudCatCards).mockResolvedValue({ ok: true, items: [remoteCat] });
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

    render(<CloudBackupPrompt language="zh" items={[]} />);

    await user.click(screen.getByRole('button', { name: '查看備份狀態' }));
    await user.click(screen.getByRole('button', { name: '恢復雲端貓咪' }));

    await waitFor(() => {
      expect(restoreCloudCatCards).toHaveBeenCalledWith({ ownerId: 'user-1' });
    });
    await waitFor(() => {
      expect(useScrapbookStore.getState().items).toEqual([remoteCat]);
    });
    expect(screen.getByText('已恢復 1 隻貓')).toBeInTheDocument();
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

    expect(await screen.findByText('備份失敗：row too large')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再試一次' })).toBeInTheDocument();
  });
});
