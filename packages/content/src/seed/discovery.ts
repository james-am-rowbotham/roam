// Discovery geography seed (Phase 2). Regions are the SEO-recognisable areas under
// a Country (invariant 3); objectives reference them, are never owned by them.
//
// NOTE: §13 open decision — the GR11 sections reference 5 regions (Basque Country,
// Navarre, Aragon, Catalonia, Cap de Creus) while the Spain page mock shows 3 example
// region cards. We seed all 5 here so no `regionId` dangles; reconciling which regions
// the discovery layer surfaces is a human decision, not resolved here.
//
// All prose is placeholder in the §9 voice — TODO(copy).

import type { Continent, Country, Region } from '../types';

export const continents: Continent[] = [
  {
    id: 'europe',
    slug: 'europe',
    name: 'Europe',
    tagline: 'Where the long trails run', // TODO(copy)
    heroMediaId: 'media/hero/europe',
    summary: 'Mountain ranges stacked across a continent — the Pyrenees, the Alps, the far north.', // TODO(copy)
  },
];

export const countries: Country[] = [
  {
    id: 'spain',
    slug: 'spain',
    name: 'Spain',
    continentId: 'europe',
    tagline: 'A coast that gives way quickly to mountains', // TODO(copy)
    heroMediaId: 'media/hero/spain',
    summary:
      'The Spanish side of the Pyrenees rises from the Atlantic and runs east to the Mediterranean.', // TODO(copy)
  },
];

const region = (id: string, name: string, tagline: string, summary: string): Region => ({
  id,
  slug: id,
  name,
  countryId: 'spain',
  tagline,
  heroMediaId: `media/hero/${id}`,
  summary,
});

export const regions: Region[] = [
  region(
    'basque-country',
    'Basque Country',
    'Green hills and sea mist',
    'Atlantic foothills where the range begins, lower and wetter than the high country to come.',
  ), // TODO(copy)
  region(
    'navarre',
    'Navarre',
    'Beech forest and the first high cols',
    'Forested ridges climbing toward the first passes above the treeline.',
  ), // TODO(copy)
  region(
    'aragon',
    'Aragon',
    'The high heart of the range',
    'The Aragonese Pyrenees hold the highest ground — Monte Perdido, Aneto, the great limestone and granite massifs.',
  ), // TODO(copy)
  region(
    'catalonia',
    'Catalonia',
    'Granite lakes and the highest passes',
    'A maze of granite, tarns and high passes on the eastern stretch.',
  ), // TODO(copy)
  region(
    'cap-de-creus',
    'Cap de Creus',
    'Down through the Albera to the sea',
    'The final descent off the range, through the Albera massif to the Mediterranean coast.',
  ), // TODO(copy)
];
