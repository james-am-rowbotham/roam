// Vocab registries (Implementation Pass §5.1) — closed Pyrenees-specific enums
// become open lookups. Adding `glacier`/`col`/a non-European waymark must touch
// zero core types: it's a new registry entry, nothing else.
//
// `colorToken` is a dotted path into the app theme (apps/mobile/theme) — resolved
// by the component, never a hex here. `icon` is a lucide-react-native icon name.

import type { Grade } from './types';

export interface PlaceTypeEntry {
  key: string;
  label: string;
  icon: string;
  colorToken: string;
}

export interface MarkingEntry {
  key: string;
  label: string;
  colorToken: string;
}

export interface GradeSystem {
  id: string;
  scale: string[];
}

// Place types — Location/POI `type` and map MarkerRef `placeType` resolve here for
// label, icon, and marker colour. Markers never use the accent (§7.2).
export const placeTypes: Record<string, PlaceTypeEntry> = {
  town: { key: 'town', label: 'Town', icon: 'house', colorToken: 'text.secondary' },
  refuge: { key: 'refuge', label: 'Refuge', icon: 'tent', colorToken: 'marker.refuge' },
  refugio: { key: 'refugio', label: 'Refugio', icon: 'tent', colorToken: 'marker.refuge' },
  viewpoint: { key: 'viewpoint', label: 'Viewpoint', icon: 'eye', colorToken: 'marker.viewpoint' },
  water: { key: 'water', label: 'Water', icon: 'droplet', colorToken: 'marker.water' },
  historic: { key: 'historic', label: 'Historic', icon: 'landmark', colorToken: 'marker.historic' },
  food: { key: 'food', label: 'Food', icon: 'utensils', colorToken: 'marker.food' },
  pass: { key: 'pass', label: 'Pass', icon: 'mountain', colorToken: 'trail.sl' },
  col: { key: 'col', label: 'Col', icon: 'mountain', colorToken: 'trail.sl' },
  summit: { key: 'summit', label: 'Summit', icon: 'triangle', colorToken: 'text.primary' },
  glacier: { key: 'glacier', label: 'Glacier', icon: 'snowflake', colorToken: 'marker.water' },
};

// Waymark / route markings — colour mirrors the blaze palette (§7.2 trail.*).
export const markings: Record<string, MarkingEntry> = {
  gr: { key: 'gr', label: 'GR (red/white)', colorToken: 'trail.gr' },
  pr: { key: 'pr', label: 'PR (yellow/white)', colorToken: 'trail.pr' },
  sl: { key: 'sl', label: 'SL (green/white)', colorToken: 'trail.sl' },
  cairned: { key: 'cairned', label: 'Cairned', colorToken: 'text.secondary' },
  unmarked: { key: 'unmarked', label: 'Unmarked', colorToken: 'text.secondary' },
};

// Grade systems — the badge reads `scale` to position a value on its scale.
export const gradeSystems: Record<string, GradeSystem> = {
  'hiking-band': { id: 'hiking-band', scale: ['easy', 'moderate', 'hard', 'severe'] },
  'french-alpine': { id: 'french-alpine', scale: ['F', 'PD', 'AD', 'D', 'TD', 'ED'] },
};

// ── Resolver helpers ────────────────────────────────────────────────────────

/** Resolve a grade to its scale + the value's position, for the badge (§3/§7.3).
 *  Returns index -1 when the value isn't on the system's scale (still renderable). */
export function gradeScale(grade: Grade): { scale: string[]; index: number } {
  const system = gradeSystems[grade.system];
  if (!system) throw new Error(`unknown grade system: "${grade.system}"`);
  return { scale: system.scale, index: system.scale.indexOf(grade.value) };
}

/** The theme color token for a place type's marker. Unknown types fall back to
 *  text.primary rather than throwing — an unmapped POI still renders. */
export function markerColorToken(type: string): string {
  return placeTypes[type]?.colorToken ?? 'text.primary';
}

/** The theme color token for a waymark/marking. */
export function markingColorToken(key: string): string {
  return markings[key]?.colorToken ?? 'text.secondary';
}
