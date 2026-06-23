import type { ScrapbookItem } from '../store/useScrapbookStore';
import { buildGoogleMapsSearchUrl } from './singleCatShare';
import { buildMapSharePayload, type MapShareCat } from './mapShare';

type Language = 'zh' | 'en';

interface CatMapCsvInput {
  title: string;
  items: ScrapbookItem[];
  includeMemo: boolean;
  language: Language;
}

interface PreparedCsvExport {
  content: string;
  fileName: string;
  mimeType: 'text/csv;charset=utf-8';
}

const CSV_HEADERS = [
  'Title',
  'Number',
  'Location',
  'Address',
  'Latitude',
  'Longitude',
  'WKT',
  'Date',
  'Memo',
  'Google Maps URL',
];

const sanitizeFileNamePart = (value: string, language: Language) => {
  const semanticValue = value
    .replace(/地圖/g, ' map ')
    .replace(/貓咪|貓貓/g, ' cat ');
  const normalized = semanticValue
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  if (!normalized || normalized === 'map') return language === 'zh' ? 'my-map' : 'my-map';
  return normalized;
};

const escapeCsvCell = (value: string | number | undefined) => {
  const cell = value === undefined ? '' : String(value);
  if (!/[",\n\r]/.test(cell)) return cell;
  return `"${cell.replace(/"/g, '""')}"`;
};

const getCatTitle = (cat: MapShareCat, language: Language) => {
  return cat.catName?.trim()
    || cat.locationName
    || (language === 'zh' ? '未命名貓咪' : 'Unnamed cat');
};

const getGoogleMapsUrl = (cat: MapShareCat) => {
  return buildGoogleMapsSearchUrl({
    lat: cat.lat,
    lng: cat.lng,
    name: cat.locationName,
    address: cat.locationAddress,
    mapUrl: cat.locationMapUrl,
  });
};

export const buildCatMapCsv = (
  items: ScrapbookItem[],
  options: { title: string; includeMemo: boolean; language: Language }
) => {
  const payload = buildMapSharePayload(items, options);
  const rows = payload.cats.map((cat) => [
    getCatTitle(cat, options.language),
    cat.numberLabel,
    cat.locationName,
    cat.locationAddress,
    cat.lat,
    cat.lng,
    `POINT(${cat.lng} ${cat.lat})`,
    cat.date,
    cat.memo,
    getGoogleMapsUrl(cat),
  ]);

  return [
    CSV_HEADERS.join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ].join('\n');
};

export const prepareCatMapCsvExport = ({
  title,
  items,
  includeMemo,
  language,
}: CatMapCsvInput): PreparedCsvExport => {
  const content = `\uFEFF${buildCatMapCsv(items, { title, includeMemo, language })}`;
  const fileName = `found-cat-${sanitizeFileNamePart(title, language)}.csv`;

  return {
    content,
    fileName,
    mimeType: 'text/csv;charset=utf-8',
  };
};

export const downloadCatMapCsv = (input: CatMapCsvInput) => {
  const prepared = prepareCatMapCsvExport(input);
  const blob = new Blob([prepared.content], { type: prepared.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = prepared.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
