import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildGoogleMapsSearchUrl,
  encodeSingleCatSharePayload,
  type SingleCatSharePayload,
} from '../lib/singleCatShare';
import SingleCatShare from './SingleCatShare';

const payload: SingleCatSharePayload = {
  v: 1,
  id: 'cat-29',
  n: 29,
  numberLabel: 'No.029',
  catName: '放鬆的貓咪',
  date: '2026-05-11T08:00:00.000Z',
  locationName: '台北 101',
  locationAddress: '台北市信義區市府路 45 號',
  lat: 25.033,
  lng: 121.565,
  language: 'zh',
  personalityTags: ['friendly'],
  careStatusTags: ['fed'],
  includeMemo: true,
  memo: '晚上常在後方紅色花園附近',
  posterStyleVersion: 1,
};

function renderShare(data: string) {
  render(
    <MemoryRouter initialEntries={[`/s/c?data=${data}`]}>
      <Routes>
        <Route path="/s/c" element={<SingleCatShare />} />
        <Route path="/create" element={<div>create page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('SingleCatShare page', () => {
  afterEach(() => cleanup());

  it('renders a poster-first single cat share page from URL data', () => {
    renderShare(encodeSingleCatSharePayload(payload));

    expect(screen.getByText('轉角遇到貓')).toBeInTheDocument();
    expect(screen.getByText('FOUND CAT')).toBeInTheDocument();
    expect(screen.getByText('No.029')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '放鬆的貓咪' })).toBeInTheDocument();
    expect(screen.getAllByText('台北 101').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('台北市信義區市府路 45 號')).toBeInTheDocument();
    expect(screen.getByText('親人')).toBeInTheDocument();
    expect(screen.getByText('固定餵養')).toBeInTheDocument();
    expect(screen.getByText('晚上常在後方紅色花園附近')).toBeInTheDocument();
  });

  it('renders Google Maps and capture CTAs', () => {
    renderShare(encodeSingleCatSharePayload(payload));

    expect(screen.getByRole('link', { name: '用 Google Maps 打開' })).toHaveAttribute(
      'href',
      buildGoogleMapsSearchUrl({
        lat: 25.033,
        lng: 121.565,
        name: payload.locationName,
        address: payload.locationAddress,
      })
    );
    expect(screen.getByText('請溫柔靠近，不打擾貓貓生活。')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '我也遇到貓貓了！' })).toHaveAttribute('href', '/create');
  });

  it('can switch the shared single-cat page into English', async () => {
    const user = userEvent.setup();
    renderShare(encodeSingleCatSharePayload(payload));

    await user.click(screen.getByRole('button', { name: 'EN' }));

    expect(screen.getByText('Found near')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open in Google Maps' })).toBeInTheDocument();
    expect(screen.getByText('Approach gently and respect the cat’s space.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'I found a cat too!' })).toHaveAttribute('href', '/create');
  });

  it('hides memo when the sender did not opt in', () => {
    renderShare(encodeSingleCatSharePayload({ ...payload, includeMemo: false, memo: undefined }));

    expect(screen.queryByText('晚上常在後方紅色花園附近')).not.toBeInTheDocument();
    expect(screen.getByText('分享者沒有公開出沒備註。')).toBeInTheDocument();
  });

  it('shows a friendly fallback for invalid share data', () => {
    renderShare('invalid');

    expect(screen.getByText('這張貓咪分享暫時打不開')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '我也遇到貓貓了！' })).toHaveAttribute('href', '/create');
  });
});
