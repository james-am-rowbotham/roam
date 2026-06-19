// Image sourcing runner — `bun run pack:images`. Sources a license-safe hero image per
// scope (objective, peak, each section) from Wikimedia Commons and writes them into the
// content cache's `media` map. Idempotent (skips already-sourced ids unless `--force`).
// No API key needed — Commons is open. Then run `pack:build` to fold media into the pack.

import { loadContent, saveContent } from './cache';
import { sourceImage } from './images';
import { getTrailContent, trailIdFromArgs } from './trails';

// Image search terms come from the trail registry (mediaId matches heroMediaId).
const trailId = trailIdFromArgs(process.argv);
const QUERIES = getTrailContent(trailId).images;

const force = process.argv.includes('--force');
const existing = loadContent(trailId);
const media: NonNullable<typeof existing.media> = { ...(existing.media ?? {}) };

console.log(`Image sourcing — ${trailId} (Wikimedia Commons)${force ? ' --force' : ''}\n`);
for (const q of QUERIES) {
  if (media[q.mediaId] && !force) {
    console.log(`  skip  ${q.mediaId}`);
    continue;
  }
  process.stdout.write(`  src   ${q.mediaId} … `);
  try {
    const asset = await sourceImage(q);
    if (!asset) {
      console.log('NONE (no free-licensed match)');
      continue;
    }
    media[q.mediaId] = asset;
    console.log(`${asset.width}×${asset.height} · ${asset.license} · ${asset.author.slice(0, 32)}`);
  } catch (err) {
    console.log(`FAILED — ${(err as Error).message}`);
  }
}

saveContent(trailId, { ...existing, media });
console.log(`\n✓ wrote ${Object.keys(media).length} media → packages/db/content/${trailId}.json`);
