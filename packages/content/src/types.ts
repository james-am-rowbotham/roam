// Roam domain model — the single contract the importer, repository, and screens
// all build against (Implementation Pass §4). This is the model; screens are thin
// renderers over it. If a screen needs a shape this doesn't have, fix the model.
//
// Load-bearing invariants (§3) encoded here:
//  1. Region ≠ Section. A Section *references* Regions via `regionIds` and is never
//     contained by one (the array exists because a section can straddle two regions).
//  2. Objective splits trail | peak. Section/Stage decompose a trail; Route/Leg
//     decompose a peak. `type` selects the decomposition — never give a peak a Section.
//  3. Region = SEO-recognisable area under a Country; pages aggregate every objective
//     that *touches* the region (works because objectives reference regions).
//  4. Location & POI are shared entities, referenced by id, owned by no objective.

// ── Value types ─────────────────────────────────────────────────────────────

export interface Coords {
  lat: number;
  lng: number;
}

/** A generic at-a-glance stat. The generic array is what lets one stat-pill
 *  component render every screen — headline stats differ by objective type, but
 *  that difference lives in the data, not the type. Build with the §4 helpers. */
export interface Stat {
  key: string;
  value: number | string;
  /** Upper bound for a ranged stat (e.g. a min–max). */
  valueMax?: number;
  unit?: string;
  label: string;
}

/** Grade is `{ system, value }`, never an enum (§3). The badge resolves its scale
 *  from the registry by `system` — a trail stage is `{ 'hiking-band', 'hard' }`, a
 *  peak route `{ 'french-alpine', 'PD' }`. Adding a system touches zero core types. */
export interface Grade {
  system: string;
  value: string;
}

// ── Guide content ───────────────────────────────────────────────────────────

export type GuideFacet = 'overview' | 'planning' | 'environment' | 'conditions';

/** A facet topic on an objective/section Guide. `key` is recommended-but-open
 *  vocab per domain — never enforced as an enum. A topic is prose (heading + body)
 *  and/or composed `blocks` — the Guide Overview is a composed page (Figma 1050:2369),
 *  so a topic can carry an elevation chart, highlights, etc. via the one renderer. */
export interface GuideTopic {
  key: string;
  facet: GuideFacet;
  heading: string;
  body?: string;
  mediaId?: string;
  blocks?: ContentBlock[];
}

// ── Discovery / geography (shared, browseable) ──────────────────────────────

export interface Continent {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  heroMediaId: string;
  summary: string;
}

export interface Country {
  id: string;
  slug: string;
  name: string;
  continentId: string;
  tagline: string;
  heroMediaId: string;
  summary: string;
}

export interface Region {
  id: string;
  slug: string;
  name: string;
  countryId: string;
  tagline: string;
  heroMediaId: string;
  summary: string;
}

// ── The product ─────────────────────────────────────────────────────────────

export type ObjectiveType = 'trail' | 'peak';

export interface Objective {
  id: string;
  slug: string;
  name: string;
  type: ObjectiveType;
  /** Touches one or more regions (invariant 1 + 3) — reference, never containment. */
  regionIds: string[];
  tagline: string;
  heroMediaId: string;
  /** The persistent line under the tab rows (load-bearing layout, §6.3). */
  summary: string;
  atAGlance: Stat[];
  /** Guide facets: Overview / Planning / Environment|Conditions. */
  guide: GuideTopic[];
  highlightIds: string[];
  /** Present iff type === 'trail' (invariant 2). */
  sectionIds?: string[];
  /** Present iff type === 'peak' (invariant 2). */
  routeIds?: string[];
}

// ── Trail decomposition ─────────────────────────────────────────────────────

export interface Section {
  id: string;
  objectiveId: string;
  order: number;
  name: string;
  tagline: string;
  heroMediaId: string;
  /** Invariant 1 — reference, never containment. A section can straddle regions. */
  regionIds: string[];
  summary: string;
  atAGlance: Stat[];
  /** Section-scoped overview (terrain/flora/culture/weather). */
  guide?: GuideTopic[];
  /** Towns — feeds the Resupply & refuges digest. */
  resupply: PlaceRef[];
  /** Staffed huts. */
  refuges: PlaceRef[];
  highlightIds: string[];
  stageIds: string[];
}

export interface Stage {
  id: string;
  sectionId: string;
  number: number;
  name: string;
  fromLocationId: string;
  toLocationId: string;
  /** e.g. `{ system: 'hiking-band', value: 'hard' }`. */
  grade: Grade;
  atAGlance: Stat[];
  blocks: ContentBlock[];
  highlightIds: string[];
}

// ── Peak decomposition ──────────────────────────────────────────────────────

/** A "way up" — a parallel alternative, NOT sequential. Never a synthetic Section. */
export interface Route {
  id: string;
  objectiveId: string;
  name: string;
  tagline: string;
  /** e.g. `{ system: 'french-alpine', value: 'PD' }`. */
  grade: Grade;
  atAGlance: Stat[];
  blocks: ContentBlock[];
  legIds: string[];
  highlightIds: string[];
}

/** A day / approach / summit-push within a route. Can carry its own grade. */
export interface Leg {
  id: string;
  routeId: string;
  number: number;
  name: string;
  fromLocationId?: string;
  toLocationId?: string;
  grade?: Grade;
  atAGlance: Stat[];
}

// ── Shared entities (referenced by id, owned by nobody — invariant 4) ────────

export interface Location {
  id: string;
  slug: string;
  name: string;
  /** Open vocab — a key into the placeTypes registry. */
  type: string;
  coords: Coords;
  meta?: Record<string, unknown>;
}

export interface POI {
  id: string;
  slug: string;
  name: string;
  /** Open vocab — a key into the placeTypes registry. */
  type: string;
  coords: Coords;
  meta?: Record<string, unknown>;
}

/** A curated highlight — the "what you'd want this for" slots (HighlightsCard, the
 *  `highlights` ContentBlock). A shared entity referenced by `highlightIds`, owned by
 *  no objective (like Location/POI). NOTE: not in the §4 interface list — inferred from
 *  HighlightsCard + the `highlightIds` references + Phase 2's "every highlightId resolves"
 *  gate. Minimal by design; promote fields when the card needs them (§13). */
export interface Highlight {
  id: string;
  title: string;
  /** Optional supporting line; the card can render title-only (4 text slots). */
  body?: string;
  mediaId?: string;
  /** Optionally anchored to a shared place. */
  poiId?: string;
}

/** A reference to a shared Location with an optional context note (e.g. "resupply"). */
export type PlaceRef = { locationId: string; note?: string };

// ContentBlock lives in ./blocks (the renderer's single source of truth); imported
// here so Stage/Route can carry `blocks`.
import type { ContentBlock } from './blocks';
