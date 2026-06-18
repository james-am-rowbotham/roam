// Stat builders (Implementation Pass §4) — `atAGlance` stays `Stat[]` everywhere so
// one stat-pill component renders every screen. These typed helpers protect authoring
// ergonomics (esp. the 47-stage surface) without typing the field. Headline stats
// differ by objective type — a trail leads with distance; a peak has no distance.

import type { Grade, Stat } from './types';

/** A trail stage's at-a-glance row: distance · ascent · descent · time · grade (§12.4). */
export const trailStageStats = (a: {
  distanceKm: number;
  ascentM: number;
  descentM: number;
  hours: string;
  grade: Grade;
}): Stat[] => [
  { key: 'distance', value: a.distanceKm, unit: 'km', label: 'Distance' },
  { key: 'ascent', value: a.ascentM, unit: 'm', label: 'Ascent' },
  { key: 'descent', value: a.descentM, unit: 'm', label: 'Descent' },
  { key: 'time', value: a.hours, label: 'Time' },
  { key: 'grade', value: a.grade.value, label: 'Grade' },
];

/** A peak route's at-a-glance row: summit · grade · ascent · season — no distance (§12). */
export const peakRouteStats = (a: {
  summitM: number;
  grade: Grade;
  ascentM: number;
  season: string;
}): Stat[] => [
  { key: 'summit', value: a.summitM, unit: 'm', label: 'Summit' },
  { key: 'grade', value: a.grade.value, label: 'Grade' },
  { key: 'ascent', value: a.ascentM, unit: 'm', label: 'Ascent' },
  { key: 'season', value: a.season, label: 'Season' },
];
