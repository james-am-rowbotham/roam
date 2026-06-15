import { describe, expect, test } from 'bun:test';
import { GR11, type TrailConfig } from './config';
import { resolveRouteWaymark } from './normalise';
import type { OverpassWay } from './overpass';

const way = (tags?: Record<string, string>): OverpassWay => ({
  type: 'way',
  id: 1,
  geometry: [
    { lat: 0, lon: 0 },
    { lat: 0, lon: 1 },
  ],
  tags,
});

describe('resolveRouteWaymark', () => {
  test('prefers the relation tags over everything', () => {
    const result = resolveRouteWaymark(
      { 'osmc:symbol': 'blue:white:blue_bar', network: 'iwn' },
      [way({ 'osmc:symbol': 'red:white:red_lower:11:black', network: 'nwn' })],
      GR11,
    );
    expect(result).toEqual({ osmcSymbol: 'blue:white:blue_bar', network: 'iwn' });
  });

  test('falls back to the dominant member-way tag when no relation tags', () => {
    const result = resolveRouteWaymark(
      null,
      [
        way({ 'osmc:symbol': 'red:white:red_lower:11:black', network: 'nwn' }),
        way({ 'osmc:symbol': 'red:white:red_lower:11:black', network: 'nwn' }),
        way({ 'osmc:symbol': 'green:white:green_dot' }), // minority — ignored
      ],
      GR11,
    );
    expect(result).toEqual({ osmcSymbol: 'red:white:red_lower:11:black', network: 'nwn' });
  });

  test('falls back to the config when OSM carries nothing', () => {
    const result = resolveRouteWaymark(null, [way()], GR11);
    expect(result).toEqual({
      osmcSymbol: GR11.waymark.osmcSymbol,
      network: GR11.waymark.network,
    });
  });

  test('a config with no recorded waymark resolves to nulls (curator decides, §17.8)', () => {
    const bare: TrailConfig = { ...GR11, waymark: { osmcSymbol: null, network: null } };
    expect(resolveRouteWaymark(null, [way()], bare)).toEqual({ osmcSymbol: null, network: null });
  });
});
