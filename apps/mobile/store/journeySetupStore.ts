import { create } from 'zustand';

// Wizard state for the Journey Setup flow (Figma 08–12). Populated on entry from
// a trail/section, mutated step-by-step, then turned into a POST /journeys body
// at Review. Pace presets map to a target km/day; dates override when used.

export type Scope = 'entire' | 'section';
export type Direction = 'forward' | 'reverse';
export type Accommodation = 'camping' | 'refuge' | 'mixed';
export type Pace = 'relaxed' | 'moderate' | 'fast';
export type GuidePreset = 'silent' | 'guided' | 'full';

// Target walking distance per day for each preset, in metres.
export const PACE_TARGET_M: Record<Pace, number> = {
  relaxed: 16_000,
  moderate: 21_000,
  fast: 30_000,
};

interface JourneySetupState {
  // Target route (set on entry)
  routeId: number | null;
  trailId: number | null;
  trailRef: string;

  // Step 1 — scope / direction / range / name
  scope: Scope;
  direction: Direction;
  startSectionId: number | null;
  endSectionId: number | null;
  name: string;

  // Step 2 — accommodation
  accommodation: Accommodation;

  // Step 3 — pace (preset, or implied by dates when useDates)
  pace: Pace;
  useDates: boolean;
  startDate: string | null; // ISO
  endDate: string | null; // ISO

  // Step 4 — guide preset (collected; not yet persisted — no schema column)
  guide: GuidePreset;

  init: (args: {
    routeId: number;
    trailId: number;
    trailRef: string;
    scope?: Scope;
    startSectionId?: number | null;
  }) => void;
  patch: (p: Partial<JourneySetupState>) => void;
}

const DEFAULTS = {
  scope: 'entire' as Scope,
  direction: 'forward' as Direction,
  startSectionId: null,
  endSectionId: null,
  name: '',
  accommodation: 'mixed' as Accommodation,
  pace: 'moderate' as Pace,
  useDates: false,
  startDate: null,
  endDate: null,
  guide: 'guided' as GuidePreset,
};

export const useJourneySetupStore = create<JourneySetupState>((set) => ({
  routeId: null,
  trailId: null,
  trailRef: '',
  ...DEFAULTS,

  init: ({ routeId, trailId, trailRef, scope, startSectionId }) =>
    set({
      routeId,
      trailId,
      trailRef,
      ...DEFAULTS,
      scope: scope ?? DEFAULTS.scope,
      startSectionId: startSectionId ?? null,
    }),

  patch: (p) => set(p),
}));
