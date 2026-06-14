import { describe, expect, it } from 'bun:test';
import { groupStagesIntoDays } from './days';

// Stage lengths given in km for readability; converted to metres for the call.
const stages = (km: number[]) => km.map((d) => ({ distanceM: d * 1000 }));
const km = (days: { distanceM: number }[][]) =>
  days.map((d) => d.map((s) => s.distanceM / 1000));

describe('groupStagesIntoDays', () => {
  it('puts one stage per day when the target is one stage long', () => {
    const days = groupStagesIntoDays(stages([20, 20, 20]), 20_000);
    expect(km(days)).toEqual([[20], [20], [20]]);
  });

  it('packs several whole stages into a day at a fast pace', () => {
    const days = groupStagesIntoDays(stages([18, 18, 18, 18]), 40_000);
    // 40km target packs two 18km stages (36 ≤ 40) before the third overshoots.
    expect(km(days)).toEqual([
      [18, 18],
      [18, 18],
    ]);
  });

  it('never splits a stage longer than the target — it stands alone', () => {
    const days = groupStagesIntoDays(stages([50, 10, 10]), 20_000);
    expect(km(days)).toEqual([[50], [10, 10]]);
  });

  it('keeps the trailing partial day', () => {
    const days = groupStagesIntoDays(stages([18, 18, 18]), 40_000);
    expect(km(days)).toEqual([[18, 18], [18]]);
  });

  it('preserves walking order', () => {
    const days = groupStagesIntoDays(stages([10, 30, 10]), 20_000);
    // 10 then 30 would overshoot → close after 10; 30 alone; 10 alone.
    expect(km(days)).toEqual([[10], [30], [10]]);
  });

  it('returns no days for an empty trail', () => {
    expect(groupStagesIntoDays(stages([]), 20_000)).toEqual([]);
  });

  it('gives every stage its own day when the target is non-positive', () => {
    expect(km(groupStagesIntoDays(stages([10, 10]), 0))).toEqual([[10], [10]]);
  });
});
