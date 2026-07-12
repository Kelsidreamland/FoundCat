import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { Link2, Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
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
  draftKey?: string;
  onPicked: (location: LocationResult) => void;
  onClose: () => void;
  language: 'zh' | 'en';
}

type LocationPickerDraft = {
  locationName: string;
  selectedLocation?: {
    lat: number;
    lng: number;
  };
  selectedAddress?: string;
  selectedPlaceId?: string;
  selectedMapUrl?: string;
};

type LocationInputMethod = 'maps-link' | 'search' | 'pin';

const LOCATION_PICKER_DRAFT_STORAGE_PREFIX = 'found-cat-location-picker-draft:';

const getLocationPickerDraftStorageKey = (draftKey?: string) => {
  const key = draftKey?.trim();
  return key ? `${LOCATION_PICKER_DRAFT_STORAGE_PREFIX}${encodeURIComponent(key)}` : null;
};

const isDraftCoordinate = (value: unknown): value is { lat: number; lng: number } => {
  if (!value || typeof value !== 'object') return false;
  const coordinate = value as Partial<{ lat: number; lng: number }>;
  return Number.isFinite(coordinate.lat) && Number.isFinite(coordinate.lng);
};

const loadLocationPickerDraft = (draftKey?: string): LocationPickerDraft | null => {
  const storageKey = getLocationPickerDraftStorageKey(draftKey);
  if (!storageKey) return null;

  try {
    const rawValue = window.localStorage.getItem(storageKey);
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue) as Partial<LocationPickerDraft>;
    const locationName = typeof parsedValue.locationName === 'string' ? parsedValue.locationName : '';
    const selectedLocation = isDraftCoordinate(parsedValue.selectedLocation)
      ? parsedValue.selectedLocation
      : undefined;

    if (!locationName.trim() && !selectedLocation) {
      window.localStorage.removeItem(storageKey);
      return null;
    }

    return {
      locationName,
      ...(selectedLocation ? { selectedLocation } : {}),
      ...(typeof parsedValue.selectedAddress === 'string' ? { selectedAddress: parsedValue.selectedAddress } : {}),
      ...(typeof parsedValue.selectedPlaceId === 'string' ? { selectedPlaceId: parsedValue.selectedPlaceId } : {}),
      ...(typeof parsedValue.selectedMapUrl === 'string' ? { selectedMapUrl: parsedValue.selectedMapUrl } : {}),
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
};

const saveLocationPickerDraft = (draftKey: string | undefined, draft: LocationPickerDraft) => {
  const storageKey = getLocationPickerDraftStorageKey(draftKey);
  if (!storageKey) return;

  try {
    if (!draft.locationName.trim() && !draft.selectedLocation) {
      window.localStorage.removeItem(storageKey);
      return;
    }

    window.localStorage.setItem(storageKey, JSON.stringify(draft));
  } catch {
    // Location draft recovery is best-effort; choosing a cat spot must still work if storage is full.
  }
};

const clearLocationPickerDraft = (draftKey?: string) => {
  const storageKey = getLocationPickerDraftStorageKey(draftKey);
  if (!storageKey) return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // Ignore storage errors.
  }
};

