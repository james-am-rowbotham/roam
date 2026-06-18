// Workflow-result → content cache (recorded, deterministic) — `bun run pack:content:ingest
// <result.json>`. The workflow (section-content.workflow.js) emits cache-ready content;
// this folds it into packages/db/content/<id>.json: normalize text, merge over existing
// (re-gen wins), preserve sections/stages the run didn't touch. The keyed Anthropic runner
// (run.ts) writes the same cache directly; this is the no-key path.
//
// Accepts either a raw result object ({sectionGuide,...}) or a task-output wrapper
// ({result: ...}) where `result` may itself be a JSON string.

import { readFileSync } from 'node:fs';
import type { ContentBlock, GuideTopic } from '@roam/content';
import type { TrailContent } from '@roam/pipeline';
import { loadContent, saveContent } from './cache';
import { normalizeTopic, unescapeHtml } from './normalize';

interface WorkflowResult {
  sectionGuide?: Record<string, { key: string; heading: string; body: string }[]>;
  stageBlocks?: Record<string, ContentBlock[]>;
  provenance?: { model?: string; generatedAt?: string };
}

function unwrap(parsed: unknown): WorkflowResult {
  const obj = parsed as { result?: unknown } & WorkflowResult;
  let result: unknown = obj.result ?? obj;
  if (typeof result === 'string') result = JSON.parse(result);
  return (result ?? {}) as WorkflowResult;
}

function cleanBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((b) => (b.kind === 'prose' ? { ...b, body: unescapeHtml(b.body) } : b));
}

/** Merge a workflow result into trail `id`'s content cache. Returns the merged content. */
export function ingestResult(id: string, parsed: unknown): TrailContent {
  const result = unwrap(parsed);
  const existing = loadContent(id);

  const sectionGuide: Record<string, GuideTopic[]> = { ...(existing.sectionGuide ?? {}) };
  for (const [sectionId, topics] of Object.entries(result.sectionGuide ?? {})) {
    if (topics.length) sectionGuide[sectionId] = topics.map(normalizeTopic);
  }

  const stageBlocks: Record<string, ContentBlock[]> = { ...(existing.stageBlocks ?? {}) };
  for (const [stageId, blocks] of Object.entries(result.stageBlocks ?? {})) {
    if (blocks.length) stageBlocks[stageId] = cleanBlocks(blocks);
  }

  return {
    ...existing,
    sectionGuide,
    stageBlocks,
    provenance: { ...existing.provenance, ...result.provenance, generatedAt: '2026-06-18' },
  };
}

if (import.meta.main) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: bun run pack:content:ingest <result.json> [trailId]');
    process.exit(1);
  }
  const id = process.argv[3] ?? 'gr11';
  const merged = ingestResult(id, JSON.parse(readFileSync(file, 'utf8')));
  saveContent(id, merged);
  const topics = Object.values(merged.sectionGuide ?? {}).reduce((n, t) => n + t.length, 0);
  console.log(
    `✓ ingested → packages/db/content/${id}.json — ` +
      `${Object.keys(merged.sectionGuide ?? {}).length} sections · ${topics} topics · ` +
      `${Object.keys(merged.stageBlocks ?? {}).length} stage-prose`,
  );
}
