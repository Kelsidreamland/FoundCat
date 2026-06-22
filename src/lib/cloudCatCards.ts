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
  image_data: string;
  hero_image_data: string | null;
  encountered_at: string;
  location_name: string | null;
  location_address: string | null;
  location_place_id: string | null;
  lat: number | null;
  lng: number | null;
  personality_tags: CatPersonalityTag[];
  care_status_tags: CatCareStatusTag[];
  spot_note: string | null;
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
  imageData: string;
  heroImageData: string | null;
  encounteredAt: string;
  locationName: string | null;
  lat: number;
  lng: number;
  personalityTags: CatPersonalityTag[];
  careStatusTags: CatCareStatusTag[];
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
    image_data: item.imageData,
    hero_image_data: item.heroImageData ?? null,
    encountered_at: item.date,
    location_name: item.location?.name ?? null,
    location_address: item.location?.address ?? null,
    location_place_id: item.location?.placeId ?? null,
    lat: item.location?.lat ?? null,
    lng: item.location?.lng ?? null,
    personality_tags: item.personalityTags ?? [],
    care_status_tags: item.careStatusTags ?? [],
    spot_note: emptyToNull(item.spotNote),
    is_public: options.isPublic ?? item.isPublic ?? false,
  };
}

export function toPublicCloudCatCard(row: CloudCatCardRow): PublicCloudCatCard {
  if (row.lat === null || row.lng === null) {
    throw new Error('Public cloud cat card requires coordinates');
  }

  return {
    id: row.id,
    catdexNumber: row.catdex_number,
    publicNumber: row.public_number,
    catName: row.cat_name,
    imageData: row.image_data,
    heroImageData: row.hero_image_data,
    encounteredAt: row.encountered_at,
    locationName: row.location_name,
    lat: row.lat,
    lng: row.lng,
    personalityTags: row.personality_tags,
    careStatusTags: row.care_status_tags,
  };
}

export function getPublicCloudCatCards(rows: CloudCatCardRow[]) {
  return rows
    .filter((row) => row.is_public && row.lat !== null && row.lng !== null)
    .map(toPublicCloudCatCard);
}