export default function LocationPicker({ initialLocation, draftKey, onPicked, onClose, language }: LocationPickerProps) {
  const t = translations[language];
  const restoredDraft = useMemo(
    () => (initialLocation ? null : loadLocationPickerDraft(draftKey)),
    [draftKey, initialLocation]
  );
  const initialSelectedLocation = initialLocation
    ? { lat: initialLocation.lat, lng: initialLocation.lng }
    : restoredDraft?.selectedLocation ?? null;
  const initialLocationName = initialLocation?.name ?? restoredDraft?.locationName ?? '';
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const selectedSuggestionNameRef = useRef<string | null>(initialLocation?.name ?? null);
  const locationNameRef = useRef(initialLocationName);
  const defaultLocationNameRef = useRef('');
  const hasReliableSearchCenterRef = useRef(Boolean(initialSelectedLocation));
  const pickedManualCoordinateRef = useRef(Boolean(restoredDraft?.selectedLocation && !initialLocation));
  const selectedLocationRef = useRef<{ lat: number; lng: number } | null>(initialSelectedLocation);
  const languageRef = useRef(language);
  const reverseLookupIdRef = useRef(0);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(initialSelectedLocation);
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>(initialLocation?.address ?? restoredDraft?.selectedAddress);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | undefined>(initialLocation?.placeId ?? restoredDraft?.selectedPlaceId);
  const [selectedMapUrl, setSelectedMapUrl] = useState<string | undefined>(initialLocation?.mapUrl ?? restoredDraft?.selectedMapUrl);
  const [locationName, setLocationName] = useState(initialLocationName);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isConfirmingLocation, setIsConfirmingLocation] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'no-results' | 'error'>('idle');
  const [linkInputError, setLinkInputError] = useState(false);
  const [activeInputMethod, setActiveInputMethod] = useState<LocationInputMethod>('maps-link');

  const defaultLocationName = language === 'zh' ? '貓咪出沒點' : 'Cat Spot';
  const parsedGoogleMapsLocation = useMemo(() => parseGoogleMapsLink(locationName), [locationName]);
  const googleMapsSearchText = useMemo(() => parseGoogleMapsSearchText(locationName), [locationName]);
  const searchQuery = googleMapsSearchText ?? locationName.trim();
  const hasGoogleMapsUrlInput = /(?:google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(locationName);
  const hasUnresolvedUrlInput = /^https?:\/\//i.test(locationName.trim()) && !parsedGoogleMapsLocation && !googleMapsSearchText;
  const typedGoogleMapsUrl = hasGoogleMapsUrlInput ? locationName.trim() : undefined;
  const shouldShowLinkInputGuidance = hasGoogleMapsUrlInput && !parsedGoogleMapsLocation;
  const locationInputHelperCopy = parsedGoogleMapsLocation
    ? (language === 'zh'
        ? '已讀到 Google Maps 位置，可以直接確認地點。'
        : 'Google Maps location detected. You can confirm it now.')
    : hasUnresolvedUrlInput
      ? (language === 'zh'
          ? '短連結讀不到座標。請先在 Google Maps 打開，複製完整網址；或保留這段文字，直接點地圖放 pin。'
          : 'Short links do not expose coordinates. Open it in Google Maps and copy the full URL, or keep the text and tap the map.')
      : locationName.trim().length > 0
        ? (language === 'zh'
            ? '可以搜尋店名或地址；找不到時，保留這段文字再點地圖選位置。'
            : 'Search the place or address; if it is missing, keep this text and tap the map.')
        : (language === 'zh'
            ? '貼完整 Google Maps 連結最準，也可以搜尋店名地址，或直接點地圖放 pin。'
            : 'A full Google Maps link is best. You can also search a place or tap the map.');
  const methodHintCopy = activeInputMethod === 'pin'
    ? (language === 'zh'
        ? '找不到店名時，直接點地圖放 pin，這樣才不會存到錯誤位置。'
        : 'If the place cannot be found, tap the map to place a pin so the spot is not saved incorrectly.')
    : activeInputMethod === 'search'
      ? (language === 'zh'
          ? '輸入店名、地址或當地語言名稱，選到建議後會自動定位。'
          : 'Type a shop, address, or local-language name. Choosing a suggestion places the pin.')
      : (language === 'zh'
          ? '貼完整 Google Maps 連結最準；短連結需要先在 Google Maps 打開再複製完整網址。'
          : 'A full Google Maps link is most accurate. Short links need to be opened in Google Maps first.');

  const focusLocationInput = useCallback(() => {
    window.setTimeout(() => {
      locationInputRef.current?.focus();
    }, 0);
  }, []);

  const handleInputMethodSelect = useCallback((method: LocationInputMethod) => {
    setActiveInputMethod(method);
    if (method !== 'pin') {
      focusLocationInput();
    }
  }, [focusLocationInput]);

  useEffect(() => {
    defaultLocationNameRef.current = defaultLocationName;
  }, [defaultLocationName]);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    locationNameRef.current = locationName;
  }, [locationName]);

  useEffect(() => {
    if (initialLocation) return;

    saveLocationPickerDraft(draftKey, {
      locationName,
      ...(selectedLocation ? { selectedLocation } : {}),
      ...(selectedAddress ? { selectedAddress } : {}),
      ...(selectedPlaceId ? { selectedPlaceId } : {}),
      ...(selectedMapUrl ? { selectedMapUrl } : {}),
    });
  }, [draftKey, initialLocation, locationName, selectedAddress, selectedLocation, selectedMapUrl, selectedPlaceId]);

  const handleClose = useCallback(() => {
    clearLocationPickerDraft(draftKey);
    onClose();
  }, [draftKey, onClose]);

  const handlePicked = useCallback((location: LocationResult) => {
    clearLocationPickerDraft(draftKey);
    onPicked(location);
  }, [draftKey, onPicked]);

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

    const nextLocation = { lat, lng };
    selectedLocationRef.current = nextLocation;
    setSelectedLocation(nextLocation);
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

    const restoredLocation = initialLocation
      ? {
          lat: initialLocation.lat,
          lng: initialLocation.lng,
          name: initialLocation.name,
          address: initialLocation.address,
          placeId: initialLocation.placeId,
          mapUrl: initialLocation.mapUrl,
        }
      : restoredDraft?.selectedLocation
        ? {
            ...restoredDraft.selectedLocation,
            name: restoredDraft.locationName || defaultLocationNameRef.current,
            address: restoredDraft.selectedAddress,
            placeId: restoredDraft.selectedPlaceId,
            mapUrl: restoredDraft.selectedMapUrl,
          }
        : null;

    if (restoredLocation) {
      selectedSuggestionNameRef.current = restoredLocation.name;
      setMarkerAt(restoredLocation.lat, restoredLocation.lng, {
        address: restoredLocation.address,
        placeId: restoredLocation.placeId,
        mapUrl: restoredLocation.mapUrl,
      });
      map.easeTo({
        center: [restoredLocation.lng, restoredLocation.lat],
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
  }, [defaultLocationName, initialLocation, pickCoordinate, restoredDraft, setMarkerAt]);

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
    setActiveInputMethod(/(?:google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(value) ? 'maps-link' : 'search');
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

  const buildParsedGoogleMapsLocationResult = useCallback((): LocationResult | null => {
    if (!parsedGoogleMapsLocation) return null;

    const nextName = parsedGoogleMapsLocation.name ?? locationName.trim() ?? defaultLocationName;

    return {
      lat: parsedGoogleMapsLocation.lat,
      lng: parsedGoogleMapsLocation.lng,
      name: nextName,
      ...(typedGoogleMapsUrl ? { mapUrl: typedGoogleMapsUrl } : {}),
    };
  }, [defaultLocationName, locationName, parsedGoogleMapsLocation, typedGoogleMapsUrl]);

  const applyParsedGoogleMapsLocation = useCallback(() => {
    const parsedLocation = buildParsedGoogleMapsLocationResult();
    if (!parsedLocation) return;

    pickedManualCoordinateRef.current = true;
    selectedSuggestionNameRef.current = parsedLocation.name;
    setLocationName(parsedLocation.name);
    setSuggestions([]);
    setSearchStatus('idle');
    setMarkerAt(parsedLocation.lat, parsedLocation.lng, {
      mapUrl: parsedLocation.mapUrl,
    });
    mapRef.current?.easeTo({
      center: [parsedLocation.lng, parsedLocation.lat],
      zoom: 16,
      duration: 800,
    });
  }, [buildParsedGoogleMapsLocationResult, setMarkerAt]);

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

  const handleConfirm = useCallback(async () => {
    const query = searchQuery;
    const parsedGoogleMapsResult = buildParsedGoogleMapsLocationResult();
    if (parsedGoogleMapsResult) {
      pickedManualCoordinateRef.current = true;
      selectedSuggestionNameRef.current = parsedGoogleMapsResult.name;
      setLocationName(parsedGoogleMapsResult.name);
      setSuggestions([]);
      setSearchStatus('idle');
      setLinkInputError(false);
      setMarkerAt(parsedGoogleMapsResult.lat, parsedGoogleMapsResult.lng, {
        mapUrl: parsedGoogleMapsResult.mapUrl,
      });
      mapRef.current?.easeTo({
        center: [parsedGoogleMapsResult.lng, parsedGoogleMapsResult.lat],
        zoom: 16,
        duration: 800,
      });
      handlePicked(parsedGoogleMapsResult);
      return;
    }

    if (hasUnresolvedUrlInput && !selectedLocationRef.current) {
      setSuggestions([]);
      setSearchStatus('idle');
      setLinkInputError(true);
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
          handlePicked(buildLocationResult(firstMatch));
          return;
        }

        setSearchStatus('no-results');
      } catch {
        setSearchStatus('error');
      } finally {
        setIsConfirmingLocation(false);
      }
    }

    const fallbackCoordinate = selectedLocationRef.current ?? selectedLocation;

    if (!fallbackCoordinate) {
      if (query.length >= 2) {
        setSearchStatus('no-results');
        return;
      }
      window.alert(t.noLocationPicked);
      return;
    }

    const location: LocationResult = {
      lat: fallbackCoordinate.lat,
      lng: fallbackCoordinate.lng,
      name: hasUnresolvedUrlInput ? defaultLocationName : (query || defaultLocationName),
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

    handlePicked(location);
  }, [
    applySuggestion,
    buildLocationResult,
    buildParsedGoogleMapsLocationResult,
    defaultLocationName,
    getSearchCenter,
    googleMapsSearchText,
    handlePicked,
    hasGoogleMapsUrlInput,
    hasUnresolvedUrlInput,
    language,
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
      className="fixed inset-0 z-[200] flex items-end justify-center bg-cat-dark/60 backdrop-blur-sm sm:items-center"
      onClick={handleClose}
    >
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
        data-testid="location-picker-panel"
        className="flex max-h-[calc(100dvh_-_env(safe-area-inset-top)_-_0.75rem)] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-cat-card pb-[env(safe-area-inset-bottom)] shadow-2xl sm:max-h-[90vh] sm:rounded-3xl sm:pb-0"
      >
        <div className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-cat-border-light p-3 sm:p-4">
          <button
            onClick={handleClose}
            className="grid h-11 w-11 place-items-center rounded-full hover:bg-cat-bg transition-colors"
            aria-label={t.skipForNow}
          >
            <X size={20} className="text-cat-text-secondary" />
          </button>
          <h2 className="min-w-0 text-center text-base font-bold leading-5 text-cat-text-main sm:text-lg">{t.pickLocation}</h2>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || isConfirmingLocation}
            className="inline-flex min-h-11 max-w-[8.5rem] items-center justify-center gap-1.5 rounded-full bg-[#2f5fb3] px-3 py-2 text-center text-xs font-bold leading-4 text-white transition-opacity hover:opacity-90 disabled:opacity-40 sm:px-4 sm:text-sm"
          >
            {isConfirmingLocation ? <Loader2 size={14} className="animate-spin" /> : null}
            {t.confirmLocation}
          </button>
        </div>

        <div
          data-testid="location-picker-form"
          className="max-h-[42dvh] shrink-0 overflow-y-auto border-b border-cat-border-light bg-cat-bg/50 p-4"
        >
          <p className="text-cat-text-tertiary text-xs mb-3">{t.tapMapHint}</p>

          <div className="mb-2 grid grid-cols-3 gap-2" aria-label={language === 'zh' ? '地點輸入方式' : 'Location input methods'}>
            {[
              {
                id: 'maps-link' as const,
                icon: Link2,
                label: language === 'zh' ? '貼完整地圖連結' : 'Full Maps link',
              },
              {
                id: 'search' as const,
                icon: Search,
                label: language === 'zh' ? '搜尋店名地址' : 'Search place',
              },
              {
                id: 'pin' as const,
                icon: MapPin,
                label: language === 'zh' ? '點地圖放 pin' : 'Tap map pin',
              },
            ].map((method) => {
              const Icon = method.icon;
              const isActive = activeInputMethod === method.id;

              return (
                <button
                  key={method.label}
                  type="button"
                  onClick={() => handleInputMethodSelect(method.id)}
                  aria-pressed={isActive}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border px-2 text-center text-[11px] font-black leading-4 shadow-[1px_2px_0_rgba(47,95,179,0.06)] transition-colors ${
                    isActive
                      ? 'border-[#2f5fb3]/25 bg-[#d9ecff]/72 text-[#2f5fb3]'
                      : 'border-[#2f5fb3]/10 bg-white/62 text-cat-text-secondary hover:border-[#2f5fb3]/20 hover:bg-white/80'
                  }`}
                >
                  <Icon size={13} className={`shrink-0 ${isActive ? 'text-[#2f5fb3]' : 'text-[#2f5fb3]/65'}`} />
                  <span className="min-w-0">{method.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mb-3 rounded-2xl border border-[#221915]/10 bg-white/55 px-3 py-2 text-xs font-bold leading-5 text-cat-text-secondary">
            {methodHintCopy}
          </p>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={useCurrentLocation}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-cat-card px-3 py-2 text-center text-sm font-semibold text-cat-text-main transition-colors hover:bg-cat-bg sm:flex-none sm:px-4"
              disabled={isLocating}
            >
              {isLocating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
              <span>{t.useCurrentLocation}</span>
            </button>

            <button
              onClick={handleClose}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-cat-card px-3 py-2 text-center text-sm font-semibold text-cat-text-secondary transition-colors hover:bg-cat-bg sm:flex-none sm:px-4"
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
                ref={locationInputRef}
                type="text"
                value={locationName}
                onChange={(event) => handleLocationNameChange(event.target.value)}
                placeholder={t.locationNamePlaceholder}
                data-location-name-input="true"
                className="w-full rounded-xl border border-cat-border-light bg-white py-3 pl-10 pr-10 text-base text-cat-text-main placeholder:text-cat-text-tertiary focus:outline-none focus:ring-2 focus:ring-[#2f5fb3]"
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

          <p
            data-testid="location-input-helper-copy"
            className={[
              'mt-2 rounded-2xl border px-3 py-2 text-xs font-bold leading-5',
              parsedGoogleMapsLocation
                ? 'border-[#2f5fb3]/18 bg-[#d9ecff]/52 text-[#2f5fb3]'
                : hasUnresolvedUrlInput
                  ? 'border-[#d97706]/25 bg-[#fff2cf]/75 text-[#7a4a08]'
                  : 'border-[#221915]/10 bg-white/58 text-cat-text-secondary',
            ].join(' ')}
          >
            {locationInputHelperCopy}
          </p>

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
          ) : shouldShowLinkInputGuidance ? (
            <p
              className={[
                'mt-3 rounded-2xl px-3 py-2 text-xs font-bold leading-5',
                hasUnresolvedUrlInput
                  ? 'border border-[#d97706]/25 bg-[#fff2cf]/75 text-[#7a4a08]'
                  : 'border border-[#221915]/12 bg-white/75 text-cat-text-secondary',
              ].join(' ')}
            >
              {language === 'zh'
                ? '短連結目前無法直接定位。請先在 Google Maps 打開這個連結，複製完整網址；或保留這段文字，直接點地圖放 pin。'
                : 'Short links cannot be placed directly. Open it in Google Maps and copy the full URL, or keep this text and tap the map.'}
            </p>
          ) : null}
          {linkInputError ? (
            <p className="mt-2 rounded-2xl border border-[#d97706]/25 bg-[#fff2cf]/75 px-3 py-2 text-xs font-black leading-5 text-[#7a4a08]">
              {language === 'zh'
                ? '短連結目前無法直接定位。請先在 Google Maps 打開後複製完整網址；或保留這段文字，點地圖放 pin 後再確認。'
                : 'Short links cannot be placed directly. Open it in Google Maps and copy the full URL, or tap the map before confirming.'}
            </p>
          ) : null}
        </div>

        <div ref={mapContainerRef} data-testid="location-picker-map" className="min-h-[min(260px,32dvh)] w-full flex-1" />

        <div className="shrink-0 border-t border-cat-border-light bg-cat-bg/50 p-4">
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
