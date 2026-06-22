// Pipeline job queue (P5) — Postgres-native, no extra extension. enqueue() inserts; claimNext()
// atomically grabs one job with FOR UPDATE SKIP LOCKED so many workers never collide and a dead
// worker's job is reclaimed after the visibility timeout. Upgradeable to pgmq later.

import { eq, sql } from 'drizzle-orm';
import { db } from './connection';
import { pipelineJobs } from './schema';

export type Job = typeof pipelineJobs.$inferSelect;

/** Add a stage to the queue. Returns the created job. */
export async function enqueue(
  stage: string,
  objectiveId: string | null,
  args: Record<string, unknown> = {},
): Promise<Job> {
  const [row] = await db.insert(pipelineJobs).values({ stage, objectiveId, args }).returning();
  return row as Job;
}

// A job is reclaimable if running but its lock is older than this (the worker died).
const VISIBILITY = "interval '10 minutes'";

/** Atomically claim the next runnable job (oldest queued, or a stuck-running one). */
export async function claimNext(): Promise<Job | null> {
  const rows = (await db.execute(sql`
    UPDATE pipeline_jobs SET
      status = 'running',
      locked_at = now(),
      started_at = COALESCE(started_at, now()),
      attempts = attempts + 1,
      updated_at = now()
    WHERE id = (
      SELECT id FROM pipeline_jobs
      WHERE status = 'queued'
         OR (status = 'running' AND locked_at < now() - ${sql.raw(VISIBILITY)})
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *`)) as unknown as Job[];
  return rows[0] ?? null;
}

/** Update a running job's progress; also refreshes the lock (the worker heartbeat). */
export async function setProgress(id: number, progress: string): Promise<void> {
  await db
    .update(pipelineJobs)
    .set({ progress, lockedAt: new Date(), updatedAt: new Date() })
    .where(eq(pipelineJobs.id, id));
}

export async function complete(id: number): Promise<void> {
  await db
    .update(pipelineJobs)
    .set({
      status: 'done',
      progress: null,
      error: null,
      finishedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(pipelineJobs.id, id));
}

/** Fail a job — requeue for retry until maxAttempts, then mark failed. */
export async function fail(id: number, message: string): Promise<void> {
  const [j] = await db
    .select({ attempts: pipelineJobs.attempts, maxAttempts: pipelineJobs.maxAttempts })
    .from(pipelineJobs)
    .where(eq(pipelineJobs.id, id));
  const dead = !j || j.attempts >= j.maxAttempts;
  await db
    .update(pipelineJobs)
    .set({
      status: dead ? 'failed' : 'queued',
      error: message.slice(0, 2000),
      lockedAt: null,
      finishedAt: dead ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(pipelineJobs.id, id));
}
