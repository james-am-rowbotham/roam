// DB-backed content (P1, docs/content-pipeline.md) — write/read the editorial content layer
// to/from `content_blocks`, replacing the JSON content cache. Scope ids resolve to the SAME
// slugs the pack uses (./slug), so DB content and the pack never disagree. Each row's `block`
// is a validated StoredContent jsonb (§21.8) — structure owned by @roam/content, not columns.
//
// Media stays in the JSON cache for now (content_media + R2 is a later step, §21.4).

import type { ContentBlock, GuideTopic, StoredContent } from '@roam/content';
import { CONTENT_SCHEMA_VERSION } from '@roam/content';
import type { PackConfig, TrailContent } from '@roam/pipeline';
import { and, eq, inArray, or } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { loadContent } from '../content/cache';
import { contentBlocks } from '../schema';
import { slugify } from './slug';

// prepare:false — the Supabase transaction pooler drops prepared statements (§ memory).
const client = () => postgres(process.env.DATABASE_URL ?? '', { max: 1, prepare: false });

interface ScopeMaps {
  routeId: number;
  regionBySlug: Map<string, number>;
  stageBySlug: Map<string, number>;
  regionById: Map<number, string>;
  stageById: Map<number, string>;
}

// Resolve a trail's content scopes ↔ numeric DB ids. Content keys match buildTrailPack exactly:
// a "section" (region scope) is `${trailId}-${slugify(name)}`, a stage is `${trailId}-s${order}`.
async function resolveScopes(c: postgres.Sql, config: PackConfig): Promise<ScopeMaps> {
  const [route] = await c<{ id: number }[]>`
    SELECT r.id FROM routes r JOIN trails t ON t.route_id = r.id
    WHERE t.ref = ${config.source.ref} LIMIT 1`;
  if (!route) throw new Error(`No route for "${config.source.ref}" — ingest it first`);
  const regions = await c<{ id: number; name: string }[]>`
    SELECT id, name FROM regions WHERE route_id = ${route.id}`;
  const sections = await c<{ id: number; order_index: number }[]>`
    SELECT id, order_index FROM sections WHERE route_id = ${route.id}`;
  const sectionKey = (name: string) => `${config.id}-${slugify(name)}`;
  const stageKey = (order: number) => `${config.id}-s${order}`;
  return {
    routeId: route.id,
    regionBySlug: new Map(regions.map((r) => [sectionKey(r.name), r.id])),
    regionById: new Map(regions.map((r) => [r.id, sectionKey(r.name)])),
    stageBySlug: new Map(sections.map((s) => [stageKey(s.order_index), s.id])),
    stageById: new Map(sections.map((s) => [s.id, stageKey(s.order_index)])),
  };
}

// jsonb may arrive parsed (object) or as a string depending on the driver path.
const asBlock = (b: unknown): StoredContent =>
  typeof b === 'string' ? (JSON.parse(b) as StoredContent) : (b as StoredContent);

/** Upsert a trail's editorial content into content_blocks. Override-safe: clears this trail's
 *  NON-`manual_override` rows, then inserts fresh — curated/edited rows survive. */
