import { describe, expect, it } from 'vitest';
import { buildStickerDraft } from './createStickerDraft';

describe('buildStickerDraft', () => {
  it('keeps hero image data and uses the selected calendar date at local noon', () => {
    const randomValues = [0.5, 0.25, 0.75];
    const draft = buildStickerDraft({
      imageData: 'data:image/png;base64,sticker',
      heroImageData: 'data:image/jpeg;base64,hero',
      targetDate: '2026-05-05',
      viewportWidth: 390,
      viewportHeight: 844,
      now: new Date('2026-05-06T01:02:03.000Z'),
      random: () => randomValues.shift() ?? 0,
    });

    expect(draft).toMatchObject({
      type: 'sticker',
      imageData: 'data:image/png;base64,sticker',
      heroImageData: 'data:image/jpeg;base64,hero',
      rotation: 5,
      scale: 1,
    });
    expect(draft.date).toBe(new Date(2026, 4, 5, 12, 0, 0).toISOString());
    expect(draft.x).toBe(125);
    expect(draft.y).toBe(261);
  });
});
