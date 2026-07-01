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
          includeAddressFallback: true,
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

  it('does not request GPS automatically when the picker opens', () => {
    const getCurrentPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });

    render(
      <LocationPicker
        language="zh"
        onPicked={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('tells users they can paste a Google Maps link in the location field', () => {
    render(
      <LocationPicker
        language="zh"
        onPicked={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getAllByText(/貼上 Google Maps 連結/).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('貼上 Google Maps 連結、搜尋店名或地址')).toBeInTheDocument();
    expect(screen.getByText('貼完整地圖連結')).toBeInTheDocument();
    expect(screen.getByText('搜尋店名地址')).toBeInTheDocument();
    expect(screen.getByText('點地圖放 pin')).toBeInTheDocument();
    expect(screen.getByText('貼完整 Google Maps 連結最準，也可以搜尋店名地址，或直接點地圖放 pin。')).toBeInTheDocument();
  });

  it('tells users a full Google Maps coordinate link can be confirmed immediately', async () => {
    render(
      <LocationPicker
        language="zh"
        onPicked={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'https://www.google.com/maps/place/G+Nimman+Chiang+Mai/@18.795163,98.967533,18z' },
    });

    expect(await screen.findByText('已讀到 Google Maps 位置，可以直接確認地點。')).toBeInTheDocument();
  });

  it('restores the typed location draft after the app is reloaded during location entry', async () => {
    const { unmount } = render(
      <LocationPicker
        language="zh"
        draftKey="pending-cat-id"
        onPicked={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'https://www.google.com/maps/place/G+Nimman+Chiang+Mai/@18.795163,98.967533,18z' },
    });
    expect(await screen.findByText('已讀到 Google Maps 位置，可以直接確認地點。')).toBeInTheDocument();

    unmount();

    render(
      <LocationPicker
        language="zh"
        draftKey="pending-cat-id"
        onPicked={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByLabelText('地點名稱')).toHaveValue('https://www.google.com/maps/place/G+Nimman+Chiang+Mai/@18.795163,98.967533,18z');
    expect(await screen.findByText('已讀到 Google Maps 位置，可以直接確認地點。')).toBeInTheDocument();
  });

  it('tells users typed place text can be searched or pinned on the map', () => {
    render(
      <LocationPicker
        language="zh"
        onPicked={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: '成都貓咪咖啡館' },
    });

    expect(screen.getByText('可以搜尋店名或地址；找不到時，保留這段文字再點地圖選位置。')).toBeInTheDocument();
  });

  it('uses address fallback for instant suggestions so pasted addresses and local-language cafe names can resolve sooner', async () => {
    render(
      <LocationPicker
        language="zh"
        onPicked={vi.fn()}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'ตลาดแมว ถนนเจริญกรุง' },
    });

    await screen.findByRole('button', { name: /Taipei 101/ });

    expect(searchPlaces).toHaveBeenCalledWith(
      'ตลาดแมว ถนนเจริญกรุง',
      expect.objectContaining({
        language: 'zh',
        includeAddressFallback: true,
        limit: 12,
      })
    );
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

  it('lets users paste a Google Maps link and apply its coordinates without calling Google APIs', async () => {
    const onPicked = vi.fn();

    render(
      <LocationPicker
        language="zh"
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'https://www.google.com/maps/place/G+Nimman+Chiang+Mai/@18.795163,98.967533,18z' },
    });

    expect(await screen.findByText('已讀取 Google Maps 位置')).toBeInTheDocument();
    expect(searchPlaces).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '套用 Google Maps 位置' }));
    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    expect(markerSetLngLat).toHaveBeenCalledWith([98.967533, 18.795163]);
    expect(mapEaseTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [98.967533, 18.795163], zoom: 16 })
    );
    expect(onPicked).toHaveBeenCalledWith({
      lat: 18.795163,
      lng: 98.967533,
      name: 'G Nimman Chiang Mai',
      mapUrl: 'https://www.google.com/maps/place/G+Nimman+Chiang+Mai/@18.795163,98.967533,18z',
    });
  });

  it('saves a tapped map point with the typed cafe name when search providers cannot find it', async () => {
    const onPicked = vi.fn();
    vi.mocked(searchPlaces).mockResolvedValue([]);
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

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: '成都貓咪咖啡館' },
    });
    clickHandler?.({ lngLat: { lat: 30.657, lng: 104.066 } });

    await waitFor(() => {
      expect(screen.getByText('搜尋不到也沒關係，可以點地圖選大概位置，並用輸入文字當地點名稱。')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    await waitFor(() => {
      expect(onPicked).toHaveBeenCalledWith(expect.objectContaining({
        lat: 30.657,
        lng: 104.066,
        name: '成都貓咪咖啡館',
      }));
    });
  });

  it('saves the typed place name at the map center when search providers cannot find it', async () => {
    const onPicked = vi.fn();
    vi.mocked(searchPlaces).mockResolvedValue([]);

    render(
      <LocationPicker
        language="zh"
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: '成都貓咪咖啡館' },
    });
    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    await waitFor(() => {
      expect(searchPlaces).toHaveBeenCalledWith(
        '成都貓咪咖啡館',
        expect.objectContaining({
          language: 'zh',
          includeAddressFallback: true,
          forceAddressFallback: true,
          limit: 5,
        })
      );
      expect(onPicked).toHaveBeenCalledWith({
        lat: 25.033,
        lng: 121.565,
        name: '成都貓咪咖啡館',
      });
    });
  });

  it('does not save an unreadable Google Maps short link as an approximate map center', async () => {
    const onPicked = vi.fn();

    render(
      <LocationPicker
        language="zh"
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'https://maps.app.goo.gl/abc123' },
    });
    expect(await screen.findByText('短連結讀不到座標。請先在 Google Maps 打開，複製完整網址；或保留這段文字，直接點地圖放 pin。')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    expect(searchPlaces).not.toHaveBeenCalled();
    expect(onPicked).not.toHaveBeenCalled();
  });

  it('lets a Google Maps short link be saved after the user manually places the map pin', async () => {
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

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'https://maps.app.goo.gl/abc123' },
    });
    clickHandler?.({ lngLat: { lat: 24.1501, lng: 120.6839 } });
    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    await waitFor(() => {
      expect(onPicked).toHaveBeenCalledWith({
        lat: 24.1501,
        lng: 120.6839,
        name: '貓咪出沒點',
        mapUrl: 'https://maps.app.goo.gl/abc123',
      });
    });
  });

  it('saves the original Google Maps URL when a pasted full map link has coordinates', async () => {
    const onPicked = vi.fn();

    render(
      <LocationPicker
        language="zh"
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'https://www.google.com/maps/place/G+Nimman+Chiang+Mai/@18.795163,98.967533,18z' },
    });
    fireEvent.click(await screen.findByRole('button', { name: '套用 Google Maps 位置' }));
    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    expect(onPicked).toHaveBeenCalledWith({
      lat: 18.795163,
      lng: 98.967533,
      name: 'G Nimman Chiang Mai',
      mapUrl: 'https://www.google.com/maps/place/G+Nimman+Chiang+Mai/@18.795163,98.967533,18z',
    });
  });

  it('confirms a full Google Maps coordinate link directly without falling back to the map center', async () => {
    const onPicked = vi.fn();
    vi.mocked(searchPlaces).mockResolvedValue([]);

    render(
      <LocationPicker
        language="zh"
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'https://www.google.com/maps/place/G+Nimman+Chiang+Mai/@18.795163,98.967533,18z' },
    });
    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    expect(searchPlaces).not.toHaveBeenCalled();
    expect(markerSetLngLat).toHaveBeenCalledWith([98.967533, 18.795163]);
    expect(mapEaseTo).toHaveBeenCalledWith(
      expect.objectContaining({ center: [98.967533, 18.795163], zoom: 16 })
    );
    expect(onPicked).toHaveBeenCalledWith({
      lat: 18.795163,
      lng: 98.967533,
      name: 'G Nimman Chiang Mai',
      mapUrl: 'https://www.google.com/maps/place/G+Nimman+Chiang+Mai/@18.795163,98.967533,18z',
    });
  });

  it('uses readable Google Maps search text to resolve pasted map URLs without coordinates', async () => {
    const onPicked = vi.fn();

    render(
      <LocationPicker
        language="zh"
        onPicked={onPicked}
        onClose={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('地點名稱'), {
      target: { value: 'https://www.google.com/maps/search/G%20Nimman%20Chiang%20Mai' },
    });
    fireEvent.click(screen.getByRole('button', { name: '確認地點' }));

    await waitFor(() => {
      expect(searchPlaces).toHaveBeenCalledWith(
        'G Nimman Chiang Mai',
        expect.objectContaining({
          language: 'zh',
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
