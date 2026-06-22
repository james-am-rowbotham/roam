// Migrate the JSON content cache → content_blocks (P1, docs/content-pipeline.md). Idempotent +
// override-safe (clears only non-manual_override rows, then re-inserts).
//
//   bun run --filter @roam/db content:sync-db           # all trails
//   bun run --filter @roam/db content:sync-db gr11      # one trail

import { PACK_CONFIGS } from '@roam/pipeline';
import { writeTrailContent } from '../pack/content-db';
import { loadContent } from './cache';

const only = process.argv[2];
const configs = PACK_CONFIGS.filter((c) => c.type === 'trail' && (!only || c.id === only));
if (!configs.length) throw new Error(`No trail config for "${only}"`);

for (const config of configs) {
  const content = loadContent(config.id);
  const n = await writeTrailContent(config, content);
  console.log(`${config.id}: ${n} content_blocks rows written`);
}

console.log('\nContent → DB sync complete ✓  — build with CONTENT_SOURCE=db to read it back.');
process.exit(0);
