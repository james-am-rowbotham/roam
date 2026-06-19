// Section extras (§21) — per section, generate the standout HIGHLIGHTS (must-see features)
// and the key HAZARDS (conditions/cautions), sourced + verify-gated. Sibling of the
// section-content recipe; generic + args-driven. Output is cache-ready; ingest folds it in.
//
//   Workflow({ scriptPath: '.../section-extras.workflow.js', args: { trail, sections } })

export const meta = {
  name: 'section-extras',
  description: 'Generate sourced highlights + hazard callouts per section',
  phases: [
    { title: 'Compose', detail: 'one agent per section — highlights + hazards' },
    { title: 'Verify', detail: 'adversarial fact-check; drop unsupported items' },
  ],
}

const input = typeof args === 'string' ? JSON.parse(args) : args || {}
const sections = input.sections || []
const trail = input.trail || 'this trail'

const SCHEMA = {
  type: 'object',
  required: ['highlights', 'hazards'],
  properties: {
    highlights: {
      type: 'array',
      description: '2–4 standout features a walker should not miss on this section',
      items: {
        type: 'object',
        required: ['title', 'body', 'sourceRefs'],
        properties: {
          title: { type: 'string' },
          body: { type: 'string', description: 'one grounded sentence' },
          sourceRefs: { type: 'array', items: { type: 'object', required: ['url', 'title'], properties: { url: { type: 'string' }, title: { type: 'string' } } } },
        },
      },
    },
    hazards: {
      type: 'array',
      description: '2–3 conditions/cautions for this section',
      items: {
        type: 'object',
        required: ['tone', 'body'],
        properties: {
          tone: { type: 'string', enum: ['warn', 'danger', 'success'] },
          body: { type: 'string' },
        },
      },
    },
  },
}

const VERIFY = {
  type: 'object',
  required: ['highlightsOk', 'hazardsOk'],
  properties: {
    highlightsOk: { type: 'array', items: { type: 'string' }, description: 'titles of supported highlights' },
    hazardsOk: { type: 'array', items: { type: 'string' }, description: 'bodies of supported hazards' },
  },
}

const composePrompt = (s) =>
  `You are a trail-guide writer for Roam. For the "${s.name}" section of ${trail} (${s.stages}), key places: ${s.places}.

Research the web FIRST (Wikipedia/Wikivoyage, national/regional parks, federation guides, reputable trip reports). SOURCING IS MANDATORY — never invent a fact or source.

Produce:
1) highlights: 2–4 standout features a walker should not miss here — a real named place/feature (a lake, peak, refuge, gorge, viewpoint, village), each a short title + one grounded sentence. Specific, not generic.
2) hazards: 2–3 conditions or cautions for this stretch — tone "danger" (real risk: storms on exposed cols, snow on high passes, river crossings), "warn" (plan-around: long water carries, fog, remoteness), or "success" (reassuring: water plentiful, well-waymarked). One sentence each, grounded in this section's terrain/altitude/season.`

const verifyPrompt = (s, r) =>
  `Adversarially fact-check these "${s.name}" extras for ${trail}. Be skeptical — confidently-wrong is worse than nothing.

HIGHLIGHTS: ${JSON.stringify(r.highlights)}
HAZARDS: ${JSON.stringify(r.hazards)}

Return highlightsOk (titles of highlights whose place/claim is real + supported) and hazardsOk (bodies of hazards that are accurate for this terrain/season). Drop anything dubious or fabricated.`

const results = await pipeline(
  sections,
  (s) => agent(composePrompt(s), { label: `compose:${s.id}`, phase: 'Compose', schema: SCHEMA }).then((r) => ({ section: s, ...r })),
  (c, s) =>
    agent(verifyPrompt(s, c), { label: `verify:${s.id}`, phase: 'Verify', schema: VERIFY }).then((v) => {
      const hOk = new Set(v.highlightsOk || [])
      const zOk = new Set(v.hazardsOk || [])
      return {
        sectionId: s.id,
        highlights: (c.highlights || []).filter((h) => hOk.has(h.title)).map((h) => ({ title: h.title, body: h.body })),
        hazards: (c.hazards || []).filter((z) => zOk.has(z.body)).map((z) => ({ tone: z.tone, body: z.body })),
      }
    }),
)

const sectionHighlights = {}
const sectionHazards = {}
for (const r of results.filter(Boolean)) {
  if (r.highlights.length) sectionHighlights[r.sectionId] = r.highlights
  if (r.hazards.length) sectionHazards[r.sectionId] = r.hazards
}
log(`highlights=${Object.values(sectionHighlights).reduce((n, a) => n + a.length, 0)} hazards=${Object.values(sectionHazards).reduce((n, a) => n + a.length, 0)}`)
return { sectionHighlights, sectionHazards, provenance: { model: 'workflow:research-compose-verify' } }
