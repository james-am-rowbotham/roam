// Builds the itinerary's day-grouped model from the trail's curated stages (etapas).
//
// Progress is counted in STAGES; DAYS are a per-journey grouping by pace (§5/§11).
// This is the read-model behind the itinerary (mock 846:1752): the trail's stages,
// grouped into days via the pure engine `groupStagesIntoDays`, with per-stage status
// derived from the walked-distance frontier and per-day labels (date / combined totals).
//
// Phase-1 limitations (Phase 2, needs new data): section *region* bands and per-day
// "time taken" need region data + `elapsed_seconds`; day dates are derived from the
// journey start date until resume-anchoring lands.

import { groupStagesIntoDays } from '@roam/core';
import { orientRoute } from './format';
import { regionAt, regionsForTrail } from './trailRegions';

const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

/** A curated trail stage (etapa) as the itinerary needs it. */
export interface StageInput {
  id: number;
  name: string;
  orderIndex: number;
  startChainageM: number;
  endChainageM: number;
  ascentM?: number | null;
  /** Curated region name (joined from the regions table); falls back to the client
   *  map when null. */
  regionName?: string | null;
}

export type StageStatus = 'done' | 'current' | 'upcoming';

/** A completed journey day-window — carries the real completion date + walking time. */
export interface CompletedWindow {
  startChainageM: number;
  endChainageM: number;
  completedAt?: string | null;
  elapsedSeconds?: number | null;
}

export interface ItineraryStage {
  id: number;
  /** Official 1-based stage number (the etapa number). */
  number: number;
  /** Oriented "Place → Place" name. */
  name: string;
  /** Raw chainage bounds (for matching completed windows). */
  startChainageM: number;
  endChainageM: number;
  distanceM: number;
  ascentM: number;
  /** Easy | Moderate | Hard — heuristic until a curated grade exists. */
  grade: string;
  /** The trail region this stage falls in, or null when the trail has no regions. */
  region: string | null;
  status: StageStatus;
}

/** A region band shown above the day it opens (mock 846:1752). */
export interface RegionBand {
  name: string;
  /** "STAGES 1–7". */
  rangeLabel: string;
  /** First band in the list (no top rule); later bands mark a crossing. */
  first: boolean;
}

export interface ItineraryDay {
  /** 1-based day number within the journey. */
  number: number;
  stages: ItineraryStage[];
  status: StageStatus;
  /** "12 JUN" · "TODAY" · null. */
  dateLabel: string | null;
  /** Combined right-hand label (multi-stage days), else null. */
  rightLabel: string | null;
  /** Walking time for a completed day (sum of its windows' elapsed), else null. */
  elapsedSeconds: number | null;
  /** Set on the first day of each region — renders a band above the day header. */
  regionBand?: RegionBand;
}

export interface ItineraryModel {
  days: ItineraryDay[];
  totalStages: number;
  doneStages: number;
  /** 1-based number of the current (or next) stage. */
  currentStageNumber: number;
}

interface BuildOptions {
  reverse: boolean;
  /** Distance walked so far (the completion frontier). */
  doneDistanceM: number;
  /** Target metres of walking per day — seeds the day grouping of remaining stages. */
  paceTargetM: number;
  /** Target for already-walked stages — keeps completed days fixed when pace changes
   *  mid-journey (history is real). Defaults to `paceTargetM`. */
  donePaceTargetM?: number;
  /** Journey start date (ISO) for derived day dates, or null. */
  startDateISO?: string | null;
  /** Trail ref (e.g. "GR11") — drives the curated region bands. */
  trailRef?: string | null;
  /** The journey's completed day-windows — real completion date + walking time taken,
   *  shown on completed day headers (mock 846:1752). Matched to days by chainage. */
  completedStages?: CompletedWindow[];
}

