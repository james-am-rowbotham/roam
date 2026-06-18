// Content generation runner (§21) — `bun run pack:content`. Generates Section-Overview
// content for each configured section and writes the content cache. Idempotent: skips
// sections already generated unless `--force`. Needs ANTHROPIC_API_KEY (server-only,
// §15) — set it in packages/db/.env (gitignored) or the shell.
//
// After this, run `bun run pack:build` to fold the content into the app's seed pack.

import Anthropic from '@anthropic-ai/sdk';
import { loadContent, saveContent } from './cache';
import { CONTENT_MODEL, generateObjectiveGuide, generateSectionContent } from './generate';
import { GR11_OBJECTIVE, GR11_SECTIONS } from './specs';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error('✗ ANTHROPIC_API_KEY is not set — add it to packages/db/.env or export it.');
  process.exit(1);
}

const force = process.argv.includes('--force');
const client = new Anthropic({ apiKey: key });

const existing = loadContent('gr11');
const sectionGuide: NonNullable<typeof existing.sectionGuide> = {
  ...(existing.sectionGuide ?? {}),
};

console.log(`Content generation (${CONTENT_MODEL})${force ? ' --force' : ''}\n`);
for (const s of GR11_SECTIONS) {
  if (sectionGuide[s.id]?.length && !force) {
    console.log(`  skip  ${s.id} (already generated)`);
    continue;
  }
  process.stdout.write(`  gen   ${s.id} … `);
  try {
    const { topics, sources } = await generateSectionContent(client, s);
    if (!topics.length) throw new Error('no topics parsed');
    sectionGuide[s.id] = topics;
    console.log(`${topics.length} topics · ${sources} sources`);
  } catch (err) {
    console.log(`FAILED — ${(err as Error).message}`);
  }
}

// Objective Guide — Planning + Environment facets (idempotent at the whole-guide level).
let objectiveGuide = existing.objectiveGuide;
if (!objectiveGuide?.length || force) {
  process.stdout.write('  gen   objective Guide (planning + environment) … ');
  try {
    const { topics, sources } = await generateObjectiveGuide(client, GR11_OBJECTIVE);
    if (topics.length) objectiveGuide = topics;
    console.log(`${topics.length} topics · ${sources} sources`);
  } catch (err) {
    console.log(`FAILED — ${(err as Error).message}`);
  }
} else {
  console.log('  skip  objective Guide (already generated)');
}

saveContent('gr11', {
  ...existing,
  sectionGuide,
  objectiveGuide,
  provenance: { model: CONTENT_MODEL, generatedAt: new Date().toISOString() },
});
console.log('\n✓ wrote packages/db/content/gr11.json');
