import { describe, expect, it } from 'bun:test';
import { downsampleElevation, progressFraction } from './elevation';

describe('downsampleElevation', () => {
  it('returns the input when already short enough', () => {
    expect(downsampleElevation([1, 2, 3], 10)).toEqual([1, 2, 3]);
  });

  it('reduces to n points by averaging buckets', () => {
    const out = downsampleElevation([0, 0, 10, 10, 20, 20], 3);
    expect(out).toEqual([0, 10, 20]);
  });

  it('preserves the overall shape (rising series stays rising)', () => {
    const rising = Array.from({ length: 100 }, (_, i) => i);
    const out = downsampleElevation(rising, 10);
    expect(out).toHaveLength(10);
    expect(out[0]).toBeLessThan(out[9] as number);
  });
});

describe('progressFraction', () => {
  it('clamps to 0..1', () => {
    expect(progressFraction(50, 100)).toBe(0.5);
    expect(progressFraction(-5, 100)).toBe(0);
    expect(progressFraction(150, 100)).toBe(1);
    expect(progressFraction(10, 0)).toBe(0);
  });
});
