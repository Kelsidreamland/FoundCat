import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useScrapbookStore } from '../store/useScrapbookStore';
import { useAuthStore } from '../store/useAuthStore';
import { useCloudBackupStatusStore } from '../store/useCloudBackupStatusStore';
import { backupLocalCatCards } from '../lib/cloudBackup';
import Create from './Create';

vi.mock('uuid', () => ({
  v4: () => 'new-cat-id',
}));

vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(async () => undefined),
}));

vi.mock('browser-image-compression', () => ({
  default: vi.fn(async (file: File | Blob) => file),
}));

vi.mock('heic2any', () => ({
  default: vi.fn(),
}));

vi.mock('../lib/cloudBackup', () => ({
  backupLocalCatCards: vi.fn(async () => ({ ok: true, backedUpCount: 1 })),
}));

vi.mock('react-easy-crop', () => {
  const CropperMock = ({ onCropComplete }: { onCropComplete?: (area: unknown, pixels: unknown) => void }) => {
    React.useEffect(() => {
      onCropComplete?.({}, { x: 0, y: 0, width: 100, height: 100 });
    }, [onCropComplete]);

    return <div data-testid="cropper" />;
  };

  return { default: CropperMock };
});

vi.mock('../components/LocationPicker', () => ({
  default: ({ onPicked }: {
    onPicked: (location: {
      lat: number;
      lng: number;
      name: string;
      address?: string;
      placeId?: string;
    }) => void;
  }) => (
    <button
      type="button"
      onClick={() => onPicked({
        lat: 25.033,
        lng: 121.565,
        name: 'Taipei 101',
        address: '信義區, 台北市',
        placeId: 'N:12345',
      })}
    >
      確認測試地點
    </button>
  ),
}));

function RouteDisplay() {
  const location = useLocation();
  return <div data-testid="current-route">{location.pathname}{location.search}</div>;
}

