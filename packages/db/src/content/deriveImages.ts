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
  highlights?: { id: string; title: string }[];
}

// The leading place name in a highlight title — "Lac de Gaube and the Vignemale" → "Lac de
// Gaube"; "Pic du Canigou (2,784 m), …" → "Pic du Canigou".
const coreName = (title: string) => title.split(/,|\(| and | & |—|:|&amp;/)[0]?.trim() ?? title;

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

// Picture-reel terms for the Environment tab (Figma 04c) — three images per lens, so each of
// Flora & fauna / Culture / History gets a horizontal reel. Pyrenees-generic (both trails).
const ENV_REEL: { topic: string; terms: string[] }[] = [
  {
    topic: 'flora',
    terms: [
      'Pyrenees beech forest',
      'Pyrenean chamois izard',
      'Pyrenees alpine meadow wildflowers',
    ],
  },
  {
    topic: 'culture',
    terms: [
      'Pyrenees Romanesque church',
      'Pyrenees stone mountain village',
      'Pyrenees shepherd flock pasture',
    ],
  },
  {
    topic: 'history',
    terms: ['Pyrenees mountain pass', 'Pyrenees mule track trail', 'Pyrenees mountain refuge hut'],
  },
];

export function deriveEnvImageQueries(trailId: string): ImageQuery[] {
  return ENV_REEL.flatMap(({ topic, terms }) =>
    terms.map((term, i) => ({ mediaId: `media/env/${trailId}-${topic}-${i + 1}`, term })),
  );
}

// A highlight is a named place/feature — well-covered on Commons.
export function deriveHighlightImageQueries(trailId: string): ImageQuery[] {
  const pack = JSON.parse(readFileSync(SEED, 'utf8')) as Pack;
  return (pack.highlights ?? [])
    .filter((h) => h.id.startsWith(`${trailId}-`))
    .map((h) => ({
      mediaId: `media/highlight/${h.id}`,
      term: `${coreName(h.title)} Pyrenees`.trim(),
    }))
    .filter((q) => q.term.length > 10);
}
