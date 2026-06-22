'use server';

import type { StoredContent } from '@roam/content';
import { contentBlocks, db, eq } from '@roam/db';
import { revalidatePath } from 'next/cache';
import { withStoredText } from './data';

type ReviewStatus = 'draft' | 'reviewed' | 'published' | 'flagged';

/** Move a block through the review workflow (draft → reviewed → published, or flagged). */
export async function setReviewStatus(
  id: number,
  status: ReviewStatus,
  ref: string,
): Promise<void> {
  await db
    .update(contentBlocks)
    .set({ reviewStatus: status, lastReviewedAt: new Date(), updatedAt: new Date() })
    .where(eq(contentBlocks.id, id));
  revalidatePath(`/objective/${ref}`);
}

/** Edit a block's text + mark manual_override so the pipeline never clobbers the edit (§8). */
export async function editBlockText(id: number, text: string, ref: string): Promise<void> {
  const [row] = await db
    .select({ block: contentBlocks.block })
    .from(contentBlocks)
    .where(eq(contentBlocks.id, id))
    .limit(1);
  if (!row) return;
  const next = withStoredText(row.block as StoredContent, text);
  if (!next) return;
  await db
    .update(contentBlocks)
    .set({ block: next, manualOverride: true, updatedAt: new Date() })
    .where(eq(contentBlocks.id, id));
  revalidatePath(`/objective/${ref}`);
}

// ── <form action> wrappers (bound with id + ref, read the rest from FormData) ──
export async function statusForm(
  id: number,
  ref: string,
  status: ReviewStatus,
  _formData: FormData,
): Promise<void> {
  await setReviewStatus(id, status, ref);
}

export async function editForm(id: number, ref: string, formData: FormData): Promise<void> {
  await editBlockText(id, String(formData.get('text') ?? ''), ref);
}
