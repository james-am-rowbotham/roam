// Pipeline worker (P5) — the background runner. A long-lived loop: claim a job, run its stage,
// mark it done or failed (with retry), repeat. Run locally with `bun run worker` (needs
// DATABASE_URL + any stage's keys, e.g. ANTHROPIC_API_KEY); in prod it's a Fly process.
//
//   bun --env-file=.env run worker

import { dispatch } from './dispatch';
import { claimNext, complete, fail } from './jobs';

const POLL_MS = 3000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let running = true;
const stop = (sig: string) => {
  console.log(`worker: ${sig} — finishing current job, then stopping`);
  running = false;
};
process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

console.log(`worker: started (poll ${POLL_MS}ms) — waiting for jobs`);
while (running) {
  let job: Awaited<ReturnType<typeof claimNext>>;
  try {
    job = await claimNext();
  } catch (err) {
    console.error(`worker: claim error — ${(err as Error).message}`);
    await sleep(POLL_MS);
    continue;
  }
  if (!job) {
    await sleep(POLL_MS);
    continue;
  }

  const label = `job ${job.id} · ${job.stage} ${job.objectiveId ?? ''} (attempt ${job.attempts})`;
  console.log(`worker: ▶ ${label}`);
  const t0 = Date.now();
  try {
    const result = await dispatch(job);
    await complete(job.id);
    console.log(
      `worker: ✓ ${label} — ${Math.round((Date.now() - t0) / 1000)}s · ${JSON.stringify(result)}`,
    );
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    await fail(job.id, msg);
    console.error(`worker: ✕ ${label} — ${msg}`);
  }
}

console.log('worker: stopped');
process.exit(0);
