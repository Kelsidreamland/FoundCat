import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrapbookStore } from '../store/useScrapbookStore';
import PWAUpdatePrompt from './PWAUpdatePrompt';
import { CHECK_FOR_UPDATES_EVENT } from './VersionFooter';

const setNeedRefresh = vi.fn();
const updateServiceWorker = vi.fn();
const registration = {
  update: vi.fn(async () => undefined),
};
let needRefreshState = true;
let didRegister = false;
let registeredOptions: {
  onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onNeedRefresh?: () => void;
  onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
  onRegisterError?: (error: unknown) => void;
} | undefined;

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options?: {
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration) => void;
    onOfflineReady?: () => void;
    onNeedRefresh?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: unknown) => void;
  }) => {
    registeredOptions = options;
    if (!didRegister) {
      didRegister = true;
      window.setTimeout(() => {
        options?.onRegisteredSW?.('/sw.js', registration as unknown as ServiceWorkerRegistration);
      }, 0);
    }

    return {
      needRefresh: [needRefreshState, setNeedRefresh],
      updateServiceWorker,
    };
  },
}));

describe('PWAUpdatePrompt', () => {
  beforeEach(() => {
    setNeedRefresh.mockClear();
    updateServiceWorker.mockClear();
    registration.update.mockClear();
    needRefreshState = true;
    didRegister = false;
    registeredOptions = undefined;
    window.sessionStorage.clear();
    useScrapbookStore.setState({
      language: 'zh',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the update prompt as a FOUND CAT branded card', () => {
    render(<PWAUpdatePrompt />);

    const card = screen.getByTestId('pwa-update-card');
    expect(card).toHaveClass('rounded-[18px]');
    expect(screen.getByRole('img', { name: '轉角遇到貓 App 圖示' })).toHaveAttribute('src', '/cat-icon-192.png');
    expect(screen.getByText('FOUND CAT')).toBeInTheDocument();
    expect(screen.getByText('轉角遇到貓有新的版本，更新後就能使用最新修正。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '立即更新' })).toBeInTheDocument();
  });

  it('runs a manual update check when the version footer asks for one', async () => {
    needRefreshState = false;
    render(<PWAUpdatePrompt />);

    await waitFor(() => {
      expect(registration.update).toHaveBeenCalled();
    });
    expect(screen.queryByTestId('version-check-chip')).not.toBeInTheDocument();
    const automaticChecks = registration.update.mock.calls.length;

    act(() => {
      window.dispatchEvent(new Event(CHECK_FOR_UPDATES_EVENT));
    });

    await waitFor(() => {
      expect(registration.update.mock.calls.length).toBeGreaterThan(automaticChecks);
    });
    expect(screen.getByRole('status')).toHaveTextContent('檢查更新中...');
  });

  it('keeps the later action accessible and secondary', async () => {
    render(<PWAUpdatePrompt />);

    await userEvent.click(screen.getByRole('button', { name: '稍後' }));

    expect(setNeedRefresh).toHaveBeenCalledWith(false);
  });

  it('reloads once after the new service worker controls the stale page', () => {
    const originalLocation = window.location;
    const reload = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload,
      },
    });

    render(<PWAUpdatePrompt />);

    registeredOptions?.onNeedRefresh?.();
    window.dispatchEvent(new Event('found-cat-sw-controllerchange'));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('found-cat-pwa-reloaded-for-update')).toBe('true');

    window.dispatchEvent(new Event('found-cat-sw-controllerchange'));

    expect(reload).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });
});
