// Pack builder (pure) — TrailKnowledge → @roam/content pack. The multi-trail engine:
// the same mapping runs for any trail from its config + knowledge. No I/O, so it's
// unit-tested from fixtures. The coarse regions become BOTH discovery Regions (shared,
// SEO areas) and the trail's Sections (its slices); the etapas become Stages.

import type {
  ContentBlock,
  Continent,
  Country,
  Grade,
  Location,
  Objective,
  Region,
  Section,
  SeedInput,
  Stage,
  TrailPack,
} from '@roam/content';
import { trailStageStats } from '@roam/content';
import type { PackConfig } from './config';
import type { TrailKnowledge } from './knowledge';

const km = (m: number) => Math.round((m / 1000) * 10) / 10;

// Hiking-band grade from relief (no per-etapa grade in OSM) — a Derived first pass a
// curator can override (§3 grade is open vocab, never an enum).
function gradeForStage(distanceKm: number, ascentM: number | null): Grade {
  const a = ascentM ?? 0;
  const value =
    a >= 1300 || distanceKm >= 28 ? 'severe' : a >= 950 ? 'hard' : a >= 550 ? 'moderate' : 'easy';
  return { system: 'hiking-band', value };
}

// Naismith-ish time estimate (Derived) until real published times are ingested.
function estimateHours(distanceKm: number, ascentM: number | null): string {
  const h = distanceKm / 4.5 + (ascentM ?? 0) / 600;
  const hh = Math.floor(h);
  const mm = Math.round(((h - hh) * 60) / 15) * 15;
  return mm ? `${hh}h ${mm}m` : `${hh}h`;
}

// Slice the route's elevation profile to a stage's chainage span → an elevation block.
function elevationBlock(
  profile: { d: number; e: number }[],
  startM: number,
  endM: number,
): ContentBlock | null {
  const pts = profile
    .filter((p) => p.d >= startM && p.d <= endM)
    .map((p) => ({ distanceKm: km(p.d - startM), elevM: Math.round(p.e) }));
  return pts.length >= 2 ? { kind: 'elevation', points: pts } : null;
}

export interface BuiltTrail {
  pack: TrailPack;
  /** Discovery regions this trail contributes (deduped across trails in assembleSeed). */
  regions: Region[];
  locations: Location[];
}

/** Map a trail's config + knowledge to a validated-shape @roam/content TrailPack. Pure. */
export function buildTrailPack(config: PackConfig, k: TrailKnowledge): BuiltTrail {
  const regions: Region[] = k.regions.map((r) => ({
    id: r.id,
    slug: r.id,
    name: r.name,
    countryId: config.countryId,
    tagline: r.description,
    heroMediaId: `media/hero/${r.id}`,
    summary: r.description,
  }));

  const stages: Stage[] = k.stages.map((s) => {
    const distanceKm = km(s.endChainageM - s.startChainageM);
    const grade = gradeForStage(distanceKm, s.ascentM);
    const elev = elevationBlock(k.elevationProfile, s.startChainageM, s.endChainageM);
    return {
      id: `${config.id}-s${s.number}`,
      sectionId: `${config.id}-${s.regionId}`,
      number: s.number,
      name: s.name,
      fromLocationId: s.fromLocationId,
      toLocationId: s.toLocationId,
      grade,
      atAGlance: trailStageStats({
        distanceKm,
        ascentM: s.ascentM ?? 0,
        descentM: s.descentM ?? 0,
        hours: estimateHours(distanceKm, s.ascentM),
        grade,
      }),
      blocks: elev ? [elev] : [], // AI-draft prose/what-you-see appended in a later stage
      highlightIds: [],
    };
  });

  const sections: Section[] = k.regions.map((r) => {
    const own = k.stages.filter((s) => s.regionId === r.id);
    const distM = own.reduce((sum, s) => sum + (s.endChainageM - s.startChainageM), 0);
    const lo = Math.min(...own.map((s) => s.number));
    const hi = Math.max(...own.map((s) => s.number));
    return {
      id: `${config.id}-${r.id}`,
      objectiveId: config.id,
      order: r.orderIndex,
      name: r.name,
      tagline: r.description,
      heroMediaId: `media/hero/${config.id}-${r.id}`,
      regionIds: [r.id],
      summary: r.description,
      atAGlance: [
        { key: 'stages', value: own.length ? `${lo}–${hi}` : '—', label: 'Stages' },
        { key: 'distance', value: km(distM), unit: 'km', label: 'Distance' },
      ],
      resupply: [],
      refuges: [],
      highlightIds: [],
      stageIds: own.map((s) => `${config.id}-s${s.number}`),
    };
  });

  // Composed Guide Overview (Figma 1050:2369) — a Derived "Distance, elevation &
  // duration" topic carrying the whole-trail elevation as columns. AI-draft Planning/
  // Environment facets append later.
  const totalAscent = k.stages.reduce((sum, s) => sum + (s.ascentM ?? 0), 0);
  const overviewElevation: ContentBlock | null =
    k.elevationProfile.length >= 2
      ? {
          kind: 'elevation',
          variant: 'multiDay',
          points: k.elevationProfile.map((p) => ({ distanceKm: km(p.d), elevM: Math.round(p.e) })),
        }
      : null;

  const objective: Objective = {
    id: config.id,
    slug: config.id,
    name: config.source.name,
    type: 'trail',
    regionIds: regions.map((r) => r.id),
    tagline: config.tagline,
    heroMediaId: `media/hero/${config.id}`,
    summary: config.summary,
    atAGlance: [
      { key: 'distance', value: km(k.lengthM), unit: 'km', label: 'Distance' },
      { key: 'stages', value: k.stages.length, label: 'Stages' },
      {
        key: 'days',
        value: `${Math.ceil(k.stages.length * 0.9)}–${k.stages.length}`,
        label: 'Days',
      },
      {
        key: 'highPoint',
        value: Math.round(Math.max(...k.elevationProfile.map((p) => p.e))),
        unit: 'm',
        label: 'High point',
      },
    ],
    guide: overviewElevation
      ? [
          {
            key: 'profile',
            facet: 'overview',
            heading: 'Distance, elevation & duration',
            body: `Roughly ${km(k.lengthM)} km with about ${totalAscent.toLocaleString('en-US')} m of cumulative ascent over ${k.stages.length} stages.`,
            blocks: [overviewElevation],
          },
        ]
      : [],
    highlightIds: [],
    sectionIds: sections.map((s) => s.id),
  };

  const locations: Location[] = k.locations.map((l) => ({
    id: l.id,
    slug: l.id,
    name: l.name,
    type: l.type,
    coords: { lat: l.lat, lng: l.lng },
  }));

  return { pack: { objective, sections, stages }, regions, locations };
}

/** Merge built trails + shared geography into one SeedInput, deduping regions/locations
 *  by id (regions are shared across trails). The importer then validates the whole. */
export function assembleSeed(
  continents: Continent[],
  countries: Country[],
  built: BuiltTrail[],
): SeedInput {
  const regions = new Map<string, Region>();
  const locations = new Map<string, Location>();
  for (const b of built) {
    for (const r of b.regions) regions.set(r.id, r);
    for (const l of b.locations) locations.set(l.id, l);
  }
  return {
    continents,
    countries,
    regions: [...regions.values()],
    locations: [...locations.values()],
    pois: [],
    highlights: [],
    trails: built.map((b) => b.pack),
    peaks: [],
  };
}
