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

    expect(screen.getByRole('link', { name: '大家的地圖' })).toHaveAttribute('href', '/map?mode=public');
    expect(screen.getByRole('link', { name: '拍貓' })).toHaveAttribute('href', '/create');
    expect(screen.getByRole('link', { name: '貓咪地圖' })).toHaveAttribute('href', '/map');
  });

  it('does not mark the shared-map action as current on the home page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <CatActionNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '大家的地圖' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: '拍貓' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: '貓咪地圖' })).not.toHaveAttribute('aria-current');
  });

  it('marks the shared-map action as current on the public map route', () => {
    render(
      <MemoryRouter initialEntries={['/map?mode=public']}>
        <CatActionNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '大家的地圖' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '貓咪地圖' })).not.toHaveAttribute('aria-current');
  });

  it('moves the active tab state when the user is on the map', () => {
    render(
      <MemoryRouter initialEntries={['/map']}>
        <CatActionNav />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '大家的地圖' })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: '貓咪地圖' })).toHaveAttribute('aria-current', 'page');
  });

  it('uses a single branded icon system for the primary actions', () => {
    render(
      <MemoryRouter>
        <CatActionNav />
      </MemoryRouter>
    );

    expect(screen.getByTestId('brand-icon-share-map')).toHaveAttribute('data-brand-icon', 'share-map');
    expect(screen.getByTestId('brand-icon-camera')).toHaveAttribute('data-brand-icon', 'camera');
    expect(screen.getByTestId('brand-icon-map')).toHaveAttribute('data-brand-icon', 'map');
  });
});