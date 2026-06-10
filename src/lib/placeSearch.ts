import type { ScrapbookItem } from '../store/useScrapbookStore';

export type PlaceSuggestion = NonNullable<ScrapbookItem['location']>;

type Language = 'zh' | 'en';

interface SearchPlacesOptions {
  language: Language;
  signal?: AbortSignal;
  limit?: number;
  includeAddressFallback?: boolean;
  forceAddressFallback?: boolean;
  around?: {
    lat: number;
    lng: number;
    zoom?: number;
  };
}

interface PhotonFeature {
  geometry?: {
    coordinates?: unknown;
  };
  properties?: {
    osm_id?: string | number;
    osm_type?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

interface NominatimPlace {
  place_id?: string | number;
  osm_type?: string;
  osm_id?: string | number;
  lat?: string;
  lon?: string;
  display_name?: string;
  namedetails?: Record<string, string | undefined>;
  address?: Record<string, string | undefined>;
}

const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/';
const PHOTON_REVERSE_ENDPOINT = 'https://photon.komoot.io/reverse';
const NOMINATIM_SEARCH_ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const minQueryLength = 2;
const nominatimMinQueryLength = 3;
const defaultSearchZoom = 10;
const locationBiasScale = '0.6';

const compactUnique = (parts: Array<string | undefined>) => {
  const seen = new Set<string>();
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => {
      if (seen.has(part)) return false;
      seen.add(part);
      return true;
    });
};

const buildAddress = (properties: PhotonFeature['properties']) => {
  if (!properties) return undefined;
  const streetLine = compactUnique([properties.street, properties.housenumber]).join(' ');
  const address = compactUnique([
    streetLine || undefined,
    properties.district,
    properties.city,
    properties.state,
    properties.country,
  ]);

  return address.length > 0 ? address.join(', ') : undefined;
};

const getName = (properties: PhotonFeature['properties']) => {
  return properties?.name
    ?? properties?.street
    ?? properties?.district
    ?? properties?.city
    ?? properties?.state
    ?? properties?.country
    ?? 'Cat Spot';
};

const toSuggestion = (feature: PhotonFeature): PlaceSuggestion | null => {
  const coordinates = feature.geometry?.coordinates;
  if (!Array.isArray(coordinates)) return null;

  const [lng, lat] = coordinates;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const properties = feature.properties;
  const placeId = properties?.osm_id && properties.osm_type
    ? `${properties.osm_type}:${properties.osm_id}`
    : undefined;

  return {
    lat,
    lng,
    name: getName(properties),
    address: buildAddress(properties),
    placeId,
  };
};

const getAcceptLanguage = (language: Language) => {
  return language === 'zh' ? 'zh-TW,zh,en' : 'en';
};

const buildNominatimAddress = (place: NominatimPlace, name: string) => {
  const address = place.address;
  if (address) {
    const streetLine = compactUnique([address.road, address.house_number]).join(' ');
    const parts = compactUnique([
      streetLine || undefined,
      address.neighbourhood,
      address.suburb,
      address.city_district,
      address.district,
      address.city,
      address.town,
      address.village,
      address.municipality,
      address.state,
      address.country,
    ]);

    if (parts.length > 0) return parts.join(', ');
  }

  const displayParts = compactUnique(place.display_name?.split(',') ?? []);
  return displayParts
    .filter((part, index) => index !== 0 || part !== name)
    .join(', ') || undefined;
};

const getNominatimName = (place: NominatimPlace) => {
  const address = place.address;
  return place.namedetails?.name
    ?? address?.amenity
    ?? address?.shop
    ?? address?.tourism
    ?? address?.building
    ?? place.display_name?.split(',')[0]?.trim()
    ?? address?.road
    ?? 'Cat Spot';
};

const getNominatimPlaceId = (place: NominatimPlace) => {
  const osmType = place.osm_type?.toLowerCase();
  const osmPrefix = osmType === 'node' ? 'N' : osmType === 'way' ? 'W' : osmType === 'relation' ? 'R' : undefined;
  if (osmPrefix && place.osm_id) return `${osmPrefix}:${place.osm_id}`;
  return place.place_id ? `nominatim:${place.place_id}` : undefined;
};

const toNominatimSuggestion = (place: NominatimPlace): PlaceSuggestion | null => {
  const lat = Number(place.lat);
  const lng = Number(place.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const name = getNominatimName(place);

  return {
    lat,
    lng,
    name,
    address: buildNominatimAddress(place, name),
    placeId: getNominatimPlaceId(place),
  };
};

const getSuggestionKey = (suggestion: PlaceSuggestion) => {
  return suggestion.placeId
    ?? `${suggestion.name}:${suggestion.lat.toFixed(5)},${suggestion.lng.toFixed(5)}`;
};

const mergeSuggestions = (suggestions: PlaceSuggestion[], limit: number) => {
  const seen = new Set<string>();
  const merged: PlaceSuggestion[] = [];

  for (const suggestion of suggestions) {
    const key = getSuggestionKey(suggestion);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(suggestion);
    if (merged.length >= limit) break;
  }

  return merged;
};

const hasLocalScriptCharacters = (query: string) => {
  return Array.from(query).some((character) => {
    return (character.codePointAt(0) ?? 0) > 0x024f;
  });
};

const isAddressLikeQuery = (query: string) => {
  return /[\d\s,，、/]/.test(query) || hasLocalScriptCharacters(query);
};

const shouldSearchNominatim = (
  query: string,
  photonResultCount: number,
  limit: number,
  forceAddressFallback?: boolean
) => {
  if (query.length < nominatimMinQueryLength) return false;
  if (forceAddressFallback) return true;
  if (photonResultCount === 0) return true;
  if (isAddressLikeQuery(query)) return true;
  return photonResultCount < limit;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const getPhotonZoom = (zoom?: number) => {
  if (typeof zoom !== 'number' || !Number.isFinite(zoom)) return defaultSearchZoom;
  return clamp(Math.round(zoom), 8, 14);
};

const buildNominatimViewbox = (around?: SearchPlacesOptions['around']) => {
  if (
    typeof around?.lat !== 'number' ||
    typeof around.lng !== 'number' ||
    !Number.isFinite(around.lat) ||
    !Number.isFinite(around.lng)
  ) {
    return undefined;
  }

  const halfLatSpan = 0.6;
  const longitudeScale = Math.max(Math.cos((around.lat * Math.PI) / 180), 0.25);
  const halfLngSpan = halfLatSpan / longitudeScale;
  const west = clamp(around.lng - halfLngSpan, -180, 180);
  const south = clamp(around.lat - halfLatSpan, -90, 90);
  const east = clamp(around.lng + halfLngSpan, -180, 180);
  const north = clamp(around.lat + halfLatSpan, -90, 90);

  return [west, south, east, north]
    .map((value) => Number(value.toFixed(5)).toString())
    .join(',');
};

const searchPhoton = async (
  normalizedQuery: string,
  { language, signal, limit, around }: SearchPlacesOptions & { limit: number }
) => {
  const url = new URL(PHOTON_ENDPOINT);
  url.searchParams.set('q', normalizedQuery);
  url.searchParams.set('limit', String(limit));
  if (typeof around?.lat === 'number' && typeof around.lng === 'number') {
    url.searchParams.set('lat', String(around.lat));
    url.searchParams.set('lon', String(around.lng));
    url.searchParams.set('zoom', String(getPhotonZoom(around.zoom)));
    url.searchParams.set('location_bias_scale', locationBiasScale);
  }
  if (language === 'en') {
    url.searchParams.set('lang', 'en');
  }

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    throw new Error('PLACE_SEARCH_FAILED');
  }

  const data = await response.json() as PhotonResponse;
  return (data.features ?? [])
    .map(toSuggestion)
    .filter((suggestion): suggestion is PlaceSuggestion => Boolean(suggestion));
};

const searchNominatim = async (
  normalizedQuery: string,
  { language, signal, limit, around }: SearchPlacesOptions & { limit: number }
) => {
  const url = new URL(NOMINATIM_SEARCH_ENDPOINT);
  url.searchParams.set('q', normalizedQuery);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('namedetails', '1');
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('accept-language', getAcceptLanguage(language));
  const viewbox = buildNominatimViewbox(around);
  if (viewbox) {
    url.searchParams.set('viewbox', viewbox);
  }

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    throw new Error('PLACE_SEARCH_FAILED');
  }

  const data = await response.json() as unknown;
  if (!Array.isArray(data)) return [];

  return data
    .map((place) => toNominatimSuggestion(place as NominatimPlace))
    .filter((suggestion): suggestion is PlaceSuggestion => Boolean(suggestion));
};

export const searchPlaces = async (
  query: string,
  {
    language,
    signal,
    limit = 8,
    includeAddressFallback = false,
    forceAddressFallback = false,
    around,
  }: SearchPlacesOptions
): Promise<PlaceSuggestion[]> => {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < minQueryLength) return [];