// Seconds → "7H 10M" (the day's walking time, mock 846:1752).
export function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}H ${m}M`;
}

// The completed window whose chainage span contains a stage's midpoint.
function windowFor(stage: ItineraryStage, windows: CompletedWindow[]): CompletedWindow | undefined {
  const mid = (stage.startChainageM + stage.endChainageM) / 2;
  return windows.find((w) => {
    const lo = Math.min(w.startChainageM, w.endChainageM);
    const hi = Math.max(w.startChainageM, w.endChainageM);
    return mid >= lo && mid <= hi;
  });
}

// Completed stages are grouped by the calendar day they were actually walked — stages
// finished on the same day form one multi-stage day (history is real, not a pace guess).
// Falls back to pace grouping when completion dates aren't recorded yet.
function groupCompletedByDate(
  done: ItineraryStage[],
  windows: CompletedWindow[],
  fallbackTargetM: number,
): ItineraryStage[][] {
  const dateKey = (stage: ItineraryStage): string | null => {
    const at = windowFor(stage, windows)?.completedAt;
    if (!at) return null;
    const d = new Date(at);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  if (done.every((s) => dateKey(s) == null)) return groupStagesIntoDays(done, fallbackTargetM);

  const out: ItineraryStage[][] = [];
  let current: ItineraryStage[] | null = null;
  let key: string | null = null;
  for (const stage of done) {
    const k = dateKey(stage) ?? '∅';
    if (!current || k !== key) {
      current = [];
      out.push(current);
      key = k;
    }
    current.push(stage);
  }
  return out;
}

// Ascent per km → a coarse grade. Placeholder until stages carry a curated grade.
function gradeLabel(distanceM: number, ascentM: number): string {
  const km = distanceM / 1000;
  if (km <= 0) return 'Easy';
  const perKm = ascentM / km;
  if (perKm < 30) return 'Easy';
  if (perKm < 55) return 'Moderate';
  return 'Hard';
}

function addDaysISO(iso: string, days: number): Date {
  const t = new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
  return new Date(t + days * 24 * 60 * 60 * 1000);
}

function datePhrase(d: Date): string {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function buildItineraryDays(
  sections: StageInput[],
  {
    reverse,
    doneDistanceM,
    paceTargetM,
    donePaceTargetM,
    startDateISO,
    trailRef,
    completedStages = [],
  }: BuildOptions,
): ItineraryModel {
  // Official forward order → 1-based numbers; walk reversed for a reverse journey.
  const forward = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);
  const numbered = forward.map((s, i) => ({ s, number: i + 1 }));
  const walking = reverse ? [...numbered].reverse() : numbered;

  const regions = regionsForTrail(trailRef);
  const totalM =
    walking.reduce((a, { s }) => a + Math.abs(s.endChainageM - s.startChainageM), 0) || 1;

  // Per-stage status from the walked-distance frontier (cumulative, in walking order);
  // region from the stage's midpoint fraction along the trail.
  let cumulativeM = 0;
  let doneStages = 0;
  const stages: ItineraryStage[] = walking.map(({ s, number }) => {
    const distanceM = Math.abs(s.endChainageM - s.startChainageM);
    const ascentM = s.ascentM ?? 0;
    const midFraction = (cumulativeM + distanceM / 2) / totalM;
    cumulativeM += distanceM;
    const done = cumulativeM <= doneDistanceM + 1;
    if (done) doneStages += 1;
    return {
      id: s.id,
      number,
      name: orientRoute(s.name, reverse),
      startChainageM: s.startChainageM,
      endChainageM: s.endChainageM,
      distanceM,
      ascentM,
      grade: gradeLabel(distanceM, ascentM),
      // Prefer the curated region from the trail package; fall back to the client map.
      region: s.regionName ?? (regions ? regionAt(midFraction, regions) : null),
      status: done ? 'done' : 'upcoming',
    };
  });
  const currentStage = stages.find((st) => st.status === 'upcoming');
  if (currentStage) currentStage.status = 'current';

  // Stage-number range per region, for the band label ("STAGES 1–7").
  const regionRange = new Map<string, { min: number; max: number }>();
  for (const st of stages) {
    if (!st.region) continue;
    const r = regionRange.get(st.region);
    if (!r) regionRange.set(st.region, { min: st.number, max: st.number });
    else regionRange.set(st.region, { min: Math.min(r.min, st.number), max: Math.max(r.max, st.number) });
  }

  // Completed stages group by the day they were actually walked (same day → one
  // multi-stage day); remaining stages group by pace (the forecast). The current day is
  // the boundary, so changing pace only regroups the future — history is fixed.
  const doneGroup = stages.filter((s) => s.status === 'done');
  const restGroup = stages.filter((s) => s.status !== 'done');
  const groups = [
    ...groupCompletedByDate(doneGroup, completedStages, donePaceTargetM ?? paceTargetM),
    ...groupStagesIntoDays(restGroup, paceTargetM),
  ];
  let runningRegion: string | null = null;
  let bandCount = 0;
  const days: ItineraryDay[] = groups.map((group, i) => {
    const status: StageStatus = group.every((x) => x.status === 'done')
      ? 'done'
      : group.some((x) => x.status === 'current')
        ? 'current'
        : 'upcoming';

    // For a completed day, pull the real date + walking time from the journey's
    // completed windows whose midpoint falls within this day's chainage span.
    let doneDate: string | null = null;
    let doneElapsed: number | null = null;
    if (status === 'done') {
      const lo = Math.min(...group.map((x) => Math.min(x.startChainageM, x.endChainageM)));
      const hi = Math.max(...group.map((x) => Math.max(x.startChainageM, x.endChainageM)));
      for (const w of completedStages) {
        const mid = (w.startChainageM + w.endChainageM) / 2;
        if (mid < lo || mid > hi) continue;
        if (w.completedAt && (!doneDate || w.completedAt > doneDate)) doneDate = w.completedAt;
        if (w.elapsedSeconds != null) doneElapsed = (doneElapsed ?? 0) + w.elapsedSeconds;
      }
    }

    const dateLabel =
      status === 'current'
        ? 'TODAY'
        : doneDate
          ? datePhrase(new Date(doneDate))
          : startDateISO
            ? datePhrase(addDaysISO(startDateISO, i))
            : null;

    // Right label: completed days show "[N STAGES · ]TIME"; upcoming multi-stage days
    // show "N STAGES · KM · ASCENT".
    let rightLabel: string | null = null;
    if (status === 'done') {
      const parts: string[] = [];
      if (group.length > 1) parts.push(`${group.length} STAGES`);
      if (doneElapsed != null) parts.push(formatElapsed(doneElapsed));
      rightLabel = parts.length ? parts.join(' · ') : null;
    } else if (group.length > 1) {
      const km = Math.round(group.reduce((a, x) => a + x.distanceM, 0) / 1000);
      const ascent = Math.round(group.reduce((a, x) => a + x.ascentM, 0));
      rightLabel = `${group.length} STAGES · ${km} KM · ${ascent}M ↑`;
    }

    // Open a region band on the first day whose lead stage enters a new region.
    let regionBand: RegionBand | undefined;
    const region = group[0]?.region ?? null;
    if (region && region !== runningRegion) {
      runningRegion = region;
      bandCount += 1;
      const range = regionRange.get(region);
      regionBand = {
        name: region,
        rangeLabel: range ? `STAGES ${range.min}–${range.max}` : '',
        first: bandCount === 1,
      };
    }

    return {
      number: i + 1,
      stages: group,
      status,
      dateLabel,
      rightLabel,
      elapsedSeconds: doneElapsed,
      regionBand,
    };
  });

  return {
    days,
    totalStages: stages.length,
    doneStages,
    currentStageNumber: Math.min(doneStages + 1, stages.length || 1),
  };
}
