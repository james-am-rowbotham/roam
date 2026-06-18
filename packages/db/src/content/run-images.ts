// Image sourcing runner — `bun run pack:images`. Sources a license-safe hero image per
// scope (objective, peak, each section) from Wikimedia Commons and writes them into the
// content cache's `media` map. Idempotent (skips already-sourced ids unless `--force`).
// No API key needed — Commons is open. Then run `pack:build` to fold media into the pack.

import { loadContent, saveContent } from './cache';
import { type ImageQuery, sourceImage } from './images';

// mediaId scheme matches the pack's heroMediaId (`media/hero/<scope>`).
const QUERIES: ImageQuery[] = [
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
];

const force = process.argv.includes('--force');
const existing = loadContent('gr11');
const media: NonNullable<typeof existing.media> = { ...(existing.media ?? {}) };

console.log(`Image sourcing (Wikimedia Commons)${force ? ' --force' : ''}\n`);
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

saveContent('gr11', { ...existing, media });
console.log(`\n✓ wrote ${Object.keys(media).length} media → packages/db/content/gr11.json`);
