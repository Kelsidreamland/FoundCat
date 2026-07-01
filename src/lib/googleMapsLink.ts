export interface ParsedGoogleMapsLink {
  lat: number;
  lng: number;
  name?: string;
}

const COORDINATE_PATTERN = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;
const DMS_COORDINATE_PATTERN = /(\d{1,3})°\s*(\d{1,2})['’]\s*(\d{1,2}(?:\.\d+)?)"?\s*([NS])[\s+,-]*(\d{1,3})°\s*(\d{1,2})['’]\s*(\d{1,2}(?:\.\d+)?)"?\s*([EW])/i;
const GOOGLE_MAPS_PLACE_COORDINATE_PATTERN = /!8m2!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/;
const GOOGLE_MAPS_DATA_COORDINATE_PATTERN = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/g;
const GOOGLE_MAPS_LEGACY_COORDINATE_PATTERN = /!2d(-?\d+(?:\.\d+)?)!3d(-?\d+(?:\.\d+)?)/g;
const GOOGLE_MAPS_HOST_PATTERN = /(^|\.)google\.[a-z.]+$|(^|\.)goo\.gl$|(^|\.)maps\.app\.goo\.gl$/i;

const isValidCoordinate = (lat: number, lng: number) => (
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  lat >= -90 &&
  lat <= 90 &&
  lng >= -180 &&
  lng <= 180
);

const parseCoordinateText = (text: string) => {
  const match = text.match(COORDINATE_PATTERN);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!isValidCoordinate(lat, lng)) return null;

  return { lat, lng };
};

const parseQueryCoordinateText = (text: string) => {
  const locMatch = text.match(/(?:^|[^\w])loc:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
  if (locMatch) {
    return toCoordinate(locMatch[1], locMatch[2]);
  }

  return parseCoordinateText(text);
};

const parseDmsCoordinateText = (text: string) => {
  const match = decodeURIComponent(text).match(DMS_COORDINATE_PATTERN);
  if (!match) return null;

  const [, latDegrees, latMinutes, latSeconds, latHemisphere, lngDegrees, lngMinutes, lngSeconds, lngHemisphere] = match;
  const latSign = latHemisphere.toUpperCase() === 'S' ? -1 : 1;
  const lngSign = lngHemisphere.toUpperCase() === 'W' ? -1 : 1;
  const lat = latSign * (Number(latDegrees) + Number(latMinutes) / 60 + Number(latSeconds) / 3600);
  const lng = lngSign * (Number(lngDegrees) + Number(lngMinutes) / 60 + Number(lngSeconds) / 3600);
  if (!isValidCoordinate(lat, lng)) return null;

  return { lat, lng };
};

const toCoordinate = (latText: string, lngText: string) => {
  const lat = Number(latText);
  const lng = Number(lngText);
  if (!isValidCoordinate(lat, lng)) return null;

  return { lat, lng };
};

const parseGoogleMapsDataCoordinates = (url: URL) => {
  const encodedData = `${url.pathname}${url.search}${url.hash}`;
  const data = decodeURIComponent(encodedData);

  const placeMatch = data.match(GOOGLE_MAPS_PLACE_COORDINATE_PATTERN);
  if (placeMatch) {
    const coordinates = toCoordinate(placeMatch[1], placeMatch[2]);
    if (coordinates) return coordinates;
  }

  const dataMatches = [...data.matchAll(GOOGLE_MAPS_DATA_COORDINATE_PATTERN)]
    .map((match) => toCoordinate(match[1], match[2]))
    .filter((coordinates): coordinates is { lat: number; lng: number } => Boolean(coordinates));
  if (dataMatches.length > 0) {
    return dataMatches[dataMatches.length - 1];
  }

  const legacyMatches = [...data.matchAll(GOOGLE_MAPS_LEGACY_COORDINATE_PATTERN)]
    .map((match) => toCoordinate(match[2], match[1]))
    .filter((coordinates): coordinates is { lat: number; lng: number } => Boolean(coordinates));
  if (legacyMatches.length > 0) {
    return legacyMatches[legacyMatches.length - 1];
  }

  return null;
};

const cleanName = (value?: string | null) => {
  const decoded = decodeURIComponent(value ?? '')
    .replace(/\+/g, ' ')
    .trim();

  if (!decoded || parseCoordinateText(decoded)) return undefined;
  if (parseDmsCoordinateText(decoded)) return undefined;
  return decoded;
};

const extractNameFromPath = (url: URL) => {
  const parts = url.pathname
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);

  const markerIndex = parts.findIndex((part) => ['place', 'search', 'dir'].includes(part));
  if (markerIndex < 0) return undefined;

  return cleanName(parts[markerIndex + 1]);
};

const toGoogleMapsUrl = (rawInput: string) => {
  const input = rawInput.trim();
  if (!input) return null;

  try {
    const url = new URL(input);
    return GOOGLE_MAPS_HOST_PATTERN.test(url.hostname) ? url : null;
  } catch {
    return null;
  }
};

export const parseGoogleMapsSearchText = (rawInput: string): string | null => {
  const url = toGoogleMapsUrl(rawInput);
  if (!url) return null;

  const readableText = cleanName(url.searchParams.get('query')) ??
    cleanName(url.searchParams.get('q')) ??
    cleanName(url.searchParams.get('destination')) ??
    extractNameFromPath(url);

  return readableText ?? null;
};

export const parseGoogleMapsLink = (rawInput: string): ParsedGoogleMapsLink | null => {
  const input = rawInput.trim();
  if (!input) return null;

  const directCoordinates = parseCoordinateText(input);
  if (directCoordinates && !/^https?:\/\//i.test(input)) {
    return directCoordinates;
  }

  const url = toGoogleMapsUrl(input);
  if (!url) {
    return /^https?:\/\//i.test(input) ? null : directCoordinates;
  }

  const dataCoordinates = parseGoogleMapsDataCoordinates(url);
  const dmsCoordinates = parseDmsCoordinateText(url.pathname);
  const pathCoordinates = parseCoordinateText(url.pathname);
  const queryCoordinateSource = [
    url.searchParams.get('q'),
    url.searchParams.get('query'),
    url.searchParams.get('ll'),
    url.searchParams.get('center'),
    url.searchParams.get('destination'),
  ].find((value) => value && parseQueryCoordinateText(value));
  const queryCoordinates = queryCoordinateSource ? parseQueryCoordinateText(queryCoordinateSource) : null;
  const coordinates = dataCoordinates ?? dmsCoordinates ?? queryCoordinates ?? pathCoordinates ?? directCoordinates;

  if (!coordinates) return null;

  return {
    ...coordinates,
    name: parseGoogleMapsSearchText(input) ?? undefined,
  };
};
