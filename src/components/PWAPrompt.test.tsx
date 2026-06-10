import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import PWAPrompt from './PWAPrompt';

function dispatchInstallPrompt() {
  const event = new Event('beforeinstallprompt') as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
    platforms: string[];
  };

  Object.defineProperties(event, {
    platforms: { value: ['web'] },
    prompt: { value: vi.fn(async () => undefined) },
    userChoice: { value: Promise.resolve({ outcome: 'dismissed', platform: 'web' }) },
  });

  window.dispatchEvent(event);
}

describe('PWAPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('shows the selected moodboard app icon in the install prompt', async () => {
    render(<PWAPrompt />);

    dispatchInstallPrompt();

    expect(await screen.findByRole('img', { name: '轉角遇到貓 App 圖示' })).toHaveAttribute(
      'src',
      '/cat-icon-192.png'
    );
    expect(screen.getByTestId('pwa-install-icon-frame')).toHaveClass('bg-transparent');
    expect(screen.getByRole('heading', { name: '安裝轉角遇到貓' })).toBeInTheDocument();
    expect(screen.getByText('把轉角遇到貓加入主畫面，下次遇見貓可以更快打開。')).toBeInTheDocument();
    expect(screen.queryByText(/圖鑑/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '加入主畫面' })).toBeInTheDocument();
  });

  it('lets users dismiss the branded install prompt', async () => {
    render(<PWAPrompt />);

    dispatchInstallPrompt();

    await screen.findByRole('heading', { name: '安裝轉角遇到貓' });
    await userEvent.click(screen.getByRole('button', { name: '關閉安裝提示' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '安裝轉角遇到貓' })).not.toBeInTheDocument();
    });
    expect(localStorage.getItem('pwa-prompt-dismissed')).toBe('true');
  });
});
