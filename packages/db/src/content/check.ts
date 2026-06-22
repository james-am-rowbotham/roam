// P4 — the LLM check stage (docs/content-pipeline.md). Reviews draft content_blocks for an
// objective before a human sees them: is each block accurate, on-topic for its lens, specific
// (not vague), and sourced? It sets review_status (reviewed | flagged) + a confidence, so a
// curator only opens the flagged ones (§8: human effort scales sub-linearly).

import Anthropic from '@anthropic-ai/sdk';
import type { StoredContent } from '@roam/content';
import { and, asc, contentBlocks, db, eq, inArray, or, regions, sections, sql } from '@roam/db';
import { setProgress } from '../jobs';

const CHECK_MODEL = process.env.CHECK_MODEL ?? 'claude-haiku-4-5-20251001';
const BATCH = 15;

// The reviewable text of a block (StoredContent unit).
function blockText(b: StoredContent): { heading: string; body: string } {
  if (b.unit === 'guideTopic')
    return { heading: b.topic.heading ?? b.topic.key, body: b.topic.body ?? '' };
  if (b.unit === 'highlight') return { heading: b.title, body: b.body };
  if (b.unit === 'hazard') return { heading: 'Hazard', body: b.body };
  if (b.block.kind === 'prose') return { heading: 'Prose', body: b.block.body };
  return { heading: b.block.kind, body: '' };
}

interface Reviewable {
  id: number;
  lens: string;
  hasSources: boolean;
  heading: string;
  body: string;
}
interface Verdict {
  id: number;
  confidence: number;
  flag: boolean;
  reason: string;
}

async function reviewBatch(
  client: Anthropic,
  trailName: string,
  batch: Reviewable[],
): Promise<Verdict[]> {
  const prompt = `You are a strict editor reviewing DRAFT trail-guide content for ${trailName}.
For EACH block, judge whether it is: accurate and plausible for this trail, on-topic for its lens,
specific (not generic filler), and internally consistent. Penalise vague or likely-fabricated
detail. A block with no sources is not automatically wrong, but treat unsourced hard facts
(numbers, prices, regulations) with more suspicion.

Return ONLY JSON: {"verdicts":[{"id":<int>,"confidence":0..1,"flag":<bool>,"reason":"<short>"}]}
Set flag=true when a curator must look (likely wrong, off-topic, or unsupported hard claim).

Blocks:
${batch
  .map(
    (b) =>
      `[id ${b.id}] lens=${b.lens} sources=${b.hasSources ? 'yes' : 'NONE'}\n${b.heading} — ${b.body}`,
  )
  .join('\n\n')}`;

  const res = await client.messages.create({
    model: CHECK_MODEL,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const parsed = JSON.parse(json) as { verdicts?: Verdict[] };
  return parsed.verdicts ?? [];
}

export interface CheckResult {
  total: number;
  reviewed: number;
  flagged: number;
}

/** Review every draft block for an objective. onProgress (or jobId) reports as it goes. */
export async function runCheck(
  objectiveId: string,
  opts: { jobId?: number; onProgress?: (msg: string) => void } = {},
): Promise<CheckResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set');
  const client = new Anthropic({ apiKey: key });

  // Resolve the objective's scopes (route + its regions + stages), matching the pack's ids.
  // Trail slug = ref lowercased without spaces ('GR 10' → 'gr10').
  const routeRows = (await db.execute(sql`
    SELECT r.id, r.name FROM trails t JOIN routes r ON r.id = t.route_id
    WHERE lower(replace(t.ref, ' ', '')) = ${objectiveId} LIMIT 1`)) as unknown as {
    id: number;
    name: string;
  }[];
  const route = routeRows[0];
  if (!route) throw new Error(`No route for objective "${objectiveId}"`);
  const rg = await db.select({ id: regions.id }).from(regions).where(eq(regions.routeId, route.id));
  const st = await db
    .select({ id: sections.id })
    .from(sections)
    .where(eq(sections.routeId, route.id));
  const scopeWhere = or(
    and(eq(contentBlocks.scopeType, 'route'), eq(contentBlocks.scopeId, route.id)),
    rg.length
      ? and(
          eq(contentBlocks.scopeType, 'region'),
          inArray(
            contentBlocks.scopeId,
            rg.map((r) => r.id),
          ),
        )
      : undefined,
    st.length
      ? and(
          eq(contentBlocks.scopeType, 'stage'),
          inArray(
            contentBlocks.scopeId,
            st.map((s) => s.id),
          ),
        )
      : undefined,
  );

  const rows = await db
    .select({
      id: contentBlocks.id,
      lens: contentBlocks.lens,
      block: contentBlocks.block,
      sourceRefs: contentBlocks.sourceRefs,
    })
    .from(contentBlocks)
    .where(and(scopeWhere, eq(contentBlocks.reviewStatus, 'draft')))
    .orderBy(asc(contentBlocks.id));

  const total = rows.length;
  const report = (msg: string) => {
    opts.onProgress?.(msg);
    if (opts.jobId) void setProgress(opts.jobId, msg);
  };
  report(`0/${total} blocks`);

  let reviewed = 0;
  let flagged = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const batch: Reviewable[] = slice.map((r) => {
      const t = blockText(r.block as StoredContent);
      return { id: r.id, lens: r.lens, hasSources: (r.sourceRefs?.length ?? 0) > 0, ...t };
    });
    const verdicts = await reviewBatch(client, route.name ?? objectiveId, batch);
    const byId = new Map(verdicts.map((v) => [v.id, v]));
    for (const r of slice) {
      const v = byId.get(r.id);
      const flag = v?.flag ?? true; // missing verdict → flag for a human
      await db
        .update(contentBlocks)
        .set({
          reviewStatus: flag ? 'flagged' : 'reviewed',
          confidence: v?.confidence ?? 0.3,
          lastReviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(contentBlocks.id, r.id));
      if (flag) flagged++;
      else reviewed++;
    }
    report(`${Math.min(i + BATCH, total)}/${total} blocks · ${flagged} flagged`);
  }
  return { total, reviewed, flagged };
}
