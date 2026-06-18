// Canonical content-generation recipe (§21 Enrich), recorded for automation.
//
// This is the workflow form of the content stage — the research→compose→verify loop that
// generates Section-Overview topics + per-stage Overview prose for a trail. It is generic
// and args-driven (multi-trail): pass `args.sections` derived from the built pack. Output
// is cache-READY (section ids already prefixed, @roam/content shapes), so ingest is a
// deterministic write — see packages/db/src/content/ingest.ts.
//
// Run it:
//   Workflow({ scriptPath: 'packages/db/src/content/workflows/section-content.workflow.js',
//              args: <sections> })
// then ingest the result:  bun run pack:content:ingest <result.json>
//
// The in-repo Anthropic runner (`pack:content`, generate.ts) is the keyed, fully-automated
// equivalent of this same loop; both write the same TrailContent cache.

export const meta = {
  name: 'section-content',
  description: 'Generate sourced Section-Overview topics + per-stage Overview prose for a trail',
  phases: [
    { title: 'Compose', detail: 'one agent per section — web research → topics + stage prose' },
    { title: 'Verify', detail: 'adversarial fact-check; drop unsupported topics' },
  ],
}

const LENSES = ['terrain', 'flora', 'culture', 'weather']
// args may arrive as a parsed object or a JSON string depending on the caller — accept both.
const input = typeof args === 'string' ? JSON.parse(args) : args || {}
const sections = input.sections || []

const COMPOSE_SCHEMA = {
  type: 'object',
  required: ['topics', 'stages'],
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        required: ['key', 'heading', 'body', 'sourceRefs'],
        properties: {
          key: { type: 'string', enum: LENSES },
          heading: { type: 'string' },
          body: { type: 'string' },
          sourceRefs: {
            type: 'array',
            items: { type: 'object', required: ['url', 'title'], properties: { url: { type: 'string' }, title: { type: 'string' } } },
          },
        },
      },
    },
    stages: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'body'],
        properties: { id: { type: 'string' }, body: { type: 'string' } },
      },
    },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        required: ['key', 'supported'],
        properties: { key: { type: 'string' }, supported: { type: 'boolean' }, issue: { type: 'string' } },
      },
    },
  },
}

const composePrompt = (s) =>
  `You are a trail-guide writer for Roam, an offline hiking app. Voice: grounded and specific (real place names, not categories), comparatives over superlatives, present tense, no marketing adjectives. Use a plain ampersand "&", never "&amp;".

Write the Section-Overview content for the "${s.name}" section, stages ${s.stages[0].n}–${s.stages[s.stages.length - 1].n}.
Key places on this stretch: ${s.placesHint}.

Research the web FIRST (Wikipedia/Wikivoyage, national parks, federation guides like FEDME, reputable guidebooks and trip reports). SOURCING IS MANDATORY — a confidently-wrong fact is worse than nothing. Never invent a fact or a source; if you can't source a specific, keep the claim general and grounded.

Produce TWO things:
1) topics: exactly four, keys terrain / flora / culture / weather — each a short heading and a 2–3 sentence body in Roam's voice.
2) stages: a one- to two-sentence Overview for EACH of these stages — what the walking is like and the one thing that matters most. Use the exact id given.
${s.stages.map((st) => `   - ${st.id}: Stage ${st.n} · ${st.name}`).join('\n')}`

const verifyPrompt = (s, topics) =>
  `Adversarially fact-check these "${s.name}" section topics — be skeptical, confidently-wrong is worse than nothing. Default supported=false for dubious specifics, wrong place names, or fabricated-looking sources.

TOPICS (JSON):
${JSON.stringify(topics, null, 2)}

Return a verdict per topic key (supported boolean + short issue).`

const results = await pipeline(
  sections,
  (s) =>
    agent(composePrompt(s), { label: `compose:${s.id}`, phase: 'Compose', schema: COMPOSE_SCHEMA }).then((r) => ({
      section: s,
      topics: r.topics,
      stages: r.stages,
    })),
  (c, s) =>
    agent(verifyPrompt(s, c.topics), { label: `verify:${s.id}`, phase: 'Verify', schema: VERIFY_SCHEMA }).then((v) => {
      const ok = new Set(v.verdicts.filter((x) => x.supported).map((x) => x.key))
      return { sectionId: s.id, topics: c.topics.filter((t) => ok.has(t.key)), stages: c.stages }
    }),
)

const sectionGuide = {}
const stageBlocks = {}
for (const r of results.filter(Boolean)) {
  sectionGuide[r.sectionId] = r.topics.map((t) => ({ key: t.key, facet: 'overview', heading: t.heading, body: t.body }))
  for (const st of r.stages || []) {
    if (st.id && st.body) stageBlocks[st.id] = [{ kind: 'prose', heading: 'Overview', body: st.body }]
  }
}

log(`sections=${Object.keys(sectionGuide).length} topics=${Object.values(sectionGuide).reduce((n, t) => n + t.length, 0)} stageProse=${Object.keys(stageBlocks).length}`)
return { sectionGuide, stageBlocks, provenance: { model: 'workflow:research-compose-verify' } }
