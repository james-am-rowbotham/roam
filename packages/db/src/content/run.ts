// Content generation runner (§21) — `bun run pack:content`. Generates Section-Overview
// content for each configured section and writes the content cache. Idempotent: skips
// sections already generated unless `--force`. Needs ANTHROPIC_API_KEY (server-only,
// §15) — set it in packages/db/.env (gitignored) or the shell.
//
// After this, run `bun run pack:build` to fold the content into the app's seed pack.

import Anthropic from '@anthropic-ai/sdk';
import { loadContent, saveContent } from './cache';
import { deriveSectionSpecs } from './deriveSpecs';
import { CONTENT_MODEL, generateObjectiveGuide, generateSectionContent } from './generate';
import { getTrailContent, trailIdFromArgs } from './trails';

const key = process.env.ANTHROPIC_API_KEY;
if (!key) {
  console.error('✗ ANTHROPIC_API_KEY is not set — add it to packages/db/.env or export it.');
  process.exit(1);
}

const trailId = trailIdFromArgs(process.argv);
const force = process.argv.includes('--force');
const trail = getTrailContent(trailId);
const sections = trail.sections ?? deriveSectionSpecs(trailId);
const client = new Anthropic({ apiKey: key });

const existing = loadContent(trailId);
const sectionGuide: NonNullable<typeof existing.sectionGuide> = {
  ...(existing.sectionGuide ?? {}),
};

console.log(`Content generation — ${trailId} (${CONTENT_MODEL})${force ? ' --force' : ''}\n`);
for (const s of sections) {
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
    const { topics, sources } = await generateObjectiveGuide(client, trail.objective);
    if (topics.length) objectiveGuide = topics;
    console.log(`${topics.length} topics · ${sources} sources`);
  } catch (err) {
    console.log(`FAILED — ${(err as Error).message}`);
  }
} else {
  console.log('  skip  objective Guide (already generated)');
}

saveContent(trailId, {
  ...existing,
  sectionGuide,
  objectiveGuide,
  provenance: { model: CONTENT_MODEL, generatedAt: new Date().toISOString() },
});
console.log(`\n✓ wrote packages/db/content/${trailId}.json`);
