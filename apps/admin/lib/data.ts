// Admin data access (server-side) over @roam/db. Reads content_blocks across a trail's scopes
// (route + its regions + stages) for review. Requires DATABASE_URL in the environment.

import type { StoredContent } from '@roam/content';
import {
  and,
  asc,
  contentBlocks,
  db,
  eq,
  inArray,
  or,
  regions,
  routes,
  sections,
  trails,
} from '@roam/db';

interface ScopeIds {
  routeId: number;
  regionIds: number[];
  stageIds: number[];
}

async function scopeIds(routeId: number): Promise<ScopeIds> {
  const rg = await db.select({ id: regions.id }).from(regions).where(eq(regions.routeId, routeId));
  const st = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.routeId, routeId));
  return { routeId, regionIds: rg.map((r) => r.id), stageIds: st.map((s) => s.id) };
}

function scopeWhere(ids: ScopeIds) {
  const conds = [and(eq(contentBlocks.scopeType, 'route'), eq(contentBlocks.scopeId, ids.routeId))];
  if (ids.regionIds.length)
    conds.push(
      and(eq(contentBlocks.scopeType, 'region'), inArray(contentBlocks.scopeId, ids.regionIds)),
    );
  if (ids.stageIds.length)
    conds.push(
      and(eq(contentBlocks.scopeType, 'stage'), inArray(contentBlocks.scopeId, ids.stageIds)),
    );
  return or(...conds);
}

export interface ObjectiveRow {
  ref: string;
  name: string;
  total: number;
  published: number;
  flagged: number;
}

/** Trails with content-review counts for the index. */
export async function listObjectives(): Promise<ObjectiveRow[]> {
  const ts = await db
    .select({ ref: trails.ref, name: routes.name, routeId: trails.routeId })
    .from(trails)
    .innerJoin(routes, eq(trails.routeId, routes.id))
    .orderBy(asc(trails.ref));
  const out: ObjectiveRow[] = [];
  for (const t of ts) {
    if (!t.ref || t.routeId == null) continue;
    const ids = await scopeIds(t.routeId);
    const rows = await db
      .select({ status: contentBlocks.reviewStatus })
      .from(contentBlocks)
      .where(scopeWhere(ids));
    out.push({
      ref: t.ref,
      name: t.name ?? t.ref,
      total: rows.length,
      published: rows.filter((r) => r.status === 'published').length,
      flagged: rows.filter((r) => r.status === 'flagged').length,
    });
  }
  return out;
}

export interface BlockRow {
  id: number;
  scopeType: 'route' | 'region' | 'stage' | 'poi';
  scopeId: number;
  lens: string;
  block: StoredContent;
  source: string;
  confidence: number;
  reviewStatus: 'draft' | 'reviewed' | 'published' | 'flagged';
  manualOverride: boolean;
  orderIndex: number;
}

/** One trail's content blocks, ordered by scope then position, for review. */
export async function getObjectiveContent(
  ref: string,
): Promise<{ name: string; blocks: BlockRow[] } | null> {
  const [t] = await db
    .select({ name: routes.name, routeId: trails.routeId })
    .from(trails)
    .innerJoin(routes, eq(trails.routeId, routes.id))
    .where(eq(trails.ref, ref))
    .limit(1);
  if (!t || t.routeId == null) return null;
  const ids = await scopeIds(t.routeId);
  const rows = await db
    .select({
      id: contentBlocks.id,
      scopeType: contentBlocks.scopeType,
      scopeId: contentBlocks.scopeId,
      lens: contentBlocks.lens,
      block: contentBlocks.block,
      source: contentBlocks.source,
      confidence: contentBlocks.confidence,
      reviewStatus: contentBlocks.reviewStatus,
      manualOverride: contentBlocks.manualOverride,
      orderIndex: contentBlocks.orderIndex,
    })
    .from(contentBlocks)
    .where(scopeWhere(ids))
    .orderBy(
      asc(contentBlocks.scopeType),
      asc(contentBlocks.scopeId),
      asc(contentBlocks.orderIndex),
    );
  return { name: t.name ?? ref, blocks: rows as BlockRow[] };
}

// ── StoredContent text helpers (the one editable string per unit) ───────────
export function storedHeading(b: StoredContent): string {
  if (b.unit === 'guideTopic') return b.topic.heading ?? b.topic.key;
  if (b.unit === 'highlight') return b.title;
  if (b.unit === 'hazard') return 'Hazard';
  return b.block.kind;
}

export function storedText(b: StoredContent): string {
  if (b.unit === 'guideTopic') return b.topic.body ?? '';
  if (b.unit === 'highlight') return b.body;
  if (b.unit === 'hazard') return b.body;
  if (b.block.kind === 'prose') return b.block.body;
  return '';
}

/** Return a copy of the block with its primary text replaced (null = not text-editable). */
export function withStoredText(b: StoredContent, text: string): StoredContent | null {
  if (b.unit === 'guideTopic') return { ...b, topic: { ...b.topic, body: text } };
  if (b.unit === 'highlight') return { ...b, body: text };
  if (b.unit === 'hazard') return { ...b, body: text };
  if (b.block.kind === 'prose') return { ...b, block: { ...b.block, body: text } };
  return null;
}
