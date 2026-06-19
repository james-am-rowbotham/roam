// Shared discovery geography (Implementation Pass §12.3) — Continents and Countries
// are shared across trails; per-trail configs reference a country by id. Regions are
// derived from each trail's coarse regions (buildDiscovery), so they self-populate as
// trails are added. Editorial copy is placeholder — TODO(copy).

import type { Continent, Country, Range } from '@roam/content';

export const CONTINENTS: Continent[] = [
  {
    id: 'europe',
    slug: 'europe',
    name: 'Europe',
    tagline: 'Where the long trails run',
    heroMediaId: 'media/hero/europe',
    summary: 'Mountain ranges stacked across a continent — the Pyrenees, the Alps, the far north.',
  },
];

export const COUNTRIES: Country[] = [
  {
    id: 'spain',
    slug: 'spain',
    name: 'Spain',
    continentId: 'europe',
    tagline: 'From the Pyrenees to the Picos',
    heroMediaId: 'media/hero/spain',
    summary:
      'Spain runs from the green, Atlantic-washed north to the dry sierras of the south, with the Pyrenees a 400 km mountain wall along the French border.',
  },
  {
    id: 'france',
    slug: 'france',
    name: 'France',
    continentId: 'europe',
    tagline: 'The north flank of the Pyrenees',
    heroMediaId: 'media/hero/france',
    summary:
      'France meets the Pyrenees along their wetter, greener northern flank — the Pays Basque, the high Béarn and Bigorre, and the long descent through the Ariège to the Mediterranean.',
  },
];

// Mountain ranges — the geographic discovery axis that cross-cuts countries (§ "explore by
// range"). Objectives carry a `rangeId`; the Pyrenees gather Spain's GR11, France's GR10
// and the peaks. New ranges (Alps, Picos…) are a row here + a `rangeId` on each trail def.
export const RANGES: Range[] = [
  {
    id: 'pyrenees',
    slug: 'pyrenees',
    name: 'Pyrenees',
    continentId: 'europe',
    tagline: 'Atlantic to Mediterranean, Spain to France',
    heroMediaId: 'media/hero/pyrenees',
    summary:
      'A 430 km wall between France and Spain, from the green Atlantic west to the dry Mediterranean east — walked end to end by the GR11 on the Spanish side, the GR10 on the French, and the high HRP between them.',
  },
];
