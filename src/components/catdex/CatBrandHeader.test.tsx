import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CatBrandHeader from './CatBrandHeader';

describe('CatBrandHeader', () => {
  afterEach(() => cleanup());

  it('renders the title, English subtitle, and language toggle', async () => {
    const user = userEvent.setup();
    const onToggleLanguage = vi.fn();

    render(
      <MemoryRouter>
        <CatBrandHeader
          title="轉角遇到貓"
          subtitle="FOUND CAT"
          language="zh"
          onToggleLanguage={onToggleLanguage}
          toggleLabel="Switch to English"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: '轉角遇到貓' })).toBeInTheDocument();
    expect(screen.getAllByText('FOUND CAT').length).toBeGreaterThanOrEqual(1);
    const logo = screen.getByRole('img', { name: '轉角遇到貓 FOUND CAT Logo' });
    expect(logo.querySelector('image')).toHaveAttribute('href', '/brand/moodboard-l1-logo-transparent.png');
    expect(logo).toHaveTextContent('FOUND CAT');
    expect(logo).not.toHaveTextContent('Corner Cat');
    expect(logo.closest('header')).toHaveClass('min-h-[76px]');
    expect(screen.getByRole('link', { name: '回到首頁' })).toHaveAttribute('href', '/');

    await user.click(screen.getByRole('button', { name: 'Switch to English' }));
    expect(onToggleLanguage).toHaveBeenCalledTimes(1);
  });

  it('can render a donation link beside the language toggle', () => {
    render(
      <MemoryRouter>
        <CatBrandHeader
          title="轉角遇到貓"
          subtitle="FOUND CAT"
          language="en"
          onToggleLanguage={vi.fn()}
          toggleLabel="切換為中文"
          donationUrl="https://example.com/donate"
          donationLabel="Donate"
        />
      </MemoryRouter>
    );

    const donationLink = screen.getByRole('link', { name: 'Donate' });
    expect(donationLink).toHaveAttribute('href', 'https://example.com/donate');
    expect(donationLink).toHaveAttribute('target', '_blank');
    expect(donationLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    expect(donationLink).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('can render a consistent close action back to the home page', () => {
    render(
      <MemoryRouter>
        <CatBrandHeader
          title="轉角遇到貓"
          subtitle="FOUND CAT"
          showLanguageToggle={false}
          showClose
          closeLabel="關閉回首頁"
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '回到首頁' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '關閉回首頁' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: 'Switch to English' })).not.toBeInTheDocument();
  });
});
