// Stage dispatcher (P5) — maps a job's `stage` to the function that runs it. Each stage is an
// idempotent pipeline step (§8); the worker just calls the right one. New stages plug in here.

import { runCheck } from './content/check';
import type { Job } from './jobs';

export async function dispatch(job: Job): Promise<unknown> {
  switch (job.stage) {
    case 'check': {
      if (!job.objectiveId) throw new Error('check stage needs an objectiveId');
      return runCheck(job.objectiveId, { jobId: job.id });
    }
    // Future stages dispatch here: 'enrich' | 'images' | 'build' | 'seed'.
    default:
      throw new Error(`unknown stage "${job.stage}"`);
  }
}
