// Peak pack builder (pure) — PeakKnowledge → @roam/content PeakPack. The peak half of
// the engine, parallel to buildTrailPack: a peak decomposes into parallel Routes + Legs
// (never a synthetic Section, invariant 2). A peak references an existing discovery
// Region (it doesn't create one), so it aggregates alongside the trails that cross it.
//
// Source note: there's no peak ingestion yet (no peak in Postgres), so PeakKnowledge is
// hand-curated for now; this engine is what an OSM-peak source (or curation export)
// feeds. The trail runner keeps merging the hand-authored Aneto until that source lands.

import type {
  ContentBlock,
  Grade,
  Highlight,
  Leg,
  Location,
  Objective,
  PeakPack,
  Route,
  Stat,
} from '@roam/content';
import { gradeScale } from '@roam/content';
import type { PackConfig } from './config';
import type { KnowledgeLocation } from './knowledge';

export interface PeakLegKnowledge {
  number: number;
  name: string;
  fromLocationId?: string;
  toLocationId?: string;
  grade?: Grade;
}

export interface PeakRouteKnowledge {
  id: string;
  name: string;
  tagline: string;
  grade: Grade;
  distanceKm: number;
  ascentM: number;
  hours: string;
  legs: PeakLegKnowledge[];
  blocks?: ContentBlock[];
  highlightIds?: string[];
}

export interface PeakKnowledge {
  /** The existing discovery region this peak sits in (shared with crossing trails). */
  regionId: string;
  summitM: number;
  season: string;
  routes: PeakRouteKnowledge[];
  locations: KnowledgeLocation[];
  highlights: { id: string; title: string; body?: string }[];
}

export interface BuiltPeak {
  pack: PeakPack;
  locations: Location[];
  highlights: Highlight[];
}

const routeStats = (distanceKm: number, ascentM: number, hours: string, grade: Grade): Stat[] => [
  { key: 'distance', value: distanceKm, unit: 'km', label: 'Distance' },
  { key: 'ascent', value: ascentM, unit: 'm', label: 'Ascent' },
  { key: 'time', value: hours, label: 'Time' },
  { key: 'grade', value: grade.value, label: 'Grade' },
];

// Peak overview grade is a RANGE — easiest to hardest route on its scale (Figma 307:1031).
function gradeRange(grades: Grade[]): string {
  if (grades.length === 0) return '';
  const { scale } = gradeScale(grades[0] as Grade);
  const idxs = grades.map((g) => gradeScale(g).index).filter((i) => i >= 0);
  const lo = Math.min(...idxs);
  const hi = Math.max(...idxs);
  return lo === hi ? (scale[lo] ?? '') : `${scale[lo]}–${scale[hi]}`;
}

const legId = (routeId: string, n: number) => `${routeId}-l${n}`;

/** Map a peak's config + knowledge to a validated-shape @roam/content PeakPack. Pure. */
export function buildPeakPack(config: PackConfig, k: PeakKnowledge): BuiltPeak {
  const legs: Leg[] = k.routes.flatMap((r) =>
    r.legs.map((l) => ({
      id: legId(r.id, l.number),
      routeId: r.id,
      number: l.number,
      name: l.name,
      fromLocationId: l.fromLocationId,
      toLocationId: l.toLocationId,
      grade: l.grade,
      atAGlance: [],
    })),
  );

  const routes: Route[] = k.routes.map((r) => ({
    id: r.id,
    objectiveId: config.id,
    name: r.name,
    tagline: r.tagline,
    grade: r.grade,
    atAGlance: routeStats(r.distanceKm, r.ascentM, r.hours, r.grade),
    blocks: r.blocks ?? [{ kind: 'itinerary', legIds: r.legs.map((l) => legId(r.id, l.number)) }],
    legIds: r.legs.map((l) => legId(r.id, l.number)),
    highlightIds: r.highlightIds ?? [],
  }));

  const objective: Objective = {
    id: config.id,
    slug: config.id,
    name: config.source.name,
    type: 'peak',
    regionIds: [k.regionId],
    tagline: config.tagline,
    heroMediaId: `media/hero/${config.id}`,
    summary: config.summary,
    atAGlance: [
      { key: 'summit', value: k.summitM, unit: 'm', label: 'Summit' },
      { key: 'routes', value: k.routes.length, label: 'Routes' },
      { key: 'season', value: k.season, label: 'Season' },
      { key: 'grade', value: gradeRange(k.routes.map((r) => r.grade)), label: 'Grade' },
    ],
    guide: [],
    highlightIds: k.highlights.map((h) => h.id),
    routeIds: k.routes.map((r) => r.id),
  };

  const locations: Location[] = k.locations.map((l) => ({
    id: l.id,
    slug: l.id,
    name: l.name,
    type: l.type,
    coords: { lat: l.lat, lng: l.lng },
  }));

  return {
    pack: { objective, routes, legs },
    locations,
    highlights: k.highlights.map((h) => ({ id: h.id, title: h.title, body: h.body })),
  };
}
