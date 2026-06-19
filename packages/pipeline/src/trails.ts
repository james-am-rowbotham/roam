// THE per-trail registry (§8) — one descriptor per trail, the single source of truth that
// every other config derives from. Adding a trail is ONE entry here (+ its etapas data file
// + a country in geography.ts if new + a ways cache). The scattered configs — PackConfig
// (pack/config.ts), SeedConfig (db/seedConfigs.ts), TrailContentConfig (db/content/trails.ts)
// — are now thin derivations of this, so trail metadata lives in exactly one place.

import { GR10, GR11, type TrailConfig } from './config';
import { GR10_ETAPAS, GR11_ETAPAS, type Gr11Etapa } from './etapas';

/** A coarse region (§5) owning an inclusive range of etapas up to `untilStage`. */
export interface RegionDef {
  name: string;
  description: string;
  untilStage: number;
}

/** An editorial image to source: `scope` is '' for the objective hero, else a section's
 *  region slug (the bit after `<trailId>-`). */
export interface TrailImageTerm {
  scope: string;
  term: string;
}

export interface TrailDef {
  /** OSM/corridor config (geometry, bbox, ref, waymark). */
  trail: TrailConfig;
  /** Discovery country id (geography.ts). */
  countryId: string;
  /** Discovery mountain-range id — the cross-country browse axis (geography.ts). */
  rangeId: string;
  /** Objective hero/summary copy. */
  tagline: string;
  summary: string;
  /** Descriptive name + context for content generation (the Guide writer's brief). */
  objectiveName: string;
  context: string;
  season: { best: number[]; note: string };
  /** Structural-ingest inputs. */
  etapas: readonly Gr11Etapa[];
  regions: RegionDef[];
  ascentM: number;
  waysFile: string;
  relationFile?: string;
  /** Image search terms (objective + per-region), license-gated sourcing. */
  imageTerms: TrailImageTerm[];
}

export const TRAIL_DEFS: Record<string, TrailDef> = {
  gr11: {
    trail: GR11,
    countryId: 'spain',
    rangeId: 'pyrenees',
    tagline: 'Pyrenees High Route · Spain',
    summary:
      'The Senda Pirenaica traces the Spanish Pyrenees coast to coast — from Hondarribia on the Atlantic to Cap de Creus on the Mediterranean, waymarked red-and-white the whole way.',
    objectiveName: 'the GR11 (Senda Pirenaica)',
    context:
      'Crosses the Basque Country, Navarre, Aragon (Ordesa y Monte Perdido), the Pallars/Aigüestortes high country, Andorra, and Catalonia. Best walked July–September. Waymarked with red-and-white GR blazes.',
    season: {
      best: [7, 8, 9],
      note: 'Mid-June to mid-September; July and August are the most reliable. The high cols hold snow into early summer.',
    },
    etapas: GR11_ETAPAS,
    ascentM: 47_000,
    waysFile: 'gr11-ways.json',
    relationFile: 'gr11-relation.json',
    regions: [
      {
        name: 'Basque Country & Navarre',
        description: 'From Cabo Higuer, passing through forests and coastal hills.',
        untilStage: 8,
      },
      {
        name: 'Aragonese Pyrenees',
        description:
          'Higher, rugged alpine terrain, passing through locations like Candanchú and the Respomuso Hut.',
        untilStage: 15,
      },
      {
        name: 'Ordesa & High Country',
        description:
          'Includes the scenic Ordesa National Park and the high limestone, passing through Góriz and Viadós.',
        untilStage: 22,
      },
      {
        name: 'Andorra & Pallars High Country',
        description:
          'Traverses granite landscapes in Andorra and the Catalan Pyrenees, including areas like Colomèrs.',
        untilStage: 34,
      },
      {
        name: 'Eastern Pyrenees',
        description:
          'Descending through forests and valleys towards the Mediterranean coast at Cap de Creus.',
        untilStage: 46,
      },
    ],
    imageTerms: [
      { scope: '', term: 'Pyrenees mountains Spain landscape' },
      { scope: 'basque-country-navarre', term: 'Selva de Irati beech forest' },
      { scope: 'aragonese-pyrenees', term: 'Panticosa Tena valley Pyrenees' },
      { scope: 'ordesa-high-country', term: 'Ordesa Monte Perdido valley' },
      { scope: 'andorra-pallars-high-country', term: 'Aiguestortes Sant Maurici lake' },
      { scope: 'eastern-pyrenees', term: 'Cap de Creus cape' },
    ],
  },

  gr10: {
    trail: GR10,
    countryId: 'france',
    rangeId: 'pyrenees',
    tagline: 'The French Pyrenean traverse · France',
    summary:
      'La Grande Traversée des Pyrénées follows the green French flank of the range coast to coast — Hendaye on the Atlantic to Banyuls-sur-Mer on the Mediterranean, village to village, waymarked red-and-white.',
    objectiveName: 'the GR10 (La Grande Traversée des Pyrénées)',
    context:
      'Runs along the north (French) flank through the Pays Basque, Haut-Béarn, Bigorre, the Luchonnais, the Couserans and Haute-Ariège, into the Catalan Pyrenees to the Mediterranean. Lower, greener and wetter than the GR11, with more village stages. Generally walked June–September. Red-and-white GR blazes.',
    season: {
      best: [7, 8, 9],
      note: 'June to September; lower and wetter than the Spanish side, with reliable village stages. Snow lingers on the high cols into early summer.',
    },
    etapas: GR10_ETAPAS,
    ascentM: 55_000,
    waysFile: 'gr10-ways.json',
    relationFile: 'gr10-relation.json',
    regions: [
      {
        name: 'Pays Basque',
        description: 'Green Atlantic foothills from Hendaye through the Basque country.',
        untilStage: 9,
      },
      {
        name: 'Haut-Béarn',
        description: 'The Aspe and Ossau valleys into the first high country.',
        untilStage: 15,
      },
      {
        name: 'Bigorre',
        description: 'Cauterets, Gavarnie and the high Hautes-Pyrénées.',
        untilStage: 23,
      },
      {
        name: 'Luchonnais',
        description: 'The Louron and Larboust valleys around Luchon.',
        untilStage: 29,
      },
      {
        name: 'Couserans',
        description: 'The remote western Ariège — Biros, Bethmale and Bassiès.',
        untilStage: 37,
      },
      {
        name: 'Haute-Ariège',
        description: 'The high eastern Ariège to the Carlit and Bouillouses.',
        untilStage: 46,
      },
      {
        name: 'Catalan Pyrenees',
        description: 'Cerdagne, Canigou and the descent to the Mediterranean at Banyuls.',
        untilStage: 55,
      },
    ],
    imageTerms: [
      { scope: '', term: 'Pyrenees France mountains landscape' },
      { scope: 'pays-basque', term: 'La Rhune Pays Basque mountains' },
      { scope: 'haut-bearn', term: 'Cirque de Lescun Pyrenees' },
      { scope: 'bigorre', term: 'Cauterets Pont d Espagne Pyrenees' },
      { scope: 'luchonnais', term: 'Lac d Oo Pyrenees' },
      { scope: 'couserans', term: 'Mont Valier Couserans Pyrenees' },
      { scope: 'haute-ariege', term: 'Etang de Bassies Ariege Pyrenees' },
      { scope: 'catalan-pyrenees', term: 'Canigou massif Pyrenees' },
    ],
  },
};

export function trailDef(id: string): TrailDef {
  const d = TRAIL_DEFS[id];
  if (!d) throw new Error(`No trail def for "${id}" — add an entry to trails.ts`);
  return d;
}
