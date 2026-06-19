// Per-trail content registry — the "config row" for the content pipeline (§8). Holds the
// objective spec (for Planning/Environment generation) and the image search terms per
// trail. Section specs are OPTIONAL here: if absent, they're derived from the built
// structural pack (deriveSpecs.ts), so a new trail needs no hand-authored section list.
//
// Adding a trail = one entry here + its OSM config + etapas. The runners are trail-id
// driven (`pack:content <id>`, `pack:images <id>`, `pack:onboard <id>`).

import type { ImageQuery } from './images';
import { GR11_OBJECTIVE, GR11_SECTIONS, type SectionSpec } from './specs';

export interface ObjectiveSpec {
  name: string;
  summary: string;
  context?: string;
}

export interface TrailContentConfig {
  id: string;
  objective: ObjectiveSpec;
  /** Optional — when omitted, section specs are derived from the structural pack. */
  sections?: SectionSpec[];
  images: ImageQuery[];
}

export const TRAILS: Record<string, TrailContentConfig> = {
  gr11: {
    id: 'gr11',
    objective: GR11_OBJECTIVE,
    sections: GR11_SECTIONS, // hand-curated place hints; could be derived too
    images: [
      { mediaId: 'media/hero/gr11', term: 'Pyrenees mountains Spain landscape' },
      { mediaId: 'media/hero/aneto', term: 'Aneto Pyrenees summit' },
      { mediaId: 'media/hero/gr11-basque-country-navarre', term: 'Selva de Irati beech forest' },
      { mediaId: 'media/hero/gr11-aragonese-pyrenees', term: 'Panticosa Tena valley Pyrenees' },
      { mediaId: 'media/hero/gr11-ordesa-high-country', term: 'Ordesa Monte Perdido valley' },
      {
        mediaId: 'media/hero/gr11-andorra-pallars-high-country',
        term: 'Aiguestortes Sant Maurici lake',
      },
      { mediaId: 'media/hero/gr11-eastern-pyrenees', term: 'Cap de Creus cape' },
    ],
  },

  // Second trail (skeleton) — proves the pipeline is config-driven. Section specs derive
  // from the pack once GR10 is ingested; image terms are the only per-region hint needed.
  gr10: {
    id: 'gr10',
    objective: {
      name: 'the GR10 (Sentier des Pyrénées)',
      summary:
        'the French coast-to-coast traverse of the Pyrenees, from Hendaye on the Atlantic to Banyuls-sur-Mer on the Mediterranean — roughly 900 km over ~50+ stages.',
      context:
        'Runs along the north (French) flank of the range through the Pays Basque, Béarn, Bigorre, the Couserans, Ariège, and Catalonia. Generally walked June–September. Waymarked with red-and-white GR blazes; lower and wetter than the HRP, with more villages.',
    },
    images: [{ mediaId: 'media/hero/gr10', term: 'Pyrenees France mountains landscape' }],
  },
};

export function getTrailContent(id: string): TrailContentConfig {
  const t = TRAILS[id];
  if (!t) throw new Error(`No content config for trail "${id}" — add an entry to trails.ts`);
  return t;
}

/** The trail id from CLI args (first non-flag arg), defaulting to gr11. */
export function trailIdFromArgs(argv: string[]): string {
  return argv.slice(2).find((a) => !a.startsWith('-')) ?? 'gr11';
}
