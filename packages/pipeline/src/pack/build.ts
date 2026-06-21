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

// A sensible high-mountain long-trail kit (gear chips, §21.2). A composed default until
// per-trail kit is curated from terrain/altitude/season.
const TRAIL_KIT = [
  'Waterproof shell',
  'Insulating layer',
  'Sun hat & SPF',
  'Trekking poles',
  'Headtorch',
  'Water filter',
  'Map & compass',
  'First-aid & blister kit',
];
// Safety reads as status callouts (Figma 04b), not chips — tone-coloured condition cards.
const TRAIL_CONDITIONS: { tone: StatusTone; body: string }[] = [
  { tone: 'warn', body: 'Storms build through the afternoon — be off the high cols by midday.' },
  { tone: 'success', body: 'Snow lingers on north-facing cols into early summer.' },
  { tone: 'info', body: 'Long dry stretches — carry 2–3 L of water on the exposed days.' },
];
const TRAIL_FOOD = [
  'Resupply in valley towns',
  'Refugio half-board',
  'Carry 2–3 days',
  'Local cheese & cured meat',
];

// Per-trail Planning structured data (Figma 04b): accommodation sub-types, water reliability
// end labels, and transport links. Authored per trail (start/end towns differ).
const PLANNING_DATA: Record<
  string,
  {
    accommodation: { label: string; body: string }[];
    water: { startLabel: string; endLabel: string };
    transportBody: string;
    transport: { label: string; body: string }[];
  }
> = {
  gr11: {
    accommodation: [
      { label: 'Refuges', body: 'Staffed mountain huts with set dinners — book ahead in August.' },
      { label: 'Albergues', body: 'Simple hostels in the valley villages.' },
      { label: 'Hotels & pensions', body: 'In the larger valley towns.' },
      {
        label: 'Camping',
        body: 'Tolerated above the treeline if discreet; not in the Ordesa or Aigüestortes national parks.',
      },
    ],
    water: { startLabel: 'West · reliable', endLabel: 'Central & east · sparse' },
    transportBody:
      'Irun and neighbouring Hendaye sit on the French and Spanish rail networks; at the far end, Cap de Creus connects through Figueres to the Barcelona line. Most section start and end points have bus links, but some are sparse — check timetables first.',
    transport: [
      { label: 'Start · Irun / Hendaye', body: 'On the French and Spanish rail networks.' },
      { label: 'End · Cap de Creus', body: 'Bus to Figueres, then the Barcelona line.' },
      { label: 'Between sections', body: 'Local buses, often infrequent — check first.' },
    ],
  },
  gr10: {
    accommodation: [
      { label: 'Refuges', body: 'Staffed mountain huts with set dinners — book ahead in summer.' },
      { label: "Gîtes d'étape", body: "Simple walkers' hostels in the valleys." },
      { label: 'Hotels & pensions', body: 'In the spa towns and larger valleys.' },
      {
        label: 'Camping',
        body: 'Tolerated above the treeline if discreet; not in the national parks.',
      },
    ],
    water: { startLabel: 'West · reliable', endLabel: 'East · drier' },
    transportBody:
      'Hendaye sits on the Atlantic rail line; Banyuls-sur-Mer, at the Mediterranean end, is on the line to Perpignan. Many valley towns have bus links, but mountain sections can be sparse — check timetables first.',
    transport: [
      { label: 'Start · Hendaye', body: 'On the Atlantic (Paris–Irun) rail line.' },
      { label: 'End · Banyuls-sur-Mer', body: 'On the coastal line to Perpignan.' },
      { label: 'Between sections', body: 'Valley buses, often infrequent — check first.' },
    ],
  },
};

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
      // No stat strip here — the header stat pills (atAGlance) already carry distance/ascent/days.
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

  // Planning (Figma 04b): Kit chips, then Navigation with the GR/PR marking legend.
  guideTopics.push({
    key: 'kit',
    facet: 'planning',
    heading: 'Kit',
    body: 'Three-season hiking kit: a 30–40 L pack, sturdy boots, warm layers for cold mornings and storms, and a light shelter or refuge sheet. Poles and microspikes help on early-season snow; carry 2–3 L of water capacity for the dry stages.',
    blocks: [{ kind: 'chips', group: 'gear', items: TRAIL_KIT }],
  });
  guideTopics.push({
    key: 'navigation',
    facet: 'planning',
    heading: 'Navigation',
    body: `Red-and-white GR marks are frequent but fade on high ground, so carry offline maps and a GPX track — cloud and snow can hide the blazes on the cols. ${config.source.ref} also shares paths with local PR and SL trails, so watch the colours.`,
    blocks: [
      {
        kind: 'navigation',
        body: '',
        markings: [
          { key: 'gr', label: `GR — red & white (the ${config.source.ref} itself)` },
          { key: 'pr', label: 'PR — yellow & white (local paths)' },
        ],
      },
    ],
  });

  // Enrich the AI-drafted Planning/Environment prose with a Derived visual block per topic:
  // POI fact strips (refuges/water counts) and conditions/food chips — composed from the pack.
  const pd = PLANNING_DATA[config.id];
  // Plain lens headings for the AI planning topics (Figma 04b/04c).
  const PLAIN_HEADING: Record<string, string> = {
    accommodation: 'Accommodation',
    water: 'Water',
    safety: 'Safety',
  };
  const enrichAiTopic = (t: GuideTopic): GuideTopic => {
    const extra: ContentBlock[] = [];
    if (t.key === 'accommodation' && pd) {
      extra.push({ kind: 'detailList', items: pd.accommodation });
    } else if (t.key === 'water' && pd) {
      extra.push({
        kind: 'reliability',
        startLabel: pd.water.startLabel,
        endLabel: pd.water.endLabel,
      });
    } else if (t.key === 'safety') {
      extra.push({ kind: 'hazards', callouts: TRAIL_CONDITIONS });
    } else if (t.key === 'food') {
      extra.push({ kind: 'chips', group: 'food', items: TRAIL_FOOD });
    } else if (t.key === 'flora' || t.key === 'culture' || t.key === 'history') {
      // Environment picture reel (Figma 04c) — only the env images that actually sourced.
      const mediaIds = [1, 2, 3]
        .map((i) => `media/env/${config.id}-${t.key}-${i}`)
        .filter((id) => content.media?.[id]);
      if (mediaIds.length) extra.push({ kind: 'gallery', mediaIds });
    }
    const heading = PLAIN_HEADING[t.key] ?? t.heading;
    return { ...t, heading, blocks: extra.length ? [...(t.blocks ?? []), ...extra] : t.blocks };
  };

  // Transport closes the Planning tab (Figma 04b) — after the AI topics, so it sorts last.
  const transportTopic: GuideTopic | null = pd
    ? {
        key: 'transport',
        facet: 'planning',
        heading: 'Transport',
        body: pd.transportBody,
        blocks: [{ kind: 'detailList', items: pd.transport }],
      }
    : null;

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
    guide: [
      ...guideTopics,
      ...(content.objectiveGuide ?? []).map(enrichAiTopic),
      ...(transportTopic ? [transportTopic] : []),
    ],
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