export async function writeTrailContent(
  config: PackConfig,
  content: TrailContent,
): Promise<number> {
  const c = client();
  try {
    const db = drizzle(c);
    const m = await resolveScopes(c, config);
    type Row = typeof contentBlocks.$inferInsert;
    const rows: Row[] = [];
    const add = (
      scopeType: 'route' | 'region' | 'stage',
      scopeId: number,
      lens: string,
      block: StoredContent,
      orderIndex: number,
    ) =>
      rows.push({
        scopeType,
        scopeId,
        lens,
        block,
        schemaVersion: CONTENT_SCHEMA_VERSION,
        orderIndex,
      });

    (content.objectiveGuide ?? []).forEach((topic, i) =>
      add('route', m.routeId, topic.key, { unit: 'guideTopic', topic }, i),
    );
    for (const [slug, topics] of Object.entries(content.sectionGuide ?? {})) {
      const id = m.regionBySlug.get(slug);
      if (id != null)
        topics.forEach((topic, i) =>
          add('region', id, topic.key, { unit: 'guideTopic', topic }, i),
        );
    }
    for (const [slug, blocks] of Object.entries(content.stageBlocks ?? {})) {
      const id = m.stageBySlug.get(slug);
      if (id != null)
        blocks.forEach((block, i) =>
          add('stage', id, block.kind, { unit: 'stageBlock', block }, i),
        );
    }
    for (const [slug, hls] of Object.entries(content.sectionHighlights ?? {})) {
      const id = m.regionBySlug.get(slug);
      if (id != null)
        hls.forEach((h, i) => add('region', id, 'highlight', { unit: 'highlight', ...h }, i));
    }
    for (const [slug, hzs] of Object.entries(content.sectionHazards ?? {})) {
      const id = m.regionBySlug.get(slug);
      if (id != null)
        hzs.forEach((h, i) => add('region', id, 'hazard', { unit: 'hazard', ...h }, i));
    }

    const regionIds = [...m.regionBySlug.values()];
    const stageIds = [...m.stageBySlug.values()];
    const scopeConds = [
      and(eq(contentBlocks.scopeType, 'route'), eq(contentBlocks.scopeId, m.routeId)),
    ];
    if (regionIds.length)
      scopeConds.push(
        and(eq(contentBlocks.scopeType, 'region'), inArray(contentBlocks.scopeId, regionIds)),
      );
    if (stageIds.length)
      scopeConds.push(
        and(eq(contentBlocks.scopeType, 'stage'), inArray(contentBlocks.scopeId, stageIds)),
      );

    await db
      .delete(contentBlocks)
      .where(and(eq(contentBlocks.manualOverride, false), or(...scopeConds)));
    if (rows.length) await db.insert(contentBlocks).values(rows);
    return rows.length;
  } finally {
    await c.end();
  }
}

/** Read a trail's editorial content back into the TrailContent the pack builder consumes. */
export async function readTrailContent(config: PackConfig): Promise<TrailContent> {
  const c = client();
  try {
    const m = await resolveScopes(c, config);
    const regionIds = [...m.regionBySlug.values()];
    const stageIds = [...m.stageBySlug.values()];
    const rows = await c<{ scope_type: string; scope_id: number; block: unknown }[]>`
      SELECT scope_type, scope_id, block FROM content_blocks
      WHERE (scope_type = 'route' AND scope_id = ${m.routeId})
         OR (scope_type = 'region' AND scope_id = ANY(${regionIds}))
         OR (scope_type = 'stage' AND scope_id = ANY(${stageIds}))
      ORDER BY scope_type, scope_id, order_index`;

    const objectiveGuide: GuideTopic[] = [];
    const sectionGuide: Record<string, GuideTopic[]> = {};
    const stageBlocks: Record<string, ContentBlock[]> = {};
    const sectionHighlights: Record<string, { title: string; body: string }[]> = {};
    const sectionHazards: Record<string, { tone: string; body: string }[]> = {};
    const into = <T>(rec: Record<string, T[]>, key: string, v: T) => {
      if (!rec[key]) rec[key] = [];
      rec[key].push(v);
    };

    for (const r of rows) {
      const b = asBlock(r.block);
      if (r.scope_type === 'route') {
        if (b.unit === 'guideTopic') objectiveGuide.push(b.topic);
      } else if (r.scope_type === 'region') {
        const slug = m.regionById.get(r.scope_id);
        if (!slug) continue;
        if (b.unit === 'guideTopic') into(sectionGuide, slug, b.topic);
        else if (b.unit === 'highlight')
          into(sectionHighlights, slug, { title: b.title, body: b.body });
        else if (b.unit === 'hazard') into(sectionHazards, slug, { tone: b.tone, body: b.body });
      } else if (r.scope_type === 'stage' && b.unit === 'stageBlock') {
        const slug = m.stageById.get(r.scope_id);
        if (slug) into(stageBlocks, slug, b.block);
      }
    }

    const content: TrailContent = {};
    if (objectiveGuide.length) content.objectiveGuide = objectiveGuide;
    if (Object.keys(sectionGuide).length) content.sectionGuide = sectionGuide;
    if (Object.keys(stageBlocks).length) content.stageBlocks = stageBlocks;
    if (Object.keys(sectionHighlights).length) content.sectionHighlights = sectionHighlights;
    if (Object.keys(sectionHazards).length) content.sectionHazards = sectionHazards;
    // Media is not in the DB yet — pull it from the JSON cache (content_media + R2 is later).
    content.media = loadContent(config.id).media;
    return content;
  } finally {
    await c.end();
  }
}
