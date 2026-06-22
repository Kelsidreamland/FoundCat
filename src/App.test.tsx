import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useAuthStore } from './store/useAuthStore';
import { useScrapbookStore } from './store/useScrapbookStore';
import { rescueLocalCatsToPublic } from './lib/launchRescuePublicCats';
import type { ScrapbookItem } from './store/useScrapbookStore';

const visualViewportListeners = new Map<string, EventListener>();
const mockInitAuth = vi.hoisted(() => vi.fn(async () => undefined));
const mockRescueLocalCatsToPublic = vi.hoisted(() => vi.fn(async () => ({
  ok: true,
  uploadedCount: 0,
  skippedCount: 0,
})));

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
}));

vi.mock('./components/PWAPrompt', () => ({
  default: () => null,
}));

vi.mock('./components/PWAUpdatePrompt', () => ({
  default: () => null,
}));

vi.mock('./lib/launchRescuePublicCats', () => ({
  rescueLocalCatsToPublic: mockRescueLocalCatsToPublic,
}));

vi.mock('./store/useAuthStore', () => ({
  useAuthStore: vi.fn((selector: (state: { initAuth: () => Promise<void> }) => unknown) => selector({
    initAuth: mockInitAuth,
  })),
}));

const makeCat = (overrides: Partial<ScrapbookItem> = {}): ScrapbookItem => ({
  id: 'local-cat-1',
  type: 'sticker',
  imageData: 'data:image/jpeg;base64,cat',
  date: '2026-06-21T08:00:00.000Z',
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  zIndex: 1,
  location: {
    lat: 13.7563,
    lng: 100.5018,
    name: 'Bangkok Cafe',
  },
  ...overrides,
});

describe('App viewport shell', () => {
  beforeEach(() => {
    mockInitAuth.mockClear();
    vi.mocked(rescueLocalCatsToPublic).mockClear();
    vi.mocked(useAuthStore).mockImplementation((selector) => selector({
      session: null,
      user: null,
      isConfigured: false,
      isLoading: false,
      error: null,
      errorMessage: null,
      unsubscribeAuthState: null,
      initAuth: mockInitAuth,
      signInWithEmail: vi.fn(async () => undefined),
      verifyEmailOtp: vi.fn(async () => undefined),
      signOut: vi.fn(async () => undefined),
    }) as never);
    window.history.pushState({}, '', '/');
    useScrapbookStore.setState({
      items: [],
      isLoading: false,
      language: 'zh',
    });
    visualViewportListeners.clear();
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: {
        height: 701,
        addEventListener: vi.fn((event: string, listener: EventListener) => {
          visualViewportListeners.set(event, listener);
        }),
        removeEventListener: vi.fn((event: string) => {
          visualViewportListeners.delete(event);
        }),
      },
    });
  });

  afterEach(() => {
    cleanup();
    document.documentElement.style.removeProperty('--found-cat-app-height');
  });

  it('pins the app frame to the visual viewport height for mobile browser refreshes', async () => {
    render(<App />);

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--found-cat-app-height')).toBe('701px');
    });
    expect(screen.getByTestId('app-frame')).toHaveClass('h-full', 'overflow-hidden');
  });

  it('updates the app height when the mobile visual viewport changes', async () => {
    const visualViewport = window.visualViewport as VisualViewport & { height: number };
    render(<App />);

    visualViewport.height = 640;
    visualViewportListeners.get('resize')?.(new Event('resize'));

    await waitFor(() => {
      expect(document.documentElement.style.getPropertyValue('--found-cat-app-height')).toBe('640px');
    });
  });

  it('initializes auth state without blocking local data loading', async () => {
    render(<App />);

    await waitFor(() => {
      expect(mockInitAuth).toHaveBeenCalledTimes(1);
    });
  });

  it('starts the temporary public rescue upload after local cat cards are loaded', async () => {
    const localCat = makeCat();
    useScrapbookStore.setState({
      items: [localCat],
      isLoading: false,
      language: 'zh',
    });

    render(<App />);

    await waitFor(() => {
      expect(rescueLocalCatsToPublic).toHaveBeenCalledWith([localCat]);
    });
  });

  it('retries the temporary public rescue upload when a local cat gains map coordinates', async () => {
    const localCatWithoutLocation = makeCat({ location: undefined });
    const localCatWithLocation = makeCat();
    useScrapbookStore.setState({
      items: [localCatWithoutLocation],
      isLoading: false,
      language: 'zh',
    });

    render(<App />);

    await waitFor(() => {
      expect(rescueLocalCatsToPublic).toHaveBeenCalledWith([localCatWithoutLocation]);
    });

    useScrapbookStore.setState({
      items: [localCatWithLocation],
      isLoading: false,
      language: 'zh',
    });

    await waitFor(() => {
      expect(rescueLocalCatsToPublic).toHaveBeenLastCalledWith([localCatWithLocation]);
    });
  });

  it('serves the my cat cards page at /catdex', async () => {
    window.history.pushState({}, '', '/catdex');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '我的貓卡' })).toBeInTheDocument();
    expect(screen.getByText('FOUND CATS ARCHIVE')).toBeInTheDocument();
  });

  it('serves the local rescue page when the service worker falls back /local-rescue.html into the app shell', async () => {
    window.history.pushState({}, '', '/local-rescue.html');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '本機貓卡救援' })).toBeInTheDocument();
    expect(screen.getByText('FOUND CAT RESCUE')).toBeInTheDocument();
  });
});