describe('Create page', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    useScrapbookStore.setState({
      items: [],
      isLoading: false,
      language: 'zh',
      targetDate: null,
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
    vi.mocked(backupLocalCatCards).mockClear();
    vi.mocked(backupLocalCatCards).mockResolvedValue({ ok: true, backedUpCount: 1 });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn(() => 'blob:cat-photo'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    vi.stubGlobal('Image', class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      decoding = 'async';
      width = 100;
      height = 100;
      naturalWidth = 100;
      naturalHeight = 100;

      set src(_value: string) {
        window.setTimeout(() => this.onload?.(), 0);
      }
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: vi.fn(() => ({
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        globalCompositeOperation: 'source-over',
        fillStyle: '#fff',
      })),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
      configurable: true,
      value: vi.fn((callback: BlobCallback) => {
        callback(new Blob(['cat'], { type: 'image/jpeg' }));
      }),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
      configurable: true,
      value: vi.fn(() => 'data:image/png;base64,sticker'),
    });
  });

  it('shows crop zoom controls after a photo is selected', async () => {
    render(
      <MemoryRouter>
        <Create />
      </MemoryRouter>
    );

    await userEvent.upload(
      screen.getByLabelText('Upload from Album'),
      new File(['cat'], 'cat.jpg', { type: 'image/jpeg' })
    );

    await screen.findByTestId('cropper');
    await waitFor(() => expect(screen.getByLabelText('Zoom level')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '方形貓卡' })).toBeInTheDocument();
    expect(screen.queryByText(/AI|去背/)).not.toBeInTheDocument();
  });

  it('introduces capture as a corner cat encounter instead of a generic upload page', () => {
    render(
      <MemoryRouter>
        <Create />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: '轉角遇到貓' })).toBeInTheDocument();
    expect(screen.getByText('新增貓咪卡片')).toBeInTheDocument();
    expect(screen.getByText('拍下這隻貓')).toBeInTheDocument();
    expect(screen.getByText('從相簿選貓照')).toBeInTheDocument();
    expect(screen.queryByText('記錄新的貓咪')).not.toBeInTheDocument();
  });

  it('keeps the entry screen mobile-safe and groups the capture choices', () => {
    render(
      <MemoryRouter>
        <Create />
      </MemoryRouter>
    );

    expect(screen.getByRole('main')).toHaveClass('pb-[calc(5rem+env(safe-area-inset-bottom))]');
    expect(screen.getByRole('group', { name: '新增貓咪照片來源' })).toHaveClass('grid-cols-2');
  });

  it('uses a branded safe-area crop control sheet after photo selection', async () => {
    render(
      <MemoryRouter>
        <Create />
      </MemoryRouter>
    );

    await userEvent.upload(
      screen.getByLabelText('Upload from Album'),
      new File(['cat'], 'cat.jpg', { type: 'image/jpeg' })
    );

    await screen.findByTestId('cropper');
    expect(screen.getByTestId('crop-control-sheet')).toHaveClass('pb-[calc(1.25rem+env(safe-area-inset-bottom))]');
    expect(screen.getByRole('button', { name: '方形貓卡' })).toHaveClass('bg-[#2F5FB3]');
  });

  it('uses the shared moodboard brand header with logo and close navigation', () => {
    render(
      <MemoryRouter>
        <Create />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '回到首頁' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '關閉回首頁' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('img', { name: '轉角遇到貓 FOUND CAT Logo' })).toBeInTheDocument();
  });

  it('returns directly to the map and focuses the new cat after a location is picked', async () => {
    render(
      <MemoryRouter initialEntries={['/create']}>
        <RouteDisplay />
        <Routes>
          <Route path="/create" element={<Create />} />
          <Route path="/map" element={<div>Map page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.upload(
      screen.getByLabelText('Upload from Album'),
      new File(['cat'], 'cat.jpg', { type: 'image/jpeg' })
    );

    await screen.findByTestId('cropper');
    await userEvent.click(screen.getByRole('button', { name: '方形貓卡' }));
    await screen.findByAltText('預覽貓卡');
    await userEvent.click(screen.getByRole('button', { name: /存入我的貓卡/ }));
    expect(screen.queryByRole('button', { name: '完成標籤' })).not.toBeInTheDocument();
    await userEvent.click(await screen.findByRole('button', { name: '確認測試地點' }));

    expect(await screen.findByTestId('current-route')).toHaveTextContent('/map?cat=new-cat-id&publishHint=1');
    expect(screen.queryByRole('heading', { name: '已存到貓咪地圖' })).not.toBeInTheDocument();
    expect(useScrapbookStore.getState().items[0].location).toMatchObject({
      lat: 25.033,
      lng: 121.565,
      name: 'Taipei 101',
    });
  });

  it('resumes the pending location step for the newest cat without a location after the app reloads', async () => {
    useScrapbookStore.setState({
      items: [
        {
          id: 'pending-cat-id',
          type: 'sticker',
          imageData: 'data:image/png;base64,pending-cat',
          catdexNumber: 8,
          date: new Date().toISOString(),
          x: 0,
          y: 0,
          rotation: 0,
          scale: 1,
          zIndex: 1,
        },
      ],
      isLoading: false,
      language: 'zh',
      targetDate: null,
    });
    window.sessionStorage.setItem('found-cat-pending-location-id', 'pending-cat-id');

    render(
      <MemoryRouter initialEntries={['/create']}>
        <RouteDisplay />
        <Routes>
          <Route path="/create" element={<Create />} />
          <Route path="/map" element={<div>Map page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(await screen.findByRole('button', { name: '確認測試地點' }));

    expect(await screen.findByTestId('current-route')).toHaveTextContent('/map?cat=pending-cat-id&publishHint=1');
    expect(useScrapbookStore.getState().items[0].location).toMatchObject({
      name: 'Taipei 101',
    });
    expect(window.sessionStorage.getItem('found-cat-pending-location-id')).toBeNull();
  });

  it('backs up the newly located cat when the user is signed in', async () => {
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

    render(
      <MemoryRouter initialEntries={['/create']}>
        <RouteDisplay />
        <Routes>
          <Route path="/create" element={<Create />} />
          <Route path="/map" element={<div>Map page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.upload(
      screen.getByLabelText('Upload from Album'),
      new File(['cat'], 'cat.jpg', { type: 'image/jpeg' })
    );

    await screen.findByTestId('cropper');
    await userEvent.click(screen.getByRole('button', { name: '方形貓卡' }));
    await screen.findByAltText('預覽貓卡');
    await userEvent.click(screen.getByRole('button', { name: /存入我的貓卡/ }));
    await userEvent.click(await screen.findByRole('button', { name: '確認測試地點' }));

    await waitFor(() => {
      expect(backupLocalCatCards).toHaveBeenCalledWith({
        ownerId: 'user-1',
        items: [
          expect.objectContaining({
            id: 'new-cat-id',
            location: expect.objectContaining({
              name: 'Taipei 101',
            }),
          }),
        ],
      });
    });
    await waitFor(() => {
      expect(useCloudBackupStatusStore.getState()).toMatchObject({
        status: 'success',
        backedUpCount: 1,
      });
    });
    expect(await screen.findByTestId('current-route')).toHaveTextContent('/map?cat=new-cat-id&publishHint=1');
  });

  it('keeps automatic backup failure visible after creating a located cat', async () => {
    vi.mocked(backupLocalCatCards).mockResolvedValue({
      ok: false,
      reason: 'backup_failed',
      message: 'row too large',
    });
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

    render(
      <MemoryRouter initialEntries={['/create']}>
        <RouteDisplay />
        <Routes>
          <Route path="/create" element={<Create />} />
          <Route path="/map" element={<div>Map page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.upload(
      screen.getByLabelText('Upload from Album'),
      new File(['cat'], 'cat.jpg', { type: 'image/jpeg' })
    );

    await screen.findByTestId('cropper');
    await userEvent.click(screen.getByRole('button', { name: '方形貓卡' }));
    await screen.findByAltText('預覽貓卡');
    await userEvent.click(screen.getByRole('button', { name: /存入我的貓卡/ }));
    await userEvent.click(await screen.findByRole('button', { name: '確認測試地點' }));

    await waitFor(() => {
      expect(useCloudBackupStatusStore.getState()).toMatchObject({
        status: 'error',
        message: 'row too large',
        pendingCount: 1,
      });
    });
    expect(await screen.findByTestId('current-route')).toHaveTextContent('/map?cat=new-cat-id&publishHint=1');
  });

  it('does not try cloud backup for logged-out users after adding a cat', async () => {
    render(
      <MemoryRouter initialEntries={['/create']}>
        <RouteDisplay />
        <Routes>
          <Route path="/create" element={<Create />} />
          <Route path="/map" element={<div>Map page</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.upload(
      screen.getByLabelText('Upload from Album'),
      new File(['cat'], 'cat.jpg', { type: 'image/jpeg' })
    );

    await screen.findByTestId('cropper');
    await userEvent.click(screen.getByRole('button', { name: '方形貓卡' }));
    await screen.findByAltText('預覽貓卡');
    await userEvent.click(screen.getByRole('button', { name: /存入我的貓卡/ }));
    await userEvent.click(await screen.findByRole('button', { name: '確認測試地點' }));

    expect(backupLocalCatCards).not.toHaveBeenCalled();
    expect(await screen.findByTestId('current-route')).toHaveTextContent('/map?cat=new-cat-id&publishHint=1');
  });
});
