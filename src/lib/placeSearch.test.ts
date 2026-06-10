import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reverseGeocodePlace, searchPlaces } from './placeSearch';

const photonResponse = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [121.5645, 25.033],
      },
      properties: {
        osm_id: 12345,
        osm_type: 'N',
        name: 'Taipei 101',
        city: '台北市',
        district: '信義區',
        country: '台灣',
      },
    },
  ],
};

const emptyPhotonResponse = {
  type: 'FeatureCollection',
  features: [],
};

const fullPhotonResponse = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [114.1694, 22.3193],
      },
      properties: {
        osm_id: 111,
        osm_type: 'N',
        name: 'Cat Street',
        city: 'Hong Kong',
        country: 'Hong Kong',
      },
    },
    {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [114.1701, 22.3201],
      },
      properties: {
        osm_id: 222,
        osm_type: 'N',
        name: 'Cat Cafe',
        city: 'Hong Kong',
        country: 'Hong Kong',
      },
    },
  ],
};

const nominatimResponse = [
  {
    place_id: 345,
    osm_type: 'way',
    osm_id: 67890,
    lat: '13.7563',
    lon: '100.5018',
    display_name: 'ตลาดแมว, ถนนเจริญกรุง, กรุงเทพมหานคร, ประเทศไทย',
    address: {
      road: 'ถนนเจริญกรุง',
      city: 'กรุงเทพมหานคร',
      country: 'ประเทศไทย',
    },
  },
];

describe('place search', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => photonResponse,
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not call the provider for short queries', async () => {
    await expect(searchPlaces('台', { language: 'zh' })).resolves.toEqual([]);

    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps Photon features into app location suggestions', async () => {
    const results = await searchPlaces('Taipei 101', { language: 'zh' });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://photon.komoot.io/api/?'),
      expect.objectContaining({ signal: undefined })
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=Taipei+101'),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('limit=8'),
      expect.any(Object)
    );
    expect(results).toEqual([
      {
        lat: 25.033,
        lng: 121.5645,
        name: 'Taipei 101',
        address: '信義區, 台北市, 台灣',
        placeId: 'N:12345',
      },
    ]);
  });

  it('asks Photon for English labels when the app is in English', async () => {
    await searchPlaces('cat cafe', { language: 'en' });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('lang=en'),
      expect.any(Object)
    );
  });

  it('can bias results around the current map center', async () => {
    await searchPlaces('Taipei 101', {
      language: 'zh',
      around: { lat: 25.033, lng: 121.565 },
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('lat=25.033'),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('lon=121.565'),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('zoom=10'),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('location_bias_scale=0.6'),
      expect.any(Object)
    );
  });

  it('can force Nominatim address resolution after an explicit confirm action', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fullPhotonResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => nominatimResponse,
      } as Response);

    const results = await searchPlaces('Ekkamai', {
      language: 'en',
      includeAddressFallback: true,
      forceAddressFallback: true,
      around: { lat: 13.73, lng: 100.58 },
      limit: 1,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    const nominatimUrl = new URL(vi.mocked(fetch).mock.calls[1][0] as string);
    expect(nominatimUrl.origin + nominatimUrl.pathname).toBe('https://nominatim.openstreetmap.org/search');
    expect(nominatimUrl.searchParams.get('viewbox')).toBeTruthy();
    expect(nominatimUrl.searchParams.get('bounded')).toBeNull();
    expect(results).toEqual([
      {
        lat: 13.7563,
        lng: 100.5018,
        name: 'ตลาดแมว',
        address: 'ถนนเจริญกรุง, กรุงเทพมหานคร, ประเทศไทย',
        placeId: 'W:67890',
      },
    ]);
  });

  it('falls back to Nominatim so addresses and local-language places can still be found', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => emptyPhotonResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => nominatimResponse,
      } as Response);

    const results = await searchPlaces('ตลาดแมว ถนนเจริญกรุง', {
      language: 'zh',
      includeAddressFallback: true,
    });

    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('https://nominatim.openstreetmap.org/search?'),
      expect.objectContaining({ signal: undefined })
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('format=jsonv2'),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('addressdetails=1'),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('accept-language=zh-TW%2Czh%2Cen'),
      expect.any(Object)
    );
    expect(results).toEqual([
      {
        lat: 13.7563,
        lng: 100.5018,
        name: 'ตลาดแมว',
        address: 'ถนนเจริญกรุง, กรุงเทพมหานคร, ประเทศไทย',
        placeId: 'W:67890',
      },
    ]);
  });

  it('prioritizes address fallback for local-language suggestions even when Photon is full', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => fullPhotonResponse,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => nominatimResponse,
      } as Response);

    const results = await searchPlaces('ตลาดแมว ถนนเจริญกรุง', {
      language: 'zh',
      includeAddressFallback: true,
      limit: 2,
    });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('https://nominatim.openstreetmap.org/search?'),
      expect.any(Object)
    );
    expect(results[0]).toMatchObject({
      name: 'ตลาดแมว',
      address: 'ถนนเจริญกรุง, กรุงเทพมหานคร, ประเทศไทย',
    });
  });

  it('keeps autocomplete on Photon unless address fallback is explicitly requested', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => emptyPhotonResponse,
    } as Response);

    await expect(searchPlaces('ตลาดแมว ถนนเจริญกรุง', { language: 'zh' })).resolves.toEqual([]);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://photon.komoot.io/api/?'),
      expect.any(Object)
    );
  });

  it('reverse geocodes a tapped map coordinate into a readable nearby place', async () => {
    const result = await reverseGeocodePlace({
      lat: 25.033,
      lng: 121.565,
      language: 'zh',
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('https://photon.komoot.io/reverse?'),
      expect.objectContaining({ signal: undefined })
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('lat=25.033'),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('lon=121.565'),
      expect.any(Object)
    );
    expect(result).toEqual({
      lat: 25.033,
      lng: 121.5645,
      name: 'Taipei 101',
      address: '信義區, 台北市, 台灣',
      placeId: 'N:12345',
    });
  });
});
