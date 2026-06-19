// Onboard a route end-to-end — the single reproducible, idempotent content pipeline
// (§8 Enrich + §21). Runs every stage in order; each stage is itself idempotent (skips
// already-done work), so re-running is safe and only fills gaps. This is the "add a new
// route" command — see PIPELINE.md for the full checklist.
//
//   bun run pack:onboard <trailId>             # keyed path if ANTHROPIC_API_KEY is set
//   ANTHROPIC_API_KEY=sk-… bun run pack:onboard gr10
//
// Prerequisite: the trail's structural data is already in Postgres (db:seed) and it has a
// trails.ts registry entry. Stages:
//   1. pack:build    — structural pack first, so content can DERIVE section specs from it.
//   2. pack:content  — section + objective Guide text (Anthropic web research). Needs a
//      key; the no-key path is the workflow recipes in ./workflows + pack:content:ingest.
//   3. pack:images   — license-gated editorial images (Wikimedia Commons). No key.
//   4. pack:build    — re-build to fold content + media into the app pack.

interface Step {
  script: string;
  desc: string;
  needsKey?: boolean;
  perTrail?: boolean; // forward the trail id (build is global)
}

const STEPS: Step[] = [
  { script: 'pack:build', desc: 'structural pack (so specs can derive from it)' },
  {
    script: 'pack:content',
    desc: 'section + objective Guide content (Anthropic web research)',
    needsKey: true,
    perTrail: true,
  },
  {
    script: 'pack:images',
    desc: 'license-gated editorial images (Wikimedia Commons)',
    perTrail: true,
  },
  { script: 'pack:build', desc: 'fold content + media into the app pack' },
];

const trailId = process.argv.slice(2).find((a) => !a.startsWith('-')) ?? 'gr11';
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
console.log(
  `\n▶ pack:onboard ${trailId} — reproducible content pipeline${hasKey ? '' : ' (no ANTHROPIC_API_KEY)'}`,
);

for (const step of STEPS) {
  if (step.needsKey && !hasKey) {
    console.log(
      `\n  ⏭  ${step.script} — needs ANTHROPIC_API_KEY; run the workflow recipe + pack:content:ingest instead (see README), then re-run.`,
    );
    continue;
  }
  console.log(`\n── ${step.script} — ${step.desc} ──`);
  const cmd = ['bun', 'run', step.script, ...(step.perTrail ? [trailId] : [])];
  const proc = Bun.spawnSync(cmd, { stdout: 'inherit', stderr: 'inherit' });
  if (!proc.success) {
    console.error(`\n✗ ${step.script} failed — stopping.`);
    process.exit(1);
  }
}

console.log('\n✓ onboard complete.');
