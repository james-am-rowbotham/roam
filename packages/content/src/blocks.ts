// ContentBlock — the renderer's single source of truth (Implementation Pass §8).
// Stage bodies and Route-detail bodies are a ContentBlock[] rendered by ONE renderer
// that switches on `kind`. New content types are new `kind`s, never new screens.
//
// `marking`/waymark symbols and marker `placeType`s resolve from the vocab registry
// (./registries), never a baked enum.

import type { Coords } from './types';

/** A point to mark on a `map` block — a reference to a shared Location/POI (by id)
 *  or a raw coord, tagged with an open `placeType` key that drives icon + colour. */
export interface MarkerRef {
  id?: string;
  kind?: 'location' | 'poi';
  coords?: Coords;
  /** Open vocab — a key into the placeTypes registry. */
  placeType: string;
  label?: string;
}

export type StatusTone = 'success' | 'warn' | 'danger' | 'info';

export type ContentBlock =
  | { kind: 'prose'; heading?: string; body: string }
  | { kind: 'map'; geojson: GeoJSON.FeatureCollection; styleId: string; markers: MarkerRef[] }
  | {
      kind: 'elevation';
      points: { distanceKm: number; elevM: number }[];
      /** single = a stage/route (silhouette) · multiDay = a section/whole trail (columns). */
      variant?: 'single' | 'multiDay';
    }
  | {
      kind: 'water';
      header?: string;
      stops: { locationId: string; distanceKm: number; note?: string }[];
    }
  | { kind: 'accommodation'; header?: string; places: import('./types').PlaceRef[] }
  | { kind: 'navigation'; body: string; marking?: string }
  | { kind: 'hazards'; header?: string; callouts: { tone: StatusTone; body: string }[] }
  | { kind: 'gallery'; mediaIds: string[] }
  | { kind: 'highlights'; highlightIds: string[]; header?: string }
  | {
      kind: 'whatYouSee';
      kicker: string;
      title: string;
      body: string;
      source?: string;
      mediaId?: string;
    }
  | { kind: 'chips'; group: 'gear' | 'conditions'; items: string[] }
  | { kind: 'itinerary'; legIds: string[] }
  // A difficulty gauge — `level` of `total` segments filled (Figma 1053:2441).
  | { kind: 'difficulty'; label: string; level: number; total: number; note?: string }
  // A best-season strip — `best` month numbers (1–12) highlighted (Figma SeasonStrip 993:152).
  | { kind: 'season'; best: number[]; note?: string }
  // A 2–4 up numeric strip — big mono value + small label (Figma Overview 1050:2369).
  | { kind: 'statStrip'; stats: { value: string; label: string }[] };

/** Every renderable `kind`, for exhaustiveness checks in the renderer + fixtures. */
export type ContentBlockKind = ContentBlock['kind'];
