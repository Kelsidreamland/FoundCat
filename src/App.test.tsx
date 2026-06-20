import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useAuthStore } from './store/useAuthStore';
import { useScrapbookStore } from './store/useScrapbookStore';

const visualViewportListeners = new Map<string, EventListener>();
const mockInitAuth = vi.hoisted(() => vi.fn(async () => undefined));

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

vi.mock('./store/useAuthStore', () => ({
  useAuthStore: vi.fn((selector: (state: { initAuth: () => Promise<void> }) => unknown) => selector({
    initAuth: mockInitAuth,
  })),
}));

describe('App viewport shell', () => {
  beforeEach(() => {
    mockInitAuth.mockClear();
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

  it('serves the my cat cards page at /catdex', async () => {
    window.history.pushState({}, '', '/catdex');

    render(<App />);

    expect(await screen.findByRole('heading', { name: '我的貓卡' })).toBeInTheDocument();
    expect(screen.getByText('FOUND CATS ARCHIVE')).toBeInTheDocument();
  });
});
