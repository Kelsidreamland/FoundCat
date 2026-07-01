import type {
  CatCareStatusTag,
  CatPersonalityTag,
  ScrapbookItem,
} from '../store/useScrapbookStore';

export type CloudCatCardRow = {
  id: string;
  owner_id: string;
  catdex_number: number | null;
  public_number: number | null;
  cat_name: string | null;
  cat_feature_note: string | null;
  image_data: string;
  hero_image_data: string | null;
  encountered_at: string;
  location_name: string | null;
  location_address: string | null;
  location_place_id: string | null;
  location_map_url: string | null;
  lat: number | null;
  lng: number | null;
  personality_tags: CatPersonalityTag[];
  care_status_tags: CatCareStatusTag[];
  spot_note: string | null;
  private_note: string | null;
  is_public: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CloudCatCardUpsertRow = Omit<CloudCatCardRow, 'public_number'>;

export type PublicCloudCatCard = {
  id: string;
  catdexNumber: number | null;
  publicNumber: number | null;
  catName: string | null;
  catFeatureNote: string | null;
  imageData: string;
  heroImageData: string | null;
  encounteredAt: string;
  locationName: string | null;
  locationMapUrl: string | null;
  lat: number;
  lng: number;
  personalityTags: CatPersonalityTag[];
  careStatusTags: CatCareStatusTag[];
  spotNote: string | null;
};

type CloudCatCardUpsertOptions = {
  isPublic?: boolean;
};

const emptyToNull = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export function toCloudCatCardUpsert(
  item: ScrapbookItem,
  ownerId: string,
  options: CloudCatCardUpsertOptions = {}
): CloudCatCardUpsertRow {
  return {
    id: item.id,
    owner_id: ownerId,
    catdex_number: item.catdexNumber ?? null,
    cat_name: emptyToNull(item.catName),
    cat_feature_note: emptyToNull(item.catFeatureNote),
    image_data: item.imageData,
    hero_image_data: item.heroImageData ?? null,
    encountered_at: item.date,
    location_name: item.location?.name ?? null,
    location_address: item.location?.address ?? null,
    location_place_id: item.location?.placeId ?? null,
    location_map_url: item.location?.mapUrl ?? null,
    lat: item.location?.lat ?? null,
    lng: item.location?.lng ?? null,
    personality_tags: item.personalityTags ?? [],
    care_status_tags: item.careStatusTags ?? [],
    spot_note: emptyToNull(item.spotNote),
    private_note: emptyToNull(item.privateNote),
    is_public: options.isPublic ?? item.isPublic ?? false,
  };
}

export const isCatFeatureNoteSchemaError = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('message' in error)) return false;
  const message = String(error.message).toLowerCase();

  return message.includes('cat_feature_note')
    && (
      message.includes('schema cache')
      || message.includes('could not find')
      || message.includes('column')
    );
};

export const isOptionalCloudColumnSchemaError = (error: unknown) => {
  if (!error || typeof error !== 'object' || !('message' in error)) return false;
  const message = String(error.message).toLowerCase();

  return (
    message.includes('cat_feature_note') ||
    message.includes('location_map_url') ||
    message.includes('private_note')
  ) && (
    message.includes('schema cache')
    || message.includes('could not find')
    || message.includes('column')
  );
};

export const withoutOptionalCloudColumns = <T extends {
  cat_feature_note?: string | null;
  location_map_url?: string | null;
  private_note?: string | null;
}>(row: T) => {
  const {
    cat_feature_note: _catFeatureNote,
    location_map_url: _locationMapUrl,
    private_note: _privateNote,
    ...fallbackRow
  } = row;
  return fallbackRow;
};

export const withoutCatFeatureNote = <T extends { cat_feature_note?: string | null }>(row: T) => {
  const { cat_feature_note: _catFeatureNote, ...fallbackRow } = row;
  return fallbackRow;
};

export function toPublicCloudCatCard(row: CloudCatCardRow): PublicCloudCatCard {
  if (row.lat === null || row.lng === null) {
    throw new Error('Public cloud cat card requires coordinates');
  }

  return {
    id: row.id,
    catdexNumber: row.catdex_number,
    publicNumber: row.public_number,
    catName: row.cat_name,
    catFeatureNote: row.cat_feature_note,
    imageData: row.image_data,
    heroImageData: row.hero_image_data,
    encounteredAt: row.encountered_at,
    locationName: row.location_name,
    locationMapUrl: row.location_map_url,
    lat: row.lat,
    lng: row.lng,
    personalityTags: row.personality_tags,
    careStatusTags: row.care_status_tags,
    spotNote: row.spot_note,
  };
}

export function getPublicCloudCatCards(rows: CloudCatCardRow[]) {
  return rows
    .filter((row) => row.is_public && row.lat !== null && row.lng !== null)
    .map(toPublicCloudCatCard);
}
