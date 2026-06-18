// The bundled seed (Phase 2) — assembles discovery + shared entities + the GR11 and
// Aneto packs into one SeedInput for the importer. These typed packs are the stand-in
// for bundled JSON content packs; they serialize to that JSON 1:1.

import type { SeedInput } from '../importer';
import { anetoHighlights, anetoLocations, anetoPack } from './aneto';
import { continents, countries, regions } from './discovery';
import { gr11Highlights, gr11Locations, gr11Pack } from './gr11';

export const seed: SeedInput = {
  continents,
  countries,
  regions,
  locations: [...gr11Locations, ...anetoLocations],
  pois: [],
  highlights: [...gr11Highlights, ...anetoHighlights],
  trails: [gr11Pack],
  peaks: [anetoPack],
};

export { continents, countries, regions } from './discovery';
export { gr11Pack } from './gr11';
export { anetoPack } from './aneto';
