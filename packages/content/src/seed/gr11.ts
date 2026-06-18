// GR11 (trail) seed pack (Phase 2). Five sections faithful to §12.1; one
// representative authored stage per section, with the canonical Candanchú → Sallent
// stage carrying a full ContentBlock[] for later phases. Prose is placeholder in the
// §9 voice — TODO(copy). Stage *ranges/distances* in section stats are authored facts
// from §12.1; the per-section stageIds reference the authored representative subset.

import type { TrailPack } from '../importer';
import { trailStageStats } from '../stats';
import type { Grade, GuideTopic, Highlight, Location, Objective, Section, Stage } from '../types';

const hb = (value: string): Grade => ({ system: 'hiking-band', value });
const loc = (id: string, name: string, type: string, lat: number, lng: number): Location => ({
  id,
  slug: id,
  name,
  type,
  coords: { lat, lng },
});

// ── Shared locations (stage endpoints + section resupply/refuges) ────────────
export const gr11Locations: Location[] = [
  loc('hondarribia', 'Hondarribia', 'town', 43.36, -1.79),
  loc('bera', 'Bera', 'town', 43.28, -1.69),
  loc('burguete', 'Burguete / Auritz', 'town', 42.99, -1.34),
  loc('hiriberri', 'Hiriberri', 'town', 42.93, -1.25),
  loc('candanchu', 'Candanchú', 'town', 42.78, -0.52),
  loc('sallent', 'Sallent de Gállego', 'town', 42.77, -0.33),
  loc('respomuso', 'Refugio de Respomuso', 'refugio', 42.83, -0.29),
  loc('salardu', 'Salardú', 'town', 42.7, 0.91),
  loc('restanca', 'Refugi de la Restanca', 'refugio', 42.63, 0.86),
  loc('port-de-la-selva', 'El Port de la Selva', 'town', 42.34, 3.2),
  loc('cap-de-creus', 'Cap de Creus', 'viewpoint', 42.32, 3.32),
];

export const gr11Highlights: Highlight[] = [
  {
    id: 'gr11-h-monteperdido',
    title: 'Monte Perdido above the Ordesa canyon',
    body: 'The highest limestone massif in Europe, walked beneath at Góriz.',
  }, // TODO(copy)
  {
    id: 'gr11-h-respomuso',
    title: 'The Respomuso lake basin',
    body: 'A dammed tarn under granite walls, the first true high camp.',
  }, // TODO(copy)
  {
    id: 'gr11-h-capdecreus',
    title: 'The Cap de Creus headland',
    body: 'Where the Pyrenees end in the Mediterranean.',
  }, // TODO(copy)
];

