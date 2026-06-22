export interface CreatePreviewDraft {
  previewImage: string;
  previewHeroImageData?: string;
}

export const CREATE_PREVIEW_DRAFT_STORAGE_KEY = 'found-cat-create-preview-draft';

const isCreatePreviewDraft = (value: unknown): value is CreatePreviewDraft => {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<CreatePreviewDraft>;
  return typeof draft.previewImage === 'string' && draft.previewImage.trim().length > 0;
};

export const loadCreatePreviewDraft = (): CreatePreviewDraft | null => {
  try {
    const rawValue = window.localStorage.getItem(CREATE_PREVIEW_DRAFT_STORAGE_KEY);
    if (!rawValue) return null;

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!isCreatePreviewDraft(parsedValue)) {
      window.localStorage.removeItem(CREATE_PREVIEW_DRAFT_STORAGE_KEY);
      return null;
    }

    return {
      previewImage: parsedValue.previewImage,
      ...(typeof parsedValue.previewHeroImageData === 'string' && parsedValue.previewHeroImageData.trim().length > 0
        ? { previewHeroImageData: parsedValue.previewHeroImageData }
        : {}),
    };
  } catch {
    window.localStorage.removeItem(CREATE_PREVIEW_DRAFT_STORAGE_KEY);
    return null;
  }
};

export const saveCreatePreviewDraft = (draft: CreatePreviewDraft) => {
  try {
    window.localStorage.setItem(CREATE_PREVIEW_DRAFT_STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Draft recovery is best-effort; saving the cat card must still work if storage is full.
  }
};

export const clearCreatePreviewDraft = () => {
  try {
    window.localStorage.removeItem(CREATE_PREVIEW_DRAFT_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
};
