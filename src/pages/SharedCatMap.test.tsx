import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { buildGoogleMapsSearchUrl } from '../lib/singleCatShare';
import { encodeMapSharePayload, type MapSharePayload } from '../lib/mapShare';
import SharedCatMap from './SharedCatMap';

const payload: MapSharePayload = {
  v: 1,
  title: 'Kevin 的 FOUND CAT 地圖',
  language: 'zh',
  includeMemo: false,
  cats: [
    {
      id: 'cat-1',
      numberLabel: 'No.001',
      catName: '放鬆的貓咪',
      date: '2026-05-11T08:00:00.000Z',
      locationName: '台北 101',
      locationAddress: '台北市信義區',
      lat: 25.033,
      lng: 121.565,
      personalityTags: ['friendly'],
      careStatusTags: ['fed'],
    },
    {
      id: 'cat-2',
      numberLabel: 'No.002',
      date: '2026-05-12T08:00:00.000Z',
      locationName: '小公園',
      lat: 25.0478,
      lng: 121.5319,
    },
  ],
  posterStyleVersion: 1,
};

function renderMap(data: string) {
  render(
    <MemoryRouter initialEntries={[`/s/map?data=${data}`]}>
      <Routes>
        <Route path="/s/map" element={<SharedCatMap />} />
        <Route path="/create" element={<div>create page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SharedCatMap page', () => {
  afterEach(() => cleanup());

  it('renders a branded shared cat map from URL data', () => {
    renderMap(encodeMapSharePayload(payload));

    expect(screen.getByText('轉角遇到貓')).toBeInTheDocument();
    expect(screen.getByText('FOUND CAT')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kevin 的 FOUND CAT 地圖' })).toBeInTheDocument();
    expect(screen.getByText('2 個貓咪出沒點')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'No.001 放鬆的貓咪' })).toBeInTheDocument();
    expect(screen.getByText('台北 101')).toBeInTheDocument();
    expect(screen.getByText('親人')).toBeInTheDocument();
    expect(screen.getByText('固定餵養')).toBeInTheDocument();
  });

  it('opens Google Maps with a readable place query for the active cat', async () => {
    const user = userEvent.setup();
    renderMap(encodeMapSharePayload(payload));

    await user.click(screen.getByRole('button', { name: 'No.002 小公園' }));

    expect(screen.getByRole('link', { name: '用 Google Maps 打開' })).toHaveAttribute(
      'href',
      buildGoogleMapsSearchUrl({ lat: 25.0478, lng: 121.5319, name: '小公園' })
    );
  });

  it('can switch the shared map page into English', async () => {
    const user = userEvent.setup();
    renderMap(encodeMapSharePayload(payload));

    await user.click(screen.getByRole('button', { name: 'EN' }));

    expect(screen.getByText('2 cat spots')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in Google Maps' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'I found a cat too!' })).toHaveAttribute('href', '/create');
  });

  it('shows a friendly fallback for invalid map data', () => {
    renderMap('invalid');

    expect(screen.getByText('這份貓咪地圖暫時打不開')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '我也遇到貓貓了！' })).toHaveAttribute('href', '/create');
  });
});
