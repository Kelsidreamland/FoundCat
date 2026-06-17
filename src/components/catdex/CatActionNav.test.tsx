import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import CatActionNav from './CatActionNav';

describe('CatActionNav', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the three primary actions with stable routes', () => {
    render(
      <MemoryRouter>
        <CatActionNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '我的貓卡' })).toHaveAttribute('href', '/catdex');
    expect(screen.getByRole('link', { name: '拍貓' })).toHaveAttribute('href', '/create');
    expect(screen.getByRole('link', { name: '貓咪地圖' })).toHaveAttribute('href', '/map');
  });

  it('does not mark the cat-card action as current on the home page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <CatActionNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '我的貓卡' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: '拍貓' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: '貓咪地圖' })).not.toHaveAttribute('aria-current');
  });

  it('marks the cat-card action as current on the catdex route', () => {
    render(
      <MemoryRouter initialEntries={['/catdex']}>
        <CatActionNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '我的貓卡' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '貓咪地圖' })).not.toHaveAttribute('aria-current');
  });

  it('moves the active tab state when the user is on the map', () => {
    render(
      <MemoryRouter initialEntries={['/map']}>
        <CatActionNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '我的貓卡' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: '貓咪地圖' })).toHaveAttribute('aria-current', 'page');
  });

  it('uses a single branded icon system for the primary actions', () => {
    render(
      <MemoryRouter>
        <CatActionNav />
      </MemoryRouter>
    );

    expect(screen.getByTestId('brand-icon-cat-cards')).toHaveAttribute('data-brand-icon', 'cat-cards');
    expect(screen.getByTestId('brand-icon-camera')).toHaveAttribute('data-brand-icon', 'camera');
    expect(screen.getByTestId('brand-icon-map')).toHaveAttribute('data-brand-icon', 'map');
  });
});