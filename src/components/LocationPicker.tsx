import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Loader2, LocateFixed, MapPin, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { translations } from '../translations';
import { reverseGeocodePlace, searchPlaces, type PlaceSuggestion } from '../lib/placeSearch';
import { parseGoogleMapsLink, parseGoogleMapsSearchText } from '../lib/googleMapsLink';

const OPEN_FREE_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_CENTER: [number, number] = [114.1694, 22.3193];

interface LocationResult {
  lat: number;
  lng: number;
  name: string;
  address?: string;
  placeId?: string;
  mapUrl?: string;
}

interface LocationPickerProps {
  initialLocation?: LocationResult;
  onPicked: (location: LocationResult) => void;
  onClose: () => void;
  language: 'zh' | 'en';
}

export default function LocationPicker({ initialLocation, onPicked, onClose, language }: LocationPickerProps) {
  const t = translations[language];
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const selectedSuggestionNameRef = useRef<string | null>(initialLocation?.name ?? null);
  const locationNameRef = useRef(initialLocation?.name ?? '');
  const defaultLocationNameRef = useRef('');
  const hasReliableSearchCenterRef = useRef(Boolean(initialLocation));
  const pickedManualCoordinateRef = useRef(false);
  const languageRef = useRef(language);
  const reverseLookupIdRef = useRef(0);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    initialLocation ? { lat: initialLocation.lat, lng: initialLocation.lng } : null
  );
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(initialLocation?.address);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(initialLocation?.placeId);
  const [selectedMapUrl, setSelectedMapUrl] = useState<string | undefined>(initialLocation?.mapUrl);
  const [locationName, setLocationName] = useState(initialLocation?.name ?? '');
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isConfirmingLocation, setIsConfirmingLocation] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'no-results' | 'error'>('idle');
  const [linkInputError, setLinkInputError] = useState(false);

  const defaultLocationName = language === 'zh' ? '貓咪出沒點' : 'Cat Spot';
  const parsedGoogleMapsLocation = useMemo(() => parseGoogleMapsLink(locationName), [locationName]);
  const googleMapsSearchText = useMemo(() => parseGoogleMapsSearchText(locationName), [locationName]);
  const searchQuery = googleMapsSearchText ?? locationName.trim();
  const hasGoogleMapsUrlInput = /(?:google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(locationName);
  const hasUnresolvedUrlInput = /^https?:\/\//i.test(locationName.trim()) && !parsedGoogleMapsLocation && !googleMapsSearchText;
  const typedGoogleMapsUrl = hasGoogleMapsUrlInput ? locationName.trim() : undefined;

  useEffect(() => {
    defaultLocationNameRef.current = defaultLocationName;
  }, [defaultLocationName]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    locationNameRef.current = locationName;
  }, [locationName]);

  const getSearchCenter = useCallback(() => {
    if (!hasReliableSearchCenterRef.current) return undefined;

    const map = mapRef.current;
    const center = map?.getCenter();
    if (center) {
      return {
        lat: center.lat,
        lng: center.lng,
        zoom: map?.getZoom(),
      };
    }

    return { lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0], zoom: 10 };
  }, []);

  const setMarkerAt = useCallback((lat: number, lng: number, metadata?: {
    address?: string;
    placeId?: string;
    mapUrl?: string;
  }) => {
    const map = mapRef.current;
    if (!map) return;

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: '#FF8A65' })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    setSelectedLocation({ lat, lng });
    setSelectedAddress(metadata?.address);
    setSelectedPlaceId(metadata?.placeId);
    setSelectedMapUrl(metadata?.mapUrl);
  }, []);

  const canReplaceLocationName = useCallback(() => {
    const currentName = locationNameRef.current.trim();
    return !currentName || currentName === defaultLocationNameRef.current;
  }, []);

  const pickCoordinate = useCallback((lat: number, lng: number) => {
    const lookupId = reverseLookupIdRef.current + 1;
    reverseLookupIdRef.current = lookupId;
    hasReliableSearchCenterRef.current = true;
    pickedManualCoordinateRef.current = true;
    selectedSuggestionNameRef.current = null;
    setMarkerAt(lat, lng);

    if (canReplaceLocationName()) {
      setLocationName(defaultLocationNameRef.current);
    }

    setIsReverseGeocoding(true);
    void reverseGeocodePlace({
      lat,
      lng,
      language: languageRef.current,
    }).then((suggestion) => {
      if (reverseLookupIdRef.current !== lookupId || !suggestion) return;

      setMarkerAt(lat, lng, {
        address: suggestion.address,
        placeId: suggestion.placeId,
      });

      if (canReplaceLocationName()) {
        selectedSuggestionNameRef.current = suggestion.name;
        setLocationName(suggestion.name);
      }
    }).catch(() => {
      if (reverseLookupIdRef.current !== lookupId) return;

      if (canReplaceLocationName()) {
        selectedSuggestionNameRef.current = defaultLocationNameRef.current;
        setLocationName(defaultLocationNameRef.current);
      }
    }).finally(() => {
      if (reverseLookupIdRef.current === lookupId) {
        setIsReverseGeocoding(false);
      }
    });
  }, [canReplaceLocationName, setMarkerAt]);

  useEffect(() => {
    const query = searchQuery;

    if (parsedGoogleMapsLocation || hasUnresolvedUrlInput) {
      setSuggestions([]);
      setSearchStatus('idle');
      setIsSearching(false);
      return;
    }

    if (query.length < 2 || query === selectedSuggestionNameRef.current) {
      setSuggestions([]);
      setSearchStatus('idle');
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setIsSearching(true);
      setSearchStatus('idle');

      try {
        const results = await searchPlaces(query, {
          language,
          signal: controller.signal,
          around: getSearchCenter(),
          includeAddressFallback: true,
          limit: 12,
        });
        if (controller.signal.aborted) return;

        setSuggestions(results);
        setSearchStatus(results.length > 0 ? 'idle' : 'no-results');
      } catch {
        if (controller.signal.aborted) return;
        setSuggestions([]);
        setSearchStatus('error');
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [getSearchCenter, hasUnresolvedUrlInput, language, parsedGoogleMapsLocation, searchQuery]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OPEN_FREE_MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: 12,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.on('click', (event) => {
      pickCoordinate(event.lngLat.lat, event.lngLat.lng);
    });
    map.on('dragstart', () => {
      hasReliableSearchCenterRef.current = true;
    });
    map.on('zoomstart', () => {
      hasReliableSearchCenterRef.current = true;
    });

    mapRef.current = map;

    if (initialLocation) {
      selectedSuggestionNameRef.current = initialLocation.name;
      setMarkerAt(initialLocation.lat, initialLocation.lng, {
        address: initialLocation.address,
        placeId: initialLocation.placeId,
      });
      map.easeTo({
        center: [initialLocation.lng, initialLocation.lat],
        zoom: 15,
        duration: 0,
      });
    }

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [initialLocation, pickCoordinate, setMarkerAt]);

  const useCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      window.alert(t.currentLocationFailed);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        pickCoordinate(latitude, longitude);
        mapRef.current?.easeTo({
          center: [longitude, latitude],
          zoom: 15,
          duration: 800,
        });
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        window.alert(t.currentLocationFailed);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [pickCoordinate, t.currentLocationFailed]);

  const handleLocationNameChange = useCallback((value: string) => {
    selectedSuggestionNameRef.current = null;
    setLinkInputError(false);
    if (!/(?:google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(value)) {
      setSelectedMapUrl(undefined);
    }
    setLocationName(value);
  }, []);

  const applySuggestion = useCallback((suggestion: PlaceSuggestion) => {
    hasReliableSearchCenterRef.current = true;
    pickedManualCoordinateRef.current = false;
    selectedSuggestionNameRef.current = suggestion.name;
    setLocationName(suggestion.name);
    setSuggestions([]);
    setSearchStatus('idle');
    setMarkerAt(suggestion.lat, suggestion.lng, {
      address: suggestion.address,
      placeId: suggestion.placeId,
      mapUrl: selectedMapUrl,
    });
    mapRef.current?.easeTo({
      center: [suggestion.lng, suggestion.lat],
      zoom: 15,
      duration: 800,
    });
  }, [selectedMapUrl, setMarkerAt]);

  const pickSuggestion = useCallback((suggestion: PlaceSuggestion) => {
    applySuggestion(suggestion);
  }, [applySuggestion]);

  const applyParsedGoogleMapsLocation = useCallback(() => {
    if (!parsedGoogleMapsLocation) return;

    const nextName = parsedGoogleMapsLocation.name ?? locationName.trim() ?? defaultLocationName;
    pickedManualCoordinateRef.current = true;
    selectedSuggestionNameRef.current = nextName;
    setLocationName(nextName);
    setSuggestions([]);
    setSearchStatus('idle');
    setMarkerAt(parsedGoogleMapsLocation.lat, parsedGoogleMapsLocation.lng, {
      mapUrl: typedGoogleMapsUrl,
    });
    mapRef.current?.easeTo({
      center: [parsedGoogleMapsLocation.lng, parsedGoogleMapsLocation.lat],
      zoom: 16,
      duration: 800,
    });
  }, [defaultLocationName, locationName, parsedGoogleMapsLocation, setMarkerAt, typedGoogleMapsUrl]);

  const handleFullAddressSearch = useCallback(async () => {
    const query = searchQuery;
    if (query.length < 2) return;

    setIsResolvingAddress(true);
    setSearchStatus('idle');

    try {
      const results = await searchPlaces(query, {
        language,
        around: getSearchCenter(),
        includeAddressFallback: true,
        forceAddressFallback: true,
        limit: 8,
      });

      setSuggestions(results);
      setSearchStatus(results.length > 0 ? 'idle' : 'no-results');
    } catch {
      setSuggestions([]);
      setSearchStatus('error');
    } finally {
      setIsResolvingAddress(false);
    }
  }, [getSearchCenter, language, searchQuery]);

  const buildLocationResult = useCallback((suggestion: PlaceSuggestion): LocationResult => {
    const location: LocationResult = {
      lat: suggestion.lat,
      lng: suggestion.lng,
      name: suggestion.name,
    };

    if (suggestion.address) location.address = suggestion.address;
    if (suggestion.placeId) location.placeId = suggestion.placeId;
    if (selectedMapUrl) location.mapUrl = selectedMapUrl;

    return location;
  }, [selectedMapUrl]);

  const getFallbackCoordinate = useCallback(() => {
    if (selectedLocation) return selectedLocation;

    const center = mapRef.current?.getCenter();
    if (center) {
      return { lat: center.lat, lng: center.lng };
    }

    return { lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] };
  }, [selectedLocation]);

  const handleConfirm = useCallback(async () => {
    const query = searchQuery;
    if (hasUnresolvedUrlInput) {
      setSuggestions([]);
      setSearchStatus('idle');
      const fallbackCoordinate = getFallbackCoordinate();
      setLinkInputError(false);
      setMarkerAt(fallbackCoordinate.lat, fallbackCoordinate.lng);
      onPicked({
        lat: fallbackCoordinate.lat,
        lng: fallbackCoordinate.lng,
        name: defaultLocationName,
        mapUrl: typedGoogleMapsUrl,
      });
      return;
    }

    const shouldResolveTypedQuery = !pickedManualCoordinateRef.current &&
      (!hasGoogleMapsUrlInput || Boolean(googleMapsSearchText)) &&
      query.length >= 2 &&
      query !== selectedSuggestionNameRef.current;

    if (shouldResolveTypedQuery) {
      setIsConfirmingLocation(true);
      setSearchStatus('idle');

      try {
        const [firstMatch] = await searchPlaces(query, {
          language,
          around: getSearchCenter(),
          includeAddressFallback: true,
          forceAddressFallback: true,
          limit: 5,
        });

        if (firstMatch) {
          applySuggestion(firstMatch);
          onPicked(buildLocationResult(firstMatch));
          return;
        }

        setSearchStatus('no-results');
      } catch {
        setSearchStatus('error');
      } finally {
        setIsConfirmingLocation(false);
      }
    }

    const fallbackCoordinate = query.length >= 2 ? getFallbackCoordinate() : selectedLocation;

    if (!fallbackCoordinate) {
      window.alert(t.noLocationPicked);
      return;
    }

    const location: LocationResult = {
      lat: fallbackCoordinate.lat,
      lng: fallbackCoordinate.lng,
      name: query || defaultLocationName,
    };

    if (selectedLocation) {
      if (selectedAddress) location.address = selectedAddress;
      if (selectedPlaceId) location.placeId = selectedPlaceId;
      if (selectedMapUrl) location.mapUrl = selectedMapUrl;
    } else {
      setMarkerAt(fallbackCoordinate.lat, fallbackCoordinate.lng);
    }

    if (!location.mapUrl && typedGoogleMapsUrl) {
      location.mapUrl = typedGoogleMapsUrl;
    }

    onPicked(location);
  }, [
    applySuggestion,
    buildLocationResult,
    defaultLocationName,
    getFallbackCoordinate,
    getSearchCenter,
    googleMapsSearchText,
    hasGoogleMapsUrlInput,
    hasUnresolvedUrlInput,
    language,
    onPicked,
    searchQuery,
    selectedAddress,
    selectedLocation,
    selectedMapUrl,
    selectedPlaceId,
    setMarkerAt,
    t.noLocationPicked,
    typedGoogleMapsUrl,
  ]);

  const canConfirm = Boolean(selectedLocation) || locationName.trim().length >= 2;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-cat-dark/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md bg-cat-card rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 border-b border-cat-border-light">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-cat-bg flex items-center justify-center transition-colors"
            aria-label={t.skipForNow}
          >
            <X size={20} className="text-cat-text-secondary" />
          </button>
          <h2 className="font-bold text-cat-text-main text-lg">{t.pickLocation}</h2>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isConfirmingLocation}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cat-brand text-white rounded-full font-bold text-sm disabled:opacity-40 transition-opacity hover:opacity-90"
          >
            {isConfirmingLocation ? <Loader2 size={14} className="animate-spin" /> : null}
            {t.confirmLocation}
          </button>
        </div>

        <div className="p-4 border-b border-cat-border-light bg-cat-bg/50">
          <p className="text-cat-text-tertiary text-xs mb-3">{t.tapMapHint}</p>

          <div className="flex gap-2 mb-3">
            <button
              onClick={useCurrentLocation}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cat-card border border-cat-border-light text-cat-text-main text-sm font-semibold hover:bg-cat-bg transition-colors"
              disabled={isLocating}
            >
              {isLocating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
              <span>{t.useCurrentLocation}</span>
            </button>

            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cat-card border border-cat-border-light text-cat-text-secondary text-sm font-semibold hover:bg-cat-bg transition-colors"
            >
              <span>{t.skipForNow}</span>
            </button>
          </div>

          <label className="block">
            <span className="block text-cat-text-secondary text-xs font-bold tracking-widest uppercase mb-2">
              {t.locationName}
            </span>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cat-text-tertiary" />
              <input
                type="text"
                value={locationName}
                onChange={(event) => handleLocationNameChange(event.target.value)}
                placeholder={t.locationNamePlaceholder}
                className="w-full pl-10 pr-10 py-3 bg-white rounded-xl border border-cat-border-light text-cat-text-main placeholder:text-cat-text-tertiary focus:outline-none focus:ring-2 focus:ring-cat-brand"
              />
              {isSearching || isConfirmingLocation || isResolvingAddress ? (
                <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-cat-text-tertiary" />
              ) : null}
              {suggestions.length > 0 || searchStatus !== 'idle' ? (
                <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl border border-cat-border-light bg-white shadow-xl">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.placeId ?? `${suggestion.lat},${suggestion.lng}`}
                      type="button"
                      onClick={() => pickSuggestion(suggestion)}
                      className="block w-full px-4 py-3 text-left transition-colors hover:bg-cat-bg focus:bg-cat-bg focus:outline-none"
                    >
                      <span className="block text-sm font-bold text-cat-text-main">{suggestion.name}</span>
                      {suggestion.address ? (
                        <span className="mt-0.5 block truncate text-xs text-cat-text-tertiary">
                          {suggestion.address}
                        </span>
                      ) : null}
                    </button>
                  ))}
                  {searchStatus === 'no-results' ? (
                    <div className="px-4 py-3">
                      <p className="text-sm text-cat-text-tertiary">{t.locationSearchNoResults}</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-cat-text-secondary">
                        {language === 'zh'
                          ? '搜尋不到也沒關係，可以點地圖選大概位置，並用輸入文字當地點名稱。'
                          : 'No result is okay. Tap the map for an approximate spot and keep your typed place name.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleFullAddressSearch()}
                        disabled={isResolvingAddress}
                        className="mt-2 inline-flex min-h-9 items-center justify-center rounded-full border border-cat-border-light bg-cat-bg px-3 py-1.5 text-xs font-black text-cat-text-main transition-colors hover:bg-cat-card disabled:opacity-50"
                      >
                        {isResolvingAddress ? (
                          <Loader2 size={13} className="mr-1.5 animate-spin" />
                        ) : null}
                        {language === 'zh' ? '搜尋完整地址' : 'Search full address'}
                      </button>
                    </div>
                  ) : null}
                  {searchStatus === 'error' ? (
                    <div className="px-4 py-3">
                      <p className="text-sm text-cat-text-tertiary">{t.locationSearchFailed}</p>
                      <button
                        type="button"
                        onClick={() => void handleFullAddressSearch()}
                        disabled={isResolvingAddress}
                        className="mt-2 inline-flex min-h-9 items-center justify-center rounded-full border border-cat-border-light bg-cat-bg px-3 py-1.5 text-xs font-black text-cat-text-main transition-colors hover:bg-cat-card disabled:opacity-50"
                      >
                        {isResolvingAddress ? (
                          <Loader2 size={13} className="mr-1.5 animate-spin" />
                        ) : null}
                        {language === 'zh' ? '搜尋完整地址' : 'Search full address'}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </label>

          {parsedGoogleMapsLocation ? (
            <div className="mt-3 rounded-2xl border border-[#2f5fb3]/20 bg-[#d9ecff]/70 px-3 py-3">
              <p className="text-xs font-black text-[#2f5fb3]">
                {language === 'zh' ? '已讀取 Google Maps 位置' : 'Google Maps location detected'}
              </p>
              <p className="mt-1 text-xs font-bold leading-5 text-cat-text-secondary">
                {parsedGoogleMapsLocation.name ??
                  `${parsedGoogleMapsLocation.lat.toFixed(5)}, ${parsedGoogleMapsLocation.lng.toFixed(5)}`}
              </p>
              <button
                type="button"
                onClick={applyParsedGoogleMapsLocation}
                className="mt-2 inline-flex min-h-9 items-center justify-center rounded-full border border-[#221915]/18 bg-[#fffdf2] px-3 py-1.5 text-xs font-black text-[#221915] shadow-[2px_2px_0_rgba(47,95,179,0.12)]"
              >
                {language === 'zh' ? '套用 Google Maps 位置' : 'Use Google Maps location'}
              </button>
            </div>
          ) : hasGoogleMapsUrlInput ? (
            <p className="mt-3 rounded-2xl border border-[#221915]/12 bg-white/75 px-3 py-2 text-xs font-bold leading-5 text-cat-text-secondary">
              {language === 'zh'
                ? '這個 Google Maps 連結沒有可直接讀取的座標。如果是短連結，請在 Google Maps 打開後複製完整網址，或直接點地圖選位置。'
                : 'This Google Maps link does not expose coordinates. Open it in Google Maps and copy the full URL, or tap the map directly.'}
            </p>
          ) : null}
          {linkInputError ? (
            <p className="mt-2 rounded-2xl border border-[#d97706]/25 bg-[#fff2cf]/75 px-3 py-2 text-xs font-black leading-5 text-[#7a4a08]">
              {language === 'zh'
                ? '這個連結讀不到地點名稱。請補上店名或地址，再按確認地點。'
                : 'This link does not include a readable place name. Add the shop name or address, then confirm.'}
            </p>
          ) : null}
        </div>

        <div ref={mapContainerRef} className="flex-1 min-h-[300px] w-full" />

        <div className="p-4 border-t border-cat-border-light bg-cat-bg/50">
          {selectedLocation ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cat-brand/10 flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-cat-brand" />
              </div>
              <div className="min-w-0">
                <p className="text-cat-text-main font-bold text-sm truncate">
                  {locationName.trim() || defaultLocationName}
                </p>
                <p className="text-cat-text-tertiary text-xs truncate">
                  {isReverseGeocoding
                    ? (language === 'zh' ? '正在尋找附近地點...' : 'Finding a nearby place...')
                    : (selectedAddress ?? `${selectedLocation.lat.toFixed(5)}, ${selectedLocation.lng.toFixed(5)}`)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-cat-text-tertiary text-sm">{t.tapMapHint}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
