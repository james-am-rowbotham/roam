// Journey Engine — pure, deterministic stage generation.
//
// Runs unchanged on the server (initial plan) and on device (offline replanning):
// no I/O, no Date.now(), no randomness. Given the same input it always returns the
// same plan. See PROJECT GUIDE §11.
//
// The model is intentionally simple (principle 4 — progressive complexity): a day
// ("stage") is made of one or more *whole* sections. Sections are the curated
// day-segmentation of a route, so we never split one across days in V1 — we only
// *combine* short ones when the pace is fast. No routing graph, no chainage maths
// beyond addition.

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

  // Walking order, forward, along the route.
  const ordered = [...input.sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const span = sliceSpan(ordered, input.startSectionId, input.endSectionId);
  // Reverse journeys walk the same sections in the opposite order.
  const walk = direction === 'reverse' ? [...span].reverse() : span;

  if (walk.length === 0) return EMPTY_PLAN;

  const target = resolveTargetM(walk, input.pace, input.dates);
  const accommodation = input.accommodation ?? 'mixed';
  const accommodations = input.accommodations ?? [];

  const stages = packDays(walk, target).map((day, i) => {
    const stage = buildStage(day, direction, i + 1);
    return {
      ...stage,
      suggestedAccommodationId: suggestOvernight(
        stage.endChainageM,
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

/** A section's length along the route, always >= 0. */
function sectionDistanceM(s: Section): number {
  return Math.abs(s.endChainageM - s.startChainageM);
}

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
 *  (total distance / budgeted days); else 0, meaning one section per day. */
function resolveTargetM(
  walk: Section[],
  pace: JourneyPace | undefined,
  dates: JourneyDates | undefined,
): number {
  if (pace) return Math.max(0, pace.targetDistancePerDayM);
  if (dates) {
    const total = sum(walk.map(sectionDistanceM));
    return total / budgetedDays(dates);
  }
  return 0;
}

/** Inclusive calendar-day span between two dates, at least 1. */
function budgetedDays(dates: JourneyDates): number {
  const diff = dates.endDate.getTime() - dates.startDate.getTime();
  return Math.max(1, Math.round(diff / DAY_MS) + 1);
}

/** Pack whole sections into days: add sections to a day until the next one would
 *  push it past the target. A single section longer than the target stands alone. */
function packDays(walk: Section[], target: number): Section[][] {
  const days: Section[][] = [];
  let current: Section[] = [];
  let currentDistance = 0;

  for (const s of walk) {
    const d = sectionDistanceM(s);
    if (current.length > 0 && currentDistance + d > target) {
      days.push(current);
      current = [];
      currentDistance = 0;
    }
    current.push(s);
    currentDistance += d;
  }
  if (current.length > 0) days.push(current);
  return days;
}

/** Turn a group of walked sections into a stage. For a reverse journey the day is
 *  entered at each section's high-chainage end, and ascent/descent swap. */
function buildStage(
  day: Section[],
  direction: Direction,
  orderIndex: number,
): Omit<PlannedStage, 'suggestedAccommodationId'> {
  const first = day[0] as Section;
  const last = day[day.length - 1] as Section;
  const reverse = direction === 'reverse';

  const startChainageM = reverse ? first.endChainageM : first.startChainageM;
  const endChainageM = reverse ? last.startChainageM : last.endChainageM;

  const ascent = sum(day.map((s) => s.ascentM ?? 0));
  const descent = sum(day.map((s) => s.descentM ?? 0));

  return {
    orderIndex,
    startChainageM,
    endChainageM,
    distanceM: sum(day.map(sectionDistanceM)),
    // Walking the route backwards turns its climbs into descents and vice versa.
    ascentM: reverse ? descent : ascent,
    descentM: reverse ? ascent : descent,
    sectionIds: day.map((s) => s.id),
  };
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
