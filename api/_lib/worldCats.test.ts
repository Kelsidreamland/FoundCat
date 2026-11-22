import { describe, expect, it, vi } from 'vitest';
import { fetchCatImage, fetchWorldCatFeed, parseDataUrl, readSupabaseEnv } from './worldCats';

const env = { url: 'https://x.supabase.co', key: 'anon' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('world cat API helpers', () => {
  it('reads the Supabase settings the Vite app already uses', () => {
    expect(readSupabaseEnv({ VITE_SUPABASE_URL: 'https://x.supabase.co/', VITE_SUPABASE_ANON_KEY: 'k' })).toEqual({ url: 'https://x.supabase.co', key: 'k' });
    expect(readSupabaseEnv({})).toBeNull();
  });

  it('returns metadata with image URLs and never the inline photos', async () => {
    const fetchImpl = vi.fn(async () => json([{ id: 'a1', cat_name: '小橘', updated_at: '2026-11-20T00:00:00Z', seen_count: 2 }]));
    const feed = await fetchWorldCatFeed(env, fetchImpl as unknown as typeof fetch);
    const url = String((fetchImpl.mock.calls[0] as unknown[])[0]);
    expect(url).not.toContain('image_data');
    expect(url).toContain('seen_count');
    expect(feed[0]).toMatchObject({
      cat_name: '小橘',
      seen_count: 2,
      image_url: `/api/cat-image?id=a1&kind=card&v=${Date.parse('2026-11-20T00:00:00Z')}`,
    });
  });

  it('retries without the newer columns on a database that has not been migrated', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(json({ message: 'column seen_count does not exist' }, 400))
      .mockResolvedValueOnce(json([{ id: 'a1' }]));
    const feed = await fetchWorldCatFeed(env, fetchImpl as unknown as typeof fetch);
    expect(String((fetchImpl.mock.calls[1] as unknown[])[0])).not.toContain('seen_count');
    expect(String((fetchImpl.mock.calls[1] as unknown[])[0])).not.toContain('spot_note');
    expect(feed).toHaveLength(1);
  });

  it('decodes one photo, falls back from hero to card, and rejects bad ids', async () => {
    const png = Buffer.from('fake-png').toString('base64');
    const fetchImpl = vi.fn(async () => json([{ hero_image_data: null, image_data: `data:image/png;base64,${png}` }]));
    const image = await fetchCatImage(env, '11111111-2222-3333-4444-555555555555', 'hero', fetchImpl as unknown as typeof fetch);
    expect(image?.contentType).toBe('image/png');
    expect(image?.bytes.toString()).toBe('fake-png');
    await expect(fetchCatImage(env, "1' or 1=1", 'card', fetchImpl as unknown as typeof fetch)).resolves.toBeNull();
    expect(parseDataUrl('not a data url')).toBeNull();
  });
});
