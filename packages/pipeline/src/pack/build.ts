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
  Highlight,
  Location,
  MediaAsset,
  Objective,
  Range,
  Region,
  Section,
  SeedInput,
  Stage,
  StatusTone,
  TrailPack,
} from '@roam/content';
import { trailStageStats } from '@roam/content';
import type { PackConfig } from './config';
import { EMPTY_CONTENT, type TrailContent } from './content';
import type { KnowledgePOI, TrailKnowledge } from './knowledge';

// A map ContentBlock wrapping one route-line geometry (§7) — for trail/section/stage previews.
const mapBlock = (geom: GeoJSON.Geometry, color?: string): ContentBlock => ({
  kind: 'map',
  geojson: {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', geometry: geom, properties: {} }],
  } as GeoJSON.FeatureCollection,
  styleId: 'outdoor',
  markers: [],
  color,
});

// Accommodation detail line — "Refuge · 96 beds · seasonal".
const accomNote = (a: KnowledgePOI): string =>
  [
    a.type.charAt(0).toUpperCase() + a.type.slice(1),
    a.capacity ? `${a.capacity} beds` : null,
    a.seasonal ? 'seasonal' : null,
  ]
    .filter(Boolean)
    .join(' · ');

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
  /** Highlight entities generated from the content (referenced by section.highlightIds). */
  highlights: Highlight[];
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
    // Project the linearly-referenced POIs (§7) onto this stage's chainage span.
    const inStage = (m: number) => m >= s.startChainageM && m <= s.endChainageM;
    const stageWater = k.water.filter((w) => inStage(w.chainageM));
    const stageAccom = k.accommodation.filter((a) => inStage(a.chainageM));
    const waterBlock: ContentBlock | null = stageWater.length
      ? {
          kind: 'water',
          header: 'Water',
          stops: stageWater.map((w) => ({
            locationId: w.id,
            distanceKm: km(w.chainageM - s.startChainageM),
            note: w.seasonal ? 'seasonal' : undefined,
          })),
        }
      : null;
    const accomBlock: ContentBlock | null = stageAccom.length
      ? {
          kind: 'accommodation',
          header: 'Accommodation',
          places: stageAccom.map((a) => ({ locationId: a.id, note: accomNote(a) })),
        }
      : null;
    // Hazards: the section's conditions/cautions apply to its stages (§12.4).
    const stageHz = content.sectionHazards?.[`${config.id}-${s.regionId}`] ?? [];
    const hazBlock: ContentBlock | null = stageHz.length
      ? {
          kind: 'hazards',
          header: 'Hazards',
          callouts: stageHz.map((z) => ({ tone: z.tone as StatusTone, body: z.body })),
        }
      : null;
    return {
      id: stageId,
      sectionId: `${config.id}-${s.regionId}`,
      number: s.number,
      name: s.name,
      fromLocationId: s.fromLocationId,
      toLocationId: s.toLocationId,
      heroMediaId: `media/hero/${stageId}`,
      grade,
      atAGlance: trailStageStats({
        distanceKm,
        ascentM: s.ascentM ?? 0,
        descentM: s.descentM ?? 0,
        hours: estimateHours(distanceKm, s.ascentM),
        grade,
      }),
      // §12.4 order: Overview → map → elevation → water → accommodation → hazards.
      blocks: [
        ...(content.stageBlocks?.[stageId] ?? []),
        ...(k.stageGeojson[stageId] ? [mapBlock(k.stageGeojson[stageId], k.wayColor)] : []),
        ...(elev ? [elev] : []),
        ...(waterBlock ? [waterBlock] : []),
        ...(accomBlock ? [accomBlock] : []),
        ...(hazBlock ? [hazBlock] : []),
      ],
      highlightIds: [],
    };
  });

  const highlights: Highlight[] = [];
  const sections: Section[] = k.regions.map((r) => {
    const sectionId = `${config.id}-${r.id}`;
    const own = k.stages.filter((s) => s.regionId === r.id);
    const distM = own.reduce((sum, s) => sum + (s.endChainageM - s.startChainageM), 0);
    const lo = Math.min(...own.map((s) => s.number));
    const hi = Math.max(...own.map((s) => s.number));
    // Resupply & refuges digest: the section's day-end towns, and the staffed huts within
    // its chainage span (§12.2). Both reference Locations already in the pack.
    const startM = Math.min(...own.map((s) => s.startChainageM));
    const endM = Math.max(...own.map((s) => s.endChainageM));
    const townIds = [...new Set(own.flatMap((s) => [s.fromLocationId, s.toLocationId]))];
    const resupply = townIds.map((locationId) => ({ locationId }));
    const refuges = k.accommodation
      .filter(
        (a) =>
          (a.type === 'refuge' || a.type === 'hut') && a.chainageM >= startM && a.chainageM <= endM,
      )
      .map((a) => ({ locationId: a.id, note: accomNote(a) }));

    // Highlights → Highlight entities + section.highlightIds; hazards → a cautions topic.
    const hlEntities: Highlight[] = (content.sectionHighlights?.[sectionId] ?? []).map((h, i) => ({
      id: `${sectionId}-hl-${i}`,
      title: h.title,
      body: h.body,
      mediaId: `media/highlight/${sectionId}-hl-${i}`,
    }));
    highlights.push(...hlEntities);
    const hazards = content.sectionHazards?.[sectionId] ?? [];
    const baseGuide = content.sectionGuide?.[sectionId] ?? [];
    const cautions: GuideTopic[] = hazards.length
      ? [
          {
            key: 'cautions',
            facet: 'overview',
            heading: 'Conditions & cautions',
            blocks: [
              {
                kind: 'hazards',
                callouts: hazards.map((z) => ({ tone: z.tone as StatusTone, body: z.body })),
              },
            ],
          },
        ]
      : [];
    // Section region map — a simplified slice of the route line (§7).
    const geom = k.sectionGeojson[r.id];
    const mapTopic: GuideTopic[] = geom
      ? [{ key: 'map', facet: 'overview', blocks: [mapBlock(geom, k.wayColor)] }]
      : [];
    const guide = [...mapTopic, ...baseGuide, ...cautions];
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
      guide: guide.length ? guide : undefined,
      resupply,
      refuges,
      highlightIds: hlEntities.map((h) => h.id),
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
  // Grade mix → the accompanying difficulty sentence.
  const gradeCounts = [0, 0, 0, 0];
  for (const i of gradeIdx) gradeCounts[i] = (gradeCounts[i] ?? 0) + 1;
  const modalGrade = BANDS[gradeCounts.indexOf(Math.max(...gradeCounts))] ?? 'moderate';
  const hardPlus = gradeIdx.filter((i) => i >= 2).length;
  const difficultyBody = `${hardPlus} of ${stages.length} stages rank hard or severe, with single climbs of up to ${maxAscent.toLocaleString('en-US')} m. Most days are ${modalGrade} going — ${config.source.name} rewards steady fitness and early starts more than technical skill.`;

  const guideTopics: GuideTopic[] = [];
  if (k.routeGeojson) {
    guideTopics.push({
      key: 'map',
      facet: 'overview',
      blocks: [mapBlock(k.routeGeojson, k.wayColor)],
    });
  }
  if (k.elevationProfile.length >= 2) {
    guideTopics.push({
      key: 'profile',
      facet: 'overview',
      heading: 'Distance, elevation & duration',
      body: `Roughly ${km(k.lengthM)} km with about ${totalAscent.toLocaleString('en-US')} m of cumulative ascent over ${k.stages.length} stages.`,
      blocks: [
        {
          kind: 'statStrip',
          stats: [
            { value: `${km(k.lengthM)}`, label: 'KM' },
            { value: totalAscent.toLocaleString('en-US'), label: 'M ASCENT' },
            { value: `${Math.ceil(k.stages.length * 0.9)}–${k.stages.length}`, label: 'DAYS' },
          ],
        },
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
      body: difficultyBody,
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
      // The window note reads as the topic's accompanying text; the strip shows the months.
      body: config.season.note,
      blocks: [{ kind: 'season', best: config.season.best }],
    });
  }

  const objective: Objective = {
    id: config.id,
    slug: config.id,
    name: config.source.name,
    type: 'trail',
    regionIds: regions.map((r) => r.id),
    rangeId: config.rangeId,
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
        key: 'ascent',
        value: totalAscent.toLocaleString('en-US'),
        unit: 'm',
        label: 'Ascent',
      },
    ],
    guide: [...guideTopics, ...(content.objectiveGuide ?? [])],
    highlightIds: [],
    sectionIds: sections.map((s) => s.id),
  };

  const toLocation = (l: { id: string; name: string; type: string; lat: number; lng: number }) => ({
    id: l.id,
    slug: l.id,
    name: l.name,
    type: l.type,
    coords: { lat: l.lat, lng: l.lng },
  });
  // Boundary locations + the POIs the stage blocks reference (importer validates the ids).
  const locations: Location[] = [
    ...k.locations.map(toLocation),
    ...k.water.map(toLocation),
    ...k.accommodation.map(toLocation),
  ];

  return {
    pack: { objective, sections, stages },
    regions,
    locations,
    media: Object.values(content.media ?? {}),
    highlights,
  };
}

/** Merge built trails + shared geography into one SeedInput, deduping regions/locations
 *  by id (regions are shared across trails). The importer then validates the whole. */
export function assembleSeed(
  continents: Continent[],
  countries: Country[],
  ranges: Range[],
  built: BuiltTrail[],
): SeedInput {
  const regions = new Map<string, Region>();
  const locations = new Map<string, Location>();
  const media = new Map<string, MediaAsset>();
  const highlights = new Map<string, Highlight>();
  for (const b of built) {
    for (const r of b.regions) regions.set(r.id, r);
    for (const l of b.locations) locations.set(l.id, l);
    for (const m of b.media) media.set(m.id, m);
    for (const h of b.highlights) highlights.set(h.id, h);
  }
  return {
    continents,
    countries,
    ranges,
    regions: [...regions.values()],
    locations: [...locations.values()],
    pois: [],
    highlights: [...highlights.values()],
    media: [...media.values()],
    trails: built.map((b) => b.pack),
    peaks: [],
  };
}
