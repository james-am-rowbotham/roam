// Aneto (peak) seed pack (Phase 2). A peak decomposes into parallel Routes (ways up),
// each with Legs — never a synthetic Section (invariant 2). Three routes led by grade.
// Prose is placeholder in the §9 voice — TODO(copy).

import type { ContentBlock } from '../blocks';
import type { PeakPack } from '../importer';
import { peakRouteStats } from '../stats';
import type { Grade, Highlight, Leg, Location, Objective, Route, Stat } from '../types';

const fa = (value: string): Grade => ({ system: 'french-alpine', value });
const loc = (id: string, name: string, type: string, lat: number, lng: number): Location => ({
  id,
  slug: id,
  name,
  type,
  coords: { lat, lng },
});

export const anetoLocations: Location[] = [
  loc('la-besurta', 'La Besurta', 'town', 42.68, 0.66),
  loc('renclusa', 'Refugio de la Renclusa', 'refugio', 42.66, 0.65),
  loc('aneto-summit', 'Aneto summit', 'summit', 42.63, 0.66),
  loc('coronas', 'Ibón de Coronas', 'water', 42.6, 0.63),
];

export const anetoHighlights: Highlight[] = [
  {
    id: 'aneto-h-mahoma',
    title: 'The Paso de Mahoma',
    body: 'The exposed knife-edge stride onto the summit block.',
  }, // TODO(copy)
  {
    id: 'aneto-h-glacier',
    title: 'The Aneto glacier',
    body: 'The largest glacier in the Pyrenees, shrinking fast.',
  }, // TODO(copy)
];

const legs: Leg[] = [
  {
    id: 'aneto-vn-l1',
    routeId: 'aneto-via-normal',
    number: 1,
    name: 'La Besurta → Renclusa (approach)',
    fromLocationId: 'la-besurta',
    toLocationId: 'renclusa',
    grade: fa('F'),
    atAGlance: peakRouteStats({ summitM: 2140, grade: fa('F'), ascentM: 230, season: 'Jul–Sep' }),
  },
  {
    id: 'aneto-vn-l2',
    routeId: 'aneto-via-normal',
    number: 2,
    name: 'Renclusa → summit (glacier + Paso de Mahoma)',
    fromLocationId: 'renclusa',
    toLocationId: 'aneto-summit',
    grade: fa('PD'),
    atAGlance: peakRouteStats({ summitM: 3404, grade: fa('PD'), ascentM: 1300, season: 'Jul–Sep' }),
  },
  {
    id: 'aneto-nf-l1',
    routeId: 'aneto-cara-norte',
    number: 1,
    name: 'La Besurta → north face base',
    fromLocationId: 'la-besurta',
    toLocationId: 'renclusa',
    atAGlance: peakRouteStats({ summitM: 2400, grade: fa('F'), ascentM: 400, season: 'Jul–Aug' }),
  },
  {
    id: 'aneto-nf-l2',
    routeId: 'aneto-cara-norte',
    number: 2,
    name: 'North face to summit',
    fromLocationId: 'renclusa',
    toLocationId: 'aneto-summit',
    grade: fa('D'),
    atAGlance: peakRouteStats({ summitM: 3404, grade: fa('D'), ascentM: 1000, season: 'Jul–Aug' }),
  },
  {
    id: 'aneto-cs-l1',
    routeId: 'aneto-cresta-salenques',
    number: 1,
    name: 'Coronas approach to the ridge',
    fromLocationId: 'coronas',
    toLocationId: 'aneto-summit',
    grade: fa('TD'),
    atAGlance: peakRouteStats({ summitM: 3404, grade: fa('TD'), ascentM: 1600, season: 'Jul–Aug' }),
  },
];

// Route stat pills are distance · ascent · time · grade (Figma 173:720), NOT the
// summit/season of the peak overview — a route carries its own distance and time.
const routeStats = (distanceKm: number, ascentM: number, hours: string, grade: Grade): Stat[] => [
  { key: 'distance', value: distanceKm, unit: 'km', label: 'Distance' },
  { key: 'ascent', value: ascentM, unit: 'm', label: 'Ascent' },
  { key: 'time', value: hours, label: 'Time' },
  { key: 'grade', value: grade.value, label: 'Grade' },
];

const summitMap: ContentBlock = {
  kind: 'map',
  geojson: { type: 'FeatureCollection', features: [] },
  styleId: 'outdoor',
  markers: [{ id: 'aneto-summit', kind: 'location', placeType: 'summit', label: 'Aneto' }],
};

const route = (
  id: string,
  name: string,
  tagline: string,
  grade: Grade,
  legIds: string[],
  stats: { distanceKm: number; ascentM: number; hours: string },
  blocks: ContentBlock[],
  highlightIds: string[] = [],
): Route => ({
  id,
  objectiveId: 'aneto',
  name,
  tagline,
  grade,
  atAGlance: routeStats(stats.distanceKm, stats.ascentM, stats.hours, grade),
  blocks,
  legIds,
  highlightIds,
});

