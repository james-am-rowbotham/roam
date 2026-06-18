// Canonical Objective-Guide generation recipe (§21 Enrich) — the Planning + Environment
// facet content for a trail's Guide. Sibling of section-content.workflow.js; generic +
// args-driven so it runs for any route. Output is cache-ready (GuideTopic[] with facet
// set), folded into the content cache by ingest.ts (objectiveGuide).
//
//   Workflow({ scriptPath: '.../objective-guide.workflow.js', args: { objective } })
//   bun run pack:content:ingest <result.json>

export const meta = {
  name: 'objective-guide',
  description: 'Generate sourced Planning + Environment Guide topics for a trail objective',
  phases: [
    { title: 'Compose', detail: 'one agent per facet — web research → sourced topics' },
    { title: 'Verify', detail: 'adversarial fact-check; drop unsupported topics' },
  ],
}

const input = typeof args === 'string' ? JSON.parse(args) : args || {}
const o = input.objective || {}

// Each facet's topics, in canonical render order (matches the design's Guide facets).
const FACETS = [
  {
    facet: 'planning',
    keys: ['kit', 'navigation', 'accommodation', 'water', 'safety', 'transport'],
    guidance:
      'kit (what to carry: pack size, footwear, layers, water capacity, season gear); navigation (waymarking — GR red/white blazes, signage, GPS); accommodation (refuges/refugios, albergues, hotels/pensions, camping/bivouac rules); water (availability and seasonality along the route, dry stretches); safety (terrain hazards, weather windows, emergency contacts/huts); transport (getting to the start and from the end, and between sections).',
  },
  {
    facet: 'environment',
    keys: ['flora', 'culture', 'food', 'history', 'weather'],
    guidance:
      'flora (and fauna — vegetation belts by altitude, notable wildlife: izard/chamois, marmots, vultures); culture (Basque/Aragonese/Catalan/Andorran identities, languages, mountain life); food (regional specialities and where to eat them); history (pilgrim routes, smuggling, frontier and refuge history); weather (the regional pattern west→east, the season, daily rhythm of storms).',
  },
]

const SCHEMA = {
  type: 'object',
  required: ['topics'],
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        required: ['key', 'heading', 'body', 'sourceRefs'],
        properties: {
          key: { type: 'string' },
          heading: { type: 'string' },
          body: { type: 'string' },
          sourceRefs: {
            type: 'array',
            items: { type: 'object', required: ['url', 'title'], properties: { url: { type: 'string' }, title: { type: 'string' } } },
          },
        },
      },
    },
  },
}

const VERIFY = {
  type: 'object',
  required: ['verdicts'],
  properties: {
    verdicts: {
      type: 'array',
      items: { type: 'object', required: ['key', 'supported'], properties: { key: { type: 'string' }, supported: { type: 'boolean' }, issue: { type: 'string' } } },
    },
  },
}

const composePrompt = (f) =>
  `You are a trail-guide writer for Roam, an offline hiking app. Voice: grounded and specific (real place names, not categories), comparatives over superlatives, present tense, no marketing adjectives. Use a plain ampersand "&".

Write the "${f.facet}" Guide content for ${o.name || 'this trail'} — ${o.summary || ''}
${o.context ? `Context: ${o.context}` : ''}

Research the web FIRST (Wikipedia/Wikivoyage, federation guides like FEDME/FFRP, national parks, refuge sites, reputable trip reports). SOURCING IS MANDATORY — a confidently-wrong fact is worse than nothing. Never invent a fact or a source.

Write ONE topic for EACH of these keys: ${f.keys.join(', ')}.
Cover, respectively: ${f.guidance}
Each topic: a short heading and a 2–4 sentence body for a hiker planning/understanding the whole trail.`

const verifyPrompt = (f, topics) =>
  `Adversarially fact-check these "${f.facet}" topics for ${o.name || 'this trail'} — be skeptical, confidently-wrong is worse than nothing. Default supported=false for dubious specifics or fabricated-looking sources.

TOPICS (JSON):
${JSON.stringify(topics, null, 2)}

Return a verdict per topic key (supported boolean + short issue).`

const results = await pipeline(
  FACETS,
  (f) => agent(composePrompt(f), { label: `compose:${f.facet}`, phase: 'Compose', schema: SCHEMA }).then((r) => ({ facet: f, topics: r.topics })),
  (c, f) =>
    agent(verifyPrompt(f, c.topics), { label: `verify:${f.facet}`, phase: 'Verify', schema: VERIFY }).then((v) => {
      const ok = new Set(v.verdicts.filter((x) => x.supported).map((x) => x.key))
      return { facet: f.facet, topics: c.topics.filter((t) => ok.has(t.key)) }
    }),
)

const objectiveGuide = []
for (const r of results.filter(Boolean)) {
  for (const t of r.topics) objectiveGuide.push({ key: t.key, facet: r.facet, heading: t.heading, body: t.body })
}

log(`objectiveGuide topics=${objectiveGuide.length} (${results.filter(Boolean).map((r) => `${r.facet}:${r.topics.length}`).join(' ')})`)
return { objectiveGuide, provenance: { model: 'workflow:research-compose-verify' } }
