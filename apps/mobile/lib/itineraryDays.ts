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

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

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
  /** Journey start date (ISO) — dates the forecast for a journey not yet started. */
  startDateISO?: string | null;
  /** "Today" (ISO) — the day the current stage is being walked. Stages finished
   *  today share this day with the current stage; the forecast counts forward from
   *  here. Omit/null for a journey that hasn't started (then dates run from start). */
  todayISO?: string | null;
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

// The chainage at which a stage is finished, in walking direction: the high end
// walking forward, the low end walking in reverse. A stage is "done" the moment you
// cross this point.
function walkEndChainageM(stage: ItineraryStage, reverse: boolean): number {
  return reverse
    ? Math.min(stage.startChainageM, stage.endChainageM)
    : Math.max(stage.startChainageM, stage.endChainageM);
}

// The completed journey window you were in when you finished this stage (i.e. when
// you crossed its walking-end). NB: we match on the stage's END, not its midpoint —
// a stage straddling a window boundary has its midpoint in the EARLIER window, which
// dated it (and its whole day) to the day before. Matching on the end point dates the
// stage to the day you actually finished it, so same-day stages group together and
// nothing leaks back into the previous day.
function windowFor(
  stage: ItineraryStage,
  windows: CompletedWindow[],
  reverse: boolean,
): CompletedWindow | undefined {
  const end = walkEndChainageM(stage, reverse);
  return windows.find((w) => {
    const lo = Math.min(w.startChainageM, w.endChainageM);
    const hi = Math.max(w.startChainageM, w.endChainageM);
    return end >= lo && end <= hi;
  });
}

// Ascent per km → a coarse grade. Placeholder until stages carry a curated grade.
export function gradeLabel(distanceM: number, ascentM: number): string {
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
    todayISO,
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
    else
      regionRange.set(st.region, {
        min: Math.min(r.min, st.number),
        max: Math.max(r.max, st.number),
      });
  }

  // --- Group stages into days ------------------------------------------------
  // A "day" is a real walking day. Completed stages group by the calendar day they
  // were finished (same day → one multi-stage day). The CURRENT stage shares "today"
  // with anything else finished today, so finishing a stage never spawns a fresh day
  // — today's day just grows. Upcoming stages are a pace-grouped forecast dated
  // FORWARD from today (never from the original start date, which would collide with
  // the real dates once you're days into the trail).
  const dayKey = (d: Date): string => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const completedDateOf = (st: ItineraryStage): Date | null => {
    const at = windowFor(st, completedStages, reverse)?.completedAt;
    return at ? new Date(at) : null;
  };

  type DayGroup = { stages: ItineraryStage[]; date: Date | null };
  const groups: DayGroup[] = [];

  const today = todayISO ? new Date(todayISO) : null;
  const todayKey = today ? dayKey(today) : null;
  const underway = today != null; // the journey is being walked → there's a "today"

  // Partition completed stages: those finished today fold into the TODAY day (so
  // finishing a stage grows today instead of spawning a new day); the rest are past
  // days. Undated completed stages count as past.
  const isToday = (st: ItineraryStage): boolean => {
    const d = completedDateOf(st);
    return d != null && todayKey != null && dayKey(d) === todayKey;
  };
  const doneStageList = stages.filter((s) => s.status === 'done');
  const pastDone = doneStageList.filter((s) => !isToday(s));
  const todayDone = doneStageList.filter(isToday);
  const currentStg = stages.find((s) => s.status === 'current') ?? null;
  const upcoming = stages.filter((s) => s.status === 'upcoming');

  // 1) Past completed days — one per real calendar day (consecutive same-date runs).
  //    With no completion dates at all (legacy/edge), fall back to pace grouping so
  //    history still reads as days.
  if (pastDone.length > 0 && !pastDone.some((s) => completedDateOf(s) != null)) {
    for (const g of groupStagesIntoDays(pastDone, donePaceTargetM ?? paceTargetM)) {
      groups.push({ stages: g, date: null });
    }
  } else {
    let runKey: string | null = null;
    for (const st of pastDone) {
      const date = completedDateOf(st);
      const key = date ? dayKey(date) : '∅';
      const last = groups[groups.length - 1];
      if (!last || key !== runKey) {
        groups.push({ stages: [st], date });
        runKey = key;
      } else {
        last.stages.push(st);
      }
    }
  }

  // 2) Today + forecast — pace-group the remaining (current + upcoming). The first
  //    group is "today": stages already finished today fold into it, so today keeps
  //    growing as you tick stages off. Later groups are the forecast, dated forward
  //    from today (or from the start date for a journey not yet under way).
  const fromNow = [...(currentStg ? [currentStg] : []), ...upcoming];
  const forecast = groupStagesIntoDays(fromNow, paceTargetM);
  const anchorISO = underway ? todayISO : (startDateISO ?? todayISO ?? null);
  if (forecast.length === 0 && todayDone.length > 0) {
    // Journey finished today — show the final day's stages.
    groups.push({ stages: todayDone, date: today });
  }
  forecast.forEach((g, idx) => {
    const isTodayDay = underway && idx === 0;
    groups.push({
      stages: isTodayDay ? [...todayDone, ...g] : g,
      date: anchorISO ? addDaysISO(anchorISO, idx) : null,
    });
  });

  let runningRegion: string | null = null;
  let bandCount = 0;
  const days: ItineraryDay[] = groups.map((group, i) => {
    const stagesIn = group.stages;
    const status: StageStatus = stagesIn.every((x) => x.status === 'done')
      ? 'done'
      : stagesIn.some((x) => x.status === 'current')
        ? 'current'
        : 'upcoming';

    // Walking time taken = sum of the elapsed of any completed stages in this day.
    let doneElapsed: number | null = null;
    for (const st of stagesIn) {
      if (st.status !== 'done') continue;
      const w = windowFor(st, completedStages, reverse);
      if (w?.elapsedSeconds != null) doneElapsed = (doneElapsed ?? 0) + w.elapsedSeconds;
    }
    const completedCount = stagesIn.filter((x) => x.status === 'done').length;

    const dateLabel = status === 'current' ? 'TODAY' : group.date ? datePhrase(group.date) : null;

    // Right label: a day with finished stages shows "[N STAGES · ]TIME"; a purely
    // upcoming multi-stage day shows "N STAGES · KM · ASCENT".
    let rightLabel: string | null = null;
    if (completedCount > 0) {
      const parts: string[] = [];
      if (stagesIn.length > 1) parts.push(`${stagesIn.length} STAGES`);
      if (doneElapsed != null) parts.push(formatElapsed(doneElapsed));
      rightLabel = parts.length ? parts.join(' · ') : null;
    } else if (stagesIn.length > 1) {
      const km = Math.round(stagesIn.reduce((a, x) => a + x.distanceM, 0) / 1000);
      const ascent = Math.round(stagesIn.reduce((a, x) => a + x.ascentM, 0));
      rightLabel = `${stagesIn.length} STAGES · ${km} KM · ${ascent}M ↑`;
    }

    // Open a region band on the first day whose lead stage enters a new region.
    let regionBand: RegionBand | undefined;
    const region = stagesIn[0]?.region ?? null;
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
      stages: stagesIn,
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
