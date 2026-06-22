export interface ParsedGoogleMapsLink {
  lat: number;
  lng: number;
  name?: string;
}

const COORDINATE_PATTERN = /(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/;
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

const cleanName = (value?: string | null) => {
  const decoded = decodeURIComponent(value ?? '')
    .replace(/\+/g, ' ')
    .trim();

  if (!decoded || parseCoordinateText(decoded)) return undefined;
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

  const pathCoordinates = parseCoordinateText(url.pathname);
  const queryCoordinateSource = [
    url.searchParams.get('q'),
    url.searchParams.get('query'),
    url.searchParams.get('ll'),
    url.searchParams.get('center'),
    url.searchParams.get('destination'),
  ].find((value) => value && parseCoordinateText(value));
  const queryCoordinates = queryCoordinateSource ? parseCoordinateText(queryCoordinateSource) : null;
  const coordinates = pathCoordinates ?? queryCoordinates ?? directCoordinates;

  if (!coordinates) return null;

  return {
    ...coordinates,
    name: parseGoogleMapsSearchText(input) ?? undefined,
  };
};
