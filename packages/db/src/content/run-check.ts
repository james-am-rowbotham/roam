// Run the check stage directly (without the worker), for testing.
//   bun --env-file=.env run check gr11

import { runCheck } from './check';

const objectiveId = process.argv[2] ?? 'gr11';
console.log(`check: reviewing draft content for ${objectiveId}…`);
const r = await runCheck(objectiveId, { onProgress: (m) => console.log(`  ${m}`) });
console.log(`check: done — ${r.reviewed} reviewed, ${r.flagged} flagged (of ${r.total})`);
process.exit(0);
