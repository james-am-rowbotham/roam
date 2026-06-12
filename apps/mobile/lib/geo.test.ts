import { describe, expect, it } from 'bun:test';
import { haversineM, locateOnLine } from './geo';

// A simple east–west line at the equator: each 0.01° lng step ≈ 1113 m.
const line = {
  type: 'LineString' as const,
  coordinates: [
    [0, 0],
    [0.01, 0],
    [0.02, 0],
  ],
};

describe('haversineM', () => {
  it('measures ~1113 m for 0.01° of longitude at the equator', () => {
    expect(haversineM([0, 0], [0.01, 0])).toBeCloseTo(1113, -1); // within ~10 m
  });
});

describe('locateOnLine', () => {
  it('locates a point at the midpoint as fraction 0.5, on the line', () => {
    const r = locateOnLine(line, [0.01, 0]);
    expect(r).not.toBeNull();
    expect(r?.fraction).toBeCloseTo(0.5, 5);
    expect(r?.offRouteM ?? 1).toBeLessThan(1);
  });

  it('clamps before the start to fraction 0 and reports off-route distance', () => {
    const r = locateOnLine(line, [-0.01, 0]);
    expect(r?.fraction).toBeCloseTo(0, 5);
    expect(r?.offRouteM ?? 0).toBeGreaterThan(1000);
  });

  it('measures perpendicular off-route distance', () => {
    // ~0.005° north of the quarter point → off the line but fraction ~0.25.
    const r = locateOnLine(line, [0.005, 0.005]);
    expect(r?.fraction).toBeCloseTo(0.25, 2);
    expect(r?.offRouteM ?? 0).toBeGreaterThan(400);
  });

  it('unwraps a Feature and returns null for a non-line', () => {
    const feature = { type: 'Feature', geometry: line, properties: {} };
    expect(locateOnLine(feature, [0.01, 0])?.fraction).toBeCloseTo(0.5, 5);
    expect(locateOnLine({ type: 'Point', coordinates: [0, 0] }, [0, 0])).toBeNull();
  });
});
