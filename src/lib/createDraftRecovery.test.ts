import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearCreatePreviewDraft,
  CREATE_PREVIEW_DRAFT_STORAGE_KEY,
  loadCreatePreviewDraft,
  saveCreatePreviewDraft,
} from './createDraftRecovery';

describe('create draft recovery', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('saves and loads a preview draft for restoring an interrupted create flow', () => {
    saveCreatePreviewDraft({
      previewImage: 'data:image/jpeg;base64,cat-card',
      previewHeroImageData: 'data:image/jpeg;base64,hero',
    });

    expect(loadCreatePreviewDraft()).toEqual({
      previewImage: 'data:image/jpeg;base64,cat-card',
      previewHeroImageData: 'data:image/jpeg;base64,hero',
    });
  });

  it('clears invalid or completed preview drafts', () => {
    window.localStorage.setItem(CREATE_PREVIEW_DRAFT_STORAGE_KEY, '{"previewImage":""}');
    expect(loadCreatePreviewDraft()).toBeNull();

    saveCreatePreviewDraft({
      previewImage: 'data:image/jpeg;base64,cat-card',
    });
    clearCreatePreviewDraft();

    expect(loadCreatePreviewDraft()).toBeNull();
  });
});