// ── Stages (one representative per section; Candanchú→Sallent is the full one) ─
const stages: Stage[] = [
  {
    id: 'gr11-s1',
    sectionId: 'gr11-basque',
    number: 1,
    name: 'Hondarribia → Bera',
    fromLocationId: 'hondarribia',
    toLocationId: 'bera',
    grade: hb('moderate'),
    atAGlance: trailStageStats({
      distanceKm: 21,
      ascentM: 900,
      descentM: 740,
      hours: '7h',
      grade: hb('moderate'),
    }),
    blocks: [
      { kind: 'prose', body: 'Off the estuary and straight uphill into the Atlantic hills.' },
    ], // TODO(copy)
    highlightIds: [],
  },
  {
    id: 'gr11-s11',
    sectionId: 'gr11-navarre',
    number: 11,
    name: 'Burguete → Hiriberri',
    fromLocationId: 'burguete',
    toLocationId: 'hiriberri',
    grade: hb('moderate'),
    atAGlance: trailStageStats({
      distanceKm: 18,
      ascentM: 720,
      descentM: 690,
      hours: '6h',
      grade: hb('moderate'),
    }),
    blocks: [
      { kind: 'prose', body: 'Through beech forest toward the first high cols of the range.' },
    ], // TODO(copy)
    highlightIds: [],
  },
  {
    // The canonical stage (Figma 1069:2196) — full ContentBlock[] for Phase 5.
    id: 'gr11-candanchu-sallent',
    sectionId: 'gr11-aragon',
    number: 28,
    name: 'Candanchú → Sallent de Gállego',
    fromLocationId: 'candanchu',
    toLocationId: 'sallent',
    grade: hb('hard'),
    atAGlance: trailStageStats({
      distanceKm: 24,
      ascentM: 1120,
      descentM: 1180,
      hours: '8h 30m',
      grade: hb('hard'),
    }),
    blocks: [
      {
        kind: 'prose',
        heading: 'Overview',
        body: 'Physically demanding rather than technically hard — two passes, a long descent into the Gállego valley.',
      }, // TODO(copy)
      {
        kind: 'map',
        geojson: { type: 'FeatureCollection', features: [] },
        styleId: 'outdoor',
        markers: [{ id: 'respomuso', kind: 'location', placeType: 'refugio', label: 'Respomuso' }],
      },
      {
        kind: 'elevation',
        points: [
          { distanceKm: 0, elevM: 1530 },
          { distanceKm: 9, elevM: 2380 },
          { distanceKm: 24, elevM: 1290 },
        ],
      },
      { kind: 'water', stops: [{ locationId: 'respomuso', distanceKm: 14, note: 'refuge tap' }] },
      { kind: 'accommodation', places: [{ locationId: 'respomuso', note: 'staffed Jun–Sep' }] },
      {
        kind: 'navigation',
        body: 'Cairned above the treeline; the GR11 red/white blazes thin out on the cols.',
        marking: 'gr',
      },
      {
        kind: 'hazards',
        callouts: [
          {
            tone: 'warn',
            body: 'Snow lingers on the north side of the higher col into early July.',
          },
        ],
      }, // TODO(copy)
      { kind: 'highlights', highlightIds: ['gr11-h-respomuso'] },
      { kind: 'gallery', mediaIds: ['media/gr11/candanchu-1', 'media/gr11/candanchu-2'] },
    ],
    highlightIds: ['gr11-h-respomuso'],
  },
  {
    id: 'gr11-s31',
    sectionId: 'gr11-catalonia',
    number: 31,
    name: 'Salardú → Refugi de la Restanca',
    fromLocationId: 'salardu',
    toLocationId: 'restanca',
    grade: hb('hard'),
    atAGlance: trailStageStats({
      distanceKm: 16,
      ascentM: 980,
      descentM: 460,
      hours: '6h',
      grade: hb('hard'),
    }),
    blocks: [
      { kind: 'prose', body: 'Up into the granite lake country of the Aigüestortes high ground.' },
    ], // TODO(copy)
    highlightIds: [],
  },
  {
    id: 'gr11-s47',
    sectionId: 'gr11-cap-de-creus',
    number: 47,
    name: 'El Port de la Selva → Cap de Creus',
    fromLocationId: 'port-de-la-selva',
    toLocationId: 'cap-de-creus',
    grade: hb('easy'),
    atAGlance: trailStageStats({
      distanceKm: 15,
      ascentM: 470,
      descentM: 450,
      hours: '5h',
      grade: hb('easy'),
    }),
    blocks: [
      {
        kind: 'prose',
        body: 'A coast that gives way quickly to schist headland, ending at the cape.',
      },
    ], // TODO(copy)
    highlightIds: ['gr11-h-capdecreus'],
  },
];

// ── Sections (faithful to §12.1) ─────────────────────────────────────────────
const section = (
  id: string,
  order: number,
  name: string,
  regionId: string,
  stageRange: string,
  distanceKm: number,
  character: string,
  stageIds: string[],
  refuges: string[] = [],
  resupply: string[] = [],
  highlightIds: string[] = [],
): Section => ({
  id,
  objectiveId: 'gr11',
  order,
  name,
  tagline: character,
  heroMediaId: `media/hero/${id}`,
  regionIds: [regionId],
  summary: character,
  atAGlance: [
    { key: 'stages', value: stageRange, label: 'Stages' },
    { key: 'distance', value: distanceKm, unit: 'km', label: 'Distance' },
  ],
  resupply: resupply.map((locationId) => ({ locationId })),
  refuges: refuges.map((locationId) => ({ locationId })),
  highlightIds,
  stageIds,
});

