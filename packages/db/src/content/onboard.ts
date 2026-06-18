// Onboard a route end-to-end — the single reproducible, idempotent content pipeline
// (§8 Enrich + §21). Runs every stage in order; each stage is itself idempotent (skips
// already-done work), so re-running is safe and only fills gaps. This is the "add a new
// route" command — see README for the full checklist.
//
//   bun run pack:onboard                       # uses the keyed path if ANTHROPIC_API_KEY is set
//   ANTHROPIC_API_KEY=sk-… bun run pack:onboard
//
// Stages:
//   1. pack:content  — section + objective Guide text (Anthropic web research). Needs a
//      key; the no-key path is the workflow recipes in ./workflows + pack:content:ingest.
//   2. pack:images   — license-gated editorial images (Wikimedia Commons). No key.
//   3. pack:build    — validate + fold content + media into the app pack.

interface Step {
  script: string;
  desc: string;
  needsKey?: boolean;
}

const STEPS: Step[] = [
  {
    script: 'pack:content',
    desc: 'section + objective Guide content (Anthropic web research)',
    needsKey: true,
  },
  { script: 'pack:images', desc: 'license-gated editorial images (Wikimedia Commons)' },
  { script: 'pack:build', desc: 'validate + fold content + media into the app pack' },
];

const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
console.log(
  `\n▶ pack:onboard — reproducible content pipeline${hasKey ? '' : ' (no ANTHROPIC_API_KEY)'}`,
);

for (const step of STEPS) {
  if (step.needsKey && !hasKey) {
    console.log(
      `\n  ⏭  ${step.script} — needs ANTHROPIC_API_KEY; run the workflow recipe + pack:content:ingest instead (see README), then re-run.`,
    );
    continue;
  }
  console.log(`\n── ${step.script} — ${step.desc} ──`);
  const proc = Bun.spawnSync(['bun', 'run', step.script], { stdout: 'inherit', stderr: 'inherit' });
  if (!proc.success) {
    console.error(`\n✗ ${step.script} failed — stopping.`);
    process.exit(1);
  }
}

console.log('\n✓ onboard complete.');
