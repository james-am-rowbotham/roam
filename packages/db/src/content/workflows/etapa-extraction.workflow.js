// Etapa-extraction recipe (§8 / §0d) — research the OFFICIAL stage breakdown of a trail
// from the web and extract it as structured etapas. Turns the last hand-authored per-trail
// artifact (pipeline/src/data/<trail>-etapas.ts) into a sourced draft. HIGH-CONSEQUENCE
// (the progress spine, §5/§6): the result is `source: osm`-grade pending curation, and the
// chainage scaler rescales these distances to the measured route, catching a wrong total.
//
//   Workflow({ scriptPath: '.../etapa-extraction.workflow.js', args: { trail } })
// Output: { etapas: [{stage,name,distanceKm,ascentM,descentM}], source, totalKm, count }

export const meta = {
  name: 'etapa-extraction',
  description: 'Research + extract a trail’s official day-stages (etapas) from the web',
  phases: [
    { title: 'Extract', detail: 'research the canonical stage list, extract structured etapas' },
    { title: 'Verify', detail: 'sanity-check count + total distance, flag gaps' },
  ],
}

const input = typeof args === 'string' ? JSON.parse(args) : args || {}
const t = input.trail || {}

const ETAPA = {
  type: 'object',
  required: ['stage', 'name', 'distanceKm'],
  properties: {
    stage: { type: 'number' },
    name: { type: 'string', description: 'From → To endpoints, as published' },
    distanceKm: { type: 'number' },
    ascentM: { type: ['number', 'null'] },
    descentM: { type: ['number', 'null'] },
  },
}

const EXTRACT_SCHEMA = {
  type: 'object',
  required: ['etapas', 'sources'],
  properties: {
    etapas: { type: 'array', items: ETAPA },
    sources: { type: 'array', items: { type: 'object', required: ['url', 'title'], properties: { url: { type: 'string' }, title: { type: 'string' } } } },
  },
}

const VERIFY_SCHEMA = {
  type: 'object',
  required: ['ok', 'issues', 'totalKm'],
  properties: {
    ok: { type: 'boolean' },
    totalKm: { type: 'number' },
    issues: { type: 'array', items: { type: 'string' } },
  },
}

const extractPrompt = () =>
  `You are building Roam's curated trail data. Research the OFFICIAL day-stage (etapa) breakdown of ${t.name} — from ${t.from} to ${t.to}.

Use the authoritative sources first: the national federation topoguide (e.g. FFRP for French GR routes, FEDME for Spanish), the official trail site, and well-known stage-by-stage guides (Cicerone, gr-infos, gr10.fr, wikiloc summaries). Roughly ${t.expectedStages || 'N'} stages, about ${t.expectedKm || 'N'} km total.

SOURCING IS MANDATORY and this is HIGH-CONSEQUENCE data (it's the trail's progress spine). Never invent a stage or a distance. Prefer ONE canonical source's full stage list over stitching several (variants differ).

Extract EVERY stage in walking order from ${t.from} to ${t.to}:
- stage: the 1-based number, in order
- name: "From → To" endpoint towns/refuges, as the source publishes them
- distanceKm: the published stage distance
- ascentM / descentM: published ascent/descent if given, else null

Return the full ordered list + the source URLs you used.`

const verifyPrompt = (etapas) =>
  `Sanity-check this extracted etapa list for ${t.name} (${t.from}→${t.to}). Expected ~${t.expectedStages || '?'} stages, ~${t.expectedKm || '?'} km.

ETAPAS (JSON):
${JSON.stringify(etapas, null, 2)}

Check: stage numbers are contiguous 1..N in order; endpoints chain (each stage's "to" ≈ next stage's "from"); the distance total is in the right ballpark; no obvious duplicates or gaps. Report ok, the summed totalKm, and a list of specific issues (empty if clean).`

phase('Extract')
const extracted = await agent(extractPrompt(), { label: `extract:${t.id}`, phase: 'Extract', schema: EXTRACT_SCHEMA })
const etapas = (extracted?.etapas || []).slice().sort((a, b) => a.stage - b.stage)

phase('Verify')
const verdict = await agent(verifyPrompt(etapas), { label: `verify:${t.id}`, phase: 'Verify', schema: VERIFY_SCHEMA })

log(`${etapas.length} etapas · ~${Math.round(verdict?.totalKm || 0)} km · ${verdict?.ok ? 'OK' : 'NEEDS REVIEW'}${verdict?.issues?.length ? ` · ${verdict.issues.length} issue(s)` : ''}`)
return { etapas, sources: extracted?.sources || [], totalKm: verdict?.totalKm, count: etapas.length, ok: verdict?.ok, issues: verdict?.issues || [] }
