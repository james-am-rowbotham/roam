// Derive section specs from the built structural pack (§8) — so a new trail needs no
// hand-authored section list. After ingest + pack:build, every section's id/name/stage
// range is known, and the "places" hint comes from the towns the section's stages link.
// The content runner uses the registry's hand specs when present, else these.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SectionSpec } from './specs';

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

interface PackStage {
  sectionId: string;
  number: number;
  fromLocationId: string;
  toLocationId: string;
}
interface PackSection {
  id: string;
  name: string;
}
interface Pack {
  trails: { objective: { id: string }; sections: PackSection[]; stages: PackStage[] }[];
  locations: { id: string; name: string }[];
}

export function deriveSectionSpecs(trailId: string): SectionSpec[] {
  const pack = JSON.parse(readFileSync(SEED, 'utf8')) as Pack;
  const trail = pack.trails.find((t) => t.objective.id === trailId);
  if (!trail) {
    throw new Error(
      `Trail "${trailId}" not in the structural pack — run db:seed + pack:build first`,
    );
  }
  const loc = new Map(pack.locations.map((l) => [l.id, l.name]));
  return trail.sections.map((s) => {
    const stages = trail.stages
      .filter((st) => st.sectionId === s.id)
      .sort((a, b) => a.number - b.number);
    const nums = stages.map((st) => st.number);
    const towns = [
      ...new Set(
        stages
          .flatMap((st) => [loc.get(st.fromLocationId), loc.get(st.toLocationId)])
          .filter((n): n is string => Boolean(n)),
      ),
    ];
    return {
      id: s.id,
      name: s.name,
      stages: nums.length ? `stages ${Math.min(...nums)}–${Math.max(...nums)}` : 'stages',
      places: towns.slice(0, 8).join(', '),
    };
  });
}
