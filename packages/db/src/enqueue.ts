// Enqueue a pipeline job from the CLI (P5).
//   bun --env-file=.env run enqueue check gr11

import { enqueue } from './jobs';

const [stage, objectiveId] = process.argv.slice(2);
if (!stage) {
  console.error('usage: enqueue <stage> [objectiveId]   e.g. enqueue check gr11');
  process.exit(1);
}
const job = await enqueue(stage, objectiveId ?? null);
console.log(`enqueued job ${job.id}: ${stage} ${objectiveId ?? ''}`);
process.exit(0);
