import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  type CatCareStatusTag,
  type CatPersonalityTag,
  type ScrapbookItem,
  useScrapbookStore,
} from '../store/useScrapbookStore';
import { translations } from '../translations';
import { ArrowLeft, ArrowRight, Check, ExternalLink, MapPin, Maximize2, Navigation, PencilLine, Plus, Share2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { CAT_BREEDS } from '../data/catBreeds';
import { CAT_COLORS } from '../data/catColors';
import { formatCatCardNumberForItem } from '../lib/catdexDeck';
import { getFindCatCta, getReadableLocationName } from '../lib/locationDisplay';
import { MapTreasureBrandMark } from '../components/brand/BrandMarks';
import CatBrandHeader from '../components/catdex/CatBrandHeader';
import CloudBackupPrompt from '../components/cloud/CloudBackupPrompt';
import { buildGoogleMapsSearchUrl } from '../lib/singleCatShare';
import { setCloudCatCardVisibility } from '../lib/cloudVisibility';
import { useAuthStore } from '../store/useAuthStore';
import { loadPublicCatCards } from '../lib/cloudPublicCats';

const OPEN_FREE_MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const DEFAULT_CENTER: [number, number] = [114.1694, 22.3193];
const LocationPicker = lazy(() => import('../components/LocationPicker'));
const SingleCatPosterPreviewModal = lazy(() => import('../components/share/SingleCatPosterPreviewModal'));

const PERSONALITY_TAGS: Array<{ id: CatPersonalityTag; zh: string; en: string }> = [
  { id: 'friendly', zh: '親人', en: 'Friendly' },
  { id: 'shy', zh: '怕人', en: 'Shy' },
  { id: 'indifferent', zh: '不理人', en: 'Keeps distance' },
  { id: 'aloof', zh: '高冷', en: 'Aloof' },
  { id: 'foodie', zh: '貪吃', en: 'Foodie' },
  { id: 'clingy', zh: '撒嬌', en: 'Cuddly' },
  { id: 'alert', zh: '警戒中', en: 'Alert' },
];

const CARE_STATUS_TAGS: Array<{ id: CatCareStatusTag; zh: string; en: string }> = [
  { id: 'tnr', zh: '已剪耳 / TNR', en: 'Ear-tipped / TNR' },
  { id: 'collar', zh: '有項圈', en: 'Has collar' },
  { id: 'owned', zh: '疑似有人養', en: 'Likely owned' },
  { id: 'fed', zh: '固定餵養', en: 'Fed regularly' },
  { id: 'injured', zh: '疑似受傷', en: 'May be injured' },
  { id: 'unknown', zh: '不確定', en: 'Not sure' },
];

type EncounterDetailDraft = {
  catName: string;
  catFeatureNote: string;
  personalityTags: CatPersonalityTag[];
  spotNote: string;
  careStatusTags: CatCareStatusTag[];
};

type PublishStatus = 'idle' | 'saving' | 'published' | 'unpublished' | 'error';
type MapMode = 'mine' | 'public';
type PublicLoadStatus = 'idle' | 'loading' | 'success' | 'error' | 'unconfigured';

const EMPTY_ENCOUNTER_DETAIL_DRAFT: EncounterDetailDraft = {
  catName: '',
  catFeatureNote: '',
  personalityTags: [],
  spotNote: '',
  careStatusTags: [],
};

type MapLocation = NonNullable<ScrapbookItem['location']>;
type MapLocationGroup = {
  key: string;
  location: MapLocation;
  items: ScrapbookItem[];
};

const MAP_LOCATION_GROUP_COORDINATE_PRECISION = 5;

const formatMapGroupCoordinate = (value: number) => (
  value.toFixed(MAP_LOCATION_GROUP_COORDINATE_PRECISION)
);

const getMapLocationGroupKey = (location: MapLocation) => {
  const placeId = location.placeId?.trim();
  if (placeId) return `place:${placeId}`;

  return `coords:${formatMapGroupCoordinate(location.lat)},${formatMapGroupCoordinate(location.lng)}`;
};

const areLocationsInSameMapGroup = (left: MapLocation, right: MapLocation) => {
  const leftPlaceId = left.placeId?.trim();
  const rightPlaceId = right.placeId?.trim();
  if (leftPlaceId && rightPlaceId && leftPlaceId === rightPlaceId) return true;

  return (
    formatMapGroupCoordinate(left.lat) === formatMapGroupCoordinate(right.lat) &&
    formatMapGroupCoordinate(left.lng) === formatMapGroupCoordinate(right.lng)
  );
};

const sameTags = <T extends string>(left: T[], right: T[]) => (
  left.length === right.length && left.every((tag, index) => tag === right[index])
);

export default function Map() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { items, language, updateItem } = useScrapbookStore();
  const user = useAuthStore((state) => state.user);
  const isCloudConfigured = useAuthStore((state) => state.isConfigured);
  const t = translations[language];
  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedImageItemId, setExpandedImageItemId] = useState<string | null>(null);
  const [posterPreviewItemId, setPosterPreviewItemId] = useState<string | null>(null);
  const [locationEditItemId, setLocationEditItemId] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [encounterDetailDraft, setEncounterDetailDraft] = useState<EncounterDetailDraft>(EMPTY_ENCOUNTER_DETAIL_DRAFT);
  const [encounterDetailSavedMessage, setEncounterDetailSavedMessage] = useState<string | null>(null);
  const [isEncounterDetailsOpen, setIsEncounterDetailsOpen] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PublishStatus>('idle');
  const focusedCatId = searchParams.get('cat');
  const initialMapMode: MapMode = searchParams.get('mode') === 'mine' || (focusedCatId && searchParams.get('mode') !== 'public')
    ? 'mine'
    : 'public';
  const [mapMode, setMapMode] = useState<MapMode>(initialMapMode);
  const [publicItems, setPublicItems] = useState<ScrapbookItem[]>([]);
  const [publicLoadStatus, setPublicLoadStatus] = useState<PublicLoadStatus>('idle');
  const [publicReloadKey, setPublicReloadKey] = useState(0);

  const activeItems = mapMode === 'public' ? publicItems : items;
  const isPublicMapMode = mapMode === 'public';
  const itemsWithLocation = useMemo(
    () => activeItems.filter((item) => item.location),
    [activeItems]
  );
  const mapLocationGroups = useMemo(() => {
    const groups: MapLocationGroup[] = [];

    itemsWithLocation.forEach((item) => {
      if (!item.location) return;

      const existingGroup = groups.find((group) => (
        areLocationsInSameMapGroup(group.location, item.location!)
      ));

      if (existingGroup) {
        existingGroup.items.push(item);
        return;
      }

      groups.push({
        key: getMapLocationGroupKey(item.location),
        location: item.location,
        items: [item],
      });
    });

    return groups;
  }, [itemsWithLocation]);
  const selectedItem = activeItems.find((item) => item.id === selectedItemId) ?? null;
  const selectedLocationGroup = selectedItem
    ? mapLocationGroups.find((group) => group.items.some((item) => item.id === selectedItem.id)) ?? null
    : null;
  const selectedLocationGroupIndex = selectedLocationGroup && selectedItem
    ? selectedLocationGroup.items.findIndex((item) => item.id === selectedItem.id)
    : -1;
  const expandedImageItem = activeItems.find((item) => item.id === expandedImageItemId) ?? null;
  const posterPreviewItem = activeItems.find((item) => item.id === posterPreviewItemId) ?? null;
  const locationEditItem = items.find((item) => item.id === locationEditItemId && item.location) ?? null;

  const getBreedLabel = useCallback((breedId?: string) => {
    if (!breedId) return null;
    const breed = CAT_BREEDS.find((candidate) => candidate.id === breedId);
    return breed ? (language === 'zh' ? breed.zh : breed.en) : breedId;
  }, [language]);

  const getColorLabel = useCallback((colorId?: string) => {
    if (!colorId) return null;
    const color = CAT_COLORS.find((candidate) => candidate.id === colorId);
    return color ? (language === 'zh' ? color.zh : color.en) : colorId;
  }, [language]);

  const encounterCopy = useMemo(() => ({
    title: language === 'zh' ? '出沒補記' : 'Encounter notes',
    catName: language === 'zh' ? '幫這張貓咪圖鑑卡片取名字' : 'Name this cat card',
    catNamePlaceholder: language === 'zh'
      ? '例如：放鬆的貓咪、哭哭臉、轉角小虎'
      : 'Example: relaxed cat, sleepy face, corner tiger',
    featureNote: language === 'zh' ? '特徵描述' : 'Feature note',
    featureNotePlaceholder: language === 'zh'
      ? '例如：白襪、左耳白毛、尾巴短短、看到相機會慢慢眨眼'
      : 'Example: white socks, white patch on left ear, short tail, slow blinks at camera',
    featureHeading: language === 'zh' ? '特徵' : 'Features',
    spotNote: language === 'zh' ? '出沒線索' : 'Spot clues',
    spotNotePlaceholder: language === 'zh'
      ? '例如：飯店右手邊門口的紙箱、對面 7-11 晚上常出現'
      : 'Example: cardboard box by the hotel entrance, often seen near 7-11 at night',
    spotHeading: language === 'zh' ? '出沒線索' : 'Spot clues',
    personality: language === 'zh' ? '牠給人的感覺' : 'How this cat felt',
    careStatus: language === 'zh' ? '照護狀態' : 'Care status',
    careHeading: language === 'zh' ? '照護' : 'Care',
    expandDetails: language === 'zh' ? '補充貓咪資訊' : 'Add cat info',
    expandDetailsHint: language === 'zh'
      ? '名字、特徵、出沒線索'
      : 'Name, features, spot clues',
    dialogTitle: language === 'zh' ? '補充這隻貓的線索' : 'Add clues for this cat',
    dialogSubtitle: language === 'zh'
      ? '可以先只填你確定的事，之後再回來補。'
      : 'Add only what you know now. You can update it later.',
    save: language === 'zh' ? '儲存貓咪資訊' : 'Save cat info',
    saved: language === 'zh' ? '已儲存' : 'Saved',
    closeDetails: language === 'zh' ? '關閉貓咪資訊編輯' : 'Close cat info editor',
  }), [language]);

  useEffect(() => {
    if (!selectedItem) {
      setEncounterDetailDraft(EMPTY_ENCOUNTER_DETAIL_DRAFT);
      setEncounterDetailSavedMessage(null);
      setIsEncounterDetailsOpen(false);
      return;
    }

    setEncounterDetailDraft({
      catName: selectedItem.catName ?? '',
      catFeatureNote: selectedItem.catFeatureNote ?? '',
      personalityTags: selectedItem.personalityTags ?? [],
      spotNote: selectedItem.spotNote ?? '',
      careStatusTags: selectedItem.careStatusTags ?? [],
    });
    setEncounterDetailSavedMessage(null);
    setIsEncounterDetailsOpen(false);
    setPublishStatus('idle');
  }, [selectedItem]);

  const updateEncounterDetailDraft = useCallback((updater: (draft: EncounterDetailDraft) => EncounterDetailDraft) => {
    setEncounterDetailSavedMessage(null);
    setEncounterDetailDraft(updater);
  }, []);

  const togglePersonalityTag = useCallback((tagId: CatPersonalityTag) => {
    updateEncounterDetailDraft((draft) => ({
      ...draft,
      personalityTags: draft.personalityTags.includes(tagId)
        ? draft.personalityTags.filter((tag) => tag !== tagId)
        : [...draft.personalityTags, tagId],
    }));
  }, [updateEncounterDetailDraft]);

  const toggleCareStatusTag = useCallback((tagId: CatCareStatusTag) => {
    updateEncounterDetailDraft((draft) => ({
      ...draft,
      careStatusTags: draft.careStatusTags.includes(tagId)
        ? draft.careStatusTags.filter((tag) => tag !== tagId)
        : [...draft.careStatusTags, tagId],
    }));
  }, [updateEncounterDetailDraft]);

  const handleSaveEncounterDetails = useCallback(async () => {
    if (!selectedItem) return;

    const trimmedCatName = encounterDetailDraft.catName.trim();
    const trimmedFeatureNote = encounterDetailDraft.catFeatureNote.trim();
    const trimmedSpotNote = encounterDetailDraft.spotNote.trim();

    await updateItem(selectedItem.id, {
      catName: trimmedCatName || undefined,
      catFeatureNote: trimmedFeatureNote || undefined,
      personalityTags: encounterDetailDraft.personalityTags.length > 0
        ? encounterDetailDraft.personalityTags
        : undefined,
      spotNote: trimmedSpotNote || undefined,
      careStatusTags: encounterDetailDraft.careStatusTags.length > 0
        ? encounterDetailDraft.careStatusTags
        : undefined,
    });
    setEncounterDetailSavedMessage(encounterCopy.saved);
    setIsEncounterDetailsOpen(false);
  }, [encounterCopy.saved, encounterDetailDraft, selectedItem, updateItem]);

  const handleLocationPicked = useCallback(async (location: MapLocation) => {
    if (!locationEditItem) return;

    await updateItem(locationEditItem.id, { location });
    setSelectedItemId(locationEditItem.id);
    setLocationEditItemId(null);
  }, [locationEditItem, updateItem]);

  const handleMapModeChange = useCallback((nextMode: MapMode) => {
    setMapMode(nextMode);
    const nextSearchParams = new URLSearchParams(searchParams);
    if (nextMode === 'public') {
      nextSearchParams.set('mode', 'public');
    } else {
      nextSearchParams.set('mode', 'mine');
    }
    navigate(
      {
        pathname: '/map',
        search: nextSearchParams.toString(),
      },
      { replace: true }
    );
    setSelectedItemId(null);
    setExpandedImageItemId(null);
    setPosterPreviewItemId(null);
    setLocationEditItemId(null);
    setIsEncounterDetailsOpen(false);
  }, [navigate, searchParams]);

  const handleRetryPublicMap = useCallback(() => {
    setPublicReloadKey((current) => current + 1);
  }, []);

  const selectSiblingInLocationGroup = useCallback((direction: 'previous' | 'next') => {
    if (!selectedItem || !selectedLocationGroup || selectedLocationGroup.items.length < 2) return;

    const currentIndex = selectedLocationGroup.items.findIndex((item) => item.id === selectedItem.id);
    if (currentIndex < 0) return;

    const offset = direction === 'next' ? 1 : -1;
    const nextIndex = (
      currentIndex + offset + selectedLocationGroup.items.length
    ) % selectedLocationGroup.items.length;

    setSelectedItemId(selectedLocationGroup.items[nextIndex].id);
  }, [selectedItem, selectedLocationGroup]);

  const handleTogglePublicVisibility = useCallback(async () => {
    if (!selectedItem || publishStatus === 'saving') return;

    const nextIsPublic = !selectedItem.isPublic;
    setPublishStatus('saving');

    const result = await setCloudCatCardVisibility({
      ownerId: user?.id ?? null,
      item: selectedItem,
      isPublic: nextIsPublic,
    });

    if (!result.ok) {
      setPublishStatus('error');
      return;
    }

    await updateItem(selectedItem.id, {
      isPublic: result.isPublic,
    });
    setPublishStatus(result.isPublic ? 'published' : 'unpublished');
  }, [publishStatus, selectedItem, updateItem, user?.id]);

  useEffect(() => {
    if (mapMode !== 'public') return;

    let cancelled = false;
    setPublicLoadStatus('loading');

    void loadPublicCatCards().then((result) => {
      if (cancelled) return;

      if (result.ok === false) {
        setPublicItems([]);
        setPublicLoadStatus(result.reason === 'cloud_not_configured' ? 'unconfigured' : 'error');
        return;
      }

      setPublicItems(result.items);
      setPublicLoadStatus('success');
    });

    return () => {
      cancelled = true;
    };
  }, [mapMode, publicReloadKey]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: OPEN_FREE_MAP_STYLE_URL,
      center: DEFAULT_CENTER,
      zoom: 12,
      attributionControl: { compact: true },
      canvasContextAttributes: {
        preserveDrawingBuffer: true,
      },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'bottom-right');

    map.on('load', () => {
      setMapReady(true);
    });

    map.on('error', (event) => {
      console.error('MapLibre error:', event.error);
      setMapError('Unable to load map tiles right now.');
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    mapLocationGroups.forEach((group) => {
      const primaryItem = group.items[0];
      if (!primaryItem?.location) return;

      const markerElement = document.createElement('button');
      const catCount = group.items.length;
      const groupLocationName = getReadableLocationName(primaryItem, language);
      const markerLabel = catCount > 1
        ? (language === 'zh'
            ? `${groupLocationName}，${catCount} 隻貓`
            : `${groupLocationName}, ${catCount} cats`)
        : groupLocationName;
      markerElement.type = 'button';
      markerElement.setAttribute('aria-label', markerLabel);
      markerElement.style.position = 'relative';
      markerElement.style.width = catCount > 1 ? '58px' : '52px';
      markerElement.style.height = catCount > 1 ? '58px' : '52px';
      markerElement.style.borderRadius = '9999px';
      markerElement.style.border = '3px solid white';
      markerElement.style.backgroundImage = `url(${primaryItem.imageData})`;
      markerElement.style.backgroundSize = 'cover';
      markerElement.style.backgroundPosition = 'center';
      markerElement.style.boxShadow = catCount > 1
        ? '0 7px 18px rgba(0,0,0,0.18), 7px 5px 0 #f7c948, -6px -5px 0 #2f5fb3'
        : '0 6px 18px rgba(0,0,0,0.18)';
      markerElement.style.cursor = 'pointer';
      markerElement.style.overflow = 'visible';
      markerElement.style.backgroundColor = '#FFF8F0';

      if (catCount > 1) {
        const countBadge = document.createElement('span');
        countBadge.textContent = String(catCount);
        countBadge.style.position = 'absolute';
        countBadge.style.right = '-7px';
        countBadge.style.top = '-8px';
        countBadge.style.display = 'flex';
        countBadge.style.alignItems = 'center';
        countBadge.style.justifyContent = 'center';
        countBadge.style.minWidth = '23px';
        countBadge.style.height = '23px';
        countBadge.style.border = '2px solid #221915';
        countBadge.style.borderRadius = '9999px';
        countBadge.style.background = '#fffdf2';
        countBadge.style.color = '#221915';
        countBadge.style.fontSize = '12px';
        countBadge.style.fontWeight = '900';
        countBadge.style.boxShadow = '2px 2px 0 rgba(47,95,179,0.18)';
        markerElement.appendChild(countBadge);
      }

      markerElement.addEventListener('click', () => {
        setSelectedItemId(primaryItem.id);
        map.easeTo({
          center: [group.location.lng, group.location.lat],
          zoom: Math.max(map.getZoom(), 15),
          duration: 700,
        });
      });

      const marker = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
        .setLngLat([group.location.lng, group.location.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    const focusedItem = focusedCatId
      ? itemsWithLocation.find((item) => item.id === focusedCatId && item.location)
      : undefined;

    if (focusedItem?.location) {
      setSelectedItemId(focusedItem.id);
      map.easeTo({
        center: [focusedItem.location.lng, focusedItem.location.lat],
        zoom: 15,
        duration: 700,
      });
      return;
    }

    if (mapLocationGroups.length === 1) {
      const [group] = mapLocationGroups;
      map.easeTo({
        center: [group.location.lng, group.location.lat],
        zoom: 14,
        duration: 700,
      });
      return;
    }

    if (mapLocationGroups.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      mapLocationGroups.forEach((group) => {
        bounds.extend([group.location.lng, group.location.lat]);
      });
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 700 });
    }
  }, [focusedCatId, itemsWithLocation, language, mapLocationGroups, mapReady, t.map]);

  const shareMap = useCallback(async () => {
    if (!mapWrapperRef.current) return;
    setIsSharing(true);

    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(mapWrapperRef.current, {
        backgroundColor: '#FFF8F0',
        useCORS: true,
        scale: 2,
      });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('MAP_CAPTURE_FAILED');

      const file = new File([blob], `cat-map-${Date.now()}.png`, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: t.mapShareTitle,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `cat-map-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Map share failed:', error);
      window.alert(t.shareMapFailed);
    } finally {
      setIsSharing(false);
    }
  }, [t.mapShareTitle, t.shareMapFailed]);

  const selectedBreedLabel = getBreedLabel(selectedItem?.catBreed);
  const selectedColorLabel = getColorLabel(selectedItem?.catColor);
  const selectedCardNumber = selectedItem ? formatCatCardNumberForItem(selectedItem) : null;
  const selectedNumberLabel = isPublicMapMode
    ? (language === 'zh' ? '世界地圖編號' : 'World map number')
    : (language === 'zh' ? '我的圖鑑編號' : 'My card number');
  const selectedNumberHint = isPublicMapMode
    ? (language === 'zh' ? '來自全世界地圖，保留 W 編號。' : 'From the World Map, keeping its W-number.')
    : (language === 'zh' ? '只整理你親自拍到的貓。' : 'Only cats you photographed yourself.');
  const selectedImage = selectedItem?.heroImageData || selectedItem?.imageData;
  const selectedLocationDisplayName = selectedItem ? getReadableLocationName(selectedItem, language) : '';
  const selectedFindCatCta = getFindCatCta(language);
  const selectedDisplayName = selectedItem
    ? selectedItem.catName?.trim() || selectedLocationDisplayName
    : '';
  const selectedGoogleMapsUrl = selectedItem?.location
    ? buildGoogleMapsSearchUrl({
        lat: selectedItem.location.lat,
        lng: selectedItem.location.lng,
        name: selectedItem.location.name,
        address: selectedItem.location.address,
        mapUrl: selectedItem.location.mapUrl,
      })
    : null;
  const expandedImage = expandedImageItem?.heroImageData || expandedImageItem?.imageData;
  const selectedPersonalityTags = selectedItem?.personalityTags ?? [];
  const selectedCareStatusTags = selectedItem?.careStatusTags ?? [];
  const selectedFeatureNote = selectedItem?.catFeatureNote?.trim() ?? '';
  const selectedSpotNote = selectedItem?.spotNote?.trim() ?? '';
  const selectedLocationGroupCount = selectedLocationGroup?.items.length ?? 0;
  const hasSelectedLocationSiblings = selectedLocationGroupCount > 1 && selectedLocationGroupIndex >= 0;
  const selectedLocationGroupPosition = hasSelectedLocationSiblings
    ? selectedLocationGroupIndex + 1
    : 0;
  const encounterDetailsDirty = Boolean(
    selectedItem && (
      encounterDetailDraft.catName !== (selectedItem.catName ?? '') ||
      encounterDetailDraft.catFeatureNote !== (selectedItem.catFeatureNote ?? '') ||
      encounterDetailDraft.spotNote !== (selectedItem.spotNote ?? '') ||
      !sameTags(encounterDetailDraft.personalityTags, selectedPersonalityTags) ||
      !sameTags(encounterDetailDraft.careStatusTags, selectedCareStatusTags)
    )
  );
  const photoDialogLabel = language === 'zh' ? '貓咪照片' : 'Cat photo';
  const enlargePhotoLabel = language === 'zh' ? '放大貓咪照片' : 'Enlarge cat photo';
  const closePhotoLabel = language === 'zh' ? '關閉貓咪照片' : 'Close cat photo';
  const previousSamePlaceCatLabel = language === 'zh' ? '上一隻同地點貓咪' : 'Previous cat at this spot';
  const nextSamePlaceCatLabel = language === 'zh' ? '下一隻同地點貓咪' : 'Next cat at this spot';
  const canPublishSelectedItem = Boolean(!isPublicMapMode && user && isCloudConfigured && selectedItem?.location);
  const shouldShowPublishLoginHint = Boolean(
    searchParams.get('publishHint') === '1' &&
    selectedItem?.location &&
    !isPublicMapMode &&
    !user
  );
  const shouldShowPublishReadyHint = Boolean(
    searchParams.get('publishHint') === '1' &&
    selectedItem?.location &&
    !isPublicMapMode &&
    user &&
    isCloudConfigured
  );
  const shouldShowPublishSignInPrompt = Boolean(
    !shouldShowPublishLoginHint &&
    !isPublicMapMode &&
    !user &&
    isCloudConfigured &&
    selectedItem?.location
  );
  const canEditSelectedItem = !isPublicMapMode;
  const mapModeCopy = {
    mine: language === 'zh' ? '我的地圖' : 'My Map',
    public: language === 'zh' ? '全世界地圖' : 'World Map',
    publicEmptyTitle: language === 'zh' ? '全世界地圖暫時載入失敗' : 'World Map is unavailable',
    publicPreparingTitle: language === 'zh' ? '全世界地圖準備中' : 'World Map is preparing',
    publicNoCatsTitle: language === 'zh' ? '全世界地圖等第一批貓點' : 'World Map is waiting for the first cats',
    publicLoading: language === 'zh' ? '正在載入全世界貓咪地圖...' : 'Loading the world cat map...',
    publicRetry: language === 'zh' ? '重新載入全世界地圖' : 'Reload World Map',
  };
  const publicMapStatusTitle = publicLoadStatus === 'loading'
    ? mapModeCopy.publicLoading
    : publicLoadStatus === 'error'
      ? mapModeCopy.publicEmptyTitle
      : publicLoadStatus === 'unconfigured'
        ? mapModeCopy.publicPreparingTitle
        : publicLoadStatus === 'success' && itemsWithLocation.length === 0
          ? mapModeCopy.publicNoCatsTitle
          : '';
  const mapCountLabel = isPublicMapMode
    ? (language === 'zh'
        ? `${mapLocationGroups.length} 個公開貓點`
        : `${mapLocationGroups.length} public cat ${mapLocationGroups.length === 1 ? 'spot' : 'spots'}`)
    : (language === 'zh'
        ? `${mapLocationGroups.length} 個打卡點`
        : `${mapLocationGroups.length} ${mapLocationGroups.length === 1 ? 'spot' : 'spots'}`);
  const publishCopy = {
    publish: language === 'zh' ? '公開到全世界地圖' : 'Publish to World Map',
    unpublish: language === 'zh' ? '從全世界地圖移除' : 'Remove from World Map',
    saving: language === 'zh' ? '同步中...' : 'Syncing...',
    published: language === 'zh' ? '已公開在全世界地圖' : 'Published to the world map',
    publishedHint: language === 'zh'
      ? '已同步到全世界地圖，現在可以去看看公開貓點。'
      : 'Synced to the world map. You can now view public cat spots.',
    viewPublicMap: language === 'zh' ? '去全世界地圖查看' : 'View on World Map',
    unpublished: language === 'zh' ? '已從全世界地圖移除' : 'Removed from the world map',
    error: language === 'zh' ? '同步失敗，請稍後再試。' : 'Sync failed. Please try again later.',
    hint: language === 'zh'
      ? '公開後，其他人可在全世界地圖看到這隻貓。'
      : 'Once published, others can see this cat on the world map.',
  };
  const publishLoginHintCopy = {
    title: language === 'zh' ? '想讓大家也看到這隻貓？' : 'Want everyone to find this cat?',
    body: language === 'zh'
      ? '登入後可以公開到全世界地圖，也能之後修改或撤回。'
      : 'Sign in to publish it to the world map, then edit or remove it later.',
  };
  const selectedPersonalityLabels = selectedPersonalityTags.flatMap((tagId) => {
    const tag = PERSONALITY_TAGS.find((candidate) => candidate.id === tagId);
    return tag ? [language === 'zh' ? tag.zh : tag.en] : [];
  });
  const selectedCareStatusLabels = selectedCareStatusTags.flatMap((tagId) => {
    const tag = CARE_STATUS_TAGS.find((candidate) => candidate.id === tagId);
    return tag ? [language === 'zh' ? tag.zh : tag.en] : [];
  });
  const selectedEncounterSummaryLabels = [
    ...selectedPersonalityLabels,
  ];
  const shouldShowMapEmptyState = mapReady
    && itemsWithLocation.length === 0
    && !(isPublicMapMode && publicLoadStatus === 'loading');

  if (mapError) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <MapPin size={48} className="text-cat-text-tertiary mb-4" />
        <p className="text-cat-text-secondary mb-2">{mapError}</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 flex items-center gap-2 text-cat-brand hover:text-cat-accent transition-colors font-bold"
        >
          <ArrowLeft size={18} />
          <span>{t.goBack}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative bg-cat-bg">
      <div ref={mapWrapperRef} className="absolute inset-0">
        <div
          ref={mapContainerRef}
          data-testid="cat-map-container"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-[#fff7e8]/96 to-transparent pb-5">
        <CatBrandHeader
          title={t.appName}
          subtitle={t.appSubtitle}
          showLanguageToggle={false}
          showClose
          closeLabel="關閉回首頁"
        />

        <div className="absolute left-4 right-4 top-[4.3rem] flex items-center justify-between gap-2">
          <div className="flex min-w-0 rounded-full border border-[#221915]/15 bg-[#fffdf2]/88 p-1 text-[11px] font-black text-[#221915] shadow-[2px_2px_0_rgba(47,95,179,0.12)] backdrop-blur-sm">
            <button
              type="button"
              onClick={() => handleMapModeChange('mine')}
              aria-pressed={mapMode === 'mine'}
              className={`rounded-full px-2.5 py-1.5 transition-colors ${
                mapMode === 'mine' ? 'bg-[#2f5fb3] text-[#fffdf2]' : 'text-[#221915]/70'
              }`}
            >
              {mapModeCopy.mine}
            </button>
            <button
              type="button"
              onClick={() => handleMapModeChange('public')}
              aria-pressed={mapMode === 'public'}
              className={`rounded-full px-2.5 py-1.5 transition-colors ${
                mapMode === 'public' ? 'bg-[#2f5fb3] text-[#fffdf2]' : 'text-[#221915]/70'
              }`}
            >
              {mapModeCopy.public}
            </button>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate rounded-full border border-[#221915]/15 bg-[#fffdf2]/88 px-2.5 py-1 text-[11px] font-black text-[#221915] shadow-[2px_2px_0_rgba(47,95,179,0.12)]">
              {mapCountLabel}
            </span>
            {isPublicMapMode && publicMapStatusTitle ? (
              publicLoadStatus === 'error' ? (
                <button
                  type="button"
                  onClick={handleRetryPublicMap}
                  data-testid="public-map-status-chip"
                  aria-label={mapModeCopy.publicRetry}
                  className="max-w-[9.5rem] truncate rounded-full border border-[#221915]/12 bg-[#fffdf2]/88 px-2.5 py-1 text-[10px] font-black text-[#5c5148] shadow-[2px_2px_0_rgba(247,201,72,0.2)] transition-transform active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2f5fb3]"
                >
                  {publicMapStatusTitle}
                </button>
              ) : (
                <span
                  data-testid="public-map-status-chip"
                  className="max-w-[9.5rem] truncate rounded-full border border-[#221915]/12 bg-[#fffdf2]/88 px-2.5 py-1 text-[10px] font-black text-[#5c5148] shadow-[2px_2px_0_rgba(247,201,72,0.2)]"
                >
                  {publicMapStatusTitle}
                </span>
              )
            ) : null}
            <button
              onClick={shareMap}
              disabled={itemsWithLocation.length === 0 || isSharing || isPublicMapMode}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fffdf2]/90 shadow-cat-whisper backdrop-blur-sm transition-colors hover:bg-cat-card disabled:opacity-40"
              aria-label={t.shareMap}
              title={t.shareMap}
            >
              <Share2 size={18} className="text-cat-text-main" />
            </button>
          </div>
        </div>
      </div>

      {shouldShowMapEmptyState && !isPublicMapMode ? (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="mx-4 max-w-xs rounded-[24px] border-2 border-[#221915] bg-[#fffdf2]/92 p-6 text-center shadow-[8px_8px_0_rgba(47,95,179,0.22)] backdrop-blur-sm pointer-events-auto">
            <MapTreasureBrandMark className="mx-auto mb-3 h-32 w-36 object-contain" />
            <p className="text-[#221915] font-black mb-1">{t.noMapRecords}</p>
            <p className="text-cat-text-tertiary text-sm mb-4">{t.mapHint}</p>
            <button
              onClick={() => navigate('/create')}
              className="inline-flex items-center gap-2 rounded-[14px] border-2 border-[#221915] bg-[#2f5fb3] px-4 py-2 text-sm font-black text-[#fffdf2] shadow-[4px_4px_0_rgba(34,25,21,0.16)] transition-transform active:translate-x-[1px] active:translate-y-[1px]"
            >
              <Plus size={16} />
              <span>{t.addRecord}</span>
            </button>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {selectedItem && selectedItem.location ? (
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 360, damping: 34, mass: 0.72 }}
            data-testid="map-cat-detail-sheet"
            data-motion-surface="map-cat-sheet"
            style={{ maxHeight: 'min(calc(100dvh - 6.75rem - env(safe-area-inset-bottom)), 620px)', transformOrigin: 'bottom center' }}
            className="absolute bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-0 right-0 z-20 mx-auto flex w-[calc(100%_-_1.5rem)] max-w-sm flex-col overflow-hidden rounded-[22px] border-2 border-[#221915] bg-[#fffdf2]/95 shadow-[8px_8px_0_rgba(47,95,179,0.28)] backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => setSelectedItemId(null)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#221915]/20 bg-[#fffdf2]/90 text-[#221915] shadow-sm"
              aria-label={t.cancel}
            >
              <X size={18} />
            </button>

            <button
              type="button"
              onClick={() => setExpandedImageItemId(selectedItem.id)}
              data-testid="map-cat-photo-frame"
              className="group relative block h-[clamp(220px,45dvh,360px)] w-full shrink-0 overflow-hidden bg-[#d9c6a8] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f5fb3]"
              aria-label={enlargePhotoLabel}
            >
              <img
                src={selectedImage}
                alt={selectedDisplayName}
                className="h-full w-full object-cover transition-transform duration-300 group-active:scale-[1.02]"
              />
              <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-[#221915]/20 bg-[#fffdf2]/90 text-[#221915] shadow-sm">
                <Maximize2 size={17} />
              </span>
            </button>

            <motion.div
              data-testid="map-card-scroll"
              className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: 0.04, ease: 'easeOut' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {selectedCardNumber ? (
                    <div className="mb-1.5 inline-flex max-w-full items-center gap-2 rounded-full border border-[#221915]/12 bg-[#fffdf2]/82 py-1 pl-1 pr-2 shadow-[2px_2px_0_rgba(47,95,179,0.08)]">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] ${
                        isPublicMapMode
                          ? 'bg-[#d9ecff] text-[#2f5fb3]'
                          : 'bg-[#fff2cf] text-[#221915]'
                      }`}>
                        {selectedNumberLabel}
                      </span>
                      <span className="text-xs font-black uppercase tracking-[0.12em] text-[#2f5fb3]">
                        {selectedCardNumber}
                      </span>
                    </div>
                  ) : null}
                  <h2 className="mt-1 truncate text-lg font-black text-[#221915]">{selectedDisplayName}</h2>
                  {selectedCardNumber ? (
                    <p className="mt-0.5 truncate text-[11px] font-bold text-[#6d5f52]">{selectedNumberHint}</p>
                  ) : null}
                  {selectedItem.catName ? (
                    <p className="mt-1 truncate text-xs font-black text-[#221915]/75">{selectedLocationDisplayName}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPosterPreviewItemId(selectedItem.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-[#221915]/20 bg-white text-cat-brand transition-colors hover:text-cat-accent"
                    aria-label={t.singleCatMapShare}
                    title={t.singleCatMapShare}
                  >
                    <Share2 size={18} />
                  </button>
                  {canEditSelectedItem ? (
                    <button
                      onClick={() => navigate(`/detail/${selectedItem.id}`)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[#221915]/20 bg-white text-cat-brand transition-colors hover:text-cat-accent"
                      aria-label={t.detail}
                    >
                      <ExternalLink size={19} />
                    </button>
                  ) : null}
                </div>
              </div>

              {hasSelectedLocationSiblings ? (
                <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[#221915]/12 bg-[#2f5fb3]/8 px-2.5 py-2 shadow-[3px_3px_0_rgba(47,95,179,0.08)]">
                  <button
                    type="button"
                    onClick={() => selectSiblingInLocationGroup('previous')}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#221915]/15 bg-[#fffdf2] text-[#221915] shadow-sm transition-transform active:translate-x-[1px] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50"
                    aria-label={previousSamePlaceCatLabel}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="min-w-0 text-center">
                    <p className="text-[11px] font-black text-[#2f5fb3]">
                      {language === 'zh' ? '同地點貓咪' : 'Same spot cats'}
                    </p>
                    <p className="text-sm font-black text-[#221915]">
                      {selectedLocationGroupPosition} / {selectedLocationGroupCount}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectSiblingInLocationGroup('next')}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#221915]/15 bg-[#fffdf2] text-[#221915] shadow-sm transition-transform active:translate-x-[1px] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50"
                    aria-label={nextSamePlaceCatLabel}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              ) : null}

              {selectedEncounterSummaryLabels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {selectedEncounterSummaryLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full border border-[#221915]/12 bg-[#fff2cf] px-3 py-1.5 text-[11px] font-black text-[#221915] shadow-[2px_2px_0_rgba(47,95,179,0.08)]"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              ) : null}

              {selectedFeatureNote ? (
                <div className="rounded-[14px] border border-[#221915]/10 bg-white/78 px-3 py-2 shadow-[2px_2px_0_rgba(47,95,179,0.06)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
                    {encounterCopy.featureHeading}
                  </p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-[#5f5148]">
                    {selectedFeatureNote}
                  </p>
                </div>
              ) : null}

              {selectedSpotNote ? (
                <div className="rounded-[14px] border border-[#221915]/10 bg-white/78 px-3 py-2 shadow-[2px_2px_0_rgba(47,95,179,0.06)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
                    {encounterCopy.spotHeading}
                  </p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-[#5f5148]">
                    {selectedSpotNote}
                  </p>
                </div>
              ) : null}

              {selectedCareStatusLabels.length > 0 ? (
                <div className="rounded-[14px] border border-[#2f5fb3]/14 bg-[#eaf1ff]/80 px-3 py-2 shadow-[2px_2px_0_rgba(247,201,72,0.12)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#2f5fb3]">
                    {encounterCopy.careHeading}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedCareStatusLabels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full border border-[#2f5fb3]/16 bg-[#fffdf2] px-3 py-1.5 text-[11px] font-black text-[#221915]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {shouldShowPublishLoginHint ? (
                <div className="rounded-[16px] border border-white/55 bg-white/55 px-3 py-2.5 shadow-[3px_3px_0_rgba(47,95,179,0.08)] backdrop-blur-md">
                  <p className="text-sm font-black leading-snug text-[#221915]">
                    {publishLoginHintCopy.title}
                  </p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-[#5f5148]">
                    {publishLoginHintCopy.body}
                  </p>
                </div>
              ) : null}

              {shouldShowPublishReadyHint ? (
                <p className="rounded-[16px] border border-[#2f5fb3]/20 bg-[#d9ecff]/60 px-3 py-2 text-xs font-black leading-relaxed text-[#2f5fb3] shadow-[3px_3px_0_rgba(47,95,179,0.08)]">
                  {language === 'zh'
                    ? '現在可以公開這隻貓到全世界地圖。'
                    : 'You can now publish this cat to the World Map.'}
                </p>
              ) : null}

              {shouldShowPublishSignInPrompt ? (
                <div className="rounded-[16px] border border-[#221915]/12 bg-[#2f5fb3]/8 p-2.5 shadow-[3px_3px_0_rgba(47,95,179,0.08)]">
                  <p className="text-xs font-bold leading-relaxed text-[#5f5148]">
                    {language === 'zh'
                      ? '登入後可以備份，也能把這隻貓公開到全世界地圖。'
                      : 'Sign in to back up this cat and publish it to the world map.'}
                  </p>
                  <CloudBackupPrompt language={language} items={items} redirectTo={window.location.href} />
                </div>
              ) : null}

              <div
                data-testid="map-card-action-row"
                className={`grid gap-2 text-[11px] font-black text-[#221915] ${canEditSelectedItem ? 'grid-cols-2' : 'grid-cols-1'}`}
              >
                {canEditSelectedItem ? (
                  <button
                    type="button"
                    onClick={() => setLocationEditItemId(selectedItem.id)}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] border border-[#221915]/15 bg-[#fff2cf] px-2 py-2 text-[#221915] transition-colors hover:border-[#2f5fb3]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50"
                    aria-label="編輯地點"
                  >
                    <PencilLine size={14} className="text-[#2f5fb3]" />
                    <span>{language === 'zh' ? '編輯地點' : 'Edit'}</span>
                  </button>
                ) : null}
                {selectedGoogleMapsUrl ? (
                  <a
                    href={selectedGoogleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={selectedFindCatCta}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[14px] border-2 border-[#221915] bg-[#f7c948] px-2 py-2 text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.14)] transition-transform active:translate-x-[1px] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50"
                  >
                    <Navigation size={14} className="text-[#2f5fb3]" />
                    <span>{selectedFindCatCta}</span>
                  </a>
                ) : null}
              </div>

              {canEditSelectedItem ? (
                <button
                  type="button"
                  onClick={() => setIsEncounterDetailsOpen(true)}
                  className="flex w-full items-center justify-between gap-3 rounded-[16px] border border-[#221915]/12 bg-white px-3 py-2.5 text-left text-[#221915] shadow-[3px_3px_0_rgba(47,95,179,0.08)] transition-colors hover:border-[#2f5fb3]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50"
                  aria-label={encounterCopy.expandDetails}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2f5fb3]/10 text-[#2f5fb3]">
                      <Plus size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black">{encounterCopy.expandDetails}</span>
                      <span className="block truncate text-[11px] font-bold text-cat-text-tertiary">
                        {encounterCopy.expandDetailsHint}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-[#fff2cf] px-2.5 py-1 text-[11px] font-black text-[#221915]">
                    {selectedItem.catName || selectedItem.catFeatureNote || selectedItem.spotNote || selectedEncounterSummaryLabels.length > 0 || selectedCareStatusLabels.length > 0
                      ? (language === 'zh' ? '編輯' : 'Edit')
                      : (language === 'zh' ? '新增' : 'Add')}
                  </span>
                </button>
              ) : null}

              {(selectedBreedLabel || selectedColorLabel) ? (
                <p className="rounded-[14px] border border-[#221915]/10 bg-[#f7c948]/25 px-3 py-2 text-sm font-black text-[#221915]">
                  {[selectedBreedLabel, selectedColorLabel].filter(Boolean).join(' · ')}
                </p>
              ) : null}

              {canPublishSelectedItem ? (
                <div className="rounded-[16px] border border-[#221915]/12 bg-[#2f5fb3]/8 p-2.5 shadow-[3px_3px_0_rgba(47,95,179,0.08)]">
                  <button
                    type="button"
                    onClick={() => void handleTogglePublicVisibility()}
                    disabled={publishStatus === 'saving'}
                    aria-label={selectedItem.isPublic ? publishCopy.unpublish : publishCopy.publish}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-[14px] border border-[#221915]/15 bg-[#fffdf2] px-3 py-2 text-left text-[#221915] transition-colors hover:border-[#2f5fb3]/50 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-black">
                        {publishStatus === 'saving'
                          ? publishCopy.saving
                          : selectedItem.isPublic
                            ? publishCopy.unpublish
                            : publishCopy.publish}
                      </span>
                      <span className="mt-0.5 block text-[11px] font-bold leading-snug text-cat-text-tertiary">
                        {publishCopy.hint}
                      </span>
                    </span>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#221915]/15 ${
                      selectedItem.isPublic ? 'bg-[#2f5fb3] text-[#fffdf2]' : 'bg-[#fff2cf] text-[#2f5fb3]'
                    }`}>
                      <MapPin size={15} />
                    </span>
                  </button>
                  {publishStatus === 'published' ? (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[#2f5fb3]">{publishCopy.published}</p>
                        <p className="mt-0.5 text-[11px] font-bold leading-snug text-[#5f5148]">
                          {publishCopy.publishedHint}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleMapModeChange('public')}
                        className="inline-flex min-h-8 items-center justify-center rounded-full border border-[#221915]/15 bg-[#fff2cf] px-3 py-1.5 text-[11px] font-black text-[#221915] shadow-[2px_2px_0_rgba(47,95,179,0.12)] transition-transform active:translate-x-[1px] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b82f6]/50"
                      >
                        {publishCopy.viewPublicMap}
                      </button>
                    </div>
                  ) : null}
                  {publishStatus === 'unpublished' ? (
                    <p className="mt-2 text-xs font-black text-[#6d5f52]">{publishCopy.unpublished}</p>
                  ) : null}
                  {publishStatus === 'error' ? (
                    <p className="mt-2 text-xs font-black text-[#9f3a2f]">{publishCopy.error}</p>
                  ) : null}
                </div>
              ) : null}

            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && isEncounterDetailsOpen ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={encounterCopy.dialogTitle}
            className="fixed inset-0 z-[260] flex items-end justify-center bg-[#221915]/62 p-3 backdrop-blur-sm sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              initial={{ y: 28, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 28, scale: 0.98 }}
              data-testid="map-cat-info-editor"
              className="max-h-[calc(100dvh_-_1.5rem_-_env(safe-area-inset-bottom))] w-full max-w-sm overflow-y-auto rounded-[22px] border-2 border-[#221915] bg-[#fffdf2] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[8px_8px_0_rgba(47,95,179,0.28)] overscroll-contain"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2f5fb3]">
                    Found Cat Notes
                  </p>
                  <h2 className="mt-1 text-xl font-black leading-tight text-[#221915]">
                    {encounterCopy.dialogTitle}
                  </h2>
                  <p className="mt-2 text-xs font-bold leading-relaxed text-[#5f5148]">
                    {encounterCopy.dialogSubtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEncounterDetailsOpen(false)}
                  aria-label={encounterCopy.closeDetails}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#221915]/20 bg-white text-[#221915]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#2f5fb3]">
                    {encounterCopy.title}
                  </p>
                  {encounterDetailSavedMessage ? (
                    <span role="status" className="rounded-full bg-[#2f5fb3]/10 px-2.5 py-1 text-[11px] font-black text-[#2f5fb3]">
                      {encounterDetailSavedMessage}
                    </span>
                  ) : null}
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-[#221915]">{encounterCopy.catName}</span>
                  <input
                    aria-label={encounterCopy.catName}
                    value={encounterDetailDraft.catName}
                    onChange={(event) => updateEncounterDetailDraft((draft) => ({
                      ...draft,
                      catName: event.target.value,
                    }))}
                    placeholder={encounterCopy.catNamePlaceholder}
                    className="min-h-11 w-full rounded-[12px] border border-[#221915]/15 bg-[#fffdf2] px-3 py-2 text-sm font-semibold text-[#221915] placeholder:text-[#8b7b6f] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-[#221915]">{encounterCopy.featureNote}</span>
                  <textarea
                    aria-label={encounterCopy.featureNote}
                    value={encounterDetailDraft.catFeatureNote}
                    onChange={(event) => updateEncounterDetailDraft((draft) => ({
                      ...draft,
                      catFeatureNote: event.target.value,
                    }))}
                    placeholder={encounterCopy.featureNotePlaceholder}
                    className="min-h-[72px] w-full resize-none rounded-[12px] border border-[#221915]/15 bg-[#fffdf2] px-3 py-2 text-sm font-semibold leading-relaxed text-[#221915] placeholder:text-[#8b7b6f] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-[#221915]">{encounterCopy.spotNote}</span>
                  <textarea
                    aria-label={encounterCopy.spotNote}
                    value={encounterDetailDraft.spotNote}
                    onChange={(event) => updateEncounterDetailDraft((draft) => ({
                      ...draft,
                      spotNote: event.target.value,
                    }))}
                    placeholder={encounterCopy.spotNotePlaceholder}
                    className="min-h-[72px] w-full resize-none rounded-[12px] border border-[#221915]/15 bg-[#fffdf2] px-3 py-2 text-sm font-semibold leading-relaxed text-[#221915] placeholder:text-[#8b7b6f] focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/50"
                  />
                </label>

                <div className="space-y-1.5">
                  <p className="text-xs font-black text-[#221915]">{encounterCopy.personality}</p>
                  <div className="flex flex-wrap gap-2">
                    {PERSONALITY_TAGS.map((tag) => {
                      const active = encounterDetailDraft.personalityTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => togglePersonalityTag(tag.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors ${
                            active
                              ? 'border-[#221915] bg-[#2f5fb3] text-[#fffdf2] shadow-[2px_2px_0_rgba(34,25,21,0.14)]'
                              : 'border-[#221915]/12 bg-[#fffdf2] text-[#221915] hover:border-[#2f5fb3]/50'
                          }`}
                        >
                          {language === 'zh' ? tag.zh : tag.en}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-black text-[#221915]">{encounterCopy.careStatus}</p>
                  <div className="flex flex-wrap gap-2">
                    {CARE_STATUS_TAGS.map((tag) => {
                      const active = encounterDetailDraft.careStatusTags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleCareStatusTag(tag.id)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-black transition-colors ${
                            active
                              ? 'border-[#221915] bg-[#f7c948] text-[#221915] shadow-[2px_2px_0_rgba(34,25,21,0.14)]'
                              : 'border-[#221915]/12 bg-[#fffdf2] text-[#221915] hover:border-[#2f5fb3]/50'
                          }`}
                        >
                          {language === 'zh' ? tag.zh : tag.en}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveEncounterDetails}
                  disabled={!encounterDetailsDirty}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] border-2 border-[#221915] bg-[#221915] px-4 py-2.5 text-sm font-black text-[#fffdf2] shadow-[4px_4px_0_rgba(47,95,179,0.18)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Check size={16} />
                  <span>{encounterCopy.save}</span>
                </button>
              </div>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {locationEditItem?.location ? (
          <Suspense fallback={null}>
            <LocationPicker
              initialLocation={locationEditItem.location}
              onPicked={handleLocationPicked}
              onClose={() => setLocationEditItemId(null)}
              language={language}
            />
          </Suspense>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {expandedImageItem && expandedImage ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={photoDialogLabel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-[#221915]/85 p-5 backdrop-blur-sm"
            onClick={() => setExpandedImageItemId(null)}
          >
            <button
              type="button"
              onClick={() => setExpandedImageItemId(null)}
              className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full bg-[#fffdf2] text-[#221915]"
              aria-label={closePhotoLabel}
            >
              <X size={20} />
            </button>
            <motion.img
              initial={{ scale: 0.96, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 10 }}
              src={expandedImage}
              alt={language === 'zh' ? '放大的貓咪照片' : 'Enlarged cat photo'}
              className="max-h-[82vh] w-full max-w-md rounded-[18px] border-2 border-[#fffdf2] object-contain shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {posterPreviewItem?.location ? (
          <Suspense fallback={null}>
            <SingleCatPosterPreviewModal
              item={posterPreviewItem}
              language={language}
              onClose={() => setPosterPreviewItemId(null)}
            />
          </Suspense>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
