import { describe, expect, it } from 'vitest';
import { parseGoogleMapsLink } from './googleMapsLink';

describe('parseGoogleMapsLink', () => {
  it('parses raw latitude and longitude text', () => {
    expect(parseGoogleMapsLink('25.033, 121.565')).toEqual({
      lat: 25.033,
      lng: 121.565,
    });
  });

  it('parses Google Maps URLs with @ coordinates', () => {
    expect(parseGoogleMapsLink('https://www.google.com/maps/place/Taipei+101/@25.033964,121.564468,17z')).toEqual({
      lat: 25.033964,
      lng: 121.564468,
      name: 'Taipei 101',
    });
  });

  it('parses Google Maps search URLs with query coordinates', () => {
    expect(parseGoogleMapsLink('https://www.google.com/maps/search/?api=1&query=13.7563,100.5018')).toEqual({
      lat: 13.7563,
      lng: 100.5018,
    });
  });

  it('uses a readable Google Maps query name when coordinates come from the path', () => {
    expect(parseGoogleMapsLink('https://www.google.com/maps/search/G%20Nimman%20Chiang%20Mai/@18.795163,98.967533,18z')).toEqual({
      lat: 18.795163,
      lng: 98.967533,
      name: 'G Nimman Chiang Mai',
    });
  });

  it('rejects non-coordinate URLs', () => {
    expect(parseGoogleMapsLink('https://example.com/maps/@25.033,121.565')).toBeNull();
  });

  it('returns null for unsupported Google Maps short links without expanded coordinates', () => {
    expect(parseGoogleMapsLink('https://maps.app.goo.gl/abc123')).toBeNull();
  });
});
