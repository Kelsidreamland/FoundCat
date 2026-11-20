import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReportCatLink, SeenItButton } from './CatSocialActions';

const upsert = vi.fn(async () => ({ error: null }));
const insert = vi.fn(async () => ({ error: null }));
const from = vi.fn(() => ({ upsert, insert }));

vi.mock('../../lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(async () => ({ from })),
}));

describe('world cat social actions', () => {
  beforeEach(() => {
    window.localStorage.clear();
    upsert.mockClear();
    insert.mockClear();
    from.mockClear();
  });
  afterEach(() => cleanup());

  it('records "seen it too" once per browser and bumps the count', async () => {
    const { unmount } = render(<SeenItButton catId="cat-1" seenCount={2} language="zh" />);
    expect(screen.getByRole('button', { name: /我也見過/ })).toHaveTextContent('2 人見過');

    fireEvent.click(screen.getByRole('button', { name: /我也見過/ }));
    await waitFor(() => expect(screen.getByRole('button', { name: /你也見過/ })).toBeDisabled());
    expect(screen.getByRole('button', { name: /你也見過/ })).toHaveTextContent('3 人見過');
    expect(from).toHaveBeenCalledWith('cat_sightings');
    expect(upsert).toHaveBeenCalledWith(
      { cat_id: 'cat-1', device_id: expect.any(String) },
      { onConflict: 'cat_id,device_id', ignoreDuplicates: true }
    );

    unmount();
    render(<SeenItButton catId="cat-1" seenCount={3} language="zh" />);
    expect(screen.getByRole('button', { name: /你也見過/ })).toBeDisabled();
  });

  it('sends a report with a chosen reason', async () => {
    render(<ReportCatLink catId="cat-9" language="zh" />);
    fireEvent.click(screen.getByRole('button', { name: '檢舉這張貓卡' }));
    expect(screen.getByRole('button', { name: '送出檢舉' })).toBeDisabled();

    fireEvent.click(screen.getByLabelText('洩露個人隱私或住址'));
    fireEvent.change(screen.getByPlaceholderText('補充說明（可略過）'), { target: { value: ' 這是我家門口 ' } });
    fireEvent.click(screen.getByRole('button', { name: '送出檢舉' }));

    expect(await screen.findByRole('status')).toHaveTextContent('已收到檢舉');
    expect(from).toHaveBeenCalledWith('cat_reports');
    expect(insert).toHaveBeenCalledWith({ cat_id: 'cat-9', reason: 'privacy', note: '這是我家門口' });
  });
});