  const photonResults = await searchPhoton(normalizedQuery, { language, signal, limit, around });
  if (!includeAddressFallback || !shouldSearchNominatim(
    normalizedQuery,
    photonResults.length,
    limit,
    forceAddressFallback
  )) {
    return photonResults.slice(0, limit);
  }

  try {
    const nominatimResults = await searchNominatim(normalizedQuery, { language, signal, limit, around });
    const orderedResults = forceAddressFallback || isAddressLikeQuery(normalizedQuery)
      ? [...nominatimResults, ...photonResults]
      : [...photonResults, ...nominatimResults];
    return mergeSuggestions(orderedResults, limit);
  } catch (error) {
    if (photonResults.length > 0) return photonResults.slice(0, limit);
    throw error;
  }
};

export const reverseGeocodePlace = async ({
  lat,
  lng,
  language,
  signal,
}: {
  lat: number;
  lng: number;
  language: Language;
  signal?: AbortSignal;
}): Promise<PlaceSuggestion | null> => {
  const url = new URL(PHOTON_REVERSE_ENDPOINT);
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('limit', '1');
  url.searchParams.set('radius', '0.5');
  if (language === 'en') {
    url.searchParams.set('lang', 'en');
  }

  const response = await fetch(url.toString(), { signal });
  if (!response.ok) {
    throw new Error('PLACE_REVERSE_GEOCODE_FAILED');
  }

  const data = await response.json() as PhotonResponse;
  return (data.features ?? [])
    .map(toSuggestion)
    .find((suggestion): suggestion is PlaceSuggestion => Boolean(suggestion))
    ?? null;
};
