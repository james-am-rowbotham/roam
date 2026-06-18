// Pack builder (pure) — TrailKnowledge → @roam/content pack. The multi-trail engine:
// the same mapping runs for any trail from its config + knowledge. No I/O, so it's
// unit-tested from fixtures. The coarse regions become BOTH discovery Regions (shared,
// SEO areas) and the trail's Sections (its slices); the etapas become Stages.

import type {
  ContentBlock,
  Continent,
  Country,
  Grade,
  GuideTopic,
  Location,
  MediaAsset,
  Objective,
  Region,
  Section,
  SeedInput,
  Stage,
  TrailPack,
} from '@roam/content';
import { trailStageStats } from '@roam/content';
import type { PackConfig } from './config';
import { EMPTY_CONTENT, type TrailContent } from './content';
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
  media: MediaAsset[];
}

/** Map a trail's config + knowledge (+ optional AI-draft content) to a validated-shape
 *  @roam/content TrailPack. Pure — content is injected, never fetched here. */
export function buildTrailPack(
  config: PackConfig,
  k: TrailKnowledge,
  content: TrailContent = EMPTY_CONTENT,
): BuiltTrail {
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
    const stageId = `${config.id}-s${s.number}`;
    const distanceKm = km(s.endChainageM - s.startChainageM);
    const grade = gradeForStage(distanceKm, s.ascentM);
    const elev = elevationBlock(k.elevationProfile, s.startChainageM, s.endChainageM);
    return {
      id: stageId,
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
      // §12.4 order: the Overview narrative leads, the elevation profile follows.
      blocks: [...(content.stageBlocks?.[stageId] ?? []), ...(elev ? [elev] : [])],
      highlightIds: [],
    };
  });

  const sections: Section[] = k.regions.map((r) => {
    const sectionId = `${config.id}-${r.id}`;
    const own = k.stages.filter((s) => s.regionId === r.id);
    const distM = own.reduce((sum, s) => sum + (s.endChainageM - s.startChainageM), 0);
    const lo = Math.min(...own.map((s) => s.number));
    const hi = Math.max(...own.map((s) => s.number));
    return {
      id: sectionId,
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
      guide: content.sectionGuide?.[sectionId],
      resupply: [],
      refuges: [],
      highlightIds: [],
      stageIds: own.map((s) => `${config.id}-s${s.number}`),
    };
  });

  // Composed Guide Overview (Figma 1050:2369) — Derived blocks per topic: the
  // whole-trail elevation (columns), a difficulty gauge from the stage grades, and the
  // best-season strip. AI-draft Planning/Environment facets append later.
  const totalAscent = k.stages.reduce((sum, s) => sum + (s.ascentM ?? 0), 0);
  const maxAscent = Math.max(0, ...k.stages.map((s) => s.ascentM ?? 0));
  const BANDS = ['easy', 'moderate', 'hard', 'severe'];
  const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
  const gradeIdx = stages.map((s) => BANDS.indexOf(s.grade.value)).filter((i) => i >= 0);
  const avgGrade = gradeIdx.length ? gradeIdx.reduce((a, b) => a + b, 0) / gradeIdx.length : 0;
  const lo = Math.floor(avgGrade);
  const hi = Math.ceil(avgGrade);
  const difficultyLabel =
    lo === hi ? cap(BANDS[lo] ?? '') : `${cap(BANDS[lo] ?? '')}–${cap(BANDS[hi] ?? '')}`;

  const guideTopics: GuideTopic[] = [];
  if (k.elevationProfile.length >= 2) {
    guideTopics.push({
      key: 'profile',
      facet: 'overview',
      heading: 'Distance, elevation & duration',
      body: `Roughly ${km(k.lengthM)} km with about ${totalAscent.toLocaleString('en-US')} m of cumulative ascent over ${k.stages.length} stages.`,
      blocks: [
        {
          kind: 'elevation',
          variant: 'multiDay',
          points: k.elevationProfile.map((p) => ({ distanceKm: km(p.d), elevM: Math.round(p.e) })),
        },
      ],
    });
  }
  if (gradeIdx.length) {
    guideTopics.push({
      key: 'difficulty',
      facet: 'overview',
      heading: 'Difficulty',
      blocks: [
        {
          kind: 'difficulty',
          label: difficultyLabel,
          level: Math.max(1, Math.min(4, Math.round(avgGrade) + 1)),
          total: 4,
          note: `Long days · up to ${maxAscent.toLocaleString('en-US')} m ascent`,
        },
      ],
    });
  }
  if (config.season) {
    guideTopics.push({
      key: 'season',
      facet: 'overview',
      heading: 'Best season',
      blocks: [{ kind: 'season', best: config.season.best, note: config.season.note }],
    });
  }

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
    guide: [...guideTopics, ...(content.objectiveGuide ?? [])],
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

  return {
    pack: { objective, sections, stages },
    regions,
    locations,
    media: Object.values(content.media ?? {}),
  };
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
  const media = new Map<string, MediaAsset>();
  for (const b of built) {
    for (const r of b.regions) regions.set(r.id, r);
    for (const l of b.locations) locations.set(l.id, l);
    for (const m of b.media) media.set(m.id, m);
  }
  return {
    continents,
    countries,
    regions: [...regions.values()],
    locations: [...locations.values()],
    pois: [],
    highlights: [],
    media: [...media.values()],
    trails: built.map((b) => b.pack),
    peaks: [],
  };
}
