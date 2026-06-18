// Shared discovery geography (Implementation Pass §12.3) — Continents and Countries
// are shared across trails; per-trail configs reference a country by id. Regions are
// derived from each trail's coarse regions (buildDiscovery), so they self-populate as
// trails are added. Editorial copy is placeholder — TODO(copy).

import type { Continent, Country } from '@roam/content';

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
];
