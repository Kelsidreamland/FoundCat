import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import maplibregl from 'maplibre-gl';
import LocationPicker from './LocationPicker';
import { reverseGeocodePlace, searchPlaces } from '../lib/placeSearch';

const markerSetLngLat = vi.fn();
const markerAddTo = vi.fn();
const markerRemove = vi.fn();
const mapEaseTo = vi.fn();
const mapGetCenter = vi.fn();
const mapGetZoom = vi.fn();
const mapRemove = vi.fn();

vi.mock('maplibre-gl', () => ({
  default: {
    Map: vi.fn(function MapMock(this: {
      addControl: ReturnType<typeof vi.fn>;
      on: ReturnType<typeof vi.fn>;
      easeTo: ReturnType<typeof vi.fn>;
      getCenter: ReturnType<typeof vi.fn>;
      getZoom: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    }) {
      this.addControl = vi.fn();
      this.on = vi.fn();
      this.easeTo = mapEaseTo;
      this.getCenter = mapGetCenter;
      this.getZoom = mapGetZoom;
      this.remove = mapRemove;
    }),
    Marker: vi.fn(function MarkerMock(this: {
      setLngLat: ReturnType<typeof vi.fn>;
      addTo: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    }) {
      this.setLngLat = markerSetLngLat.mockReturnThis();
      this.addTo = markerAddTo.mockReturnThis();
      this.remove = markerRemove;
    }),
    NavigationControl: vi.fn(),
  },
}));

vi.mock('../lib/placeSearch', () => ({
  reverseGeocodePlace: vi.fn(),
  searchPlaces: vi.fn(),
}));

