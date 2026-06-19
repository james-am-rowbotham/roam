// Per-trail content config (§8/§21) — DERIVED from the single trail registry
// (@roam/pipeline TRAIL_DEFS). Holds the objective spec (Planning/Environment generation)
// and the image search terms; section specs are optional (hand-curated for GR11, else
// derived from the structural pack by deriveSpecs.ts). The runners are trail-id driven.

import { TRAIL_DEFS } from '@roam/pipeline';
import type { ImageQuery } from './images';
import { GR11_SECTIONS, type SectionSpec } from './specs';

export interface ObjectiveSpec {
  name: string;
  summary: string;
  context?: string;
}

export interface TrailContentConfig {
  id: string;
  objective: ObjectiveSpec;
  /** Optional — when omitted, section specs derive from the structural pack. */
  sections?: SectionSpec[];
  images: ImageQuery[];
}

// Hand-curated section place-hints (better than derived) for flagship trails.
const HAND_SECTIONS: Record<string, SectionSpec[]> = { gr11: GR11_SECTIONS };

export const TRAILS: Record<string, TrailContentConfig> = Object.fromEntries(
  Object.values(TRAIL_DEFS).map((d) => {
    const id = d.trail.id;
    return [
      id,
      {
        id,
        objective: { name: d.objectiveName, summary: d.summary, context: d.context },
        sections: HAND_SECTIONS[id],
        images: d.imageTerms.map(
          (t): ImageQuery => ({
            mediaId: t.scope ? `media/hero/${id}-${t.scope}` : `media/hero/${id}`,
            term: t.term,
          }),
        ),
      },
    ];
  }),
);

export function getTrailContent(id: string): TrailContentConfig {
  const t = TRAILS[id];
  if (!t)
    throw new Error(`No content config for trail "${id}" — add it to @roam/pipeline trails.ts`);
  return t;
}

/** The trail id from CLI args (first non-flag arg), defaulting to gr11. */
export function trailIdFromArgs(argv: string[]): string {
  return argv.slice(2).find((a) => !a.startsWith('-')) ?? 'gr11';
}