const sections: Section[] = [
  section(
    'gr11-basque',
    1,
    'Basque Country',
    'basque-country',
    '1–10',
    165,
    'Green hills and sea mist.',
    ['gr11-s1'],
    [],
    ['bera'],
  ), // TODO(copy)
  section(
    'gr11-navarre',
    2,
    'Navarre',
    'navarre',
    '11–18',
    138,
    'Beech forest, the first high cols.',
    ['gr11-s11'],
    [],
    ['burguete'],
  ), // TODO(copy)
  section(
    'gr11-aragon',
    3,
    'Aragon',
    'aragon',
    '19–30',
    210,
    'The high heart, Monte Perdido.',
    ['gr11-candanchu-sallent'],
    ['respomuso'],
    ['candanchu', 'sallent'],
    ['gr11-h-monteperdido', 'gr11-h-respomuso'],
  ), // TODO(copy)
  section(
    'gr11-catalonia',
    4,
    'Catalonia',
    'catalonia',
    '31–43',
    240,
    'Granite lakes, highest passes.',
    ['gr11-s31'],
    ['restanca'],
    ['salardu'],
  ), // TODO(copy)
  section(
    'gr11-cap-de-creus',
    5,
    'Cap de Creus',
    'cap-de-creus',
    '44–47',
    78,
    'Down through the Albera to the sea.',
    ['gr11-s47'],
    [],
    ['port-de-la-selva'],
    ['gr11-h-capdecreus'],
  ), // TODO(copy)
];

// Section-scoped overview topics (§12.2) — seeded on Aragon so the Section Overview
// renders the full Terrain → Flora & fauna → Culture → Weather order. TODO(copy).
const aragonGuide: GuideTopic[] = [
  {
    key: 'terrain',
    facet: 'environment',
    heading: 'Terrain',
    body: "The range's high heart — limestone and granite massifs around Monte Perdido, big climbs to passes above 2,300 m.",
  },
  {
    key: 'flora',
    facet: 'environment',
    heading: 'Flora & fauna',
    body: 'Beech and silver fir give way to mountain pine, then bare scree; izard, marmots and griffon vultures above the treeline.',
  },
  {
    key: 'culture',
    facet: 'environment',
    heading: 'Culture',
    body: "Pastoral valleys and old cross-border grazing routes; Bujaruelo's Romanesque bridge and pilgrim hospice.",
  },
  {
    key: 'weather',
    facet: 'conditions',
    heading: 'Weather',
    body: 'Afternoon storms build fast over the high cols in summer; snow lingers on north faces into early July.',
  },
];
const aragon = sections.find((s) => s.id === 'gr11-aragon');
if (aragon) aragon.guide = aragonGuide;

const objective: Objective = {
  id: 'gr11',
  slug: 'gr11',
  name: 'GR11',
  type: 'trail',
  regionIds: ['basque-country', 'navarre', 'aragon', 'catalonia', 'cap-de-creus'],
  tagline: 'The Spanish Pyrenees, coast to coast', // TODO(copy)
  heroMediaId: 'media/hero/gr11',
  summary:
    'Forty-seven stages from the Atlantic at Hondarribia to the Mediterranean at Cap de Creus.', // TODO(copy)
  atAGlance: [
    { key: 'distance', value: 831, unit: 'km', label: 'Distance' },
    { key: 'stages', value: 47, label: 'Stages' },
    { key: 'days', value: '40–46', label: 'Days' },
    { key: 'highPoint', value: 2884, unit: 'm', label: 'High point' },
  ],
  guide: [
    {
      key: 'character',
      facet: 'overview',
      heading: 'The walk',
      body: 'Shorter and lower at the ends than the high middle; the Aragonese and Catalan stages hold the real altitude.',
    }, // TODO(copy)
    {
      key: 'when',
      facet: 'planning',
      heading: 'When to go',
      body: 'Mid-June to late September; the high cols hold snow into early summer.',
    }, // TODO(copy)
    {
      key: 'terrain',
      facet: 'environment',
      heading: 'Terrain',
      body: 'Atlantic forest to granite high country to Mediterranean schist.',
    }, // TODO(copy)
  ],
  highlightIds: ['gr11-h-monteperdido', 'gr11-h-respomuso', 'gr11-h-capdecreus'],
  sectionIds: ['gr11-basque', 'gr11-navarre', 'gr11-aragon', 'gr11-catalonia', 'gr11-cap-de-creus'],
};

export const gr11Pack: TrailPack = { objective, sections, stages };
