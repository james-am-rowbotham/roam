// Derive per-stage image queries from the built pack (§21.4) — each stage's destination is
// its most image-worthy place. Cleaned of refuge/gîte prefixes to improve Commons hits;
// misses just fall back to the section hero in the app. No hand-authored per-stage terms.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ImageQuery } from './images';

const SEED = join(
  import.meta.dir,
  '..',
  '..',
  '..',
  '..',
  'apps',
  'mobile',
  'assets',
  'content',
  'seed.json',
);

interface Pack {
  trails: { objective: { id: string }; stages: { id: string; toLocationId: string }[] }[];
  locations: { id: string; name: string }[];
}

// Strip the leading accommodation-type words so "Refuge des Bésines" → "Bésines".
const place = (name: string) =>
  name
    .replace(
      /^(Refug(e|io)|G[îi]te d['’ ]?étape|Chalet(-refuge)?|Cabane|Balneario|Santuari[oa]|Ref\.?)\s+(de\s+|des\s+|du\s+|d['’]\s*|la\s+)?/i,
      '',
    )
    .trim();

export function deriveStageImageQueries(trailId: string): ImageQuery[] {
  const pack = JSON.parse(readFileSync(SEED, 'utf8')) as Pack;
  const trail = pack.trails.find((t) => t.objective.id === trailId);
  if (!trail) return [];
  const loc = new Map(pack.locations.map((l) => [l.id, l.name]));
  return trail.stages
    .map((s) => ({
      mediaId: `media/hero/${s.id}`,
      term: `${place(loc.get(s.toLocationId) ?? '')} Pyrenees`.trim(),
    }))
    .filter((q) => q.term.length > 10);
}
