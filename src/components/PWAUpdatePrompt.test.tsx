import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrapbookStore } from '../store/useScrapbookStore';
import PWAUpdatePrompt from './PWAUpdatePrompt';

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

  it('keeps a compact manual update checker visible in production', async () => {
    needRefreshState = false;
    render(<PWAUpdatePrompt />);

    await waitFor(() => {
      expect(registration.update).toHaveBeenCalled();
    });
    expect(screen.getByTestId('version-check-chip')).toHaveClass('bottom-[calc(env(safe-area-inset-bottom)+5.75rem)]');
    expect(screen.getByTestId('version-check-chip')).toHaveClass('left-3');
    expect(screen.getByTestId('version-check-chip')).not.toHaveClass('top-[calc(env(safe-area-inset-top)+3.05rem)]');
    expect(screen.getByTestId('version-check-chip')).not.toHaveClass('right-4');
    const updateButton = screen.getByRole('button', { name: /版本/ });
    expect(updateButton).toHaveTextContent(/^v/);
    expect(updateButton).not.toHaveTextContent('·');
    const automaticChecks = registration.update.mock.calls.length;

    await userEvent.click(updateButton);

    await waitFor(() => {
      expect(registration.update.mock.calls.length).toBeGreaterThan(automaticChecks);
    });
    expect(screen.getByText('檢查更新中...')).toBeInTheDocument();
  });

  it('hides the compact update checker while another dialog is open', async () => {
    needRefreshState = false;
    render(<PWAUpdatePrompt />);

    await waitFor(() => {
      expect(screen.getByTestId('version-check-chip')).toBeInTheDocument();
    });

    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.appendChild(dialog);

    await waitFor(() => {
      expect(screen.queryByTestId('version-check-chip')).not.toBeInTheDocument();
    });

    dialog.remove();

    await waitFor(() => {
      expect(screen.getByTestId('version-check-chip')).toBeInTheDocument();
    });
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
