import { describe, expect, it } from 'vitest';
import type { ScrapbookItem } from '../store/useScrapbookStore';
import { getFindCatCta, getReadableLocationName, hasReadableLocationName } from './locationDisplay';

const makeItem = (locationName: string | undefined): Pick<ScrapbookItem, 'location'> => ({
  location: locationName
    ? {
        lat: 25.033,
        lng: 121.565,
        name: locationName,
      }
    : undefined,
});

describe('location display helpers', () => {
  it('keeps readable place names', () => {
    expect(hasReadableLocationName('巷口咖啡店')).toBe(true);
    expect(getReadableLocationName(makeItem('巷口咖啡店'), 'zh')).toBe('巷口咖啡店');
  });

  it('uses the find-cat CTA instead of raw links, coordinates, or default placeholders', () => {
    expect(getReadableLocationName(makeItem('https://maps.app.goo.gl/abc123'), 'zh')).toBe('去找這隻貓');
    expect(getReadableLocationName(makeItem('maps.app.goo.gl/abc123'), 'zh')).toBe('去找這隻貓');
    expect(getReadableLocationName(makeItem('25.03300, 121.56500'), 'zh')).toBe('去找這隻貓');
    expect(getReadableLocationName(makeItem('貓咪出沒點'), 'zh')).toBe('去找這隻貓');
    expect(getReadableLocationName(makeItem(undefined), 'en')).toBe('No location');
  });

  it('returns concise CTA copy for detail actions', () => {
    expect(getFindCatCta('zh')).toBe('出發去找這隻貓');
    expect(getFindCatCta('en')).toBe('Go find this cat');
  });
});
