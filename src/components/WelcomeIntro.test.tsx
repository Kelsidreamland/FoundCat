import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import WelcomeIntro from './WelcomeIntro';

describe('WelcomeIntro', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => cleanup());

  it('explains the app and links to capture for people without cats', () => {
    render(<MemoryRouter><WelcomeIntro hasOwnCats={false} language="zh" /></MemoryRouter>);
    expect(screen.getByText('在轉角遇到貓了嗎？')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '拍下第一隻貓' })).toHaveAttribute('href', '/create');
  });

  it('hides once the person has cats or dismissed it', () => {
    const { rerender } = render(<MemoryRouter><WelcomeIntro hasOwnCats={false} language="zh" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '關閉說明' }));
    expect(screen.queryByTestId('welcome-intro')).not.toBeInTheDocument();
    window.localStorage.clear();
    rerender(<MemoryRouter><WelcomeIntro hasOwnCats language="zh" /></MemoryRouter>);
    expect(screen.queryByTestId('welcome-intro')).not.toBeInTheDocument();
  });
});
