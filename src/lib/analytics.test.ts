import { describe, expect, it } from 'vitest';
import { stripUrlDetails } from './analytics';

describe('stripUrlDetails', () => {
  it('reports only origin and path', () => {
    const event = stripUrlDetails({ type: 'pageview', url: 'https://found-cat.vercel.app/s/c?d=eyJjYXQiOiJ4In0#frag' });
    expect(event.url).toBe('https://found-cat.vercel.app/s/c');
  });
});