describe('LocationPicker', () => {
  beforeEach(() => {
    vi.mocked(maplibregl.Map).mockClear();
    vi.mocked(searchPlaces).mockClear();
    vi.mocked(reverseGeocodePlace).mockClear();
    vi.mocked(searchPlaces).mockResolvedValue([
      {
        lat: 25.033,
        lng: 121.5645,
        name: 'Taipei 101',
        address: '信義區, 台北市, 台灣',
        placeId: 'N:12345',
      },
    ]);
    vi.mocked(reverseGeocodePlace).mockResolvedValue({
      lat: 25.033,
      lng: 121.5645,
      name: 'Taipei 101',
      address: '信義區, 台北市, 台灣',
      placeId: 'N:12345',
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: undefined,
    });
    markerSetLngLat.mockClear();
    markerAddTo.mockClear();
    markerRemove.mockClear();
    mapEaseTo.mockClear();
    mapGetCenter.mockReturnValue({ lat: 25.033, lng: 121.565 });
    mapGetZoom.mockReturnValue(11);
    mapRemove.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('searches places and saves the picked suggestion with address metadata', async () => {
    const onPicked = vi.fn();

    render(
      <LocationPicker
        language="zh"
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'Taipei 101' },
    });

    await screen.findByRole('button', { name: /Taipei 101/ });
    fireEvent.click(screen.getByRole('button', { name: /Taipei 101/ }));
    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    await waitFor(() => {
      expect(searchPlaces).toHaveBeenCalledWith(
        'Taipei 101',
        expect.objectContaining({
          language: 'zh',
          includeAddressFallback: false,
          limit: 12,
        })
      );
      expect(vi.mocked(searchPlaces).mock.calls[0][1].around).toBeUndefined();
      expect(markerSetLngLat).toHaveBeenCalledWith([121.5645, 25.033]);
      expect(mapEaseTo).toHaveBeenCalledWith(
        expect.objectContaining({ center: [121.5645, 25.033], zoom: 15 })
      );
      expect(onPicked).toHaveBeenCalledWith({
        lat: 25.033,
        lng: 121.5645,
        name: 'Taipei 101',
        address: '信義區, 台北市, 台灣',
        placeId: 'N:12345',
      });
    });
  });

  it('lets a typed address be confirmed by resolving the first matching search result', async () => {
    const onPicked = vi.fn();

    render(
      <LocationPicker
        language="zh"
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'ตลาดแมว ถนนเจริญกรุง' },
    });
    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    await waitFor(() => {
      expect(searchPlaces).toHaveBeenCalledWith(
        'ตลาดแมว ถนนเจริญกรุง',
        expect.objectContaining({
          language: 'zh',
          includeAddressFallback: true,
          forceAddressFallback: true,
          limit: 5,
        })
      );
      expect(vi.mocked(searchPlaces).mock.calls[0][1].around).toBeUndefined();
      expect(mapEaseTo).toHaveBeenCalledWith(
        expect.objectContaining({ center: [121.5645, 25.033], zoom: 15 })
      );
      expect(onPicked).toHaveBeenCalledWith({
        lat: 25.033,
        lng: 121.5645,
        name: 'Taipei 101',
        address: '信義區, 台北市, 台灣',
        placeId: 'N:12345',
      });
    });
  });

  it('offers an explicit full-address search when instant suggestions miss local-language places', async () => {
    const onPicked = vi.fn();
    vi.mocked(searchPlaces)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          lat: 13.7563,
          lng: 100.5018,
          name: 'ตลาดแมว',
          address: 'ถนนเจริญกรุง, กรุงเทพมหานคร, ประเทศไทย',
          placeId: 'W:67890',
        },
      ]);

    render(
      <LocationPicker
        language="zh"
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'ตลาดแมว ถนนเจริญกรุง' },
    });

    await screen.findByText('搜尋完整地址');
    fireEvent.click(screen.getByRole('button', { name: '搜尋完整地址' }));

    await screen.findByRole('button', { name: /ตลาดแมว/ });

    expect(searchPlaces).toHaveBeenNthCalledWith(
      2,
      'ตลาดแมว ถนนเจริญกรุง',
      expect.objectContaining({
        language: 'zh',
        includeAddressFallback: true,
        forceAddressFallback: true,
        limit: 8,
      })
    );
    expect(vi.mocked(searchPlaces).mock.calls[1][1].around).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: /ตลาดแมว/ }));
    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    expect(onPicked).toHaveBeenCalledWith({
      lat: 13.7563,
      lng: 100.5018,
      name: 'ตลาดแมว',
      address: 'ถนนเจริญกรุง, กรุงเทพมหานคร, ประเทศไทย',
      placeId: 'W:67890',
    });
  });

  it('keeps the same map instance after typing and choosing a suggestion', async () => {
    render(
      <LocationPicker
        language="zh"
        onPicked={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(maplibregl.Map).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'Taipei 101' },
    });

    await screen.findByRole('button', { name: /Taipei 101/ });
    fireEvent.click(screen.getByRole('button', { name: /Taipei 101/ }));

    await waitFor(() => {
      expect(mapEaseTo).toHaveBeenCalledWith(
        expect.objectContaining({ center: [121.5645, 25.033], zoom: 15 })
      );
    });
    expect(maplibregl.Map).toHaveBeenCalledTimes(1);
    expect(mapRemove).not.toHaveBeenCalled();
  });

  it('preloads an existing location for editing', async () => {
    const onPicked = vi.fn();

    render(
      <LocationPicker
        language="zh"
        initialLocation={{
          lat: 25.0478,
          lng: 121.5319,
          name: '舊咖啡店',
          address: '台北市中山區',
          placeId: 'old-place',
        }}
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByLabelText('地點名稱')).toHaveValue('舊咖啡店');
    expect(markerSetLngLat).toHaveBeenCalledWith([121.5319, 25.0478]);
    expect(mapEaseTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [121.5319, 25.0478], zoom: 15 })
    );

    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    expect(onPicked).toHaveBeenCalledWith({
      lat: 25.0478,
      lng: 121.5319,
      name: '舊咖啡店',
      address: '台北市中山區',
      placeId: 'old-place',
    });
  });

  it('resolves a newly typed place before confirming an existing edited location', async () => {
    const onPicked = vi.fn();

    render(
      <LocationPicker
        language="zh"
        initialLocation={{
          lat: 25.0478,
          lng: 121.5319,
          name: '舊咖啡店',
          address: '台北市中山區',
          placeId: 'old-place',
        }}
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'Taipei 101' },
    });
    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    await waitFor(() => {
      expect(searchPlaces).toHaveBeenCalledWith(
        'Taipei 101',
        expect.objectContaining({
          language: 'zh',
          around: { lat: 25.033, lng: 121.565, zoom: 11 },
          includeAddressFallback: true,
          forceAddressFallback: true,
          limit: 5,
        })
      );
      expect(onPicked).toHaveBeenCalledWith({
        lat: 25.033,
        lng: 121.5645,
        name: 'Taipei 101',
        address: '信義區, 台北市, 台灣',
        placeId: 'N:12345',
      });
    });
  });

  it('reverse geocodes direct map taps so saved locations get readable place metadata', async () => {
    const onPicked = vi.fn();
    let clickHandler: ((event: { lngLat: { lat: number; lng: number } }) => void) | undefined;

    const MapMock = vi.mocked(maplibregl.Map) as unknown as ReturnType<typeof vi.fn>;
    MapMock.mockImplementationOnce(function MapMock(this: {
      addControl: ReturnType<typeof vi.fn>;
      on: ReturnType<typeof vi.fn>;
      easeTo: ReturnType<typeof vi.fn>;
      getCenter: ReturnType<typeof vi.fn>;
      getZoom: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    }) {
      this.addControl = vi.fn();
      this.on = vi.fn((event: string, callback: (event: { lngLat: { lat: number; lng: number } }) => void) => {
        if (event === 'click') clickHandler = callback;
      });
      this.easeTo = mapEaseTo;
      this.getCenter = mapGetCenter;
      this.getZoom = mapGetZoom;
      this.remove = mapRemove;
    });

    render(
      <LocationPicker
        language="zh"
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    clickHandler?.({ lngLat: { lat: 25.033, lng: 121.565 } });

    await waitFor(() => {
      expect(reverseGeocodePlace).toHaveBeenCalledWith({
        lat: 25.033,
        lng: 121.565,
        language: 'zh',
      });
      expect(screen.getByLabelText('地點名稱')).toHaveValue('Taipei 101');
    });

    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    expect(onPicked).toHaveBeenCalledWith({
      lat: 25.033,
      lng: 121.565,
      name: 'Taipei 101',
      address: '信義區, 台北市, 台灣',
      placeId: 'N:12345',
    });
  });
});
