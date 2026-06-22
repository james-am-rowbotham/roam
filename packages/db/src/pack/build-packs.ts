// Pack build runner — reads each configured trail's knowledge from Postgres, runs the
// pure builder, assembles one seed, VALIDATES it with the app's own importer, and writes
// the JSON the app bundles. Validation before write means a malformed pack never ships.
//
//   bun run --filter @roam/db pack:build

import { mkdirSync, writeFileSync } from 'node:fs';
import {
  type PeakPack,
  type SeedInput,
  anetoHighlights,
  anetoLocations,
  anetoPack,
  importPacks,
} from '@roam/content';
import {
  CONTINENTS,
  COUNTRIES,
  PACK_CONFIGS,
  RANGES,
  assembleSeed,
  buildTrailPack,
} from '@roam/pipeline';
import { loadContent } from '../content/cache';
import { readTrailContent } from './content-db';
import { readKnowledge } from './readKnowledge';

// Editorial content source: `db` reads content_blocks (the target, P1), `file` (default) reads
// the JSON cache. Both feed the same pure builder, so the pack is identical either way.
const contentSource = process.env.CONTENT_SOURCE === 'db' ? 'db' : 'file';

const built = [];
for (const config of PACK_CONFIGS.filter((c) => c.type === 'trail')) {
  console.log(`Reading ${config.id} from Postgres… (content: ${contentSource})`);
  const knowledge = await readKnowledge(config);
  const content = contentSource === 'db' ? await readTrailContent(config) : loadContent(config.id);
  const sections = Object.keys(content.sectionGuide ?? {}).length;
  const contentNote = sections ? ` · content for ${sections} sections` : '';
  console.log(
    `  ${knowledge.stages.length} etapas · ${knowledge.regions.length} regions · ${Math.round(knowledge.lengthM / 1000)} km${contentNote}`,
  );
  built.push(buildTrailPack(config, knowledge, content));
}

const trailSeed = assembleSeed(CONTINENTS, COUNTRIES, RANGES, built);

// Fold in the hand-authored Aneto peak until the peak pipeline lands, remapped onto a
// generated GR11 region slug + the Pyrenees range so discovery aggregates it with the trails.
const aneto: PeakPack = {
  ...anetoPack,
  objective: { ...anetoPack.objective, regionIds: ['aragonese-pyrenees'], rangeId: 'pyrenees' },
};
const seed: SeedInput = {
  ...trailSeed,
  locations: [...trailSeed.locations, ...anetoLocations],
  highlights: [...trailSeed.highlights, ...anetoHighlights],
  peaks: [aneto],
};

// The same validator the app uses — throws (with the full dangling-ref list) on a bad pack.
importPacks(seed);

// Write the pack the app bundles (later: this same JSON downloads into the local store).
const outDir = `${import.meta.dir}/../../../../apps/mobile/assets/content`;
mkdirSync(outDir, { recursive: true });
writeFileSync(`${outDir}/seed.json`, JSON.stringify(seed, null, 2));

console.log(
  `\n✓ Wrote apps/mobile/assets/content/seed.json — ${seed.trails.length} trail · ${seed.peaks.length} peak · ` +
    `${seed.regions.length} regions · ${seed.trails.reduce((n, t) => n + t.stages.length, 0)} stages · ${seed.locations.length} locations`,
);
process.exit(0);
