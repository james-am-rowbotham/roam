// Journey Engine — pure, deterministic stage generation.
//
// Runs unchanged on the server (initial plan) and on device (offline replanning):
// no I/O, no Date.now(), no randomness. Given the same input it always returns the
// same plan. See PROJECT GUIDE §11.
//
// Model (principle 4 — progressive complexity): the route is linearly referenced
// (§7), so a journey is just the selected chainage span cut into equal day-length
// windows sized to the pace target. A long section therefore splits across several
// days and short sections combine within a day — no routing graph, only 1-D maths.
// Each day reports the sections it overlaps (for labels) and a pro-rated ascent.

import type { Accommodation, Section } from './types';

export type Direction = 'forward' | 'reverse';
export type AccommodationPreference = 'refuge' | 'camping' | 'mixed';

export interface JourneyPace {
  /** Target walking distance per day, in metres. Consecutive short sections are
   *  combined into a day up to (but not past) this target. */
  targetDistancePerDayM: number;
}

export interface JourneyDates {
  startDate: Date;
  endDate: Date;
}

export interface PlanJourneyInput {
  /** All sections of the route. Walking order is derived from `orderIndex`, not
   *  from the array order. */
  sections: Section[];
  direction?: Direction;
  /** Restrict the journey to a contiguous span of sections (inclusive, by id).
   *  Omitted bounds default to the route's first/last section. */
  startSectionId?: number;
  endSectionId?: number;
  /** Daily target comes from `pace` or, if absent, from `dates` (budgeted days →
   *  km/day). If neither is given, every section becomes its own day. */
  pace?: JourneyPace;
  dates?: JourneyDates;
  accommodation?: AccommodationPreference;
  /** Optional POIs used to suggest an overnight stop at each day's end. */
  accommodations?: Accommodation[];
}

export interface PlannedStage {
  /** 1-based day number within the journey. */
  orderIndex: number;
  /** Route chainage at the day's start and end. For a reverse journey the day is
   *  walked from high chainage to low, so `startChainageM > endChainageM`. */
  startChainageM: number;
  endChainageM: number;
  /** Always >= 0, regardless of direction. */
  distanceM: number;
  ascentM: number;
  descentM: number;
  /** Sections combined into this day, in walking order. */
  sectionIds: number[];
  /** Nearest preference-matching accommodation to the day's end, or null. */
  suggestedAccommodationId: number | null;
}