const routes: Route[] = [
  route(
    'aneto-via-normal',
    'Vía Normal · La Renclusa',
    'The glacier route over the Paso de Mahoma — physically demanding rather than technical.', // TODO(copy)
    fa('PD'),
    ['aneto-vn-l1', 'aneto-vn-l2'],
    { distanceKm: 22, ascentM: 1530, hours: '9–11 h' },
    [
      {
        kind: 'prose',
        heading: 'Overview',
        body: 'From the Renclusa hut you cross the Aneto glacier to the Portillón, then tackle the airy Paso de Mahoma onto the summit. An alpine start, crampons, and a rope for the glacier.',
      }, // TODO(copy)
      summitMap,
      {
        kind: 'elevation',
        points: [
          { distanceKm: 0, elevM: 1900 },
          { distanceKm: 4, elevM: 2400 },
          { distanceKm: 8, elevM: 2950 },
          { distanceKm: 11, elevM: 3404 },
          { distanceKm: 15, elevM: 2700 },
          { distanceKm: 19, elevM: 2150 },
          { distanceKm: 22, elevM: 1900 },
        ],
      },
      {
        kind: 'water',
        stops: [
          { locationId: 'renclusa', distanceKm: 3, note: 'hut tap' },
          { locationId: 'aneto-summit', distanceKm: 11, note: 'none above the hut' },
        ],
      },
      { kind: 'accommodation', places: [{ locationId: 'renclusa', note: 'staffed; book ahead' }] },
      {
        kind: 'hazards',
        callouts: [
          {
            tone: 'danger',
            body: 'Crevassed glacier — rope, ice axe and crampons; a guide if unsure.',
          },
          { tone: 'warn', body: 'Paso de Mahoma is exposed — turn back in wind.' },
          { tone: 'warn', body: 'Storms build on summer afternoons — summit early.' },
        ],
      }, // TODO(copy)
      {
        kind: 'chips',
        group: 'gear',
        items: ['Crampons', 'Ice axe', 'Helmet', 'Rope', 'Harness', 'Glacier kit', 'Warm layers'],
      },
      { kind: 'itinerary', legIds: ['aneto-vn-l1', 'aneto-vn-l2'] },
      { kind: 'gallery', mediaIds: ['media/aneto/1', 'media/aneto/2', 'media/aneto/3'] },
    ],
    ['aneto-h-mahoma', 'aneto-h-glacier'],
  ),
  route(
    'aneto-cara-norte',
    'Cara Norte',
    'A steeper line on the north face — real ice, a serious day.', // TODO(copy)
    fa('D'),
    ['aneto-nf-l1', 'aneto-nf-l2'],
    { distanceKm: 18, ascentM: 1400, hours: '10–12 h' },
    [
      {
        kind: 'prose',
        heading: 'Overview',
        body: 'A steeper, more committing line up the north face — real ice and a serious day out.',
      }, // TODO(copy)
      summitMap,
      {
        kind: 'elevation',
        points: [
          { distanceKm: 0, elevM: 1950 },
          { distanceKm: 6, elevM: 2700 },
          { distanceKm: 10, elevM: 3404 },
          { distanceKm: 14, elevM: 2500 },
          { distanceKm: 18, elevM: 1950 },
        ],
      },
      { kind: 'itinerary', legIds: ['aneto-nf-l1', 'aneto-nf-l2'] },
    ],
    ['aneto-h-glacier'],
  ),
  route(
    'aneto-cresta-salenques',
    'Cresta de Salenques',
    'A long technical ridge traverse onto the summit — for the experienced.', // TODO(copy)
    fa('TD'),
    ['aneto-cs-l1'],
    { distanceKm: 24, ascentM: 1750, hours: '11–13 h' },
    [
      {
        kind: 'prose',
        heading: 'Overview',
        body: 'A long, technical ridge traverse from the Coronas valley onto the summit — for the experienced only.',
      }, // TODO(copy)
      summitMap,
      { kind: 'itinerary', legIds: ['aneto-cs-l1'] },
    ],
  ),
];

const objective: Objective = {
  id: 'aneto',
  slug: 'aneto',
  name: 'Aneto',
  type: 'peak',
  regionIds: ['aragon'],
  tagline: '3,404 m · Maladeta massif · Spain', // TODO(copy)
  heroMediaId: 'media/hero/aneto',
  summary:
    'At 3,404 m the highest summit in the Pyrenees — three ways up, from a glacier walk to a technical ridge.', // TODO(copy)
  // Peak overview leads with summit · routes · season · grade-range (Figma 307:1031),
  // not the per-route distance/ascent.
  atAGlance: [
    { key: 'summit', value: 3404, unit: 'm', label: 'Summit' },
    { key: 'routes', value: 3, label: 'Routes' },
    { key: 'season', value: 'Jul–Sep', label: 'Season' },
    { key: 'grade', value: 'F–PD', label: 'Grade' },
  ],
  guide: [
    {
      key: 'character',
      facet: 'overview',
      heading: 'The mountain',
      body: 'A big glaciated massif; the easiest line is long and high rather than hard, but the summit stride is exposed.',
    }, // TODO(copy)
    {
      key: 'when',
      facet: 'planning',
      heading: 'When to go',
      body: 'July to September, once the glacier is walkable and before autumn snow.',
    }, // TODO(copy)
    {
      key: 'conditions',
      facet: 'conditions',
      heading: 'Conditions',
      body: 'Glacier crevassing worsens through summer; the Paso de Mahoma is unforgiving in wind.',
    }, // TODO(copy)
  ],
  highlightIds: ['aneto-h-mahoma', 'aneto-h-glacier'],
  routeIds: ['aneto-via-normal', 'aneto-cara-norte', 'aneto-cresta-salenques'],
};

export const anetoPack: PeakPack = { objective, routes, legs };
