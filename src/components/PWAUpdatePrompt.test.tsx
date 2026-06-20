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

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: (options?: {
    onRegisteredSW?: (swUrl: string, registration: ServiceWorkerRegistration) => void;
  }) => {
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
    const automaticChecks = registration.update.mock.calls.length;

    await userEvent.click(screen.getByRole('button', { name: /版本/ }));

    await waitFor(() => {
      expect(registration.update.mock.calls.length).toBeGreaterThan(automaticChecks);
    });
    expect(screen.getByText('檢查更新中...')).toBeInTheDocument();
  });

  it('keeps the later action accessible and secondary', async () => {
    render(<PWAUpdatePrompt />);

    await userEvent.click(screen.getByRole('button', { name: '稍後' }));

    expect(setNeedRefresh).toHaveBeenCalledWith(false);
  });
});