export interface JourneyPlan {
  stages: PlannedStage[];
  totalDistanceM: number;
  totalAscentM: number;
  totalDescentM: number;
  /** Walking days. Rest days are added later as journey overrides, not here. */
  totalDays: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Don't suggest an overnight stop further than this from the day's end. */
const OVERNIGHT_WINDOW_M = 5_000;

const EMPTY_PLAN: JourneyPlan = {
  stages: [],
  totalDistanceM: 0,
  totalAscentM: 0,
  totalDescentM: 0,
  totalDays: 0,
};

/** Generate a day-by-day stage plan for a journey over a route. */
export function planJourney(input: PlanJourneyInput): JourneyPlan {
  const direction = input.direction ?? 'forward';

  // Sections in ascending chainage, then the selected span and its 1-D bounds.
  const ordered = [...input.sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const span = sliceSpan(ordered, input.startSectionId, input.endSectionId);
  if (span.length === 0) return EMPTY_PLAN;

  const lo = Math.min(...span.map((s) => Math.min(s.startChainageM, s.endChainageM)));
  const hi = Math.max(...span.map((s) => Math.max(s.startChainageM, s.endChainageM)));
  const spanLength = hi - lo;
  if (spanLength <= 0) return EMPTY_PLAN;

  // Days are equal-length chainage chunks sized to the pace target. This both
  // splits a long section across days and combines short ones within a day, so
  // pace meaningfully changes the number of days at any section granularity.
  const target = resolveTargetM(spanLength, span.length, input.pace, input.dates);
  const numDays = target > 0 ? Math.max(1, Math.round(spanLength / target)) : span.length;
  const dayLength = spanLength / numDays;

  const reverse = direction === 'reverse';
  const accommodation = input.accommodation ?? 'mixed';
  const accommodations = input.accommodations ?? [];

  // Ascending chainage windows; a reverse journey walks them high → low, so
  // day 1 is the far (high-chainage) end of the span.
  const windows = Array.from({ length: numDays }, (_, i) => ({
    lo: lo + i * dayLength,
    hi: i === numDays - 1 ? hi : lo + (i + 1) * dayLength,
  }));
  const walkOrder = reverse ? [...windows].reverse() : windows;

  const stages: PlannedStage[] = walkOrder.map((w, i) => {
    const { ascent, descent } = attributeElevation(span, w.lo, w.hi);
    const endChainageM = reverse ? w.lo : w.hi;
    return {
      orderIndex: i + 1,
      startChainageM: reverse ? w.hi : w.lo,
      endChainageM,
      distanceM: w.hi - w.lo,
      // Walking backwards turns climbs into descents and vice versa.
      ascentM: reverse ? descent : ascent,
      descentM: reverse ? ascent : descent,
      sectionIds: sectionsInWindow(span, w.lo, w.hi, reverse),
      suggestedAccommodationId: suggestOvernight(
        endChainageM,
        direction,
        accommodation,
        accommodations,
      ),
    };
  });

  return {
    stages,
    totalDistanceM: sum(stages.map((s) => s.distanceM)),
    totalAscentM: sum(stages.map((s) => s.ascentM)),
    totalDescentM: sum(stages.map((s) => s.descentM)),
    totalDays: stages.length,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0);
}

/** Inclusive slice between two section ids. A missing bound extends to that end;
 *  bounds given out of order are treated as a range (min..max). */
function sliceSpan(
  ordered: Section[],
  startSectionId: number | undefined,
  endSectionId: number | undefined,
): Section[] {
  const startIdx = startSectionId == null ? 0 : ordered.findIndex((s) => s.id === startSectionId);
  const endIdx =
    endSectionId == null ? ordered.length - 1 : ordered.findIndex((s) => s.id === endSectionId);
  if (startIdx === -1 || endIdx === -1) return [];
  return ordered.slice(Math.min(startIdx, endIdx), Math.max(startIdx, endIdx) + 1);
}

/** Daily distance target in metres. `pace` wins; else derive from `dates`
 *  (span length / budgeted days); else split into one day per section. */
function resolveTargetM(
  spanLength: number,
  sectionCount: number,
  pace: JourneyPace | undefined,
  dates: JourneyDates | undefined,
): number {
  if (pace) return Math.max(0, pace.targetDistancePerDayM);
  if (dates) return spanLength / budgetedDays(dates);
  return sectionCount > 0 ? spanLength / sectionCount : spanLength;
}

/** Inclusive calendar-day span between two dates, at least 1. */
function budgetedDays(dates: JourneyDates): number {
  const diff = dates.endDate.getTime() - dates.startDate.getTime();
  return Math.max(1, Math.round(diff / DAY_MS) + 1);
}

/** A section's chainage interval, ascending, with its length. */
function sectionInterval(s: Section): { slo: number; shi: number; len: number } {
  const slo = Math.min(s.startChainageM, s.endChainageM);
  const shi = Math.max(s.startChainageM, s.endChainageM);
  return { slo, shi, len: shi - slo };
}

/** Sum a window's ascent/descent from the sections it overlaps, pro-rated by the
 *  fraction of each section inside the window. */
function attributeElevation(
  span: Section[],
  lo: number,
  hi: number,
): { ascent: number; descent: number } {
  let ascent = 0;
  let descent = 0;
  for (const s of span) {
    const { slo, shi, len } = sectionInterval(s);
    if (len <= 0) continue;
    const overlap = Math.min(hi, shi) - Math.max(lo, slo);
    if (overlap <= 0) continue;
    const frac = overlap / len;
    ascent += (s.ascentM ?? 0) * frac;
    descent += (s.descentM ?? 0) * frac;
  }
  return { ascent, descent };
}

/**
 * Ids of the sections a day represents, in walking order. A section belongs to the
 * one day its midpoint falls in (so boundaries aren't double-counted across days);
 * a pure sub-section day falls back to the section it sits inside.
 */
function sectionsInWindow(span: Section[], lo: number, hi: number, reverse: boolean): number[] {
  let owned = span.filter((s) => {
    const { slo, shi } = sectionInterval(s);
    const mid = (slo + shi) / 2;
    return mid >= lo && mid < hi;
  });
  if (owned.length === 0) {
    const dayMid = (lo + hi) / 2;
    const containing = span.find((s) => {
      const { slo, shi } = sectionInterval(s);
      return dayMid >= slo && dayMid <= shi;
    });
    owned = containing ? [containing] : [];
  }
  const ids = owned.map((s) => s.id);
  return reverse ? ids.reverse() : ids;
}

function matchesPreference(type: Accommodation['type'], pref: AccommodationPreference): boolean {
  if (pref === 'mixed') return true;
  if (pref === 'refuge') return type === 'refuge' || type === 'hut';
  return type === 'campsite'; // camping
}

/** Nearest preference-matching accommodation to the day's end, within the window. */
function suggestOvernight(
  endChainageM: number,
  _direction: Direction,
  pref: AccommodationPreference,
  accommodations: Accommodation[],
): number | null {
  let best: Accommodation | null = null;
  let bestGap = Number.POSITIVE_INFINITY;

  for (const a of accommodations) {
    if (!matchesPreference(a.type, pref)) continue;
    const gap = Math.abs(a.chainageM - endChainageM);
    if (gap <= OVERNIGHT_WINDOW_M && gap < bestGap) {
      best = a;
      bestGap = gap;
    }
  }
  return best ? best.id : null;
}
